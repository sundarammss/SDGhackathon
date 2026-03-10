"""Mock ML / Predictive-Intelligence engine.

Simulates a hybrid ensemble model that produces:
  - at-risk probability
  - academic health score
  - SHAP-based feature explanations
  - burnout classification
  - what-if counterfactual projections
  - peer-synergy matching

All values are deterministic per student_id so results are reproducible for
demos but varied enough to look realistic.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from app.schemas import (
    PeerMatch,
    ShapFeature,
)


def _seed(student_id: int, salt: str = "") -> float:
    """Deterministic pseudo-random float in [0,1) from student_id."""
    h = hashlib.sha256(f"{student_id}:{salt}".encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def compute_academic_health(student_id: int) -> float:
    """Return a 0-100 Academic Health Score."""
    base = _seed(student_id, "health")
    return round(40 + base * 55, 1)  # range ≈ 40‥95


def compute_risk_probability(student_id: int) -> float:
    """Return at-risk probability 0‥1."""
    health = compute_academic_health(student_id)
    noise = (_seed(student_id, "risk") - 0.5) * 0.15
    risk = max(0.0, min(1.0, 1.0 - health / 100.0 + noise))
    return round(risk, 3)


def classify_burnout(student_id: int) -> str:
    """Burnout Filter: classify into none / disengagement / conceptual_confusion / cognitive_overload."""
    v = _seed(student_id, "burnout")
    if v < 0.40:
        return "none"
    if v < 0.60:
        return "disengagement"
    if v < 0.80:
        return "conceptual_confusion"
    return "cognitive_overload"


def generate_shap_explanation(student_id: int) -> list[ShapFeature]:
    """Return mock SHAP feature attributions."""
    features = [
        ("attendance_pct", 82 + _seed(student_id, "att") * 18, 0.0),
        ("assignment_timeliness", 0.6 + _seed(student_id, "timely") * 0.4, 0.0),
        ("forum_participation", 2 + _seed(student_id, "forum") * 15, 0.0),
        ("time_on_task_hrs", 4 + _seed(student_id, "tot") * 20, 0.0),
        ("score_trend", -0.2 + _seed(student_id, "trend") * 0.5, 0.0),
        ("help_seeking", 0 + _seed(student_id, "help") * 8, 0.0),
    ]
    explanations: list[ShapFeature] = []
    for name, value, _ in features:
        impact = round((_seed(student_id, f"shap_{name}") - 0.45) * 0.4, 4)
        explanations.append(ShapFeature(feature=name, value=round(value, 2), impact=impact))
    explanations.sort(key=lambda s: abs(s.impact), reverse=True)
    return explanations


def recommend_interventions(student_id: int) -> list[str]:
    """Return adaptive intervention suggestions."""
    risk = compute_risk_probability(student_id)
    burnout = classify_burnout(student_id)
    recs: list[str] = []

    if risk > 0.6:
        recs.append("Schedule advisor check-in within 48 h")
    if risk > 0.4:
        recs.append("Activate targeted tutoring for weakest subject")
    if burnout == "disengagement":
        recs.append("Send re-engagement nudge with peer success story")
    elif burnout == "conceptual_confusion":
        recs.append("Recommend foundational review material")
    elif burnout == "cognitive_overload":
        recs.append("Suggest workload redistribution and break schedule")
    if risk > 0.3:
        recs.append("Pair with high-performing peer mentor")
    if not recs:
        recs.append("No immediate intervention needed — continue monitoring")
    return recs


def what_if_projection(
    student_id: int,
    attendance_change_pct: float = 0.0,
    study_hours_change: float = 0.0,
    assignment_completion_change_pct: float = 0.0,
    forum_participation_change: int = 0,
) -> dict:
    """Counterfactual simulator: project how risk & grade shift with behaviour changes."""
    current_risk = compute_risk_probability(student_id)
    current_grade = compute_academic_health(student_id)

    delta_risk = (
        -attendance_change_pct * 0.004
        - study_hours_change * 0.015
        - assignment_completion_change_pct * 0.003
        - forum_participation_change * 0.008
    )
    projected_risk = max(0.0, min(1.0, round(current_risk + delta_risk, 3)))

    delta_grade = (
        attendance_change_pct * 0.35
        + study_hours_change * 1.2
        + assignment_completion_change_pct * 0.25
        + forum_participation_change * 0.6
    )
    projected_grade = max(0.0, min(100.0, round(current_grade + delta_grade, 1)))

    factors = [
        ShapFeature(feature="attendance_change", value=attendance_change_pct, impact=round(-attendance_change_pct * 0.004, 4)),
        ShapFeature(feature="study_hours_change", value=study_hours_change, impact=round(-study_hours_change * 0.015, 4)),
        ShapFeature(feature="assignment_completion_change", value=assignment_completion_change_pct, impact=round(-assignment_completion_change_pct * 0.003, 4)),
        ShapFeature(feature="forum_participation_change", value=float(forum_participation_change), impact=round(-forum_participation_change * 0.008, 4)),
    ]

    return {
        "student_id": student_id,
        "current_risk": current_risk,
        "projected_risk": projected_risk,
        "current_predicted_grade": current_grade,
        "projected_predicted_grade": projected_grade,
        "factors": factors,
    }


def peer_synergy_match(student_id: int, candidate_ids: list[int]) -> list[PeerMatch]:
    """Match complementary students for study groups."""
    strengths_pool = [
        "quantitative-reasoning", "writing", "time-management",
        "critical-thinking", "lab-skills", "presentation",
        "coding", "research-methodology",
    ]
    matches: list[PeerMatch] = []
    for cid in candidate_ids:
        if cid == student_id:
            continue
        compat = round(0.4 + _seed(student_id * 1000 + cid, "compat") * 0.55, 2)
        n_strengths = 2 + int(_seed(cid, "ns") * 3)
        start = int(_seed(cid, "si") * len(strengths_pool))
        compl_strengths = [strengths_pool[(start + i) % len(strengths_pool)] for i in range(n_strengths)]
        matches.append(PeerMatch(
            peer_id=cid,
            peer_name=f"Student #{cid}",
            compatibility_score=compat,
            complementary_strengths=compl_strengths,
        ))
    matches.sort(key=lambda m: m.compatibility_score, reverse=True)
    return matches[:5]
