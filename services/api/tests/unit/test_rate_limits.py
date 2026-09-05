import pytest
from pydantic import ValidationError
from redis.exceptions import RedisError

from app.auth.rate_limit import AuthRateLimiter
from app.core.config import Settings
from app.core.errors import ApiError


class MemoryRedis:
    def __init__(self) -> None:
        self.values: dict[str, int] = {}
        self.expirations: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.values[key] = self.values.get(key, 0) + 1
        return self.values[key]

    async def expire(self, key: str, seconds: int) -> None:
        self.expirations[key] = seconds


class BrokenRedis:
    async def incr(self, key: str) -> int:
        raise RedisError("unavailable")


async def test_email_otp_request_limit_is_enforced(settings) -> None:
    redis = MemoryRedis()
    limiter = AuthRateLimiter(redis, settings)  # type: ignore[arg-type]

    for _ in range(5):
        await limiter.check_otp_request("traveler@example.com", "127.0.0.1")
    with pytest.raises(ApiError) as caught:
        await limiter.check_otp_request("traveler@example.com", "127.0.0.1")
    assert caught.value.status_code == 429


async def test_production_auth_fails_closed_when_rate_limit_store_is_down(settings) -> None:
    production = settings.model_copy(update={"app_env": "production"})
    limiter = AuthRateLimiter(BrokenRedis(), production)  # type: ignore[arg-type]
    with pytest.raises(ApiError) as caught:
        await limiter.check_otp_request("traveler@example.com", "127.0.0.1")
    assert caught.value.status_code == 503


def test_development_bypass_cannot_be_enabled_in_production(settings) -> None:
    values = settings.model_dump()
    values.update(
        app_env="production",
        enable_dev_otp_bypass=True,
        dev_otp_code="654321",
    )
    with pytest.raises(ValidationError, match="must never be enabled"):
        Settings.model_validate(values)
