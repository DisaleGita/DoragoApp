from datetime import date
from io import BytesIO
from tempfile import SpooledTemporaryFile

import pytest
from starlette.datastructures import Headers, UploadFile

from app.core.errors import ApiError
from app.core.security import utc_now
from app.documents import router as documents
from app.documents.models import TravelDocument
from app.trips.models import Trip
from app.users.models import User

pytestmark = pytest.mark.integration

PDF = b"%PDF-1.7\nboarding pass for SW 412\n"


class MemoryStorage:
    objects: dict[str, bytes] = {}

    def __init__(self, settings: object) -> None:
        pass

    async def put(self, key: str, file_obj: SpooledTemporaryFile[bytes], mime_type: str) -> None:
        file_obj.seek(0)
        self.objects[key] = file_obj.read()

    async def delete(self, key: str) -> None:
        self.objects.pop(key, None)

    async def read(self, key: str) -> bytes:
        return self.objects[key]


@pytest.fixture(autouse=True)
def memory_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    MemoryStorage.objects = {}
    monkeypatch.setattr(documents, "PrivateObjectStorage", MemoryStorage)


def pdf_upload(name: str, content: bytes = PDF) -> UploadFile:
    return UploadFile(
        BytesIO(content), filename=name, headers=Headers({"content-type": "application/pdf"})
    )


async def make_trip(db, user: User, title: str) -> Trip:
    trip = Trip(
        owner_user_id=user.id,
        title=title,
        primary_destination="New York",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 10, 4),
        timezone="America/New_York",
    )
    db.add(trip)
    await db.commit()
    return trip


async def upload(db, settings, user: User, trip: Trip, name: str, content: bytes = PDF):
    return await documents.upload_document(
        trip.id,
        pdf_upload(name, content),
        None,
        documents.DocumentCategory.TICKET,
        user,
        db,
        settings,
    )


async def test_same_content_cannot_be_attached_twice_to_a_trip(db, settings) -> None:
    user = User(email="docs@example.com", email_verified_at=utc_now(), timezone="UTC")
    db.add(user)
    await db.commit()
    trip = await make_trip(db, user, "NYC")

    first = await upload(db, settings, user, trip, "eticket.pdf")
    with pytest.raises(ApiError) as duplicate:
        await upload(db, settings, user, trip, "renamed copy.pdf")

    assert duplicate.value.status_code == 409
    assert duplicate.value.code == "duplicate_document"
    assert duplicate.value.details["existing_document_id"] == str(first.id)
    assert len(MemoryStorage.objects) == 1


async def test_duplicates_are_scoped_to_live_documents_in_one_trip(db, settings) -> None:
    user = User(email="docs2@example.com", email_verified_at=utc_now(), timezone="UTC")
    db.add(user)
    await db.commit()
    trip = await make_trip(db, user, "NYC")
    other_trip = await make_trip(db, user, "Tokyo")

    first = await upload(db, settings, user, trip, "eticket.pdf")
    await upload(db, settings, user, other_trip, "eticket.pdf")
    await upload(db, settings, user, trip, "eticket.pdf", PDF + b"different booking")

    await documents.delete_document(first.id, user, db, settings)
    again = await upload(db, settings, user, trip, "eticket.pdf")

    assert again.id != first.id


async def test_documents_uploaded_before_hashing_are_still_detected(db, settings) -> None:
    user = User(email="docs3@example.com", email_verified_at=utc_now(), timezone="UTC")
    db.add(user)
    await db.commit()
    trip = await make_trip(db, user, "NYC")
    legacy_key = f"documents/{user.id}/{trip.id}/legacy.pdf"
    MemoryStorage.objects[legacy_key] = PDF
    legacy = TravelDocument(
        user_id=user.id,
        trip_id=trip.id,
        file_name="old upload.pdf",
        extension="pdf",
        file_size_bytes=len(PDF),
        mime_type="application/pdf",
        storage_key=legacy_key,
        content_sha256=None,
    )
    db.add(legacy)
    await db.commit()

    with pytest.raises(ApiError) as duplicate:
        await upload(db, settings, user, trip, "eticket.pdf")
    assert duplicate.value.details["existing_document_id"] == str(legacy.id)

    different = PDF.replace(b"SW 412", b"SW 419")
    assert len(different) == len(PDF)
    await upload(db, settings, user, trip, "return.pdf", different)
