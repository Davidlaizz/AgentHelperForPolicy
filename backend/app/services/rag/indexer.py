from __future__ import annotations

from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.models import PolicyAttachment, PolicyChunk, PolicyDocument
from app.services.rag.chunker import SourceSegment, build_rag_chunks
from app.services.rag.llama_index_adapter import build_policy_node, delete_document_nodes, index_nodes


def rebuild_rag_index(session: Session) -> dict[str, int]:
    documents = session.execute(
        select(PolicyDocument).where(PolicyDocument.parse_status.in_(["parsed", "indexed"]))
    ).scalars().all()

    document_count = 0
    chunk_count = 0
    for document in documents:
        indexed = index_document(session, document)
        document_count += 1
        chunk_count += indexed

    return {"document_count": document_count, "chunk_count": chunk_count}


def index_document(session: Session, document: PolicyDocument) -> int:
    source_chunks = session.execute(
        select(PolicyChunk)
        .where(PolicyChunk.document_id == document.id)
        .order_by(PolicyChunk.chunk_index.asc())
    ).scalars().all()

    if not source_chunks:
        raise ValueError("当前文件没有可索引的解析文本")

    attachment = session.execute(
        select(PolicyAttachment).where(PolicyAttachment.document_id == document.id)
    ).scalar_one_or_none()
    drafts = build_rag_chunks(
        [
            SourceSegment(
                text=chunk.chunk_text,
                order=chunk.chunk_index,
                section_title=chunk.section_title,
                page_no=chunk.page_no,
            )
            for chunk in source_chunks
        ]
    )

    delete_document_nodes(str(document.id))
    session.execute(delete(PolicyChunk).where(PolicyChunk.document_id == document.id))

    indexed_chunks: list[PolicyChunk] = []
    for draft in drafts:
        metadata = build_chunk_metadata(document, attachment)
        metadata.update(
            {
                "source": "m4_llamaindex_indexer",
                "chunk_chars": len(draft.text),
            }
        )
        chunk = PolicyChunk(
            document_id=document.id,
            attachment_id=attachment.id if attachment else None,
            chunk_text=draft.text,
            chunk_index=draft.chunk_index,
            section_title=draft.section_title,
            article_no=draft.article_no,
            page_no=draft.page_no,
            policy_level=document.policy_level,
            policy_category=document.policy_category,
            applicable_scope=document.applicable_scope,
            effective_from=document.effective_from,
            effective_to=document.effective_to,
            chunk_metadata=metadata,
        )
        session.add(chunk)
        indexed_chunks.append(chunk)

    session.flush()
    nodes = [build_policy_node(chunk, document, attachment) for chunk in indexed_chunks]
    index_nodes(nodes)

    document.parse_status = "indexed"
    session.commit()
    refresh_search_vectors(session, str(document.id))
    session.refresh(document)
    return len(indexed_chunks)


def refresh_search_vectors(session: Session, document_id: str | None = None) -> None:
    if document_id:
        session.execute(
            text(
                """
                UPDATE policy_chunks
                SET search_vector = to_tsvector('simple', coalesce(chunk_text, ''))
                WHERE document_id = CAST(:document_id AS uuid)
                """
            ),
            {"document_id": document_id},
        )
    else:
        session.execute(
            text(
                """
                UPDATE policy_chunks
                SET search_vector = to_tsvector('simple', coalesce(chunk_text, ''))
                """
            )
        )
    session.commit()


def build_chunk_metadata(
    document: PolicyDocument,
    attachment: PolicyAttachment | None,
) -> dict[str, str | None]:
    return {
        "document_id": str(document.id),
        "policy_level": document.policy_level,
        "policy_category": document.policy_category,
        "applicable_scope": document.applicable_scope,
        "college": document.college,
        "effective_from": document.effective_from.isoformat() if document.effective_from else None,
        "effective_to": document.effective_to.isoformat() if document.effective_to else None,
        "parent_document_id": str(attachment.parent_document_id) if attachment else None,
        "attachment_title": attachment.attachment_title if attachment else None,
    }
