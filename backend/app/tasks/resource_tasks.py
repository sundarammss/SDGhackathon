from __future__ import annotations

import asyncio
import logging
import time
from pathlib import Path
from typing import Any

from billiard.exceptions import SoftTimeLimitExceeded

from app.celery_app import celery_app
from app.database import async_session
from app.models import StudyResource
from app.services.embedding_service import index_study_resource
from app.services.file_parser import extract_text_from_file
from app.services.youtube_rag import VideoEntry, YouTubeIngestError, ingest_youtube_video, parse_youtube_url

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "resources"
MAX_EMBEDDING_CHARS = 15000
YOUTUBE_VIDEO_QUEUE = "youtube.video"


async def _load_resource_payload(resource_id: int) -> dict[str, Any] | None:
    async with async_session() as db:
        resource = await db.get(StudyResource, resource_id)
        if not resource:
            return None

        return {
            "id": resource.id,
            "title": resource.title,
            "subject": resource.subject,
            "description": resource.description,
            "tags": resource.tags,
            "teacher_id": resource.teacher_id,
            "file_path": resource.file_path,
        }


@celery_app.task(name="resources.process_resource_index", bind=True)
def process_resource_index_task(self, resource_id: int) -> dict[str, Any]:
    payload = asyncio.run(_load_resource_payload(resource_id))
    if not payload:
        logger.warning("Resource not found for indexing id=%s", resource_id)
        return {"resource_id": resource_id, "status": "missing"}

    file_path = UPLOAD_DIR / payload["file_path"]
    if not file_path.exists():
        logger.warning("Resource file missing for id=%s at %s", resource_id, file_path)
        return {"resource_id": resource_id, "status": "missing_file"}

    try:
        extracted_text = extract_text_from_file(file_path)
    except Exception as exc:
        logger.warning("Text extraction failed for resource id=%s: %s", resource_id, exc)
        extracted_text = ""

    document_text = extracted_text.strip() or (
        f"{payload['title']}\n{payload.get('description') or ''}\n{payload.get('tags') or ''}".strip()
    )
    document_text = document_text[:MAX_EMBEDDING_CHARS]

    candidates = [document_text]
    if len(document_text) > 8000:
        candidates.append(document_text[:8000])
    if len(document_text) > 3000:
        candidates.append(document_text[:3000])

    metadata = {
        "resource_id": payload["id"],
        "title": payload["title"],
        "subject": payload["subject"],
        "teacher_id": payload["teacher_id"],
        "file_path": payload["file_path"],
        "description": payload.get("description") or "",
        "tags": payload.get("tags") or "",
    }

    last_exc: Exception | None = None
    for attempt, candidate in enumerate(candidates, start=1):
        try:
            index_study_resource(
                resource_id=payload["id"],
                document=candidate,
                metadata=metadata,
            )
            return {
                "resource_id": payload["id"],
                "status": "indexed",
                "attempt": attempt,
            }
        except Exception as exc:
            last_exc = exc
            if attempt < len(candidates):
                time.sleep(0.4 * attempt)

    logger.warning(
        "Embedding/indexing failed for resource id=%s after %s attempts: %s",
        resource_id,
        len(candidates),
        last_exc,
    )
    return {
        "resource_id": resource_id,
        "status": "failed",
        "error": str(last_exc) if last_exc else "unknown",
    }


@celery_app.task(name="resources.process_youtube_import", bind=True)
def process_youtube_import_task(
    self,
    url: str,
    subject: str | None = None,
    languages: list[str] | None = None,
) -> dict[str, Any]:
    videos = parse_youtube_url(url)
    task_ids: list[str] = []

    for video in videos:
        result = process_youtube_video_task.apply_async(
            video={
                "video_id": video.video_id,
                "title": video.title,
                "original_url": video.original_url,
            },
            subject=subject,
            languages=languages,
            queue=YOUTUBE_VIDEO_QUEUE,
        )
        task_ids.append(result.id)

    return {
        "requested_url": url,
        "queued_videos": len(videos),
        "task_ids": task_ids,
        "status": "queued",
    }


@celery_app.task(
    name="resources.process_youtube_video",
    bind=True,
    soft_time_limit=300,
    time_limit=360,
)
def process_youtube_video_task(
    self,
    video: dict[str, str],
    subject: str | None = None,
    languages: list[str] | None = None,
    resource_id: int | None = None,
) -> dict[str, Any]:
    entry = VideoEntry(
        video_id=video["video_id"],
        title=video["title"],
        original_url=video["original_url"],
    )
    try:
        processed = ingest_youtube_video(
            entry,
            subject=subject,
            languages=languages,
            resource_id=resource_id,
        )
        return {"status": "indexed", **processed}
    except SoftTimeLimitExceeded:
        return {
            "status": "failed",
            "video_id": entry.video_id,
            "error": "YouTube video processing exceeded time limit",
        }
    except YouTubeIngestError as exc:
        return {
            "status": "failed",
            "video_id": entry.video_id,
            "error": str(exc),
        }
    except Exception as exc:
        return {
            "status": "failed",
            "video_id": entry.video_id,
            "error": f"Unexpected error: {exc}",
        }
