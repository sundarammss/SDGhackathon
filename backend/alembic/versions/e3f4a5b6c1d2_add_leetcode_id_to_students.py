"""add_leetcode_id_to_students

Revision ID: e3f4a5b6c1d2
Revises: d2e3f4a5b6c1
Create Date: 2026-03-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e3f4a5b6c1d2"
down_revision: Union[str, Sequence[str], None] = "d2e3f4a5b6c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "students",
        sa.Column("leetcode_id", sa.String(length=120), nullable=True),
    )
    op.create_unique_constraint("uq_students_leetcode_id", "students", ["leetcode_id"])


def downgrade() -> None:
    op.drop_constraint("uq_students_leetcode_id", "students", type_="unique")
    op.drop_column("students", "leetcode_id")
