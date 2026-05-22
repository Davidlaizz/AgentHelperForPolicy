from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class RetrievalFilters:
    policy_level: str | None = None
    policy_category: str | None = None
    applicable_scope: str | None = None
    college: str | None = None
    as_of_date: date | None = None
    include_expired: bool = False


def is_effective(
    effective_from: date | None,
    effective_to: date | None,
    filters: RetrievalFilters,
) -> bool:
    if filters.include_expired or filters.as_of_date is None:
        return True

    if effective_from and effective_from > filters.as_of_date:
        return False
    if effective_to and effective_to < filters.as_of_date:
        return False
    return True


def matches_text_filter(value: str | None, expected: str | None) -> bool:
    if not expected:
        return True
    if not value:
        return True
    return expected in value or value in expected
