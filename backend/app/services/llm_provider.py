from __future__ import annotations

import json
import urllib.error
import urllib.request
from abc import ABC, abstractmethod

from app.core.config import settings
from app.services.rag.embedding import get_embedding_provider


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, contexts: list[dict]) -> str:
        raise NotImplementedError

    def embed(self, text: str) -> list[float]:
        return get_embedding_provider().embed_query(text)


class MockLLMProvider(LLMProvider):
    def generate(self, prompt: str, contexts: list[dict]) -> str:
        if not contexts:
            return (
                "政策依据：暂未检索到足够明确的政策片段。\n\n"
                "AI 推断：建议补充政策名称、办理事项或适用对象后重新提问。"
            )

        basis_lines = []
        for index, item in enumerate(contexts[:3], start=1):
            location = citation_location(item)
            basis_lines.append(
                f"{index}. 《{item['document_title']}》{location}：{compact_quote(item['chunk_text'])}"
            )

        inference = build_mock_inference(contexts)
        return "政策依据：\n" + "\n".join(basis_lines) + "\n\nAI 推断：\n" + inference


class HttpLLMProvider(LLMProvider):
    def generate(self, prompt: str, contexts: list[dict]) -> str:
        if not settings.llm_api_url:
            raise RuntimeError("未配置 LLM_API_URL")

        payload_body = {
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": "你是高校政策智能问答助手，只能基于给定政策片段回答。"},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        if settings.llm_max_tokens:
            payload_body["max_tokens"] = settings.llm_max_tokens
        if settings.llm_thinking_type:
            payload_body["thinking"] = {"type": settings.llm_thinking_type}

        payload = json.dumps(payload_body, ensure_ascii=False).encode("utf-8")
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "AgentHelper/0.1",
        }
        if settings.llm_api_key:
            headers["Authorization"] = f"Bearer {settings.llm_api_key}"

        request = urllib.request.Request(
            settings.llm_api_url,
            data=payload,
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=settings.llm_timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            raise RuntimeError(format_llm_http_error(error)) from error
        except TimeoutError as error:
            raise RuntimeError(f"LLM 服务调用超时（超过 {settings.llm_timeout_seconds} 秒）") from error
        except urllib.error.URLError as error:
            raise RuntimeError(f"LLM 服务调用失败：{error.reason}") from error

        if "choices" in body:
            return body["choices"][0]["message"]["content"]
        if "output" in body:
            return str(body["output"])
        if "text" in body:
            return str(body["text"])
        raise RuntimeError("LLM 服务响应缺少 choices、output 或 text 字段")


def get_llm_provider() -> LLMProvider:
    if settings.llm_provider == "mock":
        return MockLLMProvider()
    if settings.llm_provider == "http":
        return HttpLLMProvider()
    raise RuntimeError(f"不支持的 LLM provider：{settings.llm_provider}")


def format_llm_http_error(error: urllib.error.HTTPError) -> str:
    raw_body = error.read().decode("utf-8", errors="replace")
    message = raw_body.strip()
    code_text = ""

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError:
        body = {}

    if isinstance(body, dict):
        message = str(body.get("message") or body.get("error") or message)
        if body.get("code") is not None:
            code_text = f"，code {body['code']}"

    return f"LLM 服务调用失败（HTTP {error.code}{code_text}）：{message}"


def citation_location(item: dict) -> str:
    parts: list[str] = []
    if item.get("attachment_id"):
        parts.append("附件")
    if item.get("page_no"):
        parts.append(f"第 {item['page_no']} 页")
    if item.get("article_no"):
        parts.append(str(item["article_no"]))
    return "（" + "，".join(parts) + "）" if parts else ""


def compact_quote(text: str, limit: int = 120) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return normalized[:limit] + "..."


def build_mock_inference(contexts: list[dict]) -> str:
    first = contexts[0]
    document = first["document_title"]
    location = citation_location(first)
    return (
        f"根据当前检索结果，优先参考《{document}》{location}。"
        "如果你的具体情况涉及学院、年级、时间节点或附件材料，仍需要结合对应通知和附件进一步确认。"
    )
