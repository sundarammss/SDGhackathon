"""Competition management endpoints.

Students can submit competition entries with proof documents.
Teachers (advisors) can view, approve, or reject submissions.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ApprovalStatus, CompetitionStatus, Student, StudentCompetition
from app.rbac import require_role

router = APIRouter(prefix="/api/v1/competitions", tags=["Competitions"])

# ── Storage ────────────────────────────────────────────────────────────

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "competitions"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


# ── Schemas ────────────────────────────────────────────────────────────

class CompetitionOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    competition_name: str
    competition_date: str
    status: str
    proof_file: str | None
    approval_status: str
    approved_by: int | None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


# ── Helper ─────────────────────────────────────────────────────────────

def _to_out(comp: StudentCompetition, student: Student | None) -> CompetitionOut:
    student_name = (
        f"{student.first_name} {student.last_name}" if student else "Unknown"
    )
    return CompetitionOut(
        id=comp.id,
        student_id=comp.student_id,
        student_name=student_name,
        competition_name=comp.competition_name,
        competition_date=comp.competition_date,
        status=comp.status.value,
        proof_file=comp.proof_file,
        approval_status=comp.approval_status.value,
        approved_by=comp.approved_by,
        created_at=comp.created_at.isoformat() if comp.created_at else "",
        updated_at=comp.updated_at.isoformat() if comp.updated_at else "",
    )


# ── Student Endpoints ──────────────────────────────────────────────────

@router.post("/", response_model=CompetitionOut, status_code=status.HTTP_201_CREATED)
async def submit_competition(
    competition_name: str = Form(...),
    competition_date: str = Form(...),
    competition_status: str = Form(...),  # "Winner" | "Runner-up" | "Participated"
    proof: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    """Submit a new competition entry with proof document."""
    # Validate competition status
    try:
        comp_status = CompetitionStatus(competition_status)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Must be Winner, Runner-up, or Participated.",
        )

    # Validate file extension
    original_filename = proof.filename or ""
    suffix = Path(original_filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG, or PDF files are allowed.",
        )

    # Read and validate file size
    content = await proof.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must not exceed 5 MB.",
        )

    # Store with a UUID-based filename to prevent path traversal or collisions
    filename = f"{uuid.uuid4().hex}{suffix}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(content)

    comp = StudentCompetition(
        student_id=auth["id"],
        competition_name=competition_name.strip(),
        competition_date=competition_date,
        status=comp_status,
        proof_file=filename,
        approval_status=ApprovalStatus.PENDING,
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)

    student = await db.get(Student, auth["id"])
    return _to_out(comp, student)


@router.get("/my", response_model=list[CompetitionOut])
async def get_my_competitions(
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    """Return all competitions submitted by the authenticated student."""
    result = await db.execute(
        select(StudentCompetition)
        .where(StudentCompetition.student_id == auth["id"])
        .order_by(StudentCompetition.created_at.desc())
    )
    items = result.scalars().all()
    student = await db.get(Student, auth["id"])
    return [_to_out(c, student) for c in items]


# ── Proof File Download ────────────────────────────────────────────────

@router.get("/{comp_id}/proof")
async def get_proof_file(
    comp_id: int,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    """Serve the proof file. Students can only fetch their own; advisors can fetch all."""
    comp = await db.get(StudentCompetition, comp_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competition entry not found.")

    # Students can only access their own proof
    if auth["role"] == "student" and comp.student_id != auth["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    if not comp.proof_file:
        raise HTTPException(status_code=404, detail="No proof file for this entry.")

    # Prevent path traversal: ensure the resolved path is within UPLOAD_DIR
    filepath = UPLOAD_DIR / comp.proof_file
    try:
        filepath.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file path.")

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Proof file not found on server.")

    return FileResponse(
        path=str(filepath),
        filename=comp.proof_file,
        media_type="application/octet-stream",
    )


# ── Teacher Endpoints ──────────────────────────────────────────────────

@router.get("/", response_model=list[CompetitionOut])
async def list_competitions(
    approval_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    """Return all competition entries, optionally filtered by approval status."""
    stmt = select(StudentCompetition).order_by(StudentCompetition.created_at.desc())
    if approval_status:
        try:
            ap = ApprovalStatus(approval_status)
            stmt = stmt.where(StudentCompetition.approval_status == ap)
        except ValueError:
            pass  # ignore unknown filter values

    result = await db.execute(stmt)
    items = result.scalars().all()

    out = []
    for item in items:
        student = await db.get(Student, item.student_id)
        out.append(_to_out(item, student))
    return out


@router.patch("/{comp_id}/approve", response_model=CompetitionOut)
async def approve_competition(
    comp_id: int,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    """Approve a competition entry."""
    comp = await db.get(StudentCompetition, comp_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competition entry not found.")

    comp.approval_status = ApprovalStatus.APPROVED
    comp.approved_by = auth["id"]
    comp.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(comp)

    student = await db.get(Student, comp.student_id)
    return _to_out(comp, student)


@router.patch("/{comp_id}/reject", response_model=CompetitionOut)
async def reject_competition(
    comp_id: int,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    """Reject a competition entry."""
    comp = await db.get(StudentCompetition, comp_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competition entry not found.")

    comp.approval_status = ApprovalStatus.REJECTED
    comp.approved_by = auth["id"]
    comp.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(comp)

    student = await db.get(Student, comp.student_id)
    return _to_out(comp, student)
