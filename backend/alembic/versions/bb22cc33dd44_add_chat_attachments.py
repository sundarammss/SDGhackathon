"""add_chat_attachments

Revision ID: bb22cc33dd44
Revises: aa11bb22cc33
Create Date: 2026-03-27 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "bb22cc33dd44"
down_revision = "aa11bb22cc33"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("chat_messages")}

    if "attachment_path" not in cols:
        op.add_column("chat_messages", sa.Column("attachment_path", sa.String(length=500), nullable=True))
    if "attachment_name" not in cols:
        op.add_column("chat_messages", sa.Column("attachment_name", sa.String(length=255), nullable=True))
    if "attachment_mime_type" not in cols:
        op.add_column("chat_messages", sa.Column("attachment_mime_type", sa.String(length=120), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("chat_messages")}

    if "attachment_mime_type" in cols:
        op.drop_column("chat_messages", "attachment_mime_type")
    if "attachment_name" in cols:
        op.drop_column("chat_messages", "attachment_name")
    if "attachment_path" in cols:
        op.drop_column("chat_messages", "attachment_path")
