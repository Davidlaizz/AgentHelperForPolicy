from __future__ import annotations

from datetime import datetime, time, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.digital_village.config import dv_settings
from app.digital_village.db.dependencies import get_digital_village_db
from app.digital_village.services.agent_graph_config import (
    DV_AGENT_EDGE_DEFINITIONS,
    DV_AGENT_NODE_DEFINITIONS,
    DV_GRAPH_DESCRIPTION,
    DV_GRAPH_VERSION,
)
from app.models import (
    AgentRun,
    AgentStepLog,
    ChatMessage,
    HotQuestion,
    PolicyChunk,
    PolicyDocument,
    StandardAnswer,
)
from app.models.digital_village import AgricultureDiagnosis, DVServiceCase
from app.schemas.agent_graph import (
    AgentGraphEdgeResponse,
    AgentGraphNodeResponse,
    AgentGraphResponse,
    AgentRunDetailResponse,
    AgentRunListItem,
    AgentStepLogResponse,
)
from app.schemas.digital_village import (
    AgricultureDiagnosisCreateRequest,
    AgricultureDiagnosisResponse,
    AgricultureDiagnosisUpdateRequest,
    ServiceCaseCreateRequest,
    ServiceCaseResponse,
    ServiceCaseUpdateRequest,
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
    AgentGovernanceConfigResponse,
    ModelServiceConfigResponse,
    ModelServicePresetResponse,
    ModelServiceUpdateRequest,
    RagServiceConfigResponse,
    SystemConfigResponse,
)

router = APIRouter(tags=["digital-village-management"])

MODEL_SERVICE_PRESETS = [
    {
        "id": "mock",
        "label": "Mock (Demo)",
        "provider": "mock",
        "model": "mock-policy-qa-v1",
        "api_url": None,
        "description": "Mock LLM for quick demo and testing.",
        "keep_current_api_key": True,
        "max_tokens": None,
        "timeout_seconds": 90,
        "thinking_type": "disabled",
    },
    {
        "id": "glm-4.6",
        "label": "Zhipu GLM-4.6",
        "provider": "http",
        "model": "glm-4.6",
        "api_url": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        "description": "智谱 GLM-4.6 模型，复用当前 API 地址。",
        "keep_current_api_key": True,
        "max_tokens": 1200,
        "timeout_seconds": 180,
        "thinking_type": "disabled",
    },
]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/management/dashboard", response_model=DashboardResponse)
def dashboard(
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> DashboardResponse:
    today_start = datetime.combine(
        datetime.now(timezone.utc).date(), time.min, tzinfo=timezone.utc
    )

    return DashboardResponse(
        document_count=_count(db, PolicyDocument),
        active_document_count=_count(
            db, PolicyDocument, PolicyDocument.is_active.is_(True)
        ),
        parsed_document_count=_count(
            db,
            PolicyDocument,
            PolicyDocument.parse_status.in_(["parsed", "indexed"]),
        ),
        chunk_count=_count(db, PolicyChunk),
        today_question_count=_count(
            db, ChatMessage,
            ChatMessage.role == "user",
            ChatMessage.created_at >= today_start,
        ),
        hot_question_count=_count(db, HotQuestion),
        standard_answer_count=_count(db, StandardAnswer),
        high_risk_answer_count=_count_high_risk_answers(db),
        service_case_count=_count(db, DVServiceCase, DVServiceCase.status == "active"),
        memory_item_count=0,
        top_policy_categories=_top_categories(db),
        top_case_types=_top_case_types(db),
    )


# ---------------------------------------------------------------------------
# Hot Questions
# ---------------------------------------------------------------------------

@router.get("/management/hot-questions", response_model=list[HotQuestionResponse])
def list_hot_questions(
    db: Annotated[Session, Depends(get_digital_village_db)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[HotQuestionResponse]:
    rows = db.execute(
        select(HotQuestion)
        .order_by(HotQuestion.hit_count.desc(), HotQuestion.last_asked_at.desc())
        .limit(max(1, limit * 2))
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
        for item in list(rows)[:limit]
    ]


# ---------------------------------------------------------------------------
# Standard Answers
# ---------------------------------------------------------------------------

@router.get("/management/standard-answers", response_model=list[StandardAnswerResponse])
def list_standard_answers(
    db: Annotated[Session, Depends(get_digital_village_db)],
    status_filter: str | None = None,
) -> list[StandardAnswerResponse]:
    stmt = select(StandardAnswer).order_by(StandardAnswer.updated_at.desc())
    if status_filter:
        stmt = stmt.where(StandardAnswer.status == status_filter)
    rows = db.execute(stmt).scalars().all()
    return [_serialize_sa(item) for item in rows]


@router.post(
    "/management/standard-answers",
    response_model=StandardAnswerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_standard_answer(
    payload: StandardAnswerCreateRequest,
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> StandardAnswerResponse:
    answer = StandardAnswer(**payload.model_dump())
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return _serialize_sa(answer)


@router.patch(
    "/management/standard-answers/{answer_id}",
    response_model=StandardAnswerResponse,
)
def update_standard_answer(
    answer_id: str,
    payload: StandardAnswerUpdateRequest,
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> StandardAnswerResponse:
    answer = db.get(StandardAnswer, answer_id)
    if answer is None:
        raise HTTPException(status_code=404, detail="Standard answer not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(answer, field, value)
    db.commit()
    db.refresh(answer)
    return _serialize_sa(answer)


@router.delete(
    "/management/standard-answers/{answer_id}",
    response_model=StandardAnswerResponse,
)
def disable_standard_answer(
    answer_id: str,
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> StandardAnswerResponse:
    answer = db.get(StandardAnswer, answer_id)
    if answer is None:
        raise HTTPException(status_code=404, detail="Standard answer not found")
    answer.status = "disabled"
    db.commit()
    db.refresh(answer)
    return _serialize_sa(answer)


# ---------------------------------------------------------------------------
# Policy Chunks
# ---------------------------------------------------------------------------

@router.get("/management/policy-chunks", response_model=PolicyChunkListResponse)
def list_policy_chunks(
    db: Annotated[Session, Depends(get_digital_village_db)],
    document_id: str | None = None,
    query: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PolicyChunkListResponse:
    conditions: list = []
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
    total = _count(db, PolicyChunk, *conditions)
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
        results=[_serialize_chunk(c, d) for c, d in rows],
    )


# ---------------------------------------------------------------------------
# System Config
# ---------------------------------------------------------------------------

@router.get("/management/system-config", response_model=SystemConfigResponse)
def system_config() -> SystemConfigResponse:
    return _build_system_config()


@router.patch(
    "/management/system-config/model-service",
    response_model=SystemConfigResponse,
)
def update_model_service(
    payload: ModelServiceUpdateRequest,
) -> SystemConfigResponse:
    _update_dv_llm_runtime(payload)
    return _build_system_config()


# ---------------------------------------------------------------------------
# Agent Graph (multi-node)
# ---------------------------------------------------------------------------

@router.get("/management/agent-graph", response_model=AgentGraphResponse)
def agent_graph(
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> AgentGraphResponse:
    return AgentGraphResponse(
        version=DV_GRAPH_VERSION,
        description=DV_GRAPH_DESCRIPTION,
        nodes=[_dv_agent_node_response(db, item) for item in DV_AGENT_NODE_DEFINITIONS],
        edges=[
            AgentGraphEdgeResponse(
                source=item["source"],
                target=item["target"],
                condition=item.get("condition"),
            )
            for item in DV_AGENT_EDGE_DEFINITIONS
        ],
    )


@router.get("/management/agent-nodes", response_model=list[AgentGraphNodeResponse])
def agent_nodes(
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> list[AgentGraphNodeResponse]:
    return [_dv_agent_node_response(db, item) for item in DV_AGENT_NODE_DEFINITIONS]


@router.get("/management/agent-runs", response_model=list[AgentRunListItem])
def agent_runs(
    db: Annotated[Session, Depends(get_digital_village_db)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[AgentRunListItem]:
    rows = db.execute(
        select(AgentRun)
        .order_by(AgentRun.started_at.desc())
        .limit(limit)
    ).scalars().all()
    return [_serialize_agent_run(row) for row in rows]


@router.get("/management/agent-runs/{run_id}", response_model=AgentRunDetailResponse)
def agent_run_detail(
    run_id: str,
    db: Annotated[Session, Depends(get_digital_village_db)],
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
        run=_serialize_agent_run(run),
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


# ---------------------------------------------------------------------------
# Service Cases
# ---------------------------------------------------------------------------

@router.get("/management/service-cases", response_model=list[ServiceCaseResponse])
def list_service_cases(
    db: Annotated[Session, Depends(get_digital_village_db)],
    case_type: str | None = None,
    status_filter: str | None = None,
) -> list[ServiceCaseResponse]:
    stmt = select(DVServiceCase).order_by(DVServiceCase.created_at.desc())
    if case_type:
        stmt = stmt.where(DVServiceCase.case_type == case_type)
    if status_filter:
        stmt = stmt.where(DVServiceCase.status == status_filter)
    rows = db.execute(stmt).scalars().all()
    return [ServiceCaseResponse.model_validate(row) for row in rows]


@router.post(
    "/management/service-cases",
    response_model=ServiceCaseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_service_case(
    payload: ServiceCaseCreateRequest,
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> ServiceCaseResponse:
    case = DVServiceCase(**payload.model_dump())
    db.add(case)
    db.commit()
    db.refresh(case)
    return ServiceCaseResponse.model_validate(case)


@router.patch(
    "/management/service-cases/{case_id}",
    response_model=ServiceCaseResponse,
)
def update_service_case(
    case_id: str,
    payload: ServiceCaseUpdateRequest,
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> ServiceCaseResponse:
    case = db.get(DVServiceCase, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="事项不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(case, field, value)
    db.commit()
    db.refresh(case)
    return ServiceCaseResponse.model_validate(case)


@router.delete(
    "/management/service-cases/{case_id}",
    response_model=ServiceCaseResponse,
)
def disable_service_case(
    case_id: str,
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> ServiceCaseResponse:
    case = db.get(DVServiceCase, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="事项不存在")
    case.status = "disabled"
    db.commit()
    db.refresh(case)
    return ServiceCaseResponse.model_validate(case)


# ---------------------------------------------------------------------------
# Agriculture Diagnosis
# ---------------------------------------------------------------------------

@router.get("/management/agriculture-diagnoses", response_model=list[AgricultureDiagnosisResponse])
def list_agriculture_diagnoses(
    db: Annotated[Session, Depends(get_digital_village_db)],
    category: str | None = None,
    status_filter: str | None = None,
) -> list[AgricultureDiagnosisResponse]:
    stmt = select(AgricultureDiagnosis).order_by(AgricultureDiagnosis.created_at.desc())
    if category:
        stmt = stmt.where(AgricultureDiagnosis.category == category)
    if status_filter:
        stmt = stmt.where(AgricultureDiagnosis.status == status_filter)
    rows = db.execute(stmt).scalars().all()
    return [AgricultureDiagnosisResponse.model_validate(row) for row in rows]


@router.post(
    "/management/agriculture-diagnoses",
    response_model=AgricultureDiagnosisResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_agriculture_diagnosis(
    payload: AgricultureDiagnosisCreateRequest,
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> AgricultureDiagnosisResponse:
    diagnosis = AgricultureDiagnosis(**payload.model_dump())
    db.add(diagnosis)
    db.commit()
    db.refresh(diagnosis)
    return AgricultureDiagnosisResponse.model_validate(diagnosis)


@router.patch(
    "/management/agriculture-diagnoses/{diagnosis_id}",
    response_model=AgricultureDiagnosisResponse,
)
def update_agriculture_diagnosis(
    diagnosis_id: str,
    payload: AgricultureDiagnosisUpdateRequest,
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> AgricultureDiagnosisResponse:
    diagnosis = db.get(AgricultureDiagnosis, diagnosis_id)
    if diagnosis is None:
        raise HTTPException(status_code=404, detail="诊断记录不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(diagnosis, field, value)
    db.commit()
    db.refresh(diagnosis)
    return AgricultureDiagnosisResponse.model_validate(diagnosis)


@router.delete(
    "/management/agriculture-diagnoses/{diagnosis_id}",
    response_model=AgricultureDiagnosisResponse,
)
def disable_agriculture_diagnosis(
    diagnosis_id: str,
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> AgricultureDiagnosisResponse:
    diagnosis = db.get(AgricultureDiagnosis, diagnosis_id)
    if diagnosis is None:
        raise HTTPException(status_code=404, detail="诊断记录不存在")
    diagnosis.status = "disabled"
    db.commit()
    db.refresh(diagnosis)
    return AgricultureDiagnosisResponse.model_validate(diagnosis)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _count(db: Session, model, *filters) -> int:
    stmt = select(func.count(model.id if hasattr(model, "id") else "*"))
    if filters:
        stmt = stmt.where(*filters)
    return int(db.execute(stmt).scalar_one() or 0)


def _top_categories(db: Session) -> list[CategoryCount]:
    rows = db.execute(
        select(PolicyDocument.policy_category, func.count(PolicyDocument.id))
        .group_by(PolicyDocument.policy_category)
        .order_by(func.count(PolicyDocument.id).desc())
        .limit(5)
    ).all()
    return [CategoryCount(name=name or "Uncategorized", count=int(cnt)) for name, cnt in rows]


def _top_case_types(db: Session) -> list[CategoryCount]:
    rows = db.execute(
        select(DVServiceCase.case_type, func.count(DVServiceCase.id))
        .where(DVServiceCase.status == "active")
        .group_by(DVServiceCase.case_type)
        .order_by(func.count(DVServiceCase.id).desc())
        .limit(5)
    ).all()
    return [CategoryCount(name=name or "unknown", count=int(cnt)) for name, cnt in rows]


def _count_high_risk_answers(db: Session) -> int:
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


def _serialize_sa(answer: StandardAnswer) -> StandardAnswerResponse:
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


def _serialize_chunk(
    chunk: PolicyChunk, document: PolicyDocument
) -> PolicyChunkAdminResponse:
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


def _secret_status(value: str | None) -> str:
    return "configured" if value else "missing"


def _mask_secret(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}...{value[-4:]}"


def _dv_agent_node_response(db: Session, item: dict) -> AgentGraphNodeResponse:
    call_count = _count(
        db,
        AgentStepLog,
        AgentStepLog.node_key == item["id"],
    )
    avg_duration = db.execute(
        select(func.avg(AgentStepLog.duration_ms)).where(
            AgentStepLog.node_key == item["id"],
            AgentStepLog.status == "success",
        )
    ).scalar()
    failure_count = _count(
        db,
        AgentStepLog,
        AgentStepLog.node_key == item["id"],
        AgentStepLog.status == "failed",
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


def _serialize_agent_run(run: AgentRun) -> AgentRunListItem:
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


def _build_system_config() -> SystemConfigResponse:
    return SystemConfigResponse(
        model_service=ModelServiceConfigResponse(
            provider=dv_settings.dv_llm_provider,
            model=dv_settings.dv_llm_model,
            api_url=dv_settings.dv_llm_api_url,
            api_key_status=_secret_status(dv_settings.dv_llm_api_key),
            api_key_masked=_mask_secret(dv_settings.dv_llm_api_key),
            max_tokens=dv_settings.dv_llm_max_tokens,
            timeout_seconds=dv_settings.dv_llm_timeout_seconds,
            thinking_type=dv_settings.dv_llm_thinking_type,
            compatible_protocol="OpenAI-compatible Chat Completions",
            editable_fields=[
                "DV_LLM_PROVIDER", "DV_LLM_MODEL", "DV_LLM_API_URL",
                "DV_LLM_API_KEY", "DV_LLM_MAX_TOKENS",
                "DV_LLM_TIMEOUT_SECONDS", "DV_LLM_THINKING_TYPE",
            ],
            available_presets=[
                ModelServicePresetResponse(
                    id=p["id"], label=p["label"], provider=p["provider"],
                    model=p["model"], api_url=p["api_url"],
                    description=p["description"],
                    keep_current_api_key=p["keep_current_api_key"],
                )
                for p in MODEL_SERVICE_PRESETS
            ],
        ),
        rag_service=RagServiceConfigResponse(
            embedding_provider=dv_settings.dv_embedding_provider,
            embedding_model=dv_settings.dv_embedding_model,
            embedding_dimensions=dv_settings.dv_embedding_dimensions,
            embedding_api_url=dv_settings.dv_embedding_api_url,
            embedding_api_key_status=_secret_status(dv_settings.dv_embedding_api_key),
            embedding_api_key_masked=_mask_secret(dv_settings.dv_embedding_api_key),
            vector_schema=dv_settings.dv_llamaindex_schema,
            vector_table=dv_settings.dv_llamaindex_vector_table,
            editable_fields=[
                "DV_EMBEDDING_PROVIDER", "DV_EMBEDDING_MODEL",
                "DV_EMBEDDING_DIMENSIONS", "DV_LLAMAINDEX_SCHEMA",
                "DV_LLAMAINDEX_VECTOR_TABLE",
            ],
        ),
        agent_governance=AgentGovernanceConfigResponse(
            graph_version=DV_GRAPH_VERSION,
            node_count=len(DV_AGENT_NODE_DEFINITIONS),
            edge_count=len(DV_AGENT_EDGE_DEFINITIONS),
            orchestration_framework="LangGraph multi-agent (digital village)",
            editable_items=["节点启停", "Prompt 版本", "风险阈值", "兜底策略"],
            runtime_observability=True,
        ),
        edit_mode="runtime_hot_update",
        edit_note=(
            "数字乡村运行时配置。热更新立即生效；"
            "重启后以 backend/.env DV_* 变量为准。"
        ),
        updated_at=datetime.now(timezone.utc),
    )


def _update_dv_llm_runtime(payload: ModelServiceUpdateRequest) -> None:
    if payload.provider and payload.provider not in {"mock", "http"}:
        raise HTTPException(
            status_code=400, detail=f"Unsupported LLM provider: {payload.provider}"
        )

    if payload.provider:
        dv_settings.dv_llm_provider = payload.provider
    if payload.model:
        dv_settings.dv_llm_model = payload.model
    if payload.api_url is not None:
        dv_settings.dv_llm_api_url = payload.api_url.strip() or None
    if payload.api_key is not None:
        dv_settings.dv_llm_api_key = payload.api_key.strip() or None
    if payload.max_tokens is not None:
        dv_settings.dv_llm_max_tokens = payload.max_tokens
    if payload.timeout_seconds is not None:
        dv_settings.dv_llm_timeout_seconds = payload.timeout_seconds
    if payload.thinking_type is not None:
        dv_settings.dv_llm_thinking_type = payload.thinking_type.strip() or None
    if payload.clear_api_key:
        dv_settings.dv_llm_api_key = None
