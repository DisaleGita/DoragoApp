import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.plans.models import PlanItem
from app.trips.models import TravelerProfile, Trip, TripDestination, TripTraveler
from app.trips.schemas import TravelerInput, TripResponse, TripStatus


def normalize_archive_update(trip: Trip, updates: dict[str, object]) -> None:
    status = updates.get("status")
    archived = updates.get("is_archived")
    if status is not None:
        should_archive = status == TripStatus.ARCHIVED
        if archived is not None and archived != should_archive:
            raise ApiError(
                422,
                "archive_status_mismatch",
                "Archived state and trip status must agree.",
            )
        updates["is_archived"] = should_archive
    elif archived is True:
        updates["status"] = TripStatus.ARCHIVED
    elif archived is False and trip.status == TripStatus.ARCHIVED:
        updates["status"] = TripStatus.UPCOMING


async def replace_destinations(db: AsyncSession, trip_id: uuid.UUID, names: list[str]) -> None:
    existing = list(
        (await db.scalars(select(TripDestination).where(TripDestination.trip_id == trip_id))).all()
    )
    for item in existing:
        await db.delete(item)
    for index, name in enumerate(names):
        cleaned = name.strip()
        if cleaned:
            db.add(TripDestination(trip_id=trip_id, destination_name=cleaned, order_index=index))


async def replace_travelers(
    db: AsyncSession,
    trip: Trip,
    travelers: list[TravelerInput],
) -> None:
    links = list(
        (await db.scalars(select(TripTraveler).where(TripTraveler.trip_id == trip.id))).all()
    )
    for link in links:
        profile = await db.get(TravelerProfile, link.traveler_id)
        await db.delete(link)
        if profile and not profile.is_primary_user:
            await db.delete(profile)

    for index, value in enumerate(travelers):
        profile = TravelerProfile(
            user_id=trip.owner_user_id,
            full_name=value.full_name.strip(),
            email=value.email,
            phone=value.phone,
            is_primary_user=index == 0,
        )
        db.add(profile)
        await db.flush()
        db.add(
            TripTraveler(
                trip_id=trip.id,
                traveler_id=profile.id,
                role="organizer" if index == 0 else "traveler",
            )
        )


async def build_trip_response(db: AsyncSession, trip: Trip) -> TripResponse:
    destinations = list(
        (
            await db.scalars(
                select(TripDestination)
                .where(TripDestination.trip_id == trip.id)
                .order_by(TripDestination.order_index)
            )
        ).all()
    )
    traveler_rows = (
        (
            await db.execute(
                select(TravelerProfile)
                .join(TripTraveler, TripTraveler.traveler_id == TravelerProfile.id)
                .where(
                    TripTraveler.trip_id == trip.id,
                    TravelerProfile.deleted_at.is_(None),
                )
                .order_by(TravelerProfile.is_primary_user.desc(), TravelerProfile.created_at)
            )
        )
        .scalars()
        .all()
    )
    plan_count = await db.scalar(
        select(func.count(PlanItem.id)).where(
            PlanItem.trip_id == trip.id, PlanItem.deleted_at.is_(None)
        )
    )
    totals_rows = (
        await db.execute(
            select(PlanItem.cost_currency, func.sum(PlanItem.cost_amount))
            .where(
                PlanItem.trip_id == trip.id,
                PlanItem.deleted_at.is_(None),
                PlanItem.cost_currency.is_not(None),
                PlanItem.cost_amount.is_not(None),
            )
            .group_by(PlanItem.cost_currency)
        )
    ).all()
    totals = {
        currency: float(amount if isinstance(amount, Decimal) else Decimal(str(amount)))
        for currency, amount in totals_rows
        if currency and amount is not None
    }
    return TripResponse(
        id=trip.id,
        title=trip.title,
        primary_destination=trip.primary_destination,
        additional_destinations=[item.destination_name for item in destinations],
        start_date=trip.start_date,
        end_date=trip.end_date,
        timezone=trip.timezone,
        purpose=trip.purpose,
        status=trip.status,
        cover_image_url=trip.cover_image_url,
        notes=trip.notes,
        is_archived=trip.is_archived,
        traveler_count=len(traveler_rows),
        travelers=[
            TravelerInput(full_name=row.full_name, email=row.email, phone=row.phone)
            for row in traveler_rows
        ],
        plan_count=int(plan_count or 0),
        total_cost_grouped=totals,
        version=trip.version,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
    )
