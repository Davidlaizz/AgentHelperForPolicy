from __future__ import annotations

import re
from dataclasses import dataclass

MAX_CHUNK_CHARS = 900
MIN_CHUNK_CHARS = 80

ARTICLE_PATTERN = re.compile(r"^(第[一二三四五六七八九十百零〇0-9]+[章节条款]|[一二三四五六七八九十]+、|[0-9]+[.．、])")
HEADING_PATTERN = re.compile(r"^(附件|附表|第[一二三四五六七八九十百零〇0-9]+章|第[一二三四五六七八九十百零〇0-9]+节)")


@dataclass(frozen=True)
class RAGChunkDraft:
    text: str
    chunk_index: int
    section_title: str | None = None
    article_no: str | None = None
    page_no: int | None = None


@dataclass(frozen=True)
class SourceSegment:
    text: str
    order: int
    section_title: str | None = None
    page_no: int | None = None


def build_rag_chunks(source_segments: list[SourceSegment]) -> list[RAGChunkDraft]:
    drafts: list[RAGChunkDraft] = []
    current_parts: list[str] = []
    current_section: str | None = None
    current_article: str | None = None
    current_page: int | None = None

    for segment in source_segments:
        paragraphs = split_paragraphs(segment.text)
        for paragraph in paragraphs:
            section_candidate = detect_section_title(paragraph) or segment.section_title
            article_candidate = detect_article_no(paragraph)

            starts_new_unit = bool(article_candidate or detect_section_title(paragraph))
            too_long = sum(len(part) for part in current_parts) + len(paragraph) > MAX_CHUNK_CHARS
            if current_parts and (starts_new_unit or too_long):
                drafts.append(make_chunk(current_parts, len(drafts), current_section, current_article, current_page))
                current_parts = []

            current_section = section_candidate or current_section
            current_article = article_candidate or current_article
            current_page = segment.page_no or current_page

            if len(paragraph) > MAX_CHUNK_CHARS:
                for piece in split_long_paragraph(paragraph):
                    if current_parts:
                        drafts.append(make_chunk(current_parts, len(drafts), current_section, current_article, current_page))
                        current_parts = []
                    drafts.append(make_chunk([piece], len(drafts), current_section, current_article, current_page))
            else:
                current_parts.append(paragraph)

    if current_parts:
        drafts.append(make_chunk(current_parts, len(drafts), current_section, current_article, current_page))

    return merge_tiny_chunks(drafts)


def split_paragraphs(text: str) -> list[str]:
    paragraphs = [part.strip() for part in re.split(r"\n{1,}|\r\n", text) if part.strip()]
    if len(paragraphs) <= 1:
        return [text.strip()] if text.strip() else []
    return paragraphs


def split_long_paragraph(text: str) -> list[str]:
    sentences = [part.strip() for part in re.split(r"(?<=[。；;.!?？])", text) if part.strip()]
    pieces: list[str] = []
    current = ""

    for sentence in sentences or [text]:
        if current and len(current) + len(sentence) > MAX_CHUNK_CHARS:
            pieces.append(current)
            current = sentence
        else:
            current += sentence

    if current:
        pieces.append(current)
    return pieces


def detect_section_title(text: str) -> str | None:
    first_line = text.splitlines()[0].strip()
    if len(first_line) <= 80 and HEADING_PATTERN.match(first_line):
        return first_line
    return None


def detect_article_no(text: str) -> str | None:
    first_line = text.splitlines()[0].strip()
    match = ARTICLE_PATTERN.match(first_line)
    if match:
        return match.group(0)
    return None


def make_chunk(
    parts: list[str],
    chunk_index: int,
    section_title: str | None,
    article_no: str | None,
    page_no: int | None,
) -> RAGChunkDraft:
    return RAGChunkDraft(
        text="\n".join(parts).strip(),
        chunk_index=chunk_index,
        section_title=section_title,
        article_no=article_no,
        page_no=page_no,
    )


def merge_tiny_chunks(chunks: list[RAGChunkDraft]) -> list[RAGChunkDraft]:
    merged: list[RAGChunkDraft] = []

    for chunk in chunks:
        if (
            merged
            and len(chunk.text) < MIN_CHUNK_CHARS
            and len(merged[-1].text) + len(chunk.text) <= MAX_CHUNK_CHARS
        ):
            previous = merged[-1]
            merged[-1] = RAGChunkDraft(
                text=f"{previous.text}\n{chunk.text}",
                chunk_index=previous.chunk_index,
                section_title=chunk.section_title or previous.section_title,
                article_no=chunk.article_no or previous.article_no,
                page_no=previous.page_no or chunk.page_no,
            )
        else:
            merged.append(
                RAGChunkDraft(
                    text=chunk.text,
                    chunk_index=len(merged),
                    section_title=chunk.section_title,
                    article_no=chunk.article_no,
                    page_no=chunk.page_no,
                )
            )

    return merged
