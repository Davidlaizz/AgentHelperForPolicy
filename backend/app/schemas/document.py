from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PolicyDocumentResponse(BaseModel):
    id: str
    title: str
    file_name: str
    file_type: str
    file_size: int | None = None
    policy_level: str
    policy_category: str
    issuing_department: str | None = None
    applicable_scope: str | None = None
    college: str | None = None
    publish_date: date | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    version: str | None = None
    parse_status: str
    parse_error: str | None = None
    parsed_at: datetime | None = None
    parsed_text_path: str | None = None
    is_attachment: bool = False
    parent_document_id: str | None = None
    attachment_title: str | None = None
    chunk_count: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PolicyDocumentUpdateRequest(BaseModel):
    title: str | None = None
    policy_level: str | None = None
    policy_category: str | None = None
    issuing_department: str | None = None
    applicable_scope: str | None = None
    college: str | None = None
    publish_date: date | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    version: str | None = None
    is_active: bool | None = None
