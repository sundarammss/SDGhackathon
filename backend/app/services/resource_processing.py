from __future__ import annotations

import logging
from typing import Any

from app.tasks.resource_tasks import (
    process_resource_index_task,
    process_youtube_import_task,
    process_youtube_video_task,
)

logger = logging.getLogger(__name__)

RESOURCE_INDEX_QUEUE = "resource.index"
YOUTUBE_IMPORT_QUEUE = "youtube.import"
YOUTUBE_VIDEO_QUEUE = "youtube.video"

def queue_resource_processing(resource_id: int) -> str:
    try:
        result = process_resource_index_task.apply_async(args=[resource_id], queue=RESOURCE_INDEX_QUEUE)
        return result.id
    except Exception as exc:
        # Broker connection errors (OSError, kombu exceptions) are not CeleryError subclasses,
        # so we catch all exceptions and re-raise as RuntimeError for the router to handle.
        logger.exception("Failed to queue resource indexing for id=%s", resource_id)
        raise RuntimeError("Failed to queue resource indexing task") from exc


def queue_youtube_import(
    url: str,
    subject: str | None = None,
    languages: list[str] | None = None,
) -> str:
    try:
        result = process_youtube_import_task.apply_async(
            kwargs={"url": url, "subject": subject, "languages": languages},
            queue=YOUTUBE_IMPORT_QUEUE,
        )
        return result.id
    except Exception as exc:
        logger.exception("Failed to queue YouTube import for url=%s", url)
        raise RuntimeError("Failed to queue YouTube import task") from exc


def queue_youtube_video_processing(
    video_id: str,
    title: str,
    original_url: str,
    subject: str | None = None,
    languages: list[str] | None = None,
    resource_id: int | None = None,
) -> str:
    try:
        result = process_youtube_video_task.apply_async(
            kwargs={
                "video": {
                    "video_id": video_id,
                    "title": title,
                    "original_url": original_url,
                },
                "subject": subject,
                "languages": languages,
                "resource_id": resource_id,
            },
            queue=YOUTUBE_VIDEO_QUEUE,
        )
        return result.id
    except Exception as exc:
        logger.exception("Failed to queue YouTube video task for video_id=%s", video_id)
        raise RuntimeError("Failed to queue YouTube video task") from exc
