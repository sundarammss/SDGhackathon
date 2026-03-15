from __future__ import annotations

import os

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

celery_app = Celery(
    "aios_resource_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_default_queue="resource.default",
    imports=("app.tasks.resource_tasks",),
    task_routes={
        "resources.process_resource_index": {"queue": "resource.index"},
        "resources.process_youtube_import": {"queue": "youtube.import"},
        "resources.process_youtube_video": {"queue": "youtube.video"},
    },
)

celery_app.autodiscover_tasks(["app.tasks"])
