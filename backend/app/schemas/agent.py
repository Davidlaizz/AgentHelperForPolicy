from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AgentSlotStatus(BaseModel):
    key: str
    name: str
    value: str | int | float | bool | dict | list | None = None
    status: str
    question: str | None = None
    required: bool = True


class AgentCaseResponse(BaseModel):
    case_id: str | None = None
    case_type: str
    case_title: str
    status: str
    slots: list[AgentSlotStatus]


class AgentEligibilityResponse(BaseModel):
    record_id: str | None = None
    result_status: str
    matched_conditions: list[str]
    unmet_conditions: list[str]
    pending_conditions: list[str]
    result_summary: str


class AgentRiskResponse(BaseModel):
    risk_level: str
    warnings: list[str]


class AgentResponse(BaseModel):
    run_id: str | None = None
    intent: str
    case: AgentCaseResponse | None = None
    missing_slots: list[AgentSlotStatus]
    follow_up_questions: list[str]
    eligibility: AgentEligibilityResponse | None = None
    material_list: list[str]
    workflow_steps: list[str]
    risk: AgentRiskResponse
    evidence_summary: dict[str, Any] = Field(default_factory=dict)
    memory_updates: list[str]
    execution_trace: list[dict] = Field(default_factory=list)
