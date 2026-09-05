from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SyncOperation(StrEnum):
    TRIP_UPDATE = "trip.update"
    TRIP_DELETE = "trip.delete"
    PLAN_UPDATE = "plan.update"
    PLAN_DELETE = "plan.delete"


class SyncMutation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mutation_id: UUID
    operation: SyncOperation
    entity_id: UUID
    base_version: int = Field(ge=1)
    payload: dict[str, Any] = Field(default_factory=dict)


class MutationResult(BaseModel):
    mutation_id: UUID
    status: str
    entity_id: UUID
    version: int | None = None
    error_code: str | None = None
    current_version: int | None = None


class SyncBatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mutations: list[SyncMutation] = Field(min_length=1, max_length=100)


class SyncBatchResponse(BaseModel):
    results: list[MutationResult]


class ChangeRecord(BaseModel):
    entity_type: str
    entity_id: UUID
    version: int
    deleted_at: datetime | None
    payload: dict[str, Any] | None


class ChangesResponse(BaseModel):
    changes: list[ChangeRecord]
    next_cursor: datetime
