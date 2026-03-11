from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ExamMark, Student
from app.rbac import require_role

router = APIRouter(prefix="/api/v1/exam-marks", tags=["Exam Marks"])


# ── Schemas ────────────────────────────────────────────────────────────

class ExamMarkCreate(BaseModel):
    student_id: int
    exam_name: str
    marks: float
    exam_date: str  # YYYY-MM-DD

    @field_validator("exam_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        date.fromisoformat(v)  # raises ValueError if invalid
        return v


class ExamMarkUpdate(BaseModel):
    exam_name: Optional[str] = None
    marks: Optional[float] = None
    exam_date: Optional[str] = None

    @field_validator("exam_date", mode="before")
    @classmethod
    def validate_date(cls, v):
        if v is not None:
            date.fromisoformat(str(v))
        return v


class ExamMarkOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    exam_name: str
    marks: float
    exam_date: str
    created_at: str

    model_config = {"from_attributes": True}


# ── Helpers ────────────────────────────────────────────────────────────

async def _get_mark_or_404(exam_id: int, db: AsyncSession) -> ExamMark:
    row = await db.get(ExamMark, exam_id)
    if not row:
        raise HTTPException(status_code=404, detail="Exam mark not found")
    return row


def _to_out(row: ExamMark, student: Student) -> ExamMarkOut:
    return ExamMarkOut(
        id=row.id,
        student_id=row.student_id,
        student_name=f"{student.first_name} {student.last_name}",
        exam_name=row.exam_name,
        marks=row.marks,
        exam_date=row.exam_date,
        created_at=row.created_at.isoformat() if row.created_at else "",
    )


# ── Endpoints ──────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=ExamMarkOut)
async def create_exam_mark(
    payload: ExamMarkCreate,
    db: AsyncSession = Depends(get_db),
    _auth: dict = Depends(require_role("advisor")),
):
    student = await db.get(Student, payload.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    row = ExamMark(
        student_id=payload.student_id,
        exam_name=payload.exam_name,
        marks=payload.marks,
        exam_date=payload.exam_date,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_out(row, student)


@router.get("/", response_model=list[ExamMarkOut])
async def list_exam_marks(
    student_id: Optional[int] = None,
    exam_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _auth: dict = Depends(require_role("advisor")),
):
    stmt = select(ExamMark)
    if student_id is not None:
        stmt = stmt.where(ExamMark.student_id == student_id)
    if exam_name is not None:
        stmt = stmt.where(ExamMark.exam_name.ilike(f"%{exam_name}%"))
    stmt = stmt.order_by(ExamMark.exam_date.desc(), ExamMark.id.desc())

    result = await db.execute(stmt)
    rows = result.scalars().all()

    # batch-load students
    student_ids = list({r.student_id for r in rows})
    students: dict[int, Student] = {}
    for sid in student_ids:
        s = await db.get(Student, sid)
        if s:
            students[sid] = s

    return [_to_out(r, students[r.student_id]) for r in rows if r.student_id in students]


@router.put("/{exam_id}", response_model=ExamMarkOut)
async def update_exam_mark(
    exam_id: int,
    payload: ExamMarkUpdate,
    db: AsyncSession = Depends(get_db),
    _auth: dict = Depends(require_role("advisor")),
):
    row = await _get_mark_or_404(exam_id, db)
    if payload.exam_name is not None:
        row.exam_name = payload.exam_name
    if payload.marks is not None:
        row.marks = payload.marks
    if payload.exam_date is not None:
        row.exam_date = payload.exam_date
    await db.commit()
    await db.refresh(row)
    student = await db.get(Student, row.student_id)
    return _to_out(row, student)


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_mark(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    _auth: dict = Depends(require_role("advisor")),
):
    row = await _get_mark_or_404(exam_id, db)
    await db.delete(row)
    await db.commit()
