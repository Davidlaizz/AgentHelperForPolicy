from __future__ import annotations

from datetime import date


def merge_results(vector_results: list[dict], keyword_results: list[dict]) -> dict[str, dict]:
    merged: dict[str, dict] = {}

    for result in vector_results + keyword_results:
        key = result["chunk_id"]
        if key not in merged:
            merged[key] = result
        else:
            merged[key]["vector_score"] = max(merged[key]["vector_score"], result["vector_score"])
            merged[key]["keyword_score"] = max(merged[key]["keyword_score"], result["keyword_score"])

    for result in merged.values():
        result["authority_bonus"] = authority_bonus(result["policy_level"])
        result["recency_bonus"] = recency_bonus(result["effective_to"])
        result["relation_bonus"] = relation_bonus(result)
        result["final_score"] = round(
            result["vector_score"] * 0.7
            + result["keyword_score"] * 0.3
            + result["authority_bonus"]
            + result["recency_bonus"]
            + result["relation_bonus"],
            6,
        )
    return merged


def authority_bonus(policy_level: str | None) -> float:
    weights = {
        "school": 0.04,
        "校级": 0.04,
        "college": 0.03,
        "院级": 0.03,
        "department": 0.02,
        "部门": 0.02,
        "attachment": 0.01,
        "附件": 0.01,
    }
    return weights.get(policy_level or "", 0.0)


def recency_bonus(effective_to: date | None) -> float:
    return 0.02 if effective_to is None else 0.0


def relation_bonus(result: dict) -> float:
    if result.get("attachment_id"):
        return 0.01
    if result.get("related_sources"):
        return 0.005
    return 0.0
