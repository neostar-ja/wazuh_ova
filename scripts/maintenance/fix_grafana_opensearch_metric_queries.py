#!/usr/bin/env python3
"""
Patch Grafana OpenSearch panel targets that are invalid on recent plugin versions.

Recent grafana-opensearch-datasource backend versions reject metric queries that
have no bucket aggregations unless they are raw document/data/log queries. Older
dashboards with stat panels that only used `count` now fail with:

    invalid query, missing metrics and aggregations

This script fetches dashboards by UID, backs them up, and adds a minimal
`date_histogram` bucket aggregation to affected OpenSearch targets so stat panels
can reduce the returned time series to a total again.
"""

from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


NON_AGGREGATION_METRICS = {"raw_data", "raw_document", "logs"}
DEFAULT_UIDS = [
    "wazuh-threat-04",
    "wazuh-kpi-06",
    "wazuh-comp-05",
    "wazuh-invest-01",
    "wazuh-asset-03",
    "wazuh-soc-02",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--grafana-url", required=True, help="Base Grafana URL")
    parser.add_argument("--token", required=True, help="Grafana API token")
    parser.add_argument(
        "--uid",
        action="append",
        dest="uids",
        help="Dashboard UID to patch. May be provided multiple times.",
    )
    parser.add_argument(
        "--backup-dir",
        default="/opt/code/wazuh_ova/tmp/grafana_dashboard_backups",
        help="Directory used to store dashboard backups before modification.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes back to Grafana. Without this flag the script is read-only.",
    )
    return parser.parse_args()


def grafana_request(
    base_url: str,
    token: str,
    path: str,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = Request(
        f"{base_url.rstrip('/')}{path}",
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: HTTP {exc.code} {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"{method} {path} failed: {exc.reason}") from exc

    if not body:
        return {}
    return json.loads(body)


def normalize_query(query: str) -> str:
    replacements = {
        "rule.level:>=15": "rule.level:[15 TO *]",
        "rule.level:>=14": "rule.level:[14 TO *]",
        "rule.level:>=12": "rule.level:[12 TO *]",
        "rule.level:>=7": "rule.level:[7 TO *]",
    }
    return replacements.get(query, query)


def make_default_bucket_agg() -> list[dict[str, Any]]:
    return [
        {
            "type": "date_histogram",
            "id": "2",
            "field": "@timestamp",
            "settings": {
                "interval": "auto",
                "min_doc_count": "0",
                "trimEdges": "0",
            },
        }
    ]


def target_needs_patch(target: dict[str, Any], panel: dict[str, Any]) -> bool:
    datasource = target.get("datasource") or panel.get("datasource") or {}
    ds_type = datasource.get("type")
    if ds_type != "grafana-opensearch-datasource":
        return False

    bucket_aggs = target.get("bucketAggs") or []
    metrics = target.get("metrics") or []
    metric_type = metrics[0].get("type") if metrics else None
    if bucket_aggs:
        return False
    if metric_type in NON_AGGREGATION_METRICS or metric_type is None:
        return False
    return True


def patch_target(target: dict[str, Any], panel: dict[str, Any]) -> bool:
    if not target_needs_patch(target, panel):
        return False

    target["queryType"] = target.get("queryType") or "lucene"
    target["bucketAggs"] = make_default_bucket_agg()
    target["timeField"] = target.get("timeField") or "@timestamp"

    for metric in target.get("metrics") or []:
        metric.setdefault("settings", {})

    if isinstance(target.get("query"), str):
        target["query"] = normalize_query(target["query"])

    return True


def walk_panels(panels: list[dict[str, Any]], patched: list[dict[str, Any]]) -> None:
    for panel in panels:
        for target in panel.get("targets", []):
            original = deepcopy(target)
            if patch_target(target, panel):
                patched.append(
                    {
                        "panel_id": panel.get("id"),
                        "panel_title": panel.get("title"),
                        "refId": target.get("refId"),
                        "query_before": original.get("query"),
                        "query_after": target.get("query"),
                    }
                )
        if panel.get("panels"):
            walk_panels(panel["panels"], patched)


def backup_dashboard(backup_dir: Path, uid: str, dashboard_payload: dict[str, Any]) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = backup_dir / f"{uid}-{timestamp}.json"
    backup_path.write_text(
        json.dumps(dashboard_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return backup_path


def main() -> int:
    args = parse_args()
    uids = args.uids or DEFAULT_UIDS
    backup_dir = Path(args.backup_dir)
    summary: list[dict[str, Any]] = []
    changed = False

    for uid in uids:
        payload = grafana_request(args.grafana_url, args.token, f"/api/dashboards/uid/{uid}")
        dashboard = payload["dashboard"]
        patched_targets: list[dict[str, Any]] = []
        walk_panels(dashboard.get("panels", []), patched_targets)

        summary.append(
            {
                "uid": uid,
                "title": dashboard.get("title"),
                "patched_targets": patched_targets,
            }
        )

        if not patched_targets:
            continue

        changed = True
        backup_path = backup_dashboard(backup_dir, uid, payload)

        if args.apply:
            save_payload = {
                "dashboard": dashboard,
                "folderUid": payload["meta"].get("folderUid"),
                "overwrite": True,
                "message": "Fix OpenSearch metric queries missing bucketAggs for Grafana 13",
            }
            grafana_request(
                args.grafana_url,
                args.token,
                "/api/dashboards/db",
                method="POST",
                payload=save_payload,
            )
            summary[-1]["backup"] = str(backup_path)
            summary[-1]["saved"] = True
        else:
            summary[-1]["backup"] = str(backup_path)
            summary[-1]["saved"] = False

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if changed or summary else 1


if __name__ == "__main__":
    sys.exit(main())
