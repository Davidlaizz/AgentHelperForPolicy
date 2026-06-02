from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.digital_village.config import dv_settings
from app.digital_village.services.rag.retriever import dv_hybrid_search
from app.models import ChatMessage, ChatSession, Citation, HotQuestion, User
from app.schemas.chat import ChatCitationResponse, ChatResponse
from app.services.rag.metadata_filter import RetrievalFilters


def dv_answer_policy_question(
    session: Session,
    question: str,
    session_id: str | None = None,
    user_id: str | None = None,
    top_k: int = 5,
    policy_category: str | None = None,
    include_expired: bool = False,
) -> ChatResponse:
    """Digital village simplified chat: RAG retrieval + LLM generation."""
    chat_session = _dv_get_or_create_session(session, question, session_id, user_id)
    user_message = ChatMessage(session_id=chat_session.id, role="user", content=question)
    session.add(user_message)
    session.flush()

    filters = RetrievalFilters(
        policy_category=policy_category,
        include_expired=include_expired,
    )
    retrieved = dv_hybrid_search(session, question, filters, top_k)

    prompt = _build_dv_prompt(question, retrieved)
    raw_answer = _dv_call_llm(prompt, retrieved)
    policy_basis, ai_inference = _split_dv_answer(raw_answer)

    assistant_message = ChatMessage(
        session_id=chat_session.id,
        role="assistant",
        content=raw_answer,
        extra_metadata={
            "policy_basis": policy_basis,
            "ai_inference": ai_inference,
            "retrieved_count": len(retrieved),
        },
    )
    session.add(assistant_message)
    session.flush()

    citations = _dv_create_citations(session, assistant_message, retrieved)
    _dv_update_hot_question(session, question, policy_category)
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
        agent=None,
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are a digital village policy Q&A assistant for rural and agricultural "
    "scenarios. Answer based only on the provided policy fragments. "
    "Distinguish between [Policy Basis] and [AI Inference]. "
    "If the fragments are insufficient to support a conclusion, clearly state the uncertainty."
)


def _dv_get_or_create_session(
    db: Session, question: str, session_id: str | None, user_id: str | None
) -> ChatSession:
    if session_id:
        chat_session = db.get(ChatSession, session_id)
        if chat_session is not None:
            return chat_session
    user = _dv_get_or_create_user(db, user_id)
    chat_session = ChatSession(user_id=user.id, title=question[:60])
    db.add(chat_session)
    db.flush()
    return chat_session


def _dv_get_or_create_user(db: Session, user_id: str | None) -> User:
    if user_id:
        user = db.get(User, user_id)
        if user is not None:
            return user
    user = db.execute(
        select(User).where(User.display_name == "digital-village-demo")
    ).scalar_one_or_none()
    if user is not None:
        return user
    user = User(role="student", display_name="digital-village-demo")
    db.add(user)
    db.flush()
    return user


def _build_dv_prompt(question: str, retrieved: list[dict]) -> str:
    if not retrieved:
        return f"{SYSTEM_PROMPT}\n\nUser question: {question}\n\nPolicy fragments: none."

    context_lines: list[str] = []
    for index, item in enumerate(retrieved, start=1):
        context_lines.append(
            f"[{index}] Doc: {item['document_title']}\n"
            f"Page: {item.get('page_no') or 'N/A'}  "
            f"Article: {item.get('article_no') or 'N/A'}\n"
            f"Content: {item['chunk_text']}"
        )
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"User question: {question}\n\n"
        "Policy fragments:\n" + "\n\n".join(context_lines)
    )


def _split_dv_answer(raw_answer: str) -> tuple[str, str]:
    """Split raw answer into policy_basis and ai_inference sections."""
    markers = [
        "\n[AI Inference]",
        "\nAI Inference:",
        "\nAI:",
    ]
    for marker in markers:
        if marker in raw_answer:
            parts = raw_answer.split(marker, 1)
            return parts[0].strip(), parts[1].strip() if len(parts) > 1 else ""
    return raw_answer, ""


def _dv_call_llm(prompt: str, contexts: list[dict]) -> str:
    if dv_settings.dv_llm_provider == "mock":
        return _dv_mock_generate(contexts)
    if dv_settings.dv_llm_provider == "http":
        return _dv_http_generate(prompt)
    raise RuntimeError(f"Unsupported LLM provider: {dv_settings.dv_llm_provider}")


# ---------------------------------------------------------------------------
# Mock LLM
# ---------------------------------------------------------------------------

def _dv_mock_generate(contexts: list[dict]) -> str:
    if not contexts:
        return (
            "[Policy Basis]\n"
            "No sufficiently clear policy fragments were retrieved.\n\n"
            "[AI Inference]\n"
            "Please provide more details such as policy name, matter type, region, "
            "or entity type (farmer / cooperative / village collective / startup)."
        )

    basis_lines: list[str] = []
    for i, item in enumerate(contexts[:3], start=1):
        loc = _citation_location(item)
        basis_lines.append(
            f"{i}. [{item['document_title']}]{loc}: {_compact_quote(item['chunk_text'])}"
        )

    first = contexts[0]
    loc = _citation_location(first)
    inference = (
        f"Based on retrieval results, [{first['document_title']}]{loc} is the most "
        "relevant. If your situation involves specific region, entity type, timing, "
        "or attached documents, further verification with corresponding notices "
        "and attachments is recommended."
    )

    return (
        "[Policy Basis]\n" + "\n".join(basis_lines)
        + "\n\n[AI Inference]\n" + inference
    )


# ---------------------------------------------------------------------------
# HTTP LLM
# ---------------------------------------------------------------------------

def _dv_http_generate(prompt: str) -> str:
    url = (dv_settings.dv_llm_api_url or "").rstrip("/")
    if not url:
        raise RuntimeError("DV_LLM_API_URL is not configured")
    if not url.endswith("/chat/completions"):
        url = f"{url}/chat/completions"

    payload_body: dict = {
        "model": dv_settings.dv_llm_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }
    if dv_settings.dv_llm_max_tokens:
        payload_body["max_tokens"] = dv_settings.dv_llm_max_tokens
    if dv_settings.dv_llm_thinking_type:
        payload_body["thinking"] = {"type": dv_settings.dv_llm_thinking_type}

    payload = json.dumps(payload_body, ensure_ascii=False).encode("utf-8")
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if dv_settings.dv_llm_api_key:
        headers["Authorization"] = f"Bearer {dv_settings.dv_llm_api_key}"

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=dv_settings.dv_llm_timeout_seconds) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(_format_llm_error(exc)) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"LLM service failed: {exc.reason}") from exc

    if "choices" in body:
        msg = body["choices"][0]["message"]
        # OpenAI-compatible: content field; senseNova: reasoning field
        return str(msg.get("content") or msg.get("reasoning") or "")
    if "output" in body:
        return str(body["output"])
    raise RuntimeError("LLM response missing 'choices' or 'output' field")


# ---------------------------------------------------------------------------
# Citations
# ---------------------------------------------------------------------------

def _dv_create_citations(
    db: Session, message: ChatMessage, retrieved: list[dict]
) -> list[ChatCitationResponse]:
    citations: list[ChatCitationResponse] = []
    for item in retrieved[:5]:
        quote = item["chunk_text"][:300]
        cit = Citation(
            message_id=message.id,
            document_id=item["document_id"],
            chunk_id=item["chunk_id"],
            attachment_id=item["attachment_id"],
            page_no=item["page_no"],
            article_no=item["article_no"],
            quote_text=quote,
        )
        db.add(cit)
        db.flush()
        citations.append(
            ChatCitationResponse(
                citation_id=str(cit.id),
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


# ---------------------------------------------------------------------------
# Hot question tracking
# ---------------------------------------------------------------------------

def _dv_update_hot_question(
    db: Session, question: str, policy_category: str | None
) -> None:
    if not _is_valid_question(question):
        return
    normalized = _normalize_question(question)
    existing = db.execute(
        select(HotQuestion).where(HotQuestion.normalized_question == normalized)
    ).scalar_one_or_none()
    if existing is None:
        db.add(
            HotQuestion(
                question_text=question,
                normalized_question=normalized,
                policy_category=policy_category,
                hit_count=1,
            )
        )
        return
    existing.hit_count += 1
    existing.last_asked_at = datetime.now(timezone.utc)


def _normalize_question(question: str) -> str:
    return "".join(question.lower().split())[:500]


def _is_valid_question(question: str) -> bool:
    compact = "".join(question.split())
    if len(compact) < 2:
        return False
    qm = compact.count("?")
    if qm and qm / len(compact) > 0.4:
        return False
    return bool(re.search(r"[一-鿿A-Za-z0-9]", compact))


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def _citation_location(item: dict) -> str:
    parts: list[str] = []
    if item.get("attachment_id"):
        parts.append("Attachment")
    if item.get("page_no"):
        parts.append(f"p.{item['page_no']}")
    if item.get("article_no"):
        parts.append(str(item["article_no"]))
    return " (" + ", ".join(parts) + ")" if parts else ""


def _compact_quote(text: str, limit: int = 120) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return normalized[:limit] + "..."


def _format_llm_error(error: urllib.error.HTTPError) -> str:
    raw_body = error.read().decode("utf-8", errors="replace")
    message = raw_body.strip()
    code_text = ""
    try:
        body = json.loads(raw_body)
        if isinstance(body, dict):
            message = str(body.get("message") or body.get("error") or message)
            if body.get("code") is not None:
                code_text = f", code {body['code']}"
    except json.JSONDecodeError:
        pass
    return f"LLM HTTP {error.code}{code_text}: {message}"
