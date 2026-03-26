from __future__ import annotations

from collections import defaultdict

import networkx as nx
import numpy as np
from sqlalchemy import func, select
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.orm import Session

from app.models import AssignmentHelp, CISScore, ForumInteraction, PeerChatInteraction


def build_graph(db: Session) -> nx.DiGraph:
    graph = nx.DiGraph()

    forum_rows = db.execute(select(ForumInteraction)).scalars().all()
    for row in forum_rows:
        _add_weighted_edge(graph, int(row.from_student_id), int(row.to_student_id), 1.0)

    peer_chat_rows = db.execute(select(PeerChatInteraction)).scalars().all()
    for row in peer_chat_rows:
        message_count = int(row.message_count or 1)
        _add_weighted_edge(
            graph,
            int(row.from_student_id),
            int(row.to_student_id),
            0.5 * float(message_count),
        )

    assignment_help_rows = db.execute(select(AssignmentHelp)).scalars().all()
    for row in assignment_help_rows:
        _add_weighted_edge(
            graph,
            int(row.helper_student_id),
            int(row.helped_student_id),
            2.0,
        )

    return graph


def compute_scores(db: Session) -> dict[int, float]:
    graph = build_graph(db)
    if graph.number_of_nodes() == 0:
        return {}

    pagerank_scores = nx.pagerank(graph, weight="weight", alpha=0.85)
    out_degree = dict(graph.out_degree(weight="weight"))
    in_degree = dict(graph.in_degree(weight="weight"))

    raw_scores: dict[int, float] = {}
    for node in graph.nodes:
        raw_scores[int(node)] = (
            (float(pagerank_scores.get(node, 0.0)) * 60.0)
            + (float(out_degree.get(node, 0.0)) * 0.3)
            + (float(in_degree.get(node, 0.0)) * 0.1)
        )

    values = np.array(list(raw_scores.values()), dtype=float)
    min_value = float(values.min())
    max_value = float(values.max())

    if np.isclose(max_value, min_value):
        normalized_value = 100.0 if max_value > 0 else 0.0
        return {student_id: normalized_value for student_id in raw_scores}

    return {
        student_id: float(((raw_value - min_value) / (max_value - min_value)) * 100.0)
        for student_id, raw_value in raw_scores.items()
    }


def classify(score: float) -> str:
    if score >= 75:
        return "Knowledge connector"
    if score >= 45:
        return "Active contributor"
    if score >= 20:
        return "Occasional participant"
    return "Isolated learner"


def get_top_collaborators(db: Session, student_id: int, n: int = 5) -> list[dict]:
    weighted_totals: defaultdict[int, float] = defaultdict(float)

    forum_rows = db.execute(
        select(ForumInteraction).where(ForumInteraction.from_student_id == student_id)
    ).scalars().all()
    for row in forum_rows:
        weighted_totals[int(row.to_student_id)] += 1.0

    peer_chat_rows = db.execute(
        select(PeerChatInteraction).where(PeerChatInteraction.from_student_id == student_id)
    ).scalars().all()
    for row in peer_chat_rows:
        weighted_totals[int(row.to_student_id)] += 0.5 * float(row.message_count or 1)

    assignment_help_rows = db.execute(
        select(AssignmentHelp).where(AssignmentHelp.helper_student_id == student_id)
    ).scalars().all()
    for row in assignment_help_rows:
        weighted_totals[int(row.helped_student_id)] += 2.0

    sorted_rows = sorted(weighted_totals.items(), key=lambda item: (-item[1], item[0]))
    return [{"student_id": target_id, "weight": weight} for target_id, weight in sorted_rows[:n]]


def save_scores(db: Session, scores: dict[int, float]) -> None:
    if not scores:
        return

    rows = [
        {
            "student_id": student_id,
            "score": float(score),
            "label": classify(float(score)),
        }
        for student_id, score in scores.items()
    ]

    stmt = insert(CISScore).values(rows)
    upsert_stmt = stmt.on_duplicate_key_update(
        score=stmt.inserted.score,
        label=stmt.inserted.label,
        computed_at=func.now(),
    )
    db.execute(upsert_stmt)
    db.commit()


def _add_weighted_edge(graph: nx.DiGraph, source: int, target: int, weight: float) -> None:
    if graph.has_edge(source, target):
        graph[source][target]["weight"] = float(graph[source][target]["weight"]) + weight
    else:
        graph.add_edge(source, target, weight=weight)
