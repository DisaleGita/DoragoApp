from functools import lru_cache
from typing import Annotated
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = "development"
    app_domain: str = "localhost"
    api_port: int = 8000
    database_url: str
    redis_url: str
    jwt_secret: SecretStr
    otp_hash_secret: SecretStr
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30
    otp_ttl_minutes: int = 10
    otp_max_attempts: int = 5
    otp_resend_seconds: int = 30
    enable_dev_otp_bypass: bool = False
    dev_otp_code: SecretStr | None = None
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-2.5-flash"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    smtp_from_email: str | None = None
    storage_endpoint: str = "http://seaweedfs:8333"
    storage_access_key: SecretStr | None = None
    storage_secret_key: SecretStr | None = None
    storage_bucket: str = "dorago-documents"
    storage_region: str = "us-east-1"
    storage_use_ssl: bool = False
    cors_allowed_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    max_document_bytes: int = 15 * 1024 * 1024

    @field_validator("database_url", mode="before")
    @classmethod
    def use_async_driver(cls, value: object) -> object:
        return async_database_url(value) if isinstance(value, str) else value

    @field_validator(
        "dev_otp_code",
        "gemini_api_key",
        "smtp_host",
        "smtp_username",
        "smtp_password",
        "smtp_from_email",
        "storage_access_key",
        "storage_secret_key",
        mode="before",
    )
    @classmethod
    def blank_is_unset(cls, value: object) -> object:
        # .env.example ships these as `KEY=`; an empty value means "not configured".
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def validate_security_mode(self) -> "Settings":
        production = self.app_env.lower() == "production"
        if production and self.enable_dev_otp_bypass:
            raise ValueError("Development OTP bypass must never be enabled in production")
        if self.enable_dev_otp_bypass:
            code = self.dev_otp_code.get_secret_value() if self.dev_otp_code else ""
            if len(code) != 6 or not code.isdigit():
                raise ValueError("DEV_OTP_CODE must be six digits when bypass is enabled")
        for field_name in ("jwt_secret", "otp_hash_secret"):
            value = getattr(self, field_name).get_secret_value()
            if production and len(value) < 32:
                raise ValueError(f"{field_name.upper()} must be at least 32 characters")
        return self

    @property
    def production(self) -> bool:
        return self.app_env.lower() == "production"


def async_database_url(url: str) -> str:
    """Accept hosted PostgreSQL URLs as providers print them.

    Providers such as Neon hand out ``postgresql://...?sslmode=require``; the
    asyncpg driver needs ``postgresql+asyncpg://...?ssl=require`` and rejects
    libpq-only options such as ``channel_binding``.
    """
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme in {"postgres", "postgresql"}:
        scheme = "postgresql+asyncpg"
    if scheme != "postgresql+asyncpg":
        return url
    query = []
    for key, item in parse_qsl(parts.query, keep_blank_values=True):
        if key == "sslmode":
            key = "ssl"
        if key != "channel_binding":
            query.append((key, item))
    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


@lru_cache
def get_settings() -> Settings:
    return Settings()
