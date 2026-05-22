from __future__ import annotations

import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.services.policy_qa import answer_policy_question


def run_smoke_test() -> None:
    init_db()
    question = "校外做毕业论文需要什么申请表？"

    with SessionLocal() as session:
        response = answer_policy_question(
            session,
            question=question,
            top_k=3,
            include_expired=True,
        )
        print(
            {
                "session_id": response.session_id,
                "question": response.question,
                "citation_count": len(response.citations),
                "first_citation_page": response.citations[0].page_no if response.citations else None,
                "policy_basis_preview": response.policy_basis[:120],
            }
        )


if __name__ == "__main__":
    run_smoke_test()
