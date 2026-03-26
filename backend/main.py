"""AI-OS Backend — FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.seed import seed_if_empty
from app.database import async_session

from app.routers import auth, students, courses, dashboard, intelligence, quiz, forum, teachers
from app.routers import chat
from app.routers import exam_marks
from app.routers import attendance
from app.routers import competitions
from app.routers import assignments
from app.routers import resources
from app.routers import cis


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise the database and seed demo data on startup."""
    await init_db()
    async with async_session() as db:
        await seed_if_empty(db)
        await db.commit()
    yield


app = FastAPI(
    title="AI-OS API",
    description="Academic Intelligence Operating System — backend API",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────
# Allow the Vite dev server (and any localhost origin) during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(courses.router)
app.include_router(dashboard.router)
app.include_router(intelligence.router)
app.include_router(quiz.router)
app.include_router(forum.router)
app.include_router(teachers.router)
app.include_router(chat.router)
app.include_router(exam_marks.router)
app.include_router(attendance.router)
app.include_router(competitions.router)
app.include_router(assignments.router)
app.include_router(resources.router)
app.include_router(cis.router)


# ── Health check ───────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok"}
