from __future__ import annotations

import asyncio
import hashlib
import json
import math
import urllib.request
from abc import ABC, abstractmethod

from llama_index.core.embeddings import BaseEmbedding
from pydantic import PrivateAttr

from app.core.config import settings


class EmbeddingProvider(ABC):
    @abstractmethod
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError

    def embed_query(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]


class MockEmbeddingProvider(EmbeddingProvider):
    def __init__(self, dimensions: int) -> None:
        self.dimensions = dimensions

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_text(text) for text in texts]

    def _embed_text(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions
        normalized = normalize_text(text)
        tokens = char_ngrams(normalized)

        for token in tokens:
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        norm = math.sqrt(sum(item * item for item in vector))
        if norm == 0:
            return vector
        return [round(item / norm, 6) for item in vector]


class HttpEmbeddingProvider(EmbeddingProvider):
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not settings.embedding_api_url:
            raise RuntimeError("未配置 EMBEDDING_API_URL")

        payload = json.dumps(
            {
                "model": settings.embedding_model,
                "input": texts,
            }
        ).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if settings.embedding_api_key:
            headers["Authorization"] = f"Bearer {settings.embedding_api_key}"

        request = urllib.request.Request(
            settings.embedding_api_url,
            data=payload,
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            body = json.loads(response.read().decode("utf-8"))

        if "data" in body:
            return [item["embedding"] for item in body["data"]]
        if "embeddings" in body:
            return body["embeddings"]
        raise RuntimeError("embedding 服务响应缺少 data 或 embeddings 字段")


class ZhicetongEmbedding(BaseEmbedding):
    _provider: EmbeddingProvider = PrivateAttr()

    def __init__(self, provider: EmbeddingProvider | None = None) -> None:
        super().__init__(
            model_name=settings.embedding_model,
            embed_batch_size=32,
        )
        self._provider = provider or get_embedding_provider()

    def _get_text_embedding(self, text: str) -> list[float]:
        return self._provider.embed_query(text)

    def _get_query_embedding(self, query: str) -> list[float]:
        return self._provider.embed_query(query)

    async def _aget_query_embedding(self, query: str) -> list[float]:
        return await asyncio.to_thread(self._provider.embed_query, query)


def get_embedding_provider() -> EmbeddingProvider:
    if settings.embedding_provider == "mock":
        return MockEmbeddingProvider(settings.embedding_dimensions)
    if settings.embedding_provider == "http":
        return HttpEmbeddingProvider()
    raise RuntimeError(f"不支持的 embedding provider：{settings.embedding_provider}")


def normalize_text(text: str) -> str:
    return " ".join(text.lower().split())


def char_ngrams(text: str) -> list[str]:
    compact = text.replace(" ", "")
    tokens: list[str] = []

    if compact:
        tokens.extend(compact[index : index + 2] for index in range(max(len(compact) - 1, 1)))
        tokens.extend(compact[index : index + 3] for index in range(max(len(compact) - 2, 1)))

    tokens.extend(part for part in text.split() if part)
    return tokens or [text]
