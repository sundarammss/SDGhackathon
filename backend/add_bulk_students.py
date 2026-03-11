"""
Script to add 500 students across CSBS, IT, and AIDS departments.

Distribution:
  CSBS  – no section | batches 2023-2027 & 2024-2028 → 100 students (50/batch)
  IT    – sections A & B | batches 2023-2027 & 2024-2028 → 200 students (50/group)
  AIDS  – sections A & B | batches 2023-2027 & 2024-2028 → 200 students (50/group)
  Total = 500

Run:
  cd backend
  source .venv/bin/activate
  python add_bulk_students.py
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Make sure the app package is importable
sys.path.insert(0, ".")

from app.database import async_session
from app.models import Student
from app.security import hash_password

DEMO_PASSWORD = "Demo@1234"

# ── Name pools (Indian names) ─────────────────────────────────────────
FIRST_NAMES = [
    "Aarav", "Aditya", "Akash", "Akshay", "Anil",
    "Ananya", "Anusha", "Arjun", "Aruna", "Balaji",
    "Bharath", "Deepa", "Dhruv", "Divya", "Ganesh",
    "Geetha", "Gopal", "Harish", "Haritha", "Jaya",
    "Janani", "Karthik", "Kavitha", "Keerthana", "Kiran",
    "Lakshmi", "Lavanya", "Manoj", "Meena", "Mohan",
    "Muthu", "Nithya", "Pooja", "Priya", "Rahul",
    "Rajesh", "Rama", "Ramya", "Rekha", "Riya",
    "Rohan", "Sanjay", "Saranya", "Selvam", "Senthil",
    "Sneha", "Suresh", "Surya", "Vijay", "Vignesh",
]

LAST_NAMES = [
    "Annamalai", "Arumugam", "Balasubramanian", "Chandran", "Durai",
    "Govindarajan", "Gupta", "Iyer", "Kannan", "Krishnan",
    "Kumar", "Manikandan", "Mehta", "Murugan", "Natarajan",
    "Nair", "Patel", "Periasamy", "Pillai", "Rajan",
    "Ramasamy", "Reddy", "Saravanan", "Selvakumar", "Sharma",
    "Singh", "Subramaniam", "Sundaram", "Swaminathan", "Venkatesh",
]

# Total unique combos = 50 × 30 = 1500 — more than enough for 500
def _name_at(index: int) -> tuple[str, str]:
    first = FIRST_NAMES[index % len(FIRST_NAMES)]
    last = LAST_NAMES[(index // len(FIRST_NAMES)) % len(LAST_NAMES)]
    return first, last


def _email(first: str, last: str, dept: str, idx: int) -> str:
    dept_code = dept.lower().replace(" ", "")
    return f"{first.lower()}.{last.lower()}{idx}@{dept_code}.university.edu"


def _phone(idx: int) -> str:
    base = 9000000000 + idx
    return str(base)


def build_student_records() -> list[dict]:
    """Return 500 student dicts covering the required dept/section/batch combos."""
    records: list[dict] = []

    # Groups: (dept, section|None, batch_start, batch_end, count)
    groups = [
        # CSBS – no section
        ("CSBS", None, 2023, 2027, 50),
        ("CSBS", None, 2024, 2028, 50),
        # IT – sections A & B
        ("IT", "A", 2023, 2027, 50),
        ("IT", "A", 2024, 2028, 50),
        ("IT", "B", 2023, 2027, 50),
        ("IT", "B", 2024, 2028, 50),
        # AIDS – sections A & B
        ("AIDS", "A", 2023, 2027, 50),
        ("AIDS", "A", 2024, 2028, 50),
        ("AIDS", "B", 2023, 2027, 50),
        ("AIDS", "B", 2024, 2028, 50),
    ]

    global_idx = 1
    for dept, section, b_start, b_end, count in groups:
        for i in range(count):
            first, last = _name_at(global_idx - 1)
            rec = {
                "first_name": first,
                "last_name": last,
                "email": _email(first, last, dept, global_idx),
                "department": dept,
                "section": section,
                "batch_start_year": b_start,
                "batch_end_year": b_end,
                "phone": _phone(global_idx),
            }
            records.append(rec)
            global_idx += 1

    return records


async def run() -> None:
    pw = hash_password(DEMO_PASSWORD)
    records = build_student_records()

    async with async_session() as db:
        # Collect existing emails to avoid duplicates on re-run
        existing_emails: set[str] = set(
            (await db.execute(select(Student.email))).scalars().all()
        )

        added = 0
        skipped = 0
        for rec in records:
            if rec["email"] in existing_emails:
                skipped += 1
                continue
            db.add(Student(**rec, password_hash=pw))
            existing_emails.add(rec["email"])
            added += 1

        await db.commit()
        print(f"Done — added {added} students, skipped {skipped} duplicates.")
        print(f"Total attempted: {len(records)}")


if __name__ == "__main__":
    asyncio.run(run())
