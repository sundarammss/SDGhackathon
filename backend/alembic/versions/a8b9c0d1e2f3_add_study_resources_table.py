"""add_study_resources_table

Revision ID: a8b9c0d1e2f3
Revises: f60439556b6b
Create Date: 2026-03-13 16:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a8b9c0d1e2f3"
down_revision: Union[str, Sequence[str], None] = "f60439556b6b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "study_resources",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("subject", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("tags", sa.String(length=500), nullable=True),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("file_type", sa.String(length=20), nullable=False),
        sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("teachers.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_study_resources_subject", "study_resources", ["subject"], unique=False)
    op.create_index("ix_study_resources_teacher_id", "study_resources", ["teacher_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_study_resources_teacher_id", table_name="study_resources")
    op.drop_index("ix_study_resources_subject", table_name="study_resources")
    op.drop_table("study_resources")
