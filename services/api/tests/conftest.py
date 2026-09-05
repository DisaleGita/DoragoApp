import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://unused:unused@localhost/dorago_test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-that-is-long-and-not-for-production")
os.environ.setdefault("OTP_HASH_SECRET", "test-otp-secret-that-is-long-and-not-for-production")

import app.models  # noqa: E402,F401
from app.core.config import Settings  # noqa: E402
from app.core.database import Base  # noqa: E402


@pytest.fixture
def settings() -> Settings:
    return Settings(
        app_env="test",
        database_url=os.environ["DATABASE_URL"],
        redis_url=os.environ["REDIS_URL"],
        jwt_secret=os.environ["JWT_SECRET"],
        otp_hash_secret=os.environ["OTP_HASH_SECRET"],
        enable_dev_otp_bypass=True,
        dev_otp_code="654321",
    )


@pytest_asyncio.fixture
async def db() -> AsyncIterator[AsyncSession]:
    database_url = os.getenv("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_DATABASE_URL is required for integration tests")
    database_name = make_url(database_url).database or ""
    if not database_name.endswith("_test"):
        raise RuntimeError("Refusing to reset a database whose name does not end in _test")

    engine = create_async_engine(database_url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()
