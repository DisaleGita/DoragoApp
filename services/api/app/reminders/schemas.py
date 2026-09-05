from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


class ReminderType(StrEnum):
    AT_START = "at_start"
    THIRTY_MINUTES_BEFORE = "30_minutes_before"
    ONE_HOUR_BEFORE = "1_hour_before"
    TWO_HOURS_BEFORE = "2_hours_before"
    ONE_DAY_BEFORE = "1_day_before"
    CUSTOM = "custom"


class ReminderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reminder_type: ReminderType
    trigger_at_utc: datetime | None = None

    @model_validator(mode="after")
    def validate_custom(self) -> "ReminderCreate":
        if self.reminder_type == ReminderType.CUSTOM and self.trigger_at_utc is None:
            raise ValueError("trigger_at_utc is required for a custom reminder")
        if self.reminder_type != ReminderType.CUSTOM and self.trigger_at_utc is not None:
            raise ValueError("trigger_at_utc is only accepted for a custom reminder")
        return self


class ReminderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    plan_id: UUID
    reminder_type: ReminderType
    trigger_at_utc: datetime
    is_sent: bool
    created_at: datetime
    updated_at: datetime
