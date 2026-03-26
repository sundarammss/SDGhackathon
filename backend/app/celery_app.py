from __future__ import annotations

import os

from celery import Celery
from celery.schedules import crontab

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
    imports=("app.tasks.resource_tasks", "app.tasks.cis_tasks"),
    task_routes={
        "resources.process_resource_index": {"queue": "resource.index"},
        "resources.process_youtube_import": {"queue": "youtube.import"},
        "resources.process_youtube_video": {"queue": "youtube.video"},
    },
)

existing_beat_schedule = dict(celery_app.conf.beat_schedule or {})
existing_beat_schedule.update(
    {
        "refresh-cis-every-6h": {
            "task": "tasks.compute_cis_scores",
            "schedule": crontab(hour="*/6", minute=0),
        }
    }
)
celery_app.conf.beat_schedule = existing_beat_schedule

celery_app.autodiscover_tasks(["app.tasks"])
