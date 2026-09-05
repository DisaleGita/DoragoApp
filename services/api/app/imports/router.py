import uuid
from datetime import datetime
from decimal import Decimal
from tempfile import SpooledTemporaryFile
from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import local_to_utc, utc_now
from app.documents.router import ALLOWED, safe_name, signature_matches
from app.documents.storage import PrivateObjectStorage
from app.imports.gemini import parse_travel
from app.imports.models import ImportSource, ParserRun
from app.imports.schemas import (
    ExtractedField,
    ImportAcceptRequest,
    ImportAcceptResponse,
    ImportReviewResponse,
    ReviewProposal,
)
from app.plans.details import accepted_detail_fields
from app.plans.models import PlanFieldSource, PlanItem
from app.plans.schemas import PlanFields, PlanType
from app.plans.service import add_version
from app.trips.models import Trip
from app.trips.router import owned_trip
from app.trips.service import replace_destinations, replace_travelers
from app.users.models import User

router = APIRouter(prefix="/imports", tags=["imports"])


def extracted_value(fields: Any, name: str) -> Any:
    field: ExtractedField[Any] | None = getattr(fields, name, None)
    return field.value if field is not None else None


def local_datetime(fields: Any, date_field: str, time_field: str) -> datetime | None:
    date_value = extracted_value(fields, date_field)
    time_value = extracted_value(fields, time_field)
    if date_value is None or time_value is None:
        return None
    try:
        return datetime.fromisoformat(f"{date_value}T{time_value}")
    except ValueError as exc:
        raise ApiError(
            422, "invalid_extracted_time", "An extracted date or time is invalid."
        ) from exc


async def annotate_duplicates(
    db: AsyncSession,
    trip_id: uuid.UUID | None,
    proposals: list[ReviewProposal],
) -> None:
    if trip_id is None:
        return
    existing = list(
        (
            await db.scalars(
                select(PlanItem).where(PlanItem.trip_id == trip_id, PlanItem.deleted_at.is_(None))
            )
        ).all()
    )
    for proposal in proposals:
        confirmation = extracted_value(proposal.fields, "confirmation_number")
        for plan in existing:
            confirmation_match = (
                confirmation
                and plan.confirmation_number
                and confirmation.strip().casefold() == plan.confirmation_number.strip().casefold()
            )
            title_a = "".join(
                character for character in (proposal.title or "").casefold() if character.isalnum()
            )
            title_b = "".join(
                character for character in plan.title.casefold() if character.isalnum()
            )
            title_match = (
                proposal.plan_type.value == plan.plan_type
                and title_a
                and title_b
                and (title_a in title_b or title_b in title_a)
            )
            if confirmation_match or title_match:
                proposal.is_duplicate = True
                proposal.duplicate_plan_id = plan.id
                proposal.duplicate_reason = f"Matches existing plan: {plan.title}"
                break


@router.post("", response_model=ImportReviewResponse, status_code=201)
async def create_import(
    text: str | None = Form(default=None, max_length=100_000),
    target_trip_id: uuid.UUID | None = Form(default=None),
    upload: UploadFile | None = File(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ImportReviewResponse:
    if not text and upload is None:
        raise ApiError(422, "source_required", "Paste text or upload a supported file.")
    if target_trip_id is not None:
        await owned_trip(db, user.id, target_trip_id)

    source = ImportSource(
        user_id=user.id,
        source_channel="text_paste" if upload is None else "file_upload",
        raw_text=text,
        status="pending",
    )
    db.add(source)
    await db.flush()

    file_bytes: bytes | None = None
    mime_type: str | None = None
    stored_key: str | None = None
    if upload is not None:
        name = safe_name(upload.filename or "")
        extension = "." + name.rsplit(".", maxsplit=1)[-1].lower() if "." in name else ""
        mime_type = (upload.content_type or "").lower()
        if extension not in ALLOWED or mime_type not in ALLOWED[extension]:
            raise ApiError(415, "unsupported_file", "File extension and MIME type are not allowed.")
        file_bytes = await upload.read(settings.max_document_bytes + 1)
        if len(file_bytes) > settings.max_document_bytes:
            raise ApiError(413, "file_too_large", "The import file exceeds the upload limit.")
        if not file_bytes or not signature_matches(extension, file_bytes[:16]):
            raise ApiError(415, "invalid_file_content", "File content does not match its type.")
        key = f"imports/{user.id}/{source.id}{extension}"
        temp: SpooledTemporaryFile[bytes] = SpooledTemporaryFile()
        temp.write(file_bytes)
        try:
            await PrivateObjectStorage(settings).put(key, temp, mime_type)
        finally:
            temp.close()
        stored_key = key
        source.file_storage_key = key
        source.file_name = name
        source.mime_type = mime_type
    try:
        await db.commit()
    except Exception:
        if stored_key is not None:
            await PrivateObjectStorage(settings).delete(stored_key)
        raise

    try:
        parsed = await parse_travel(settings, text, file_bytes, mime_type)
    except ApiError as exc:
        source.status = "failed"
        db.add(
            ParserRun(
                import_source_id=source.id,
                parser_model=settings.gemini_model,
                status="failed",
                error_code=exc.code,
            )
        )
        await db.commit()
        raise

    proposals = [
        ReviewProposal(
            proposal_id=uuid.uuid4(),
            **proposal.model_dump(),
        )
        for proposal in parsed.plans
    ]
    await annotate_duplicates(db, target_trip_id, proposals)
    response = ImportReviewResponse(
        import_id=source.id,
        parser_model=settings.gemini_model,
        proposed_trip_title=parsed.proposed_trip_title,
        proposed_destination=parsed.proposed_destination,
        proposed_start_date=parsed.proposed_start_date,
        proposed_end_date=parsed.proposed_end_date,
        overall_confidence=parsed.overall_confidence,
        warnings=parsed.warnings,
        plans=proposals,
    )
    source.status = "parsed"
    db.add(
        ParserRun(
            import_source_id=source.id,
            parser_model=settings.gemini_model,
            overall_confidence=Decimal(str(parsed.overall_confidence)),
            extracted_result=response.model_dump(mode="json"),
            warnings=parsed.warnings,
            status="success",
        )
    )
    await db.commit()
    return response


def value_with_override(overrides: dict[str, Any], fields: Any, key: str) -> Any:
    if key in overrides:
        return overrides[key]
    return extracted_value(fields, key)


def proposal_start(fields: Any) -> datetime | None:
    return (
        local_datetime(fields, "departure_date", "departure_time")
        or local_datetime(fields, "check_in_date", "check_in_time")
        or local_datetime(fields, "reservation_date", "reservation_time")
    )


def proposal_end(fields: Any) -> datetime | None:
    return local_datetime(fields, "arrival_date", "arrival_time") or local_datetime(
        fields, "check_out_date", "check_out_time"
    )


@router.post("/{import_id}/accept", response_model=ImportAcceptResponse)
async def accept_import(
    import_id: uuid.UUID,
    payload: ImportAcceptRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImportAcceptResponse:
    source = await db.scalar(
        select(ImportSource).where(ImportSource.id == import_id, ImportSource.user_id == user.id)
    )
    if source is None:
        raise ApiError(404, "import_not_found", "Import not found.")
    if source.status != "parsed":
        raise ApiError(409, "import_not_reviewable", "Import is not ready for acceptance.")
    run = await db.scalar(
        select(ParserRun)
        .where(ParserRun.import_source_id == import_id, ParserRun.status == "success")
        .order_by(ParserRun.created_at.desc())
        .limit(1)
    )
    if run is None or run.extracted_result is None:
        raise ApiError(409, "parser_result_missing", "Parser result is unavailable.")
    review = ImportReviewResponse.model_validate(run.extracted_result)
    indexed = {proposal.proposal_id: proposal for proposal in review.plans}
    if len({item.proposal_id for item in payload.proposals}) != len(payload.proposals):
        raise ApiError(422, "duplicate_proposal", "A proposal was selected more than once.")

    if payload.target_trip_id is not None:
        trip = await owned_trip(db, user.id, payload.target_trip_id)
    else:
        assert payload.new_trip is not None
        trip_values = payload.new_trip.model_dump(exclude={"additional_destinations", "travelers"})
        trip = Trip(owner_user_id=user.id, **trip_values)
        db.add(trip)
        await db.flush()
        await replace_destinations(db, trip.id, payload.new_trip.additional_destinations)
        await replace_travelers(db, trip, payload.new_trip.travelers)

    created: list[uuid.UUID] = []
    for selection in payload.proposals:
        proposal = indexed.get(selection.proposal_id)
        if proposal is None:
            raise ApiError(422, "proposal_not_found", "A selected proposal is invalid.")
        overrides = selection.overrides.model_dump(exclude_unset=True)
        title = overrides["title"] if "title" in overrides else proposal.title
        start_local = (
            overrides["start_local"]
            if "start_local" in overrides
            else proposal_start(proposal.fields)
        )
        start_timezone = value_with_override(overrides, proposal.fields, "start_timezone")
        if not title or not start_local or not start_timezone:
            raise ApiError(
                422,
                "proposal_requires_correction",
                "Each accepted plan needs a title, local start time, and IANA timezone.",
                {"proposal_id": str(proposal.proposal_id)},
            )
        if isinstance(start_local, str):
            try:
                start_local = datetime.fromisoformat(start_local)
            except ValueError as exc:
                raise ApiError(
                    422, "invalid_start_time", "Corrected start time is invalid."
                ) from exc
        end_local = (
            overrides["end_local"] if "end_local" in overrides else proposal_end(proposal.fields)
        )
        if isinstance(end_local, str):
            try:
                end_local = datetime.fromisoformat(end_local)
            except ValueError as exc:
                raise ApiError(422, "invalid_end_time", "Corrected end time is invalid.") from exc
        end_timezone = value_with_override(overrides, proposal.fields, "end_timezone")
        if end_local is not None:
            end_timezone = end_timezone or start_timezone

        plan_type = PlanType(overrides.get("plan_type", proposal.plan_type.value))
        flattened = {
            name: value["value"]
            for name, value in proposal.fields.model_dump(mode="json").items()
            if value is not None
        }
        detail_overrides = {
            key: value
            for key, value in overrides.items()
            if key in type(proposal.fields).model_fields
        }
        flattened.update(detail_overrides)
        allowed_details = accepted_detail_fields(plan_type)
        flattened = {key: value for key, value in flattened.items() if key in allowed_details}
        cost_amount = value_with_override(overrides, proposal.fields, "cost_amount")
        confidence = Decimal(str(proposal.overall_confidence))
        try:
            plan_values = PlanFields.model_validate(
                {
                    "plan_type": plan_type,
                    "title": str(title),
                    "start_local": start_local,
                    "start_timezone": str(start_timezone),
                    "end_local": end_local,
                    "end_timezone": str(end_timezone) if end_timezone else None,
                    "is_all_day": bool(overrides.get("is_all_day", False)),
                    "provider_name": value_with_override(
                        overrides, proposal.fields, "provider_name"
                    )
                    or value_with_override(overrides, proposal.fields, "airline")
                    or value_with_override(overrides, proposal.fields, "property_name"),
                    "confirmation_number": value_with_override(
                        overrides, proposal.fields, "confirmation_number"
                    ),
                    "location_name": value_with_override(
                        overrides, proposal.fields, "location_name"
                    )
                    or value_with_override(overrides, proposal.fields, "property_name")
                    or value_with_override(overrides, proposal.fields, "departure_airport"),
                    "address": value_with_override(overrides, proposal.fields, "address"),
                    "cost_amount": Decimal(str(cost_amount)) if cost_amount is not None else None,
                    "cost_currency": value_with_override(
                        overrides, proposal.fields, "cost_currency"
                    ),
                    "notes": value_with_override(overrides, proposal.fields, "notes"),
                    "status": "confirmed",
                    "assigned_traveler_names": value_with_override(
                        overrides, proposal.fields, "traveler_names"
                    )
                    or [],
                    "details": flattened,
                }
            )
        except ValidationError as exc:
            raise ApiError(
                422,
                "proposal_invalid_correction",
                "A selected plan contains an invalid correction.",
                {
                    "proposal_id": str(proposal.proposal_id),
                    "errors": jsonable_encoder(exc.errors()),
                },
            ) from exc
        plan = PlanItem(
            trip_id=trip.id,
            **plan_values.model_dump(),
            start_utc=local_to_utc(plan_values.start_local, plan_values.start_timezone),
            end_utc=(
                local_to_utc(plan_values.end_local, plan_values.end_timezone)
                if plan_values.end_local is not None and plan_values.end_timezone
                else None
            ),
            source_type="ai_import",
            source_id=source.id,
            ai_confidence=confidence,
            version=1,
        )
        db.add(plan)
        await db.flush()
        for field_name, field in proposal.fields:
            if field is not None:
                db.add(
                    PlanFieldSource(
                        plan_id=plan.id,
                        field_name=field_name,
                        field_value=jsonable_encoder(field.value),
                        source_type="ai_extraction",
                        confidence=Decimal(str(field.confidence)),
                        source_snippet=field.source_snippet,
                        user_override=False,
                        created_at=utc_now(),
                    )
                )
        for field_name, value in overrides.items():
            db.add(
                PlanFieldSource(
                    plan_id=plan.id,
                    field_name=field_name,
                    field_value=jsonable_encoder(value),
                    source_type="user_override",
                    user_override=True,
                    created_at=utc_now(),
                )
            )
        add_version(db, plan, "ai_import")
        created.append(plan.id)
    source.status = "accepted"
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    return ImportAcceptResponse(trip_id=trip.id, created_plan_ids=created)
