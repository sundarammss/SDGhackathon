from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Enums ──────────────────────────────────────────────────────────────

class Role(str, enum.Enum):
    STUDENT = "student"
    ADVISOR = "advisor"
    ADMIN = "admin"


class BurnoutCategory(str, enum.Enum):
    NONE = "none"
    DISENGAGEMENT = "disengagement"
    CONCEPTUAL_CONFUSION = "conceptual_confusion"
    COGNITIVE_OVERLOAD = "cognitive_overload"


class InterventionType(str, enum.Enum):
    NUDGE = "nudge"
    PEER_MATCH = "peer_match"
    TUTORING = "tutoring"
    ADVISOR_MEETING = "advisor_meeting"


# ── Models ─────────────────────────────────────────────────────────────

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False, default="")
    phone = Column(String(30), nullable=True)
    department = Column(String(120), nullable=True)
    section = Column(String(60), nullable=True)
    batch_start_year = Column(Integer, nullable=True)
    batch_end_year = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    lms_activities = relationship("LMSActivity", back_populates="student", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="student", cascade="all, delete-orphan")
    engagement_signals = relationship("EngagementSignal", back_populates="student", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="student", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="student", cascade="all, delete-orphan")


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False, default="")
    department = Column(String(120), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False, default="")
    created_at = Column(DateTime(timezone=True), default=_utcnow)


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    department = Column(String(120), nullable=True)
    difficulty_rating = Column(Float, default=0.5)  # 0‥1 institutional heatmap input
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    semester = Column(String(20), nullable=False)
    current_grade = Column(Float, nullable=True)

    student = relationship("Student", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class LMSActivity(Base):
    __tablename__ = "lms_activities"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    downloads = Column(Integer, default=0)
    forum_posts = Column(Integer, default=0)
    time_on_task_minutes = Column(Float, default=0.0)
    recorded_at = Column(DateTime(timezone=True), default=_utcnow)

    student = relationship("Student", back_populates="lms_activities")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    title = Column(String(255), nullable=False)
    score = Column(Float, nullable=True)
    max_score = Column(Float, default=100.0)
    submitted_on_time = Column(Integer, default=1)  # 1=yes, 0=no
    submitted_at = Column(DateTime(timezone=True), default=_utcnow)

    student = relationship("Student", back_populates="assessments")


class EngagementSignal(Base):
    __tablename__ = "engagement_signals"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    attendance_pct = Column(Float, default=100.0)  # 0‥100
    help_seeking_events = Column(Integer, default=0)
    recorded_at = Column(DateTime(timezone=True), default=_utcnow)

    student = relationship("Student", back_populates="engagement_signals")


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    at_risk_probability = Column(Float, nullable=False)
    academic_health_score = Column(Float, nullable=False)
    burnout_category = Column(Enum(BurnoutCategory), default=BurnoutCategory.NONE)
    shap_explanation = Column(Text, nullable=True)  # JSON string
    computed_at = Column(DateTime(timezone=True), default=_utcnow)

    student = relationship("Student", back_populates="risk_scores")


class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    intervention_type = Column(Enum(InterventionType), nullable=False)
    message = Column(Text, nullable=False)
    is_dismissed = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    student = relationship("Student", back_populates="interventions")


# ── Forum ──────────────────────────────────────────────────────────────

class ForumPost(Base):
    __tablename__ = "forum_posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    title = Column(String(300), nullable=False)
    body = Column(Text, nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    author = relationship("Student")
    course = relationship("Course")
    replies = relationship("ForumReply", back_populates="post", cascade="all, delete-orphan", order_by="ForumReply.created_at")


class ForumReply(Base):
    __tablename__ = "forum_replies"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    post = relationship("ForumPost", back_populates="replies")
    author = relationship("Student")


# ── Quiz ───────────────────────────────────────────────────────────────

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("teachers.id"), nullable=False)  # teacher / advisor
    assigned_department = Column(String(120), nullable=True)  # NULL = all departments
    is_active = Column(Integer, default=1)  # 1=active, 0=closed
    duration_minutes = Column(Integer, default=30)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    creator = relationship("Teacher")
    course = relationship("Course")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan", order_by="QuizQuestion.order")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    order = Column(Integer, default=0)

    quiz = relationship("Quiz", back_populates="questions")
    options = relationship("QuizOption", back_populates="question", cascade="all, delete-orphan", order_by="QuizOption.id")


class QuizOption(Base):
    __tablename__ = "quiz_options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("quiz_questions.id"), nullable=False)
    option_text = Column(String(500), nullable=False)
    is_correct = Column(Integer, default=0)  # 1=correct

    question = relationship("QuizQuestion", back_populates="options")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    score = Column(Float, nullable=True)  # percentage 0..100
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), default=_utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    quiz = relationship("Quiz", back_populates="attempts")
    student = relationship("Student")
    answers = relationship("QuizAnswer", back_populates="attempt", cascade="all, delete-orphan")


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("quiz_questions.id"), nullable=False)
    selected_option_id = Column(Integer, ForeignKey("quiz_options.id"), nullable=True)

    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("QuizQuestion")
    selected_option = relationship("QuizOption")
