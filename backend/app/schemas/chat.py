from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.agent import AgentResponse
from app.schemas.rag import RAGSearchResult


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    session_id: str | None = None
    user_id: str | None = None
    top_k: int = Field(default=5, ge=1, le=10)
    policy_category: str | None = None
    include_expired: bool = False


class ChatCitationResponse(BaseModel):
    citation_id: str | None = None
    document_id: str
    chunk_id: str | None = None
    attachment_id: str | None = None
    document_title: str
    file_name: str
    attachment_title: str | None = None
    page_no: int | None = None
    article_no: str | None = None
    quote_text: str
    final_score: float


class ChatResponse(BaseModel):
    session_id: str
    user_message_id: str
    assistant_message_id: str
    question: str
    answer: str
    policy_basis: str
    ai_inference: str
    citations: list[ChatCitationResponse]
    retrieved_chunks: list[RAGSearchResult]
    agent: AgentResponse | None = None
