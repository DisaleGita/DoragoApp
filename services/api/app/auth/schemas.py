from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.users.schemas import UserResponse


class OtpRequest(BaseModel):
    email: EmailStr


class OtpRequestResponse(BaseModel):
    challenge_expires_at: datetime
    resend_after_seconds: int
    dev_code: str | None = None


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    client_type: Literal["web", "mobile"] = "web"
    device_name: str | None = Field(default=None, max_length=200)

    @field_validator("code")
    @classmethod
    def digits_only(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("OTP code must contain six digits")
        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in_seconds: int
    refresh_token: str | None = None
    user: UserResponse
    is_first_login: bool


class RefreshRequest(BaseModel):
    refresh_token: str | None = None
    client_type: Literal["web", "mobile"] = "web"
