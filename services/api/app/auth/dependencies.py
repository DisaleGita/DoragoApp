import uuid
from dataclasses import dataclass

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import AuthSession
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import decode_access_token
from app.users.models import User

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentIdentity:
    user: User
    session_id: uuid.UUID


async def get_current_identity(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CurrentIdentity:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise ApiError(401, "authentication_required", "Authentication is required.")
    try:
        payload = decode_access_token(settings, credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
        session_id = uuid.UUID(payload["sid"])
    except (jwt.InvalidTokenError, KeyError, ValueError, TypeError) as exc:
        raise ApiError(401, "access_token_invalid", "The access token is invalid.") from exc

    auth_session = await db.scalar(
        select(AuthSession).where(
            AuthSession.id == session_id,
            AuthSession.user_id == user_id,
            AuthSession.revoked_at.is_(None),
        )
    )
    user = await db.scalar(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    if auth_session is None or user is None:
        raise ApiError(401, "session_revoked", "The session is no longer active.")
    return CurrentIdentity(user=user, session_id=session_id)


async def get_current_user(identity: CurrentIdentity = Depends(get_current_identity)) -> User:
    return identity.user
