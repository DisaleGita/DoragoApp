import json

from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.core.errors import validation_details
from app.main import app
from app.trips.schemas import TripCreate


def test_versioned_openapi_exposes_core_resources() -> None:
    paths = app.openapi()["paths"]
    for path in (
        "/api/v1/auth/otp/request",
        "/api/v1/auth/otp/verify",
        "/api/v1/auth/refresh",
        "/api/v1/auth/logout",
        "/api/v1/users/me",
        "/api/v1/users/me/export",
        "/api/v1/trips",
        "/api/v1/trips/{trip_id}/plans",
        "/api/v1/plans/next-up",
        "/api/v1/plans/{plan_id}",
        "/api/v1/imports",
        "/api/v1/imports/{import_id}/accept",
        "/api/v1/trips/{trip_id}/documents",
        "/api/v1/documents/{document_id}/download",
        "/api/v1/plans/{plan_id}/reminders",
        "/api/v1/reminders",
        "/api/v1/sync/mutations",
        "/api/v1/sync/changes",
    ):
        assert path in paths


def test_api_error_schema_is_consistent() -> None:
    from app.core.errors import error_body

    class State:
        request_id = "request-1"

    class Request:
        state = State()

    assert error_body(Request(), "invalid", "Invalid input", {"field": "email"}) == {
        "code": "invalid",
        "message": "Invalid input",
        "details": {"field": "email"},
        "request_id": "request-1",
    }


def test_validation_errors_are_serializable_and_use_the_error_contract() -> None:
    try:
        TripCreate.model_validate(
            {
                "title": "Invalid dates",
                "primary_destination": "Chicago",
                "start_date": "2027-02-02",
                "end_date": "2027-01-01",
                "timezone": "America/Chicago",
            }
        )
    except ValidationError as caught:
        error = RequestValidationError(caught.errors())
    else:
        raise AssertionError("The invalid request should have failed validation")

    details = validation_details(error)
    assert isinstance(details["errors"], list)
    assert "end_date" in json.dumps(details)
