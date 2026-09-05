from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    email_verified_at: datetime
    display_name: str | None
    home_airport_code: str | None
    home_airport_name: str | None
    preferred_currency: str
    timezone: str
    time_format_24h: bool
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=200)
    home_airport_code: str | None = Field(default=None, max_length=10)
    home_airport_name: str | None = Field(default=None, max_length=200)
    preferred_currency: str | None = Field(default=None, min_length=3, max_length=3)
    timezone: str | None = None
    time_format_24h: bool | None = None

    @field_validator("home_airport_code")
    @classmethod
    def uppercase_airport(cls, value: str | None) -> str | None:
        return value.strip().upper() if value else value

    @field_validator("preferred_currency")
    @classmethod
    def uppercase_currency(cls, value: str | None) -> str | None:
        return value.strip().upper() if value else value

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unknown IANA timezone") from exc
        return value
