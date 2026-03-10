"""Authentication endpoints for demo login.

Supports role-scoped login: student, staff (advisor), and admin.
Looks up a user by email and verifies their role matches the requested portal.
In production this would verify credentials / issue JWTs.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Admin, Student, Teacher
from app.security import verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    portal: str | None = None  # "student" | "staff" | "admin"


class LoginResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    cohort: str | None

    model_config = {"from_attributes": True}


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    portal = (payload.portal or "").lower()

    # Choose the table based on the portal
    if portal == "staff":
        result = await db.execute(select(Teacher).where(Teacher.email == payload.email))
        user = result.scalars().first()
        user_role = "advisor"
    elif portal == "admin":
        result = await db.execute(select(Admin).where(Admin.email == payload.email))
        user = result.scalars().first()
        user_role = "admin"
    else:
        result = await db.execute(select(Student).where(Student.email == payload.email))
        user = result.scalars().first()
        user_role = "student"

    if not user:
        raise HTTPException(status_code=401, detail="No account found with that email.")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password.")

    cohort = getattr(user, "cohort", None)

    return LoginResponse(
        id=user.id,
        name=f"{user.first_name} {user.last_name}",
        email=user.email,
        role=user_role,
        cohort=cohort,
    )


# ── Convenience portal-scoped endpoints ────────────────────────────────

@router.post("/login/student", response_model=LoginResponse)
async def login_student(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    payload.portal = "student"
    return await login(payload, db)


@router.post("/login/staff", response_model=LoginResponse)
async def login_staff(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    payload.portal = "staff"
    return await login(payload, db)


@router.post("/login/admin", response_model=LoginResponse)
async def login_admin(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    payload.portal = "admin"
    return await login(payload, db)
