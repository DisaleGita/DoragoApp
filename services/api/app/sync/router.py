import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.security import local_to_utc, utc_now
from app.plans.models import PlanItem
from app.plans.schemas import PlanResponse, PlanUpdate
from app.plans.service import add_version, owned_plan, record_user_overrides, validate_merged
from app.reminders.service import (
    delete_plan_reminders,
    delete_trip_reminders,
    reschedule_plan_reminders,
)
from app.sync.models import ProcessedMutation
from app.sync.schemas import (
    ChangeRecord,
    ChangesResponse,
    MutationResult,
    SyncBatchRequest,
    SyncBatchResponse,
    SyncOperation,
)
from app.trips.models import Trip
from app.trips.router import owned_trip
from app.trips.schemas import TripFields, TripUpdate
from app.trips.service import build_trip_response, normalize_archive_update
from app.users.models import User

router = APIRouter(prefix="/sync", tags=["sync"])


async def apply_mutation(
    db: AsyncSession,
    user: User,
    operation: SyncOperation,
    entity_id: uuid.UUID,
    base_version: int,
    payload: dict[str, Any],
) -> MutationResult:
    if operation in {SyncOperation.TRIP_UPDATE, SyncOperation.TRIP_DELETE}:
        trip = await owned_trip(db, user.id, entity_id)
        if trip.version != base_version:
            return MutationResult(
                mutation_id=uuid.UUID(int=0),
                status="conflict",
                entity_id=entity_id,
                error_code="version_conflict",
                current_version=trip.version,
            )
        if operation == SyncOperation.TRIP_DELETE:
            trip.deleted_at = utc_now()
            await delete_trip_reminders(db, trip.id)
        else:
            validated = TripUpdate.model_validate({**payload, "base_version": base_version})
            updates = validated.model_dump(exclude_unset=True)
            updates.pop("base_version", None)
            if "additional_destinations" in updates or "travelers" in updates:
                return MutationResult(
                    mutation_id=uuid.UUID(int=0),
                    status="rejected",
                    entity_id=entity_id,
                    error_code="offline_relationship_edit_unsupported",
                )
            normalize_archive_update(trip, updates)
            TripFields.model_validate(
                {
                    "title": updates.get("title", trip.title),
                    "primary_destination": updates.get(
                        "primary_destination", trip.primary_destination
                    ),
                    "additional_destinations": [],
                    "start_date": updates.get("start_date", trip.start_date),
                    "end_date": updates.get("end_date", trip.end_date),
                    "timezone": updates.get("timezone", trip.timezone),
                    "purpose": updates.get("purpose", trip.purpose),
                    "status": updates.get("status", trip.status),
                    "cover_image_url": updates.get("cover_image_url", trip.cover_image_url),
                    "notes": updates.get("notes", trip.notes),
                    "travelers": [],
                }
            )
            for field, value in updates.items():
                setattr(trip, field, value)
        trip.version += 1
        await db.flush()
        return MutationResult(
            mutation_id=uuid.UUID(int=0),
            status="applied",
            entity_id=entity_id,
            version=trip.version,
        )

    plan = await owned_plan(db, user.id, entity_id)
    if plan.version != base_version:
        return MutationResult(
            mutation_id=uuid.UUID(int=0),
            status="conflict",
            entity_id=entity_id,
            error_code="version_conflict",
            current_version=plan.version,
        )
    if operation == SyncOperation.PLAN_DELETE:
        plan.deleted_at = utc_now()
        plan.version += 1
        await delete_plan_reminders(db, plan.id)
        await db.flush()
        add_version(db, plan, "user_override")
    else:
        validated_update = PlanUpdate.model_validate({**payload, "base_version": base_version})
        updates = validated_update.model_dump(exclude_unset=True)
        updates.pop("base_version", None)
        merged = validate_merged(plan, updates).model_dump()
        changed = {field: merged[field] for field in updates}
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
    return MutationResult(
        mutation_id=uuid.UUID(int=0), status="applied", entity_id=entity_id, version=plan.version
    )


@router.post("/mutations", response_model=SyncBatchResponse)
async def sync_mutations(
    payload: SyncBatchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SyncBatchResponse:
    results: list[MutationResult] = []
    for mutation in payload.mutations:
        receipt = await db.scalar(
            select(ProcessedMutation).where(
                ProcessedMutation.user_id == user.id,
                ProcessedMutation.mutation_id == mutation.mutation_id,
            )
        )
        if receipt:
            results.append(MutationResult.model_validate(receipt.result))
            continue
        try:
            async with db.begin_nested():
                result = await apply_mutation(
                    db,
                    user,
                    mutation.operation,
                    mutation.entity_id,
                    mutation.base_version,
                    mutation.payload,
                )
                result.mutation_id = mutation.mutation_id
                db.add(
                    ProcessedMutation(
                        user_id=user.id,
                        mutation_id=mutation.mutation_id,
                        operation=mutation.operation.value,
                        result=result.model_dump(mode="json"),
                    )
                )
            results.append(result)
        except Exception:
            await db.rollback()
            raise
    await db.commit()
    return SyncBatchResponse(results=results)


@router.get("/changes", response_model=ChangesResponse)
async def sync_changes(
    since: datetime = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChangesResponse:
    cutoff = utc_now()
    trips = list(
        (
            await db.scalars(
                select(Trip).where(
                    Trip.owner_user_id == user.id,
                    or_(Trip.updated_at > since, Trip.deleted_at > since),
                )
            )
        ).all()
    )
    plans = list(
        (
            await db.scalars(
                select(PlanItem)
                .join(Trip, Trip.id == PlanItem.trip_id)
                .where(
                    Trip.owner_user_id == user.id,
                    or_(PlanItem.updated_at > since, PlanItem.deleted_at > since),
                )
            )
        ).all()
    )
    changes: list[ChangeRecord] = []
    for trip in trips:
        response: dict[str, Any] | None = None
        if trip.deleted_at is None:
            response = (await build_trip_response(db, trip)).model_dump(mode="json")
        changes.append(
            ChangeRecord(
                entity_type="trip",
                entity_id=trip.id,
                version=trip.version,
                deleted_at=trip.deleted_at,
                payload=response,
            )
        )
    for plan in plans:
        changes.append(
            ChangeRecord(
                entity_type="plan",
                entity_id=plan.id,
                version=plan.version,
                deleted_at=plan.deleted_at,
                payload=(
                    PlanResponse.model_validate(plan).model_dump(mode="json")
                    if plan.deleted_at is None
                    else None
                ),
            )
        )
    return ChangesResponse(changes=changes, next_cursor=cutoff)
