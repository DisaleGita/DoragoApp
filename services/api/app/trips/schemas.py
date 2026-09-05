from datetime import date, datetime
from enum import StrEnum
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TripPurpose(StrEnum):
    LEISURE = "leisure"
    BUSINESS = "business"
    BLEISURE = "bleisure"
    OTHER = "other"


class TripStatus(StrEnum):
    DRAFT = "draft"
    UPCOMING = "upcoming"
    CURRENT = "current"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class TravelerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str = Field(min_length=1, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=50)


class TripFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=300)
    primary_destination: str = Field(min_length=1, max_length=300)
    additional_destinations: list[str] = Field(default_factory=list, max_length=25)
    start_date: date
    end_date: date
    timezone: str
    purpose: TripPurpose = TripPurpose.LEISURE
    status: TripStatus = TripStatus.UPCOMING
    cover_image_url: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=20_000)
    travelers: list[TravelerInput] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def validate_dates_and_timezone(self) -> "TripFields":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        try:
            ZoneInfo(self.timezone)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unknown IANA timezone") from exc
        return self


class TripCreate(TripFields):
    pass


class TripUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base_version: int = Field(ge=1)
    title: str | None = Field(default=None, min_length=1, max_length=300)
    primary_destination: str | None = Field(default=None, min_length=1, max_length=300)
    additional_destinations: list[str] | None = Field(default=None, max_length=25)
    start_date: date | None = None
    end_date: date | None = None
    timezone: str | None = None
    purpose: TripPurpose | None = None
    status: TripStatus | None = None
    cover_image_url: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=20_000)
    is_archived: bool | None = None
    travelers: list[TravelerInput] | None = Field(default=None, max_length=50)


class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    primary_destination: str
    additional_destinations: list[str]
    start_date: date
    end_date: date
    timezone: str
    purpose: TripPurpose
    status: TripStatus
    cover_image_url: str | None
    notes: str | None
    is_archived: bool
    traveler_count: int
    travelers: list[TravelerInput]
    plan_count: int
    total_cost_grouped: dict[str, float]
    version: int
    created_at: datetime
    updated_at: datetime
