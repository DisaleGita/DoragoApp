from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.core.security import generate_otp, local_to_utc, otp_digest


def test_otp_is_always_six_numeric_digits() -> None:
    codes = {generate_otp() for _ in range(250)}
    assert all(len(code) == 6 and code.isdigit() for code in codes)
    assert len(codes) > 200


def test_otp_digest_is_bound_to_challenge_email_and_code(settings) -> None:
    challenge_id = uuid4()
    digest = otp_digest(settings, challenge_id, "Traveler@Example.com", "654321")

    assert "654321" not in digest
    assert digest == otp_digest(settings, challenge_id, "traveler@example.com", "654321")
    assert digest != otp_digest(settings, challenge_id, "traveler@example.com", "123456")
    assert digest != otp_digest(settings, uuid4(), "traveler@example.com", "654321")


def test_local_time_uses_iana_timezone() -> None:
    local = datetime(2026, 7, 4, 9, 30)
    assert local_to_utc(local, "America/Chicago") == datetime(2026, 7, 4, 14, 30, tzinfo=UTC)


def test_cross_timezone_times_are_independently_representable() -> None:
    departure = local_to_utc(datetime(2026, 1, 5, 20, 0), "America/Los_Angeles")
    arrival = local_to_utc(datetime(2026, 1, 6, 16, 30), "Asia/Tokyo")
    assert departure == datetime(2026, 1, 6, 4, 0, tzinfo=UTC)
    assert arrival == datetime(2026, 1, 6, 7, 30, tzinfo=UTC)


@pytest.mark.parametrize(
    ("value", "zone"),
    [
        (datetime(2026, 3, 8, 2, 30), "America/Chicago"),
        (datetime(2026, 11, 1, 1, 30), "America/Chicago"),
    ],
)
def test_dst_gap_and_ambiguity_require_user_correction(value: datetime, zone: str) -> None:
    with pytest.raises(ValueError):
        local_to_utc(value, zone)


def test_unknown_timezone_is_rejected() -> None:
    with pytest.raises(ValueError, match="Unknown IANA timezone"):
        local_to_utc(datetime(2026, 1, 1, 12), "Not/A_Timezone")
