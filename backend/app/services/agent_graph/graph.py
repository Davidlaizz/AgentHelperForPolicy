from __future__ import annotations

from langgraph.graph import END, START, StateGraph
from sqlalchemy.orm import Session

from app.models import ChatSession
from app.services.agent_graph.agents import (
    AnswerAgent,
    CaseAgent,
    EligibilityAgent,
    EvidenceAgent,
    FollowupAgent,
    IntentAgent,
    MemoryReadAgent,
    MemoryWriteAgent,
    RetrievalAgent,
    RiskAgent,
    SlotAgent,
    WorkflowAgent,
    route_after_evidence,
)
from app.services.agent_graph.config import AGENT_NODE_DEFINITIONS
from app.services.agent_graph.logging import timed_node
from app.services.agent_graph.state import PolicyAgentState


def build_policy_multi_agent_graph(db: Session, chat_session: ChatSession, run_id: str):
    graph = StateGraph(PolicyAgentState)
    agents = {
        "memory_read": MemoryReadAgent(db, chat_session),
        "intent": IntentAgent(db, chat_session),
        "case": CaseAgent(db, chat_session),
        "slot": SlotAgent(db, chat_session),
        "retrieval": RetrievalAgent(db, chat_session),
        "evidence": EvidenceAgent(db, chat_session),
        "followup": FollowupAgent(db, chat_session),
        "eligibility": EligibilityAgent(db, chat_session),
        "workflow": WorkflowAgent(db, chat_session),
        "risk": RiskAgent(db, chat_session),
        "answer": AnswerAgent(db, chat_session),
        "memory_write": MemoryWriteAgent(db, chat_session),
    }
    definitions = {item["id"]: item for item in AGENT_NODE_DEFINITIONS}

    for key, agent in agents.items():
        definition = definitions[key]
        graph.add_node(
            key,
            timed_node(
                db,
                run_id=run_id,
                node_key=key,
                node_name=agent.node_name,
                input_keys=definition["input_keys"],
                output_keys=definition["output_keys"],
                func=agent.run,
            ),
        )

    graph.add_edge(START, "memory_read")
    graph.add_edge("memory_read", "intent")
    graph.add_edge("intent", "case")
    graph.add_edge("case", "slot")
    graph.add_edge("slot", "retrieval")
    graph.add_edge("retrieval", "evidence")
    graph.add_conditional_edges(
        "evidence",
        route_after_evidence,
        {
            "followup": "followup",
            "eligibility": "eligibility",
            "workflow": "workflow",
            "risk": "risk",
        },
    )
    graph.add_edge("followup", "risk")
    graph.add_edge("eligibility", "workflow")
    graph.add_edge("workflow", "risk")
    graph.add_edge("risk", "answer")
    graph.add_edge("answer", "memory_write")
    graph.add_edge("memory_write", END)
    return graph.compile()
