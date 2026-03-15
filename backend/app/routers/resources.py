from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import StudyResource, Teacher
from app.rbac import require_role
from app.schemas import (
    StudyResourceOut,
    StudyResourceSearchOut,
    StudyResourceUploadOut,
    YouTubeImportOut,
    YouTubeImportRequest,
)
from app.services.embedding_service import (
    remove_study_resource,
    semantic_search_resources,
)
from app.services.resource_processing import queue_resource_processing, queue_youtube_video_processing
from app.services.streak_service import mark_study_activity
from app.services.youtube_rag import parse_youtube_url, YouTubeIngestError

router = APIRouter(prefix="/api/v1/resources", tags=["Study Resources"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "resources"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE = 20 * 1024 * 1024


def _build_file_url(resource_id: int) -> str:
    return f"/api/v1/resources/download/{resource_id}"


def _resolve_resource_url(resource: StudyResource) -> str:
    if resource.file_type == "youtube":
        return resource.file_path
    return _build_file_url(resource.id)


def _split_tags(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def _to_out(resource: StudyResource) -> StudyResourceOut:
    teacher_name = None
    if resource.teacher:
        teacher_name = f"{resource.teacher.first_name} {resource.teacher.last_name}"
    return StudyResourceOut(
        id=resource.id,
        title=resource.title,
        subject=resource.subject,
        description=resource.description,
        tags=_split_tags(resource.tags),
        teacher_id=resource.teacher_id,
        teacher_name=teacher_name,
        file_type=resource.file_type,
        file_url=_resolve_resource_url(resource),
        created_at=resource.created_at,
    )


@router.post("/upload", response_model=StudyResourceUploadOut, status_code=status.HTTP_201_CREATED)
async def upload_resource(
    file: UploadFile = File(...),
    title: str = Form(...),
    subject: str = Form(...),
    description: str = Form(""),
    tags: str = Form(""),
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    if auth["role"] != "advisor":
        raise HTTPException(status_code=403, detail="Only teachers can upload study resources")

    teacher_id = auth["id"]

    original_filename = file.filename or "resource"
    suffix = Path(original_filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size must not exceed 20 MB")

    stored_name = f"{uuid.uuid4().hex}{suffix}"
    stored_path = UPLOAD_DIR / stored_name
    stored_path.write_bytes(content)

    resource: StudyResource | None = None
    try:
        resource = StudyResource(
            title=title.strip(),
            subject=subject.strip(),
            description=description.strip() or None,
            tags=tags.strip() or None,
            file_path=stored_name,
            original_filename=original_filename,
            file_type=suffix.replace(".", ""),
            teacher_id=teacher_id,
        )
        db.add(resource)
        await db.flush()

        await db.commit()
        await db.refresh(resource)
    except Exception as exc:
        stored_path.unlink(missing_ok=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload resource: {exc}")

    upload_status = "queued"
    try:
        queue_resource_processing(resource.id)
    except RuntimeError:
        upload_status = "saved"

    return StudyResourceUploadOut(resource_id=resource.id, upload_status=upload_status)


@router.get("/my", response_model=list[StudyResourceOut])
async def list_my_resources(
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    stmt = (
        select(StudyResource)
        .where(StudyResource.teacher_id == auth["id"])
        .options(selectinload(StudyResource.teacher))
        .order_by(StudyResource.created_at.desc())
    )
    result = await db.execute(stmt)
    return [_to_out(item) for item in result.scalars().all()]


@router.get("/subject/{subject}", response_model=list[StudyResourceOut])
async def list_resources_by_subject(
    subject: str,
    db: AsyncSession = Depends(get_db),
    _auth: dict = Depends(require_role("student")),
):
    stmt = select(StudyResource).options(selectinload(StudyResource.teacher)).order_by(StudyResource.created_at.desc())
    if subject.lower() != "all":
        stmt = stmt.where(StudyResource.subject == subject)

    result = await db.execute(stmt)
    return [_to_out(item) for item in result.scalars().all()]


@router.get("/search", response_model=list[StudyResourceSearchOut])
async def search_resources(
    q: str = Query(..., min_length=2),
    subject: str | None = Query(default=None),
    top_k: int = Query(default=8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    _auth: dict = Depends(require_role("student")),
):
    hits = semantic_search_resources(query=q, top_k=top_k, subject=subject)
    if not hits:
        return []

    resource_ids = [
        int(item["metadata"].get("resource_id"))
        for item in hits
        if item.get("metadata") and item["metadata"].get("resource_id") is not None
    ]

    stmt = select(StudyResource).where(StudyResource.id.in_(resource_ids))
    result = await db.execute(stmt)
    resources = {item.id: item for item in result.scalars().all()}

    output: list[StudyResourceSearchOut] = []
    for hit in hits:
        metadata = hit.get("metadata") or {}
        source = str(metadata.get("source") or metadata.get("source_type") or "resource")

        if source == "youtube":
            resource_id = metadata.get("resource_id")
            resolved_resource_id = int(resource_id) if resource_id is not None else 0
            linked_resource = resources.get(resolved_resource_id) if resolved_resource_id > 0 else None
            youtube_url = (
                linked_resource.file_path
                if linked_resource and linked_resource.file_type == "youtube"
                else str(metadata.get("url") or metadata.get("timestamp_url") or metadata.get("original_url") or "")
            )
            output.append(
                StudyResourceSearchOut(
                    resource_id=resolved_resource_id,
                    title=str(metadata.get("title") or "YouTube Video"),
                    subject=str(metadata.get("subject") or "YouTube"),
                    description=(hit.get("document") or None),
                    file_url=youtube_url,
                    similarity_score=hit["similarity_score"],
                    file_type="youtube",
                    source="youtube",
                    video_id=(str(metadata.get("video_id")) if metadata.get("video_id") else None),
                    timestamp=(int(metadata.get("timestamp")) if metadata.get("timestamp") is not None else None),
                )
            )
            continue

        resource_id = metadata.get("resource_id")
        if resource_id is None:
            continue
        resource = resources.get(int(resource_id))
        if not resource:
            continue

        output.append(
            StudyResourceSearchOut(
                resource_id=resource.id,
                title=resource.title,
                subject=resource.subject,
                description=resource.description,
                file_url=_build_file_url(resource.id),
                similarity_score=hit["similarity_score"],
                file_type=resource.file_type,
                source="resource",
            )
        )
    return output


@router.post("/youtube/import", response_model=YouTubeImportOut)
async def import_youtube_resource(
    payload: YouTubeImportRequest,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    try:
        videos = parse_youtube_url(payload.url)
    except YouTubeIngestError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    teacher_id = auth["id"]
    subject = payload.subject.strip()
    if not subject:
        raise HTTPException(status_code=400, detail="Subject is required for YouTube resources")

    created_resources: list[StudyResource] = []
    try:
        for video in videos:
            resource = StudyResource(
                title=video.title.strip()[:300] or f"YouTube Video {video.video_id}",
                subject=subject,
                description="YouTube resource uploaded. Embedding is processing in background.",
                tags="youtube",
                file_path=video.original_url,
                original_filename=(video.title.strip()[:255] or video.video_id),
                file_type="youtube",
                teacher_id=teacher_id,
            )
            db.add(resource)
            created_resources.append(resource)

        await db.flush()
        await db.commit()
        for resource in created_resources:
            await db.refresh(resource)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save YouTube resources: {exc}") from exc

    task_ids: list[str] = []
    for video, resource in zip(videos, created_resources):
        try:
            task_id = queue_youtube_video_processing(
                video_id=video.video_id,
                title=video.title,
                original_url=video.original_url,
                subject=subject,
                resource_id=resource.id,
            )
            task_ids.append(task_id)
        except RuntimeError:
            continue

    return YouTubeImportOut(
        requested_url=payload.url,
        total_videos=len(videos),
        indexed_videos=0,
        failed_videos=0,
        processed=[],
        errors=[],
        task_id=task_ids[0] if task_ids else None,
        task_ids=task_ids,
        queued_videos=len(task_ids),
        status="queued",
    )


@router.get("/download/{resource_id}")
async def download_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("student")),
):
    resource = await db.get(StudyResource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    if auth["role"] == "student" and auth["id"] > 0:
        try:
            await mark_study_activity(db, auth["id"])
        except Exception:
            pass

    if resource.file_type == "youtube":
        return RedirectResponse(url=resource.file_path)

    path = UPLOAD_DIR / resource.file_path
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(path),
        filename=resource.original_filename,
        media_type="application/octet-stream",
    )


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(require_role("advisor")),
):
    resource = await db.get(StudyResource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource.teacher_id != auth["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own resources")

    file_path = UPLOAD_DIR / resource.file_path

    await db.delete(resource)
    await db.commit()

    if resource.file_type != "youtube":
        file_path.unlink(missing_ok=True)
    remove_study_resource(resource_id)
