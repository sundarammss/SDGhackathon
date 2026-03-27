"""add_department_courses_and_units

Revision ID: cc33dd44ee55
Revises: bb22cc33dd44
Create Date: 2026-03-27 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "cc33dd44ee55"
down_revision = "bb22cc33dd44"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("department_courses"):
        op.create_table(
            "department_courses",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("code", sa.String(length=40), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("department", sa.String(length=120), nullable=False),
            sa.Column("semester", sa.Integer(), nullable=False),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("teachers.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_department_courses_department", "department_courses", ["department"])
        op.create_index("ix_department_courses_semester", "department_courses", ["semester"])
        op.create_unique_constraint(
            "uq_department_course_code_semester_dept",
            "department_courses",
            ["code", "semester", "department"],
        )

    if not inspector.has_table("department_course_units"):
        op.create_table(
            "department_course_units",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("course_id", sa.Integer(), sa.ForeignKey("department_courses.id"), nullable=False),
            sa.Column("unit_number", sa.Integer(), nullable=False),
            sa.Column("file_path", sa.String(length=500), nullable=False),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("mime_type", sa.String(length=120), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_department_course_units_course_id", "department_course_units", ["course_id"])
        op.create_unique_constraint(
            "uq_department_course_unit_number",
            "department_course_units",
            ["course_id", "unit_number"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("department_course_units"):
        op.drop_constraint("uq_department_course_unit_number", "department_course_units", type_="unique")
        op.drop_index("ix_department_course_units_course_id", table_name="department_course_units")
        op.drop_table("department_course_units")

    if inspector.has_table("department_courses"):
        op.drop_constraint("uq_department_course_code_semester_dept", "department_courses", type_="unique")
        op.drop_index("ix_department_courses_semester", table_name="department_courses")
        op.drop_index("ix_department_courses_department", table_name="department_courses")
        op.drop_table("department_courses")
