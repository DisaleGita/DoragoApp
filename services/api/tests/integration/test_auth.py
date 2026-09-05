from datetime import timedelta

import pytest

from app.auth.models import OtpChallenge
from app.auth.service import request_otp, rotate_refresh_token, verify_otp
from app.core.errors import ApiError
from app.core.security import utc_now

pytestmark = pytest.mark.integration


class RecordingEmailSender:
    def __init__(self) -> None:
        self.messages: list[tuple[str, str]] = []

    async def send(self, recipient: str, code: str) -> None:
        self.messages.append((recipient, code))


async def test_universal_codes_fail_and_valid_code_is_single_use(db, settings) -> None:
    sender = RecordingEmailSender()
    await request_otp(db, settings, sender, "Traveler@Example.com", "127.0.0.1")

    with pytest.raises(ApiError, match="verification code is invalid"):
        await verify_otp(
            db,
            settings,
            "traveler@example.com",
            "123456",
            "mobile",
            "test device",
            "127.0.0.1",
            "pytest",
        )

    issued = await verify_otp(
        db,
        settings,
        "traveler@example.com",
        "654321",
        "mobile",
        "test device",
        "127.0.0.1",
        "pytest",
    )
    assert issued.user.email == "traveler@example.com"

    with pytest.raises(ApiError, match="No active verification code"):
        await verify_otp(
            db,
            settings,
            "traveler@example.com",
            "654321",
            "mobile",
            None,
            "127.0.0.1",
            "pytest",
        )


async def test_expired_otp_is_rejected(db, settings) -> None:
    sender = RecordingEmailSender()
    challenge, _ = await request_otp(db, settings, sender, "expired@example.com", "127.0.0.1")
    challenge.expires_at = utc_now() - timedelta(seconds=1)
    await db.commit()

    with pytest.raises(ApiError, match="expired"):
        await verify_otp(
            db,
            settings,
            "expired@example.com",
            "654321",
            "web",
            None,
            "127.0.0.1",
            "pytest",
        )


async def test_refresh_rotation_rejects_reuse(db, settings) -> None:
    sender = RecordingEmailSender()
    await request_otp(db, settings, sender, "refresh@example.com", "127.0.0.1")
    issued = await verify_otp(
        db,
        settings,
        "refresh@example.com",
        "654321",
        "mobile",
        None,
        "127.0.0.1",
        "pytest",
    )
    replacement = await rotate_refresh_token(db, settings, issued.refresh_token)
    assert replacement.refresh_token != issued.refresh_token

    with pytest.raises(ApiError, match="revoked for security"):
        await rotate_refresh_token(db, settings, issued.refresh_token)
    with pytest.raises(ApiError, match="revoked"):
        await rotate_refresh_token(db, settings, replacement.refresh_token)


async def test_only_a_digest_is_persisted(db, settings) -> None:
    sender = RecordingEmailSender()
    challenge, dev_code = await request_otp(db, settings, sender, "digest@example.com", "127.0.0.1")
    stored = await db.get(OtpChallenge, challenge.id)
    assert stored is not None
    assert dev_code == "654321"
    assert stored.code_digest != dev_code
    assert dev_code not in stored.code_digest


async def test_otp_attempt_limit_blocks_the_valid_code(db, settings) -> None:
    sender = RecordingEmailSender()
    await request_otp(db, settings, sender, "attempts@example.com", "127.0.0.1")

    for _ in range(settings.otp_max_attempts - 1):
        with pytest.raises(ApiError) as caught:
            await verify_otp(
                db,
                settings,
                "attempts@example.com",
                "111111",
                "mobile",
                None,
                "127.0.0.1",
                "pytest",
            )
        assert caught.value.code == "otp_invalid"

    with pytest.raises(ApiError) as final_bad_attempt:
        await verify_otp(
            db,
            settings,
            "attempts@example.com",
            "111111",
            "mobile",
            None,
            "127.0.0.1",
            "pytest",
        )
    assert final_bad_attempt.value.code == "otp_attempt_limit"

    with pytest.raises(ApiError) as valid_after_limit:
        await verify_otp(
            db,
            settings,
            "attempts@example.com",
            "654321",
            "mobile",
            None,
            "127.0.0.1",
            "pytest",
        )
    assert valid_after_limit.value.code == "otp_attempt_limit"
