from fastapi import APIRouter, Depends, Request, Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentIdentity, get_current_identity
from app.auth.email import OtpEmailSender
from app.auth.rate_limit import AuthRateLimiter
from app.auth.schemas import (
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    RefreshRequest,
    TokenResponse,
)
from app.auth.service import (
    request_otp,
    revoke_session,
    rotate_refresh_token,
    verify_otp,
)
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.errors import ApiError
from app.users.schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])
REFRESH_COOKIE = "dorago_refresh"


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def require_allowed_origin(request: Request, settings: Settings) -> None:
    origin = request.headers.get("origin")
    if origin and origin not in settings.cors_allowed_origins:
        raise ApiError(403, "origin_forbidden", "The request origin is not allowed.")


def set_refresh_cookie(response: Response, settings: Settings, token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=settings.refresh_token_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.production,
        samesite="lax",
        path="/api/v1/auth",
    )


def token_response(settings: Settings, issued: object, client_type: str) -> TokenResponse:
    return TokenResponse(
        access_token=issued.access_token,  # type: ignore[attr-defined]
        expires_in_seconds=settings.access_token_ttl_minutes * 60,
        refresh_token=issued.refresh_token if client_type == "mobile" else None,  # type: ignore[attr-defined]
        user=UserResponse.model_validate(issued.user),  # type: ignore[attr-defined]
        is_first_login=issued.is_first_login,  # type: ignore[attr-defined]
    )


@router.post("/otp/request", response_model=OtpRequestResponse, status_code=202)
async def request_code(
    payload: OtpRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> OtpRequestResponse:
    redis: Redis = request.app.state.redis
    limiter = AuthRateLimiter(redis, settings)
    email = str(payload.email).lower()
    await limiter.check_otp_request(email, client_ip(request))
    challenge, dev_code = await request_otp(
        db, settings, OtpEmailSender(settings), email, client_ip(request)
    )
    return OtpRequestResponse(
        challenge_expires_at=challenge.expires_at,
        resend_after_seconds=settings.otp_resend_seconds,
        dev_code=dev_code,
    )


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_code(
    payload: OtpVerifyRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    limiter = AuthRateLimiter(request.app.state.redis, settings)
    email = str(payload.email).lower()
    await limiter.check_otp_verify(email, client_ip(request))
    issued = await verify_otp(
        db,
        settings,
        email,
        payload.code,
        payload.client_type,
        payload.device_name,
        client_ip(request),
        request.headers.get("user-agent"),
    )
    if payload.client_type == "web":
        set_refresh_cookie(response, settings, issued.refresh_token)
    return token_response(settings, issued, payload.client_type)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_session(
    payload: RefreshRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    if payload.client_type == "web":
        require_allowed_origin(request, settings)
    raw_token = payload.refresh_token or request.cookies.get(REFRESH_COOKIE)
    if not raw_token:
        raise ApiError(401, "refresh_required", "A refresh token is required.")
    issued = await rotate_refresh_token(db, settings, raw_token)
    if payload.client_type == "web":
        set_refresh_cookie(response, settings, issued.refresh_token)
    return token_response(settings, issued, payload.client_type)


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    identity: CurrentIdentity = Depends(get_current_identity),
    db: AsyncSession = Depends(get_db),
) -> None:
    await revoke_session(db, identity.session_id)
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")
