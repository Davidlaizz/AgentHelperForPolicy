from __future__ import annotations

import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.services.rag.indexer import rebuild_rag_index
from app.services.rag.metadata_filter import RetrievalFilters
from app.services.rag.retriever import hybrid_search


def run_smoke_test() -> None:
    init_db()
    queries = ["奖学金", "转专业", "毕业论文", "申请表"]

    with SessionLocal() as session:
        summary = rebuild_rag_index(session)
        print({"indexed": summary})

        for query in queries:
            results = hybrid_search(
                session,
                query,
                RetrievalFilters(include_expired=True),
                top_k=3,
            )
            print(
                {
                    "query": query,
                    "hits": [
                        {
                            "title": item["document_title"],
                            "score": item["final_score"],
                            "page_no": item["page_no"],
                            "chunk": item["chunk_text"][:80],
                        }
                        for item in results
                    ],
                }
            )


if __name__ == "__main__":
    run_smoke_test()
