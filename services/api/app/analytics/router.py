from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.models import AnalyticsEvent
from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.users.models import User, UserSettings

router = APIRouter(prefix="/analytics", tags=["analytics"])
SENSITIVE_KEYS = {
    "address",
    "confirmation_number",
    "email",
    "record_locator",
    "ticket_number",
}


class EventInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_name: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9_]+$")
    properties: dict[str, Any] = Field(default_factory=dict)


@router.post("/events", status_code=202)
async def record_event(
    payload: EventInput,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    settings = await db.get(UserSettings, user.id)
    if settings is None or not settings.analytics_consent:
        return {"accepted": False}
    safe_properties = {
        key: value for key, value in payload.properties.items() if key.lower() not in SENSITIVE_KEYS
    }
    db.add(
        AnalyticsEvent(
            user_id=user.id,
            event_name=payload.event_name,
            properties=safe_properties,
        )
    )
    await db.commit()
    return {"accepted": True}
