from __future__ import annotations

import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine
from app import models  # noqa: F401


def init_db() -> None:
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        connection.execute(text("SELECT 1"))
    Base.metadata.create_all(bind=engine)
    apply_dev_schema_patches()


def apply_dev_schema_patches() -> None:
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS file_size BIGINT"))
        connection.execute(text("ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS content_sha256 VARCHAR(64)"))
        connection.execute(text("ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS parse_error TEXT"))
        connection.execute(text("ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS parsed_text_path VARCHAR(500)"))
        connection.execute(text("ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP WITH TIME ZONE"))


if __name__ == "__main__":
    init_db()
    print("Database initialization finished.")
