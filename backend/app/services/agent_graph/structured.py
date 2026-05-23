from __future__ import annotations

from typing import Any, Literal

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field

from app.services.agent.rules import (
    CASE_SLOT_DEFINITIONS,
    INTENT_ELIGIBILITY,
    INTENT_GENERAL,
    INTENT_MATERIAL,
    INTENT_POLICY_QA,
    INTENT_WORKFLOW,
    classify_intent,
    extract_slots,
)
from app.services.llm_provider import get_llm_provider


IntentValue = Literal[
    "policy_qa",
    "eligibility_check",
    "workflow_generation",
    "material_list",
    "general_chat",
]


class IntentStructuredOutput(BaseModel):
    intent: IntentValue = Field(description="用户意图枚举值")
    confidence: float = Field(default=0.5, ge=0, le=1, description="判断置信度，0 到 1")
    reason: str = Field(default="", description="一句话说明判断依据")


class SlotStructuredOutput(BaseModel):
    extracted_slots: dict[str, Any] = Field(default_factory=dict, description="抽取到的用户条件")
    confidence: float = Field(default=0.5, ge=0, le=1, description="抽取置信度，0 到 1")
    reason: str = Field(default="", description="一句话说明抽取依据")


INTENT_VALUES = {
    INTENT_POLICY_QA,
    INTENT_ELIGIBILITY,
    INTENT_WORKFLOW,
    INTENT_MATERIAL,
    INTENT_GENERAL,
}


def classify_intent_structured(question: str) -> IntentStructuredOutput:
    fallback = IntentStructuredOutput(
        intent=classify_intent(question),
        confidence=0.55,
        reason="规则兜底识别结果。",
    )
    parser = PydanticOutputParser(pydantic_object=IntentStructuredOutput)
    prompt = PromptTemplate.from_template(
        "你是政策服务多 Agent 的 IntentAgent。请判断用户问题的意图，只输出结构化 JSON。\n"
        "可选意图：\n"
        "- policy_qa：询问政策含义、规定、解释\n"
        "- eligibility_check：判断自己是否符合条件或能不能申请\n"
        "- workflow_generation：询问办理流程、步骤、入口\n"
        "- material_list：询问材料、表格、证明、附件清单\n"
        "- general_chat：寒暄或非政策任务\n\n"
        "用户问题：{question}\n\n"
        "{format_instructions}"
    )
    try:
        raw = get_llm_provider().generate(
            prompt.format(
                question=question,
                format_instructions=parser.get_format_instructions(),
            ),
            [],
        )
        parsed = parser.parse(raw)
    except Exception:
        return fallback

    if parsed.confidence < 0.45 or parsed.intent not in INTENT_VALUES:
        return fallback
    return parsed


def extract_slots_structured(question: str, case_type: str) -> SlotStructuredOutput:
    fallback_slots = extract_slots(question)
    fallback = SlotStructuredOutput(
        extracted_slots=fallback_slots,
        confidence=0.55 if fallback_slots else 0.35,
        reason="规则兜底抽取结果。",
    )
    allowed_slots = CASE_SLOT_DEFINITIONS.get(case_type, [])
    if not allowed_slots:
        return fallback

    slot_descriptions = "\n".join(
        f"- {slot.key}（{slot.name}）：{slot.question}"
        for slot in allowed_slots
    )
    parser = PydanticOutputParser(pydantic_object=SlotStructuredOutput)
    prompt = PromptTemplate.from_template(
        "你是政策服务多 Agent 的 SlotAgent。请从用户问题中抽取事项条件，只输出结构化 JSON。\n"
        "只允许输出下列 slot key；不要创造新的 key。没有明确提到的条件不要臆测。\n\n"
        "当前事项：{case_type}\n"
        "允许字段：\n{slot_descriptions}\n\n"
        "类型要求：\n"
        "- gpa、rank_percent、english_score 为数字\n"
        "- has_failed_course、has_disciplinary_record、has_supporting_material、"
        "has_difficulty_identification、credits_completed、cet4_qualified 为布尔值\n"
        "- 其他字段为简短字符串\n\n"
        "用户问题：{question}\n\n"
        "{format_instructions}"
    )
    try:
        raw = get_llm_provider().generate(
            prompt.format(
                question=question,
                case_type=case_type,
                slot_descriptions=slot_descriptions,
                format_instructions=parser.get_format_instructions(),
            ),
            [],
        )
        parsed = parser.parse(raw)
    except Exception:
        return fallback

    normalized = normalize_structured_slots(parsed.extracted_slots, case_type)
    merged = {**fallback_slots, **normalized}
    if not merged:
        return fallback
    return SlotStructuredOutput(
        extracted_slots=merged,
        confidence=max(parsed.confidence, fallback.confidence),
        reason=parsed.reason or "结构化抽取结果。",
    )


def normalize_structured_slots(slots: dict[str, Any], case_type: str) -> dict[str, Any]:
    allowed_keys = {slot.key for slot in CASE_SLOT_DEFINITIONS.get(case_type, [])}
    normalized: dict[str, Any] = {}
    for key, value in (slots or {}).items():
        if key not in allowed_keys or value in {None, ""}:
            continue
        if key in {"gpa", "rank_percent", "english_score"}:
            number = coerce_number(value)
            if number is not None:
                normalized[key] = number
            continue
        if key in {
            "has_failed_course",
            "has_disciplinary_record",
            "has_supporting_material",
            "has_difficulty_identification",
            "credits_completed",
            "cet4_qualified",
            "has_acceptance_letter",
            "leave_off_campus",
            "appeal_intent",
        }:
            boolean = coerce_bool(value)
            if boolean is not None:
                normalized[key] = boolean
            continue
        normalized[key] = str(value).strip()
    return normalized


def coerce_number(value: Any) -> float | int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        text = str(value).strip().replace("%", "").replace("％", "")
        number = float(text)
    except ValueError:
        return None
    return int(number) if number.is_integer() else number


def coerce_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"true", "yes", "y", "是", "有", "已", "已完成", "符合"}:
        return True
    if text in {"false", "no", "n", "否", "无", "没有", "未", "未完成", "不符合"}:
        return False
    return None
