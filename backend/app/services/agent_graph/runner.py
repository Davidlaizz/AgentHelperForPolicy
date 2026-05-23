from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models import AgentRun, ChatSession
from app.schemas.agent import AgentResponse
from app.services.agent_graph.agents import agent_response_from_state
from app.services.agent_graph.graph import build_policy_multi_agent_graph
from app.services.agent_graph.logging import create_agent_run, finish_agent_run
from app.services.agent_graph.state import PolicyAgentState


@dataclass
class PolicyGraphResult:
    state: PolicyAgentState
    agent_response: AgentResponse
    run: AgentRun


def run_policy_multi_agent_graph(
    db: Session,
    *,
    chat_session: ChatSession,
    question: str,
    top_k: int,
    policy_category: str | None,
    include_expired: bool,
) -> PolicyGraphResult:
    run = create_agent_run(
        db,
        user_id=chat_session.user_id,
        session_id=chat_session.id,
        question=question,
    )
    initial_state: PolicyAgentState = {
        "run_id": str(run.id),
        "user_id": str(chat_session.user_id),
        "session_id": str(chat_session.id),
        "question": question,
        "top_k": top_k,
        "requested_policy_category": policy_category,
        "include_expired": include_expired,
        "memory_updates": [],
        "execution_trace": [],
        "retrieved_chunks": [],
        "material_list": [],
        "workflow_steps": [],
        "follow_up_questions": [],
    }
    try:
        graph = build_policy_multi_agent_graph(db, chat_session, str(run.id))
        final_state = graph.invoke(initial_state)
        finish_agent_run(db, run, state=final_state, status="success")
    except Exception as exc:
        finish_agent_run(db, run, status="failed", error_message=str(exc))
        raise

    return PolicyGraphResult(
        state=final_state,
        agent_response=AgentResponse.model_validate(agent_response_from_state(final_state)),
        run=run,
    )
