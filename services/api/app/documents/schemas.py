from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentCategory(StrEnum):
    BOARDING_PASS = "boarding_pass"
    TICKET = "ticket"
    HOTEL_VOUCHER = "hotel_voucher"
    RENTAL_AGREEMENT = "rental_agreement"
    RECEIPT = "receipt"
    INSURANCE_POLICY = "insurance_policy"
    QR_SCREENSHOT = "qr_screenshot"
    PASSPORT_SCAN = "passport_scan"
    OTHER = "other"


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    trip_id: UUID
    plan_id: UUID | None
    file_name: str
    extension: str
    file_size_bytes: int
    mime_type: str
    document_category: DocumentCategory
    created_at: datetime
    updated_at: datetime
