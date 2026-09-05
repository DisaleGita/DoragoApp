import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.errors import ApiError
from app.plans.service import owned_plan
from app.reminders.models import PlanReminder
from app.reminders.schemas import ReminderCreate, ReminderResponse, ReminderType
from app.reminders.service import OFFSETS
from app.users.models import User

plan_router = APIRouter(prefix="/plans", tags=["reminders"])
router = APIRouter(prefix="/reminders", tags=["reminders"])


@plan_router.get("/{plan_id}/reminders", response_model=list[ReminderResponse])
async def list_reminders(
    plan_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PlanReminder]:
    await owned_plan(db, user.id, plan_id)
    return list(
        (
            await db.scalars(
                select(PlanReminder)
                .where(PlanReminder.plan_id == plan_id, PlanReminder.user_id == user.id)
                .order_by(PlanReminder.trigger_at_utc)
            )
        ).all()
    )


@plan_router.post("/{plan_id}/reminders", response_model=ReminderResponse, status_code=201)
async def create_reminder(
    plan_id: uuid.UUID,
    payload: ReminderCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlanReminder:
    plan = await owned_plan(db, user.id, plan_id)
    trigger = payload.trigger_at_utc
    if payload.reminder_type != ReminderType.CUSTOM:
        trigger = plan.start_utc - OFFSETS[payload.reminder_type.value]
    reminder = PlanReminder(
        plan_id=plan.id,
        user_id=user.id,
        reminder_type=payload.reminder_type.value,
        trigger_at_utc=trigger,
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.get("", response_model=list[ReminderResponse])
async def list_user_reminders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PlanReminder]:
    return list(
        (
            await db.scalars(
                select(PlanReminder)
                .where(PlanReminder.user_id == user.id)
                .order_by(PlanReminder.trigger_at_utc)
            )
        ).all()
    )


@router.delete("/{reminder_id}", status_code=204)
async def delete_reminder(
    reminder_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    reminder = await db.scalar(
        select(PlanReminder).where(PlanReminder.id == reminder_id, PlanReminder.user_id == user.id)
    )
    if reminder is None:
        raise ApiError(404, "reminder_not_found", "Reminder not found.")
    await db.delete(reminder)
    await db.commit()
