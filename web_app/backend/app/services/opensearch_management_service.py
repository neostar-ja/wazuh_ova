from __future__ import annotations

import math
import re
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

import requests

from ..core.config import settings

ISM_POLICY_PATH = "/_plugins/_ism/policies"
ISM_EXPLAIN_PATH = "/_plugins/_ism/explain"
ISM_ADD_PATH = "/_plugins/_ism/add"

DATE_INDEX_RE = re.compile(r"^(?P<prefix>.+?)-(?P<date>\d{4}\.\d{2}\.\d{2})(?:-.+)?$")


def _base_url() -> str:
    return f"https://{settings.opensearch_host}:{settings.opensearch_port}"


def _request(method: str, path: str, *, params: dict[str, Any] | None = None, json: Any | None = None):
    response = requests.request(
        method,
        f"{_base_url()}{path}",
        auth=(settings.opensearch_user, settings.opensearch_pass),
        verify=settings.opensearch_verify_ssl,
        timeout=30,
        params=params,
        json=json,
    )
    response.raise_for_status()
    if not response.content:
        return None
    return response.json()


def build_retention_policy(
    policy_id: str,
    index_pattern: str,
    *,
    retention_days: int = 60,
    rollover_after_days: int = 1,
    rollover_max_primary_shard_size_gb: int = 50,
    description: str | None = None,
) -> dict[str, Any]:
    policy_description = description or (
        f"Wazuh alerts retention policy with rollover and {retention_days}-day delete"
    )
    return {
        "policy": {
            "policy_id": policy_id,
            "description": policy_description,
            "schema_version": 1,
            "default_state": "hot",
            "ism_template": [
                {
                    "index_patterns": [index_pattern],
                    "priority": 100,
                }
            ],
            "states": [
                {
                    "name": "hot",
                    "actions": [
                        {
                            "rollover": {
                                "min_primary_shard_size": f"{rollover_max_primary_shard_size_gb}gb",
                                "min_index_age": f"{rollover_after_days}d",
                            }
                        }
                    ],
                    "transitions": [
                        {
                            "state_name": "warm",
                            "conditions": {
                                "min_index_age": f"{rollover_after_days}d",
                            },
                        }
                    ],
                },
                {
                    "name": "warm",
                    "actions": [
                        {"read_only": {}},
                    ],
                    "transitions": [
                        {
                            "state_name": "delete",
                            "conditions": {
                                "min_index_age": f"{retention_days}d",
                            },
                        }
                    ],
                },
                {
                    "name": "delete",
                    "actions": [
                        {"delete": {}},
                    ],
                    "transitions": [],
                },
            ],
        }
    }


def list_ism_policies() -> dict[str, Any]:
    return _request("GET", ISM_POLICY_PATH) or {"policies": []}


def get_ism_policy(policy_id: str) -> dict[str, Any]:
    return _request("GET", f"{ISM_POLICY_PATH}/{policy_id}") or {}


def save_ism_policy(policy_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return _request("PUT", f"{ISM_POLICY_PATH}/{policy_id}", json=payload) or {}


def delete_ism_policy(policy_id: str) -> dict[str, Any]:
    result = _request("DELETE", f"{ISM_POLICY_PATH}/{policy_id}")
    return result or {"deleted": True}


def explain_ism_index(index_name: str) -> dict[str, Any]:
    return _request("GET", f"{ISM_EXPLAIN_PATH}/{index_name}") or {}


def list_matching_indices(index_pattern: str) -> list[str]:
    rows = _request(
        "GET",
        f"/_cat/indices/{index_pattern}",
        params={"format": "json", "expand_wildcards": "all"},
    ) or []
    return [row.get("index", "") for row in rows if row.get("index")]


def apply_policy_to_indices(policy_id: str, index_names: list[str]) -> dict[str, Any]:
    applied: list[str] = []
    errors: list[dict[str, str]] = []
    for index_name in index_names:
        try:
            _request("POST", f"{ISM_ADD_PATH}/{index_name}", json={"policy_id": policy_id})
            applied.append(index_name)
        except Exception as exc:  # pragma: no cover - surfaced to API caller
            errors.append({"index": index_name, "error": str(exc)})
    return {"policy_id": policy_id, "applied": applied, "errors": errors}


def get_storage_forecast(index_pattern: str) -> dict[str, Any]:
    allocation_rows = _request(
        "GET",
        "/_cat/allocation",
        params={"format": "json", "bytes": "b"},
    ) or []
    total_bytes = 0
    used_bytes = 0
    free_bytes = 0
    for row in allocation_rows:
        try:
            total_bytes += int(row.get("disk.total") or 0)
            used_bytes += int(row.get("disk.used") or 0)
            free_bytes += int(row.get("disk.avail") or 0)
        except (TypeError, ValueError):
            continue

    index_rows = _request(
        "GET",
        f"/_cat/indices/{index_pattern}",
        params={"format": "json", "bytes": "b", "expand_wildcards": "all"},
    ) or []

    grouped_sizes: dict[str, int] = defaultdict(int)
    for row in index_rows:
        index_name = row.get("index", "")
        match = DATE_INDEX_RE.match(index_name)
        if not match:
            continue
        index_date = match.group("date")
        try:
            size_bytes = int(row.get("store.size") or row.get("pri.store.size") or 0)
        except (TypeError, ValueError):
            size_bytes = 0
        grouped_sizes[index_date] += size_bytes

    sorted_sizes = sorted(grouped_sizes.items())
    today_key = date.today().strftime("%Y.%m.%d")
    completed_samples = [
        (sample_date, size_bytes)
        for sample_date, size_bytes in sorted_sizes
        if sample_date != today_key and size_bytes > 0
    ]
    if len(completed_samples) < 3:
        completed_samples = [(sample_date, size_bytes) for sample_date, size_bytes in sorted_sizes if size_bytes > 0]

    sample_window = completed_samples[-7:]
    estimated_daily_bytes = sum(size_bytes for _, size_bytes in sample_window) / len(sample_window) if sample_window else 0

    if estimated_daily_bytes > 0 and free_bytes > 0:
        days_to_full = free_bytes / estimated_daily_bytes
        full_date = (datetime.utcnow().date() + timedelta(days=math.ceil(days_to_full))).isoformat()
    else:
        days_to_full = None
        full_date = None

    return {
        "index_pattern": index_pattern,
        "total_bytes": total_bytes,
        "used_bytes": used_bytes,
        "free_bytes": free_bytes,
        "usage_percent": round((used_bytes / total_bytes * 100), 1) if total_bytes else None,
        "estimated_daily_bytes": int(estimated_daily_bytes) if estimated_daily_bytes else None,
        "estimated_daily_gb": round(estimated_daily_bytes / (1024 ** 3), 1) if estimated_daily_bytes else None,
        "days_to_full": round(days_to_full, 1) if days_to_full is not None else None,
        "full_date": full_date,
        "sample_days": len(sample_window),
        "sample_points": [
            {"date": sample_date, "size_bytes": size_bytes}
            for sample_date, size_bytes in sample_window
        ],
    }
