from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.vector import Vector


class PolicyDocument(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "policy_documents"

    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int | None] = mapped_column(BigInteger)
    content_sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    policy_level: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    policy_category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    issuing_department: Mapped[str | None] = mapped_column(String(255))
    applicable_scope: Mapped[str | None] = mapped_column(String(255), index=True)
    college: Mapped[str | None] = mapped_column(String(255), index=True)
    publish_date: Mapped[date | None] = mapped_column(Date)
    effective_from: Mapped[date | None] = mapped_column(Date, index=True)
    effective_to: Mapped[date | None] = mapped_column(Date, index=True)
    version: Mapped[str | None] = mapped_column(String(100))
    parse_status: Mapped[str] = mapped_column(String(50), default="uploaded", nullable=False, index=True)
    parse_error: Mapped[str | None] = mapped_column(Text)
    parsed_text_path: Mapped[str | None] = mapped_column(String(500))
    parsed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_type: Mapped[str | None] = mapped_column(String(50))
    source_url: Mapped[str | None] = mapped_column(String(500))
    authority_rank: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    extra_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB)

    chunks = relationship("PolicyChunk", back_populates="document", cascade="all, delete-orphan")
    attachment_links = relationship(
        "PolicyAttachment",
        back_populates="document",
        cascade="all, delete-orphan",
        foreign_keys="PolicyAttachment.document_id",
    )
    parent_attachment_links = relationship(
        "PolicyAttachment",
        back_populates="parent_document",
        foreign_keys="PolicyAttachment.parent_document_id",
    )
    source_relations = relationship(
        "PolicyRelation",
        back_populates="source_document",
        foreign_keys="PolicyRelation.source_document_id",
        cascade="all, delete-orphan",
    )
    target_relations = relationship(
        "PolicyRelation",
        back_populates="target_document",
        foreign_keys="PolicyRelation.target_document_id",
    )
    version_links = relationship(
        "PolicyVersion",
        back_populates="document",
        foreign_keys="PolicyVersion.document_id",
        cascade="all, delete-orphan",
    )
    scopes = relationship("PolicyScope", back_populates="document", cascade="all, delete-orphan")
    citations = relationship("Citation", back_populates="document")


class PolicyAttachment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "policy_attachments"

    document_id: Mapped[str] = mapped_column(ForeignKey("policy_documents.id"), nullable=False, unique=True)
    parent_document_id: Mapped[str] = mapped_column(ForeignKey("policy_documents.id"), nullable=False, index=True)
    attachment_title: Mapped[str] = mapped_column(String(255), nullable=False)
    attachment_order: Mapped[int | None] = mapped_column(Integer)

    document = relationship("PolicyDocument", back_populates="attachment_links", foreign_keys=[document_id])
    parent_document = relationship(
        "PolicyDocument",
        back_populates="parent_attachment_links",
        foreign_keys=[parent_document_id],
    )
    chunks = relationship("PolicyChunk", back_populates="attachment")
    citations = relationship("Citation", back_populates="attachment")


class PolicyRelation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "policy_relations"

    source_document_id: Mapped[str] = mapped_column(ForeignKey("policy_documents.id"), nullable=False, index=True)
    target_document_id: Mapped[str] = mapped_column(ForeignKey("policy_documents.id"), nullable=False, index=True)
    relation_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text)

    source_document = relationship(
        "PolicyDocument",
        back_populates="source_relations",
        foreign_keys=[source_document_id],
    )
    target_document = relationship(
        "PolicyDocument",
        back_populates="target_relations",
        foreign_keys=[target_document_id],
    )


class PolicyVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "policy_versions"

    document_id: Mapped[str] = mapped_column(ForeignKey("policy_documents.id"), nullable=False, index=True)
    previous_document_id: Mapped[str | None] = mapped_column(ForeignKey("policy_documents.id"))
    version_label: Mapped[str] = mapped_column(String(100), nullable=False)
    publish_date: Mapped[date | None] = mapped_column(Date)
    effective_from: Mapped[date | None] = mapped_column(Date)
    effective_to: Mapped[date | None] = mapped_column(Date)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    document = relationship("PolicyDocument", back_populates="version_links", foreign_keys=[document_id])
    previous_document = relationship("PolicyDocument", foreign_keys=[previous_document_id])


class PolicyScope(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "policy_scopes"

    document_id: Mapped[str] = mapped_column(ForeignKey("policy_documents.id"), nullable=False, index=True)
    scope_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    scope_value: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    scope_label: Mapped[str | None] = mapped_column(String(255))

    document = relationship("PolicyDocument", back_populates="scopes")


class PolicyChunk(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "policy_chunks"
    __table_args__ = (
        Index("ix_policy_chunks_search_vector", "search_vector", postgresql_using="gin"),
    )

    document_id: Mapped[str] = mapped_column(ForeignKey("policy_documents.id"), nullable=False, index=True)
    attachment_id: Mapped[str | None] = mapped_column(ForeignKey("policy_attachments.id"), index=True)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    section_title: Mapped[str | None] = mapped_column(String(255))
    article_no: Mapped[str | None] = mapped_column(String(100))
    page_no: Mapped[int | None] = mapped_column(Integer)
    policy_level: Mapped[str | None] = mapped_column(String(50), index=True)
    policy_category: Mapped[str | None] = mapped_column(String(100), index=True)
    applicable_scope: Mapped[str | None] = mapped_column(String(255), index=True)
    effective_from: Mapped[date | None] = mapped_column(Date, index=True)
    effective_to: Mapped[date | None] = mapped_column(Date, index=True)
    chunk_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB)
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    document = relationship("PolicyDocument", back_populates="chunks")
    attachment = relationship("PolicyAttachment", back_populates="chunks")
    citations = relationship("Citation", back_populates="chunk")
