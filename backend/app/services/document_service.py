from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Citation, PolicyAttachment, PolicyChunk, PolicyDocument
from app.services.document_parser import ParsedSegment, parse_policy_file


def parse_document(session: Session, document: PolicyDocument) -> PolicyDocument:
    document.parse_status = "parsing"
    document.parse_error = None
    session.commit()

    try:
        segments = parse_policy_file(Path(document.file_path), document.file_type)
        attachment = session.execute(
            select(PolicyAttachment).where(PolicyAttachment.document_id == document.id)
        ).scalar_one_or_none()

        session.execute(delete(Citation).where(Citation.document_id == document.id))
        session.execute(delete(PolicyChunk).where(PolicyChunk.document_id == document.id))
        for segment in segments:
            session.add(
                PolicyChunk(
                    document_id=document.id,
                    attachment_id=attachment.id if attachment else None,
                    chunk_text=segment.text,
                    chunk_index=segment.order,
                    section_title=segment.section_title,
                    page_no=segment.page_no,
                    policy_level=document.policy_level,
                    policy_category=document.policy_category,
                    applicable_scope=document.applicable_scope,
                    effective_from=document.effective_from,
                    effective_to=document.effective_to,
                    chunk_metadata={
                        "source": "m3_parser",
                        "unit": segment.kind,
                        "order": segment.order,
                    },
                )
            )

        parsed_path = write_parsed_text(document.id, segments)
        document.parse_status = "parsed"
        document.parse_error = None
        document.parsed_text_path = str(parsed_path)
        document.parsed_at = datetime.now(timezone.utc)
        session.commit()
        session.refresh(document)
        return document
    except Exception as exc:
        session.rollback()
        document = session.get(PolicyDocument, document.id)
        if document is None:
            raise
        document.parse_status = "failed"
        document.parse_error = str(exc)
        session.commit()
        session.refresh(document)
        return document


def write_parsed_text(document_id: str, segments: list[ParsedSegment]) -> Path:
    settings.parsed_dir.mkdir(parents=True, exist_ok=True)
    parsed_path = settings.parsed_dir / f"{document_id}.txt"

    content: list[str] = []
    for segment in segments:
        label = f"page={segment.page_no}" if segment.page_no else f"order={segment.order}"
        content.append(f"[{segment.kind} {label}]")
        content.append(segment.text)
        content.append("")

    parsed_path.write_text("\n".join(content), encoding="utf-8")
    return parsed_path
