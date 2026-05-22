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
