from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.policy_qa import answer_policy_question

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Annotated[Session, Depends(get_db)],
) -> ChatResponse:
    try:
        return answer_policy_question(
            db,
            question=request.question,
            session_id=request.session_id,
            user_id=request.user_id,
            top_k=request.top_k,
            policy_category=request.policy_category,
            include_expired=request.include_expired,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
