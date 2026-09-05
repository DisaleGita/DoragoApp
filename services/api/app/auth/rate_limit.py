import hashlib

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import Settings
from app.core.errors import ApiError


class AuthRateLimiter:
    def __init__(self, redis: Redis, settings: Settings) -> None:
        self.redis = redis
        self.settings = settings

    async def check_otp_request(self, email: str, ip: str) -> None:
        await self._limit(f"otp:email:{self._digest(email)}", 5, 15 * 60)
        await self._limit(f"otp:ip:{self._digest(ip)}", 20, 15 * 60)

    async def check_otp_verify(self, email: str, ip: str) -> None:
        await self._limit(f"verify:email:{self._digest(email)}", 20, 15 * 60)
        await self._limit(f"verify:ip:{self._digest(ip)}", 60, 15 * 60)

    async def _limit(self, key: str, maximum: int, window_seconds: int) -> None:
        try:
            value = await self.redis.incr(key)
            if value == 1:
                await self.redis.expire(key, window_seconds)
        except RedisError as exc:
            if self.settings.production:
                raise ApiError(
                    503, "rate_limit_unavailable", "Authentication is temporarily unavailable."
                ) from exc
            return
        if value > maximum:
            raise ApiError(
                429, "rate_limited", "Too many authentication attempts. Try again later."
            )

    @staticmethod
    def _digest(value: str) -> str:
        return hashlib.sha256(value.strip().lower().encode()).hexdigest()
