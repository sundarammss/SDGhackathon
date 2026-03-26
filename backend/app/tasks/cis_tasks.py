from __future__ import annotations

import logging
from datetime import datetime

from app.celery_app import celery_app
from app.database import sync_session
from app.ml.cis_engine import compute_scores, save_scores

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="tasks.compute_cis_scores")
def compute_cis_scores(self) -> dict:
    db = sync_session()
    try:
        scores = compute_scores(db)
        save_scores(db, scores)
    finally:
        db.close()

    logger.info("CIS computed for %s students", len(scores))
    return {
        "student_count": len(scores),
        "computed_at": str(datetime.utcnow()),
    }
