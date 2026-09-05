from datetime import date

import pytest
from fastapi import Response
from sqlalchemy import select

import app.users.router as users_router
from app.auth.models import AuthSession
from app.core.security import utc_now
from app.documents.models import TravelDocument
from app.imports.models import ImportSource
from app.trips.models import Trip
from app.users.models import User

pytestmark = pytest.mark.integration


class RecordingStorage:
    deleted: list[str] = []

    def __init__(self, settings) -> None:
        del settings

    async def delete(self, key: str) -> None:
        self.deleted.append(key)


async def test_account_deletion_purges_database_and_private_objects(
    db, settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    RecordingStorage.deleted = []
    monkeypatch.setattr(users_router, "PrivateObjectStorage", RecordingStorage)
    user = User(email="delete@example.com", email_verified_at=utc_now(), timezone="UTC")
    db.add(user)
    await db.flush()
    trip = Trip(
        owner_user_id=user.id,
        title="Delete me",
        primary_destination="Chicago",
        start_date=date(2027, 5, 1),
        end_date=date(2027, 5, 2),
        timezone="America/Chicago",
    )
    db.add(trip)
    await db.flush()
    document_key = f"documents/{user.id}/ticket.pdf"
    import_key = f"imports/{user.id}/source.pdf"
    db.add_all(
        [
            TravelDocument(
                user_id=user.id,
                trip_id=trip.id,
                file_name="ticket.pdf",
                extension="pdf",
                file_size_bytes=10,
                mime_type="application/pdf",
                storage_key=document_key,
                document_category="ticket",
            ),
            ImportSource(
                user_id=user.id,
                source_channel="file_upload",
                file_storage_key=import_key,
                file_name="source.pdf",
                mime_type="application/pdf",
                status="failed",
            ),
        ]
    )
    await db.commit()

    await users_router.delete_me(
        response=Response(),
        user=user,
        db=db,
        settings=settings,
    )

    assert await db.get(User, user.id) is None
    assert await db.scalar(select(Trip).where(Trip.owner_user_id == user.id)) is None
    assert await db.scalar(select(AuthSession).where(AuthSession.user_id == user.id)) is None
    assert set(RecordingStorage.deleted) == {document_key, import_key}
