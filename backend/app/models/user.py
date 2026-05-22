from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    role: Mapped[str] = mapped_column(String(50), default="student", index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)

    chat_sessions = relationship("ChatSession", back_populates="user")
    service_cases = relationship("ServiceCase", back_populates="user")
    memory_items = relationship("MemoryItem", back_populates="user")
    eligibility_records = relationship("EligibilityRecord", back_populates="user")

