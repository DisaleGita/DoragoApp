"""Reject duplicate document content within a trip.

Revision ID: 0002
Revises: 0001

Existing documents keep a NULL hash because backfilling would require reading
every stored object; the partial index ignores them.
"""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("content_sha256", sa.String(length=64), nullable=True))
    op.create_index(
        "uq_documents_trip_content",
        "documents",
        ["trip_id", "content_sha256"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL AND content_sha256 IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_documents_trip_content", table_name="documents")
    op.drop_column("documents", "content_sha256")
