import uuid
from typing import Any

from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.security import utc_now
from app.plans.models import PlanFieldSource, PlanItem, PlanVersion
from app.plans.schemas import PlanFields
from app.trips.models import Trip


async def owned_plan(db: AsyncSession, user_id: uuid.UUID, plan_id: uuid.UUID) -> PlanItem:
    plan = await db.scalar(
        select(PlanItem)
        .join(Trip, Trip.id == PlanItem.trip_id)
        .where(
            PlanItem.id == plan_id,
            PlanItem.deleted_at.is_(None),
            Trip.owner_user_id == user_id,
            Trip.deleted_at.is_(None),
        )
    )
    if plan is None:
        raise ApiError(404, "plan_not_found", "Plan not found.")
    return plan


def snapshot(plan: PlanItem) -> dict[str, Any]:
    fields = (
        "id",
        "trip_id",
        "plan_type",
        "title",
        "start_local",
        "start_timezone",
        "start_utc",
        "end_local",
        "end_timezone",
        "end_utc",
        "is_all_day",
        "provider_name",
        "confirmation_number",
        "location_name",
        "address",
        "latitude",
        "longitude",
        "cost_amount",
        "cost_currency",
        "notes",
        "website_url",
        "contact_phone",
        "contact_email",
        "status",
        "source_type",
        "source_id",
        "ai_confidence",
        "assigned_traveler_names",
        "details",
        "version",
        "deleted_at",
    )
    return dict(jsonable_encoder({field: getattr(plan, field) for field in fields}))


def add_version(db: AsyncSession, plan: PlanItem, change_source: str) -> None:
    db.add(
        PlanVersion(
            plan_id=plan.id,
            version=plan.version,
            change_source=change_source,
            snapshot=snapshot(plan),
            created_at=utc_now(),
        )
    )


def validate_merged(plan: PlanItem, updates: dict[str, Any]) -> PlanFields:
    values = {
        "plan_type": updates.get("plan_type", plan.plan_type),
        "title": updates.get("title", plan.title),
        "start_local": updates.get("start_local", plan.start_local),
        "start_timezone": updates.get("start_timezone", plan.start_timezone),
        "end_local": updates.get("end_local", plan.end_local),
        "end_timezone": updates.get("end_timezone", plan.end_timezone),
        "is_all_day": updates.get("is_all_day", plan.is_all_day),
        "provider_name": updates.get("provider_name", plan.provider_name),
        "confirmation_number": updates.get("confirmation_number", plan.confirmation_number),
        "location_name": updates.get("location_name", plan.location_name),
        "address": updates.get("address", plan.address),
        "latitude": updates.get("latitude", plan.latitude),
        "longitude": updates.get("longitude", plan.longitude),
        "cost_amount": updates.get("cost_amount", plan.cost_amount),
        "cost_currency": updates.get("cost_currency", plan.cost_currency),
        "notes": updates.get("notes", plan.notes),
        "website_url": updates.get("website_url", plan.website_url),
        "contact_phone": updates.get("contact_phone", plan.contact_phone),
        "contact_email": updates.get("contact_email", plan.contact_email),
        "status": updates.get("status", plan.status),
        "assigned_traveler_names": updates.get(
            "assigned_traveler_names", plan.assigned_traveler_names
        ),
        "details": updates.get("details", plan.details),
    }
    return PlanFields.model_validate(values)


def record_user_overrides(db: AsyncSession, plan: PlanItem, updates: dict[str, Any]) -> None:
    for field, value in updates.items():
        db.add(
            PlanFieldSource(
                plan_id=plan.id,
                field_name=field,
                field_value=jsonable_encoder(value),
                source_type="user_override",
                user_override=True,
                created_at=utc_now(),
            )
        )
