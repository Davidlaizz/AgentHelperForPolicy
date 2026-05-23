from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import CaseSlot, ChatMessage, MemoryItem


@dataclass
class MemorySnapshot:
    short_term: dict[str, Any]
    case_memory: dict[str, Any]
    long_term: dict[str, Any]
    recent_messages: list[dict[str, str]]


def read_memory_snapshot(
    db: Session,
    *,
    user_id: str,
    session_id: str,
    case_id: str | None,
    message_limit: int = 8,
) -> MemorySnapshot:
    now = datetime.now(timezone.utc)

    short_term = read_memory_items(
        db,
        memory_scope="short_term",
        user_id=user_id,
        session_id=session_id,
        now=now,
    )
    case_memory = (
        read_memory_items(
            db,
            memory_scope="case",
            user_id=user_id,
            case_id=case_id,
            now=now,
        )
        if case_id
        else {}
    )
    long_term = read_memory_items(
        db,
        memory_scope="long_term",
        user_id=user_id,
        now=now,
    )

    messages = db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(message_limit)
    ).scalars()
    recent_messages = [
        {"role": item.role, "content": item.content}
        for item in reversed(list(messages))
    ]

    return MemorySnapshot(
        short_term=short_term,
        case_memory=case_memory,
        long_term=long_term,
        recent_messages=recent_messages,
    )


def read_memory_items(
    db: Session,
    *,
    memory_scope: str,
    user_id: str,
    now: datetime,
    session_id: str | None = None,
    case_id: str | None = None,
) -> dict[str, Any]:
    conditions = [
        MemoryItem.memory_scope == memory_scope,
        or_(MemoryItem.expires_at.is_(None), MemoryItem.expires_at > now),
    ]
    if user_id:
        conditions.append(or_(MemoryItem.user_id == user_id, MemoryItem.user_id.is_(None)))
    if session_id:
        conditions.append(MemoryItem.session_id == session_id)
    if case_id:
        conditions.append(MemoryItem.case_id == case_id)

    rows = db.execute(
        select(MemoryItem)
        .where(*conditions)
        .order_by(MemoryItem.updated_at.desc())
    ).scalars()

    values: dict[str, Any] = {}
    for row in rows:
        if row.memory_key not in values:
            values[row.memory_key] = normalize_json_value(row.value)
    return values


def upsert_memory_item(
    db: Session,
    *,
    memory_scope: str,
    memory_type: str,
    memory_key: str,
    value: Any,
    user_id: str | None = None,
    session_id: str | None = None,
    case_id: str | None = None,
    source: str = "agent",
    confidence: float = 0.8,
) -> MemoryItem:
    existing = db.execute(
        select(MemoryItem).where(
            MemoryItem.memory_scope == memory_scope,
            MemoryItem.memory_type == memory_type,
            MemoryItem.memory_key == memory_key,
            MemoryItem.user_id.is_(None) if user_id is None else MemoryItem.user_id == user_id,
            MemoryItem.session_id.is_(None) if session_id is None else MemoryItem.session_id == session_id,
            MemoryItem.case_id.is_(None) if case_id is None else MemoryItem.case_id == case_id,
        )
    ).scalar_one_or_none()

    if existing is None:
        existing = MemoryItem(
            user_id=user_id,
            session_id=session_id,
            case_id=case_id,
            memory_scope=memory_scope,
            memory_type=memory_type,
            memory_key=memory_key,
        )
        db.add(existing)

    existing.value = value
    existing.source = source
    existing.confidence = confidence
    db.flush()
    return existing


def record_memory_item(
    db: Session,
    *,
    memory_scope: str,
    memory_type: str,
    memory_key: str,
    value: Any,
    user_id: str | None = None,
    session_id: str | None = None,
    case_id: str | None = None,
    source: str = "agent",
    confidence: float = 0.8,
) -> MemoryItem:
    item = MemoryItem(
        user_id=user_id,
        session_id=session_id,
        case_id=case_id,
        memory_scope=memory_scope,
        memory_type=memory_type,
        memory_key=memory_key,
        value=value,
        source=source,
        confidence=confidence,
    )
    db.add(item)
    db.flush()
    return item


def upsert_case_slot(
    db: Session,
    *,
    case_id: str,
    slot_key: str,
    slot_name: str,
    value: Any = None,
    status: str = "missing",
    question: str | None = None,
    required: bool = True,
) -> CaseSlot:
    slot = db.execute(
        select(CaseSlot).where(
            CaseSlot.case_id == case_id,
            CaseSlot.slot_key == slot_key,
        )
    ).scalar_one_or_none()

    if slot is None:
        slot = CaseSlot(
            case_id=case_id,
            slot_key=slot_key,
            slot_name=slot_name,
        )
        db.add(slot)

    slot.value = value
    slot.status = status
    slot.question = question
    slot.required = required
    db.flush()
    return slot


def normalize_json_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    return value
