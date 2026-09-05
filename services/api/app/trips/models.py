import uuid
from datetime import date

from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import SoftDeleteMixin, TimestampMixin


class Trip(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="ck_trips_date_range"),
        CheckConstraint(
            "purpose IN ('leisure','business','bleisure','other')", name="ck_trips_purpose"
        ),
        CheckConstraint(
            "status IN ('draft','upcoming','current','completed','archived')",
            name="ck_trips_status",
        ),
        Index("ix_trips_owner_start", "owner_user_id", "start_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    primary_destination: Mapped[str] = mapped_column(String(300), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    timezone: Mapped[str] = mapped_column(String(100), nullable=False)
    purpose: Mapped[str] = mapped_column(String(20), default="leisure", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="upcoming", nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(String(1000))
    notes: Mapped[str | None] = mapped_column(Text)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class TripDestination(Base, TimestampMixin):
    __tablename__ = "trip_destinations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), index=True, nullable=False
    )
    destination_name: Mapped[str] = mapped_column(String(300), nullable=False)
    country_code: Mapped[str | None] = mapped_column(String(5))
    latitude: Mapped[float | None]
    longitude: Mapped[float | None]
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class TravelerProfile(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "traveler_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(50))
    is_primary_user: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class TripTraveler(Base, TimestampMixin):
    __tablename__ = "trip_travelers"
    __table_args__ = (
        CheckConstraint("role IN ('organizer','traveler','viewer')", name="ck_trip_travelers_role"),
    )

    trip_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), primary_key=True
    )
    traveler_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("traveler_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(20), default="traveler", nullable=False)
