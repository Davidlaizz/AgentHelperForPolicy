from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CaseSlot, ChatMessage, ChatSession, EligibilityRecord, ServiceCase
from app.schemas.agent import (
    AgentCaseResponse,
    AgentEligibilityResponse,
    AgentResponse,
    AgentRiskResponse,
    AgentSlotStatus,
)
from app.services.agent.rules import (
    CASE_SLOT_DEFINITIONS,
    CASE_TITLES,
    INTENT_ELIGIBILITY,
    INTENT_MATERIAL,
    INTENT_WORKFLOW,
    build_material_list,
    build_workflow_steps,
    classify_intent,
    detect_case_type,
    extract_slots,
)
from app.services.memory import (
    MemorySnapshot,
    read_memory_snapshot,
    record_memory_item,
    upsert_case_slot,
    upsert_memory_item,
)


@dataclass
class AgentRunState:
    intent: str
    case_type: str
    memory: MemorySnapshot
    case: ServiceCase | None = None
    slots: list[CaseSlot] = field(default_factory=list)
    extracted_slots: dict[str, Any] = field(default_factory=dict)
    memory_updates: list[str] = field(default_factory=list)

    @property
    def missing_slots(self) -> list[CaseSlot]:
        return [
            slot
            for slot in self.slots
            if slot.required and slot.status == "missing"
        ]


class AgentOrchestrator:
    def prepare(
        self,
        db: Session,
        *,
        chat_session: ChatSession,
        question: str,
    ) -> AgentRunState:
        intent = classify_intent(question)
        case_type = detect_case_type(question)
        current_case = get_current_open_case(db, chat_session)
        if current_case is not None and case_type == "general_policy":
            case_type = current_case.case_type
        extracted_slots = extract_slots(question)
        if current_case is not None and extracted_slots and intent == "policy_qa":
            intent = INTENT_ELIGIBILITY
        case = get_or_create_case(db, chat_session, case_type)
        memory = read_memory_snapshot(
            db,
            user_id=chat_session.user_id,
            session_id=chat_session.id,
            case_id=case.id if case else None,
        )
        slots = sync_case_slots(db, case, extracted_slots, memory)

        memory_updates = write_pre_answer_memory(
            db,
            chat_session=chat_session,
            case=case,
            question=question,
            extracted_slots=extracted_slots,
        )

        return AgentRunState(
            intent=intent,
            case_type=case_type,
            memory=memory,
            case=case,
            slots=slots,
            extracted_slots=extracted_slots,
            memory_updates=memory_updates,
        )

    def build_prompt_context(self, state: AgentRunState) -> str:
        lines = [
            "Agent 编排上下文：",
            f"- 识别意图：{state.intent}",
            f"- 当前事项：{CASE_TITLES.get(state.case_type, state.case_type)}",
        ]
        if state.memory.long_term:
            lines.append(f"- 长期记忆：{format_memory(state.memory.long_term)}")
        if state.memory.case_memory:
            lines.append(f"- 事项记忆：{format_memory(state.memory.case_memory)}")
        if state.extracted_slots:
            lines.append(f"- 本轮抽取条件：{format_memory(state.extracted_slots)}")
        if state.missing_slots:
            questions = "；".join(slot.question or slot.slot_name for slot in state.missing_slots[:3])
            lines.append(f"- 缺失条件：{questions}")
            lines.append("- 如果用户在做资格判断，请先说明仍需确认的条件，不要下绝对结论。")
        return "\n".join(lines)

    def finalize(
        self,
        db: Session,
        *,
        state: AgentRunState,
        chat_session: ChatSession,
        assistant_message: ChatMessage,
        retrieved: list[dict],
        answer: str,
    ) -> AgentResponse:
        material_list = build_material_list(retrieved)
        workflow_steps = build_workflow_steps(retrieved)
        eligibility = build_eligibility_record(
            db,
            state=state,
            chat_session=chat_session,
            retrieved=retrieved,
        )
        risk = build_risk(state=state, retrieved=retrieved, answer=answer)

        record_memory_item(
            db,
            user_id=chat_session.user_id,
            session_id=chat_session.id,
            case_id=state.case.id if state.case else None,
            memory_scope="long_term",
            memory_type="history",
            memory_key="last_policy_question",
            value={
                "answer": assistant_message.content[:500],
                "intent": state.intent,
                "case_type": state.case_type,
            },
            source="agent_orchestrator",
            confidence=0.6,
        )
        state.memory_updates.append("long_term.history.last_policy_question")

        response = AgentResponse(
            intent=state.intent,
            case=build_case_response(state),
            missing_slots=[slot_to_response(slot) for slot in state.missing_slots],
            follow_up_questions=[
                slot.question
                for slot in state.missing_slots[:3]
                if slot.question
            ],
            eligibility=eligibility,
            material_list=material_list if state.intent == INTENT_MATERIAL else material_list[:5],
            workflow_steps=workflow_steps if state.intent == INTENT_WORKFLOW else workflow_steps[:5],
            risk=risk,
            memory_updates=state.memory_updates,
        )
        assistant_message.extra_metadata = {
            **(assistant_message.extra_metadata or {}),
            "agent": response.model_dump(),
        }
        return response


def get_or_create_case(db: Session, chat_session: ChatSession, case_type: str) -> ServiceCase:
    if chat_session.current_case_id:
        current = db.get(ServiceCase, chat_session.current_case_id)
        if current is not None and current.case_type == case_type and current.status == "open":
            return current

    existing = db.execute(
        select(ServiceCase)
        .where(
            ServiceCase.session_id == chat_session.id,
            ServiceCase.case_type == case_type,
            ServiceCase.status == "open",
        )
        .order_by(ServiceCase.updated_at.desc())
    ).scalars().first()
    if existing is not None:
        chat_session.current_case_id = existing.id
        return existing

    case = ServiceCase(
        user_id=chat_session.user_id,
        session_id=chat_session.id,
        case_type=case_type,
        case_title=CASE_TITLES.get(case_type, "政策咨询"),
        status="open",
    )
    db.add(case)
    db.flush()
    chat_session.current_case_id = case.id
    db.flush()
    return case


def get_current_open_case(db: Session, chat_session: ChatSession) -> ServiceCase | None:
    if not chat_session.current_case_id:
        return None
    current = db.get(ServiceCase, chat_session.current_case_id)
    if current is not None and current.status == "open":
        return current
    return None


def sync_case_slots(
    db: Session,
    case: ServiceCase,
    extracted_slots: dict[str, Any],
    memory: MemorySnapshot,
) -> list[CaseSlot]:
    definitions = CASE_SLOT_DEFINITIONS.get(case.case_type, [])
    slots: list[CaseSlot] = []

    for definition in definitions:
        value = extracted_slots.get(definition.key)
        if value is None:
            value = memory.case_memory.get(definition.key)
        if value is None:
            value = memory.long_term.get(definition.key)

        status = "known" if value is not None else "missing"
        slot = upsert_case_slot(
            db,
            case_id=case.id,
            slot_key=definition.key,
            slot_name=definition.name,
            value=value,
            status=status,
            question=None if status == "known" else definition.question,
            required=definition.required,
        )
        slots.append(slot)

        if value is not None:
            upsert_memory_item(
                db,
                user_id=case.user_id,
                case_id=case.id,
                memory_scope="case",
                memory_type="slot",
                memory_key=definition.key,
                value=value,
                source="agent_slot_sync",
                confidence=0.8,
            )

    return slots


def write_pre_answer_memory(
    db: Session,
    *,
    chat_session: ChatSession,
    case: ServiceCase,
    question: str,
    extracted_slots: dict[str, Any],
) -> list[str]:
    updates = []
    upsert_memory_item(
        db,
        user_id=chat_session.user_id,
        session_id=chat_session.id,
        case_id=case.id,
        memory_scope="short_term",
        memory_type="conversation",
        memory_key="last_user_question",
        value=question,
        source="chat",
        confidence=1.0,
    )
    updates.append("short_term.conversation.last_user_question")

    for key, value in extracted_slots.items():
        upsert_memory_item(
            db,
            user_id=chat_session.user_id,
            session_id=chat_session.id,
            case_id=case.id,
            memory_scope="short_term",
            memory_type="extracted_slot",
            memory_key=key,
            value=value,
            source="agent_slot_extraction",
            confidence=0.75,
        )
        updates.append(f"short_term.extracted_slot.{key}")

    for key in ["grade"]:
        if key in extracted_slots:
            upsert_memory_item(
                db,
                user_id=chat_session.user_id,
                memory_scope="long_term",
                memory_type="profile",
                memory_key=key,
                value=extracted_slots[key],
                source="agent_slot_extraction",
                confidence=0.7,
            )
            updates.append(f"long_term.profile.{key}")

    return updates


def build_eligibility_record(
    db: Session,
    *,
    state: AgentRunState,
    chat_session: ChatSession,
    retrieved: list[dict],
) -> AgentEligibilityResponse | None:
    if state.intent != INTENT_ELIGIBILITY or state.case is None:
        return None

    matched: list[str] = []
    unmet: list[str] = []
    pending = [slot.slot_name for slot in state.missing_slots]

    values = {slot.slot_key: slot.value for slot in state.slots if slot.value is not None}
    if values.get("has_failed_course") is False:
        matched.append("未发现挂科/不及格条件")
    elif values.get("has_failed_course") is True:
        unmet.append("存在挂科/不及格条件")

    if values.get("has_disciplinary_record") is False:
        matched.append("未发现纪律处分记录")
    elif values.get("has_disciplinary_record") is True:
        unmet.append("存在纪律处分记录")

    if values.get("gpa") is not None:
        matched.append(f"已提供绩点：{values['gpa']}")
    if values.get("rank_percent") is not None:
        matched.append(f"已提供排名比例：前 {values['rank_percent']}%")
    if values.get("difficulty_level") is not None:
        matched.append(f"已提供困难认定/家庭经济情况：{values['difficulty_level']}")
    if values.get("has_difficulty_identification") is True:
        matched.append("已完成家庭经济困难认定")
    elif values.get("has_difficulty_identification") is False:
        unmet.append("尚未完成家庭经济困难认定")
    if values.get("english_score") is not None:
        matched.append(f"已提供英语成绩：{values['english_score']}")
    if values.get("research_awards") is not None:
        matched.append(f"已提供科研竞赛情况：{values['research_awards']}")
    if values.get("credits_completed") is True:
        matched.append("已修满或自述已满足毕业学分")
    elif values.get("credits_completed") is False:
        unmet.append("存在未修满毕业学分风险")
    if values.get("thesis_status") is not None:
        matched.append(f"已提供毕设/论文状态：{values['thesis_status']}")
        if "未通过" in str(values["thesis_status"]):
            unmet.append("毕设/论文存在未通过风险")
    if values.get("cet4_qualified") is True:
        matched.append("已满足或自述满足外语/四级条件")
    elif values.get("cet4_qualified") is False:
        unmet.append("外语/四级条件存在不满足风险")
    if values.get("leave_type") is not None:
        matched.append(f"已提供请假/异动类型：{values['leave_type']}")
    if values.get("leave_days") is not None:
        matched.append(f"已提供请假/异动时长：{values['leave_days']}")
    if values.get("has_supporting_material") is True:
        matched.append("已准备证明材料")
    elif values.get("has_supporting_material") is False:
        unmet.append("证明材料尚不完整")
    if values.get("violation_type") is not None:
        matched.append(f"已提供违纪类型：{values['violation_type']}")
    if values.get("process_stage") is not None:
        matched.append(f"已提供处理阶段：{values['process_stage']}")
    if values.get("status_action") is not None:
        matched.append(f"已提供学籍事项：{values['status_action']}")

    if unmet:
        result_status = "not_eligible"
        result_summary = "根据已知条件，存在不满足项，需要结合政策条款进一步确认。"
    elif pending:
        result_status = "pending"
        result_summary = "当前信息不足，需补充关键条件后才能做资格判断。"
    else:
        result_status = "likely_eligible"
        result_summary = "当前已知条件未发现明显不满足项，但仍需以政策原文和学院审核为准。"

    record = EligibilityRecord(
        case_id=state.case.id,
        user_id=chat_session.user_id,
        session_id=chat_session.id,
        policy_category=state.case_type,
        result_status=result_status,
        matched_conditions=matched,
        unmet_conditions=unmet,
        pending_conditions=pending,
        result_summary=result_summary,
    )
    db.add(record)
    db.flush()

    return AgentEligibilityResponse(
        record_id=str(record.id),
        result_status=result_status,
        matched_conditions=matched,
        unmet_conditions=unmet,
        pending_conditions=pending,
        result_summary=result_summary,
    )


def build_risk(
    *,
    state: AgentRunState,
    retrieved: list[dict],
    answer: str,
) -> AgentRiskResponse:
    warnings: list[str] = []
    risk_level = "low"

    if not retrieved:
        warnings.append("未检索到可引用的政策片段。")
        risk_level = "high"
    if state.missing_slots:
        warnings.append("存在未确认的用户条件，资格判断不能下绝对结论。")
        risk_level = "medium" if risk_level == "low" else risk_level
    if "不确定" in answer or "无法" in answer:
        warnings.append("回答中包含不确定性提示，需要人工复核关键结论。")
        risk_level = "medium" if risk_level == "low" else risk_level
    if state.case_type in {"discipline", "postgraduate_recommendation", "graduation"}:
        warnings.append("该事项会影响处分、推免或毕业学位等高影响结果，建议由学院或主管部门复核。")
        if state.case_type == "discipline":
            risk_level = "high"
        elif risk_level == "low":
            risk_level = "medium"

    today = date.today()
    expired_titles = [
        item["document_title"]
        for item in retrieved
        if item.get("effective_to") and item["effective_to"] < today
    ]
    if expired_titles:
        warnings.append(f"检索结果包含可能已过期政策：{', '.join(sorted(set(expired_titles)))}")
        risk_level = "medium" if risk_level == "low" else risk_level

    return AgentRiskResponse(risk_level=risk_level, warnings=warnings)


def build_case_response(state: AgentRunState) -> AgentCaseResponse | None:
    if state.case is None:
        return None
    return AgentCaseResponse(
        case_id=str(state.case.id),
        case_type=state.case.case_type,
        case_title=state.case.case_title,
        status=state.case.status,
        slots=[slot_to_response(slot) for slot in state.slots],
    )


def slot_to_response(slot: CaseSlot) -> AgentSlotStatus:
    return AgentSlotStatus(
        key=slot.slot_key,
        name=slot.slot_name,
        value=slot.value,
        status=slot.status,
        question=slot.question,
        required=slot.required,
    )


def format_memory(memory: dict[str, Any]) -> str:
    return "，".join(f"{key}={value}" for key, value in memory.items())
