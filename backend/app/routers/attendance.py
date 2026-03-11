"""Attendance management endpoints for teachers (advisors)."""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Attendance, AttendanceStatus, Student, Teacher
from app.rbac import require_role

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance"])


# ── Schemas ────────────────────────────────────────────────────────────

class AttendanceRecord(BaseModel):
    student_id: int
    status: str  # "present" | "absent"


class AttendanceBulkCreate(BaseModel):
    date: str      # YYYY-MM-DD
    subject: Optional[str] = None
    records: list[AttendanceRecord]

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        date.fromisoformat(v)
        return v


class AttendanceOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    teacher_id: int
    date: str
    status: str
    subject: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}


class BatchStudentOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    section: Optional[str]
    department: str
    batch: str

    model_config = {"from_attributes": True}


# ── Helper ─────────────────────────────────────────────────────────────

def _to_out(row: Attendance, student: Student) -> AttendanceOut:
    return AttendanceOut(
        id=row.id,
        student_id=row.student_id,
        student_name=f"{student.first_name} {student.last_name}",
        teacher_id=row.teacher_id,
        date=row.date,
        status=row.status.value,
        subject=row.subject,
        created_at=row.created_at.isoformat() if row.created_at else "",
    )


# ── Endpoints ──────────────────────────────────────────────────────────

@router.get("/students", response_model=list[BatchStudentOut])
async def get_department_students(
    batch_start_year: Optional[int] = None,
    batch_end_year: Optional[int] = None,
    section: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    """Return students belonging to the requesting teacher's department,
    optionally filtered by batch and section."""
    teacher = await db.get(Teacher, auth["id"])
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    stmt = select(Student).where(Student.department == teacher.department)
    if batch_start_year is not None:
        stmt = stmt.where(Student.batch_start_year == batch_start_year)
    if batch_end_year is not None:
        stmt = stmt.where(Student.batch_end_year == batch_end_year)
    if section is not None:
        stmt = stmt.where(Student.section == section)
    stmt = stmt.order_by(Student.section, Student.first_name, Student.last_name)

    result = await db.execute(stmt)
    students = result.scalars().all()

    return [
        BatchStudentOut(
            id=s.id,
            first_name=s.first_name,
            last_name=s.last_name,
            email=s.email,
            section=s.section,
            department=s.department or "",
            batch=(
                f"{s.batch_start_year}-{s.batch_end_year}"
                if s.batch_start_year and s.batch_end_year
                else ""
            ),
        )
        for s in students
    ]


@router.get("/batches", response_model=list[dict])
async def get_department_batches(
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    """Return distinct batch + section combinations for the teacher's department."""
    teacher = await db.get(Teacher, auth["id"])
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    stmt = select(
        Student.batch_start_year,
        Student.batch_end_year,
        Student.section,
    ).where(
        Student.department == teacher.department,
        Student.batch_start_year.isnot(None),
        Student.batch_end_year.isnot(None),
    ).distinct()

    result = await db.execute(stmt)
    rows = result.all()

    seen = set()
    out = []
    for r in rows:
        key = (r.batch_start_year, r.batch_end_year, r.section)
        if key not in seen:
            seen.add(key)
            out.append(
                {
                    "batch_start_year": r.batch_start_year,
                    "batch_end_year": r.batch_end_year,
                    "section": r.section,
                    "label": f"{r.batch_start_year}-{r.batch_end_year}"
                    + (f" / Sec {r.section}" if r.section else ""),
                }
            )

    out.sort(key=lambda x: (x["batch_start_year"], x["batch_end_year"], x["section"] or ""))
    return out


@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_attendance(
    payload: AttendanceBulkCreate,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    """Bulk upsert attendance for a batch/section on a given date.
    A teacher can only mark attendance for students in their own department."""
    teacher_id = auth["id"]
    teacher = await db.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    saved = 0
    for rec in payload.records:
        student = await db.get(Student, rec.student_id)
        # Security: skip students not in the teacher's department
        if not student or student.department != teacher.department:
            continue

        s_status = (
            AttendanceStatus.PRESENT
            if rec.status.lower() == "present"
            else AttendanceStatus.ABSENT
        )

        # Upsert by (student_id, teacher_id, date)
        existing = await db.execute(
            select(Attendance).where(
                and_(
                    Attendance.student_id == rec.student_id,
                    Attendance.teacher_id == teacher_id,
                    Attendance.date == payload.date,
                )
            )
        )
        row = existing.scalars().first()
        if row:
            row.status = s_status
            if payload.subject is not None:
                row.subject = payload.subject
        else:
            row = Attendance(
                student_id=rec.student_id,
                teacher_id=teacher_id,
                date=payload.date,
                status=s_status,
                subject=payload.subject,
            )
            db.add(row)

        saved += 1

    await db.commit()
    return {"saved": saved}


@router.get("/", response_model=list[AttendanceOut])
async def list_attendance(
    date_val: Optional[str] = None,
    student_id: Optional[int] = None,
    batch_start_year: Optional[int] = None,
    batch_end_year: Optional[int] = None,
    section: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    """Get previously submitted attendance records for the teacher's department."""
    teacher = await db.get(Teacher, auth["id"])
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    stmt = select(Attendance).where(Attendance.teacher_id == auth["id"])
    if date_val:
        stmt = stmt.where(Attendance.date == date_val)
    if student_id:
        stmt = stmt.where(Attendance.student_id == student_id)
    stmt = stmt.order_by(Attendance.date.desc(), Attendance.id.desc())

    result = await db.execute(stmt)
    rows = result.scalars().all()

    # Batch-load students
    student_ids = list({r.student_id for r in rows})
    students_map: dict[int, Student] = {}
    for sid in student_ids:
        s = await db.get(Student, sid)
        if s:
            students_map[sid] = s

    out = []
    for r in rows:
        s = students_map.get(r.student_id)
        if not s:
            continue
        if batch_start_year is not None and s.batch_start_year != batch_start_year:
            continue
        if batch_end_year is not None and s.batch_end_year != batch_end_year:
            continue
        if section is not None and s.section != section:
            continue
        out.append(_to_out(r, s))

    return out
