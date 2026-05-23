from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AgentGraphVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "agent_graph_versions"

    version: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False, index=True)

    nodes = relationship("AgentNode", back_populates="graph_version", cascade="all, delete-orphan")
    edges = relationship("AgentEdge", back_populates="graph_version", cascade="all, delete-orphan")


class AgentNode(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "agent_nodes"

    graph_version_id: Mapped[str | None] = mapped_column(ForeignKey("agent_graph_versions.id"), index=True)
    node_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    node_name: Mapped[str] = mapped_column(String(120), nullable=False)
    node_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    input_keys: Mapped[list | dict | None] = mapped_column(JSONB)
    output_keys: Mapped[list | dict | None] = mapped_column(JSONB)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    graph_version = relationship("AgentGraphVersion", back_populates="nodes")


class AgentEdge(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "agent_edges"

    graph_version_id: Mapped[str | None] = mapped_column(ForeignKey("agent_graph_versions.id"), index=True)
    source_node_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_node_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    condition_label: Mapped[str | None] = mapped_column(String(255))
    condition_expression: Mapped[str | None] = mapped_column(Text)

    graph_version = relationship("AgentGraphVersion", back_populates="edges")


class AgentRun(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "agent_runs"

    graph_version: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[str | None] = mapped_column(ForeignKey("chat_sessions.id"), index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[str | None] = mapped_column(String(100), index=True)
    case_type: Mapped[str | None] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(50), default="running", nullable=False, index=True)
    risk_level: Mapped[str | None] = mapped_column(String(50), index=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    error_message: Mapped[str | None] = mapped_column(Text)

    steps = relationship("AgentStepLog", back_populates="run", cascade="all, delete-orphan")


class AgentStepLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "agent_step_logs"

    run_id: Mapped[str] = mapped_column(ForeignKey("agent_runs.id"), nullable=False, index=True)
    node_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    node_name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    input_summary: Mapped[str | None] = mapped_column(Text)
    output_summary: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    run = relationship("AgentRun", back_populates="steps")
