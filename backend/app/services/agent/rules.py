from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


INTENT_POLICY_QA = "policy_qa"
INTENT_ELIGIBILITY = "eligibility_check"
INTENT_WORKFLOW = "workflow_generation"
INTENT_MATERIAL = "material_list"
INTENT_GENERAL = "general_chat"


@dataclass(frozen=True)
class SlotDefinition:
    key: str
    name: str
    question: str
    required: bool = True


CASE_SLOT_DEFINITIONS: dict[str, list[SlotDefinition]] = {
    "major_transfer": [
        SlotDefinition("grade", "年级", "你现在是大几或哪一级学生？"),
        SlotDefinition("gpa", "绩点", "你当前绩点是多少？"),
        SlotDefinition("target_major", "目标专业", "你想转入哪个专业或学院？"),
        SlotDefinition("has_failed_course", "是否挂科", "你是否有挂科或不及格课程？"),
        SlotDefinition("has_disciplinary_record", "是否有处分", "你是否有纪律处分记录？"),
        SlotDefinition("application_period", "申请批次/时间", "你咨询的是哪一年的转专业或大类分流申请？"),
    ],
    "scholarship": [
        SlotDefinition("grade", "年级", "你现在是大几或哪一级学生？"),
        SlotDefinition("gpa", "绩点", "你当前绩点是多少？"),
        SlotDefinition("rank_percent", "排名比例", "你的综合或学习成绩排名大约在前百分之多少？"),
        SlotDefinition("has_failed_course", "是否挂科", "你是否有挂科或不及格课程？"),
        SlotDefinition("has_disciplinary_record", "是否有处分", "你是否有纪律处分记录？"),
    ],
    "thesis": [
        SlotDefinition("grade", "年级", "你现在是大几或哪一级学生？"),
        SlotDefinition("outside_unit", "校外单位", "校外指导单位或接收单位是哪一家？", required=False),
        SlotDefinition("has_acceptance_letter", "是否有邀请函/接收函", "你是否已经拿到校外单位邀请函或接收函？"),
    ],
}


CASE_TITLES = {
    "major_transfer": "转专业/大类分流咨询",
    "scholarship": "奖学金资格咨询",
    "thesis": "毕业设计/论文咨询",
    "status_change": "学籍变更咨询",
    "general_policy": "政策咨询",
}


POLICY_CATEGORIES = {
    "major_transfer": "转专业",
    "scholarship": "奖学金",
    "thesis": "毕业要求",
    "status_change": "学籍管理",
}


def policy_category_for_case(case_type: str) -> str | None:
    return POLICY_CATEGORIES.get(case_type)


def enrich_retrieval_query(question: str, case_type: str) -> str:
    case_terms = {
        "major_transfer": "转专业 大类分流 专业分流 申请条件",
        "scholarship": "奖学金 评定 条件 排名 绩点",
        "thesis": "毕业设计 毕业论文 校外 申请表 答辩",
        "status_change": "学籍 信息变更 申请 材料",
    }
    terms = case_terms.get(case_type)
    if not terms:
        return question
    return f"{question} {terms}"


def classify_intent(question: str) -> str:
    text = normalize_text(question)
    if not text:
        return INTENT_GENERAL

    if has_any(text, ["能不能", "能否", "我能", "可不可以", "是否符合", "有没有资格", "资格", "符合条件"]):
        return INTENT_ELIGIBILITY
    if has_any(text, ["流程", "步骤", "怎么办理", "如何办理", "怎么申请", "申请入口", "在哪里申请", "系统入口"]):
        return INTENT_WORKFLOW
    if has_any(text, ["材料", "申请表", "证明", "附件", "准备什么", "需要什么表", "清单"]):
        return INTENT_MATERIAL
    if has_any(text, ["你好", "hello", "嗨"]) and len(text) <= 8:
        return INTENT_GENERAL
    return INTENT_POLICY_QA


def detect_case_type(question: str) -> str:
    text = normalize_text(question)
    if has_any(text, ["转专业", "大类分流", "专业分流", "转入"]):
        return "major_transfer"
    if has_any(text, ["奖学金", "奖助", "评奖", "综合测评"]):
        return "scholarship"
    if has_any(text, ["毕业论文", "毕业设计", "论文", "答辩", "盲审", "校外做"]):
        return "thesis"
    if has_any(text, ["学籍", "休学", "复学", "退学", "信息变更"]):
        return "status_change"
    return "general_policy"


def extract_slots(question: str) -> dict[str, Any]:
    text = normalize_text(question)
    slots: dict[str, Any] = {}

    grade_match = re.search(r"(20\d{2}\s*级|大一|大二|大三|大四|研一|研二|研三)", text)
    if grade_match:
        slots["grade"] = grade_match.group(1).replace(" ", "")

    gpa_match = re.search(r"(?:绩点|gpa|GPA)[^\d]{0,6}([0-9](?:\.[0-9]+)?)", question)
    if gpa_match:
        slots["gpa"] = float(gpa_match.group(1))

    rank_match = re.search(r"(?:排名|前)[^\d]{0,6}([0-9]{1,3})(?:%|％|百分之)?", question)
    if rank_match:
        slots["rank_percent"] = int(rank_match.group(1))

    if has_any(text, ["没有挂科", "无挂科", "未挂科", "没有不及格", "无不及格"]):
        slots["has_failed_course"] = False
    elif has_any(text, ["挂科", "不及格"]):
        slots["has_failed_course"] = True

    if has_any(text, ["没有处分", "无处分", "未受处分", "无纪律处分"]):
        slots["has_disciplinary_record"] = False
    elif has_any(text, ["处分", "纪律处分"]):
        slots["has_disciplinary_record"] = True

    if has_any(text, ["有邀请函", "有接收函", "拿到邀请函", "拿到接收函"]):
        slots["has_acceptance_letter"] = True
    elif has_any(text, ["没有邀请函", "没有接收函", "无邀请函", "无接收函"]):
        slots["has_acceptance_letter"] = False

    target_match = re.search(r"转(?:到|入)([^，。！？\s]{2,20})", question)
    if target_match:
        slots["target_major"] = target_match.group(1)

    if has_any(text, ["今年", "本年度", "2024", "2025", "2026"]):
        slots["application_period"] = "当前咨询年度"

    return slots


def build_material_list(retrieved: list[dict]) -> list[str]:
    materials: list[str] = []
    patterns = ["申请表", "邀请函", "接收函", "证明", "成绩单", "附件", "材料"]
    for item in retrieved:
        for sentence in split_sentences(item.get("chunk_text", "")):
            if any(pattern in sentence for pattern in patterns):
                normalized = compact(sentence)
                if normalized and normalized not in materials:
                    materials.append(normalized)
            if len(materials) >= 8:
                return materials
    return materials


def build_workflow_steps(retrieved: list[dict]) -> list[str]:
    steps: list[str] = []
    patterns = ["登录", "提交", "填写", "申请", "审核", "审批", "公示", "确认", "答辩", "上传"]
    for item in retrieved:
        for sentence in split_sentences(item.get("chunk_text", "")):
            if any(pattern in sentence for pattern in patterns):
                normalized = compact(sentence)
                if normalized and normalized not in steps:
                    steps.append(normalized)
            if len(steps) >= 8:
                return [f"{index}. {step}" for index, step in enumerate(steps, start=1)]
    return [f"{index}. {step}" for index, step in enumerate(steps, start=1)]


def has_any(text: str, keywords: list[str]) -> bool:
    return any(keyword.lower() in text.lower() for keyword in keywords)


def normalize_text(text: str) -> str:
    return "".join(text.split())


def split_sentences(text: str) -> list[str]:
    return [item.strip() for item in re.split(r"[。；;\n]", text) if item.strip()]


def compact(text: str, limit: int = 160) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return normalized[:limit] + "..."
