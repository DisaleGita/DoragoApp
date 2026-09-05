import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import TimestampMixin


class ImportSource(Base, TimestampMixin):
    __tablename__ = "import_sources"
    __table_args__ = (
        CheckConstraint(
            "source_channel IN ('text_paste','file_upload')",
            name="ck_import_sources_channel",
        ),
        CheckConstraint(
            "status IN ('pending','parsed','accepted','rejected','failed')",
            name="ck_import_sources_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source_channel: Mapped[str] = mapped_column(String(30), nullable=False)
    raw_text: Mapped[str | None] = mapped_column(Text)
    file_storage_key: Mapped[str | None] = mapped_column(String(1000))
    file_name: Mapped[str | None] = mapped_column(String(500))
    mime_type: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)


class ParserRun(Base, TimestampMixin):
    __tablename__ = "parser_runs"
    __table_args__ = (
        CheckConstraint("status IN ('success','failed')", name="ck_parser_runs_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    import_source_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("import_sources.id", ondelete="CASCADE"), index=True, nullable=False
    )
    parser_model: Mapped[str] = mapped_column(String(100), nullable=False)
    overall_confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    extracted_result: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    warnings: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(100))
