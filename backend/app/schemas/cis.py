from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CISCollaborator(BaseModel):
    student_id: int
    name: str
    weight: float

    model_config = ConfigDict(from_attributes=True)


class CISScoreItem(BaseModel):
    student_id: int
    name: str
    department_id: str | None
    score: float
    label: str
    computed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CISStudentDetail(BaseModel):
    student_id: int
    name: str
    score: float
    label: str
    computed_at: datetime
    top_collaborators: list[CISCollaborator]

    model_config = ConfigDict(from_attributes=True)


class CISRefreshResponse(BaseModel):
    message: str
    task_id: str

    model_config = ConfigDict(from_attributes=True)
