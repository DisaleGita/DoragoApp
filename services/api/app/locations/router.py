from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.auth.dependencies import get_current_user
from app.core.errors import ApiError
from app.users.models import User

router = APIRouter(prefix="/locations", tags=["locations"])


class GeocodeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=2, max_length=500)


class Coordinates(BaseModel):
    latitude: float
    longitude: float
    display_name: str


@router.post("/geocode", response_model=Coordinates)
async def geocode(payload: GeocodeRequest, user: User = Depends(get_current_user)) -> Coordinates:
    del payload, user
    raise ApiError(
        503,
        "geocoding_not_configured",
        "Geocoding is unavailable; map deep links remain supported.",
    )
