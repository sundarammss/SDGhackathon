"""peer_requests_and_conversations

Revision ID: a1b2c3d4e5f6
Revises: 839dde5f3fe7
Create Date: 2026-03-11 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f6"
down_revision = "839dde5f3fe7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "peer_requests",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("from_student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("to_student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "accepted", "rejected", name="peerrequeststatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("student_a_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("student_b_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.id"), nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("conversations")
    op.drop_table("peer_requests")
    op.execute("DROP TYPE IF EXISTS peerrequeststatus")
