from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Date,
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


class PeerRequestStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"


class CompetitionStatus(str, enum.Enum):
    WINNER = "Winner"
    RUNNER_UP = "Runner-up"
    PARTICIPATED = "Participated"


class ApprovalStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"


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
    leetcode_id = Column(String(120), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    lms_activities = relationship("LMSActivity", back_populates="student", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="student", cascade="all, delete-orphan")
    engagement_signals = relationship("EngagementSignal", back_populates="student", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="student", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="student", cascade="all, delete-orphan")
    competitions = relationship("StudentCompetition", back_populates="student", cascade="all, delete-orphan")
    study_streak = relationship("StudyStreak", back_populates="student", uselist=False, cascade="all, delete-orphan")


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False, default="")
    department = Column(String(120), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    assignments = relationship("Assignment", back_populates="creator", cascade="all, delete-orphan")
    study_resources = relationship("StudyResource", back_populates="teacher", cascade="all, delete-orphan")


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


# ── Peer Requests ──────────────────────────────────────────────────────

class PeerRequest(Base):
    __tablename__ = "peer_requests"

    id = Column(Integer, primary_key=True, index=True)
    from_student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    to_student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    status = Column(Enum(PeerRequestStatus), default=PeerRequestStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    from_student = relationship("Student", foreign_keys=[from_student_id])
    to_student = relationship("Student", foreign_keys=[to_student_id])


# ── Chat ───────────────────────────────────────────────────────────────

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    student_a_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    student_b_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    student_a = relationship("Student", foreign_keys=[student_a_id])
    student_b = relationship("Student", foreign_keys=[student_b_id])
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("Student", foreign_keys=[sender_id])


class PeerBlock(Base):
    __tablename__ = "peer_blocks"

    id = Column(Integer, primary_key=True, index=True)
    blocker_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    blocked_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    blocker = relationship("Student", foreign_keys=[blocker_id])
    blocked = relationship("Student", foreign_keys=[blocked_id])


class ExamMark(Base):
    __tablename__ = "exam_marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    exam_name = Column(String(255), nullable=False)
    marks = Column(Float, nullable=False)
    exam_date = Column(String(20), nullable=False)  # stored as ISO date string YYYY-MM-DD
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    student = relationship("Student", foreign_keys=[student_id])


# ── Attendance ─────────────────────────────────────────────────────────

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    date = Column(String(10), nullable=False)      # YYYY-MM-DD
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False)
    subject = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    student = relationship("Student", foreign_keys=[student_id])
    teacher = relationship("Teacher", foreign_keys=[teacher_id])


# ── Student Competitions ───────────────────────────────────────────────

class StudentCompetition(Base):
    __tablename__ = "student_competitions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    competition_name = Column(String(300), nullable=False)
    competition_date = Column(String(20), nullable=False)  # YYYY-MM-DD
    status = Column(Enum(CompetitionStatus), nullable=False)
    proof_file = Column(String(500), nullable=True)  # stored UUID filename
    approval_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False)
    approved_by = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    student = relationship("Student", back_populates="competitions")
    reviewer = relationship("Teacher", foreign_keys=[approved_by])


# ── Assignments ────────────────────────────────────────────────────────

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(String(20), nullable=False)           # YYYY-MM-DD
    department = Column(String(120), nullable=False)
    batch_start_year = Column(Integer, nullable=False)
    batch_end_year = Column(Integer, nullable=False)
    section = Column(String(60), nullable=True)             # None = all sections
    created_by = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    creator = relationship("Teacher", back_populates="assignments")
    submissions = relationship(
        "AssignmentSubmission",
        back_populates="assignment",
        cascade="all, delete-orphan",
    )


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    file_path = Column(String(500), nullable=False)          # UUID-based filename
    submitted_at = Column(DateTime(timezone=True), default=_utcnow)
    is_approved = Column(Integer, default=0)                 # 0=pending, 1=approved
    marks = Column(Float, nullable=True)                     # hidden from students

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("Student")


# ── Study Resources ────────────────────────────────────────────────────

class StudyResource(Base):
    __tablename__ = "study_resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    subject = Column(String(120), nullable=False, index=True)
    description = Column(Text, nullable=True)
    tags = Column(String(500), nullable=True)
    file_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    teacher = relationship("Teacher", back_populates="study_resources")


class StudyStreak(Base):
    __tablename__ = "study_streaks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, unique=True, index=True)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_activity_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    student = relationship("Student", back_populates="study_streak")
