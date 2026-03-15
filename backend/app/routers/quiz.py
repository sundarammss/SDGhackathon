from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizAnswer, Student, Teacher
from ..schemas import (
    QuizCreate, QuizOut, QuizDetail, QuizDetailWithAnswers,
    QuizSubmit, QuizAttemptOut,
    QuizQuestionOut, QuizOptionOut,
    QuizQuestionOutWithAnswer, QuizOptionOutWithAnswer,
)
from ..rbac import require_role
from ..services.streak_service import mark_study_activity

router = APIRouter(prefix="/api/v1/quiz", tags=["quiz"])


# ── helpers ───────────────────────────────────────────────────────────

def _quiz_summary(q: Quiz) -> QuizOut:
    if q.creator:
        creator_name = f"{q.creator.first_name} {q.creator.last_name}"
    else:
        creator_name = None
    return QuizOut(
        id=q.id,
        title=q.title,
        description=q.description,
        course_id=q.course_id,
        created_by=q.created_by,
        creator_name=creator_name,
        assigned_department=q.assigned_department,
        is_active=bool(q.is_active),
        duration_minutes=q.duration_minutes,
        question_count=len(q.questions) if q.questions else 0,
        created_at=q.created_at,
    )


# ── list quizzes (everyone) ──────────────────────────────────────────

@router.get("/quizzes", response_model=list[QuizOut])
async def list_quizzes(
    request: Request,
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    role = request.headers.get("x-user-role", "student").lower()
    user_id = int(request.headers.get("x-user-id", "0"))

    stmt = (
        select(Quiz)
        .options(selectinload(Quiz.creator), selectinload(Quiz.questions))
        .order_by(Quiz.created_at.desc())
    )
    if active_only:
        stmt = stmt.where(Quiz.is_active == 1)

    if role == "student":
        student = await db.get(Student, user_id)
        if student and student.department:
            stmt = stmt.where(
                or_(Quiz.assigned_department == None, Quiz.assigned_department == student.department)
            )
    elif role == "advisor":
        # Teachers see only their own quizzes
        stmt = stmt.where(Quiz.created_by == user_id)
    # admin sees all

    result = await db.execute(stmt)
    return [_quiz_summary(q) for q in result.scalars().all()]


# ── get quiz detail (student view — no answers) ─────────────────────

@router.get("/quizzes/{quiz_id}", response_model=QuizDetail)
async def get_quiz(quiz_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(
            selectinload(Quiz.creator),
            selectinload(Quiz.questions).selectinload(QuizQuestion.options),
        )
    )
    result = await db.execute(stmt)
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(404, "Quiz not found")
    return QuizDetail(
        **_quiz_summary(q).model_dump(),
        questions=[
            QuizQuestionOut(
                id=qq.id,
                question_text=qq.question_text,
                order=qq.order,
                options=[QuizOptionOut(id=o.id, option_text=o.option_text) for o in qq.options],
            )
            for qq in q.questions
        ],
    )


# ── get quiz with answers (advisor+) ─────────────────────────────────

@router.get("/quizzes/{quiz_id}/answers", response_model=QuizDetailWithAnswers)
async def get_quiz_with_answers(
    quiz_id: int,
    _user: dict = Depends(require_role("advisor")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(
            selectinload(Quiz.creator),
            selectinload(Quiz.questions).selectinload(QuizQuestion.options),
        )
    )
    result = await db.execute(stmt)
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(404, "Quiz not found")
    return QuizDetailWithAnswers(
        **_quiz_summary(q).model_dump(),
        questions=[
            QuizQuestionOutWithAnswer(
                id=qq.id,
                question_text=qq.question_text,
                order=qq.order,
                options=[QuizOptionOutWithAnswer(id=o.id, option_text=o.option_text, is_correct=bool(o.is_correct)) for o in qq.options],
            )
            for qq in q.questions
        ],
    )


# ── create quiz (advisor+) ──────────────────────────────────────────

@router.post("/quizzes", response_model=QuizOut, status_code=201)
async def create_quiz(
    payload: QuizCreate,
    user: dict = Depends(require_role("advisor")),
    db: AsyncSession = Depends(get_db),
):
    quiz = Quiz(
        title=payload.title,
        description=payload.description,
        course_id=payload.course_id,
        created_by=user["id"],
        assigned_department=payload.assigned_department,
        duration_minutes=payload.duration_minutes,
    )
    for idx, qq in enumerate(payload.questions):
        question = QuizQuestion(question_text=qq.question_text, order=idx)
        for opt in qq.options:
            question.options.append(QuizOption(option_text=opt.option_text, is_correct=int(opt.is_correct)))
        quiz.questions.append(question)
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz, attribute_names=["questions", "creator"])
    return _quiz_summary(quiz)


# ── toggle quiz active state (advisor+) ──────────────────────────────

@router.patch("/quizzes/{quiz_id}/toggle", response_model=QuizOut)
async def toggle_quiz(
    quiz_id: int,
    _user: dict = Depends(require_role("advisor")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.creator), selectinload(Quiz.questions))
    result = await db.execute(stmt)
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(404, "Quiz not found")
    q.is_active = 0 if q.is_active else 1
    await db.commit()
    await db.refresh(q)
    return _quiz_summary(q)


# ── submit quiz attempt (student) ────────────────────────────────────

@router.post("/quizzes/{quiz_id}/submit", response_model=QuizAttemptOut)
async def submit_quiz(
    quiz_id: int,
    payload: QuizSubmit,
    user: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions).selectinload(QuizQuestion.options))
    )
    result = await db.execute(stmt)
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    if not quiz.is_active:
        raise HTTPException(400, "Quiz is no longer active")

    # build lookup: question_id -> correct_option_ids
    correct_map: dict[int, set[int]] = {}
    for qq in quiz.questions:
        correct_map[qq.id] = {o.id for o in qq.options if o.is_correct}

    total = len(quiz.questions)
    correct = 0
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=user["id"],
        total_questions=total,
        completed_at=datetime.now(timezone.utc),
    )
    for ans in payload.answers:
        if ans.question_id not in correct_map:
            continue
        is_right = ans.selected_option_id in correct_map[ans.question_id]
        if is_right:
            correct += 1
        attempt.answers.append(
            QuizAnswer(question_id=ans.question_id, selected_option_id=ans.selected_option_id)
        )

    attempt.correct_answers = correct
    attempt.score = round((correct / total) * 100, 1) if total > 0 else 0.0
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    await mark_study_activity(db, user["id"])
    student = await db.get(Student, user["id"])
    student_name = f"{student.first_name} {student.last_name}" if student else None
    return QuizAttemptOut(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        quiz_title=quiz.title,
        student_id=attempt.student_id,
        student_name=student_name,
        score=attempt.score,
        total_questions=attempt.total_questions,
        correct_answers=attempt.correct_answers,
        completed_at=attempt.completed_at,
    )


# ── list attempts for a quiz (advisor+) ──────────────────────────────

@router.get("/quizzes/{quiz_id}/attempts", response_model=list[QuizAttemptOut])
async def list_attempts(
    quiz_id: int,
    _user: dict = Depends(require_role("advisor")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(QuizAttempt)
        .where(QuizAttempt.quiz_id == quiz_id)
        .options(selectinload(QuizAttempt.student))
        .order_by(QuizAttempt.completed_at.desc())
    )
    result = await db.execute(stmt)
    attempts = result.scalars().all()
    quiz = await db.get(Quiz, quiz_id)
    return [
        QuizAttemptOut(
            id=a.id,
            quiz_id=a.quiz_id,
            quiz_title=quiz.title if quiz else None,
            student_id=a.student_id,
            student_name=f"{a.student.first_name} {a.student.last_name}" if a.student else None,
            score=a.score,
            total_questions=a.total_questions,
            correct_answers=a.correct_answers,
            completed_at=a.completed_at,
        )
        for a in attempts
    ]


# ── my attempts (student) ───────────────────────────────────────────

@router.get("/my-attempts", response_model=list[QuizAttemptOut])
async def my_attempts(
    user: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(QuizAttempt)
        .where(QuizAttempt.student_id == user["id"])
        .options(selectinload(QuizAttempt.student))
        .order_by(QuizAttempt.completed_at.desc())
    )
    result = await db.execute(stmt)
    attempts = result.scalars().all()
    out = []
    for a in attempts:
        quiz = await db.get(Quiz, a.quiz_id)
        out.append(
            QuizAttemptOut(
                id=a.id,
                quiz_id=a.quiz_id,
                quiz_title=quiz.title if quiz else None,
                student_id=a.student_id,
                student_name=f"{a.student.first_name} {a.student.last_name}" if a.student else None,
                score=a.score,
                total_questions=a.total_questions,
                correct_answers=a.correct_answers,
                completed_at=a.completed_at,
            )
        )
    return out
