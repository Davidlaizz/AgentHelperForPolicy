from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DashboardMetric(BaseModel):
    label: str
    value: int
    helper: str | None = None


class CategoryCount(BaseModel):
    name: str
    count: int


class DashboardResponse(BaseModel):
    document_count: int
    active_document_count: int
    parsed_document_count: int
    chunk_count: int
    today_question_count: int
    hot_question_count: int
    standard_answer_count: int
    high_risk_answer_count: int
    service_case_count: int
    memory_item_count: int
    top_policy_categories: list[CategoryCount]
    top_case_types: list[CategoryCount]


class HotQuestionResponse(BaseModel):
    id: str
    question_text: str
    normalized_question: str | None = None
    policy_category: str | None = None
    hit_count: int
    last_asked_at: datetime
    created_at: datetime
    updated_at: datetime


class StandardAnswerBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    policy_category: str | None = None
    question_keywords: list[str] | dict | None = None
    applicable_scope: str | None = None
    answer_content: str = Field(min_length=1)
    status: str = "active"


class StandardAnswerCreateRequest(StandardAnswerBase):
    pass


class StandardAnswerUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    policy_category: str | None = None
    question_keywords: list[str] | dict | None = None
    applicable_scope: str | None = None
    answer_content: str | None = Field(default=None, min_length=1)
    status: str | None = None


class StandardAnswerResponse(StandardAnswerBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PolicyChunkAdminResponse(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    file_name: str
    chunk_index: int
    chunk_text: str
    section_title: str | None = None
    article_no: str | None = None
    page_no: int | None = None
    policy_level: str | None = None
    policy_category: str | None = None
    applicable_scope: str | None = None
    effective_from: str | None = None
    effective_to: str | None = None
    metadata: dict


class PolicyChunkListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    results: list[PolicyChunkAdminResponse]
