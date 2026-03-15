"""Assignment management endpoints.

Teachers create assignments targeting a dept/batch/section.
Students can view and submit PDF files.
Teachers can review, approve, and assign marks.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Assignment, AssignmentSubmission, Student
from app.rbac import require_role
from app.services.streak_service import mark_study_activity

router = APIRouter(prefix="/api/v1/assignments", tags=["Assignments"])

# ── Storage ────────────────────────────────────────────────────────────

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "assignments"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ── Schemas ────────────────────────────────────────────────────────────

class AssignmentOut(BaseModel):
    id: int
    title: str
    description: str | None
    due_date: str
    department: str
    batch_start_year: int
    batch_end_year: int
    section: str | None
    created_by: int
    creator_name: str | None
    submission_count: int
    created_at: str

    model_config = {"from_attributes": True}


class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    assignment_title: str | None
    student_id: int
    student_name: str | None
    file_path: str
    submitted_at: str
    is_approved: bool

    model_config = {"from_attributes": True}


class ApproveRequest(BaseModel):
    marks: float | None = None


# ── Helpers ────────────────────────────────────────────────────────────

def _to_assignment_out(a: Assignment) -> AssignmentOut:
    creator_name = (
        f"{a.creator.first_name} {a.creator.last_name}" if a.creator else None
    )
    return AssignmentOut(
        id=a.id,
        title=a.title,
        description=a.description,
        due_date=a.due_date,
        department=a.department,
        batch_start_year=a.batch_start_year,
        batch_end_year=a.batch_end_year,
        section=a.section,
        created_by=a.created_by,
        creator_name=creator_name,
        submission_count=len(a.submissions) if a.submissions is not None else 0,
        created_at=a.created_at.isoformat() if a.created_at else "",
    )


def _to_submission_out(s: AssignmentSubmission) -> SubmissionOut:
    student_name = (
        f"{s.student.first_name} {s.student.last_name}" if s.student else None
    )
    assignment_title = s.assignment.title if s.assignment else None
    return SubmissionOut(
        id=s.id,
        assignment_id=s.assignment_id,
        assignment_title=assignment_title,
        student_id=s.student_id,
        student_name=student_name,
        file_path=s.file_path,
        submitted_at=s.submitted_at.isoformat() if s.submitted_at else "",
        is_approved=bool(s.is_approved),
    )


# ── List Assignments ────────────────────────────────────────────────────

@router.get("/", response_model=list[AssignmentOut])
async def list_assignments(
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    """
    Students: see assignments for their dept/batch/section.
    Advisors/Admin: see only their own created assignments.
    """
    role = auth["role"]
    user_id = auth["id"]

    stmt = (
        select(Assignment)
        .options(
            selectinload(Assignment.creator),
            selectinload(Assignment.submissions),
        )
        .order_by(Assignment.created_at.desc())
    )

    if role == "student":
        student = await db.get(Student, user_id)
        if not student:
            raise HTTPException(404, "Student not found")
        stmt = stmt.where(
            and_(
                Assignment.department == student.department,
                Assignment.batch_start_year == student.batch_start_year,
                Assignment.batch_end_year == student.batch_end_year,
                or_(Assignment.section.is_(None), Assignment.section == student.section),
            )
        )
    elif role == "advisor":
        stmt = stmt.where(Assignment.created_by == user_id)
    # admin sees all

    result = await db.execute(stmt)
    return [_to_assignment_out(a) for a in result.scalars().all()]


# ── Create Assignment ───────────────────────────────────────────────────

@router.post("/", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    title: str = Form(...),
    description: str = Form(""),
    due_date: str = Form(...),
    department: str = Form(...),
    batch_start_year: int = Form(...),
    batch_end_year: int = Form(...),
    section: str = Form(""),
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    assignment = Assignment(
        title=title.strip(),
        description=description.strip() or None,
        due_date=due_date,
        department=department.strip(),
        batch_start_year=batch_start_year,
        batch_end_year=batch_end_year,
        section=section.strip() or None,
        created_by=auth["id"],
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    stmt = (
        select(Assignment)
        .where(Assignment.id == assignment.id)
        .options(
            selectinload(Assignment.creator),
            selectinload(Assignment.submissions),
        )
    )
    result = await db.execute(stmt)
    return _to_assignment_out(result.scalar_one())


# ── Delete Assignment ───────────────────────────────────────────────────

@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    assignment = await db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    if assignment.created_by != auth["id"]:
        raise HTTPException(403, "You can only delete your own assignments")

    # Remove uploaded PDF files from disk
    sub_stmt = select(AssignmentSubmission).where(
        AssignmentSubmission.assignment_id == assignment_id
    )
    sub_result = await db.execute(sub_stmt)
    for sub in sub_result.scalars().all():
        fp = UPLOAD_DIR / sub.file_path
        if fp.exists():
            fp.unlink(missing_ok=True)

    await db.delete(assignment)
    await db.commit()


# ── Student: submit PDF ─────────────────────────────────────────────────

@router.post(
    "/{assignment_id}/submit",
    response_model=SubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit_assignment(
    assignment_id: int,
    pdf: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    assignment = await db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")

    # Prevent duplicate submission
    dup_stmt = select(AssignmentSubmission).where(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.student_id == auth["id"],
    )
    dup_result = await db.execute(dup_stmt)
    if dup_result.scalar_one_or_none():
        raise HTTPException(400, "You have already submitted this assignment")

    # Validate PDF only
    original_filename = pdf.filename or ""
    suffix = Path(original_filename).suffix.lower()
    if suffix != ".pdf":
        raise HTTPException(400, "Only PDF files are accepted")

    content = await pdf.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File size must not exceed 10 MB")

    filename = f"{uuid.uuid4().hex}.pdf"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(content)

    sub = AssignmentSubmission(
        assignment_id=assignment_id,
        student_id=auth["id"],
        file_path=filename,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    await mark_study_activity(db, auth["id"])

    stmt = (
        select(AssignmentSubmission)
        .where(AssignmentSubmission.id == sub.id)
        .options(
            selectinload(AssignmentSubmission.student),
            selectinload(AssignmentSubmission.assignment),
        )
    )
    result = await db.execute(stmt)
    return _to_submission_out(result.scalar_one())


# ── Student: check own submission ───────────────────────────────────────

@router.get("/{assignment_id}/my-submission", response_model=SubmissionOut | None)
async def my_submission(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    stmt = (
        select(AssignmentSubmission)
        .where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_id == auth["id"],
        )
        .options(
            selectinload(AssignmentSubmission.student),
            selectinload(AssignmentSubmission.assignment),
        )
    )
    result = await db.execute(stmt)
    sub = result.scalar_one_or_none()
    return _to_submission_out(sub) if sub else None


# ── Teacher: list submissions for an assignment ─────────────────────────

@router.get("/{assignment_id}/submissions", response_model=list[SubmissionOut])
async def list_submissions(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    assignment = await db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    if assignment.created_by != auth["id"]:
        raise HTTPException(403, "You can only view submissions for your own assignments")

    stmt = (
        select(AssignmentSubmission)
        .where(AssignmentSubmission.assignment_id == assignment_id)
        .options(
            selectinload(AssignmentSubmission.student),
            selectinload(AssignmentSubmission.assignment),
        )
        .order_by(AssignmentSubmission.submitted_at.asc())
    )
    result = await db.execute(stmt)
    return [_to_submission_out(s) for s in result.scalars().all()]


# ── Teacher: download PDF file ──────────────────────────────────────────

@router.get("/submissions/{submission_id}/file")
async def get_submission_file(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    sub = await db.get(AssignmentSubmission, submission_id)
    if not sub:
        raise HTTPException(404, "Submission not found")

    assignment = await db.get(Assignment, sub.assignment_id)
    if not assignment or assignment.created_by != auth["id"]:
        raise HTTPException(403, "Access denied")

    filepath = UPLOAD_DIR / sub.file_path
    if not filepath.exists():
        raise HTTPException(404, "File not found on server")

    return FileResponse(
        path=str(filepath),
        media_type="application/pdf",
        filename=f"submission_{submission_id}.pdf",
    )


# ── Teacher: approve + assign marks ────────────────────────────────────

@router.patch("/submissions/{submission_id}/approve", response_model=SubmissionOut)
async def approve_submission(
    submission_id: int,
    payload: ApproveRequest,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    stmt = (
        select(AssignmentSubmission)
        .where(AssignmentSubmission.id == submission_id)
        .options(
            selectinload(AssignmentSubmission.student),
            selectinload(AssignmentSubmission.assignment),
        )
    )
    result = await db.execute(stmt)
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "Submission not found")

    assignment = await db.get(Assignment, sub.assignment_id)
    if not assignment or assignment.created_by != auth["id"]:
        raise HTTPException(403, "Access denied")

    sub.is_approved = 1
    sub.marks = payload.marks
    await db.commit()

    # Reload with relationships for response
    stmt = (
        select(AssignmentSubmission)
        .where(AssignmentSubmission.id == submission_id)
        .options(
            selectinload(AssignmentSubmission.student),
            selectinload(AssignmentSubmission.assignment),
        )
    )
    result = await db.execute(stmt)
    return _to_submission_out(result.scalar_one())
