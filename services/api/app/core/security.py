import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import jwt

from app.core.config import Settings


def utc_now() -> datetime:
    return datetime.now(UTC)


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def otp_digest(settings: Settings, challenge_id: UUID, email: str, code: str) -> str:
    message = f"{challenge_id}:{email.strip().lower()}:{code}".encode()
    return hmac.new(
        settings.otp_hash_secret.get_secret_value().encode(), message, hashlib.sha256
    ).hexdigest()


def refresh_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def create_access_token(settings: Settings, user_id: UUID, session_id: UUID) -> str:
    now = utc_now()
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "sid": str(session_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.access_token_ttl_minutes)).timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm="HS256")


def decode_access_token(settings: Settings, token: str) -> dict[str, Any]:
    payload = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=["HS256"])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Unexpected token type")
    return payload


def local_to_utc(value: datetime, timezone_name: str) -> datetime:
    if value.tzinfo is not None:
        raise ValueError("Local datetime must not include an offset")
    try:
        zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError("Unknown IANA timezone") from exc

    fold_zero = value.replace(tzinfo=zone, fold=0)
    fold_one = value.replace(tzinfo=zone, fold=1)
    if fold_zero.utcoffset() != fold_one.utcoffset():
        raise ValueError("Ambiguous local datetime at daylight-saving transition")

    converted = fold_zero.astimezone(UTC)
    round_trip = converted.astimezone(zone).replace(tzinfo=None)
    if round_trip != value:
        raise ValueError("Nonexistent local datetime at daylight-saving transition")
    return converted
