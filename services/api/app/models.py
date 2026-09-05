"""Import all ORM models so Alembic sees a complete metadata graph."""

from app.analytics.models import AnalyticsEvent
from app.auth.models import AuthSession, OtpChallenge, RefreshToken
from app.documents.models import TravelDocument
from app.imports.models import ImportSource, ParserRun
from app.plans.models import PlanFieldSource, PlanItem, PlanVersion
from app.reminders.models import PlanReminder
from app.sync.models import ProcessedMutation
from app.trips.models import TravelerProfile, Trip, TripDestination, TripTraveler
from app.users.models import User, UserSettings

__all__ = [
    "AnalyticsEvent",
    "AuthSession",
    "ImportSource",
    "OtpChallenge",
    "ParserRun",
    "PlanFieldSource",
    "PlanItem",
    "PlanReminder",
    "PlanVersion",
    "ProcessedMutation",
    "RefreshToken",
    "TravelDocument",
    "TravelerProfile",
    "Trip",
    "TripDestination",
    "TripTraveler",
    "User",
    "UserSettings",
]
