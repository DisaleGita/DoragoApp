import uuid
from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.plans.models import PlanItem
from app.reminders.models import PlanReminder
from app.reminders.schemas import ReminderType

OFFSETS = {
    ReminderType.AT_START.value: timedelta(0),
    ReminderType.THIRTY_MINUTES_BEFORE.value: timedelta(minutes=30),
    ReminderType.ONE_HOUR_BEFORE.value: timedelta(hours=1),
    ReminderType.TWO_HOURS_BEFORE.value: timedelta(hours=2),
    ReminderType.ONE_DAY_BEFORE.value: timedelta(days=1),
}


async def reschedule_plan_reminders(db: AsyncSession, plan: PlanItem) -> None:
    reminders = (
        await db.scalars(select(PlanReminder).where(PlanReminder.plan_id == plan.id))
    ).all()
    for reminder in reminders:
        offset = OFFSETS.get(reminder.reminder_type)
        if offset is not None:
            reminder.trigger_at_utc = plan.start_utc - offset
            reminder.is_sent = False


async def delete_plan_reminders(db: AsyncSession, plan_id: uuid.UUID) -> None:
    await db.execute(delete(PlanReminder).where(PlanReminder.plan_id == plan_id))


async def delete_trip_reminders(db: AsyncSession, trip_id: uuid.UUID) -> None:
    plan_ids = select(PlanItem.id).where(PlanItem.trip_id == trip_id)
    await db.execute(delete(PlanReminder).where(PlanReminder.plan_id.in_(plan_ids)))
