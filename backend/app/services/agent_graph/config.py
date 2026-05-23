from __future__ import annotations

GRAPH_VERSION = "v1.1-langgraph"
GRAPH_DESCRIPTION = "LangGraph 可控式多 Agent 政策服务状态图"


AGENT_NODE_DEFINITIONS = [
    {
        "id": "memory_read",
        "label": "MemoryReadAgent",
        "type": "memory",
        "description": "读取短期记忆、事项记忆、长期记忆和最近消息窗口。",
        "input_keys": ["user_id", "session_id", "case_id"],
        "output_keys": ["short_term_memory", "case_memory", "long_term_memory", "recent_messages"],
    },
    {
        "id": "intent",
        "label": "IntentAgent",
        "type": "reasoning",
        "description": "识别用户是问政策、判资格、要材料还是要流程。",
        "input_keys": ["question"],
        "output_keys": ["intent"],
    },
    {
        "id": "case",
        "label": "CaseAgent",
        "type": "reasoning",
        "description": "识别政策事项并创建或复用当前服务事项。",
        "input_keys": ["question", "intent"],
        "output_keys": ["case_type", "case_id"],
    },
    {
        "id": "slot",
        "label": "SlotAgent",
        "type": "memory",
        "description": "抽取用户条件，更新事项槽位和短期/长期记忆。",
        "input_keys": ["question", "case_id", "memory"],
        "output_keys": ["extracted_slots", "case_slots", "missing_slots", "memory_updates"],
    },
    {
        "id": "retrieval",
        "label": "RetrievalAgent",
        "type": "retrieval",
        "description": "构造检索 query，并调用 LlamaIndex RAG 混合检索。",
        "input_keys": ["question", "case_type", "policy_category"],
        "output_keys": ["retrieval_query", "retrieved_chunks"],
    },
    {
        "id": "evidence",
        "label": "EvidenceAgent",
        "type": "reasoning",
        "description": "整理政策依据、附件线索、有效期和层级信息。",
        "input_keys": ["retrieved_chunks"],
        "output_keys": ["evidence_summary", "citations"],
    },
    {
        "id": "followup",
        "label": "FollowupAgent",
        "type": "reasoning",
        "description": "根据缺失条件生成追问，避免信息不足时下绝对结论。",
        "input_keys": ["missing_slots"],
        "output_keys": ["follow_up_questions"],
    },
    {
        "id": "eligibility",
        "label": "EligibilityAgent",
        "type": "reasoning",
        "description": "基于用户条件和政策依据生成资格初判。",
        "input_keys": ["case_slots", "retrieved_chunks"],
        "output_keys": ["eligibility_result"],
    },
    {
        "id": "workflow",
        "label": "WorkflowAgent",
        "type": "planning",
        "description": "抽取材料清单和办理流程线索。",
        "input_keys": ["retrieved_chunks"],
        "output_keys": ["material_list", "workflow_steps"],
    },
    {
        "id": "risk",
        "label": "RiskAgent",
        "type": "governance",
        "description": "校验政策依据、缺失条件、有效期和高影响事项风险。",
        "input_keys": ["retrieved_chunks", "missing_slots", "case_type"],
        "output_keys": ["risk"],
    },
    {
        "id": "answer",
        "label": "AnswerAgent",
        "type": "generation",
        "description": "调用 LangChain Prompt 与 LLM 生成最终回答。",
        "input_keys": ["question", "retrieved_chunks", "agent_context"],
        "output_keys": ["final_answer", "policy_basis", "ai_inference"],
    },
    {
        "id": "memory_write",
        "label": "MemoryWriteAgent",
        "type": "memory",
        "description": "写入长期历史记忆和本轮运行结果摘要。",
        "input_keys": ["final_answer", "intent", "case_type"],
        "output_keys": ["memory_updates"],
    },
]


AGENT_EDGE_DEFINITIONS = [
    {"source": "start", "target": "memory_read", "condition": "always"},
    {"source": "memory_read", "target": "intent", "condition": "always"},
    {"source": "intent", "target": "case", "condition": "always"},
    {"source": "case", "target": "slot", "condition": "always"},
    {"source": "slot", "target": "retrieval", "condition": "always"},
    {"source": "retrieval", "target": "evidence", "condition": "always"},
    {"source": "evidence", "target": "followup", "condition": "missing_slots"},
    {"source": "evidence", "target": "eligibility", "condition": "eligibility_check"},
    {"source": "evidence", "target": "workflow", "condition": "workflow_or_material"},
    {"source": "evidence", "target": "risk", "condition": "policy_qa_or_general"},
    {"source": "followup", "target": "risk", "condition": "always"},
    {"source": "eligibility", "target": "workflow", "condition": "always"},
    {"source": "workflow", "target": "risk", "condition": "always"},
    {"source": "risk", "target": "answer", "condition": "always"},
    {"source": "answer", "target": "memory_write", "condition": "always"},
    {"source": "memory_write", "target": "end", "condition": "always"},
]
