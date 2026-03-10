from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Student, Teacher
from app.schemas import StudentCreate, StudentOut, StudentUpdate
from app.rbac import require_role

router = APIRouter(prefix="/api/v1/students", tags=["Students"])


@router.post("/", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
async def create_student(
    payload: StudentCreate,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("admin")),
):
    student = Student(**payload.model_dump())
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


@router.get("/", response_model=list[StudentOut])
async def list_students(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: dict = Depends(require_role("advisor")),
):
    caller_role = request.headers.get("x-user-role", "").lower()
    caller_id = int(request.headers.get("x-user-id", "0"))

    # Advisors (teachers) only see students from their department
    if caller_role == "advisor":
        teacher = await db.get(Teacher, caller_id)
        if teacher and teacher.department:
            result = await db.execute(
                select(Student).where(Student.department == teacher.department).order_by(Student.id)
            )
            return result.scalars().all()

    result = await db.execute(select(Student).order_by(Student.id))
    return result.scalars().all()


@router.get("/{student_id}", response_model=StudentOut)
async def get_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.patch("/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("admin")),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    await db.commit()
    await db.refresh(student)
    return student
