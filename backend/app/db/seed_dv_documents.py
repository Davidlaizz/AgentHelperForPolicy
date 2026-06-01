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

from app.digital_village.config import dv_settings
from app.digital_village.db.session import DigitalVillageSessionLocal
from app.models import PolicyAttachment, PolicyDocument
from app.digital_village.services.document_service import dv_parse_document
from app.digital_village.services.rag.indexer import dv_index_document


ROOT_DIR = Path(__file__).resolve().parents[3]
METADATA_PATH = ROOT_DIR / "M0_交付物" / "digital_village" / "dv_policy_metadata.csv"
FORMAL_FILE_TYPES = {
    "html_snapshot": "html",
    "html": "html",
    "pdf": "pdf",
    "docx": "docx",
    "doc": "doc",
}


def seed_dv_documents():
    dv_settings.dv_upload_dir.mkdir(parents=True, exist_ok=True)

    with DigitalVillageSessionLocal() as session:
        disable_dv_demo_duplicates(session)

        with METADATA_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                source_path = resolve_dv_source_path(row)
                file_type = FORMAL_FILE_TYPES.get(row["file_type"], row["file_type"])
                target_path = dv_copy_to_uploads(source_path, file_type)
                digest = dv_sha256_file(source_path)

                document = find_dv_existing_main_document(session, row["file_name"])

                if document is None:
                    document = PolicyDocument(
                        title=row["title"],
                        file_name=row["file_name"],
                        file_path=str(target_path),
                        file_type=file_type,
                        parse_status="uploaded",
                        source_type=row.get("source_type") or "dv_seed",
                    )
                    session.add(document)

                document.title = row["title"]
                document.file_path = str(target_path)
                document.file_type = file_type
                document.file_size = source_path.stat().st_size
                document.content_sha256 = digest
                document.policy_level = row.get("policy_level") or "国家"
                document.policy_category = row["policy_category"]
                document.issuing_department = dv_empty_to_none(row.get("issuing_department"))
                document.applicable_scope = dv_empty_to_none(row.get("applicable_scope"))
                document.publish_date = dv_parse_date(row.get("publish_date"))
                document.effective_from = dv_parse_date(row.get("effective_from"))
                document.effective_to = dv_parse_date(row.get("effective_to"))
                document.source_url = dv_empty_to_none(row.get("source_url"))
                document.source_type = dv_empty_to_none(row.get("source_type")) or "dv_seed"
                document.authority_rank = 90
                document.is_active = True
                document.extra_metadata = {
                    "seed": "dv_m0",
                    "parse_priority": row.get("parse_priority"),
                    "original_file_type": row.get("file_type"),
                }
                session.commit()
                session.refresh(document)

                parsed = dv_parse_document(session, document)
                if parsed.parse_status == "failed":
                    print("PARSE FAILED", parsed.file_name, parsed.parse_error)
                    continue

                indexed_count = dv_index_document(session, parsed)
                print("INDEXED", parsed.file_name, str(indexed_count), "chunks", parsed.policy_category)
    print("Seed digital village documents complete!")


def disable_dv_demo_duplicates(session):
    pass


def find_dv_existing_main_document(session, file_name):
    return None


def resolve_dv_source_path(row):
    local_path = Path(row["local_path"])
    if local_path.exists():
        return local_path
    matches = list((ROOT_DIR / "M0_交付物" / "digital_village").glob("**/" + row["file_name"]))
    if matches:
        return matches[0]
    raise FileNotFoundError(row["local_path"])


def dv_copy_to_uploads(source_path, file_type):
    digest = dv_sha256_file(source_path)
    target = dv_settings.dv_upload_dir / ("dv_m0_" + digest[:16] + "." + file_type)
    if not target.exists():
        shutil.copy2(source_path, target)
    return target


def dv_sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def dv_parse_date(value):
    if not value or not value.strip():
        return None
    value = value.strip()
    if len(value) < 10 or not value[:4].isdigit():
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def dv_empty_to_none(value):
    if value is None:
        return None
    value = value.strip()
    return value or None


if __name__ == "__main__":
    seed_dv_documents()
