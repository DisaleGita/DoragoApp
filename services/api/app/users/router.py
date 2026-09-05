from typing import Any, cast

from fastapi import APIRouter, Depends, Response
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.documents.models import TravelDocument
from app.documents.storage import PrivateObjectStorage
from app.imports.models import ImportSource
from app.plans.models import PlanItem
from app.reminders.models import PlanReminder
from app.trips.models import Trip
from app.users.models import User
from app.users.schemas import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me/export")
async def export_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    trips = list((await db.scalars(select(Trip).where(Trip.owner_user_id == user.id))).all())
    trip_ids = [trip.id for trip in trips]
    plans = (
        list((await db.scalars(select(PlanItem).where(PlanItem.trip_id.in_(trip_ids)))).all())
        if trip_ids
        else []
    )
    documents = list(
        (await db.scalars(select(TravelDocument).where(TravelDocument.user_id == user.id))).all()
    )
    reminders = list(
        (await db.scalars(select(PlanReminder).where(PlanReminder.user_id == user.id))).all()
    )
    return cast(
        dict[str, Any],
        jsonable_encoder(
            {
                "export_version": 1,
                "user": user,
                "trips": trips,
                "plans": plans,
                "documents": documents,
                "reminders": reminders,
            }
        ),
    )


@router.delete("/me", status_code=204)
async def delete_me(
    response: Response,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> None:
    storage = PrivateObjectStorage(settings)
    document_keys = list(
        (
            await db.scalars(
                select(TravelDocument.storage_key).where(TravelDocument.user_id == user.id)
            )
        ).all()
    )
    import_keys = list(
        (
            await db.scalars(
                select(ImportSource.file_storage_key).where(
                    ImportSource.user_id == user.id,
                    ImportSource.file_storage_key.is_not(None),
                )
            )
        ).all()
    )
    for key in [*document_keys, *import_keys]:
        if key:
            await storage.delete(key)
    await db.delete(user)
    await db.commit()
    response.delete_cookie("dorago_refresh", path="/api/v1/auth")
