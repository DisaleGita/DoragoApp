import re
import uuid
from pathlib import Path
from tempfile import SpooledTemporaryFile
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import utc_now
from app.documents.models import TravelDocument
from app.documents.schemas import DocumentCategory, DocumentResponse
from app.documents.storage import PrivateObjectStorage
from app.plans.service import owned_plan
from app.trips.router import owned_trip
from app.users.models import User

trip_router = APIRouter(prefix="/trips", tags=["documents"])
router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED = {
    ".pdf": {"application/pdf"},
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".webp": {"image/webp"},
}


def safe_name(value: str) -> str:
    base = Path(value).name
    cleaned = re.sub(r"[^A-Za-z0-9._ -]", "_", base).strip()
    if not cleaned or cleaned in {".", ".."} or len(cleaned) > 500:
        raise ApiError(422, "invalid_file_name", "The file name is invalid.")
    return cleaned


def signature_matches(extension: str, header: bytes) -> bool:
    if extension == ".pdf":
        return header.startswith(b"%PDF-")
    if extension == ".png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    if extension in {".jpg", ".jpeg"}:
        return header.startswith(b"\xff\xd8\xff")
    if extension == ".webp":
        return header.startswith(b"RIFF") and header[8:12] == b"WEBP"
    return False


async def owned_document(
    db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID
) -> TravelDocument:
    document = await db.scalar(
        select(TravelDocument).where(
            TravelDocument.id == document_id,
            TravelDocument.user_id == user_id,
            TravelDocument.deleted_at.is_(None),
        )
    )
    if document is None:
        raise ApiError(404, "document_not_found", "Document not found.")
    return document


@trip_router.get("/{trip_id}/documents", response_model=list[DocumentResponse])
async def list_documents(
    trip_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TravelDocument]:
    await owned_trip(db, user.id, trip_id)
    return list(
        (
            await db.scalars(
                select(TravelDocument)
                .where(
                    TravelDocument.trip_id == trip_id,
                    TravelDocument.user_id == user.id,
                    TravelDocument.deleted_at.is_(None),
                )
                .order_by(TravelDocument.created_at.desc())
            )
        ).all()
    )


@trip_router.post("/{trip_id}/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(
    trip_id: uuid.UUID,
    upload: UploadFile = File(...),
    plan_id: uuid.UUID | None = Form(default=None),
    category: DocumentCategory = Form(default=DocumentCategory.OTHER),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TravelDocument:
    await owned_trip(db, user.id, trip_id)
    if plan_id is not None:
        plan = await owned_plan(db, user.id, plan_id)
        if plan.trip_id != trip_id:
            raise ApiError(422, "plan_trip_mismatch", "Plan does not belong to the trip.")

    name = safe_name(upload.filename or "")
    extension = Path(name).suffix.lower()
    mime_type = (upload.content_type or "").lower()
    if extension not in ALLOWED or mime_type not in ALLOWED[extension]:
        raise ApiError(415, "unsupported_file", "File extension and MIME type are not allowed.")

    temp: SpooledTemporaryFile[bytes] = SpooledTemporaryFile(max_size=2 * 1024 * 1024)
    size = 0
    header = b""
    while chunk := await upload.read(64 * 1024):
        size += len(chunk)
        if size > settings.max_document_bytes:
            temp.close()
            raise ApiError(413, "file_too_large", "The document exceeds the upload limit.")
        if len(header) < 16:
            header += chunk[: 16 - len(header)]
        temp.write(chunk)
    if size == 0 or not signature_matches(extension, header):
        temp.close()
        raise ApiError(415, "invalid_file_content", "File content does not match its type.")

    document_id = uuid.uuid4()
    key = f"documents/{user.id}/{trip_id}/{document_id}{extension}"
    storage = PrivateObjectStorage(settings)
    try:
        await storage.put(key, temp, mime_type)
    finally:
        temp.close()
    document = TravelDocument(
        id=document_id,
        user_id=user.id,
        trip_id=trip_id,
        plan_id=plan_id,
        file_name=name,
        extension=extension.lstrip("."),
        file_size_bytes=size,
        mime_type=mime_type,
        storage_key=key,
        document_category=category.value,
    )
    db.add(document)
    try:
        await db.commit()
    except Exception:
        await storage.delete(key)
        raise
    await db.refresh(document)
    return document


@router.get("/{document_id}/download", response_class=Response)
async def download_document(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    document = await owned_document(db, user.id, document_id)
    content = await PrivateObjectStorage(settings).read(document.storage_key)
    encoded_name = quote(document.file_name, safe="")
    return Response(
        content=content,
        media_type=document.mime_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}",
            "Cache-Control": "private, no-store",
        },
    )


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> None:
    document = await owned_document(db, user.id, document_id)
    await PrivateObjectStorage(settings).delete(document.storage_key)
    document.deleted_at = utc_now()
    await db.commit()
