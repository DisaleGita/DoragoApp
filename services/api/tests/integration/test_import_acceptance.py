from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.core.security import utc_now
from app.imports.models import ImportSource, ParserRun
from app.imports.router import accept_import
from app.imports.schemas import (
    ExtractedField,
    ExtractedFields,
    ImportAcceptRequest,
    ImportOverrides,
    ImportReviewResponse,
    ProposalAcceptance,
    ReviewProposal,
)
from app.plans.models import PlanFieldSource, PlanItem
from app.plans.schemas import PlanType
from app.trips.models import Trip
from app.users.models import User

pytestmark = pytest.mark.integration


async def test_reviewed_import_is_transactional_and_explicit_null_override_wins(db) -> None:
    user = User(email="import@example.com", email_verified_at=utc_now(), timezone="UTC")
    db.add(user)
    await db.flush()
    trip = Trip(
        owner_user_id=user.id,
        title="Imported trip",
        primary_destination="London",
        start_date=date(2027, 6, 1),
        end_date=date(2027, 6, 3),
        timezone="Europe/London",
    )
    source = ImportSource(
        user_id=user.id,
        source_channel="text_paste",
        raw_text="A real source would be retained here.",
        status="parsed",
    )
    db.add_all([trip, source])
    await db.flush()
    proposal_id = uuid4()
    review = ImportReviewResponse(
        import_id=source.id,
        parser_model="gemini-test-stub",
        proposed_trip_title=None,
        proposed_destination=None,
        proposed_start_date=None,
        proposed_end_date=None,
        overall_confidence=0.8,
        warnings=[],
        plans=[
            ReviewProposal(
                proposal_id=proposal_id,
                plan_type=PlanType.FLIGHT,
                title="Flight to London",
                overall_confidence=0.8,
                warnings=[],
                fields=ExtractedFields(
                    departure_date=ExtractedField(value=date(2027, 6, 1), confidence=0.9),
                    departure_time=ExtractedField(value="09:30:00", confidence=0.9),
                    start_timezone=ExtractedField(value="America/Chicago", confidence=0.7),
                    confirmation_number=ExtractedField(value="AI-VALUE", confidence=0.8),
                    flight_number=ExtractedField(value="DG100", confidence=0.8),
                ),
            )
        ],
    )
    db.add(
        ParserRun(
            import_source_id=source.id,
            parser_model="gemini-test-stub",
            overall_confidence=Decimal("0.8"),
            extracted_result=review.model_dump(mode="json"),
            warnings=[],
            status="success",
        )
    )
    await db.commit()

    accepted = await accept_import(
        source.id,
        ImportAcceptRequest(
            target_trip_id=trip.id,
            proposals=[
                ProposalAcceptance(
                    proposal_id=proposal_id,
                    overrides=ImportOverrides(confirmation_number=None),
                )
            ],
        ),
        user,
        db,
    )

    plan = await db.get(PlanItem, accepted.created_plan_ids[0])
    assert plan is not None
    assert plan.confirmation_number is None
    assert plan.details["flight_number"] == "DG100"
    override = await db.scalar(
        select(PlanFieldSource).where(
            PlanFieldSource.plan_id == plan.id,
            PlanFieldSource.field_name == "confirmation_number",
            PlanFieldSource.user_override.is_(True),
        )
    )
    assert override is not None
    assert override.field_value is None
