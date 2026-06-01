from __future__ import annotations

from sqlalchemy.orm import Session

from app.services.rag.fusion import merge_results
from app.services.rag.metadata_filter import RetrievalFilters
from app.services.rag.relation_resolver import attach_related_sources
from app.services.rag.retriever import (
    build_filter_sql,
    keyword_search as _existing_keyword_search,
    keyword_terms,
    load_chunk_row,
    row_allowed,
    row_to_result,
)
from app.digital_village.services.rag.llama_index_adapter import (
    LlamaIndexFilter,
    dv_retrieve_nodes,
)


def dv_hybrid_search(
    session: Session,
    query: str,
    filters: RetrievalFilters,
    top_k: int = 5,
) -> list[dict]:
    top_k = max(1, min(top_k, 20))
    vector_results = _dv_vector_search(session, query, filters, top_k * 5)
    keyword_results = _dv_keyword_search(session, query, filters, top_k * 3)
    merged = merge_results(vector_results, keyword_results)
    attach_related_sources(session, merged)
    ranked = sorted(
        merged.values(),
        key=lambda item: item["final_score"],
        reverse=True,
    )
    return ranked[:top_k]


def _dv_vector_search(
    session: Session,
    query: str,
    filters: RetrievalFilters,
    limit: int,
) -> list[dict]:
    nodes = dv_retrieve_nodes(
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


def _dv_keyword_search(
    session: Session,
    query: str,
    filters: RetrievalFilters,
    limit: int,
) -> list[dict]:
    return _existing_keyword_search(session, query, filters, limit)
