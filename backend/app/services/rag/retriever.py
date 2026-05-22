from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.rag.fusion import merge_results
from app.services.rag.llama_index_adapter import LlamaIndexFilter, retrieve_nodes
from app.services.rag.metadata_filter import RetrievalFilters, is_effective
from app.services.rag.relation_resolver import attach_related_sources


def hybrid_search(
    session: Session,
    query: str,
    filters: RetrievalFilters,
    top_k: int = 5,
) -> list[dict]:
    top_k = max(1, min(top_k, 20))
    vector_results = vector_search(session, query, filters, top_k * 5)
    keyword_results = keyword_search(session, query, filters, top_k * 3)
    merged = merge_results(vector_results, keyword_results)
    attach_related_sources(session, merged)
    ranked = sorted(
        merged.values(),
        key=lambda item: item["final_score"],
        reverse=True,
    )
    return ranked[:top_k]


def vector_search(
    session: Session,
    query: str,
    filters: RetrievalFilters,
    limit: int,
) -> list[dict]:
    nodes = retrieve_nodes(
        query,
        LlamaIndexFilter(
            policy_level=filters.policy_level,
            policy_category=filters.policy_category,
            applicable_scope=filters.applicable_scope,
            college=filters.college,
        ),
        limit,
    )
    results: list[dict] = []

    for node_with_score in nodes:
        metadata = node_with_score.node.metadata
        chunk_id = metadata.get("chunk_id")
        if not chunk_id:
            continue
        row = load_chunk_row(session, str(chunk_id))
        if row is None or not row_allowed(row, filters):
            continue
        results.append(
            row_to_result(
                row,
                vector_score=float(node_with_score.score or 0.0),
                keyword_score=0.0,
                metadata=metadata,
            )
        )

    return results


def keyword_search(
    session: Session,
    query: str,
    filters: RetrievalFilters,
    limit: int,
) -> list[dict]:
    terms = keyword_terms(query)
    if not terms:
        return []

    conditions = []
    params: dict[str, object] = {"limit": limit}
    for index, term in enumerate(terms):
        key = f"term_{index}"
        conditions.append(f"c.chunk_text ILIKE :{key}")
        params[key] = f"%{term}%"

    where_sql, filter_params = build_filter_sql(filters)
    params.update(filter_params)
    params["term_count"] = len(terms)
    keyword_condition = " OR ".join(conditions)
    score_sql = " + ".join(
        f"CASE WHEN c.chunk_text ILIKE :term_{index} THEN 1 ELSE 0 END"
        for index in range(len(terms))
    )

    rows = session.execute(
        text(
            f"""
            SELECT
                c.id AS chunk_id,
                c.document_id,
                c.attachment_id,
                c.chunk_text,
                c.section_title,
                c.article_no,
                c.page_no,
                c.metadata AS chunk_metadata,
                d.title AS document_title,
                d.file_name,
                d.policy_level,
                d.policy_category,
                d.applicable_scope,
                d.college,
                d.effective_from,
                d.effective_to,
                (({score_sql})::float / :term_count) AS keyword_score
            FROM policy_chunks c
            JOIN policy_documents d ON d.id = c.document_id
            WHERE ({keyword_condition})
            {where_sql}
            ORDER BY keyword_score DESC, c.chunk_index ASC
            LIMIT :limit
            """
        ),
        params,
    ).mappings().all()
    return [
        row_to_result(row, vector_score=0.0, keyword_score=float(row["keyword_score"] or 0))
        for row in rows
    ]


def build_filter_sql(filters: RetrievalFilters) -> tuple[str, dict[str, object]]:
    clauses: list[str] = []
    params: dict[str, object] = {}

    if filters.policy_level:
        clauses.append("d.policy_level = :policy_level")
        params["policy_level"] = filters.policy_level
    if filters.policy_category:
        clauses.append("d.policy_category = :policy_category")
        params["policy_category"] = filters.policy_category
    if filters.applicable_scope:
        clauses.append("(d.applicable_scope IS NULL OR d.applicable_scope ILIKE :applicable_scope)")
        params["applicable_scope"] = f"%{filters.applicable_scope}%"
    if filters.college:
        clauses.append("(d.college IS NULL OR d.college ILIKE :college)")
        params["college"] = f"%{filters.college}%"
    if filters.as_of_date and not filters.include_expired:
        clauses.append("(d.effective_from IS NULL OR d.effective_from <= :as_of_date)")
        clauses.append("(d.effective_to IS NULL OR d.effective_to >= :as_of_date)")
        params["as_of_date"] = filters.as_of_date

    if not clauses:
        return "", params
    return "AND " + " AND ".join(clauses), params


def load_chunk_row(session: Session, chunk_id: str):
    return session.execute(
        text(
            """
            SELECT
                c.id AS chunk_id,
                c.document_id,
                c.attachment_id,
                c.chunk_text,
                c.section_title,
                c.article_no,
                c.page_no,
                c.metadata AS chunk_metadata,
                d.title AS document_title,
                d.file_name,
                d.policy_level,
                d.policy_category,
                d.applicable_scope,
                d.college,
                d.effective_from,
                d.effective_to
            FROM policy_chunks c
            JOIN policy_documents d ON d.id = c.document_id
            WHERE c.id = CAST(:chunk_id AS uuid)
            """
        ),
        {"chunk_id": chunk_id},
    ).mappings().one_or_none()


def row_allowed(row, filters: RetrievalFilters) -> bool:
    return is_effective(row["effective_from"], row["effective_to"], filters)


def row_to_result(
    row,
    vector_score: float,
    keyword_score: float,
    metadata: dict | None = None,
) -> dict:
    return {
        "chunk_id": str(row["chunk_id"]),
        "document_id": str(row["document_id"]),
        "attachment_id": str(row["attachment_id"]) if row["attachment_id"] else None,
        "document_title": row["document_title"],
        "file_name": row["file_name"],
        "chunk_text": row["chunk_text"],
        "section_title": row["section_title"],
        "article_no": row["article_no"],
        "page_no": row["page_no"],
        "policy_level": row["policy_level"],
        "policy_category": row["policy_category"],
        "applicable_scope": row["applicable_scope"],
        "college": row["college"],
        "effective_from": row["effective_from"],
        "effective_to": row["effective_to"],
        "metadata": metadata or row["chunk_metadata"] or {},
        "vector_score": round(vector_score, 6),
        "keyword_score": round(keyword_score, 6),
        "authority_bonus": 0.0,
        "recency_bonus": 0.0,
        "relation_bonus": 0.0,
        "final_score": 0.0,
        "related_sources": [],
    }


def keyword_terms(query: str) -> list[str]:
    cleaned = query.strip()
    if not cleaned:
        return []
    terms = [part for part in cleaned.replace("，", " ").replace("？", " ").split() if part]
    if len(terms) == 1 and len(cleaned) > 2:
        terms.extend(cleaned[index : index + 2] for index in range(len(cleaned) - 1))
    return list(dict.fromkeys(term for term in terms if len(term) >= 2))[:12]
