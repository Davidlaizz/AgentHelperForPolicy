from __future__ import annotations

from sqlalchemy import text

from app.db.base import Base
from app.digital_village.db.session import engine as dv_engine
from app import models  # noqa: F401


def init_digital_village_db() -> None:
    with dv_engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        connection.execute(text("SELECT 1"))
    Base.metadata.create_all(bind=dv_engine)
    apply_digital_village_schema_patches()


def apply_digital_village_schema_patches() -> None:
    with dv_engine.begin() as connection:
        connection.execute(text("ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS file_size BIGINT"))
        connection.execute(text("ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS content_sha256 VARCHAR(64)"))
        connection.execute(text("ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS parse_error TEXT"))
        connection.execute(text("ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS parsed_text_path VARCHAR(500)"))
        connection.execute(text("ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP WITH TIME ZONE"))
        connection.execute(text("ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"))
