from __future__ import annotations

from typing import Any, TypedDict


class PolicyAgentState(TypedDict, total=False):
    run_id: str
    user_id: str
    session_id: str
    question: str
    top_k: int
    requested_policy_category: str | None
    include_expired: bool

    intent: str | None
    intent_analysis: dict[str, Any]
    case_type: str | None
    case_id: str | None

    short_term_memory: dict[str, Any]
    case_memory: dict[str, Any]
    long_term_memory: dict[str, Any]
    recent_messages: list[dict[str, str]]

    extracted_slots: dict[str, Any]
    slot_analysis: dict[str, Any]
    missing_slots: list[dict[str, Any]]
    case_slots: list[dict[str, Any]]
    follow_up_questions: list[str]
    memory_updates: list[str]

    retrieval_query: str | None
    retrieved_chunks: list[dict[str, Any]]
    evidence_summary: dict[str, Any]
    citations: list[dict[str, Any]]

    eligibility_result: dict[str, Any] | None
    material_list: list[str]
    workflow_steps: list[str]
    risk: dict[str, Any] | None

    final_answer: str | None
    policy_basis: str | None
    ai_inference: str | None
    execution_trace: list[dict[str, Any]]
