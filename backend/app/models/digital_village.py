from __future__ import annotations

from datetime import datetime

from sqlalchemy import String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class DVServiceCase(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "dv_service_cases"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    case_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subject: Mapped[str | None] = mapped_column(String(255))
    region: Mapped[str | None] = mapped_column(String(255))
    stage: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    materials: Mapped[list | dict | None] = mapped_column(JSONB)
    steps: Mapped[list | dict | None] = mapped_column(JSONB)
    department: Mapped[str | None] = mapped_column(String(255))
    risk: Mapped[str | None] = mapped_column(Text)
    tips: Mapped[list | dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False, index=True)


class AgricultureDiagnosis(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "dv_agriculture_diagnoses"

    problem: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    diagnosis: Mapped[str | None] = mapped_column(Text)
    solution: Mapped[str | None] = mapped_column(Text)
    digital_direction: Mapped[str | None] = mapped_column(Text)
    policy_links: Mapped[list | dict | None] = mapped_column(JSONB)
    pain_points: Mapped[list | dict | None] = mapped_column(JSONB)
    actors: Mapped[list | dict | None] = mapped_column(JSONB)
    steps: Mapped[list | dict | None] = mapped_column(JSONB)
    metrics: Mapped[list | dict | None] = mapped_column(JSONB)
    risks: Mapped[list | dict | None] = mapped_column(JSONB)
    project_value: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False, index=True)
