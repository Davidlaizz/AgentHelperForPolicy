from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import fitz
from docx import Document


@dataclass(frozen=True)
class ParsedSegment:
    text: str
    order: int
    kind: str
    page_no: int | None = None
    section_title: str | None = None


def parse_policy_file(file_path: Path, file_type: str) -> list[ParsedSegment]:
    normalized_type = file_type.lower()

    if normalized_type == "pdf":
        return parse_pdf(file_path)
    if normalized_type == "docx":
        return parse_docx(file_path)

    raise ValueError(f"不支持的文件类型：{file_type}")


def parse_pdf(file_path: Path) -> list[ParsedSegment]:
    segments: list[ParsedSegment] = []

    with fitz.open(file_path) as pdf:
        for page_index, page in enumerate(pdf, start=1):
            text = page.get_text("text").strip()
            if text:
                segments.append(
                    ParsedSegment(
                        text=text,
                        order=len(segments),
                        kind="pdf_page",
                        page_no=page_index,
                    )
                )

    if not segments:
        raise ValueError("PDF 未提取到文本，可能是扫描件或空文件")

    return segments


def parse_docx(file_path: Path) -> list[ParsedSegment]:
    document = Document(file_path)
    segments: list[ParsedSegment] = []
    current_heading: str | None = None

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue

        style_name = paragraph.style.name if paragraph.style else ""
        is_heading = style_name.lower().startswith("heading")
        if is_heading:
            current_heading = text

        segments.append(
            ParsedSegment(
                text=text,
                order=len(segments),
                kind="docx_heading" if is_heading else "docx_paragraph",
                section_title=text if is_heading else current_heading,
            )
        )

    if not segments:
        raise ValueError("DOCX 未提取到段落文本")

    return segments
