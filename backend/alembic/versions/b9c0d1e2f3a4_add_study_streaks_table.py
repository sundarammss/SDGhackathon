"""add_study_streaks_table

Revision ID: b9c0d1e2f3a4
Revises: a8b9c0d1e2f3
Create Date: 2026-03-13 18:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b9c0d1e2f3a4"
down_revision: Union[str, Sequence[str], None] = "a8b9c0d1e2f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "study_streaks",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False, unique=True),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_activity_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_study_streaks_student_id", "study_streaks", ["student_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_study_streaks_student_id", table_name="study_streaks")
    op.drop_table("study_streaks")
