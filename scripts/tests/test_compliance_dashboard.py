#!/usr/bin/env python3
"""Validate the Compliance Overview dashboard artifact and live deployment."""

import argparse
import json
import os
import ssl
import subprocess
import sys
import urllib.request


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GENERATOR = os.path.join(REPO_ROOT, "scripts", "generate", "generate_compliance_dashboard.py")
NDJSON = os.path.join(REPO_ROOT, "visualizations", "compliance", "compliance-overview-dashboard.ndjson")
DASHBOARD_ID = "wazuh-compliance-overview"
DASHBOARD_TITLE = "Compliance Overview — PCI DSS | HIPAA | GDPR | NIST 800-53 | TSC"
INDEXER_URL = os.environ.get("WAZUH_INDEXER_URL", "https://10.251.151.13:9200")
DASHBOARD_URL = os.environ.get("WAZUH_DASHBOARD_URL", "https://10.251.151.14")
AUTH = "%s:%s" % (
    os.environ.get("WAZUH_API_USER", "admin"),
    os.environ.get("WAZUH_API_PASSWORD", "admin"),
)
SSL_CONTEXT = ssl._create_unverified_context()

ANY_Q = "(rule.pci_dss: *) OR (rule.hipaa: *) OR (rule.gdpr: *) OR (rule.nist_800_53: *) OR (rule.tsc: *)"

EXPECTED_QUERIES = {
    "PCI DSS — Total Events": "rule.pci_dss: *",
    "HIPAA — Total Events": "rule.hipaa: *",
    "GDPR — Total Events": "rule.gdpr: *",
    "NIST 800-53 — Total Events": "rule.nist_800_53: *",
    "TSC / SOC2 — Total Events": "rule.tsc: *",
    "Compliance Events Over Time (All Frameworks)": ANY_Q,
    "PCI DSS — Events by Requirement": "rule.pci_dss: *",
    "Top PCI DSS Requirements": "rule.pci_dss: *",
    "Top NIST 800-53 Controls": "rule.nist_800_53: *",
    "Top GDPR Articles": "rule.gdpr: *",
    "Top HIPAA Controls": "rule.hipaa: *",
    "Top TSC / SOC2 Criteria": "rule.tsc: *",
    "Events by Source Device": ANY_Q,
    "Attacker Countries (GeoIP)": f"({ANY_Q}) AND GeoLocation.country_name: *",
    "MITRE ATT&CK — Top Tactics": f"rule.mitre.tactic: * AND ({ANY_Q})",
    "MITRE ATT&CK — Top Techniques": f"rule.mitre.technique: * AND ({ANY_Q})",
    "Alert Severity Distribution": ANY_Q,
    "Events by Rule Group": ANY_Q,
    "Authentication Events Over Time": f"({ANY_Q}) AND (rule.groups: authentication_failed OR rule.groups: authentication_success)",
    "Top Source IPs — Auth Failures": f"({ANY_Q}) AND rule.groups: authentication_failed",
    "PCI DSS Requirements — Tag Cloud": "rule.pci_dss: *",
    "NIST 800-53 Events by Control": "rule.nist_800_53: *",
    "Compliance — Full Event Table": "rule.pci_dss: * OR rule.hipaa: * OR rule.gdpr: * OR rule.nist_800_53: * OR rule.tsc: *",
}

EXPECTED_PANELS = [
    {"x": 0, "y": 0, "w": 10, "h": 7, "type": "visualization"},
    {"x": 10, "y": 0, "w": 10, "h": 7, "type": "visualization"},
    {"x": 20, "y": 0, "w": 9, "h": 7, "type": "visualization"},
    {"x": 29, "y": 0, "w": 9, "h": 7, "type": "visualization"},
    {"x": 38, "y": 0, "w": 10, "h": 7, "type": "visualization"},
    {"x": 0, "y": 7, "w": 24, "h": 10, "type": "visualization"},
    {"x": 24, "y": 7, "w": 24, "h": 10, "type": "visualization"},
    {"x": 0, "y": 17, "w": 16, "h": 13, "type": "visualization"},
    {"x": 16, "y": 17, "w": 16, "h": 13, "type": "visualization"},
    {"x": 32, "y": 17, "w": 16, "h": 13, "type": "visualization"},
    {"x": 0, "y": 30, "w": 24, "h": 12, "type": "visualization"},
    {"x": 24, "y": 30, "w": 24, "h": 12, "type": "visualization"},
    {"x": 0, "y": 42, "w": 24, "h": 11, "type": "visualization"},
    {"x": 24, "y": 42, "w": 24, "h": 11, "type": "visualization"},
    {"x": 0, "y": 53, "w": 24, "h": 13, "type": "visualization"},
    {"x": 24, "y": 53, "w": 24, "h": 13, "type": "visualization"},
    {"x": 0, "y": 66, "w": 16, "h": 12, "type": "visualization"},
    {"x": 16, "y": 66, "w": 32, "h": 12, "type": "visualization"},
    {"x": 0, "y": 78, "w": 24, "h": 11, "type": "visualization"},
    {"x": 24, "y": 78, "w": 24, "h": 11, "type": "visualization"},
    {"x": 0, "y": 89, "w": 24, "h": 12, "type": "visualization"},
    {"x": 24, "y": 89, "w": 24, "h": 12, "type": "visualization"},
    {"x": 0, "y": 101, "w": 48, "h": 20, "type": "search"},
]


def build_auth_header():
    import base64

    return "Basic " + base64.b64encode(AUTH.encode("utf-8")).decode("ascii")


def fetch_json_fixed(url, payload=None, headers=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST" if payload is not None else "GET")
    req.add_header("Authorization", build_auth_header())
    if payload is not None:
        req.add_header("Content-Type", "application/json")
    if headers:
        for key, value in headers.items():
            req.add_header(key, value)
    with urllib.request.urlopen(req, context=SSL_CONTEXT) as response:
        return response.read().decode("utf-8")


def run_generator():
    result = subprocess.run([sys.executable, GENERATOR], cwd=REPO_ROOT, check=True, capture_output=True, text=True)
    print(result.stdout.strip())


def load_ndjson(path):
    with open(path, "r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def extract_query(obj):
    source = obj["attributes"]["kibanaSavedObjectMeta"]["searchSourceJSON"]
    return json.loads(source)["query"]["query"]


def assert_equal(actual, expected, message):
    if actual != expected:
        raise AssertionError(f"{message}: expected {expected!r}, got {actual!r}")


def validate_artifact(objects):
    counts = {}
    for obj in objects:
        counts[obj["type"]] = counts.get(obj["type"], 0) + 1

    assert_equal(len(objects), 24, "artifact object count")
    assert_equal(counts.get("visualization"), 22, "artifact visualization count")
    assert_equal(counts.get("search"), 1, "artifact search count")
    assert_equal(counts.get("dashboard"), 1, "artifact dashboard count")

    title_to_query = {}
    for obj in objects:
        if obj["type"] in {"visualization", "search"}:
            title_to_query[obj["attributes"]["title"]] = extract_query(obj)

    assert_equal(title_to_query, EXPECTED_QUERIES, "artifact title/query map")

    dashboard = next(obj for obj in objects if obj["type"] == "dashboard")
    panels = json.loads(dashboard["attributes"]["panelsJSON"])
    simple_panels = [
        {
            "x": panel["gridData"]["x"],
            "y": panel["gridData"]["y"],
            "w": panel["gridData"]["w"],
            "h": panel["gridData"]["h"],
            "type": panel["type"],
        }
        for panel in panels
    ]
    assert_equal(dashboard["id"], DASHBOARD_ID, "artifact dashboard id")
    assert_equal(dashboard["attributes"]["title"], DASHBOARD_TITLE, "artifact dashboard title")
    assert_equal(dashboard["attributes"]["timeFrom"], "now-7d", "artifact dashboard timeFrom")
    assert_equal(dashboard["attributes"]["timeTo"], "now", "artifact dashboard timeTo")
    assert_equal(len(panels), 23, "artifact panel count")
    assert_equal(simple_panels, EXPECTED_PANELS, "artifact layout")
    print("[OK] Artifact validation passed")


def export_live_dashboard():
    raw = fetch_json_fixed(
        DASHBOARD_URL + "/api/saved_objects/_export",
        payload={"objects": [{"type": "dashboard", "id": DASHBOARD_ID}], "includeReferencesDeep": True},
        headers={"osd-xsrf": "true"},
    )
    return [json.loads(line) for line in raw.splitlines() if line.strip() and "exportedCount" not in line]


def validate_live(objects):
    title_to_query = {}
    for obj in objects:
        if obj["type"] in {"visualization", "search"}:
            title_to_query[obj["attributes"]["title"]] = extract_query(obj)

    dashboard = next(obj for obj in objects if obj["type"] == "dashboard")
    panels = json.loads(dashboard["attributes"]["panelsJSON"])
    simple_panels = [
        {
            "x": panel["gridData"]["x"],
            "y": panel["gridData"]["y"],
            "w": panel["gridData"]["w"],
            "h": panel["gridData"]["h"],
            "type": panel["type"],
        }
        for panel in panels
    ]

    assert_equal(dashboard["attributes"]["title"], DASHBOARD_TITLE, "live dashboard title")
    assert_equal(dashboard["attributes"]["timeFrom"], "now-7d", "live dashboard timeFrom")
    assert_equal(dashboard["attributes"]["timeTo"], "now", "live dashboard timeTo")
    assert_equal(len(panels), 23, "live panel count")
    assert_equal(simple_panels, EXPECTED_PANELS, "live layout")
    assert_equal(title_to_query, EXPECTED_QUERIES, "live title/query map")
    print("[OK] Live dashboard validation passed")


def count_exists(field):
    raw = fetch_json_fixed(
        INDEXER_URL + "/wazuh-alerts-4.x-*/_count",
        payload={"query": {"exists": {"field": field}}},
    )
    return json.loads(raw)["count"]


def top_terms(field, size=3):
    raw = fetch_json_fixed(
        INDEXER_URL + "/wazuh-alerts-4.x-*/_search",
        payload={
            "size": 0,
            "query": {"exists": {"field": field}},
            "aggs": {"top_terms": {"terms": {"field": field, "size": size}}},
        },
    )
    buckets = json.loads(raw)["aggregations"]["top_terms"]["buckets"]
    return [(bucket["key"], bucket["doc_count"]) for bucket in buckets]


def validate_live_data():
    fields = ["rule.pci_dss", "rule.hipaa", "rule.gdpr", "rule.nist_800_53", "rule.tsc"]
    counts = {field: count_exists(field) for field in fields}
    for field, value in counts.items():
        if value <= 0:
            raise AssertionError(f"live count for {field} must be > 0, got {value}")

    pci_top = top_terms("rule.pci_dss", 3)
    print("[OK] Live compliance data present")
    for field, value in counts.items():
        print(f"  {field}: {value}")
    print("  top rule.pci_dss:", ", ".join(f"{key}={value}" for key, value in pci_top))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact-only", action="store_true", help="Skip live API validation")
    args = parser.parse_args()

    run_generator()
    objects = load_ndjson(NDJSON)
    validate_artifact(objects)

    if not args.artifact_only:
        live_objects = export_live_dashboard()
        validate_live(live_objects)
        validate_live_data()

    print("[OK] Compliance dashboard tests completed")


if __name__ == "__main__":
    main()
