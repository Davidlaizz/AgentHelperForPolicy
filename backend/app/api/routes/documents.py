from __future__ import annotations

import hashlib
import uuid
from datetime import date
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.dependencies import get_db
from app.models import PolicyAttachment, PolicyChunk, PolicyDocument, PolicyRelation
from app.schemas.document import PolicyDocumentResponse, PolicyDocumentUpdateRequest
from app.services.document_service import parse_document

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".doc": "doc",
    ".html": "html",
    ".htm": "html",
}
PARSE_STATUSES = {"uploaded", "parsing", "parsed", "indexed", "failed"}


@router.get("", response_model=list[PolicyDocumentResponse])
def list_documents(db: Annotated[Session, Depends(get_db)]) -> list[PolicyDocumentResponse]:
    documents = db.execute(
        select(PolicyDocument).order_by(PolicyDocument.created_at.desc())
    ).scalars().all()
    return [serialize_document(db, document) for document in documents]


@router.post(
    "/upload",
    response_model=PolicyDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File()],
    title: Annotated[str | None, Form()] = None,
    policy_level: Annotated[str, Form()] = "校级",
    policy_category: Annotated[str, Form()] = "未分类",
    issuing_department: Annotated[str | None, Form()] = None,
    applicable_scope: Annotated[str | None, Form()] = None,
    college: Annotated[str | None, Form()] = None,
    publish_date: Annotated[date | None, Form()] = None,
    effective_from: Annotated[date | None, Form()] = None,
    effective_to: Annotated[date | None, Form()] = None,
    version: Annotated[str | None, Form()] = None,
    document_role: Annotated[str, Form()] = "main",
    parent_document_id: Annotated[str | None, Form()] = None,
    attachment_title: Annotated[str | None, Form()] = None,
    auto_parse: Annotated[bool, Form()] = True,
) -> PolicyDocumentResponse:
    file_type = validate_upload(file)
    saved_path, file_size, content_hash = await save_upload_file(file, file_type)

    document = PolicyDocument(
        title=title or Path(file.filename or saved_path.name).stem,
        file_name=file.filename or saved_path.name,
        file_path=str(saved_path),
        file_type=file_type,
        file_size=file_size,
        content_sha256=content_hash,
        policy_level=policy_level,
        policy_category=policy_category,
        issuing_department=issuing_department,
        applicable_scope=applicable_scope,
        college=college,
        publish_date=publish_date,
        effective_from=effective_from,
        effective_to=effective_to,
        version=version,
        parse_status="uploaded",
        source_type="upload",
    )
    db.add(document)
    db.flush()

    if document_role == "attachment":
        create_attachment_relation(db, document, parent_document_id, attachment_title)
    elif document_role != "main":
        raise HTTPException(status_code=400, detail="document_role 只能是 main 或 attachment")

    db.commit()
    db.refresh(document)

    if auto_parse:
        document = parse_document(db, document)

    return serialize_document(db, document)


@router.post("/{document_id}/parse", response_model=PolicyDocumentResponse)
def retry_parse_document(
    document_id: str,
    db: Annotated[Session, Depends(get_db)],
) -> PolicyDocumentResponse:
    document = db.get(PolicyDocument, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="政策文件不存在")

    document = parse_document(db, document)
    return serialize_document(db, document)


@router.patch("/{document_id}", response_model=PolicyDocumentResponse)
def update_document(
    document_id: str,
    payload: PolicyDocumentUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> PolicyDocumentResponse:
    document = db.get(PolicyDocument, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="政策文件不存在")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(document, field, value)
    db.commit()
    db.refresh(document)
    return serialize_document(db, document)


@router.delete("/{document_id}", response_model=PolicyDocumentResponse)
def disable_document(
    document_id: str,
    db: Annotated[Session, Depends(get_db)],
) -> PolicyDocumentResponse:
    document = db.get(PolicyDocument, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="政策文件不存在")

    document.is_active = False
    db.commit()
    db.refresh(document)
    return serialize_document(db, document)


def validate_upload(file: UploadFile) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="仅支持 PDF、DOCX、DOC 和 HTML 文件")
    return ALLOWED_EXTENSIONS[suffix]


async def save_upload_file(file: UploadFile, file_type: str) -> tuple[Path, int, str]:
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    document_id = uuid.uuid4().hex
    target_path = settings.upload_dir / f"{document_id}.{file_type}"
    digest = hashlib.sha256()
    total_size = 0

    with target_path.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            total_size += len(chunk)
            if total_size > settings.max_upload_file_size_bytes:
                output.close()
                target_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"文件大小不能超过 {settings.max_upload_file_size_mb}MB",
                )
            digest.update(chunk)
            output.write(chunk)

    if total_size == 0:
        target_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="上传文件不能为空")

    return target_path, total_size, digest.hexdigest()


def create_attachment_relation(
    db: Session,
    document: PolicyDocument,
    parent_document_id: str | None,
    attachment_title: str | None,
) -> None:
    if not parent_document_id:
        raise HTTPException(status_code=400, detail="附件必须选择所属主文件")

    parent = db.get(PolicyDocument, parent_document_id)
    if parent is None:
        raise HTTPException(status_code=404, detail="所属主文件不存在")

    db.add(
        PolicyAttachment(
            document_id=document.id,
            parent_document_id=parent.id,
            attachment_title=attachment_title or document.title,
        )
    )
    db.add(
        PolicyRelation(
            source_document_id=parent.id,
            target_document_id=document.id,
            relation_type="has_attachment",
        )
    )
    db.add(
        PolicyRelation(
            source_document_id=document.id,
            target_document_id=parent.id,
            relation_type="attachment_of",
        )
    )


def serialize_document(db: Session, document: PolicyDocument) -> PolicyDocumentResponse:
    attachment = db.execute(
        select(PolicyAttachment).where(PolicyAttachment.document_id == document.id)
    ).scalar_one_or_none()
    chunk_count = db.execute(
        select(func.count(PolicyChunk.id)).where(PolicyChunk.document_id == document.id)
    ).scalar_one()

    return PolicyDocumentResponse(
        id=str(document.id),
        title=document.title,
        file_name=document.file_name,
        file_type=document.file_type,
        file_size=document.file_size,
        policy_level=document.policy_level,
        policy_category=document.policy_category,
        issuing_department=document.issuing_department,
        applicable_scope=document.applicable_scope,
        college=document.college,
        publish_date=document.publish_date,
        effective_from=document.effective_from,
        effective_to=document.effective_to,
        version=document.version,
        parse_status=document.parse_status if document.parse_status in PARSE_STATUSES else "uploaded",
        parse_error=document.parse_error,
        parsed_at=document.parsed_at,
        parsed_text_path=document.parsed_text_path,
        is_attachment=attachment is not None,
        parent_document_id=str(attachment.parent_document_id) if attachment else None,
        attachment_title=attachment.attachment_title if attachment else None,
        chunk_count=chunk_count,
        is_active=document.is_active,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )
