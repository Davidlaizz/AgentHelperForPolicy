from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session


def attach_related_sources(session: Session, results: dict[str, dict]) -> None:
    for result in results.values():
        rows = session.execute(
            text(
                """
                SELECT
                    r.relation_type,
                    d.id AS document_id,
                    d.title,
                    d.file_name
                FROM policy_relations r
                JOIN policy_documents d ON d.id = r.target_document_id
                WHERE r.source_document_id = CAST(:document_id AS uuid)
                  AND r.relation_type IN ('has_attachment', 'attachment_of')
                """
            ),
            {"document_id": result["document_id"]},
        ).mappings().all()
        result["related_sources"] = [
            {
                "relation_type": row["relation_type"],
                "document_id": str(row["document_id"]),
                "title": row["title"],
                "file_name": row["file_name"],
            }
            for row in rows
        ]
