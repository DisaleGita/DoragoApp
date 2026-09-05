import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import utc_now
from app.reminders.service import delete_trip_reminders
from app.trips.models import Trip
from app.trips.schemas import TripCreate, TripFields, TripResponse, TripUpdate
from app.trips.service import (
    build_trip_response,
    normalize_archive_update,
    replace_destinations,
    replace_travelers,
)
from app.users.models import User

router = APIRouter(prefix="/trips", tags=["trips"])


async def owned_trip(db: AsyncSession, user_id: uuid.UUID, trip_id: uuid.UUID) -> Trip:
    trip = await db.scalar(
        select(Trip).where(
            Trip.id == trip_id,
            Trip.owner_user_id == user_id,
            Trip.deleted_at.is_(None),
        )
    )
    if trip is None:
        raise ApiError(404, "trip_not_found", "Trip not found.")
    return trip


@router.get("", response_model=list[TripResponse])
async def list_trips(
    include_archived: bool = False,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TripResponse]:
    statement = select(Trip).where(Trip.owner_user_id == user.id, Trip.deleted_at.is_(None))
    if not include_archived:
        statement = statement.where(Trip.is_archived.is_(False))
    statement = statement.order_by(Trip.start_date, Trip.created_at)
    trips = list((await db.scalars(statement)).all())
    return [await build_trip_response(db, trip) for trip in trips]


@router.post("", response_model=TripResponse, status_code=201)
async def create_trip(
    payload: TripCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TripResponse:
    data = payload.model_dump(exclude={"additional_destinations", "travelers"})
    data["is_archived"] = payload.status.value == "archived"
    trip = Trip(owner_user_id=user.id, **data)
    db.add(trip)
    await db.flush()
    await replace_destinations(db, trip.id, payload.additional_destinations)
    await replace_travelers(db, trip, payload.travelers)
    await db.commit()
    await db.refresh(trip)
    return await build_trip_response(db, trip)


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TripResponse:
    return await build_trip_response(db, await owned_trip(db, user.id, trip_id))


@router.patch("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: uuid.UUID,
    payload: TripUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TripResponse:
    trip = await owned_trip(db, user.id, trip_id)
    if trip.version != payload.base_version:
        raise ApiError(
            409,
            "version_conflict",
            "Trip changed on another device.",
            {"current_version": trip.version},
        )
    updates = payload.model_dump(exclude_unset=True)
    updates.pop("base_version", None)
    destinations = updates.pop("additional_destinations", None)
    travelers = updates.pop("travelers", None)
    normalize_archive_update(trip, updates)

    candidate = TripFields.model_validate(
        {
            "title": updates.get("title", trip.title),
            "primary_destination": updates.get("primary_destination", trip.primary_destination),
            "additional_destinations": destinations or [],
            "start_date": updates.get("start_date", trip.start_date),
            "end_date": updates.get("end_date", trip.end_date),
            "timezone": updates.get("timezone", trip.timezone),
            "purpose": updates.get("purpose", trip.purpose),
            "status": updates.get("status", trip.status),
            "cover_image_url": updates.get("cover_image_url", trip.cover_image_url),
            "notes": updates.get("notes", trip.notes),
            "travelers": travelers or [],
        }
    )
    del candidate
    for field, value in updates.items():
        setattr(trip, field, value)
    if destinations is not None:
        await replace_destinations(db, trip.id, destinations)
    if travelers is not None:
        await replace_travelers(db, trip, travelers)
    trip.version += 1
    await db.commit()
    await db.refresh(trip)
    return await build_trip_response(db, trip)


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: uuid.UUID,
    base_version: int = Query(ge=1),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    trip = await owned_trip(db, user.id, trip_id)
    if trip.version != base_version:
        raise ApiError(409, "version_conflict", "Trip changed on another device.")
    trip.deleted_at = utc_now()
    trip.version += 1
    await delete_trip_reminders(db, trip.id)
    await db.commit()
