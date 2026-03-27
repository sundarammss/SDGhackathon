from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi import UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import PeerRequest, PeerRequestStatus, Conversation, ChatMessage, Student, PeerBlock
from app.rbac import require_role

router = APIRouter(tags=["Chat"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "chat"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CHAT_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_CHAT_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ── Schemas ────────────────────────────────────────────────────────────

class PeerRequestOut(BaseModel):
    id: int
    from_student_id: int
    from_student_name: str
    to_student_id: int
    to_student_name: str
    status: str
    created_at: str

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: int
    other_student_id: int
    other_student_name: str
    last_message: str | None
    created_at: str
    is_blocked: bool = False
    blocked_by_me: bool = False

    model_config = {"from_attributes": True}


class BlockIn(BaseModel):
    blocked_student_id: int


class BlockOut(BaseModel):
    id: int
    blocker_id: int
    blocked_id: int
    created_at: str

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_name: str
    body: str
    attachment_name: str | None = None
    attachment_mime_type: str | None = None
    has_attachment: bool = False
    created_at: str

    model_config = {"from_attributes": True}


class SendRequestIn(BaseModel):
    to_student_id: int


class SendMessageIn(BaseModel):
    body: str


def _message_preview(message: ChatMessage) -> str | None:
    if message.body and message.body.strip():
        return message.body
    if message.attachment_name:
        return f"Sent an attachment: {message.attachment_name}"
    return None


# ── Peer Requests ──────────────────────────────────────────────────────

@router.post(
    "/api/v1/peer-requests/",
    status_code=status.HTTP_201_CREATED,
)
async def send_peer_request(
    payload: SendRequestIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))

    if caller_id == payload.to_student_id:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")

    # Check recipient exists
    recipient = await db.get(Student, payload.to_student_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check if a block exists between the two users
    block_check = await db.execute(
        select(PeerBlock).where(
            or_(
                and_(PeerBlock.blocker_id == caller_id, PeerBlock.blocked_id == payload.to_student_id),
                and_(PeerBlock.blocker_id == payload.to_student_id, PeerBlock.blocked_id == caller_id),
            )
        )
    )
    if block_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Cannot connect: user is blocked")

    # Check duplicate pending request
    existing = await db.execute(
        select(PeerRequest).where(
            or_(
                and_(
                    PeerRequest.from_student_id == caller_id,
                    PeerRequest.to_student_id == payload.to_student_id,
                ),
                and_(
                    PeerRequest.from_student_id == payload.to_student_id,
                    PeerRequest.to_student_id == caller_id,
                ),
            )
        )
    )
    existing_req = existing.scalar_one_or_none()
    if existing_req:
        if existing_req.status == PeerRequestStatus.PENDING:
            raise HTTPException(status_code=409, detail="Request already pending")
        if existing_req.status == PeerRequestStatus.ACCEPTED:
            raise HTTPException(status_code=409, detail="Already connected")

    pr = PeerRequest(from_student_id=caller_id, to_student_id=payload.to_student_id)
    db.add(pr)
    await db.commit()
    await db.refresh(pr)
    return {"id": pr.id, "status": pr.status}


@router.get("/api/v1/peer-requests/incoming", response_model=list[PeerRequestOut])
async def get_incoming_requests(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))
    result = await db.execute(
        select(PeerRequest)
        .options(
            selectinload(PeerRequest.from_student),
            selectinload(PeerRequest.to_student),
        )
        .where(
            PeerRequest.to_student_id == caller_id,
            PeerRequest.status == PeerRequestStatus.PENDING,
        )
        .order_by(PeerRequest.created_at.desc())
    )
    requests = result.scalars().all()
    return [
        PeerRequestOut(
            id=r.id,
            from_student_id=r.from_student_id,
            from_student_name=f"{r.from_student.first_name} {r.from_student.last_name}",
            to_student_id=r.to_student_id,
            to_student_name=f"{r.to_student.first_name} {r.to_student.last_name}",
            status=r.status.value,
            created_at=r.created_at.isoformat(),
        )
        for r in requests
    ]


@router.get("/api/v1/peer-requests/outgoing", response_model=list[PeerRequestOut])
async def get_outgoing_requests(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))
    result = await db.execute(
        select(PeerRequest)
        .options(
            selectinload(PeerRequest.from_student),
            selectinload(PeerRequest.to_student),
        )
        .where(PeerRequest.from_student_id == caller_id)
        .order_by(PeerRequest.created_at.desc())
    )
    requests = result.scalars().all()
    return [
        PeerRequestOut(
            id=r.id,
            from_student_id=r.from_student_id,
            from_student_name=f"{r.from_student.first_name} {r.from_student.last_name}",
            to_student_id=r.to_student_id,
            to_student_name=f"{r.to_student.first_name} {r.to_student.last_name}",
            status=r.status.value,
            created_at=r.created_at.isoformat(),
        )
        for r in requests
    ]


@router.patch("/api/v1/peer-requests/{request_id}/accept")
async def accept_peer_request(
    request_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))
    pr = await db.get(PeerRequest, request_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Request not found")
    if pr.to_student_id != caller_id:
        raise HTTPException(status_code=403, detail="Not your request")
    if pr.status != PeerRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request is not pending")

    pr.status = PeerRequestStatus.ACCEPTED

    # Create conversation if not exists
    existing_conv = await db.execute(
        select(Conversation).where(
            or_(
                and_(
                    Conversation.student_a_id == pr.from_student_id,
                    Conversation.student_b_id == pr.to_student_id,
                ),
                and_(
                    Conversation.student_a_id == pr.to_student_id,
                    Conversation.student_b_id == pr.from_student_id,
                ),
            )
        )
    )
    conv = existing_conv.scalar_one_or_none()
    if not conv:
        conv = Conversation(
            student_a_id=pr.from_student_id,
            student_b_id=pr.to_student_id,
        )
        db.add(conv)

    await db.commit()
    await db.refresh(pr)
    return {"status": pr.status.value}


@router.patch("/api/v1/peer-requests/{request_id}/reject")
async def reject_peer_request(
    request_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))
    pr = await db.get(PeerRequest, request_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Request not found")
    if pr.to_student_id != caller_id:
        raise HTTPException(status_code=403, detail="Not your request")
    if pr.status != PeerRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request is not pending")

    pr.status = PeerRequestStatus.REJECTED
    await db.commit()
    return {"status": pr.status.value}


# ── Conversations ──────────────────────────────────────────────────────

@router.get("/api/v1/conversations/", response_model=list[ConversationOut])
async def list_conversations(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))
    result = await db.execute(
        select(Conversation)
        .options(
            selectinload(Conversation.student_a),
            selectinload(Conversation.student_b),
            selectinload(Conversation.messages),
        )
        .where(
            or_(
                Conversation.student_a_id == caller_id,
                Conversation.student_b_id == caller_id,
            )
        )
        .order_by(Conversation.created_at.desc())
    )
    convs = result.scalars().all()

    # Fetch all blocks involving the caller for efficient lookup
    blocks_result = await db.execute(
        select(PeerBlock).where(
            or_(PeerBlock.blocker_id == caller_id, PeerBlock.blocked_id == caller_id)
        )
    )
    all_blocks = blocks_result.scalars().all()
    blocked_by_me_ids = {b.blocked_id for b in all_blocks if b.blocker_id == caller_id}
    blocked_me_ids = {b.blocker_id for b in all_blocks if b.blocked_id == caller_id}

    out = []
    for c in convs:
        other = c.student_b if c.student_a_id == caller_id else c.student_a
        last_msg = _message_preview(c.messages[-1]) if c.messages else None
        _blocked_by_me = other.id in blocked_by_me_ids
        _blocked_me = other.id in blocked_me_ids
        out.append(
            ConversationOut(
                id=c.id,
                other_student_id=other.id,
                other_student_name=f"{other.first_name} {other.last_name}",
                last_message=last_msg,
                created_at=c.created_at.isoformat(),
                is_blocked=_blocked_by_me or _blocked_me,
                blocked_by_me=_blocked_by_me,
            )
        )
    return out


@router.get("/api/v1/conversations/{conv_id}/messages", response_model=list[MessageOut])
async def get_messages(
    conv_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))
    conv = await db.get(Conversation, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.student_a_id != caller_id and conv.student_b_id != caller_id:
        raise HTTPException(status_code=403, detail="Not your conversation")

    result = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.sender))
        .where(ChatMessage.conversation_id == conv_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    return [
        MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            sender_name=f"{m.sender.first_name} {m.sender.last_name}",
            body=m.body,
            attachment_name=m.attachment_name,
            attachment_mime_type=m.attachment_mime_type,
            has_attachment=bool(m.attachment_path),
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]


@router.post(
    "/api/v1/conversations/{conv_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conv_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))
    conv = await db.get(Conversation, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.student_a_id != caller_id and conv.student_b_id != caller_id:
        raise HTTPException(status_code=403, detail="Not your conversation")

    # Enforce block: if either party blocked the other, no messages allowed
    other_id = conv.student_b_id if conv.student_a_id == caller_id else conv.student_a_id
    block_check = await db.execute(
        select(PeerBlock).where(
            or_(
                and_(PeerBlock.blocker_id == caller_id, PeerBlock.blocked_id == other_id),
                and_(PeerBlock.blocker_id == other_id, PeerBlock.blocked_id == caller_id),
            )
        )
    )
    if block_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Cannot send message: user is blocked")

    content_type = (request.headers.get("content-type") or "").lower()
    body_text = ""
    upload: UploadFile | None = None

    if content_type.startswith("application/json"):
        data = await request.json()
        body_text = str((data or {}).get("body", "")).strip()
    else:
        form = await request.form()
        body_text = str(form.get("body", "")).strip()
        candidate = form.get("attachment")
        if candidate is not None and hasattr(candidate, "filename") and hasattr(candidate, "read"):
            upload = candidate  # type: ignore[assignment]

    if not body_text and upload is None:
        raise HTTPException(status_code=400, detail="Message body cannot be empty")

    attachment_path: str | None = None
    attachment_name: str | None = None
    attachment_mime_type: str | None = None

    if upload is not None:
        original_filename = upload.filename or ""
        suffix = Path(original_filename).suffix.lower()
        if suffix not in ALLOWED_CHAT_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Only PDF, DOC, and DOCX files are allowed")

        content = await upload.read()
        if len(content) > MAX_CHAT_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size must not exceed 10 MB")

        filename = f"{uuid.uuid4().hex}{suffix}"
        filepath = UPLOAD_DIR / filename
        filepath.write_bytes(content)

        attachment_path = filename
        attachment_name = original_filename
        attachment_mime_type = upload.content_type or None

    msg = ChatMessage(
        conversation_id=conv_id,
        sender_id=caller_id,
        body=body_text,
        attachment_path=attachment_path,
        attachment_name=attachment_name,
        attachment_mime_type=attachment_mime_type,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    sender = await db.get(Student, caller_id)
    return MessageOut(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender_name=f"{sender.first_name} {sender.last_name}",
        body=msg.body,
        attachment_name=msg.attachment_name,
        attachment_mime_type=msg.attachment_mime_type,
        has_attachment=bool(msg.attachment_path),
        created_at=msg.created_at.isoformat(),
    )


@router.get("/api/v1/conversations/{conv_id}/messages/{message_id}/attachment")
async def download_chat_attachment(
    conv_id: int,
    message_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))
    conv = await db.get(Conversation, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.student_a_id != caller_id and conv.student_b_id != caller_id:
        raise HTTPException(status_code=403, detail="Not your conversation")

    msg = await db.get(ChatMessage, message_id)
    if not msg or msg.conversation_id != conv_id:
        raise HTTPException(status_code=404, detail="Message not found")
    if not msg.attachment_path:
        raise HTTPException(status_code=404, detail="No attachment for this message")

    filepath = UPLOAD_DIR / msg.attachment_path
    try:
        filepath.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Attachment not found on server")

    return FileResponse(
        path=str(filepath),
        filename=msg.attachment_name or filepath.name,
        media_type=msg.attachment_mime_type or "application/octet-stream",
    )


# ── Block / Unblock ───────────────────────────────────────────────────

@router.post(
    "/api/v1/blocks/",
    response_model=BlockOut,
    status_code=status.HTTP_201_CREATED,
)
async def block_peer(
    payload: BlockIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))

    if caller_id == payload.blocked_student_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    target = await db.get(Student, payload.blocked_student_id)
    if not target:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check if already blocked
    existing = await db.execute(
        select(PeerBlock).where(
            PeerBlock.blocker_id == caller_id,
            PeerBlock.blocked_id == payload.blocked_student_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already blocked")

    block = PeerBlock(blocker_id=caller_id, blocked_id=payload.blocked_student_id)
    db.add(block)
    await db.commit()
    await db.refresh(block)
    return BlockOut(
        id=block.id,
        blocker_id=block.blocker_id,
        blocked_id=block.blocked_id,
        created_at=block.created_at.isoformat(),
    )


@router.delete("/api/v1/blocks/{blocked_student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_peer(
    blocked_student_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))
    result = await db.execute(
        select(PeerBlock).where(
            PeerBlock.blocker_id == caller_id,
            PeerBlock.blocked_id == blocked_student_id,
        )
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    await db.delete(block)
    await db.commit()


@router.get("/api/v1/blocks/", response_model=list[BlockOut])
async def list_blocked_peers(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("student")),
):
    caller_id = int(request.headers.get("x-user-id", "0"))
    result = await db.execute(
        select(PeerBlock)
        .where(PeerBlock.blocker_id == caller_id)
        .order_by(PeerBlock.created_at.desc())
    )
    blocks = result.scalars().all()
    return [
        BlockOut(
            id=b.id,
            blocker_id=b.blocker_id,
            blocked_id=b.blocked_id,
            created_at=b.created_at.isoformat(),
        )
        for b in blocks
    ]


# ── Teacher / Admin: View all accepted peer connections ────────────────

class PeerConnectionOut(BaseModel):
    request_id: int
    student_a_id: int
    student_a_name: str
    student_a_department: str | None
    student_b_id: int
    student_b_name: str
    student_b_department: str | None
    connected_at: str

    model_config = {"from_attributes": True}


@router.get("/api/v1/peer-connections/", response_model=list[PeerConnectionOut])
async def list_peer_connections(
    db: AsyncSession = Depends(get_db),
    _role: str = Depends(require_role("advisor")),
):
    """Return all accepted peer request pairs — for teacher/admin overview."""
    result = await db.execute(
        select(PeerRequest)
        .options(
            selectinload(PeerRequest.from_student),
            selectinload(PeerRequest.to_student),
        )
        .where(PeerRequest.status == PeerRequestStatus.ACCEPTED)
        .order_by(PeerRequest.updated_at.desc())
    )
    pairs = result.scalars().all()
    return [
        PeerConnectionOut(
            request_id=p.id,
            student_a_id=p.from_student_id,
            student_a_name=f"{p.from_student.first_name} {p.from_student.last_name}",
            student_a_department=p.from_student.department,
            student_b_id=p.to_student_id,
            student_b_name=f"{p.to_student.first_name} {p.to_student.last_name}",
            student_b_department=p.to_student.department,
            connected_at=(p.updated_at or p.created_at).isoformat(),
        )
        for p in pairs
    ]
