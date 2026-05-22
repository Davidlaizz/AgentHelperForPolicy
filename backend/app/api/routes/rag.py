from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models import PolicyDocument
from app.schemas.rag import RAGIndexResponse, RAGSearchRequest, RAGSearchResponse
from app.services.rag.indexer import index_document, rebuild_rag_index
from app.services.rag.metadata_filter import RetrievalFilters
from app.services.rag.retriever import hybrid_search

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/index/rebuild", response_model=RAGIndexResponse)
def rebuild_index(db: Annotated[Session, Depends(get_db)]) -> RAGIndexResponse:
    result = rebuild_rag_index(db)
    return RAGIndexResponse(**result)


@router.post("/index/documents/{document_id}", response_model=RAGIndexResponse)
def rebuild_document_index(
    document_id: str,
    db: Annotated[Session, Depends(get_db)],
) -> RAGIndexResponse:
    document = db.get(PolicyDocument, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="政策文件不存在")
    chunk_count = index_document(db, document)
    return RAGIndexResponse(document_count=1, chunk_count=chunk_count)


@router.get("/search", response_model=RAGSearchResponse)
def search(
    db: Annotated[Session, Depends(get_db)],
    query: Annotated[str, Query(min_length=1)],
    top_k: Annotated[int, Query(ge=1, le=20)] = 5,
    policy_level: str | None = None,
    policy_category: str | None = None,
    applicable_scope: str | None = None,
    college: str | None = None,
    as_of_date: date | None = None,
    include_expired: bool = False,
) -> RAGSearchResponse:
    request = RAGSearchRequest(
        query=query,
        top_k=top_k,
        policy_level=policy_level,
        policy_category=policy_category,
        applicable_scope=applicable_scope,
        college=college,
        as_of_date=as_of_date,
        include_expired=include_expired,
    )
    return run_search(db, request)


@router.post("/search", response_model=RAGSearchResponse)
def search_with_body(
    request: RAGSearchRequest,
    db: Annotated[Session, Depends(get_db)],
) -> RAGSearchResponse:
    return run_search(db, request)


def run_search(db: Session, request: RAGSearchRequest) -> RAGSearchResponse:
    filters = RetrievalFilters(
        policy_level=request.policy_level,
        policy_category=request.policy_category,
        applicable_scope=request.applicable_scope,
        college=request.college,
        as_of_date=request.as_of_date,
        include_expired=request.include_expired,
    )
    results = hybrid_search(db, request.query, filters, request.top_k)
    return RAGSearchResponse(
        query=request.query,
        top_k=request.top_k,
        results=results,
    )
