from __future__ import annotations

import csv
import hashlib
import shutil
import sys
from datetime import date
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import PolicyAttachment, PolicyDocument
from app.services.document_service import parse_document
from app.services.rag.indexer import index_document


ROOT_DIR = Path(__file__).resolve().parents[3]
METADATA_PATH = ROOT_DIR / "M0_交付物" / "M0_政策文件metadata.csv"
FORMAL_FILE_TYPES = {
    "html_snapshot": "html",
    "pdf": "pdf",
    "docx": "docx",
    "doc": "doc",
}


def seed_m0_documents() -> None:
    settings.upload_dir.mkdir(parents=True, exist_ok=True)

    with SessionLocal() as session:
        disable_demo_duplicates(session)

        with METADATA_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                source_path = resolve_source_path(row)
                file_type = FORMAL_FILE_TYPES.get(row["file_type"], row["file_type"])
                target_path = copy_to_uploads(source_path, file_type)
                digest = sha256_file(source_path)

                document = find_existing_main_document(session, row["file_name"])

                if document is None:
                    document = PolicyDocument(
                        title=row["title"],
                        file_name=row["file_name"],
                        file_path=str(target_path),
                        file_type=file_type,
                        parse_status="uploaded",
                        source_type=row.get("source_type") or "m0_seed",
                    )
                    session.add(document)

                document.title = row["title"]
                document.file_path = str(target_path)
                document.file_type = file_type
                document.file_size = source_path.stat().st_size
                document.content_sha256 = digest
                document.policy_level = "校级"
                document.policy_category = row["policy_category"]
                document.issuing_department = empty_to_none(row.get("issuing_department"))
                document.applicable_scope = empty_to_none(row.get("applicable_scope"))
                document.publish_date = parse_date(row.get("publish_date"))
                document.source_url = empty_to_none(row.get("source_url"))
                document.source_type = empty_to_none(row.get("source_type")) or "m0_seed"
                document.authority_rank = 90
                document.is_active = True
                document.extra_metadata = {
                    "seed": "m0",
                    "parse_priority": row.get("parse_priority"),
                    "original_file_type": row.get("file_type"),
                }
                session.commit()
                session.refresh(document)

                parsed = parse_document(session, document)
                if parsed.parse_status == "failed":
                    print(f"FAILED {parsed.file_name}: {parsed.parse_error}")
                    continue

                indexed_count = index_document(session, parsed)
                print(f"INDEXED {parsed.file_name}: {indexed_count} chunks")


def disable_demo_duplicates(session) -> None:
    demo_attachment_ids = select(PolicyAttachment.document_id).where(
        PolicyAttachment.attachment_title == "m3 attachment demo"
    )
    demos = session.execute(
        select(PolicyDocument).where(
            (PolicyDocument.title == "m3_attachment_demo")
            | (PolicyDocument.id.in_(demo_attachment_ids))
        )
    ).scalars().all()
    for document in demos:
        document.is_active = False
    if demos:
        session.commit()


def find_existing_main_document(session, file_name: str) -> PolicyDocument | None:
    documents = session.execute(
        select(PolicyDocument)
        .where(PolicyDocument.file_name == file_name)
        .order_by(PolicyDocument.created_at.asc())
    ).scalars().all()
    if not documents:
        return None

    attachment_document_ids = set(
        session.execute(
            select(PolicyAttachment.document_id).where(
                PolicyAttachment.document_id.in_([document.id for document in documents])
            )
        ).scalars()
    )
    for document in documents:
        if document.id not in attachment_document_ids:
            return document
    return documents[0]


def resolve_source_path(row: dict[str, str]) -> Path:
    local_path = Path(row["local_path"])
    if local_path.exists():
        return local_path

    matches = list((ROOT_DIR / "M0_交付物").glob(f"**/{row['file_name']}"))
    if matches:
        return matches[0]

    raise FileNotFoundError(row["local_path"])


def copy_to_uploads(source_path: Path, file_type: str) -> Path:
    digest = sha256_file(source_path)
    target = settings.upload_dir / f"m0_{digest[:16]}.{file_type}"
    if not target.exists():
        shutil.copy2(source_path, target)
    return target


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    value = value.strip()
    if len(value) < 10 or not value[:4].isdigit():
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def empty_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


if __name__ == "__main__":
    seed_m0_documents()
