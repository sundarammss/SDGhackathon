from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Course, DepartmentCourse, DepartmentCourseUnit, Student, Teacher
from app.schemas import CourseCreate, CourseOut, DepartmentCourseOut, DepartmentCourseUnitOut
from app.rbac import require_role

router = APIRouter(prefix="/api/v1/courses", tags=["Courses"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "courses"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB per unit note


def _to_department_course_out(c: DepartmentCourse) -> DepartmentCourseOut:
    creator_name = f"{c.creator.first_name} {c.creator.last_name}" if c.creator else None
    units = [
        DepartmentCourseUnitOut(
            unit_number=u.unit_number,
            original_filename=u.original_filename,
            mime_type=u.mime_type,
            download_path=f"/api/v1/courses/department-courses/{c.id}/units/{u.unit_number}/download",
        )
        for u in c.unit_notes
    ]
    return DepartmentCourseOut(
        id=c.id,
        code=c.code,
        title=c.title,
        department=c.department,
        semester=c.semester,
        created_by=c.created_by,
        creator_name=creator_name,
        created_at=c.created_at,
        unit_notes=units,
    )


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


@router.post("/department-courses", response_model=DepartmentCourseOut, status_code=status.HTTP_201_CREATED)
async def create_department_course(
    code: str = Form(...),
    title: str = Form(...),
    semester: int = Form(...),
    unit_notes: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    if auth["role"] != "advisor":
        raise HTTPException(status_code=403, detail="Only department teachers can add courses")

    teacher = await db.get(Teacher, auth["id"])
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    if not teacher.department:
        raise HTTPException(status_code=400, detail="Teacher department is required to create courses")
    if semester < 1 or semester > 12:
        raise HTTPException(status_code=400, detail="Semester must be between 1 and 12")
    if len(unit_notes) != 5:
        raise HTTPException(status_code=400, detail="Exactly 5 unit notes are required")

    existing_stmt = select(DepartmentCourse).where(
        DepartmentCourse.code == code.strip(),
        DepartmentCourse.department == teacher.department,
        DepartmentCourse.semester == semester,
    )
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Course code already exists for this department and semester")

    course = DepartmentCourse(
        code=code.strip(),
        title=title.strip(),
        department=teacher.department,
        semester=semester,
        created_by=teacher.id,
    )
    db.add(course)
    await db.flush()

    for idx, f in enumerate(unit_notes, start=1):
        original_name = f.filename or f"unit-{idx}.pdf"
        ext = Path(original_name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Unit notes must be PDF, DOC, or DOCX")

        content = await f.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"Unit {idx} file exceeds 15 MB")

        filename = f"{uuid.uuid4().hex}_course{course.id}_unit{idx}{ext}"
        filepath = UPLOAD_DIR / filename
        filepath.write_bytes(content)

        db.add(
            DepartmentCourseUnit(
                course_id=course.id,
                unit_number=idx,
                file_path=filename,
                original_filename=original_name,
                mime_type=f.content_type or None,
            )
        )

    await db.commit()

    stmt = (
        select(DepartmentCourse)
        .options(selectinload(DepartmentCourse.creator), selectinload(DepartmentCourse.unit_notes))
        .where(DepartmentCourse.id == course.id)
    )
    saved = (await db.execute(stmt)).scalar_one()
    return _to_department_course_out(saved)


@router.get("/department-courses", response_model=list[DepartmentCourseOut])
async def list_teacher_department_courses(
    semester: int | None = None,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    if auth["role"] != "advisor":
        raise HTTPException(status_code=403, detail="Only department teachers can access this endpoint")

    teacher = await db.get(Teacher, auth["id"])
    if not teacher or not teacher.department:
        raise HTTPException(status_code=404, detail="Teacher not found")

    stmt = (
        select(DepartmentCourse)
        .options(selectinload(DepartmentCourse.creator), selectinload(DepartmentCourse.unit_notes))
        .where(DepartmentCourse.department == teacher.department)
        .order_by(DepartmentCourse.semester.asc(), DepartmentCourse.created_at.desc())
    )
    if semester is not None:
        stmt = stmt.where(DepartmentCourse.semester == semester)

    result = await db.execute(stmt)
    return [_to_department_course_out(c) for c in result.scalars().all()]


@router.get("/student-courses", response_model=list[DepartmentCourseOut])
async def list_student_courses(
    semester: int | None = None,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    student = await db.get(Student, auth["id"])
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not student.department:
        return []

    stmt = (
        select(DepartmentCourse)
        .options(selectinload(DepartmentCourse.creator), selectinload(DepartmentCourse.unit_notes))
        .where(DepartmentCourse.department == student.department)
        .order_by(DepartmentCourse.semester.asc(), DepartmentCourse.created_at.desc())
    )
    if semester is not None:
        stmt = stmt.where(DepartmentCourse.semester == semester)

    result = await db.execute(stmt)
    return [_to_department_course_out(c) for c in result.scalars().all()]


@router.get("/department-courses/{course_id}/units/{unit_number}/download")
async def download_department_course_unit(
    course_id: int,
    unit_number: int,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    stmt = (
        select(DepartmentCourse)
        .options(selectinload(DepartmentCourse.unit_notes))
        .where(DepartmentCourse.id == course_id)
    )
    course = (await db.execute(stmt)).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if auth["role"] == "student":
        student = await db.get(Student, auth["id"])
        if not student or student.department != course.department:
            raise HTTPException(status_code=403, detail="Access denied")
    elif auth["role"] == "advisor":
        teacher = await db.get(Teacher, auth["id"])
        if not teacher or teacher.department != course.department:
            raise HTTPException(status_code=403, detail="Access denied")

    unit = next((u for u in course.unit_notes if u.unit_number == unit_number), None)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit note not found")

    filepath = UPLOAD_DIR / unit.file_path
    try:
        filepath.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(filepath),
        filename=unit.original_filename,
        media_type=unit.mime_type or "application/octet-stream",
    )
