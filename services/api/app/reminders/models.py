import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import TimestampMixin


class PlanReminder(Base, TimestampMixin):
    __tablename__ = "plan_reminders"
    __table_args__ = (
        CheckConstraint(
            "reminder_type IN ('at_start','30_minutes_before','1_hour_before',"
            "'2_hours_before','1_day_before','custom')",
            name="ck_plan_reminders_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plan_items.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    reminder_type: Mapped[str] = mapped_column(String(30), nullable=False)
    trigger_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
