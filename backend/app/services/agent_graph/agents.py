from __future__ import annotations

from typing import Any

from langchain_core.prompts import PromptTemplate
from sqlalchemy.orm import Session

from app.models import CaseSlot, ChatSession, ServiceCase
from app.services.agent.orchestrator import (
    AgentRunState,
    build_eligibility_record,
    build_risk,
    get_current_open_case,
    get_or_create_case,
    sync_case_slots,
    write_pre_answer_memory,
)
from app.services.agent.rules import (
    CASE_TITLES,
    INTENT_ELIGIBILITY,
    INTENT_MATERIAL,
    INTENT_POLICY_QA,
    INTENT_WORKFLOW,
    build_material_list,
    build_workflow_steps,
    classify_intent,
    detect_case_type,
    enrich_retrieval_query,
    extract_slots,
    policy_category_for_case,
)
from app.services.llm_provider import get_llm_provider
from app.services.memory import read_memory_snapshot, record_memory_item
from app.services.memory.store import MemorySnapshot
from app.services.rag.metadata_filter import RetrievalFilters
from app.services.rag.retriever import hybrid_search
from app.services.agent_graph.state import PolicyAgentState


class BaseGraphAgent:
    node_key = ""
    node_name = ""

    def __init__(self, db: Session, chat_session: ChatSession) -> None:
        self.db = db
        self.chat_session = chat_session

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        raise NotImplementedError


class MemoryReadAgent(BaseGraphAgent):
    node_key = "memory_read"
    node_name = "MemoryReadAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        memory = read_memory_snapshot(
            self.db,
            user_id=self.chat_session.user_id,
            session_id=self.chat_session.id,
            case_id=state.get("case_id"),
        )
        return memory_to_update(memory)


class IntentAgent(BaseGraphAgent):
    node_key = "intent"
    node_name = "IntentAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        return {"intent": classify_intent(state["question"])}


class CaseAgent(BaseGraphAgent):
    node_key = "case"
    node_name = "CaseAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        case_type = detect_case_type(state["question"])
        current_case = get_current_open_case(self.db, self.chat_session)
        if current_case is not None and case_type == "general_policy":
            case_type = current_case.case_type
        case = get_or_create_case(self.db, self.chat_session, case_type)
        return {"case_type": case_type, "case_id": str(case.id)}


class SlotAgent(BaseGraphAgent):
    node_key = "slot"
    node_name = "SlotAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        case = self.db.get(ServiceCase, state.get("case_id"))
        if case is None:
            return {"extracted_slots": {}, "case_slots": [], "missing_slots": []}

        extracted_slots = extract_slots(state["question"])
        intent = state.get("intent") or INTENT_POLICY_QA
        if extracted_slots and intent == INTENT_POLICY_QA:
            intent = INTENT_ELIGIBILITY

        memory = read_memory_snapshot(
            self.db,
            user_id=self.chat_session.user_id,
            session_id=self.chat_session.id,
            case_id=case.id,
        )
        slots = sync_case_slots(self.db, case, extracted_slots, memory)
        memory_updates = write_pre_answer_memory(
            self.db,
            chat_session=self.chat_session,
            case=case,
            question=state["question"],
            extracted_slots=extracted_slots,
        )

        return {
            "intent": intent,
            "extracted_slots": extracted_slots,
            "case_slots": [slot_to_dict(slot) for slot in slots],
            "missing_slots": [slot_to_dict(slot) for slot in slots if slot.required and slot.status == "missing"],
            "memory_updates": list(state.get("memory_updates") or []) + memory_updates,
            **memory_to_update(memory),
        }


class RetrievalAgent(BaseGraphAgent):
    node_key = "retrieval"
    node_name = "RetrievalAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        case_type = state.get("case_type") or "general_policy"
        policy_category = state.get("requested_policy_category") or policy_category_for_case(case_type)
        retrieval_query = enrich_retrieval_query(state["question"], case_type)
        retrieved = hybrid_search(
            self.db,
            retrieval_query,
            RetrievalFilters(
                policy_category=policy_category,
                include_expired=bool(state.get("include_expired", False)),
            ),
            top_k=int(state.get("top_k") or 5),
        )
        if not retrieved and policy_category and not state.get("requested_policy_category"):
            retrieved = hybrid_search(
                self.db,
                retrieval_query,
                RetrievalFilters(include_expired=bool(state.get("include_expired", False))),
                top_k=int(state.get("top_k") or 5),
            )
        return {"retrieval_query": retrieval_query, "retrieved_chunks": retrieved}


class EvidenceAgent(BaseGraphAgent):
    node_key = "evidence"
    node_name = "EvidenceAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        chunks = state.get("retrieved_chunks") or []
        titles = []
        attachments = []
        expired = []
        levels: dict[str, int] = {}
        for item in chunks:
            if item.get("document_title") not in titles:
                titles.append(item.get("document_title"))
            metadata = item.get("metadata") or {}
            if metadata.get("attachment_title") and metadata.get("attachment_title") not in attachments:
                attachments.append(metadata.get("attachment_title"))
            if item.get("effective_to"):
                expired.append(item.get("document_title"))
            level = item.get("policy_level") or "未知"
            levels[level] = levels.get(level, 0) + 1

        return {
            "evidence_summary": {
                "retrieved_count": len(chunks),
                "document_titles": titles[:8],
                "attachment_titles": attachments[:8],
                "policy_levels": levels,
                "has_expired_candidates": bool(expired),
                "expired_titles": sorted(set(expired))[:5],
            },
            "citations": [
                {
                    "document_id": item.get("document_id"),
                    "chunk_id": item.get("chunk_id"),
                    "document_title": item.get("document_title"),
                    "page_no": item.get("page_no"),
                    "article_no": item.get("article_no"),
                }
                for item in chunks[:5]
            ],
        }


class FollowupAgent(BaseGraphAgent):
    node_key = "followup"
    node_name = "FollowupAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        return {
            "follow_up_questions": [
                slot.get("question") or slot.get("name")
                for slot in state.get("missing_slots", [])[:3]
                if slot.get("question") or slot.get("name")
            ]
        }


class EligibilityAgent(BaseGraphAgent):
    node_key = "eligibility"
    node_name = "EligibilityAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        run_state = build_legacy_state(self.db, self.chat_session, state)
        eligibility = build_eligibility_record(
            self.db,
            state=run_state,
            chat_session=self.chat_session,
            retrieved=state.get("retrieved_chunks") or [],
        )
        return {"eligibility_result": eligibility.model_dump() if eligibility else None}


class WorkflowAgent(BaseGraphAgent):
    node_key = "workflow"
    node_name = "WorkflowAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        retrieved = state.get("retrieved_chunks") or []
        return {
            "material_list": build_material_list(retrieved),
            "workflow_steps": build_workflow_steps(retrieved),
        }


class RiskAgent(BaseGraphAgent):
    node_key = "risk"
    node_name = "RiskAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        run_state = build_legacy_state(self.db, self.chat_session, state)
        risk = build_risk(
            state=run_state,
            retrieved=state.get("retrieved_chunks") or [],
            answer=state.get("final_answer") or "",
        )
        return {"risk": risk.model_dump()}


class AnswerAgent(BaseGraphAgent):
    node_key = "answer"
    node_name = "AnswerAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        prompt = build_langchain_policy_prompt(state)
        raw_answer = get_llm_provider().generate(prompt, state.get("retrieved_chunks") or [])
        policy_basis, ai_inference = split_answer_sections(raw_answer)
        return {
            "final_answer": raw_answer,
            "policy_basis": policy_basis,
            "ai_inference": ai_inference,
        }


class MemoryWriteAgent(BaseGraphAgent):
    node_key = "memory_write"
    node_name = "MemoryWriteAgent"

    def run(self, state: PolicyAgentState) -> dict[str, Any]:
        record_memory_item(
            self.db,
            user_id=self.chat_session.user_id,
            session_id=self.chat_session.id,
            case_id=state.get("case_id"),
            memory_scope="long_term",
            memory_type="history",
            memory_key="last_policy_question",
            value={
                "answer": (state.get("final_answer") or "")[:500],
                "intent": state.get("intent"),
                "case_type": state.get("case_type"),
                "run_id": state.get("run_id"),
            },
            source="langgraph_memory_write_agent",
            confidence=0.65,
        )
        updates = list(state.get("memory_updates") or [])
        updates.append("long_term.history.last_policy_question")
        return {"memory_updates": updates}


def build_langchain_policy_prompt(state: PolicyAgentState) -> str:
    context_lines = []
    for index, item in enumerate(state.get("retrieved_chunks") or [], start=1):
        context_lines.append(
            "\n".join(
                [
                    f"[{index}] 文件：{item['document_title']}",
                    f"页码：{item.get('page_no') or '无'}",
                    f"条款：{item.get('article_no') or '无'}",
                    f"内容：{item['chunk_text']}",
                ]
            )
        )

    template = PromptTemplate.from_template(
        "请基于以下政策片段回答问题。必须区分“政策依据”和“AI 推断”；"
        "如果片段不足以支持结论，要明确说明不确定。\n\n"
        "用户问题：{question}\n\n"
        "政策片段：\n{contexts}\n\n"
        "Agent 编排上下文：\n{agent_context}\n"
        "风险提示：{risk}\n"
    )
    return template.format(
        question=state["question"],
        contexts="\n\n".join(context_lines),
        agent_context=build_agent_context(state),
        risk=state.get("risk") or {},
    )


def build_agent_context(state: PolicyAgentState) -> str:
    lines = [
        f"- 识别意图：{state.get('intent')}",
        f"- 当前事项：{CASE_TITLES.get(state.get('case_type') or '', state.get('case_type') or '政策咨询')}",
    ]
    if state.get("long_term_memory"):
        lines.append(f"- 长期记忆：{format_memory(state['long_term_memory'])}")
    if state.get("case_memory"):
        lines.append(f"- 事项记忆：{format_memory(state['case_memory'])}")
    if state.get("extracted_slots"):
        lines.append(f"- 本轮抽取条件：{format_memory(state['extracted_slots'])}")
    if state.get("missing_slots"):
        questions = "；".join(
            slot.get("question") or slot.get("name") or slot.get("key", "")
            for slot in state["missing_slots"][:3]
        )
        lines.append(f"- 缺失条件：{questions}")
        lines.append("- 如果用户在做资格判断，请先说明仍需确认的条件，不要下绝对结论。")
    evidence = state.get("evidence_summary") or {}
    if evidence:
        lines.append(f"- 证据摘要：{evidence}")
    return "\n".join(lines)


def memory_to_update(memory: MemorySnapshot) -> dict[str, Any]:
    return {
        "short_term_memory": memory.short_term,
        "case_memory": memory.case_memory,
        "long_term_memory": memory.long_term,
        "recent_messages": memory.recent_messages,
    }


def slot_to_dict(slot: CaseSlot) -> dict[str, Any]:
    return {
        "key": slot.slot_key,
        "name": slot.slot_name,
        "value": slot.value,
        "status": slot.status,
        "question": slot.question,
        "required": slot.required,
    }


def build_legacy_state(
    db: Session,
    chat_session: ChatSession,
    state: PolicyAgentState,
) -> AgentRunState:
    case = db.get(ServiceCase, state.get("case_id")) if state.get("case_id") else None
    slots = []
    if case is not None:
        slots = list(case.slots)
    memory = read_memory_snapshot(
        db,
        user_id=chat_session.user_id,
        session_id=chat_session.id,
        case_id=case.id if case else None,
    )
    return AgentRunState(
        intent=state.get("intent") or INTENT_POLICY_QA,
        case_type=state.get("case_type") or "general_policy",
        memory=memory,
        case=case,
        slots=slots,
        extracted_slots=state.get("extracted_slots") or {},
        memory_updates=list(state.get("memory_updates") or []),
    )


def route_after_evidence(state: PolicyAgentState) -> str:
    intent = state.get("intent")
    missing_slots = state.get("missing_slots") or []
    if intent == INTENT_ELIGIBILITY and missing_slots:
        return "followup"
    if intent == INTENT_ELIGIBILITY:
        return "eligibility"
    if intent in {INTENT_WORKFLOW, INTENT_MATERIAL}:
        return "workflow"
    return "risk"


def agent_response_from_state(state: PolicyAgentState) -> dict[str, Any]:
    case_slots = state.get("case_slots") or []
    return {
        "run_id": state.get("run_id"),
        "intent": state.get("intent") or INTENT_POLICY_QA,
        "case": {
            "case_id": state.get("case_id"),
            "case_type": state.get("case_type") or "general_policy",
            "case_title": CASE_TITLES.get(state.get("case_type") or "", "政策咨询"),
            "status": "open",
            "slots": case_slots,
        }
        if state.get("case_id")
        else None,
        "missing_slots": state.get("missing_slots") or [],
        "follow_up_questions": state.get("follow_up_questions") or [],
        "eligibility": state.get("eligibility_result"),
        "material_list": state.get("material_list") or [],
        "workflow_steps": state.get("workflow_steps") or [],
        "risk": state.get("risk") or {"risk_level": "low", "warnings": []},
        "memory_updates": state.get("memory_updates") or [],
        "execution_trace": state.get("execution_trace") or [],
    }


def format_memory(memory: dict[str, Any]) -> str:
    return "，".join(f"{key}={value}" for key, value in memory.items())


def split_answer_sections(answer: str) -> tuple[str, str]:
    if "AI 推断：" not in answer:
        return answer.strip(), "未生成额外推断。"
    basis, inference = answer.split("AI 推断：", 1)
    return basis.replace("政策依据：", "").strip(), inference.strip()
