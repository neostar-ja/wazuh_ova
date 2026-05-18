#!/usr/bin/env python3
"""
Compliance Dashboard Generator
Frameworks: PCI DSS 3.2.1 | HIPAA | GDPR | NIST 800-53 | TSC (SOC2)
Output: visualizations/compliance/compliance-overview-dashboard.ndjson

This generator intentionally omits the index-pattern saved object. The live
Dashboard already uses the shared `wazuh-alerts-*` saved object, and excluding
it here avoids overwriting field metadata during imports.
"""

import json
import os


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
INDEX_PATTERN_ID = "wazuh-alerts-*"
DASHBOARD_ID = "wazuh-compliance-overview"
SEARCH_ID = "compliance-event-table-v2"

PCI_Q = "rule.pci_dss: *"
HIPAA_Q = "rule.hipaa: *"
GDPR_Q = "rule.gdpr: *"
NIST_Q = "rule.nist_800_53: *"
TSC_Q = "rule.tsc: *"
ANY_Q = "(rule.pci_dss: *) OR (rule.hipaa: *) OR (rule.gdpr: *) OR (rule.nist_800_53: *) OR (rule.tsc: *)"
ANY_GEO_Q = f"({ANY_Q}) AND GeoLocation.country_name: *"
MITRE_TACTIC_Q = f"rule.mitre.tactic: * AND ({ANY_Q})"
MITRE_TECHNIQUE_Q = f"rule.mitre.technique: * AND ({ANY_Q})"
AUTH_Q = f"({ANY_Q}) AND (rule.groups: authentication_failed OR rule.groups: authentication_success)"
AUTH_FAIL_Q = f"({ANY_Q}) AND rule.groups: authentication_failed"


def search_source(query):
    return json.dumps(
        {
            "index": INDEX_PATTERN_ID,
            "query": {"language": "kuery", "query": query},
            "filter": [],
        }
    )


def references():
    return [
        {
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
            "id": INDEX_PATTERN_ID,
        }
    ]


def metric(title, query):
    return {
        "title": title,
        "type": "metric",
        "params": {
            "addTooltip": True,
            "addLegend": False,
            "type": "metric",
            "metric": {
                "percentageMode": False,
                "useRanges": False,
                "colorSchema": "Green to Red",
                "metricColorMode": "None",
                "colorsRange": [{"from": 0, "to": 10000}],
                "labels": {"show": True},
                "invertColors": False,
                "style": {
                    "bgFill": "#000",
                    "bgColor": False,
                    "labelColor": False,
                    "subText": "",
                    "fontSize": 60,
                },
            },
        },
        "aggs": [{"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}}],
    }, query


def area(title, query, interval, split_field=None):
    aggs = [
        {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
        {
            "id": "2",
            "enabled": True,
            "type": "date_histogram",
            "schema": "segment",
            "params": {
                "field": "@timestamp",
                "interval": interval,
                "min_doc_count": 1,
                "extended_bounds": {},
                "customLabel": "Time",
            },
        },
    ]
    if split_field:
        aggs.append(
            {
                "id": "3",
                "enabled": True,
                "type": "terms",
                "schema": "group",
                "params": {
                    "field": split_field,
                    "size": 6,
                    "order": "desc",
                    "orderBy": "1",
                },
            }
        )

    return {
        "title": title,
        "type": "area",
        "params": {
            "type": "area",
            "grid": {"categoryLines": False},
            "categoryAxes": [
                {
                    "id": "CategoryAxis-1",
                    "type": "category",
                    "position": "bottom",
                    "show": True,
                    "labels": {"show": True, "truncate": 100},
                }
            ],
            "valueAxes": [
                {
                    "id": "ValueAxis-1",
                    "name": "LeftAxis-1",
                    "type": "value",
                    "position": "left",
                    "show": True,
                    "labels": {"show": True},
                    "title": {"text": "Events"},
                }
            ],
            "seriesParams": [
                {
                    "show": True,
                    "type": "area",
                    "mode": "stacked",
                    "data": {"label": "Count", "id": "1"},
                    "valueAxis": "ValueAxis-1",
                    "drawLinesBetweenPoints": True,
                    "showCircles": True,
                }
            ],
            "addTooltip": True,
            "addLegend": True,
            "times": [],
            "addTimeMarker": False,
        },
        "aggs": aggs,
    }, query


def horizontal_bar(title, query, field, size, axis_title="Events"):
    return {
        "title": title,
        "type": "horizontal_bar",
        "params": {
            "type": "histogram",
            "grid": {"categoryLines": False},
            "categoryAxes": [
                {
                    "id": "CategoryAxis-1",
                    "type": "category",
                    "position": "left",
                    "show": True,
                    "scale": {"type": "linear"},
                    "labels": {"show": True, "truncate": 120},
                    "title": {},
                }
            ],
            "valueAxes": [
                {
                    "id": "ValueAxis-1",
                    "name": "BottomAxis-1",
                    "type": "value",
                    "position": "bottom",
                    "show": True,
                    "labels": {"show": True, "rotate": 0, "filter": True, "truncate": 100},
                    "title": {"text": axis_title},
                }
            ],
            "seriesParams": [
                {
                    "show": True,
                    "type": "histogram",
                    "mode": "normal",
                    "data": {"label": axis_title, "id": "1"},
                    "valueAxis": "ValueAxis-1",
                    "drawLinesBetweenPoints": True,
                    "showCircles": True,
                }
            ],
            "addTooltip": True,
            "addLegend": False,
            "times": [],
            "addTimeMarker": False,
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {
                "id": "2",
                "enabled": True,
                "type": "terms",
                "schema": "segment",
                "params": {
                    "field": field,
                    "size": size,
                    "order": "desc",
                    "orderBy": "1",
                    "otherBucket": False,
                    "missingBucket": False,
                },
            },
        ],
    }, query


def pie(title, query, field, size):
    return {
        "title": title,
        "type": "pie",
        "params": {
            "type": "pie",
            "addTooltip": True,
            "addLegend": True,
            "legendPosition": "right",
            "isDonut": True,
            "labels": {
                "show": True,
                "values": True,
                "last_level": True,
                "truncate": 100,
            },
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {
                "id": "2",
                "enabled": True,
                "type": "terms",
                "schema": "segment",
                "params": {
                    "field": field,
                    "size": size,
                    "order": "desc",
                    "orderBy": "1",
                    "otherBucket": True,
                    "otherBucketLabel": "Other",
                },
            },
        ],
    }, query


def tagcloud(title, query, field, size):
    return {
        "title": title,
        "type": "tagcloud",
        "params": {
            "scale": "linear",
            "orientation": "single",
            "minFontSize": 14,
            "maxFontSize": 72,
            "showLabel": True,
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {
                "id": "2",
                "enabled": True,
                "type": "terms",
                "schema": "segment",
                "params": {"field": field, "size": size, "order": "desc", "orderBy": "1"},
            },
        ],
    }, query


def visualization_object(vis_id, vis_state, query):
    return {
        "type": "visualization",
        "id": vis_id,
        "attributes": {
            "title": vis_state["title"],
            "uiStateJSON": "{}",
            "visState": json.dumps(vis_state, ensure_ascii=False),
            "kibanaSavedObjectMeta": {"searchSourceJSON": search_source(query)},
        },
        "references": references(),
    }


def search_object():
    return {
        "type": "search",
        "id": SEARCH_ID,
        "attributes": {
            "title": "Compliance — Full Event Table",
            "description": "All alerts with any compliance tag — PCI/HIPAA/GDPR/NIST/TSC",
            "columns": [
                "@timestamp",
                "agent.name",
                "rule.id",
                "rule.level",
                "rule.description",
                "rule.pci_dss",
                "rule.hipaa",
                "rule.gdpr",
                "rule.nist_800_53",
                "rule.tsc",
                "rule.mitre.id",
                "data.srcip",
                "GeoLocation.country_name",
                "rule.groups",
            ],
            "sort": [["@timestamp", "desc"]],
            "kibanaSavedObjectMeta": {"searchSourceJSON": search_source("rule.pci_dss: * OR rule.hipaa: * OR rule.gdpr: * OR rule.nist_800_53: * OR rule.tsc: *")},
        },
        "references": references(),
    }


VIS_SPECS = [
    ("comp-overview-pci-total", metric("PCI DSS — Total Events", PCI_Q)),
    ("comp-overview-hipaa-total", metric("HIPAA — Total Events", HIPAA_Q)),
    ("comp-overview-gdpr-total", metric("GDPR — Total Events", GDPR_Q)),
    ("comp-overview-nist-total", metric("NIST 800-53 — Total Events", NIST_Q)),
    ("comp-overview-tsc-total", metric("TSC / SOC2 — Total Events", TSC_Q)),
    ("comp-overview-all-timeline", area("Compliance Events Over Time (All Frameworks)", ANY_Q, "12h")),
    ("comp-overview-pci-timeline", area("PCI DSS — Events by Requirement", PCI_Q, "12h", split_field="rule.pci_dss")),
    ("comp-overview-top-pci", horizontal_bar("Top PCI DSS Requirements", PCI_Q, "rule.pci_dss", 15)),
    ("comp-overview-top-nist", horizontal_bar("Top NIST 800-53 Controls", NIST_Q, "rule.nist_800_53", 15)),
    ("comp-overview-top-gdpr", horizontal_bar("Top GDPR Articles", GDPR_Q, "rule.gdpr", 10)),
    ("comp-overview-top-hipaa", horizontal_bar("Top HIPAA Controls", HIPAA_Q, "rule.hipaa", 12)),
    ("comp-overview-top-tsc", horizontal_bar("Top TSC / SOC2 Criteria", TSC_Q, "rule.tsc", 12)),
    ("comp-overview-by-device", pie("Events by Source Device", ANY_Q, "agent.name", 12)),
    ("comp-overview-by-country", pie("Attacker Countries (GeoIP)", ANY_GEO_Q, "GeoLocation.country_name", 15)),
    ("comp-overview-top-tactics", horizontal_bar("MITRE ATT&CK — Top Tactics", MITRE_TACTIC_Q, "rule.mitre.tactic", 12)),
    ("comp-overview-top-techniques", horizontal_bar("MITRE ATT&CK — Top Techniques", MITRE_TECHNIQUE_Q, "rule.mitre.technique", 12)),
    ("comp-overview-severity", pie("Alert Severity Distribution", ANY_Q, "rule.level", 15)),
    ("comp-overview-rule-groups", horizontal_bar("Events by Rule Group", ANY_Q, "rule.groups", 20)),
    ("comp-overview-auth-timeline", area("Authentication Events Over Time", AUTH_Q, "6h", split_field="rule.groups")),
    ("comp-overview-auth-fail-src", horizontal_bar("Top Source IPs — Auth Failures", AUTH_FAIL_Q, "data.srcip", 20)),
    ("comp-overview-pci-tagcloud", tagcloud("PCI DSS Requirements — Tag Cloud", PCI_Q, "rule.pci_dss", 25)),
    ("comp-overview-nist-timeline", area("NIST 800-53 Events by Control", NIST_Q, "12h", split_field="rule.nist_800_53")),
]


PANEL_LAYOUT = [
    {"x": 0, "y": 0, "w": 10, "h": 7, "type": "visualization", "id": "comp-overview-pci-total"},
    {"x": 10, "y": 0, "w": 10, "h": 7, "type": "visualization", "id": "comp-overview-hipaa-total"},
    {"x": 20, "y": 0, "w": 9, "h": 7, "type": "visualization", "id": "comp-overview-gdpr-total"},
    {"x": 29, "y": 0, "w": 9, "h": 7, "type": "visualization", "id": "comp-overview-nist-total"},
    {"x": 38, "y": 0, "w": 10, "h": 7, "type": "visualization", "id": "comp-overview-tsc-total"},
    {"x": 0, "y": 7, "w": 24, "h": 10, "type": "visualization", "id": "comp-overview-all-timeline"},
    {"x": 24, "y": 7, "w": 24, "h": 10, "type": "visualization", "id": "comp-overview-pci-timeline"},
    {"x": 0, "y": 17, "w": 16, "h": 13, "type": "visualization", "id": "comp-overview-top-pci"},
    {"x": 16, "y": 17, "w": 16, "h": 13, "type": "visualization", "id": "comp-overview-top-nist"},
    {"x": 32, "y": 17, "w": 16, "h": 13, "type": "visualization", "id": "comp-overview-top-gdpr"},
    {"x": 0, "y": 30, "w": 24, "h": 12, "type": "visualization", "id": "comp-overview-top-hipaa"},
    {"x": 24, "y": 30, "w": 24, "h": 12, "type": "visualization", "id": "comp-overview-top-tsc"},
    {"x": 0, "y": 42, "w": 24, "h": 11, "type": "visualization", "id": "comp-overview-by-device"},
    {"x": 24, "y": 42, "w": 24, "h": 11, "type": "visualization", "id": "comp-overview-by-country"},
    {"x": 0, "y": 53, "w": 24, "h": 13, "type": "visualization", "id": "comp-overview-top-tactics"},
    {"x": 24, "y": 53, "w": 24, "h": 13, "type": "visualization", "id": "comp-overview-top-techniques"},
    {"x": 0, "y": 66, "w": 16, "h": 12, "type": "visualization", "id": "comp-overview-severity"},
    {"x": 16, "y": 66, "w": 32, "h": 12, "type": "visualization", "id": "comp-overview-rule-groups"},
    {"x": 0, "y": 78, "w": 24, "h": 11, "type": "visualization", "id": "comp-overview-auth-timeline"},
    {"x": 24, "y": 78, "w": 24, "h": 11, "type": "visualization", "id": "comp-overview-auth-fail-src"},
    {"x": 0, "y": 89, "w": 24, "h": 12, "type": "visualization", "id": "comp-overview-pci-tagcloud"},
    {"x": 24, "y": 89, "w": 24, "h": 12, "type": "visualization", "id": "comp-overview-nist-timeline"},
    {"x": 0, "y": 101, "w": 48, "h": 20, "type": "search", "id": SEARCH_ID},
]


def dashboard_object():
    panels = []
    refs = []
    for index, panel in enumerate(PANEL_LAYOUT, start=1):
        panel_index = str(index)
        panels.append(
            {
                "panelIndex": panel_index,
                "gridData": {
                    "x": panel["x"],
                    "y": panel["y"],
                    "w": panel["w"],
                    "h": panel["h"],
                    "i": panel_index,
                },
                "version": "7.10.2",
                "type": panel["type"],
            }
        )
        refs.append({"name": f"panel_{panel_index}", "type": panel["type"], "id": panel["id"]})

    return {
        "type": "dashboard",
        "id": DASHBOARD_ID,
        "attributes": {
            "title": "Compliance Overview — PCI DSS | HIPAA | GDPR | NIST 800-53 | TSC",
            "description": "Production compliance dashboard | Frameworks: PCI DSS 3.2.1, HIPAA, GDPR, NIST 800-53, TSC (SOC2) | Sources: FortiGate, Huawei USG, MikroTik, Suricata, Infoblox, Windows | GeoIP enriched | MITRE ATT&CK mapped",
            "panelsJSON": json.dumps(panels, ensure_ascii=False),
            "optionsJSON": json.dumps({"useMargins": True, "hidePanelTitles": False, "syncColors": False}),
            "version": 1,
            "timeRestore": True,
            "timeTo": "now",
            "timeFrom": "now-7d",
            "refreshInterval": {"pause": False, "value": 300000},
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({"query": {"language": "kuery", "query": ""}, "filter": []})
            },
        },
        "references": refs,
    }


def main():
    objects = [visualization_object(vis_id, vis_state, query) for vis_id, (vis_state, query) in VIS_SPECS]
    objects.append(search_object())
    objects.append(dashboard_object())

    out_dir = os.path.join(REPO_ROOT, "visualizations", "compliance")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "compliance-overview-dashboard.ndjson")

    with open(out_path, "w", encoding="utf-8") as handle:
        for obj in objects:
            handle.write(json.dumps(obj, ensure_ascii=False) + "\n")

    print(f"[OK] Wrote {len(objects)} saved objects to {out_path}")
    print("Dashboard:", DASHBOARD_ID)
    print("Panels   : 23 (22 visualizations + 1 saved search)")
    print("Window   : now-7d -> now, refresh every 5 minutes")
    print("Note     : NDJSON excludes the shared index-pattern object `wazuh-alerts-*` by design")


if __name__ == "__main__":
    main()
