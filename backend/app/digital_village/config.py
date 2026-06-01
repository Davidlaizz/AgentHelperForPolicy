from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# digital_village/config.py -> digital_village/ -> app/ -> backend/ -> project root
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent


class DigitalVillageSettings(BaseSettings):
    dv_app_name: str = Field(default="zhicetong-digital-village", alias="DV_APP_NAME")
    dv_app_env: str = Field(default="development", alias="DV_APP_ENV")

    dv_postgres_host: str = Field(default="192.168.216.101", alias="DV_POSTGRES_HOST")
    dv_postgres_port: int = Field(default=5432, alias="DV_POSTGRES_PORT")
    dv_postgres_db: str = Field(default="zhicetong_digital_village", alias="DV_POSTGRES_DB")
    dv_postgres_user: str = Field(default="zhicetong", alias="DV_POSTGRES_USER")
    dv_postgres_password: str = Field(default="change_me", alias="DV_POSTGRES_PASSWORD")

    dv_database_url: str | None = Field(default=None, alias="DV_DATABASE_URL")
    dv_upload_dir: Path = Field(default=BASE_DIR / "storage" / "digital-village" / "uploads", alias="DV_UPLOAD_DIR")
    dv_parsed_dir: Path = Field(default=BASE_DIR / "storage" / "digital-village" / "parsed", alias="DV_PARSED_DIR")
    dv_max_upload_file_size_mb: int = Field(default=20, alias="DV_MAX_UPLOAD_FILE_SIZE_MB")
    dv_embedding_provider: str = Field(default="mock", alias="DV_EMBEDDING_PROVIDER")
    dv_embedding_model: str = Field(default="mock-hash-embedding-v1", alias="DV_EMBEDDING_MODEL")
    dv_embedding_dimensions: int = Field(default=1024, alias="DV_EMBEDDING_DIMENSIONS")
    dv_embedding_api_url: str | None = Field(default=None, alias="DV_EMBEDDING_API_URL")
    dv_embedding_api_key: str | None = Field(default=None, alias="DV_EMBEDDING_API_KEY")
    dv_llamaindex_vector_table: str = Field(default="llamaindex_digital_village_policy_chunks", alias="DV_LLAMAINDEX_VECTOR_TABLE")
    dv_llamaindex_schema: str = Field(default="public", alias="DV_LLAMAINDEX_SCHEMA")
    dv_llm_provider: str = Field(default="mock", alias="DV_LLM_PROVIDER")
    dv_llm_model: str = Field(default="mock-policy-qa-v1", alias="DV_LLM_MODEL")
    dv_llm_api_url: str | None = Field(default=None, alias="DV_LLM_API_URL")
    dv_llm_api_key: str | None = Field(default=None, alias="DV_LLM_API_KEY")
    dv_llm_max_tokens: int | None = Field(default=None, alias="DV_LLM_MAX_TOKENS")
    dv_llm_timeout_seconds: int = Field(default=90, alias="DV_LLM_TIMEOUT_SECONDS")
    dv_llm_thinking_type: str | None = Field(default=None, alias="DV_LLM_THINKING_TYPE")

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / "backend" / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.dv_database_url:
            return self.dv_database_url

        return (
            f"postgresql+psycopg://{self.dv_postgres_user}:{self.dv_postgres_password}"
            f"@{self.dv_postgres_host}:{self.dv_postgres_port}/{self.dv_postgres_db}"
        )

    @property
    def max_upload_file_size_bytes(self) -> int:
        return self.dv_max_upload_file_size_mb * 1024 * 1024


dv_settings = DigitalVillageSettings()
