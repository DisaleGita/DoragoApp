from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.plans.schemas import PlanType
from app.trips.schemas import TripCreate


class ExtractedField[T](BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: T | None
    confidence: float = Field(ge=0, le=1)
    source_snippet: str | None = Field(default=None, max_length=1000)


class ExtractedFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    airline: ExtractedField[str] | None = None
    flight_number: ExtractedField[str] | None = None
    departure_airport: ExtractedField[str] | None = None
    arrival_airport: ExtractedField[str] | None = None
    departure_date: ExtractedField[date] | None = None
    departure_time: ExtractedField[str] | None = None
    arrival_date: ExtractedField[date] | None = None
    arrival_time: ExtractedField[str] | None = None
    start_timezone: ExtractedField[str] | None = None
    end_timezone: ExtractedField[str] | None = None
    departure_terminal: ExtractedField[str] | None = None
    departure_gate: ExtractedField[str] | None = None
    arrival_terminal: ExtractedField[str] | None = None
    arrival_gate: ExtractedField[str] | None = None
    confirmation_number: ExtractedField[str] | None = None
    seat: ExtractedField[str] | None = None
    cabin_class: ExtractedField[str] | None = None
    property_name: ExtractedField[str] | None = None
    address: ExtractedField[str] | None = None
    check_in_date: ExtractedField[date] | None = None
    check_in_time: ExtractedField[str] | None = None
    check_out_date: ExtractedField[date] | None = None
    check_out_time: ExtractedField[str] | None = None
    room_type: ExtractedField[str] | None = None
    provider_name: ExtractedField[str] | None = None
    pickup_location: ExtractedField[str] | None = None
    dropoff_location: ExtractedField[str] | None = None
    departure_station: ExtractedField[str] | None = None
    arrival_station: ExtractedField[str] | None = None
    reservation_date: ExtractedField[date] | None = None
    reservation_time: ExtractedField[str] | None = None
    location_name: ExtractedField[str] | None = None
    party_size: ExtractedField[int] | None = None
    traveler_names: ExtractedField[list[str]] | None = None
    cost_amount: ExtractedField[float] | None = None
    cost_currency: ExtractedField[str] | None = None
    notes: ExtractedField[str] | None = None


class ParserProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    plan_type: PlanType
    title: str | None = Field(default=None, max_length=500)
    overall_confidence: float = Field(ge=0, le=1)
    warnings: list[str] = Field(default_factory=list)
    fields: ExtractedFields


class GeminiParserResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    proposed_trip_title: str | None = Field(default=None, max_length=300)
    proposed_destination: str | None = Field(default=None, max_length=300)
    proposed_start_date: date | None = None
    proposed_end_date: date | None = None
    overall_confidence: float = Field(ge=0, le=1)
    warnings: list[str] = Field(default_factory=list)
    plans: list[ParserProposal] = Field(default_factory=list, max_length=100)


class ReviewProposal(ParserProposal):
    proposal_id: UUID
    is_duplicate: bool = False
    duplicate_plan_id: UUID | None = None
    duplicate_reason: str | None = None


class ImportReviewResponse(BaseModel):
    import_id: UUID
    parser_model: str
    proposed_trip_title: str | None
    proposed_destination: str | None
    proposed_start_date: date | None
    proposed_end_date: date | None
    overall_confidence: float
    warnings: list[str]
    plans: list[ReviewProposal]


class ImportOverrides(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, max_length=500)
    plan_type: PlanType | None = None
    start_local: datetime | None = None
    start_timezone: str | None = None
    end_local: datetime | None = None
    end_timezone: str | None = None
    is_all_day: bool | None = None
    airline: str | None = None
    flight_number: str | None = None
    departure_airport: str | None = None
    arrival_airport: str | None = None
    departure_date: date | None = None
    departure_time: str | None = None
    arrival_date: date | None = None
    arrival_time: str | None = None
    departure_terminal: str | None = None
    departure_gate: str | None = None
    arrival_terminal: str | None = None
    arrival_gate: str | None = None
    confirmation_number: str | None = None
    seat: str | None = None
    cabin_class: str | None = None
    property_name: str | None = None
    address: str | None = None
    check_in_date: date | None = None
    check_in_time: str | None = None
    check_out_date: date | None = None
    check_out_time: str | None = None
    room_type: str | None = None
    provider_name: str | None = None
    pickup_location: str | None = None
    dropoff_location: str | None = None
    departure_station: str | None = None
    arrival_station: str | None = None
    reservation_date: date | None = None
    reservation_time: str | None = None
    location_name: str | None = None
    party_size: int | None = Field(default=None, ge=1, le=1000)
    traveler_names: list[str] | None = Field(default=None, max_length=50)
    cost_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    cost_currency: str | None = Field(default=None, min_length=3, max_length=3)
    notes: str | None = Field(default=None, max_length=30_000)


class ProposalAcceptance(BaseModel):
    model_config = ConfigDict(extra="forbid")
    proposal_id: UUID
    overrides: ImportOverrides = Field(default_factory=ImportOverrides)


class ImportAcceptRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    target_trip_id: UUID | None = None
    new_trip: TripCreate | None = None
    proposals: list[ProposalAcceptance] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def exactly_one_target(self) -> "ImportAcceptRequest":
        if (self.target_trip_id is None) == (self.new_trip is None):
            raise ValueError("Provide exactly one of target_trip_id or new_trip")
        return self


class ImportAcceptResponse(BaseModel):
    trip_id: UUID
    created_plan_ids: list[UUID]
