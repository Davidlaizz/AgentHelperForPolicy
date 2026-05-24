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


class ModelServicePresetResponse(BaseModel):
    id: str
    label: str
    provider: str
    model: str
    api_url: str | None = None
    description: str
    keep_current_api_key: bool = True


class ModelServiceConfigResponse(BaseModel):
    provider: str
    model: str
    api_url: str | None = None
    api_key_status: str
    api_key_masked: str | None = None
    max_tokens: int | None = None
    timeout_seconds: int
    thinking_type: str | None = None
    compatible_protocol: str
    editable_fields: list[str]
    available_presets: list[ModelServicePresetResponse]


class ModelServiceUpdateRequest(BaseModel):
    preset_id: str | None = None
    provider: str | None = Field(default=None, min_length=1, max_length=40)
    model: str | None = Field(default=None, min_length=1, max_length=120)
    api_url: str | None = None
    api_key: str | None = None
    max_tokens: int | None = Field(default=None, ge=1, le=32000)
    timeout_seconds: int | None = Field(default=None, ge=5, le=600)
    thinking_type: str | None = None
    clear_api_key: bool = False


class RagServiceConfigResponse(BaseModel):
    embedding_provider: str
    embedding_model: str
    embedding_dimensions: int
    embedding_api_url: str | None = None
    embedding_api_key_status: str
    embedding_api_key_masked: str | None = None
    vector_schema: str
    vector_table: str
    editable_fields: list[str]


class AgentGovernanceConfigResponse(BaseModel):
    graph_version: str
    node_count: int
    edge_count: int
    orchestration_framework: str
    editable_items: list[str]
    runtime_observability: bool


class SystemConfigResponse(BaseModel):
    model_service: ModelServiceConfigResponse
    rag_service: RagServiceConfigResponse
    agent_governance: AgentGovernanceConfigResponse
    edit_mode: str
    edit_note: str
    updated_at: datetime
