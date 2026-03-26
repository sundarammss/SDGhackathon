from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, field_validator


# ── Student ────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    department: str | None = None
    section: str | None = None
    batch_start_year: int | None = None
    batch_end_year: int | None = None
    leetcode_id: str | None = None

    @field_validator("leetcode_id", mode="before")
    @classmethod
    def _strip_leetcode_id(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = str(v).strip()
        return stripped if stripped else None


class StudentOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: str | None
    department: str | None
    section: str | None
    batch_start_year: int | None
    batch_end_year: int | None
    leetcode_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class StudentUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    department: str | None = None
    section: str | None = None
    batch_start_year: int | None = None
    batch_end_year: int | None = None
    leetcode_id: str | None = None

    @field_validator("leetcode_id", mode="before")
    @classmethod
    def _strip_leetcode_id(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = str(v).strip()
        return stripped if stripped else None


# ── Teacher ────────────────────────────────────────────────────────────

class TeacherCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    department: str | None = None
    password: str


class TeacherOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    department: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TeacherUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    department: str | None = None


# ── Course ─────────────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    code: str
    title: str
    department: str | None = None
    difficulty_rating: float = 0.5


class CourseOut(BaseModel):
    id: int
    code: str
    title: str
    department: str | None
    difficulty_rating: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ── LMS Activity ──────────────────────────────────────────────────────

class LMSActivityCreate(BaseModel):
    student_id: int
    course_id: int | None = None
    downloads: int = 0
    forum_posts: int = 0
    time_on_task_minutes: float = 0.0


class LMSActivityOut(BaseModel):
    id: int
    student_id: int
    course_id: int | None
    downloads: int
    forum_posts: int
    time_on_task_minutes: float
    recorded_at: datetime

    model_config = {"from_attributes": True}


# ── Risk Profile ──────────────────────────────────────────────────────

class ShapFeature(BaseModel):
    feature: str
    value: float
    impact: float  # SHAP value


class RiskProfileOut(BaseModel):
    student_id: int
    student_name: str
    at_risk_probability: float
    academic_health_score: float
    burnout_category: str
    shap_explanation: list[ShapFeature]
    recommended_interventions: list[str]
    computed_at: datetime
    cis_score: float | None = None


# ── What-If Simulator ─────────────────────────────────────────────────

class WhatIfRequest(BaseModel):
    attendance_change_pct: float = 0.0
    study_hours_change: float = 0.0
    assignment_completion_change_pct: float = 0.0
    forum_participation_change: int = 0


class WhatIfResponse(BaseModel):
    student_id: int
    current_risk: float
    projected_risk: float
    current_predicted_grade: float
    projected_predicted_grade: float
    factors: list[ShapFeature]


# ── Peer Matching ─────────────────────────────────────────────────────

class PeerMatch(BaseModel):
    peer_id: int
    peer_name: str
    compatibility_score: float
    complementary_strengths: list[str]


class PeerMatchResponse(BaseModel):
    student_id: int
    matches: list[PeerMatch]


# ── Institutional Dashboard ───────────────────────────────────────────

class CohortRiskRow(BaseModel):
    student_id: int
    student_name: str
    department: str | None
    section: str | None
    batch: str | None
    at_risk_probability: float
    academic_health_score: float
    burnout_category: str
    top_risk_factor: str
    cis_score: float | None = None


class CourseDifficultyRow(BaseModel):
    course_id: int
    course_code: str
    course_title: str
    department: str | None
    difficulty_rating: float
    avg_student_risk: float
    enrollment_count: int


class DashboardSummary(BaseModel):
    total_students: int
    at_risk_count: int
    avg_health_score: float
    cohort_risks: list[CohortRiskRow]
    course_heatmap: list[CourseDifficultyRow]


class StudyStreakOut(BaseModel):
    student_id: int
    current_streak: int
    longest_streak: int
    last_activity_date: str | None = None


# ── Intervention ──────────────────────────────────────────────────────

class InterventionOut(BaseModel):
    id: int
    student_id: int
    intervention_type: str
    message: str
    is_dismissed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Forum ─────────────────────────────────────────────────────────────

class ForumReplyCreate(BaseModel):
    body: str

class ForumReplyOut(BaseModel):
    id: int
    post_id: int
    author_id: int
    author_name: str | None = None
    body: str
    created_at: datetime
    model_config = {"from_attributes": True}

class ForumPostCreate(BaseModel):
    title: str
    body: str
    course_id: int | None = None

class ForumPostOut(BaseModel):
    id: int
    author_id: int
    author_name: str | None = None
    title: str
    body: str
    course_id: int | None = None
    course_name: str | None = None
    reply_count: int = 0
    created_at: datetime
    model_config = {"from_attributes": True}

class ForumPostDetail(ForumPostOut):
    replies: list[ForumReplyOut] = []


# ── Quiz ──────────────────────────────────────────────────────────────

class QuizOptionCreate(BaseModel):
    option_text: str
    is_correct: bool = False

class QuizOptionOut(BaseModel):
    id: int
    option_text: str
    model_config = {"from_attributes": True}

class QuizOptionOutWithAnswer(QuizOptionOut):
    is_correct: bool

class QuizQuestionCreate(BaseModel):
    question_text: str
    options: list[QuizOptionCreate]

class QuizQuestionOut(BaseModel):
    id: int
    question_text: str
    order: int
    options: list[QuizOptionOut] = []
    model_config = {"from_attributes": True}

class QuizQuestionOutWithAnswer(BaseModel):
    id: int
    question_text: str
    order: int
    options: list[QuizOptionOutWithAnswer] = []
    model_config = {"from_attributes": True}

class QuizCreate(BaseModel):
    title: str
    description: str | None = None
    course_id: int | None = None
    duration_minutes: int = 30
    assigned_department: str | None = None
    questions: list[QuizQuestionCreate]

class QuizOut(BaseModel):
    id: int
    title: str
    description: str | None
    course_id: int | None
    created_by: int
    creator_name: str | None = None
    assigned_department: str | None = None
    is_active: bool
    duration_minutes: int
    question_count: int = 0
    created_at: datetime
    model_config = {"from_attributes": True}

class QuizDetail(QuizOut):
    questions: list[QuizQuestionOut] = []

class QuizDetailWithAnswers(QuizOut):
    questions: list[QuizQuestionOutWithAnswer] = []

class QuizSubmitAnswer(BaseModel):
    question_id: int
    selected_option_id: int

class QuizSubmit(BaseModel):
    answers: list[QuizSubmitAnswer]

class QuizAttemptOut(BaseModel):
    id: int
    quiz_id: int
    quiz_title: str | None = None
    student_id: int
    student_name: str | None = None
    score: float | None
    total_questions: int
    correct_answers: int
    completed_at: datetime | None
    model_config = {"from_attributes": True}


# ── Study Resources ────────────────────────────────────────────────────

class StudyResourceUploadOut(BaseModel):
    resource_id: int
    upload_status: str


class StudyResourceOut(BaseModel):
    id: int
    title: str
    subject: str
    description: str | None
    tags: list[str] = []
    teacher_id: int
    teacher_name: str | None = None
    file_type: str
    file_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class StudyResourceSearchOut(BaseModel):
    resource_id: int
    title: str
    subject: str
    description: str | None
    file_url: str
    similarity_score: float
    file_type: str | None = None
    source: str = "resource"
    video_id: str | None = None
    timestamp: int | None = None


class YouTubeImportRequest(BaseModel):
    url: str
    subject: str


class YouTubeVideoImportOut(BaseModel):
    video_id: str
    title: str
    chunks_indexed: int
    url: str


class YouTubeImportOut(BaseModel):
    requested_url: str
    total_videos: int
    indexed_videos: int
    failed_videos: int
    processed: list[YouTubeVideoImportOut]
    errors: list[dict[str, str]]
    task_id: str | None = None
    task_ids: list[str] | None = None
    queued_videos: int | None = None
    status: str | None = None
