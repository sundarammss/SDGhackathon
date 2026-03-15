"""Admin-only teacher management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Teacher
from app.schemas import TeacherCreate, TeacherOut, TeacherUpdate
from app.rbac import require_role
from app.security import hash_password

router = APIRouter(prefix="/api/v1/teachers", tags=["Teachers"])


@router.post("/", response_model=TeacherOut, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    payload: TeacherCreate,
    db: AsyncSession = Depends(get_db),
    _role: dict = Depends(require_role("admin")),
):
    existing = await db.execute(select(Teacher).where(Teacher.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    teacher = Teacher(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        department=payload.department,
        password_hash=hash_password(payload.password),
    )
    db.add(teacher)
    await db.commit()
    await db.refresh(teacher)
    return teacher


@router.get("/", response_model=list[TeacherOut])
async def list_teachers(
    db: AsyncSession = Depends(get_db),
    _role: dict = Depends(require_role("admin")),
):
    result = await db.execute(select(Teacher).order_by(Teacher.id))
    return result.scalars().all()


@router.get("/{teacher_id}", response_model=TeacherOut)
async def get_teacher(
    teacher_id: int,
    db: AsyncSession = Depends(get_db),
    _role: dict = Depends(require_role("admin")),
):
    teacher = await db.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


@router.patch("/{teacher_id}", response_model=TeacherOut)
async def update_teacher(
    teacher_id: int,
    payload: TeacherUpdate,
    db: AsyncSession = Depends(get_db),
    _role: dict = Depends(require_role("admin")),
):
    teacher = await db.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(teacher, field, value)
    await db.commit()
    await db.refresh(teacher)
    return teacher
