from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AgentGraphNodeResponse(BaseModel):
    id: str
    label: str
    type: str
    description: str | None = None
    input_keys: list[str] | dict | None = None
    output_keys: list[str] | dict | None = None
    enabled: bool = True
    average_duration_ms: int | None = None
    failure_count: int = 0


class AgentGraphEdgeResponse(BaseModel):
    source: str
    target: str
    condition: str | None = None
    condition_expression: str | None = None


class AgentGraphResponse(BaseModel):
    version: str
    description: str
    nodes: list[AgentGraphNodeResponse]
    edges: list[AgentGraphEdgeResponse]


class AgentRunListItem(BaseModel):
    run_id: str
    session_id: str | None = None
    question: str
    intent: str | None = None
    case_type: str | None = None
    status: str
    risk_level: str | None = None
    started_at: datetime
    finished_at: datetime | None = None
    duration_ms: int | None = None


class AgentStepLogResponse(BaseModel):
    id: str
    node_key: str
    node_name: str
    status: str
    input_summary: str | None = None
    output_summary: str | None = None
    started_at: datetime
    finished_at: datetime | None = None
    duration_ms: int | None = None
    error_message: str | None = None


class AgentRunDetailResponse(BaseModel):
    run: AgentRunListItem
    steps: list[AgentStepLogResponse]
