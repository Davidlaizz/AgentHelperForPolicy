from __future__ import annotations

import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from fastapi.testclient import TestClient

from app.db.init_db import init_db
from app.main import app


def main() -> None:
    init_db()
    client = TestClient(app)

    dashboard = client.get("/api/management/dashboard")
    dashboard.raise_for_status()
    dashboard_data = dashboard.json()
    assert "document_count" in dashboard_data
    assert "chunk_count" in dashboard_data

    hot_questions = client.get("/api/management/hot-questions?limit=5")
    hot_questions.raise_for_status()
    assert isinstance(hot_questions.json(), list)

    answer_payload = {
        "title": "M7 烟测标准答案",
        "policy_category": "测试",
        "question_keywords": ["烟测", "标准答案"],
        "applicable_scope": "M7 smoke",
        "answer_content": "这是 M7 后台标准答案维护的烟测记录。",
        "status": "active",
    }
    created = client.post("/api/management/standard-answers", json=answer_payload)
    created.raise_for_status()
    answer_id = created.json()["id"]

    updated = client.patch(
        f"/api/management/standard-answers/{answer_id}",
        json={"status": "disabled"},
    )
    updated.raise_for_status()
    assert updated.json()["status"] == "disabled"

    chunks = client.get("/api/management/policy-chunks?limit=5")
    chunks.raise_for_status()
    chunks_data = chunks.json()
    assert "total" in chunks_data
    assert "results" in chunks_data

    print("M7 smoke test passed.")
    print(f"documents={dashboard_data['document_count']}")
    print(f"chunks={dashboard_data['chunk_count']}")
    print(f"standard_answer_id={answer_id}")


if __name__ == "__main__":
    main()
