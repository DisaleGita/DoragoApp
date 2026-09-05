import uuid

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import SoftDeleteMixin, TimestampMixin


class TravelDocument(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint(
            "document_category IN ('boarding_pass','ticket','hotel_voucher',"
            "'rental_agreement','receipt','insurance_policy','qr_screenshot',"
            "'passport_scan','other')",
            name="ck_documents_category",
        ),
        CheckConstraint("file_size_bytes > 0", name="ck_documents_file_size"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), index=True, nullable=False
    )
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("plan_items.id", ondelete="SET NULL"), index=True
    )
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    extension: Mapped[str] = mapped_column(String(20), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1000), unique=True, nullable=False)
    document_category: Mapped[str] = mapped_column(String(30), default="other", nullable=False)
