from __future__ import annotations

import os
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

os.environ["LLM_PROVIDER"] = "mock"

from fastapi.testclient import TestClient

from app.main import app


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

    print("M6 smoke test passed.")
    print(f"session_id={first_data['session_id']}")
    print(f"case_id={second_agent['case']['case_id']}")
    print(f"eligibility={second_agent['eligibility']['result_status']}")


if __name__ == "__main__":
    main()
