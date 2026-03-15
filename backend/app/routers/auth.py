"""Authentication endpoints for demo login.

Supports role-scoped login: student, staff (advisor), and admin.
Looks up a user by email and verifies their role matches the requested portal.
In production this would verify credentials / issue JWTs.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Admin, Student, Teacher
from app.security import verify_password, hash_password
from app.rbac import require_role

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


# ── Schemas ────────────────────────────────────────────────────────────

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


# ── Profile endpoints ────────────────────────────────────────────────

class ProfileOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    department: str | None = None
    section: str | None = None
    batch_start_year: int | None = None
    batch_end_year: int | None = None
    created_at: datetime | None = None
    role: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


async def _get_user_by_auth(auth: dict, db):
    user_id = auth["id"]
    role = auth["role"]
    if role == "advisor":
        return await db.get(Teacher, user_id), role
    if role == "admin":
        return await db.get(Admin, user_id), role
    return await db.get(Student, user_id), role


@router.get("/me", response_model=ProfileOut)
async def get_me(
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    user, role = await _get_user_by_auth(auth, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ProfileOut(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=getattr(user, "phone", None),
        department=getattr(user, "department", None),
        section=getattr(user, "section", None),
        batch_start_year=getattr(user, "batch_start_year", None),
        batch_end_year=getattr(user, "batch_end_year", None),
        created_at=getattr(user, "created_at", None),
        role=role,
    )


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
    user, _ = await _get_user_by_auth(auth, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return {"message": "Password updated successfully"}
