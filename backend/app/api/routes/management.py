from __future__ import annotations

from datetime import datetime, time, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models import (
    AgentRun,
    AgentStepLog,
    ChatMessage,
    HotQuestion,
    MemoryItem,
    PolicyChunk,
    PolicyDocument,
    ServiceCase,
    StandardAnswer,
)
from app.schemas.agent_graph import (
    AgentGraphEdgeResponse,
    AgentGraphNodeResponse,
    AgentGraphResponse,
    AgentRunDetailResponse,
    AgentRunListItem,
    AgentStepLogResponse,
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
from app.services.agent_graph.config import AGENT_EDGE_DEFINITIONS, AGENT_NODE_DEFINITIONS, GRAPH_DESCRIPTION, GRAPH_VERSION
from app.services.policy_qa import is_valid_hot_question

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
        .limit(limit * 2)
    ).scalars()
    visible_rows = [item for item in rows if is_valid_hot_question(item.question_text)][:limit]
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
        for item in visible_rows
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


@router.get("/agent-graph", response_model=AgentGraphResponse)
def agent_graph(db: Annotated[Session, Depends(get_db)]) -> AgentGraphResponse:
    return AgentGraphResponse(
        version=GRAPH_VERSION,
        description=GRAPH_DESCRIPTION,
        nodes=[agent_node_response(db, item) for item in AGENT_NODE_DEFINITIONS],
        edges=[
            AgentGraphEdgeResponse(
                source=item["source"],
                target=item["target"],
                condition=item.get("condition"),
                condition_expression=item.get("condition_expression"),
            )
            for item in AGENT_EDGE_DEFINITIONS
        ],
    )


@router.get("/agent-nodes", response_model=list[AgentGraphNodeResponse])
def agent_nodes(db: Annotated[Session, Depends(get_db)]) -> list[AgentGraphNodeResponse]:
    return [agent_node_response(db, item) for item in AGENT_NODE_DEFINITIONS]


@router.get("/agent-runs", response_model=list[AgentRunListItem])
def agent_runs(
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[AgentRunListItem]:
    rows = db.execute(
        select(AgentRun)
        .order_by(AgentRun.started_at.desc())
        .limit(limit)
    ).scalars().all()
    return [serialize_agent_run(row) for row in rows]


@router.get("/agent-runs/{run_id}", response_model=AgentRunDetailResponse)
def agent_run_detail(
    run_id: str,
    db: Annotated[Session, Depends(get_db)],
) -> AgentRunDetailResponse:
    run = db.get(AgentRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Agent 运行记录不存在")

    steps = db.execute(
        select(AgentStepLog)
        .where(AgentStepLog.run_id == run.id)
        .order_by(AgentStepLog.started_at.asc())
    ).scalars().all()
    return AgentRunDetailResponse(
        run=serialize_agent_run(run),
        steps=[
            AgentStepLogResponse(
                id=str(step.id),
                node_key=step.node_key,
                node_name=step.node_name,
                status=step.status,
                input_summary=step.input_summary,
                output_summary=step.output_summary,
                started_at=step.started_at,
                finished_at=step.finished_at,
                duration_ms=step.duration_ms,
                error_message=step.error_message,
            )
            for step in steps
        ],
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


def agent_node_response(db: Session, item: dict) -> AgentGraphNodeResponse:
    call_count = scalar_count(
        db,
        select(func.count(AgentStepLog.id)).where(AgentStepLog.node_key == item["id"]),
    )
    avg_duration = db.execute(
        select(func.avg(AgentStepLog.duration_ms)).where(
            AgentStepLog.node_key == item["id"],
            AgentStepLog.status == "success",
        )
    ).scalar()
    failure_count = scalar_count(
        db,
        select(func.count(AgentStepLog.id)).where(
            AgentStepLog.node_key == item["id"],
            AgentStepLog.status == "failed",
        ),
    )
    last_failure = db.execute(
        select(AgentStepLog)
        .where(
            AgentStepLog.node_key == item["id"],
            AgentStepLog.status == "failed",
        )
        .order_by(AgentStepLog.started_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    return AgentGraphNodeResponse(
        id=item["id"],
        label=item["label"],
        type=item["type"],
        description=item.get("description"),
        input_keys=item.get("input_keys"),
        output_keys=item.get("output_keys"),
        enabled=True,
        call_count=call_count,
        average_duration_ms=int(avg_duration or 0) if avg_duration is not None else None,
        failure_count=failure_count,
        last_failure_message=last_failure.error_message if last_failure else None,
        last_failure_at=last_failure.started_at if last_failure else None,
    )


def serialize_agent_run(run: AgentRun) -> AgentRunListItem:
    return AgentRunListItem(
        run_id=str(run.id),
        session_id=str(run.session_id) if run.session_id else None,
        question=run.question,
        intent=run.intent,
        case_type=run.case_type,
        status=run.status,
        risk_level=run.risk_level,
        started_at=run.started_at,
        finished_at=run.finished_at,
        duration_ms=run.duration_ms,
    )


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
