from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ServiceCase(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "service_cases"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("chat_sessions.id"), nullable=False, index=True)
    case_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    case_title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="open", nullable=False, index=True)
    result_summary: Mapped[str | None] = mapped_column(Text)

    user = relationship("User", back_populates="service_cases")
    session = relationship("ChatSession", back_populates="service_cases", foreign_keys=[session_id])
    slots = relationship("CaseSlot", back_populates="case", cascade="all, delete-orphan")
    memory_items = relationship("MemoryItem", back_populates="case")
    eligibility_records = relationship("EligibilityRecord", back_populates="case")


class CaseSlot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "case_slots"

    case_id: Mapped[str] = mapped_column(ForeignKey("service_cases.id"), nullable=False, index=True)
    slot_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    slot_name: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[dict | list | str | int | float | bool | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(50), default="missing", nullable=False, index=True)
    question: Mapped[str | None] = mapped_column(Text)
    required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    case = relationship("ServiceCase", back_populates="slots")


class MemoryItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "memory_items"

    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[str | None] = mapped_column(ForeignKey("chat_sessions.id"), index=True)
    case_id: Mapped[str | None] = mapped_column(ForeignKey("service_cases.id"), index=True)
    memory_scope: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    memory_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    memory_key: Mapped[str] = mapped_column("key", String(100), nullable=False, index=True)
    value: Mapped[dict | list | str | int | float | bool | None] = mapped_column(JSONB, nullable=False)
    source: Mapped[str | None] = mapped_column(String(100))
    confidence: Mapped[float | None] = mapped_column(Numeric(4, 3))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user = relationship("User", back_populates="memory_items")
    session = relationship("ChatSession", back_populates="memory_items")
    case = relationship("ServiceCase", back_populates="memory_items")

