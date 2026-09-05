from datetime import datetime

import pytest
from pydantic import ValidationError

from app.imports.schemas import ExtractedFields, GeminiParserResult
from app.plans.details import DETAIL_MODELS
from app.plans.schemas import PlanFields, PlanType


def test_all_required_plan_types_exist() -> None:
    assert {item.value for item in PlanType} == {
        "flight",
        "lodging",
        "car_rental",
        "rail",
        "bus",
        "ferry",
        "cruise",
        "shuttle",
        "rideshare",
        "parking",
        "dining",
        "meeting",
        "event",
        "activity",
        "tour",
        "attraction",
        "ticket",
        "insurance",
        "visa_appointment",
        "custom_note",
        "generic_reservation",
    }
    assert set(DETAIL_MODELS) == {item.value for item in PlanType}


def test_end_timezone_defaults_to_start_timezone() -> None:
    fields = PlanFields(
        plan_type=PlanType.LODGING,
        title="Hotel",
        start_local=datetime(2026, 5, 1, 15),
        start_timezone="Europe/Paris",
        end_local=datetime(2026, 5, 3, 11),
    )
    assert fields.end_timezone == "Europe/Paris"


def test_aware_datetime_is_not_accepted_as_local() -> None:
    with pytest.raises(ValidationError):
        PlanFields(
            plan_type=PlanType.MEETING,
            title="Meeting",
            start_local="2026-01-01T12:00:00Z",
            start_timezone="UTC",
        )


def test_ai_schema_preserves_unknown_values_as_null() -> None:
    parsed = GeminiParserResult(
        proposed_trip_title=None,
        proposed_destination=None,
        proposed_start_date=None,
        proposed_end_date=None,
        overall_confidence=0,
        warnings=["No travel record found"],
        plans=[],
    )
    assert parsed.overall_confidence == 0
    assert parsed.proposed_start_date is None
    assert parsed.plans == []


def test_ai_fields_forbid_unreviewed_shape_changes() -> None:
    with pytest.raises(ValidationError):
        ExtractedFields.model_validate({"invented_booking_field": {"value": "x", "confidence": 1}})


def test_plan_details_are_validated_for_the_selected_category() -> None:
    flight = PlanFields(
        plan_type=PlanType.FLIGHT,
        title="Flight",
        start_local=datetime(2026, 5, 1, 15),
        start_timezone="Europe/Paris",
        details={"flight_number": "D-123", "departure_gate": "A4"},
    )
    assert flight.details["flight_number"] == "D-123"

    with pytest.raises(ValidationError):
        PlanFields(
            plan_type=PlanType.FLIGHT,
            title="Flight",
            start_local=datetime(2026, 5, 1, 15),
            start_timezone="Europe/Paris",
            details={"room_type": "Invented category crossover"},
        )
