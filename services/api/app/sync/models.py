import uuid
from typing import Any

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import TimestampMixin


class ProcessedMutation(Base, TimestampMixin):
    __tablename__ = "processed_mutations"
    __table_args__ = (
        UniqueConstraint("user_id", "mutation_id", name="uq_processed_mutations_user_mutation"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    mutation_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    operation: Mapped[str] = mapped_column(String(30), nullable=False)
    result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
