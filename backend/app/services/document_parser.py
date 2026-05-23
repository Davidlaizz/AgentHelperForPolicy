from __future__ import annotations

from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
import re

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
    if normalized_type in {"html", "htm", "html_snapshot"}:
        return parse_html(file_path)
    if normalized_type == "doc":
        return parse_legacy_doc(file_path)

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


class TextHTMLParser(HTMLParser):
    block_tags = {
        "address",
        "article",
        "br",
        "dd",
        "div",
        "dt",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "p",
        "section",
        "table",
        "td",
        "th",
        "tr",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "noscript"}:
            self.skip_depth += 1
        elif tag in self.block_tags:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"} and self.skip_depth:
            self.skip_depth -= 1
        elif tag in self.block_tags:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        text = data.strip()
        if text:
            self.parts.append(text)

    def text(self) -> str:
        return "\n".join(self.parts)


def parse_html(file_path: Path) -> list[ParsedSegment]:
    parser = TextHTMLParser()
    parser.feed(file_path.read_text(encoding="utf-8", errors="ignore"))

    lines = normalize_lines(parser.text())
    return build_text_segments(lines, kind="html_text")


def parse_legacy_doc(file_path: Path) -> list[ParsedSegment]:
    data = file_path.read_bytes()
    decoded = data.decode("utf-16le", errors="ignore")
    candidates = re.findall(r"[\u4e00-\u9fffA-Za-z0-9（）()，。；：、\s]{3,}", decoded)
    lines = normalize_lines("\n".join(candidates))
    meaningful = trim_legacy_doc_noise([line for line in lines if re.search(r"[\u4e00-\u9fff]", line)])
    return build_text_segments(meaningful, kind="doc_text", max_chars=800)


def trim_legacy_doc_noise(lines: list[str]) -> list[str]:
    start_index = 0
    for index, line in enumerate(lines):
        if "西安电子科技大学" in line:
            start_index = index
            break

    trimmed: list[str] = []
    for line in lines[start_index:]:
        if "电子档案发送至邮箱" in line:
            prefix = line.split("电子档案发送至邮箱", 1)[0].strip()
            if prefix:
                trimmed.append(prefix)
            trimmed.append("电子档案发送至邮箱")
            break
        trimmed.append(line)

    return trimmed


def normalize_lines(text: str) -> list[str]:
    lines: list[str] = []
    seen: set[str] = set()
    for raw_line in text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if len(line) < 3 or line in seen:
            continue
        seen.add(line)
        lines.append(line)
    return lines


def build_text_segments(
    lines: list[str],
    *,
    kind: str,
    max_chars: int = 1200,
) -> list[ParsedSegment]:
    segments: list[ParsedSegment] = []
    buffer: list[str] = []
    buffer_size = 0

    for line in lines:
        if buffer and buffer_size + len(line) > max_chars:
            segments.append(
                ParsedSegment(
                    text="\n".join(buffer),
                    order=len(segments),
                    kind=kind,
                    section_title=guess_section_title(buffer[0]),
                )
            )
            buffer = []
            buffer_size = 0

        buffer.append(line)
        buffer_size += len(line)

    if buffer:
        segments.append(
            ParsedSegment(
                text="\n".join(buffer),
                order=len(segments),
                kind=kind,
                section_title=guess_section_title(buffer[0]),
            )
        )

    if not segments:
        raise ValueError("文件未提取到有效文本")

    return segments


def guess_section_title(line: str) -> str | None:
    if len(line) <= 40 and re.search(r"(第.+章|第.+条|办法|通知|申请表|材料要求)", line):
        return line
    return None
