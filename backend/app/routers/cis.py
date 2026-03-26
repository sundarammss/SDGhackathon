from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, sync_session
from app.ml.cis_engine import get_top_collaborators
from app.models import CISScore, Student
from app.schemas.cis import CISCollaborator, CISRefreshResponse, CISScoreItem, CISStudentDetail
from app.tasks.cis_tasks import compute_cis_scores

router = APIRouter(prefix="/api/cis", tags=["CIS"])


@router.get("/scores", response_model=list[CISScoreItem])
async def get_scores(db: AsyncSession = Depends(get_db)) -> list[CISScoreItem]:
    stmt = (
        select(CISScore, Student)
        .join(Student, Student.id == CISScore.student_id)
        .order_by(CISScore.score.desc())
    )
    result = await db.execute(stmt)

    output: list[CISScoreItem] = []
    for score_row, student in result.all():
        output.append(
            CISScoreItem(
                student_id=student.id,
                name=f"{student.first_name} {student.last_name}".strip(),
                department_id=student.department,
                score=float(score_row.score),
                label=score_row.label,
                computed_at=score_row.computed_at,
            )
        )
    return output


@router.get("/student/{student_id}", response_model=CISStudentDetail)
async def get_student_score(student_id: int, db: AsyncSession = Depends(get_db)) -> CISStudentDetail:
    stmt = (
        select(CISScore, Student)
        .join(Student, Student.id == CISScore.student_id)
        .where(CISScore.student_id == student_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="CIS score not found for student")

    score_row, student = row
    top_collaborators = await asyncio.to_thread(_fetch_top_collaborators_with_names, student_id, 5)

    return CISStudentDetail(
        student_id=student.id,
        name=f"{student.first_name} {student.last_name}".strip(),
        score=float(score_row.score),
        label=score_row.label,
        computed_at=score_row.computed_at,
        top_collaborators=top_collaborators,
    )


@router.get("/department/{dept_id}", response_model=list[CISScoreItem])
async def get_department_scores(dept_id: str, db: AsyncSession = Depends(get_db)) -> list[CISScoreItem]:
    stmt = (
        select(CISScore, Student)
        .join(Student, Student.id == CISScore.student_id)
        .where(Student.department == dept_id)
        .order_by(CISScore.score.desc())
    )
    result = await db.execute(stmt)

    output: list[CISScoreItem] = []
    for score_row, student in result.all():
        output.append(
            CISScoreItem(
                student_id=student.id,
                name=f"{student.first_name} {student.last_name}".strip(),
                department_id=student.department,
                score=float(score_row.score),
                label=score_row.label,
                computed_at=score_row.computed_at,
            )
        )
    return output


@router.post("/refresh", response_model=CISRefreshResponse, status_code=status.HTTP_202_ACCEPTED)
async def refresh_scores() -> CISRefreshResponse:
    task = compute_cis_scores.delay()
    return CISRefreshResponse(message="CIS refresh queued", task_id=task.id)


def _fetch_top_collaborators_with_names(student_id: int, n: int = 5) -> list[CISCollaborator]:
    db = sync_session()
    try:
        rows = get_top_collaborators(db, student_id, n)
        if not rows:
            return []

        collaborator_ids = [int(row["student_id"]) for row in rows]
        students = db.execute(
            select(Student.id, Student.first_name, Student.last_name)
            .where(Student.id.in_(collaborator_ids))
        ).all()
        names = {
            int(student_id_value): f"{first_name} {last_name}".strip()
            for student_id_value, first_name, last_name in students
        }

        output: list[CISCollaborator] = []
        for row in rows:
            target_student_id = int(row["student_id"])
            output.append(
                CISCollaborator(
                    student_id=target_student_id,
                    name=names.get(target_student_id, f"Student {target_student_id}"),
                    weight=float(row["weight"]),
                )
            )
        return output
    finally:
        db.close()
