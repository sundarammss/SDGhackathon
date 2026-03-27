"""Authentication endpoints for demo login.

Supports role-scoped login: student, staff (advisor), and admin.
Looks up a user by email and verifies their role matches the requested portal.
In production this would verify credentials / issue JWTs.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    Admin,
    ApprovalStatus,
    Assignment,
    ChatMessage,
    CompetitionStatus,
    Conversation,
    PeerRequest,
    PeerRequestStatus,
    Quiz,
    Student,
    StudentCompetition,
    StudentNotificationSeen,
    Teacher,
)
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


class StudentNotificationOut(BaseModel):
    id: str
    event_type: str
    title: str
    message: str
    created_at: str
    action_path: str
    is_seen: bool = False


class MarkNotificationsSeenRequest(BaseModel):
    notification_ids: list[str]


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


@router.get("/student-notifications", response_model=list[StudentNotificationOut])
async def get_student_notifications(
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    student = await db.get(Student, auth["id"])
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    notifications: list[StudentNotificationOut] = []

    # Quizzes assigned to the student's department (or global quizzes).
    quiz_stmt = (
        select(Quiz)
        .where(
            or_(
                Quiz.assigned_department.is_(None),
                Quiz.assigned_department == student.department,
            )
        )
        .order_by(Quiz.created_at.desc())
        .limit(10)
    )
    quiz_result = await db.execute(quiz_stmt)
    for quiz in quiz_result.scalars().all():
        notifications.append(
            StudentNotificationOut(
                id=f"quiz-{quiz.id}",
                event_type="quiz_assigned",
                title="New quiz assigned",
                message=f"{quiz.title}",
                created_at=quiz.created_at.isoformat() if quiz.created_at else "",
                action_path="/quizzes",
            )
        )

    # Assignments matching the student's dept / batch / section targeting.
    assignment_stmt = (
        select(Assignment)
        .where(
            and_(
                Assignment.department == student.department,
                Assignment.batch_start_year == student.batch_start_year,
                Assignment.batch_end_year == student.batch_end_year,
                or_(Assignment.section.is_(None), Assignment.section == student.section),
            )
        )
        .order_by(Assignment.created_at.desc())
        .limit(10)
    )
    assignment_result = await db.execute(assignment_stmt)
    for assignment in assignment_result.scalars().all():
        notifications.append(
            StudentNotificationOut(
                id=f"assignment-{assignment.id}",
                event_type="assignment_assigned",
                title="New assignment assigned",
                message=f"{assignment.title} (due {assignment.due_date})",
                created_at=assignment.created_at.isoformat() if assignment.created_at else "",
                action_path="/tasks",
            )
        )

    # Incoming chat messages from peers.
    message_stmt = (
        select(ChatMessage)
        .join(Conversation, ChatMessage.conversation_id == Conversation.id)
        .where(
            and_(
                or_(
                    Conversation.student_a_id == student.id,
                    Conversation.student_b_id == student.id,
                ),
                ChatMessage.sender_id != student.id,
            )
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    message_result = await db.execute(message_stmt)
    for msg in message_result.scalars().all():
        sender = await db.get(Student, msg.sender_id)
        sender_name = (
            f"{sender.first_name} {sender.last_name}" if sender else "A peer"
        )
        preview = (msg.body or "").strip()
        if not preview and getattr(msg, "attachment_name", None):
            preview = f"sent an attachment: {msg.attachment_name}"
        notifications.append(
            StudentNotificationOut(
                id=f"chat-{msg.id}",
                event_type="chat_message",
                title="New chat message",
                message=f"{sender_name}: {preview[:80]}",
                created_at=msg.created_at.isoformat() if msg.created_at else "",
                action_path="/chat",
            )
        )

    # Pending incoming peer match requests.
    peer_stmt = (
        select(PeerRequest)
        .where(
            and_(
                PeerRequest.to_student_id == student.id,
                PeerRequest.status == PeerRequestStatus.PENDING,
            )
        )
        .order_by(PeerRequest.created_at.desc())
        .limit(10)
    )
    peer_result = await db.execute(peer_stmt)
    for req in peer_result.scalars().all():
        sender = await db.get(Student, req.from_student_id)
        sender_name = (
            f"{sender.first_name} {sender.last_name}" if sender else "A student"
        )
        notifications.append(
            StudentNotificationOut(
                id=f"peer-{req.id}",
                event_type="peer_request",
                title="Peer match request",
                message=f"{sender_name} sent you a peer matching request",
                created_at=req.created_at.isoformat() if req.created_at else "",
                action_path="/peers",
            )
        )

    # Staff-approved competition requests.
    comp_stmt = (
        select(StudentCompetition)
        .where(
            and_(
                StudentCompetition.student_id == student.id,
                StudentCompetition.approval_status == ApprovalStatus.APPROVED,
            )
        )
        .order_by(StudentCompetition.updated_at.desc())
        .limit(10)
    )
    comp_result = await db.execute(comp_stmt)
    for comp in comp_result.scalars().all():
        notifications.append(
            StudentNotificationOut(
                id=f"competition-{comp.id}",
                event_type="competition_approved",
                title="Competition request accepted",
                message=(
                    f"Your competition submission '{comp.competition_name}' "
                    f"({CompetitionStatus(comp.status).value}) was accepted"
                ),
                created_at=comp.updated_at.isoformat() if comp.updated_at else "",
                action_path="/competitions",
            )
        )

    notifications.sort(key=lambda n: n.created_at, reverse=True)
    notifications = notifications[:20]

    if notifications:
        ids = [n.id for n in notifications]
        seen_stmt = select(StudentNotificationSeen.notification_id).where(
            and_(
                StudentNotificationSeen.student_id == student.id,
                StudentNotificationSeen.notification_id.in_(ids),
            )
        )
        seen_result = await db.execute(seen_stmt)
        seen_ids = set(seen_result.scalars().all())
        for n in notifications:
            n.is_seen = n.id in seen_ids

    return notifications


@router.post("/student-notifications/mark-seen")
async def mark_student_notifications_seen(
    payload: MarkNotificationsSeenRequest,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    if not payload.notification_ids:
        return {"marked": 0}

    # Keep writes bounded and deduplicated.
    ids = list(dict.fromkeys([n.strip() for n in payload.notification_ids if n and n.strip()]))[:200]
    if not ids:
        return {"marked": 0}

    existing_stmt = select(StudentNotificationSeen.notification_id).where(
        and_(
            StudentNotificationSeen.student_id == auth["id"],
            StudentNotificationSeen.notification_id.in_(ids),
        )
    )
    existing_result = await db.execute(existing_stmt)
    existing_ids = set(existing_result.scalars().all())

    to_insert = [
        StudentNotificationSeen(student_id=auth["id"], notification_id=nid)
        for nid in ids
        if nid not in existing_ids
    ]

    if to_insert:
        db.add_all(to_insert)
        await db.commit()

    return {"marked": len(to_insert)}
