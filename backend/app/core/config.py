from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_name: str = Field(default="zhicetong-api", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")

    postgres_host: str = Field(default="192.168.216.101", alias="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, alias="POSTGRES_PORT")
    postgres_db: str = Field(default="zhicetong", alias="POSTGRES_DB")
    postgres_user: str = Field(default="zhicetong", alias="POSTGRES_USER")
    postgres_password: str = Field(default="change_me", alias="POSTGRES_PASSWORD")

    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    upload_dir: Path = Field(default=BASE_DIR / "storage" / "uploads", alias="UPLOAD_DIR")
    parsed_dir: Path = Field(default=BASE_DIR / "storage" / "parsed", alias="PARSED_DIR")
    max_upload_file_size_mb: int = Field(default=20, alias="MAX_UPLOAD_FILE_SIZE_MB")
    embedding_provider: str = Field(default="mock", alias="EMBEDDING_PROVIDER")
    embedding_model: str = Field(default="mock-hash-embedding-v1", alias="EMBEDDING_MODEL")
    embedding_dimensions: int = Field(default=1024, alias="EMBEDDING_DIMENSIONS")
    embedding_api_url: str | None = Field(default=None, alias="EMBEDDING_API_URL")
    embedding_api_key: str | None = Field(default=None, alias="EMBEDDING_API_KEY")
    llamaindex_vector_table: str = Field(default="llamaindex_policy_chunks", alias="LLAMAINDEX_VECTOR_TABLE")
    llamaindex_schema: str = Field(default="public", alias="LLAMAINDEX_SCHEMA")
    llm_provider: str = Field(default="mock", alias="LLM_PROVIDER")
    llm_model: str = Field(default="mock-policy-qa-v1", alias="LLM_MODEL")
    llm_api_url: str | None = Field(default=None, alias="LLM_API_URL")
    llm_api_key: str | None = Field(default=None, alias="LLM_API_KEY")
    llm_max_tokens: int | None = Field(default=None, alias="LLM_MAX_TOKENS")
    llm_timeout_seconds: int = Field(default=90, alias="LLM_TIMEOUT_SECONDS")
    llm_thinking_type: str | None = Field(default=None, alias="LLM_THINKING_TYPE")

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.database_url:
            return self.database_url

        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def max_upload_file_size_bytes(self) -> int:
        return self.max_upload_file_size_mb * 1024 * 1024


settings = Settings()
