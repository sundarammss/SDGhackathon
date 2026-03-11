"""add_attendance_table

Revision ID: c1d2e3f4a5b6
Revises: b1c2d3e4f5a6
Create Date: 2026-03-11 12:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "c1d2e3f4a5b6"
down_revision = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "attendance",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("teachers.id"), nullable=False),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column(
            "status",
            sa.Enum("present", "absent", name="attendancestatus"),
            nullable=False,
            server_default="present",
        ),
        sa.Column("subject", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_attendance_student_date", "attendance", ["student_id", "date"])
    op.create_index("ix_attendance_teacher_date", "attendance", ["teacher_id", "date"])


def downgrade() -> None:
    op.drop_index("ix_attendance_teacher_date", table_name="attendance")
    op.drop_index("ix_attendance_student_date", table_name="attendance")
    op.drop_table("attendance")
    op.execute("DROP TYPE IF EXISTS attendancestatus")
