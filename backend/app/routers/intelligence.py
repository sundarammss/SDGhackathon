"""Risk-profile, what-if simulator, peer matching, and intervention endpoints."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Intervention, RiskScore, Student
from app.schemas import (
    InterventionOut,
    PeerMatchResponse,
    RiskProfileOut,
    WhatIfRequest,
    WhatIfResponse,
)
from app.ml_engine import (
    classify_burnout,
    compute_academic_health,
    compute_risk_probability,
    generate_shap_explanation,
    peer_synergy_match,
    recommend_interventions,
    what_if_projection,
)
from app.rbac import require_role

router = APIRouter(prefix="/api/v1/students", tags=["Intelligence"])


# ── Risk Profile ──────────────────────────────────────────────────────

@router.get("/{student_id}/risk-profile", response_model=RiskProfileOut)
async def get_risk_profile(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    risk = compute_risk_probability(student_id)
    health = compute_academic_health(student_id)
    burnout = classify_burnout(student_id)
    shap = generate_shap_explanation(student_id)
    interventions = recommend_interventions(student_id)
    now = datetime.now(timezone.utc)

    # Persist the computed risk score
    score = RiskScore(
        student_id=student_id,
        at_risk_probability=risk,
        academic_health_score=health,
        burnout_category=burnout,
        shap_explanation=json.dumps([s.model_dump() for s in shap]),
        computed_at=now,
    )
    db.add(score)

    # Auto-generate interventions if risk is elevated
    if risk > 0.35:
        for msg in interventions:
            db.add(Intervention(
                student_id=student_id,
                intervention_type="nudge",
                message=msg,
            ))

    await db.commit()

    return RiskProfileOut(
        student_id=student_id,
        student_name=f"{student.first_name} {student.last_name}",
        at_risk_probability=risk,
        academic_health_score=health,
        burnout_category=burnout,
        shap_explanation=shap,
        recommended_interventions=interventions,
        computed_at=now,
    )


# ── What-If Simulator ────────────────────────────────────────────────

@router.post("/{student_id}/what-if", response_model=WhatIfResponse)
async def what_if_simulator(
    student_id: int,
    payload: WhatIfRequest,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    result = what_if_projection(
        student_id,
        attendance_change_pct=payload.attendance_change_pct,
        study_hours_change=payload.study_hours_change,
        assignment_completion_change_pct=payload.assignment_completion_change_pct,
        forum_participation_change=payload.forum_participation_change,
    )
    return WhatIfResponse(**result)


# ── Peer Synergy Matchmaking ─────────────────────────────────────────

@router.get("/{student_id}/peer-matches", response_model=PeerMatchResponse)
async def get_peer_matches(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get all other student IDs as candidates
    result = await db.execute(select(Student.id).where(Student.id != student_id))
    candidate_ids = [row[0] for row in result.all()]

    matches = peer_synergy_match(student_id, candidate_ids)

    # Enrich peer names from DB
    for m in matches:
        peer = await db.get(Student, m.peer_id)
        if peer:
            m.peer_name = f"{peer.first_name} {peer.last_name}"

    return PeerMatchResponse(student_id=student_id, matches=matches)


# ── Interventions ────────────────────────────────────────────────────

@router.get("/{student_id}/interventions", response_model=list[InterventionOut])
async def get_interventions(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    result = await db.execute(
        select(Intervention)
        .where(Intervention.student_id == student_id)
        .order_by(Intervention.created_at.desc())
    )
    return result.scalars().all()
