from __future__ import annotations

import os
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

os.environ["LLM_PROVIDER"] = "mock"

from fastapi.testclient import TestClient

from app.main import app
from app.services.agent.rules import detect_case_type, extract_slots


def main() -> None:
    client = TestClient(app)

    first = client.post(
        "/api/chat",
        json={
            "question": "我能转专业吗？",
            "top_k": 3,
            "include_expired": True,
        },
    )
    first.raise_for_status()
    first_data = first.json()
    first_agent = first_data["agent"]
    assert first_agent["intent"] == "eligibility_check"
    assert first_agent["case"]["case_type"] == "major_transfer"
    assert first_agent["missing_slots"]

    second = client.post(
        "/api/chat",
        json={
            "session_id": first_data["session_id"],
            "question": "我是大一，绩点 3.6，无挂科，无处分，想转入计算机专业，今年申请",
            "top_k": 3,
            "include_expired": True,
        },
    )
    second.raise_for_status()
    second_agent = second.json()["agent"]
    assert second_agent["intent"] == "eligibility_check"
    assert not second_agent["missing_slots"]
    assert second_agent["eligibility"]["result_status"] == "likely_eligible"

    scenario_questions = {
        "我挂过一门课，还能申请奖学金吗？": "scholarship",
        "家庭经济困难认定后怎么申请国家助学金？": "grant",
        "我有一次挂科还能保研吗？": "postgraduate_recommendation",
        "我学分不够会影响毕业吗？": "graduation",
        "因病休学需要什么证明？": "leave_request",
        "受到处分会影响保研吗？": "discipline",
        "学籍信息变更需要哪些材料？": "status_change",
    }
    for question, expected_case_type in scenario_questions.items():
        assert detect_case_type(question) == expected_case_type

    grant_slots = extract_slots("我是大一，已完成困难认定，材料已准备，今年申请")
    assert grant_slots["has_difficulty_identification"] is True
    assert grant_slots["has_supporting_material"] is True

    recommendation_slots = extract_slots("我是大三，排名前 8%，绩点 3.9，四级 560，无挂科，无处分，有竞赛获奖")
    assert recommendation_slots["rank_percent"] == 8
    assert recommendation_slots["english_score"] == 560
    assert recommendation_slots["has_failed_course"] is False
    assert recommendation_slots["has_disciplinary_record"] is False

    print("M6 smoke test passed.")
    print(f"session_id={first_data['session_id']}")
    print(f"case_id={second_agent['case']['case_id']}")
    print(f"eligibility={second_agent['eligibility']['result_status']}")


if __name__ == "__main__":
    main()
