from __future__ import annotations

import random

from sqlalchemy import select

from app.database import sync_session
from app.models import AssignmentHelp, ForumInteraction, PeerChatInteraction, Student


def seed_cis_data() -> None:
    random.seed(42)
    db = sync_session()
    try:
        students = _ensure_students(db)
        student_ids = [student.id for student in students]

        connector_ids = student_ids[:3]
        contributor_ids = student_ids[3:13]
        isolated_ids = student_ids[13:20]

        forum_count = 0
        peer_chat_count = 0
        assignment_help_count = 0

        for student_id in connector_ids:
            interaction_total = random.randint(15, 20)
            forum, peer, help_rows = _seed_interactions_for_student(db, student_id, student_ids, interaction_total)
            forum_count += forum
            peer_chat_count += peer
            assignment_help_count += help_rows

        for student_id in contributor_ids:
            interaction_total = random.randint(5, 10)
            forum, peer, help_rows = _seed_interactions_for_student(db, student_id, student_ids, interaction_total)
            forum_count += forum
            peer_chat_count += peer
            assignment_help_count += help_rows

        for student_id in isolated_ids:
            interaction_total = random.randint(0, 2)
            forum, peer, help_rows = _seed_interactions_for_student(db, student_id, student_ids, interaction_total)
            forum_count += forum
            peer_chat_count += peer
            assignment_help_count += help_rows

        db.commit()
    finally:
        db.close()

    print(
        f"Seeded {forum_count} forum_interactions, {peer_chat_count} peer_chat_interactions, {assignment_help_count} assignment_help rows"
    )


def _ensure_students(db) -> list[Student]:
    created_students: list[Student] = []
    departments = ["DEPT-A", "DEPT-B"]

    for idx in range(20):
        email = f"cis_student_{idx + 1}@example.com"
        existing = db.execute(select(Student).where(Student.email == email)).scalar_one_or_none()
        if existing:
            created_students.append(existing)
            continue

        student = Student(
            first_name=f"CIS{idx + 1}",
            last_name="Student",
            email=email,
            department=departments[idx % 2],
            section=f"S{(idx % 2) + 1}",
            batch_start_year=2024,
            batch_end_year=2028,
        )
        db.add(student)
        db.flush()
        created_students.append(student)

    return created_students


def _seed_interactions_for_student(db, source_student_id: int, all_student_ids: list[int], count: int) -> tuple[int, int, int]:
    if count <= 0:
        return 0, 0, 0

    targets = [student_id for student_id in all_student_ids if student_id != source_student_id]
    random.shuffle(targets)

    forum_count = 0
    peer_chat_count = 0
    assignment_help_count = 0

    for idx in range(count):
        target_student_id = targets[idx % len(targets)]
        interaction_type = random.choice(["forum", "peer", "help"])

        if interaction_type == "forum":
            db.add(
                ForumInteraction(
                    from_student_id=source_student_id,
                    to_student_id=target_student_id,
                    forum_post_id=random.randint(1, 5000),
                )
            )
            forum_count += 1
        elif interaction_type == "peer":
            db.add(
                PeerChatInteraction(
                    from_student_id=source_student_id,
                    to_student_id=target_student_id,
                    message_count=random.randint(1, 6),
                )
            )
            peer_chat_count += 1
        else:
            db.add(
                AssignmentHelp(
                    helper_student_id=source_student_id,
                    helped_student_id=target_student_id,
                    assignment_id=random.randint(1, 3000),
                )
            )
            assignment_help_count += 1

    return forum_count, peer_chat_count, assignment_help_count


if __name__ == "__main__":
    seed_cis_data()
