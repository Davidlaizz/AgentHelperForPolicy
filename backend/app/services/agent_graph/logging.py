from __future__ import annotations

from datetime import datetime, timezone
from time import perf_counter
from typing import Any, Callable

from sqlalchemy.orm import Session

from app.models import AgentRun, AgentStepLog
from app.services.agent_graph.config import GRAPH_VERSION
from app.services.agent_graph.state import PolicyAgentState


def create_agent_run(
    db: Session,
    *,
    user_id: str,
    session_id: str,
    question: str,
) -> AgentRun:
    run = AgentRun(
        graph_version=GRAPH_VERSION,
        user_id=user_id,
        session_id=session_id,
        question=question,
        status="running",
    )
    db.add(run)
    db.flush()
    return run


def finish_agent_run(
    db: Session,
    run: AgentRun,
    *,
    state: PolicyAgentState | None = None,
    status: str = "success",
    error_message: str | None = None,
) -> None:
    finished_at = datetime.now(timezone.utc)
    run.finished_at = finished_at
    run.status = status
    run.error_message = error_message
    if state:
        run.intent = state.get("intent")
        run.case_type = state.get("case_type")
        risk = state.get("risk") or {}
        run.risk_level = risk.get("risk_level")
    if run.started_at:
        run.duration_ms = int((finished_at - run.started_at).total_seconds() * 1000)
    db.flush()


def log_agent_step(
    db: Session,
    *,
    run_id: str,
    node_key: str,
    node_name: str,
    status: str,
    started_at: datetime,
    input_summary: str | None = None,
    output_summary: str | None = None,
    error_message: str | None = None,
) -> AgentStepLog:
    finished_at = datetime.now(timezone.utc)
    log = AgentStepLog(
        run_id=run_id,
        node_key=node_key,
        node_name=node_name,
        status=status,
        input_summary=input_summary,
        output_summary=output_summary,
        started_at=started_at,
        finished_at=finished_at,
        duration_ms=int((finished_at - started_at).total_seconds() * 1000),
        error_message=error_message,
    )
    db.add(log)
    db.flush()
    return log


def summarize_state(state: PolicyAgentState, keys: list[str]) -> str:
    parts: list[str] = []
    for key in keys:
        if key not in state:
            continue
        parts.append(f"{key}={compact_value(state.get(key))}")
    return "; ".join(parts)[:1200]


def compact_value(value: Any) -> str:
    if value is None:
        return "None"
    if isinstance(value, list):
        if value and isinstance(value[0], dict):
            return f"list[{len(value)}]"
        return repr(value[:5])
    if isinstance(value, dict):
        keys = list(value.keys())[:8]
        return "{" + ", ".join(f"{key}: {compact_value(value[key])}" for key in keys) + "}"
    text = str(value)
    return text if len(text) <= 160 else text[:157] + "..."


def timed_node(
    db: Session,
    *,
    run_id: str,
    node_key: str,
    node_name: str,
    input_keys: list[str],
    output_keys: list[str],
    func: Callable[[PolicyAgentState], dict[str, Any]],
) -> Callable[[PolicyAgentState], dict[str, Any]]:
    def wrapper(state: PolicyAgentState) -> dict[str, Any]:
        started_at = datetime.now(timezone.utc)
        start = perf_counter()
        input_summary = summarize_state(state, input_keys)
        try:
            update = func(state)
            validate_node_update(node_key, update, output_keys)
            duration_ms = int((perf_counter() - start) * 1000)
            output_summary = summarize_state({**state, **update}, output_keys)
            log_agent_step(
                db,
                run_id=run_id,
                node_key=node_key,
                node_name=node_name,
                status="success",
                started_at=started_at,
                input_summary=input_summary,
                output_summary=output_summary,
            )
            trace = list(state.get("execution_trace") or [])
            trace.append(
                {
                    "node_key": node_key,
                    "node_name": node_name,
                    "status": "success",
                    "duration_ms": duration_ms,
                    "output_summary": output_summary,
                }
            )
            return {**update, "execution_trace": trace}
        except Exception as exc:
            log_agent_step(
                db,
                run_id=run_id,
                node_key=node_key,
                node_name=node_name,
                status="failed",
                started_at=started_at,
                input_summary=input_summary,
                error_message=str(exc),
            )
            raise

    return wrapper


def validate_node_update(node_key: str, update: dict[str, Any], output_keys: list[str]) -> None:
    missing = [key for key in output_keys if key not in update]
    if missing:
        raise ValueError(f"{node_key} 节点输出缺少字段：{', '.join(missing)}")
