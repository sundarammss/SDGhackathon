"""Seed the database with realistic demo data for the AI-OS hackathon."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Admin, Course, Enrollment, Student, Teacher
from app.security import hash_password

# Default password for all demo accounts
DEMO_PASSWORD = "Demo@1234"


DEMO_STUDENTS = [
    {"first_name": "Aisha",   "last_name": "Patel",      "email": "aisha.patel@university.edu",    "department": "Computer Science", "section": "A", "batch_start_year": 2023, "batch_end_year": 2027, "phone": "9876543210"},
    {"first_name": "Marcus",  "last_name": "Chen",       "email": "marcus.chen@university.edu",    "department": "Computer Science", "section": "A", "batch_start_year": 2023, "batch_end_year": 2027, "phone": "9876543211"},
    {"first_name": "Sofia",   "last_name": "Ramirez",    "email": "sofia.ramirez@university.edu",  "department": "Computer Science", "section": "B", "batch_start_year": 2023, "batch_end_year": 2027, "phone": "9876543212"},
    {"first_name": "James",   "last_name": "Okafor",     "email": "james.okafor@university.edu",   "department": "Engineering",      "section": "A", "batch_start_year": 2023, "batch_end_year": 2027, "phone": "9876543213"},
    {"first_name": "Lily",    "last_name": "Nakamura",   "email": "lily.nakamura@university.edu",  "department": "Engineering",      "section": "A", "batch_start_year": 2023, "batch_end_year": 2027, "phone": "9876543214"},
    {"first_name": "David",   "last_name": "Kim",        "email": "david.kim@university.edu",      "department": "Engineering",      "section": "B", "batch_start_year": 2022, "batch_end_year": 2026, "phone": "9876543215"},
    {"first_name": "Emma",    "last_name": "Williams",   "email": "emma.williams@university.edu",  "department": "Biology",          "section": "A", "batch_start_year": 2024, "batch_end_year": 2028, "phone": "9876543216"},
    {"first_name": "Raj",     "last_name": "Gupta",      "email": "raj.gupta@university.edu",      "department": "Biology",          "section": "A", "batch_start_year": 2024, "batch_end_year": 2028, "phone": "9876543217"},
    {"first_name": "Chloe",   "last_name": "Dubois",     "email": "chloe.dubois@university.edu",   "department": "Biology",          "section": "B", "batch_start_year": 2024, "batch_end_year": 2028, "phone": "9876543218"},
    {"first_name": "Noah",    "last_name": "Andersen",   "email": "noah.andersen@university.edu",  "department": "Mathematics",      "section": "A", "batch_start_year": 2023, "batch_end_year": 2027, "phone": "9876543219"},
    {"first_name": "Fatima",  "last_name": "Al-Rashid",  "email": "fatima.alrashid@university.edu","department": "Mathematics",      "section": "B", "batch_start_year": 2023, "batch_end_year": 2027, "phone": "9876543220"},
    {"first_name": "Lucas",   "last_name": "Ferreira",   "email": "lucas.ferreira@university.edu", "department": "Mathematics",      "section": "B", "batch_start_year": 2022, "batch_end_year": 2026, "phone": "9876543221"},
]

DEMO_TEACHERS = [
    {"first_name": "Dr. Sarah", "last_name": "Mitchell", "email": "s.mitchell@university.edu", "department": "Computer Science"},
    {"first_name": "Prof. Alan", "last_name": "Turner", "email": "a.turner@university.edu", "department": "Mathematics"},
    {"first_name": "Dr. Priya", "last_name": "Sharma", "email": "p.sharma@university.edu", "department": "Biology"},
]

DEMO_ADMINS = [
    {"first_name": "Admin", "last_name": "User", "email": "admin@university.edu"},
]

DEMO_COURSES = [
    {"code": "CS101", "title": "Intro to Computer Science", "department": "Computer Science", "difficulty_rating": 0.4},
    {"code": "CS201", "title": "Data Structures & Algorithms", "department": "Computer Science", "difficulty_rating": 0.7},
    {"code": "CS301", "title": "Machine Learning Fundamentals", "department": "Computer Science", "difficulty_rating": 0.85},
    {"code": "ENG110", "title": "Engineering Mechanics", "department": "Engineering", "difficulty_rating": 0.6},
    {"code": "ENG220", "title": "Thermodynamics", "department": "Engineering", "difficulty_rating": 0.75},
    {"code": "BIO101", "title": "General Biology", "department": "Biology", "difficulty_rating": 0.35},
    {"code": "BIO201", "title": "Molecular Biology", "department": "Biology", "difficulty_rating": 0.65},
    {"code": "MATH151", "title": "Calculus I", "department": "Mathematics", "difficulty_rating": 0.55},
    {"code": "MATH252", "title": "Linear Algebra", "department": "Mathematics", "difficulty_rating": 0.7},
    {"code": "STAT301", "title": "Statistical Inference", "department": "Mathematics", "difficulty_rating": 0.8},
]

# Map department→courses for enrollment
DEPT_COURSES: dict[str, list[str]] = {
    "Computer Science": ["CS101", "CS201", "CS301", "MATH151"],
    "Engineering":      ["ENG110", "ENG220", "MATH151", "CS101"],
    "Biology":          ["BIO101", "BIO201", "STAT301"],
    "Mathematics":      ["MATH151", "MATH252", "STAT301", "CS201"],
}


async def seed_if_empty(db: AsyncSession) -> None:
    """Seed each table independently so adding new tables never skips seeding."""
    pw = hash_password(DEMO_PASSWORD)

    # ── Safety: remove any teacher/admin emails that ended up in students ──
    teacher_emails = list((await db.execute(select(Teacher.email))).scalars().all())
    admin_emails = list((await db.execute(select(Admin.email))).scalars().all())
    bad_emails = set(teacher_emails) | set(admin_emails)
    if bad_emails:
        bad_rows = (await db.execute(
            select(Student).where(Student.email.in_(bad_emails))
        )).scalars().all()
        for row in bad_rows:
            await db.delete(row)

    # ── Students ───────────────────────────────────────────────────────
    students_by_email: dict[str, Student] = {}
    existing_students = (await db.execute(select(Student).limit(1))).scalars().first()
    if existing_students is None:
        for s in DEMO_STUDENTS:
            student = Student(**s, password_hash=pw)
            db.add(student)
            students_by_email[s["email"]] = student

    # ── Teachers ───────────────────────────────────────────────────────
    existing_teachers = (await db.execute(select(Teacher).limit(1))).scalars().first()
    if existing_teachers is None:
        for t in DEMO_TEACHERS:
            db.add(Teacher(**t, password_hash=pw))

    # ── Admins ─────────────────────────────────────────────────────────
    existing_admins = (await db.execute(select(Admin).limit(1))).scalars().first()
    if existing_admins is None:
        for a in DEMO_ADMINS:
            db.add(Admin(**a, password_hash=pw))

    # ── Courses ────────────────────────────────────────────────────────
    existing_courses = (await db.execute(select(Course).limit(1))).scalars().first()
    if existing_courses is None:
        courses_by_code: dict[str, Course] = {}
        for c in DEMO_COURSES:
            course = Course(**c)
            db.add(course)
            courses_by_code[c["code"]] = course

        await db.flush()  # assigns IDs

        # Enrollments (only when students AND courses were just seeded)
        if existing_students is None:
            for s_data in DEMO_STUDENTS:
                dept = s_data.get("department")
                if not dept or dept not in DEPT_COURSES:
                    continue
                student = students_by_email[s_data["email"]]
                for course_code in DEPT_COURSES[dept]:
                    course = courses_by_code[course_code]
                    db.add(Enrollment(
                        student_id=student.id,
                        course_id=course.id,
                        semester="Spring 2026",
                        current_grade=round(55 + hash(f"{student.id}-{course.id}") % 40, 1),
                    ))

    await db.commit()
