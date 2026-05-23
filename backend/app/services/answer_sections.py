from __future__ import annotations

import re


SECTION_HEADING_PATTERN = re.compile(
    r"(?im)^[ \t]*(?:#{1,6}[ \t]*)?(?:[-*][ \t]*)?(?:\*\*)?[ \t]*"
    r"(?P<title>AI\s*推断|AI推断|目前不确定点|不确定点)"
    r"[ \t]*(?:\*\*)?[ \t]*(?:[：:]|$)"
)

LEADING_HEADING_PATTERN = re.compile(
    r"(?im)^[ \t]*(?:#{1,6}[ \t]*)?(?:[-*][ \t]*)?(?:\*\*)?[ \t]*"
    r"(?:政策依据|AI\s*推断|AI推断|目前不确定点|不确定点)"
    r"[ \t]*(?:\*\*)?[ \t]*[：:]?[ \t]*$\s*"
)

LEADING_INLINE_HEADING_PATTERN = re.compile(
    r"(?i)^(?:#{1,6}[ \t]*)?(?:[-*][ \t]*)?(?:\*\*)?[ \t]*"
    r"(?:政策依据|AI\s*推断|AI推断|目前不确定点|不确定点)"
    r"[ \t]*(?:\*\*)?[ \t]*[：:][ \t]*"
)


def split_answer_sections(answer: str) -> tuple[str, str]:
    text = answer.strip()
    match = SECTION_HEADING_PATTERN.search(text)
    if not match:
        return strip_leading_section_headings(text), "未生成额外推断。"

    basis = text[: match.start()]
    inference = text[match.end() :]
    return (
        strip_leading_section_headings(basis),
        strip_leading_section_headings(inference) or "未生成额外推断。",
    )


def strip_leading_section_headings(text: str) -> str:
    cleaned = text.strip()
    previous = None
    while cleaned and cleaned != previous:
        previous = cleaned
        cleaned = LEADING_HEADING_PATTERN.sub("", cleaned, count=1).strip()
        cleaned = LEADING_INLINE_HEADING_PATTERN.sub("", cleaned, count=1).strip()
    return cleaned
