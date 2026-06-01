from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.digital_village.db.dependencies import get_digital_village_db
from app.digital_village.services.chat_service import dv_answer_policy_question
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(tags=["digital-village-chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Annotated[Session, Depends(get_digital_village_db)],
) -> ChatResponse:
    try:
        return dv_answer_policy_question(
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
