from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Course
from app.schemas import CourseCreate, CourseOut
from app.rbac import require_role

router = APIRouter(prefix="/api/v1/courses", tags=["Courses"])


@router.post("/", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("admin")),
):
    course = Course(**payload.model_dump())
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/", response_model=list[CourseOut])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    result = await db.execute(select(Course).order_by(Course.id))
    return result.scalars().all()
