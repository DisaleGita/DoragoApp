import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import local_to_utc, utc_now
from app.plans.models import PlanItem
from app.plans.schemas import NextUpResponse, PlanCreate, PlanResponse, PlanUpdate
from app.plans.service import (
    add_version,
    owned_plan,
    record_user_overrides,
    validate_merged,
)
from app.reminders.service import delete_plan_reminders, reschedule_plan_reminders
from app.trips.models import Trip
from app.trips.router import owned_trip
from app.trips.service import build_trip_response
from app.users.models import User

trip_router = APIRouter(prefix="/trips", tags=["plans"])
router = APIRouter(prefix="/plans", tags=["plans"])


def apply_plan_values(plan: PlanItem, payload: PlanCreate) -> None:
    data = payload.model_dump()
    for field, value in data.items():
        setattr(plan, field, value)
    plan.start_utc = local_to_utc(payload.start_local, payload.start_timezone)
    if payload.end_local is not None:
        plan.end_timezone = payload.end_timezone or payload.start_timezone
        plan.end_utc = local_to_utc(payload.end_local, plan.end_timezone)


@trip_router.get("/{trip_id}/plans", response_model=list[PlanResponse])
async def list_plans(
    trip_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PlanItem]:
    await owned_trip(db, user.id, trip_id)
    return list(
        (
            await db.scalars(
                select(PlanItem)
                .where(PlanItem.trip_id == trip_id, PlanItem.deleted_at.is_(None))
                .order_by(PlanItem.start_utc, PlanItem.created_at)
            )
        ).all()
    )


@trip_router.post("/{trip_id}/plans", response_model=PlanResponse, status_code=201)
async def create_plan(
    trip_id: uuid.UUID,
    payload: PlanCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlanItem:
    await owned_trip(db, user.id, trip_id)
    plan = PlanItem(trip_id=trip_id, source_type="manual", version=1)
    apply_plan_values(plan, payload)
    db.add(plan)
    await db.flush()
    add_version(db, plan, "manual")
    await db.commit()
    await db.refresh(plan)
    return plan


@router.get("/next-up", response_model=NextUpResponse | None)
async def next_up(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NextUpResponse | None:
    plan = await db.scalar(
        select(PlanItem)
        .join(Trip, Trip.id == PlanItem.trip_id)
        .where(
            Trip.owner_user_id == user.id,
            Trip.deleted_at.is_(None),
            Trip.is_archived.is_(False),
            PlanItem.deleted_at.is_(None),
            PlanItem.status != "cancelled",
            PlanItem.start_utc >= utc_now(),
        )
        .order_by(PlanItem.start_utc, PlanItem.created_at)
        .limit(1)
    )
    if plan is None:
        return None
    trip = await owned_trip(db, user.id, plan.trip_id)
    return NextUpResponse(
        plan=PlanResponse.model_validate(plan),
        trip=await build_trip_response(db, trip),
    )


@router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlanItem:
    return await owned_plan(db, user.id, plan_id)


@router.patch("/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: uuid.UUID,
    payload: PlanUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlanItem:
    plan = await owned_plan(db, user.id, plan_id)
    if plan.version != payload.base_version:
        raise ApiError(
            409,
            "version_conflict",
            "Plan changed on another device.",
            {"current_version": plan.version},
        )
    updates = payload.model_dump(exclude_unset=True)
    updates.pop("base_version", None)
    validated = validate_merged(plan, updates)
    normalized = validated.model_dump()
    changed = {field: normalized[field] for field in updates}
    for field, value in changed.items():
        setattr(plan, field, value)
    plan.start_utc = local_to_utc(plan.start_local, plan.start_timezone)
    if plan.end_local is not None:
        plan.end_timezone = plan.end_timezone or plan.start_timezone
        plan.end_utc = local_to_utc(plan.end_local, plan.end_timezone)
    else:
        plan.end_timezone = None
        plan.end_utc = None
    plan.version += 1
    record_user_overrides(db, plan, changed)
    await db.flush()
    await reschedule_plan_reminders(db, plan)
    add_version(db, plan, "user_override")
    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(
    plan_id: uuid.UUID,
    base_version: int = Query(ge=1),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    plan = await owned_plan(db, user.id, plan_id)
    if plan.version != base_version:
        raise ApiError(409, "version_conflict", "Plan changed on another device.")
    plan.deleted_at = utc_now()
    plan.version += 1
    await delete_plan_reminders(db, plan.id)
    await db.flush()
    add_version(db, plan, "user_override")
    await db.commit()


@router.post("/{plan_id}/duplicate", response_model=PlanResponse, status_code=201)
async def duplicate_plan(
    plan_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlanItem:
    source = await owned_plan(db, user.id, plan_id)
    copy = PlanItem(
        trip_id=source.trip_id,
        plan_type=source.plan_type,
        title=f"{source.title} (Copy)",
        start_local=source.start_local,
        start_timezone=source.start_timezone,
        start_utc=source.start_utc,
        end_local=source.end_local,
        end_timezone=source.end_timezone,
        end_utc=source.end_utc,
        is_all_day=source.is_all_day,
        provider_name=source.provider_name,
        confirmation_number=None,
        location_name=source.location_name,
        address=source.address,
        latitude=source.latitude,
        longitude=source.longitude,
        cost_amount=source.cost_amount,
        cost_currency=source.cost_currency,
        notes=source.notes,
        website_url=source.website_url,
        contact_phone=source.contact_phone,
        contact_email=source.contact_email,
        status=source.status,
        source_type="manual",
        assigned_traveler_names=list(source.assigned_traveler_names),
        details=dict(source.details),
        version=1,
    )
    db.add(copy)
    await db.flush()
    add_version(db, copy, "manual")
    await db.commit()
    await db.refresh(copy)
    return copy
