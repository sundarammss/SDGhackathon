"""Institutional Intelligence Dashboard endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Course, Enrollment, Student, Teacher, CISScore
from app.schemas import (
    CohortRiskRow,
    CourseDifficultyRow,
    DashboardSummary,
    StudyStreakOut,
)
from app.ml_engine import (
    classify_burnout,
    compute_academic_health,
    compute_risk_probability,
    generate_shap_explanation,
)
from app.rbac import require_role
from app.services.streak_service import get_student_streak

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/my-streak", response_model=StudyStreakOut)
async def my_streak(
    auth: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    streak = await get_student_streak(db, auth["id"])
    return StudyStreakOut(
        student_id=streak.student_id,
        current_streak=streak.current_streak,
        longest_streak=streak.longest_streak,
        last_activity_date=(streak.last_activity_date.isoformat() if streak.last_activity_date else None),
    )


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: dict = Depends(require_role("advisor")),
):
    caller_role = request.headers.get("x-user-role", "").lower()
    caller_id = int(request.headers.get("x-user-id", "0"))

    # If advisor (teacher), restrict to their department's students
    dept_filter: str | None = None
    if caller_role == "advisor":
        teacher = await db.get(Teacher, caller_id)
        if teacher and teacher.department:
            dept_filter = teacher.department

    # Fetch students — filtered by dept if advisor
    if dept_filter:
        result = await db.execute(
            select(Student).where(Student.department == dept_filter).order_by(Student.id)
        )
    else:
        result = await db.execute(select(Student).order_by(Student.id))
    students = result.scalars().all()

    student_ids = [s.id for s in students]
    cis_scores = {}
    if student_ids:
        cis_result = await db.execute(
            select(CISScore).where(CISScore.student_id.in_(student_ids))
        )
        for row in cis_result.scalars().all():
            cis_scores[row.student_id] = row.score

    cohort_risks: list[CohortRiskRow] = []
    total_health = 0.0
    at_risk_count = 0

    for s in students:
        risk = compute_risk_probability(s.id)
        health = compute_academic_health(s.id)
        burnout = classify_burnout(s.id)
        shap = generate_shap_explanation(s.id)
        top_factor = shap[0].feature if shap else "n/a"

        total_health += health
        if risk > 0.4:
            at_risk_count += 1

        batch = (
            f"{s.batch_start_year}–{s.batch_end_year}"
            if s.batch_start_year and s.batch_end_year
            else None
        )
        cohort_risks.append(CohortRiskRow(
            student_id=s.id,
            student_name=f"{s.first_name} {s.last_name}",
            department=s.department,
            section=s.section,
            batch=batch,
            at_risk_probability=risk,
            academic_health_score=health,
            burnout_category=burnout,
            top_risk_factor=top_factor,
            cis_score=cis_scores.get(s.id),
        ))

    # Course heatmap
    course_result = await db.execute(select(Course).order_by(Course.id))
    courses = course_result.scalars().all()

    course_heatmap: list[CourseDifficultyRow] = []
    for c in courses:
        enroll_result = await db.execute(
            select(Enrollment.student_id).where(Enrollment.course_id == c.id)
        )
        enrolled_ids = [r[0] for r in enroll_result.all()]
        avg_risk = 0.0
        if enrolled_ids:
            avg_risk = round(
                sum(compute_risk_probability(sid) for sid in enrolled_ids) / len(enrolled_ids),
                3,
            )
        course_heatmap.append(CourseDifficultyRow(
            course_id=c.id,
            course_code=c.code,
            course_title=c.title,
            department=c.department,
            difficulty_rating=c.difficulty_rating,
            avg_student_risk=avg_risk,
            enrollment_count=len(enrolled_ids),
        ))

    avg_health = round(total_health / len(students), 1) if students else 0.0

    return DashboardSummary(
        total_students=len(students),
        at_risk_count=at_risk_count,
        avg_health_score=avg_health,
        cohort_risks=cohort_risks,
        course_heatmap=course_heatmap,
    )
