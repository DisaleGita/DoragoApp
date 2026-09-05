from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PlanDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FlightDetails(PlanDetails):
    airline: str | None = Field(default=None, max_length=300)
    flight_number: str | None = Field(default=None, max_length=30)
    departure_airport: str | None = Field(default=None, max_length=100)
    arrival_airport: str | None = Field(default=None, max_length=100)
    departure_terminal: str | None = Field(default=None, max_length=100)
    departure_gate: str | None = Field(default=None, max_length=50)
    arrival_terminal: str | None = Field(default=None, max_length=100)
    arrival_gate: str | None = Field(default=None, max_length=50)
    record_locator: str | None = Field(default=None, max_length=100)
    ticket_number: str | None = Field(default=None, max_length=100)
    seat: str | None = Field(default=None, max_length=50)
    cabin_class: str | None = Field(default=None, max_length=100)
    aircraft: str | None = Field(default=None, max_length=100)
    boarding_group: str | None = Field(default=None, max_length=50)
    baggage_claim: str | None = Field(default=None, max_length=100)


class LodgingDetails(PlanDetails):
    property_name: str | None = Field(default=None, max_length=500)
    room_type: str | None = Field(default=None, max_length=200)
    guest_names: list[str] | None = Field(default=None, max_length=50)
    cancellation_policy: str | None = Field(default=None, max_length=5000)
    deposit_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)


class CarRentalDetails(PlanDetails):
    rental_company: str | None = Field(default=None, max_length=300)
    pickup_location: str | None = Field(default=None, max_length=500)
    dropoff_location: str | None = Field(default=None, max_length=500)
    car_class: str | None = Field(default=None, max_length=100)
    membership_number: str | None = Field(default=None, max_length=100)
    insurance_policy: str | None = Field(default=None, max_length=200)
    fuel_policy: str | None = Field(default=None, max_length=500)
    driver_name: str | None = Field(default=None, max_length=200)


class TransitDetails(PlanDetails):
    carrier: str | None = Field(default=None, max_length=300)
    departure_station: str | None = Field(default=None, max_length=500)
    arrival_station: str | None = Field(default=None, max_length=500)
    pickup_location: str | None = Field(default=None, max_length=500)
    dropoff_location: str | None = Field(default=None, max_length=500)
    route_number: str | None = Field(default=None, max_length=100)
    platform: str | None = Field(default=None, max_length=100)
    train_number: str | None = Field(default=None, max_length=100)
    seat_number: str | None = Field(default=None, max_length=100)
    coach_number: str | None = Field(default=None, max_length=100)
    ticket_number: str | None = Field(default=None, max_length=100)
    stops: list[str] | None = Field(default=None, max_length=100)


class ParkingDetails(PlanDetails):
    facility_name: str | None = Field(default=None, max_length=500)
    space_number: str | None = Field(default=None, max_length=100)
    vehicle_description: str | None = Field(default=None, max_length=300)


class DiningDetails(PlanDetails):
    venue_name: str | None = Field(default=None, max_length=500)
    party_size: int | None = Field(default=None, ge=1, le=1000)
    booking_reference: str | None = Field(default=None, max_length=200)
    dress_code: str | None = Field(default=None, max_length=300)
    cancellation_policy: str | None = Field(default=None, max_length=5000)
    seating_area: str | None = Field(default=None, max_length=300)


class EventDetails(PlanDetails):
    venue_name: str | None = Field(default=None, max_length=500)
    ticket_count: int | None = Field(default=None, ge=1, le=1000)
    booking_reference: str | None = Field(default=None, max_length=200)
    organizer: str | None = Field(default=None, max_length=300)
    dress_code: str | None = Field(default=None, max_length=300)
    meeting_point: str | None = Field(default=None, max_length=500)
    ticket_type: str | None = Field(default=None, max_length=200)
    party_size: int | None = Field(default=None, ge=1, le=1000)


class InsuranceDetails(PlanDetails):
    insurer: str | None = Field(default=None, max_length=300)
    policy_number: str | None = Field(default=None, max_length=200)
    coverage_summary: str | None = Field(default=None, max_length=5000)
    emergency_phone: str | None = Field(default=None, max_length=50)


class VisaAppointmentDetails(PlanDetails):
    consulate_name: str | None = Field(default=None, max_length=500)
    applicant_names: list[str] | None = Field(default=None, max_length=50)
    appointment_reference: str | None = Field(default=None, max_length=200)
    visa_type: str | None = Field(default=None, max_length=200)


class GenericReservationDetails(PlanDetails):
    reservation_kind: str | None = Field(default=None, max_length=200)
    party_size: int | None = Field(default=None, ge=1, le=1000)
    booking_reference: str | None = Field(default=None, max_length=200)


DETAIL_MODELS: dict[str, type[PlanDetails]] = {
    "flight": FlightDetails,
    "lodging": LodgingDetails,
    "car_rental": CarRentalDetails,
    "rail": TransitDetails,
    "bus": TransitDetails,
    "ferry": TransitDetails,
    "cruise": TransitDetails,
    "shuttle": TransitDetails,
    "rideshare": TransitDetails,
    "parking": ParkingDetails,
    "dining": DiningDetails,
    "meeting": EventDetails,
    "event": EventDetails,
    "activity": EventDetails,
    "tour": EventDetails,
    "attraction": EventDetails,
    "ticket": EventDetails,
    "insurance": InsuranceDetails,
    "visa_appointment": VisaAppointmentDetails,
    "custom_note": PlanDetails,
    "generic_reservation": GenericReservationDetails,
}


def details_model(plan_type: object) -> type[PlanDetails]:
    key = getattr(plan_type, "value", plan_type)
    return DETAIL_MODELS[str(key)]


def validate_details(plan_type: object, values: dict[str, Any]) -> dict[str, Any]:
    return (
        details_model(plan_type).model_validate(values).model_dump(mode="json", exclude_none=True)
    )


def accepted_detail_fields(plan_type: object) -> set[str]:
    return set(details_model(plan_type).model_fields)
