import hashlib
import hmac
import uuid
from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.email import OtpEmailSender
from app.auth.models import AuthSession, OtpChallenge, RefreshToken
from app.core.config import Settings
from app.core.errors import ApiError
from app.core.security import (
    create_access_token,
    generate_otp,
    generate_refresh_token,
    otp_digest,
    refresh_digest,
    utc_now,
)
from app.users.models import User, UserSettings


@dataclass
class IssuedSession:
    access_token: str
    refresh_token: str
    session: AuthSession
    user: User
    is_first_login: bool


def normalize_email(email: str) -> str:
    return email.strip().lower()


def privacy_digest(settings: Settings, value: str) -> str:
    return hmac.new(
        settings.otp_hash_secret.get_secret_value().encode(),
        value.encode(),
        hashlib.sha256,
    ).hexdigest()


async def request_otp(
    db: AsyncSession,
    settings: Settings,
    email_sender: OtpEmailSender,
    email: str,
    ip_address: str,
) -> tuple[OtpChallenge, str | None]:
    normalized = normalize_email(email)
    now = utc_now()
    latest = await db.scalar(
        select(OtpChallenge)
        .where(OtpChallenge.email == normalized)
        .order_by(OtpChallenge.created_at.desc())
        .limit(1)
    )
    if latest:
        elapsed = (now - latest.created_at).total_seconds()
        if elapsed < settings.otp_resend_seconds:
            retry_after = int(settings.otp_resend_seconds - elapsed)
            raise ApiError(
                429,
                "otp_resend_too_soon",
                "Wait before requesting another verification code.",
                {"retry_after_seconds": retry_after},
            )

    code = (
        settings.dev_otp_code.get_secret_value()
        if settings.enable_dev_otp_bypass and settings.dev_otp_code
        else generate_otp()
    )
    challenge_id = uuid.uuid4()
    challenge = OtpChallenge(
        id=challenge_id,
        email=normalized,
        code_digest=otp_digest(settings, challenge_id, normalized, code),
        expires_at=now + timedelta(minutes=settings.otp_ttl_minutes),
        attempt_count=0,
        max_attempts=settings.otp_max_attempts,
        requested_ip_digest=privacy_digest(settings, ip_address),
        created_at=now,
    )
    db.add(challenge)
    try:
        await email_sender.send(normalized, code)
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    return challenge, code if settings.enable_dev_otp_bypass else None


async def verify_otp(
    db: AsyncSession,
    settings: Settings,
    email: str,
    code: str,
    client_type: str,
    device_name: str | None,
    ip_address: str,
    user_agent: str | None,
) -> IssuedSession:
    normalized = normalize_email(email)
    challenge = await db.scalar(
        select(OtpChallenge)
        .where(OtpChallenge.email == normalized, OtpChallenge.consumed_at.is_(None))
        .order_by(OtpChallenge.created_at.desc())
        .with_for_update()
        .limit(1)
    )
    now = utc_now()
    if challenge is None:
        raise ApiError(400, "otp_not_found", "No active verification code was found.")
    if challenge.expires_at <= now:
        raise ApiError(400, "otp_expired", "The verification code has expired.")
    if challenge.attempt_count >= challenge.max_attempts:
        raise ApiError(429, "otp_attempt_limit", "Too many failed verification attempts.")

    expected = otp_digest(settings, challenge.id, normalized, code)
    if not hmac.compare_digest(challenge.code_digest, expected):
        challenge.attempt_count += 1
        await db.commit()
        if challenge.attempt_count >= challenge.max_attempts:
            raise ApiError(429, "otp_attempt_limit", "Too many failed verification attempts.")
        raise ApiError(400, "otp_invalid", "The verification code is invalid.")

    challenge.consumed_at = now
    user = await db.scalar(select(User).where(User.email == normalized, User.deleted_at.is_(None)))
    first_login = user is None
    if user is None:
        user = User(
            email=normalized,
            email_verified_at=now,
            display_name=normalized.split("@", maxsplit=1)[0],
            preferred_currency="USD",
            timezone="UTC",
            time_format_24h=False,
        )
        db.add(user)
        await db.flush()
        db.add(UserSettings(user_id=user.id))

    auth_session = AuthSession(
        user_id=user.id,
        device_name=device_name,
        client_type=client_type,
        ip_digest=privacy_digest(settings, ip_address),
        user_agent=(user_agent or "")[:500] or None,
        last_seen_at=now,
    )
    db.add(auth_session)
    await db.flush()

    raw_refresh = generate_refresh_token()
    token_record = RefreshToken(
        session_id=auth_session.id,
        family_id=uuid.uuid4(),
        token_digest=refresh_digest(raw_refresh),
        expires_at=now + timedelta(days=settings.refresh_token_ttl_days),
        created_at=now,
    )
    db.add(token_record)
    await db.commit()
    await db.refresh(user)
    return IssuedSession(
        access_token=create_access_token(settings, user.id, auth_session.id),
        refresh_token=raw_refresh,
        session=auth_session,
        user=user,
        is_first_login=first_login,
    )


async def rotate_refresh_token(
    db: AsyncSession, settings: Settings, raw_token: str
) -> IssuedSession:
    now = utc_now()
    record = await db.scalar(
        select(RefreshToken)
        .where(RefreshToken.token_digest == refresh_digest(raw_token))
        .with_for_update()
    )
    if record is None:
        raise ApiError(401, "refresh_invalid", "The refresh session is invalid.")

    auth_session = await db.get(AuthSession, record.session_id, with_for_update=True)
    if auth_session is None or auth_session.revoked_at is not None:
        raise ApiError(401, "session_revoked", "The session has been revoked.")

    if record.used_at is not None or record.revoked_at is not None:
        auth_session.revoked_at = now
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == record.family_id)
            .values(revoked_at=now)
        )
        await db.commit()
        raise ApiError(401, "refresh_reuse_detected", "The session was revoked for security.")
    if record.expires_at <= now:
        record.revoked_at = now
        await db.commit()
        raise ApiError(401, "refresh_expired", "The refresh session has expired.")

    user = await db.scalar(
        select(User).where(User.id == auth_session.user_id, User.deleted_at.is_(None))
    )
    if user is None:
        raise ApiError(401, "user_unavailable", "The account is unavailable.")

    record.used_at = now
    replacement_raw = generate_refresh_token()
    replacement = RefreshToken(
        session_id=auth_session.id,
        family_id=record.family_id,
        token_digest=refresh_digest(replacement_raw),
        expires_at=now + timedelta(days=settings.refresh_token_ttl_days),
        created_at=now,
    )
    db.add(replacement)
    await db.flush()
    record.replaced_by_id = replacement.id
    auth_session.last_seen_at = now
    await db.commit()
    return IssuedSession(
        access_token=create_access_token(settings, user.id, auth_session.id),
        refresh_token=replacement_raw,
        session=auth_session,
        user=user,
        is_first_login=False,
    )


async def revoke_session(db: AsyncSession, session_id: uuid.UUID) -> None:
    now = utc_now()
    auth_session = await db.get(AuthSession, session_id, with_for_update=True)
    if auth_session:
        auth_session.revoked_at = now
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.session_id == session_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await db.commit()
