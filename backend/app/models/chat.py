from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ChatSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "chat_sessions"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(200))
    current_case_id: Mapped[str | None] = mapped_column(ForeignKey("service_cases.id"))

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        foreign_keys="ChatMessage.session_id",
    )
    service_cases = relationship(
        "ServiceCase",
        back_populates="session",
        cascade="all, delete-orphan",
        foreign_keys="ServiceCase.session_id",
    )
    current_case = relationship("ServiceCase", foreign_keys=[current_case_id], post_update=True)
    memory_items = relationship("MemoryItem", back_populates="session")
    eligibility_records = relationship("EligibilityRecord", back_populates="session")


class ChatMessage(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "chat_messages"

    session_id: Mapped[str] = mapped_column(ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    extra_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    session = relationship("ChatSession", back_populates="messages", foreign_keys=[session_id])
    citations = relationship("Citation", back_populates="message", cascade="all, delete-orphan")
