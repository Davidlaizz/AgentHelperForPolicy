from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class RAGIndexResponse(BaseModel):
    document_count: int
    chunk_count: int


class RAGSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = 5
    policy_level: str | None = None
    policy_category: str | None = None
    applicable_scope: str | None = None
    college: str | None = None
    as_of_date: date | None = None
    include_expired: bool = False


class RelatedSourceResponse(BaseModel):
    relation_type: str
    document_id: str
    title: str
    file_name: str


class RAGSearchResult(BaseModel):
    chunk_id: str
    document_id: str
    attachment_id: str | None = None
    document_title: str
    file_name: str
    chunk_text: str
    section_title: str | None = None
    article_no: str | None = None
    page_no: int | None = None
    policy_level: str | None = None
    policy_category: str | None = None
    applicable_scope: str | None = None
    college: str | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    metadata: dict
    vector_score: float
    keyword_score: float
    authority_bonus: float
    recency_bonus: float
    relation_bonus: float
    final_score: float
    related_sources: list[RelatedSourceResponse]


class RAGSearchResponse(BaseModel):
    query: str
    top_k: int
    results: list[RAGSearchResult]
