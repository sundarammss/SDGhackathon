"""add_student_notification_seen

Revision ID: aa11bb22cc33
Revises: f60439556b6b
Create Date: 2026-03-27 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "aa11bb22cc33"
down_revision = "f60439556b6b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("student_notification_seen"):
        return

    op.create_table(
        "student_notification_seen",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("notification_id", sa.String(length=120), nullable=False),
        sa.Column("seen_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_student_notification_seen_student_id", "student_notification_seen", ["student_id"])
    op.create_index("ix_student_notification_seen_notification_id", "student_notification_seen", ["notification_id"])
    op.create_unique_constraint(
        "uq_student_notification_seen_student_notification",
        "student_notification_seen",
        ["student_id", "notification_id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("student_notification_seen"):
        return

    op.drop_constraint("uq_student_notification_seen_student_notification", "student_notification_seen", type_="unique")
    op.drop_index("ix_student_notification_seen_notification_id", table_name="student_notification_seen")
    op.drop_index("ix_student_notification_seen_student_id", table_name="student_notification_seen")
    op.drop_table("student_notification_seen")
