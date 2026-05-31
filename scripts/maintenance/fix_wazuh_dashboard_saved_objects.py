#!/usr/bin/env python3
"""
Fix Wazuh Dashboard saved objects that query alert indices with mixed mappings.

Some older recovered alert indices contain selected dashboard fields as `text`,
while the current daily indices map the same fields as `keyword`. OpenSearch
Dashboards field caps then mark those fields as non-aggregatable or conflicted,
which breaks terms aggregations and saved-search tables.

The fix keeps the saved object IDs stable and only changes alert index-pattern
titles to a sanitized comma pattern that excludes the known bad recovered
indices. It also refreshes the saved field list from OpenSearch field_caps.
"""

from __future__ import annotations

import argparse
import json
import ssl
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ENV = REPO_ROOT / ".env"
DEFAULT_DASHBOARD_URL = "https://10.251.151.14"
DEFAULT_INDEXER_URL = "https://10.251.151.13:9200"
SANITIZED_ALERT_PATTERN = (
    "wazuh-alerts-4.x-*,"
    "-wazuh-alerts-4.x-2026.05.14,"
    "-wazuh-alerts-4.x-2026.05.14-proper-timestamp,"
    "-wazuh-alerts-4.x-2026.05.15"
)
ALERT_PATTERN_IDS = {
    "786ecb18-d5a5-459d-bb66-731bad25acf1",
    "wazuh-alerts-*",
    "wazuh-alerts-compliance",
    "wazuh-alerts-fortigate-adv",
    "wazuh-alerts-geoip",
    "wazuh-huawei-ac-alerts",
    "wazuh-huawei-usg-alerts",
    "wazuh-infoblox-alerts",
    "wazuh-mikrotik-alerts",
    "wazuh-mikrotik-geoip",
    "wazuh-mikrotik-geoip-clean",
}
FIELD_REPLACEMENTS = {
    "data.policyname.keyword": "data.policyid",
    "data.policyname": "data.policyid",
    "alert.signature.keyword": "rule.description",
    "alert.signature": "rule.description",
}
QUERY_REPLACEMENTS = {
    'decoder.name: "huawei-usg-custom" and rule.groups: "huawei_usg"': 'decoder.name: "huawei-usg-custom"',
    'decoder.name: "huawei-usg-custom" AND rule.groups: "huawei_usg"': 'decoder.name: "huawei-usg-custom"',
    'decoder.name: \\"huawei-usg-custom\\" and rule.groups: \\"huawei_usg\\"': 'decoder.name: \\"huawei-usg-custom\\"',
    'decoder.name: \\"huawei-usg-custom\\" AND rule.groups: \\"huawei_usg\\"': 'decoder.name: \\"huawei-usg-custom\\"',
    'rule.groups: "mikrotik"': 'location: "10.252.0.1" and not rule.id: "11"',
    'rule.groups: \\"mikrotik\\"': 'location: \\"10.252.0.1\\" and not rule.id: \\"11\\"',
}
SAVED_SEARCH_COLUMNS = {
    "compliance-all-events": [
        "@timestamp",
        "rule_id",
        "rule_level",
        "rule_description",
        "pci_dss",
        "mitre_id",
        "src_ip",
        "agent_name",
        "decoder_name",
        "rule_groups",
        "full_log",
    ],
    "compliance-event-table-v2": [
        "@timestamp",
        "agent_name",
        "rule_id",
        "rule_level",
        "rule_description",
        "pci_dss",
        "hipaa",
        "gdpr",
        "nist_800_53",
        "tsc",
        "mitre_id",
        "src_ip",
        "decoder_name",
        "rule_groups",
    ],
    "fortigate-wuh-adv-events": [
        "timestamp",
        "rule_id",
        "rule_level",
        "rule_description",
        "event_type",
        "event_subtype",
        "action",
        "src_ip",
        "src_port",
        "dst_ip",
        "dst_port",
        "service",
        "policy_id",
        "src_interface",
        "dst_interface",
        "full_log",
    ],
    "huawei-ac-events-search": [
        "timestamp",
        "rule_id",
        "rule_description",
        "dst_user",
        "src_ip",
        "mac",
        "ap_mac",
        "switch_name",
        "auth_result",
        "error_code",
        "full_log",
    ],
    "huawei-usg-policy-events": [
        "timestamp",
        "location",
        "rule_id",
        "rule_level",
        "rule_description",
        "decoder_name",
        "src_ip",
        "src_port",
        "dst_ip",
        "dst_port",
        "protocol",
        "policy_rule",
        "full_log",
    ],
    "infoblox-events-search": [
        "timestamp",
        "rule_id",
        "rule_description",
        "dhcp_action",
        "src_ip",
        "full_log",
    ],
    "infoblox-dhcp-asset-search": [
        "timestamp",
        "dhcp_action",
        "rule_level",
        "rule_description",
        "full_log",
    ],
    "infoblox-dns-sec-events": [
        "timestamp",
        "rule_id",
        "rule_level",
        "rule_description",
        "src_ip",
        "mitre_id",
        "full_log",
    ],
    "mikrotik-routeros-events": [
        "timestamp",
        "location",
        "rule_id",
        "rule_level",
        "rule_description",
        "decoder_name",
        "src_ip",
        "src_port",
        "dst_ip",
        "dst_port",
        "protocol",
        "full_log",
    ],
    "threat-intel-all": [
        "timestamp",
        "rule_level",
        "rule_id",
        "rule_description",
        "agent_name",
        "src_ip",
        "rule_groups",
        "full_log",
    ],
}

SEARCH_SOURCE_OVERRIDES = {
    "mikrotik-routeros-events": {
        "query": {
            "language": "kuery",
            "query": 'location: "10.252.0.1" and not rule.id: "11"',
        },
        "filter": [],
        "indexRefName": "kibanaSavedObjectMeta.searchSourceJSON.index",
    },
    "mikrotik-events-by-rule": {
        "query": {
            "language": "kuery",
            "query": 'location: "10.252.0.1" and not rule.id: "11"',
        },
        "filter": [],
        "indexRefName": "kibanaSavedObjectMeta.searchSourceJSON.index",
    },
    "mikrotik-top-source-ips": {
        "query": {
            "language": "kuery",
            "query": 'location: "10.252.0.1" and not rule.id: "11"',
        },
        "filter": [],
        "indexRefName": "kibanaSavedObjectMeta.searchSourceJSON.index",
    },
    "mikrotik-top-destinations": {
        "query": {
            "language": "kuery",
            "query": (
                'decoder.name: "mikrotik-firewall" and '
                'location: "10.252.0.1" and not rule.id: "11"'
            ),
        },
        "filter": [],
        "indexRefName": "kibanaSavedObjectMeta.searchSourceJSON.index",
    },
    "mikrotik-geomap-src": {
        "query": {
            "language": "kuery",
            "query": 'location: "10.252.0.1" and not rule.id: "11"',
        },
        "filter": [],
        "indexRefName": "kibanaSavedObjectMeta.searchSourceJSON.index",
    },
    "mikrotik-geomap-dst": {
        "query": {
            "language": "kuery",
            "query": 'location: "10.252.0.1" and not rule.id: "11"',
        },
        "filter": [],
        "indexRefName": "kibanaSavedObjectMeta.searchSourceJSON.index",
    },
    "mikrotik-geomap-src-v2": {
        "query": {
            "language": "kuery",
            "query": 'location: "10.252.0.1" and not rule.id: "11"',
        },
        "filter": [],
        "indexRefName": "kibanaSavedObjectMeta.searchSourceJSON.index",
    },
    "mikrotik-geomap-dst-v2": {
        "query": {
            "language": "kuery",
            "query": 'location: "10.252.0.1" and not rule.id: "11"',
        },
        "filter": [],
        "indexRefName": "kibanaSavedObjectMeta.searchSourceJSON.index",
    },
    "mikrotik-routeros-dashboard": {
        "query": {
            "language": "kuery",
            "query": 'location: "10.252.0.1" and not rule.id: "11"',
        },
        "filter": [],
    },
}

ATTRIBUTE_DEFAULTS = {
    "mikrotik-routeros-events": {
        "hits": 0,
        "version": 1,
    },
    "mikrotik-routeros-dashboard": {
        "timeRestore": True,
        "timeFrom": "now-7d",
        "timeTo": "now",
        "refreshInterval": {"pause": False, "value": 300000},
        "version": 1,
    },
}

REFERENCE_OVERRIDES = {
    "mikrotik-routeros-events": [
        {
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
            "id": "wazuh-mikrotik-alerts",
        }
    ],
    "mikrotik-events-by-rule": [
        {
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
            "id": "wazuh-mikrotik-alerts",
        }
    ],
    "mikrotik-top-source-ips": [
        {
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
            "id": "wazuh-mikrotik-alerts",
        }
    ],
    "mikrotik-top-destinations": [
        {
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
            "id": "wazuh-mikrotik-alerts",
        }
    ],
    "mikrotik-geomap-src": [
        {
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
            "id": "wazuh-mikrotik-geoip-clean",
        }
    ],
    "mikrotik-geomap-dst": [
        {
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
            "id": "wazuh-mikrotik-geoip-clean",
        }
    ],
    "mikrotik-geomap-src-v2": [
        {
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
            "id": "wazuh-mikrotik-geoip-clean",
        }
    ],
    "mikrotik-geomap-dst-v2": [
        {
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
            "id": "wazuh-mikrotik-geoip-clean",
        }
    ],
}

DASHBOARD_REFERENCE_OVERRIDES = {
    "mikrotik-routeros-dashboard": {
        "panel_5": "mikrotik-geomap-src-v2",
        "panel_6": "mikrotik-geomap-dst-v2",
    }
}

SCRIPTED_FIELDS = [
    ("rule_id", "string", "rule.id"),
    ("rule_level", "number", "rule.level"),
    ("rule_description", "string", "rule.description"),
    ("rule_groups", "string", "rule.groups"),
    ("pci_dss", "string", "rule.pci_dss"),
    ("hipaa", "string", "rule.hipaa"),
    ("gdpr", "string", "rule.gdpr"),
    ("nist_800_53", "string", "rule.nist_800_53"),
    ("tsc", "string", "rule.tsc"),
    ("mitre_id", "string", "rule.mitre.id"),
    ("agent_name", "string", "agent.name"),
    ("decoder_name", "string", "decoder.name"),
    ("src_ip", "string", "data.srcip", "data.src_ip"),
    ("dst_ip", "string", "data.dstip", "data.dest_ip"),
    ("src_port", "string", "data.srcport", "data.src_port"),
    ("dst_port", "string", "data.dstport", "data.dest_port"),
    ("event_type", "string", "data.type"),
    ("event_subtype", "string", "data.subtype"),
    ("action", "string", "data.action"),
    ("service", "string", "data.service"),
    ("policy_id", "string", "data.policyid"),
    ("src_interface", "string", "data.srcintf"),
    ("dst_interface", "string", "data.dstintf"),
    ("dst_user", "string", "data.dstuser"),
    ("mac", "string", "data.mac"),
    ("ap_mac", "string", "data.ap_mac"),
    ("switch_name", "string", "data.switch_name"),
    ("auth_result", "string", "data.ac_auth_result", "data.ac_result"),
    ("error_code", "string", "data.error_code"),
    ("protocol", "string", "data.protocol"),
    ("policy_rule", "string", "data.rule_name"),
    ("dhcp_action", "string", "data.dhcp_action"),
]


def parse_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        env[key.strip()] = value
    return env


def request_json(
    base_url: str,
    path: str,
    username: str,
    password: str,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data = None
    headers = {
        "Accept": "application/json",
        "osd-xsrf": "true",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    password_mgr = f"{username}:{password}"
    import base64

    headers["Authorization"] = "Basic " + base64.b64encode(
        password_mgr.encode("utf-8")
    ).decode("ascii")

    req = Request(
        f"{base_url.rstrip('/')}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    context = ssl._create_unverified_context()

    try:
        with urlopen(req, timeout=60, context=context) as resp:
            body = resp.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: HTTP {exc.code} {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"{method} {path} failed: {exc.reason}") from exc

    return json.loads(body) if body else {}


def build_fields(field_caps: dict[str, Any]) -> str:
    fields = []
    for name, type_caps in sorted(field_caps.get("fields", {}).items()):
        if name.startswith("_") or name.endswith(".*"):
            continue
        caps = next(iter(type_caps.values()))
        fields.append(
            {
                "name": name,
                "type": caps.get("type", "string"),
                "count": 0,
                "scripted": False,
                "searchable": bool(caps.get("searchable")),
                "aggregatable": bool(caps.get("aggregatable")),
                "readFromDocValues": bool(caps.get("aggregatable")),
                "esTypes": [caps.get("type", "string")],
            }
        )
    existing_names = {field["name"] for field in fields}
    for scripted in make_scripted_fields():
        if scripted["name"] not in existing_names:
            fields.append(scripted)
    return json.dumps(fields, separators=(",", ":"))


def make_script(paths: tuple[str, ...], field_type: str) -> str:
    checks = []
    for path in paths:
        checks.append(
            "if (doc.containsKey('%s') && !doc['%s'].empty) { "
            "return doc['%s'].value; "
            "}" % (path, path, path)
        )
    fallback = "null" if field_type == "number" else "''"
    return " ".join(checks) + f" return {fallback};"


def make_scripted_fields() -> list[dict[str, Any]]:
    fields = []
    for name, field_type, *paths in SCRIPTED_FIELDS:
        fields.append(
            {
                "name": name,
                "type": field_type,
                "count": 0,
                "scripted": True,
                "script": make_script(tuple(paths), field_type),
                "lang": "painless",
                "searchable": True,
                "aggregatable": True,
                "readFromDocValues": False,
            }
        )
    return fields


def dedupe_references(references: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    positions: dict[tuple[str | None, str | None], int] = {}

    for ref in references:
        key = (ref.get("name"), ref.get("type"))
        if key in positions:
            deduped[positions[key]] = ref
        else:
            positions[key] = len(deduped)
            deduped.append(ref)

    return deduped


def replace_strings(value: Any, replacements: dict[str, str], applied: list[str]) -> Any:
    if isinstance(value, str):
        updated = value
        for old, new in replacements.items():
            if old in updated:
                updated = updated.replace(old, new)
                applied.append(f"{old}->{new}")
        return updated
    if isinstance(value, list):
        return [replace_strings(item, replacements, applied) for item in value]
    if isinstance(value, dict):
        return {
            key: replace_strings(item, replacements, applied)
            for key, item in value.items()
        }
    return value


def normalize_attrs(
    obj_id: str,
    attrs: dict[str, Any],
    applied: list[str],
) -> dict[str, Any]:
    updated = dict(attrs)

    defaults = ATTRIBUTE_DEFAULTS.get(obj_id, {})
    for key, value in defaults.items():
        if updated.get(key) != value:
            updated[key] = value
            applied.append(f"{key}->default")

    if obj_id in SEARCH_SOURCE_OVERRIDES:
        desired_meta = dict(updated.get("kibanaSavedObjectMeta", {}))
        desired_json = json.dumps(
            SEARCH_SOURCE_OVERRIDES[obj_id],
            separators=(",", ":"),
        )
        if desired_meta.get("searchSourceJSON") != desired_json:
            desired_meta["searchSourceJSON"] = desired_json
            updated["kibanaSavedObjectMeta"] = desired_meta
            applied.append("searchSourceJSON->curated")

    return updated


def normalize_refs(
    obj_id: str,
    obj_type: str,
    refs: list[dict[str, Any]],
    saved_object_ids: set[str],
    applied: list[str],
) -> list[dict[str, Any]]:
    if obj_id in REFERENCE_OVERRIDES:
        desired_refs = REFERENCE_OVERRIDES[obj_id]
        if refs != desired_refs:
            applied.append("references->curated")
        refs = desired_refs

    panel_overrides = DASHBOARD_REFERENCE_OVERRIDES.get(obj_id)
    if obj_type == "dashboard" and panel_overrides:
        updated_refs: list[dict[str, Any]] = []
        changed = False
        for ref in refs:
            desired_id = panel_overrides.get(ref.get("name"))
            if desired_id and desired_id in saved_object_ids and ref.get("id") != desired_id:
                updated_ref = dict(ref)
                updated_ref["id"] = desired_id
                updated_refs.append(updated_ref)
                changed = True
            else:
                updated_refs.append(ref)
        if changed:
            refs = updated_refs
            applied.append("dashboardRefs->curated")

    return dedupe_references(refs)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", default=str(DEFAULT_ENV))
    parser.add_argument("--dashboard-url", default=DEFAULT_DASHBOARD_URL)
    parser.add_argument("--indexer-url", default=DEFAULT_INDEXER_URL)
    parser.add_argument("--pattern", default=SANITIZED_ALERT_PATTERN)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    env = parse_env(Path(args.env_file))
    dashboard_user = env.get("wazuh_dashboard_username", "admin")
    dashboard_pass = env.get("wazuh_dashboard_password", "")
    indexer_user = env.get("wazuh_open_search_username", "admin")
    indexer_pass = env.get("wazuh_open_search_password", "")

    saved_objects = request_json(
        args.dashboard_url,
        "/api/saved_objects/_find?type=index-pattern&type=search&type=visualization&type=dashboard&per_page=10000",
        dashboard_user,
        dashboard_pass,
    )["saved_objects"]

    encoded_pattern = quote(args.pattern, safe="*,-._")
    field_caps = request_json(
        args.indexer_url,
        f"/{encoded_pattern}/_field_caps?fields=*&include_unmapped=false",
        indexer_user,
        indexer_pass,
    )
    refreshed_fields = build_fields(field_caps)
    saved_object_ids = {obj["id"] for obj in saved_objects}

    changes: list[dict[str, Any]] = []
    for obj in saved_objects:
        obj_id = obj["id"]
        obj_type = obj["type"]
        attrs = obj.get("attributes", {})
        refs = obj.get("references", [])
        new_refs = normalize_refs(obj_id, obj_type, refs, saved_object_ids, [])
        title = attrs.get("title")
        new_attrs: dict[str, Any] | None = None

        if obj_type == "index-pattern":
            if obj_id not in ALERT_PATTERN_IDS and title not in {"wazuh-alerts-*"}:
                if refs == new_refs:
                    continue
                new_attrs = dict(attrs)
            else:
                new_attrs = dict(attrs)
                new_attrs["title"] = args.pattern
                new_attrs["fields"] = refreshed_fields
                if attrs.get("title") == new_attrs["title"] and attrs.get("fields") == new_attrs["fields"] and refs == new_refs:
                    continue

            changes.append(
                {
                    "type": obj_type,
                    "id": obj_id,
                    "old_title": title,
                    "new_title": new_attrs.get("title"),
                    "timeFieldName": new_attrs.get("timeFieldName"),
                    "references_before": len(refs),
                    "references_after": len(new_refs),
                }
            )

        elif obj_type in {"search", "visualization", "dashboard"}:
            replacements_applied = []
            new_attrs = replace_strings(
                attrs,
                {**FIELD_REPLACEMENTS, **QUERY_REPLACEMENTS},
                replacements_applied,
            )
            new_attrs = normalize_attrs(obj_id, new_attrs, replacements_applied)
            if obj_type == "search" and obj_id in SAVED_SEARCH_COLUMNS:
                desired_columns = SAVED_SEARCH_COLUMNS[obj_id]
                if new_attrs.get("columns") != desired_columns:
                    new_attrs = dict(new_attrs)
                    new_attrs["columns"] = desired_columns
                    replacements_applied.append("columns->curated")
            new_refs = normalize_refs(
                obj_id,
                obj_type,
                new_refs,
                saved_object_ids,
                replacements_applied,
            )
            if new_attrs == attrs and refs == new_refs:
                continue
            changes.append(
                {
                    "type": obj_type,
                    "id": obj_id,
                    "title": title,
                    "replacements": replacements_applied,
                    "references_before": len(refs),
                    "references_after": len(new_refs),
                }
            )

        else:
            if refs == new_refs:
                continue
            new_attrs = dict(attrs)
            changes.append(
                {
                    "type": obj_type,
                    "id": obj_id,
                    "title": title,
                    "references_before": len(refs),
                    "references_after": len(new_refs),
                }
            )

        if args.apply:
            request_json(
                args.dashboard_url,
                f"/api/saved_objects/{obj_type}/{quote(obj_id, safe='')}",
                dashboard_user,
                dashboard_pass,
                method="PUT",
                payload={"attributes": new_attrs, "references": new_refs},
            )

    print(json.dumps({"apply": args.apply, "changes": changes}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
