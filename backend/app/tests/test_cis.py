from __future__ import annotations

from datetime import datetime

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import get_db
from app.ml.cis_engine import build_graph, classify, compute_scores, get_top_collaborators
from app.models import AssignmentHelp, ForumInteraction, PeerChatInteraction
from app.routers import cis as cis_router


@pytest.fixture
def sync_db_session():
    engine = create_engine("sqlite:///:memory:")
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    ForumInteraction.__table__.create(engine)
    PeerChatInteraction.__table__.create(engine)
    AssignmentHelp.__table__.create(engine)

    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


def test_build_graph_edge_weights(sync_db_session):
    sync_db_session.add_all(
        [
            ForumInteraction(from_student_id=1, to_student_id=2),
            ForumInteraction(from_student_id=1, to_student_id=2),
            PeerChatInteraction(from_student_id=1, to_student_id=2, message_count=2),
            AssignmentHelp(helper_student_id=1, helped_student_id=2),
        ]
    )
    sync_db_session.commit()

    graph = build_graph(sync_db_session)
    assert graph.has_edge(1, 2)
    assert graph[1][2]["weight"] == pytest.approx(5.0)


def test_compute_scores_in_range(sync_db_session):
    sync_db_session.add_all(
        [
            ForumInteraction(from_student_id=1, to_student_id=2),
            ForumInteraction(from_student_id=2, to_student_id=3),
            PeerChatInteraction(from_student_id=3, to_student_id=1, message_count=4),
            AssignmentHelp(helper_student_id=1, helped_student_id=3),
        ]
    )
    sync_db_session.commit()

    scores = compute_scores(sync_db_session)
    assert all(isinstance(student_id, int) for student_id in scores)
    assert all(0.0 <= score <= 100.0 for score in scores.values())


@pytest.mark.parametrize(
    ("score", "expected"),
    [
        (0, "Isolated learner"),
        (19, "Isolated learner"),
        (20, "Occasional participant"),
        (44, "Occasional participant"),
        (45, "Active contributor"),
        (74, "Active contributor"),
        (75, "Knowledge connector"),
        (100, "Knowledge connector"),
    ],
)
def test_classify_boundaries(score, expected):
    assert classify(float(score)) == expected


def test_get_top_collaborators_sorted(sync_db_session):
    sync_db_session.add_all(
        [
            ForumInteraction(from_student_id=1, to_student_id=3),
            PeerChatInteraction(from_student_id=1, to_student_id=2, message_count=2),
            AssignmentHelp(helper_student_id=1, helped_student_id=2),
            AssignmentHelp(helper_student_id=1, helped_student_id=4),
        ]
    )
    sync_db_session.commit()

    collaborators = get_top_collaborators(sync_db_session, student_id=1, n=5)
    weights = [entry["weight"] for entry in collaborators]
    assert weights == sorted(weights, reverse=True)
    assert collaborators[0]["student_id"] == 2


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class _FakeAsyncSession:
    def __init__(self, rows):
        self._rows = rows

    async def execute(self, _stmt):
        return _FakeResult(self._rows)


class _FakeStudent:
    def __init__(self, student_id: int, first_name: str, last_name: str, department: str | None = None):
        self.id = student_id
        self.first_name = first_name
        self.last_name = last_name
        self.department = department


class _FakeScore:
    def __init__(self, student_id: int, score: float, label: str):
        self.student_id = student_id
        self.score = score
        self.label = label
        self.computed_at = datetime.utcnow()


@pytest.mark.asyncio
async def test_get_scores_endpoint_returns_list():
    app = FastAPI()
    app.include_router(cis_router.router)

    rows = [(_FakeScore(1, 88.5, "Knowledge connector"), _FakeStudent(1, "Ana", "Lee", "DEPT-A"))]

    async def _override_get_db():
        yield _FakeAsyncSession(rows)

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/cis/scores")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_get_student_endpoint_top_collaborators(monkeypatch):
    app = FastAPI()
    app.include_router(cis_router.router)

    rows = [(_FakeScore(2, 66.0, "Active contributor"), _FakeStudent(2, "Ben", "Ray", "DEPT-B"))]

    async def _override_get_db():
        yield _FakeAsyncSession(rows)

    monkeypatch.setattr(
        cis_router,
        "_fetch_top_collaborators_with_names",
        lambda _student_id, _n=5: [
            cis_router.CISCollaborator(student_id=3, name="Cara Poe", weight=4.5)
        ],
    )
    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/cis/student/2")

    assert response.status_code == 200
    body = response.json()
    assert "top_collaborators" in body
    assert isinstance(body["top_collaborators"], list)


@pytest.mark.asyncio
async def test_get_student_not_found():
    app = FastAPI()
    app.include_router(cis_router.router)

    async def _override_get_db():
        yield _FakeAsyncSession([])

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/cis/student/99999")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_post_refresh_returns_task_id(monkeypatch):
    app = FastAPI()
    app.include_router(cis_router.router)

    class _FakeTask:
        id = "task-123"

    class _FakeDelay:
        @staticmethod
        def delay():
            return _FakeTask()

    monkeypatch.setattr(cis_router, "compute_cis_scores", _FakeDelay)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/cis/refresh")

    assert response.status_code == 202
    assert "task_id" in response.json()
