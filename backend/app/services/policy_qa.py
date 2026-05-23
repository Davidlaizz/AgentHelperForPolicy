from __future__ import annotations

from datetime import datetime, timezone
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ChatMessage, ChatSession, Citation, HotQuestion, User
from app.schemas.chat import ChatCitationResponse, ChatResponse
from app.services.answer_sections import split_answer_sections
from app.services.agent_graph import run_policy_multi_agent_graph


def answer_policy_question(
    session: Session,
    question: str,
    session_id: str | None = None,
    user_id: str | None = None,
    top_k: int = 5,
    policy_category: str | None = None,
    include_expired: bool = False,
) -> ChatResponse:
    chat_session = get_or_create_session(session, question, session_id, user_id)
    user_message = ChatMessage(session_id=chat_session.id, role="user", content=question)
    session.add(user_message)
    session.flush()

    graph_result = run_policy_multi_agent_graph(
        session,
        chat_session=chat_session,
        question=question,
        top_k=top_k,
        policy_category=policy_category,
        include_expired=include_expired,
    )
    final_state = graph_result.state
    retrieved = final_state.get("retrieved_chunks") or []
    raw_answer = final_state.get("final_answer") or ""
    policy_basis = final_state.get("policy_basis") or raw_answer
    ai_inference = final_state.get("ai_inference") or "未生成额外推断。"

    assistant_message = ChatMessage(
        session_id=chat_session.id,
        role="assistant",
        content=raw_answer,
        extra_metadata={
            "policy_basis": policy_basis,
            "ai_inference": ai_inference,
            "retrieved_count": len(retrieved),
            "agent": graph_result.agent_response.model_dump(),
        },
    )
    session.add(assistant_message)
    session.flush()

    citations = create_citations(session, assistant_message, retrieved)
    update_hot_question(session, question, policy_category)
    session.commit()
    session.refresh(user_message)
    session.refresh(assistant_message)

    return ChatResponse(
        session_id=str(chat_session.id),
        user_message_id=str(user_message.id),
        assistant_message_id=str(assistant_message.id),
        question=question,
        answer=raw_answer,
        policy_basis=policy_basis,
        ai_inference=ai_inference,
        citations=citations,
        retrieved_chunks=retrieved,
        agent=graph_result.agent_response,
    )


def get_or_create_session(
    db: Session,
    question: str,
    session_id: str | None,
    user_id: str | None,
) -> ChatSession:
    if session_id:
        chat_session = db.get(ChatSession, session_id)
        if chat_session is not None:
            return chat_session

    user = get_or_create_user(db, user_id)
    chat_session = ChatSession(
        user_id=user.id,
        title=question[:60],
    )
    db.add(chat_session)
    db.flush()
    return chat_session


def get_or_create_user(db: Session, user_id: str | None) -> User:
    if user_id:
        user = db.get(User, user_id)
        if user is not None:
            return user

    user = db.execute(
        select(User).where(User.display_name == "M5 Demo User")
    ).scalar_one_or_none()
    if user is not None:
        return user

    user = User(role="student", display_name="M5 Demo User")
    db.add(user)
    db.flush()
    return user


def build_policy_prompt(
    question: str,
    retrieved: list[dict],
    agent_context: str | None = None,
) -> str:
    context_lines = []
    for index, item in enumerate(retrieved, start=1):
        context_lines.append(
            "\n".join(
                [
                    f"[{index}] 文件：{item['document_title']}",
                    f"页码：{item.get('page_no') or '无'}",
                    f"条款：{item.get('article_no') or '无'}",
                    f"内容：{item['chunk_text']}",
                ]
            )
        )

    context = (
        "请基于以下政策片段回答问题。必须区分“政策依据”和“AI 推断”；"
        "如果片段不足以支持结论，要明确说明不确定。\n\n"
        f"用户问题：{question}\n\n"
        "政策片段：\n"
        + "\n\n".join(context_lines)
    )
    if agent_context:
        context += "\n\n" + agent_context
    return context


def create_citations(
    db: Session,
    message: ChatMessage,
    retrieved: list[dict],
) -> list[ChatCitationResponse]:
    citations: list[ChatCitationResponse] = []

    for item in retrieved[:5]:
        quote = item["chunk_text"][:300]
        citation = Citation(
            message_id=message.id,
            document_id=item["document_id"],
            chunk_id=item["chunk_id"],
            attachment_id=item["attachment_id"],
            page_no=item["page_no"],
            article_no=item["article_no"],
            quote_text=quote,
        )
        db.add(citation)
        db.flush()
        citations.append(
            ChatCitationResponse(
                citation_id=str(citation.id),
                document_id=item["document_id"],
                chunk_id=item["chunk_id"],
                attachment_id=item["attachment_id"],
                document_title=item["document_title"],
                file_name=item["file_name"],
                attachment_title=(item.get("metadata") or {}).get("attachment_title"),
                page_no=item["page_no"],
                article_no=item["article_no"],
                quote_text=quote,
                final_score=item["final_score"],
            )
        )

    return citations


def update_hot_question(db: Session, question: str, policy_category: str | None) -> None:
    if not is_valid_hot_question(question):
        return

    normalized = normalize_question(question)
    hot_question = db.execute(
        select(HotQuestion).where(HotQuestion.normalized_question == normalized)
    ).scalar_one_or_none()

    if hot_question is None:
        db.add(
            HotQuestion(
                question_text=question,
                normalized_question=normalized,
                policy_category=policy_category,
                hit_count=1,
            )
        )
        return

    hot_question.hit_count += 1
    hot_question.last_asked_at = datetime.now(timezone.utc)


def normalize_question(question: str) -> str:
    return "".join(question.lower().split())[:500]


def is_valid_hot_question(question: str) -> bool:
    normalized = "".join(question.split())
    if len(normalized) < 2:
        return False

    question_marks = normalized.count("?") + normalized.count("？")
    if question_marks and question_marks / len(normalized) > 0.4:
        return False

    return bool(re.search(r"[\u4e00-\u9fffA-Za-z0-9]", normalized))
