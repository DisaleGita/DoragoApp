import pytest

from app.core.config import Settings, async_database_url


def test_cors_origins_accept_comma_separated_environment_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000, http://localhost:8080")

    settings = Settings(_env_file=None)

    assert settings.cors_allowed_origins == ["http://localhost:3000", "http://localhost:8080"]


def test_blank_optional_secrets_are_treated_as_unconfigured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("SMTP_PASSWORD", "  ")

    settings = Settings(_env_file=None)

    assert settings.gemini_api_key is None
    assert settings.smtp_password is None


def test_hosted_postgres_urls_are_adapted_for_asyncpg() -> None:
    neon = (
        "postgresql://user:p%40ss@ep-cool.us-east-2.aws.neon.tech/neondb"
        "?sslmode=require&channel_binding=require"
    )

    assert async_database_url(neon) == (
        "postgresql+asyncpg://user:p%40ss@ep-cool.us-east-2.aws.neon.tech/neondb?ssl=require"
    )
    local = "postgresql+asyncpg://dorago:secret@postgres:5432/dorago"
    assert async_database_url(local) == local
