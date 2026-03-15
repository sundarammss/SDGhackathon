"""add_student_competitions

Revision ID: d2e3f4a5b6c1
Revises: c1d2e3f4a5b6
Create Date: 2026-03-11 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "d2e3f4a5b6c1"
down_revision = "c1d2e3f4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "student_competitions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("competition_name", sa.String(300), nullable=False),
        sa.Column("competition_date", sa.String(20), nullable=False),
        sa.Column(
            "status",
            sa.Enum("Winner", "Runner-up", "Participated", name="competitionstatus"),
            nullable=False,
        ),
        sa.Column("proof_file", sa.String(500), nullable=True),
        sa.Column(
            "approval_status",
            sa.Enum("Pending", "Approved", "Rejected", name="approvalstatus"),
            nullable=False,
            server_default="Pending",
        ),
        sa.Column("approved_by", sa.Integer(), sa.ForeignKey("teachers.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("student_competitions")
