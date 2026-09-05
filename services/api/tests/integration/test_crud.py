from datetime import date, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.errors import ApiError
from app.core.security import utc_now
from app.plans.models import PlanFieldSource
from app.plans.router import (
    create_plan,
    delete_plan,
    duplicate_plan,
    list_plans,
    update_plan,
)
from app.plans.schemas import PlanCreate, PlanType, PlanUpdate
from app.reminders.router import create_reminder, list_reminders
from app.reminders.schemas import ReminderCreate, ReminderType
from app.trips.router import create_trip, delete_trip, get_trip, update_trip
from app.trips.schemas import TripCreate, TripUpdate
from app.users.models import User

pytestmark = pytest.mark.integration


async def create_user(db, email: str = "crud@example.com") -> User:
    user = User(email=email, email_verified_at=utc_now(), timezone="UTC")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def test_trip_crud_versions_and_soft_delete(db) -> None:
    user = await create_user(db)
    trip = await create_trip(
        TripCreate(
            title="Japan",
            primary_destination="Tokyo",
            start_date=date(2027, 3, 10),
            end_date=date(2027, 3, 15),
            timezone="Asia/Tokyo",
        ),
        user,
        db,
    )
    assert trip.version == 1
    assert trip.plan_count == 0

    updated = await update_trip(
        trip.id,
        TripUpdate(base_version=trip.version, title="Japan spring trip"),
        user,
        db,
    )
    assert updated.title == "Japan spring trip"
    assert updated.version == 2

    archived = await update_trip(
        trip.id,
        TripUpdate(base_version=updated.version, is_archived=True),
        user,
        db,
    )
    assert archived.is_archived
    assert archived.status == "archived"

    with pytest.raises(ApiError, match="changed on another device"):
        await update_trip(
            trip.id,
            TripUpdate(base_version=2, title="Stale update"),
            user,
            db,
        )

    await delete_trip(trip.id, base_version=3, user=user, db=db)
    with pytest.raises(ApiError, match="Trip not found"):
        await get_trip(trip.id, user=user, db=db)


async def test_plan_crud_order_duplicate_and_reminder_lifecycle(db) -> None:
    user = await create_user(db, "plans@example.com")
    trip = await create_trip(
        TripCreate(
            title="Work trip",
            primary_destination="London",
            start_date=date(2027, 4, 1),
            end_date=date(2027, 4, 4),
            timezone="Europe/London",
        ),
        user,
        db,
    )
    later = await create_plan(
        trip.id,
        PlanCreate(
            plan_type=PlanType.MEETING,
            title="Dinner",
            start_local=datetime(2027, 4, 1, 19),
            start_timezone="Europe/London",
            confirmation_number="PRIVATE-123",
        ),
        user,
        db,
    )
    earlier = await create_plan(
        trip.id,
        PlanCreate(
            plan_type=PlanType.RAIL,
            title="Train",
            start_local=datetime(2027, 4, 1, 9),
            start_timezone="Europe/London",
        ),
        user,
        db,
    )
    assert [plan.id for plan in await list_plans(trip.id, user, db)] == [
        earlier.id,
        later.id,
    ]

    reminder = await create_reminder(
        earlier.id,
        ReminderCreate(reminder_type=ReminderType.ONE_HOUR_BEFORE),
        user,
        db,
    )
    original_trigger = reminder.trigger_at_utc
    moved = await update_plan(
        earlier.id,
        PlanUpdate(
            base_version=earlier.version,
            start_local=datetime(2027, 4, 1, 10, 30),
        ),
        user,
        db,
    )
    reminders = await list_reminders(earlier.id, user, db)
    assert reminders[0].trigger_at_utc == original_trigger + timedelta(hours=1, minutes=30)
    override = await db.scalar(
        select(PlanFieldSource).where(
            PlanFieldSource.plan_id == earlier.id,
            PlanFieldSource.field_name == "start_local",
            PlanFieldSource.user_override.is_(True),
        )
    )
    assert override is not None
    assert override.field_value == "2027-04-01T10:30:00"

    copy = await duplicate_plan(later.id, user, db)
    assert copy.confirmation_number is None
    assert copy.title == "Dinner (Copy)"

    await delete_plan(earlier.id, base_version=moved.version, user=user, db=db)
    with pytest.raises(ApiError, match="Plan not found"):
        await list_reminders(earlier.id, user, db)
