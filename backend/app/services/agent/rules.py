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
    "grant": [
        SlotDefinition("grade", "年级", "你现在是大几或哪一级学生？"),
        SlotDefinition("difficulty_level", "困难认定等级", "你是否已完成家庭经济困难认定，认定等级是什么？"),
        SlotDefinition("has_difficulty_identification", "是否完成困难认定", "你是否已经完成家庭经济困难学生认定？"),
        SlotDefinition("material_status", "材料状态", "家庭经济情况说明、证明或系统材料是否已经准备好？", required=False),
        SlotDefinition("application_period", "申请年度", "你咨询的是哪一学年或哪一批助学金申请？"),
    ],
    "postgraduate_recommendation": [
        SlotDefinition("grade", "年级", "你现在是大几或哪一级学生？"),
        SlotDefinition("rank_percent", "排名比例", "你的专业或综合排名大约在前百分之多少？"),
        SlotDefinition("gpa", "绩点", "你当前绩点是多少？"),
        SlotDefinition("english_score", "英语成绩", "你是否已提供英语四级/六级或其他外语成绩？", required=False),
        SlotDefinition("research_awards", "科研竞赛情况", "你是否有科研、竞赛、论文、专利或其他加分材料？", required=False),
        SlotDefinition("has_failed_course", "是否挂科", "你是否有挂科或不及格课程？"),
        SlotDefinition("has_disciplinary_record", "是否有处分", "你是否有纪律处分记录？"),
    ],
    "thesis": [
        SlotDefinition("grade", "年级", "你现在是大几或哪一级学生？"),
        SlotDefinition("outside_unit", "校外单位", "校外指导单位或接收单位是哪一家？", required=False),
        SlotDefinition("has_acceptance_letter", "是否有邀请函/接收函", "你是否已经拿到校外单位邀请函或接收函？"),
    ],
    "graduation": [
        SlotDefinition("grade", "年级", "你现在是大几或哪一级学生？"),
        SlotDefinition("credits_completed", "学分完成情况", "你是否已经修满培养方案规定的毕业学分？"),
        SlotDefinition("thesis_status", "毕设/论文状态", "你的毕业设计或论文目前是通过、待答辩、需修改还是未通过？"),
        SlotDefinition("cet4_qualified", "四级/学位外语", "你是否满足学位授予所需的外语或四级条件？", required=False),
        SlotDefinition("has_disciplinary_record", "是否有处分", "你是否有纪律处分记录？"),
    ],
    "leave_request": [
        SlotDefinition("grade", "年级", "你现在是大几或哪一级学生？"),
        SlotDefinition("leave_type", "请假/异动类型", "你是病假、事假、暂缓注册、休学、保留学籍还是复学？"),
        SlotDefinition("leave_days", "请假时长", "预计请假或休学多长时间？"),
        SlotDefinition("has_supporting_material", "是否有证明材料", "是否已有医院诊断证明、情况说明或其他证明材料？"),
        SlotDefinition("leave_off_campus", "是否离校", "请假期间是否需要离校？", required=False),
    ],
    "discipline": [
        SlotDefinition("violation_type", "违纪类型", "涉及的是考试违纪、学术不端、旷课、打架、网络行为还是其他事项？"),
        SlotDefinition("process_stage", "处理阶段", "目前处于调查、拟处分、已处分、申诉还是解除影响阶段？"),
        SlotDefinition("appeal_intent", "是否申诉", "你是否准备陈述、申辩或提出申诉？", required=False),
        SlotDefinition("impact_focus", "关注影响", "你主要关心处分对评奖、保研、毕业、学位还是学籍的影响？", required=False),
    ],
    "student_status": [
        SlotDefinition("grade", "年级", "你现在是大几或哪一级学生？"),
        SlotDefinition("status_action", "学籍事项", "你要办理休学、复学、退学、降级、保留学籍、注册还是信息变更？"),
        SlotDefinition("has_supporting_material", "是否有证明材料", "是否已经准备对应证明材料？"),
        SlotDefinition("college_review_status", "学院审核状态", "学院是否已经审核或出具意见？", required=False),
    ],
}


CASE_TITLES = {
    "major_transfer": "转专业/大类分流咨询",
    "scholarship": "奖学金资格咨询",
    "grant": "助学金/资助咨询",
    "postgraduate_recommendation": "保研/推免咨询",
    "thesis": "毕业设计/论文咨询",
    "graduation": "毕业与学位咨询",
    "leave_request": "请假/休复学咨询",
    "discipline": "处分影响与申诉咨询",
    "status_change": "学籍变更咨询",
    "student_status": "学籍管理咨询",
    "general_policy": "政策咨询",
}


POLICY_CATEGORIES = {
    "major_transfer": "转专业",
    "scholarship": "奖学金",
    "grant": "助学金",
    "postgraduate_recommendation": "保研",
    "thesis": "毕业要求",
    "graduation": "毕业要求",
    "leave_request": "请假",
    "discipline": "处分",
    "status_change": "学籍管理",
    "student_status": "学籍管理",
}


def policy_category_for_case(case_type: str) -> str | None:
    return POLICY_CATEGORIES.get(case_type)


def enrich_retrieval_query(question: str, case_type: str) -> str:
    case_terms = {
        "major_transfer": "转专业 大类分流 专业分流 申请条件",
        "scholarship": "奖学金 评定 条件 排名 绩点",
        "grant": "助学金 资助 家庭经济困难 困难认定 申请材料",
        "postgraduate_recommendation": "保研 推免 推荐免试 应届本科毕业生 排名 绩点",
        "thesis": "毕业设计 毕业论文 校外 申请表 答辩",
        "graduation": "毕业 学位 结业 肄业 学分 四级 毕业审核",
        "leave_request": "请假 休学 复学 暂缓注册 证明材料 审批",
        "discipline": "违纪 处分 申诉 陈述 申辩 评奖 保研 毕业 影响",
        "status_change": "学籍 信息变更 申请 材料",
        "student_status": "学籍 休学 复学 退学 降级 保留学籍 注册 信息变更",
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
    if has_any(text, ["转专业", "大类分流", "专业分流", "转入", "想转"]):
        return "major_transfer"
    if has_any(text, ["奖学金", "奖助", "评奖", "综合测评"]):
        return "scholarship"
    if has_any(text, ["助学金", "资助", "困难认定", "助学贷款", "绿色通道", "勤工助学", "困难补助"]):
        return "grant"
    if has_any(text, ["处分", "违纪", "申诉", "申辩", "通报批评", "警告", "严重警告", "留校察看", "开除学籍"]):
        return "discipline"
    if has_any(text, ["保研", "推免", "免试攻读", "推荐免试", "免试研究生"]):
        return "postgraduate_recommendation"
    if has_any(text, ["请假", "病假", "事假", "暂缓注册", "休学", "复学", "保留学籍"]):
        return "leave_request"
    if has_any(text, ["毕业", "学位", "结业", "肄业", "毕业审核", "学分不够", "四级"]):
        if has_any(text, ["毕业论文", "毕业设计", "论文", "答辩", "盲审", "校外做"]):
            return "thesis"
        return "graduation"
    if has_any(text, ["毕业论文", "毕业设计", "论文", "答辩", "盲审", "校外做"]):
        return "thesis"
    if has_any(text, ["学籍", "休学", "复学", "退学", "信息变更"]):
        if has_any(text, ["信息变更", "改名", "身份证", "民族", "出生日期"]):
            return "status_change"
        return "student_status"
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

    english_match = re.search(r"(?:四级|六级|CET[- ]?[46]|英语)[^\d]{0,8}([0-9]{3})", question, re.IGNORECASE)
    if english_match:
        slots["english_score"] = int(english_match.group(1))

    if has_any(text, ["没有挂科", "无挂科", "未挂科", "没有不及格", "无不及格"]):
        slots["has_failed_course"] = False
    elif has_any(text, ["挂科", "不及格"]):
        slots["has_failed_course"] = True

    if has_any(text, ["没有处分", "无处分", "未受处分", "无纪律处分"]):
        slots["has_disciplinary_record"] = False
    elif has_any(text, ["处分", "纪律处分"]):
        slots["has_disciplinary_record"] = True

    if has_any(text, ["已认定", "完成困难认定", "通过困难认定", "已经困难认定"]):
        slots["has_difficulty_identification"] = True
    elif has_any(text, ["未认定", "没有困难认定", "没做困难认定", "未完成困难认定"]):
        slots["has_difficulty_identification"] = False

    difficulty_match = re.search(r"(特别困难|特殊困难|困难|一般困难|家庭经济困难|建档立卡|低保|孤儿|残疾)", question)
    if difficulty_match:
        slots["difficulty_level"] = difficulty_match.group(1)

    if has_any(text, ["材料齐", "材料已准备", "证明齐", "已上传材料"]):
        slots["material_status"] = "已准备"
        slots["has_supporting_material"] = True
    elif has_any(text, ["没材料", "缺材料", "证明还没", "材料不全"]):
        slots["material_status"] = "材料不全"
        slots["has_supporting_material"] = False

    if has_any(text, ["有邀请函", "有接收函", "拿到邀请函", "拿到接收函"]):
        slots["has_acceptance_letter"] = True
    elif has_any(text, ["没有邀请函", "没有接收函", "无邀请函", "无接收函"]):
        slots["has_acceptance_letter"] = False

    target_match = re.search(r"(?:转到|转入|想转)([^，。！？\s]{2,20})", question)
    if target_match:
        slots["target_major"] = target_match.group(1)

    if has_any(text, ["科研", "竞赛", "论文", "专利", "获奖", "加分材料"]):
        slots["research_awards"] = "已提及科研竞赛或加分材料"

    leave_type_match = re.search(r"(病假|事假|公假|请假|暂缓注册|休学|复学|保留学籍)", question)
    if leave_type_match:
        slots["leave_type"] = leave_type_match.group(1)
        slots["status_action"] = leave_type_match.group(1)

    leave_days_match = re.search(r"([0-9一二三四五六七八九十]{1,3})(天|周|个?月|个?学期)", question)
    if leave_days_match:
        slots["leave_days"] = leave_days_match.group(0)

    if has_any(text, ["离校", "回家", "外出"]):
        slots["leave_off_campus"] = True
    elif has_any(text, ["不离校", "校内"]):
        slots["leave_off_campus"] = False

    violation_match = re.search(r"(考试作弊|考试违纪|学术不端|抄袭|旷课|打架|斗殴|网络|宿舍|违法|违纪)", question)
    if violation_match:
        slots["violation_type"] = violation_match.group(1)

    stage_match = re.search(r"(调查|拟处分|已处分|处分决定|申诉|解除|解除处分|影响期)", question)
    if stage_match:
        slots["process_stage"] = stage_match.group(1)

    if has_any(text, ["申诉", "申辩", "陈述"]):
        slots["appeal_intent"] = True

    impact_match = re.search(r"(评奖|奖学金|保研|推免|毕业|学位|学籍)", question)
    if impact_match and has_any(text, ["影响", "会不会", "还能", "能否"]):
        slots["impact_focus"] = impact_match.group(1)

    if has_any(text, ["修满学分", "学分够", "学分已够"]):
        slots["credits_completed"] = True
    elif has_any(text, ["学分不够", "未修满", "欠学分", "差学分"]):
        slots["credits_completed"] = False

    if has_any(text, ["论文通过", "答辩通过", "毕设通过"]):
        slots["thesis_status"] = "通过"
    elif has_any(text, ["盲审不通过", "答辩不通过", "论文未通过", "毕设未通过"]):
        slots["thesis_status"] = "未通过"
    elif has_any(text, ["待答辩", "准备答辩", "论文修改", "需要修改"]):
        slots["thesis_status"] = "待答辩/需修改"

    if has_any(text, ["四级通过", "四级合格", "英语合格"]):
        slots["cet4_qualified"] = True
    elif has_any(text, ["四级没过", "四级不合格", "英语不合格"]):
        slots["cet4_qualified"] = False

    status_action_match = re.search(r"(休学|复学|退学|降级|保留学籍|注册|信息变更|改名|变更身份证|更改民族)", question)
    if status_action_match:
        slots["status_action"] = status_action_match.group(1)

    if has_any(text, ["学院已审核", "学院同意", "学院通过"]):
        slots["college_review_status"] = "学院已审核"
    elif has_any(text, ["学院未审核", "还没学院审核", "学院没通过"]):
        slots["college_review_status"] = "学院未完成审核"

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
