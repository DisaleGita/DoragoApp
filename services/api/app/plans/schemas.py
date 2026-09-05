from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.security import local_to_utc
from app.plans.details import validate_details
from app.trips.schemas import TripResponse


class PlanType(StrEnum):
    FLIGHT = "flight"
    LODGING = "lodging"
    CAR_RENTAL = "car_rental"
    RAIL = "rail"
    BUS = "bus"
    FERRY = "ferry"
    CRUISE = "cruise"
    SHUTTLE = "shuttle"
    RIDESHARE = "rideshare"
    PARKING = "parking"
    DINING = "dining"
    MEETING = "meeting"
    EVENT = "event"
    ACTIVITY = "activity"
    TOUR = "tour"
    ATTRACTION = "attraction"
    TICKET = "ticket"
    INSURANCE = "insurance"
    VISA_APPOINTMENT = "visa_appointment"
    CUSTOM_NOTE = "custom_note"
    GENERIC_RESERVATION = "generic_reservation"


class PlanStatus(StrEnum):
    PROPOSED = "proposed"
    CONFIRMED = "confirmed"
    TENTATIVE = "tentative"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class PlanSourceType(StrEnum):
    MANUAL = "manual"
    AI_IMPORT = "ai_import"
    FORWARDED_EMAIL = "forwarded_email"
    PROVIDER_SYNC = "provider_sync"


class PlanFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plan_type: PlanType
    title: str = Field(min_length=1, max_length=500)
    start_local: datetime
    start_timezone: str
    end_local: datetime | None = None
    end_timezone: str | None = None
    is_all_day: bool = False
    provider_name: str | None = Field(default=None, max_length=300)
    confirmation_number: str | None = Field(default=None, max_length=200)
    location_name: str | None = Field(default=None, max_length=500)
    address: str | None = Field(default=None, max_length=1000)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    cost_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    cost_currency: str | None = Field(default=None, min_length=3, max_length=3)
    notes: str | None = Field(default=None, max_length=30_000)
    website_url: str | None = Field(default=None, max_length=1000)
    contact_phone: str | None = Field(default=None, max_length=50)
    contact_email: str | None = Field(default=None, max_length=320)
    status: PlanStatus = PlanStatus.CONFIRMED
    assigned_traveler_names: list[str] = Field(default_factory=list, max_length=50)
    details: dict[str, Any] = Field(default_factory=dict)

    @field_validator("start_local", "end_local")
    @classmethod
    def require_naive_local(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is not None:
            raise ValueError("Local datetime must not contain a UTC offset")
        return value

    @field_validator("cost_currency")
    @classmethod
    def uppercase_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value

    @model_validator(mode="after")
    def validate_time_pair(self) -> "PlanFields":
        local_to_utc(self.start_local, self.start_timezone)
        if self.end_local is not None:
            self.end_timezone = self.end_timezone or self.start_timezone
            end_utc = local_to_utc(self.end_local, self.end_timezone)
            if end_utc < local_to_utc(self.start_local, self.start_timezone):
                raise ValueError("end time must not precede start time")
        elif self.end_timezone is not None:
            raise ValueError("end_timezone requires end_local")
        self.details = validate_details(self.plan_type, self.details)
        return self


class PlanCreate(PlanFields):
    pass


class PlanUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base_version: int = Field(ge=1)
    plan_type: PlanType | None = None
    title: str | None = Field(default=None, min_length=1, max_length=500)
    start_local: datetime | None = None
    start_timezone: str | None = None
    end_local: datetime | None = None
    end_timezone: str | None = None
    is_all_day: bool | None = None
    provider_name: str | None = Field(default=None, max_length=300)
    confirmation_number: str | None = Field(default=None, max_length=200)
    location_name: str | None = Field(default=None, max_length=500)
    address: str | None = Field(default=None, max_length=1000)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    cost_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    cost_currency: str | None = Field(default=None, min_length=3, max_length=3)
    notes: str | None = Field(default=None, max_length=30_000)
    website_url: str | None = Field(default=None, max_length=1000)
    contact_phone: str | None = Field(default=None, max_length=50)
    contact_email: str | None = Field(default=None, max_length=320)
    status: PlanStatus | None = None
    assigned_traveler_names: list[str] | None = Field(default=None, max_length=50)
    details: dict[str, Any] | None = None


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    plan_type: PlanType
    title: str
    start_local: datetime
    start_timezone: str
    start_utc: datetime
    end_local: datetime | None
    end_timezone: str | None
    end_utc: datetime | None
    is_all_day: bool
    provider_name: str | None
    confirmation_number: str | None
    location_name: str | None
    address: str | None
    latitude: float | None
    longitude: float | None
    cost_amount: Decimal | None
    cost_currency: str | None
    notes: str | None
    website_url: str | None
    contact_phone: str | None
    contact_email: str | None
    status: PlanStatus
    source_type: PlanSourceType
    source_id: UUID | None
    ai_confidence: Decimal | None
    assigned_traveler_names: list[str]
    details: dict[str, Any]
    version: int
    created_at: datetime
    updated_at: datetime


class NextUpResponse(BaseModel):
    plan: PlanResponse
    trip: TripResponse
