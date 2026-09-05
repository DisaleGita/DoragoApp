from datetime import UTC, date, datetime, timedelta

import pytest

from app.core.errors import ApiError
from app.core.security import utc_now
from app.documents.models import TravelDocument
from app.documents.router import owned_document
from app.plans.models import PlanItem
from app.plans.router import next_up
from app.plans.service import owned_plan
from app.trips.models import Trip
from app.trips.router import owned_trip
from app.users.models import User

pytestmark = pytest.mark.integration


async def test_trip_and_plan_are_owner_scoped(db) -> None:
    owner = User(
        email="owner@example.com",
        email_verified_at=utc_now(),
        display_name="Owner",
        timezone="UTC",
    )
    attacker = User(
        email="attacker@example.com",
        email_verified_at=utc_now(),
        display_name="Attacker",
        timezone="UTC",
    )
    db.add_all([owner, attacker])
    await db.flush()
    trip = Trip(
        owner_user_id=owner.id,
        title="Private trip",
        primary_destination="Chicago",
        start_date=date(2026, 9, 4),
        end_date=date(2026, 9, 6),
        timezone="UTC",
    )
    db.add(trip)
    await db.flush()
    plan = PlanItem(
        trip_id=trip.id,
        plan_type="meeting",
        title="Private meeting",
        start_local=datetime(2026, 9, 4, 9),
        start_timezone="UTC",
        start_utc=datetime(2026, 9, 4, 9, tzinfo=UTC),
    )
    db.add(plan)
    await db.flush()
    document = TravelDocument(
        user_id=owner.id,
        trip_id=trip.id,
        plan_id=plan.id,
        file_name="ticket.pdf",
        extension="pdf",
        file_size_bytes=10,
        mime_type="application/pdf",
        storage_key=f"documents/{owner.id}/ticket.pdf",
        document_category="ticket",
    )
    db.add(document)
    await db.commit()

    assert (await owned_trip(db, owner.id, trip.id)).id == trip.id
    assert (await owned_plan(db, owner.id, plan.id)).id == plan.id
    assert (await owned_document(db, owner.id, document.id)).id == document.id
    with pytest.raises(ApiError):
        await owned_trip(db, attacker.id, trip.id)
    with pytest.raises(ApiError):
        await owned_plan(db, attacker.id, plan.id)
    with pytest.raises(ApiError):
        await owned_document(db, attacker.id, document.id)


async def test_next_up_returns_only_the_owners_earliest_future_plan(db) -> None:
    now = utc_now()
    owner = User(email="next@example.com", email_verified_at=now, timezone="UTC")
    other = User(email="other@example.com", email_verified_at=now, timezone="UTC")
    db.add_all([owner, other])
    await db.flush()
    owner_trip = Trip(
        owner_user_id=owner.id,
        title="Owner trip",
        primary_destination="Tokyo",
        start_date=now.date(),
        end_date=now.date() + timedelta(days=3),
        timezone="UTC",
    )
    other_trip = Trip(
        owner_user_id=other.id,
        title="Other trip",
        primary_destination="Paris",
        start_date=now.date(),
        end_date=now.date() + timedelta(days=3),
        timezone="UTC",
    )
    db.add_all([owner_trip, other_trip])
    await db.flush()

    for trip, title, offset in (
        (owner_trip, "Later", timedelta(hours=4)),
        (owner_trip, "Sooner", timedelta(hours=2)),
        (other_trip, "Another user's plan", timedelta(minutes=10)),
    ):
        start = now + offset
        db.add(
            PlanItem(
                trip_id=trip.id,
                plan_type="meeting",
                title=title,
                start_local=start.replace(tzinfo=None),
                start_timezone="UTC",
                start_utc=start,
            )
        )
    await db.commit()

    result = await next_up(user=owner, db=db)

    assert result is not None
    assert result.plan.title == "Sooner"
    assert result.trip.id == owner_trip.id
