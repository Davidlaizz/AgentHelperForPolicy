from __future__ import annotations

from app.digital_village.config import dv_settings
from app.services.rag.embedding import EmbeddingProvider, HttpEmbeddingProvider, MockEmbeddingProvider


def get_dv_embedding_provider() -> EmbeddingProvider:
    if dv_settings.dv_embedding_provider == "mock":
        return MockEmbeddingProvider(dv_settings.dv_embedding_dimensions)
    if dv_settings.dv_embedding_provider == "http":
        return HttpEmbeddingProvider()
    raise RuntimeError(f"不支持的 embedding provider：{dv_settings.dv_embedding_provider}")
