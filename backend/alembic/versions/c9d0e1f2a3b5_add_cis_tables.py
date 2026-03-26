"""add_cis_tables

Revision ID: c9d0e1f2a3b5
Revises: b9c0d1e2f3a4
Create Date: 2026-03-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c9d0e1f2a3b5"
down_revision: Union[str, Sequence[str], None] = "b9c0d1e2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    metadata = sa.MetaData()

    forum_interactions = sa.Table(
        "forum_interactions",
        metadata,
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("from_student_id", sa.Integer(), nullable=False),
        sa.Column("to_student_id", sa.Integer(), nullable=False),
        sa.Column("forum_post_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    peer_chat_interactions = sa.Table(
        "peer_chat_interactions",
        metadata,
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("from_student_id", sa.Integer(), nullable=False),
        sa.Column("to_student_id", sa.Integer(), nullable=False),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("last_active", sa.DateTime(), nullable=True),
    )

    assignment_help = sa.Table(
        "assignment_help",
        metadata,
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("helper_student_id", sa.Integer(), nullable=False),
        sa.Column("helped_student_id", sa.Integer(), nullable=False),
        sa.Column("assignment_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    cis_scores = sa.Table(
        "cis_scores",
        metadata,
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("student_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("label", sa.String(length=50), nullable=False),
        sa.Column("computed_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    forum_interactions.create(bind=bind, checkfirst=True)
    peer_chat_interactions.create(bind=bind, checkfirst=True)
    assignment_help.create(bind=bind, checkfirst=True)
    cis_scores.create(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    metadata = sa.MetaData()

    sa.Table("cis_scores", metadata).drop(bind=bind, checkfirst=True)
    sa.Table("assignment_help", metadata).drop(bind=bind, checkfirst=True)
    sa.Table("peer_chat_interactions", metadata).drop(bind=bind, checkfirst=True)
    sa.Table("forum_interactions", metadata).drop(bind=bind, checkfirst=True)