from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import StudyStreak


def _today_utc_date():
    return datetime.now(timezone.utc).date()


async def mark_study_activity(db: AsyncSession, student_id: int, *, commit: bool = True) -> StudyStreak:
    today = _today_utc_date()
    streak = (
        await db.execute(select(StudyStreak).where(StudyStreak.student_id == student_id))
    ).scalar_one_or_none()

    if streak is None:
        streak = StudyStreak(
            student_id=student_id,
            current_streak=1,
            longest_streak=1,
            last_activity_date=today,
        )
        db.add(streak)
    else:
        last_date = streak.last_activity_date
        if last_date != today:
            if last_date == today - timedelta(days=1):
                streak.current_streak += 1
            else:
                streak.current_streak = 1
            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak
            streak.last_activity_date = today

    if commit:
        await db.commit()
        await db.refresh(streak)

    return streak


async def get_student_streak(db: AsyncSession, student_id: int) -> StudyStreak:
    streak = (
        await db.execute(select(StudyStreak).where(StudyStreak.student_id == student_id))
    ).scalar_one_or_none()

    if streak is None:
        streak = StudyStreak(
            student_id=student_id,
            current_streak=0,
            longest_streak=0,
            last_activity_date=None,
        )
        db.add(streak)
        await db.commit()
        await db.refresh(streak)

    return streak
