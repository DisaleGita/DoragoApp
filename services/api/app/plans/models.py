import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import SoftDeleteMixin, TimestampMixin


class PlanItem(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "plan_items"
    __table_args__ = (
        CheckConstraint(
            "plan_type IN ('flight','lodging','car_rental','rail','bus','ferry','cruise',"
            "'shuttle','rideshare','parking','dining','meeting','event','activity','tour',"
            "'attraction','ticket','insurance','visa_appointment','custom_note',"
            "'generic_reservation')",
            name="ck_plan_items_type",
        ),
        CheckConstraint(
            "status IN ('proposed','confirmed','tentative','cancelled','completed')",
            name="ck_plan_items_status",
        ),
        CheckConstraint(
            "source_type IN ('manual','ai_import','forwarded_email','provider_sync')",
            name="ck_plan_items_source_type",
        ),
        CheckConstraint("cost_amount IS NULL OR cost_amount >= 0", name="ck_plan_items_cost"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), index=True, nullable=False
    )
    plan_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    start_local: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    start_timezone: Mapped[str] = mapped_column(String(100), nullable=False)
    start_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    end_local: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    end_timezone: Mapped[str | None] = mapped_column(String(100))
    end_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_all_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    provider_name: Mapped[str | None] = mapped_column(String(300))
    confirmation_number: Mapped[str | None] = mapped_column(String(200), index=True)
    location_name: Mapped[str | None] = mapped_column(String(500))
    address: Mapped[str | None] = mapped_column(String(1000))
    latitude: Mapped[float | None]
    longitude: Mapped[float | None]
    cost_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    cost_currency: Mapped[str | None] = mapped_column(String(3))
    notes: Mapped[str | None] = mapped_column(Text)
    website_url: Mapped[str | None] = mapped_column(String(1000))
    contact_phone: Mapped[str | None] = mapped_column(String(50))
    contact_email: Mapped[str | None] = mapped_column(String(320))
    status: Mapped[str] = mapped_column(String(20), default="confirmed", nullable=False)
    source_type: Mapped[str] = mapped_column(String(30), default="manual", nullable=False)
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("import_sources.id", ondelete="SET NULL"), index=True
    )
    ai_confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    assigned_traveler_names: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class PlanFieldSource(Base):
    __tablename__ = "plan_field_sources"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plan_items.id", ondelete="CASCADE"), index=True, nullable=False
    )
    field_name: Mapped[str] = mapped_column(String(200), nullable=False)
    field_value: Mapped[Any | None] = mapped_column(JSONB)
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    source_snippet: Mapped[str | None] = mapped_column(Text)
    user_override: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PlanVersion(Base):
    __tablename__ = "plan_versions"
    __table_args__ = (UniqueConstraint("plan_id", "version", name="uq_plan_versions_plan_version"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plan_items.id", ondelete="CASCADE"), index=True, nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    change_source: Mapped[str] = mapped_column(String(30), nullable=False)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
