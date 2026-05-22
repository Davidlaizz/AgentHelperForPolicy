from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Citation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "citations"

    message_id: Mapped[str] = mapped_column(ForeignKey("chat_messages.id"), nullable=False, index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("policy_documents.id"), nullable=False, index=True)
    chunk_id: Mapped[str | None] = mapped_column(ForeignKey("policy_chunks.id"), index=True)
    attachment_id: Mapped[str | None] = mapped_column(ForeignKey("policy_attachments.id"), index=True)
    page_no: Mapped[int | None] = mapped_column(Integer)
    article_no: Mapped[str | None] = mapped_column(String(100))
    quote_text: Mapped[str | None] = mapped_column(Text)

    message = relationship("ChatMessage", back_populates="citations")
    document = relationship("PolicyDocument", back_populates="citations")
    chunk = relationship("PolicyChunk", back_populates="citations")
    attachment = relationship("PolicyAttachment", back_populates="citations")


class StandardAnswer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "standard_answers"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    policy_category: Mapped[str | None] = mapped_column(String(100), index=True)
    question_keywords: Mapped[list[str] | dict | None] = mapped_column(JSONB)
    applicable_scope: Mapped[str | None] = mapped_column(String(255))
    answer_content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False, index=True)


class HotQuestion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "hot_questions"

    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_question: Mapped[str | None] = mapped_column(String(500), index=True)
    policy_category: Mapped[str | None] = mapped_column(String(100), index=True)
    hit_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_asked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class EligibilityRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "eligibility_records"

    case_id: Mapped[str | None] = mapped_column(ForeignKey("service_cases.id"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[str | None] = mapped_column(ForeignKey("chat_sessions.id"), index=True)
    policy_category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    result_status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    matched_conditions: Mapped[dict | list | None] = mapped_column(JSONB)
    unmet_conditions: Mapped[dict | list | None] = mapped_column(JSONB)
    pending_conditions: Mapped[dict | list | None] = mapped_column(JSONB)
    result_summary: Mapped[str | None] = mapped_column(Text)

    case = relationship("ServiceCase", back_populates="eligibility_records")
    user = relationship("User", back_populates="eligibility_records")
    session = relationship("ChatSession", back_populates="eligibility_records")

