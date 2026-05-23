from __future__ import annotations

from datetime import datetime, time, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models import (
    ChatMessage,
    HotQuestion,
    MemoryItem,
    PolicyChunk,
    PolicyDocument,
    ServiceCase,
    StandardAnswer,
)
from app.schemas.management import (
    CategoryCount,
    DashboardResponse,
    HotQuestionResponse,
    PolicyChunkAdminResponse,
    PolicyChunkListResponse,
    StandardAnswerCreateRequest,
    StandardAnswerResponse,
    StandardAnswerUpdateRequest,
)

router = APIRouter(prefix="/management", tags=["management"])


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(db: Annotated[Session, Depends(get_db)]) -> DashboardResponse:
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min, tzinfo=timezone.utc)

    document_count = scalar_count(db, select(func.count(PolicyDocument.id)))
    active_document_count = scalar_count(
        db,
        select(func.count(PolicyDocument.id)).where(PolicyDocument.is_active.is_(True)),
    )
    parsed_document_count = scalar_count(
        db,
        select(func.count(PolicyDocument.id)).where(
            PolicyDocument.parse_status.in_(["parsed", "indexed"])
        ),
    )
    chunk_count = scalar_count(db, select(func.count(PolicyChunk.id)))
    today_question_count = scalar_count(
        db,
        select(func.count(ChatMessage.id)).where(
            ChatMessage.role == "user",
            ChatMessage.created_at >= today_start,
        ),
    )
    hot_question_count = scalar_count(db, select(func.count(HotQuestion.id)))
    standard_answer_count = scalar_count(db, select(func.count(StandardAnswer.id)))
    service_case_count = scalar_count(db, select(func.count(ServiceCase.id)))
    memory_item_count = scalar_count(db, select(func.count(MemoryItem.id)))

    return DashboardResponse(
        document_count=document_count,
        active_document_count=active_document_count,
        parsed_document_count=parsed_document_count,
        chunk_count=chunk_count,
        today_question_count=today_question_count,
        hot_question_count=hot_question_count,
        standard_answer_count=standard_answer_count,
        high_risk_answer_count=count_high_risk_answers(db),
        service_case_count=service_case_count,
        memory_item_count=memory_item_count,
        top_policy_categories=top_policy_categories(db),
        top_case_types=top_case_types(db),
    )


@router.get("/hot-questions", response_model=list[HotQuestionResponse])
def list_hot_questions(
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[HotQuestionResponse]:
    rows = db.execute(
        select(HotQuestion)
        .order_by(HotQuestion.hit_count.desc(), HotQuestion.last_asked_at.desc())
        .limit(limit)
    ).scalars()
    return [
        HotQuestionResponse(
            id=str(item.id),
            question_text=item.question_text,
            normalized_question=item.normalized_question,
            policy_category=item.policy_category,
            hit_count=item.hit_count,
            last_asked_at=item.last_asked_at,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in rows
    ]


@router.get("/standard-answers", response_model=list[StandardAnswerResponse])
def list_standard_answers(
    db: Annotated[Session, Depends(get_db)],
    status_filter: str | None = None,
) -> list[StandardAnswerResponse]:
    statement = select(StandardAnswer).order_by(StandardAnswer.updated_at.desc())
    if status_filter:
        statement = statement.where(StandardAnswer.status == status_filter)
    rows = db.execute(statement).scalars().all()
    return [serialize_standard_answer(item) for item in rows]


@router.post(
    "/standard-answers",
    response_model=StandardAnswerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_standard_answer(
    payload: StandardAnswerCreateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> StandardAnswerResponse:
    answer = StandardAnswer(**payload.model_dump())
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return serialize_standard_answer(answer)


@router.patch("/standard-answers/{answer_id}", response_model=StandardAnswerResponse)
def update_standard_answer(
    answer_id: str,
    payload: StandardAnswerUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> StandardAnswerResponse:
    answer = db.get(StandardAnswer, answer_id)
    if answer is None:
        raise HTTPException(status_code=404, detail="标准答案不存在")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(answer, field, value)
    db.commit()
    db.refresh(answer)
    return serialize_standard_answer(answer)


@router.delete("/standard-answers/{answer_id}", response_model=StandardAnswerResponse)
def disable_standard_answer(
    answer_id: str,
    db: Annotated[Session, Depends(get_db)],
) -> StandardAnswerResponse:
    answer = db.get(StandardAnswer, answer_id)
    if answer is None:
        raise HTTPException(status_code=404, detail="标准答案不存在")
    answer.status = "disabled"
    db.commit()
    db.refresh(answer)
    return serialize_standard_answer(answer)


@router.get("/policy-chunks", response_model=PolicyChunkListResponse)
def list_policy_chunks(
    db: Annotated[Session, Depends(get_db)],
    document_id: str | None = None,
    query: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PolicyChunkListResponse:
    conditions = []
    if document_id:
        conditions.append(PolicyChunk.document_id == document_id)
    if query:
        like = f"%{query}%"
        conditions.append(
            or_(
                PolicyChunk.chunk_text.ilike(like),
                PolicyChunk.section_title.ilike(like),
                PolicyChunk.article_no.ilike(like),
            )
        )

    total = scalar_count(db, select(func.count(PolicyChunk.id)).where(*conditions))
    rows = db.execute(
        select(PolicyChunk, PolicyDocument)
        .join(PolicyDocument, PolicyDocument.id == PolicyChunk.document_id)
        .where(*conditions)
        .order_by(PolicyDocument.title.asc(), PolicyChunk.chunk_index.asc())
        .offset(offset)
        .limit(limit)
    ).all()

    return PolicyChunkListResponse(
        total=total,
        limit=limit,
        offset=offset,
        results=[serialize_chunk(chunk, document) for chunk, document in rows],
    )


def scalar_count(db: Session, statement) -> int:
    return int(db.execute(statement).scalar_one() or 0)


def count_high_risk_answers(db: Session) -> int:
    rows = db.execute(
        select(ChatMessage.extra_metadata).where(
            ChatMessage.role == "assistant",
            ChatMessage.extra_metadata.is_not(None),
        )
    ).scalars()
    count = 0
    for metadata in rows:
        if (((metadata or {}).get("agent") or {}).get("risk") or {}).get("risk_level") == "high":
            count += 1
    return count


def top_policy_categories(db: Session) -> list[CategoryCount]:
    rows = db.execute(
        select(PolicyDocument.policy_category, func.count(PolicyDocument.id))
        .group_by(PolicyDocument.policy_category)
        .order_by(func.count(PolicyDocument.id).desc())
        .limit(5)
    ).all()
    return [CategoryCount(name=name or "未分类", count=int(count)) for name, count in rows]


def top_case_types(db: Session) -> list[CategoryCount]:
    rows = db.execute(
        select(ServiceCase.case_type, func.count(ServiceCase.id))
        .group_by(ServiceCase.case_type)
        .order_by(func.count(ServiceCase.id).desc())
        .limit(5)
    ).all()
    return [CategoryCount(name=name or "unknown", count=int(count)) for name, count in rows]


def serialize_standard_answer(answer: StandardAnswer) -> StandardAnswerResponse:
    return StandardAnswerResponse(
        id=str(answer.id),
        title=answer.title,
        policy_category=answer.policy_category,
        question_keywords=answer.question_keywords,
        applicable_scope=answer.applicable_scope,
        answer_content=answer.answer_content,
        status=answer.status,
        created_at=answer.created_at,
        updated_at=answer.updated_at,
    )


def serialize_chunk(chunk: PolicyChunk, document: PolicyDocument) -> PolicyChunkAdminResponse:
    return PolicyChunkAdminResponse(
        chunk_id=str(chunk.id),
        document_id=str(document.id),
        document_title=document.title,
        file_name=document.file_name,
        chunk_index=chunk.chunk_index,
        chunk_text=chunk.chunk_text,
        section_title=chunk.section_title,
        article_no=chunk.article_no,
        page_no=chunk.page_no,
        policy_level=chunk.policy_level,
        policy_category=chunk.policy_category,
        applicable_scope=chunk.applicable_scope,
        effective_from=chunk.effective_from.isoformat() if chunk.effective_from else None,
        effective_to=chunk.effective_to.isoformat() if chunk.effective_to else None,
        metadata=chunk.chunk_metadata or {},
    )
