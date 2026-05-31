#!/usr/bin/env python3
"""
FortiGate WUH Dashboard Generator
Devices: FW-WUH01 + FW-WUH02 (10.251.151.1)
Output : fortigate-wuh-dashboard.ndjson  (import via Wazuh Dashboard UI)

Usage:
  python3 generate_fortigate_dashboard.py
  # Then import fortigate-wuh-dashboard.ndjson via:
  # Wazuh Dashboard → Stack Management → Saved Objects → Import
"""

import json
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

INDEX_PATTERN_ID = "wazuh-alerts-fortigate"
DECODER_FILTER  = 'decoder.name: "fortigate-wuh"'
GROUP_FILTER    = 'rule.groups: "fortigate"'

# ─────────────────────────────────────────────────────────────────────────────
# Index Pattern
# ─────────────────────────────────────────────────────────────────────────────
obj_index = {
    "type": "index-pattern",
    "id": INDEX_PATTERN_ID,
    "attributes": {
        "title": "wazuh-alerts-*",
        "timeFieldName": "timestamp",
        "fields": "[]"
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# Saved Search: All FortiGate alerts
# ─────────────────────────────────────────────────────────────────────────────
obj_search = {
    "type": "search",
    "id": "fortigate-wuh-all-events",
    "attributes": {
        "title": "FortiGate WUH — All Events",
        "description": "All FortiGate FW-WUH01/FW-WUH02 decoded alerts",
        "columns": [
            "timestamp",
            "rule.id",
            "rule.level",
            "rule.description",
            "data.fgt_type",
            "data.fgt_subtype",
            "data.action",
            "data.srcip",
            "data.dstip",
            "data.dstport",
            "data.service",
            "data.app",
            "data.policyid",
            "data.username",
        ],
        "sort": [["timestamp", "desc"]],
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps({
                "index": INDEX_PATTERN_ID,
                "query": {"language": "kuery", "query": GROUP_FILTER},
                "filter": []
            })
        }
    },
    "references": [
        {"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
         "type": "index-pattern", "id": INDEX_PATTERN_ID}
    ]
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper: pie/donut chart
# ─────────────────────────────────────────────────────────────────────────────
def make_pie(vis_id, title, field, query=GROUP_FILTER, top=10):
    vis_state = {
        "title": title,
        "type": "pie",
        "params": {
            "type": "pie",
            "addTooltip": True,
            "addLegend": True,
            "legendPosition": "right",
            "isDonut": True,
            "labels": {"show": True, "values": True, "last_level": True, "truncate": 100}
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count",
             "schema": "metric", "params": {}},
            {"id": "2", "enabled": True, "type": "terms",
             "schema": "segment",
             "params": {"field": field, "size": top,
                        "order": "desc", "orderBy": "1"}}
        ]
    }
    return {
        "type": "visualization",
        "id": vis_id,
        "attributes": {
            "title": title,
            "visState": json.dumps(vis_state),
            "uiStateJSON": "{}",
            "description": "",
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "index": INDEX_PATTERN_ID,
                    "query": {"language": "kuery", "query": query},
                    "filter": []
                })
            }
        },
        "references": [
            {"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
             "type": "index-pattern", "id": INDEX_PATTERN_ID}
        ]
    }

# ─────────────────────────────────────────────────────────────────────────────
# Helper: horizontal bar chart
# ─────────────────────────────────────────────────────────────────────────────
def make_bar(vis_id, title, field, query=GROUP_FILTER, top=15):
    vis_state = {
        "title": title,
        "type": "horizontal_bar",
        "params": {
            "type": "histogram",
            "grid": {"categoryLines": False},
            "categoryAxes": [{"id": "CategoryAxis-1", "type": "category",
                               "position": "left", "show": True,
                               "style": {}, "scale": {"type": "linear"},
                               "labels": {"show": True, "rotate": 0, "truncate": 200},
                               "title": {}}],
            "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1",
                            "type": "value", "position": "bottom",
                            "show": True, "style": {},
                            "scale": {"type": "linear", "mode": "normal"},
                            "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100},
                            "title": {"text": "Count"}}],
            "seriesParams": [{"show": True, "type": "histogram",
                               "mode": "stacked", "data": {"label": "Count", "id": "1"},
                               "valueAxis": "ValueAxis-1",
                               "drawLinesBetweenPoints": True,
                               "showCircles": True}],
            "addTooltip": True,
            "addLegend": True,
            "legendPosition": "right",
            "times": [],
            "addTimeMarker": False
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count",
             "schema": "metric", "params": {}},
            {"id": "2", "enabled": True, "type": "terms",
             "schema": "bucket",
             "params": {"field": field, "size": top,
                        "order": "desc", "orderBy": "1"}}
        ]
    }
    return {
        "type": "visualization",
        "id": vis_id,
        "attributes": {
            "title": title,
            "visState": json.dumps(vis_state),
            "uiStateJSON": "{}",
            "description": "",
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "index": INDEX_PATTERN_ID,
                    "query": {"language": "kuery", "query": query},
                    "filter": []
                })
            }
        },
        "references": [
            {"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
             "type": "index-pattern", "id": INDEX_PATTERN_ID}
        ]
    }

# ─────────────────────────────────────────────────────────────────────────────
# Helper: metric (big number)
# ─────────────────────────────────────────────────────────────────────────────
def make_metric(vis_id, title, query=GROUP_FILTER):
    vis_state = {
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
                "style": {"bgFill": "#000", "bgColor": False,
                           "labelColor": False, "subText": "",
                           "fontSize": 60}
            }
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count",
             "schema": "metric", "params": {}}
        ]
    }
    return {
        "type": "visualization",
        "id": vis_id,
        "attributes": {
            "title": title,
            "visState": json.dumps(vis_state),
            "uiStateJSON": "{}",
            "description": "",
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "index": INDEX_PATTERN_ID,
                    "query": {"language": "kuery", "query": query},
                    "filter": []
                })
            }
        },
        "references": [
            {"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
             "type": "index-pattern", "id": INDEX_PATTERN_ID}
        ]
    }

# ─────────────────────────────────────────────────────────────────────────────
# Helper: area/line timeline chart
# ─────────────────────────────────────────────────────────────────────────────
def make_timeline(vis_id, title, split_field=None, query=GROUP_FILTER):
    aggs = [
        {"id": "1", "enabled": True, "type": "count",
         "schema": "metric", "params": {}},
        {"id": "2", "enabled": True, "type": "date_histogram",
         "schema": "segment",
         "params": {"field": "timestamp", "interval": "auto",
                    "customInterval": "2h", "min_doc_count": 1,
                    "extended_bounds": {}}},
    ]
    if split_field:
        aggs.append({
            "id": "3", "enabled": True, "type": "terms",
            "schema": "group",
            "params": {"field": split_field, "size": 5,
                       "order": "desc", "orderBy": "1"}
        })

    vis_state = {
        "title": title,
        "type": "area",
        "params": {
            "type": "area",
            "grid": {"categoryLines": False, "style": {"color": "#eee"}},
            "categoryAxes": [{"id": "CategoryAxis-1", "type": "category",
                               "position": "bottom", "show": True,
                               "style": {}, "scale": {"type": "linear"},
                               "labels": {"show": True, "truncate": 100},
                               "title": {}}],
            "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1",
                            "type": "value", "position": "left",
                            "show": True, "style": {},
                            "scale": {"type": "linear", "mode": "normal"},
                            "labels": {"show": True, "rotate": 0,
                                       "filter": False, "truncate": 100},
                            "title": {"text": "Events"}}],
            "seriesParams": [{"show": True, "type": "area",
                               "mode": "stacked",
                               "data": {"label": "Count", "id": "1"},
                               "drawLinesBetweenPoints": True,
                               "showCircles": True,
                               "interpolate": "linear",
                               "valueAxis": "ValueAxis-1"}],
            "addTooltip": True,
            "addLegend": True,
            "legendPosition": "right",
            "times": [],
            "addTimeMarker": False
        },
        "aggs": aggs
    }
    return {
        "type": "visualization",
        "id": vis_id,
        "attributes": {
            "title": title,
            "visState": json.dumps(vis_state),
            "uiStateJSON": "{}",
            "description": "",
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "index": INDEX_PATTERN_ID,
                    "query": {"language": "kuery", "query": query},
                    "filter": []
                })
            }
        },
        "references": [
            {"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
             "type": "index-pattern", "id": INDEX_PATTERN_ID}
        ]
    }

# ─────────────────────────────────────────────────────────────────────────────
# Helper: data table
# ─────────────────────────────────────────────────────────────────────────────
def make_table(vis_id, title, fields_and_labels, query=GROUP_FILTER, top=20):
    aggs = [
        {"id": "1", "enabled": True, "type": "count",
         "schema": "metric", "params": {"customLabel": "Count"}},
    ]
    for i, (field, label) in enumerate(fields_and_labels):
        aggs.append({
            "id": str(i + 2),
            "enabled": True,
            "type": "terms",
            "schema": "bucket",
            "params": {"field": field, "size": top,
                       "order": "desc", "orderBy": "1",
                       "customLabel": label}
        })

    vis_state = {
        "title": title,
        "type": "table",
        "params": {
            "perPage": 20,
            "showPartialRows": False,
            "showMetricsAtAllLevels": False,
            "sort": {"columnIndex": None, "direction": None},
            "showTotal": False,
            "totalFunc": "sum"
        },
        "aggs": aggs
    }
    return {
        "type": "visualization",
        "id": vis_id,
        "attributes": {
            "title": title,
            "visState": json.dumps(vis_state),
            "uiStateJSON": '{"vis":{"params":{"sort":{"columnIndex":0,"direction":"desc"}}}}',
            "description": "",
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "index": INDEX_PATTERN_ID,
                    "query": {"language": "kuery", "query": query},
                    "filter": []
                })
            }
        },
        "references": [
            {"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
             "type": "index-pattern", "id": INDEX_PATTERN_ID}
        ]
    }

# ─────────────────────────────────────────────────────────────────────────────
# Build all visualizations
# ─────────────────────────────────────────────────────────────────────────────

DENY_QUERY    = f'{GROUP_FILTER} AND rule.id: (110011 OR 110012 OR 110013 OR 110014 OR 110015)'
UTM_QUERY     = f'{GROUP_FILTER} AND data.fgt_type: "utm"'
EVENT_QUERY   = f'{GROUP_FILTER} AND data.fgt_type: "event"'
CR_QUERY      = f'{GROUP_FILTER} AND rule.id: 110012'
CFG_QUERY     = f'{GROUP_FILTER} AND rule.id: (110035 OR 110036)'
ADMIN_QUERY   = f'{GROUP_FILTER} AND rule.id: (110031 OR 110032 OR 110033 OR 110034 OR 110035)'
SSL_QUERY     = f'{GROUP_FILTER} AND rule.id: (110023 OR 110024 OR 110025)'
TRAFFIC_QUERY = f'{GROUP_FILTER} AND data.fgt_type: "traffic"'

vis_objects = [

    # ── Panel 1: Traffic timeline split by action ──────────────────────────
    make_timeline(
        "fgt-wuh-traffic-timeline",
        "FortiGate WUH — Traffic Over Time (by Action)",
        split_field="data.action.keyword",
        query=TRAFFIC_QUERY
    ),

    # ── Panel 2: Deny events timeline ─────────────────────────────────────
    make_timeline(
        "fgt-wuh-deny-timeline",
        "FortiGate WUH — Denied Traffic Over Time",
        query=DENY_QUERY
    ),

    # ── Panel 3: Top denied source IPs ────────────────────────────────────
    make_table(
        "fgt-wuh-top-denied-src",
        "FortiGate WUH — Top Denied Source IPs",
        [
            ("data.srcip.keyword",     "Source IP"),
            ("data.dstip.keyword",     "Destination IP"),
            ("data.dstport.keyword",   "Dst Port"),
            ("data.service.keyword",   "Service"),
        ],
        query=DENY_QUERY
    ),

    # ── Panel 4: Traffic by policy ID ─────────────────────────────────────
    make_bar(
        "fgt-wuh-policy-bar",
        "FortiGate WUH — Traffic by Policy ID",
        "data.policyid",
        query=TRAFFIC_QUERY
    ),

    # ── Panel 5: Traffic by VLAN/interface ────────────────────────────────
    make_table(
        "fgt-wuh-vlan-flows",
        "FortiGate WUH — VLAN Traffic Flows (srcintf → dstintf)",
        [
            ("data.srcintf.keyword",     "Src VLAN"),
            ("data.dstintf.keyword",     "Dst VLAN"),
            ("data.action.keyword",      "Action"),
        ],
        query=TRAFFIC_QUERY
    ),

    # ── Panel 6: Destination countries (external traffic) ─────────────────
    make_pie(
        "fgt-wuh-dst-countries",
        "FortiGate WUH — Destination Countries",
        "data.dstcountry.keyword",
        query=TRAFFIC_QUERY
    ),

    # ── Panel 7: Client reputation (threat intel) blocks ──────────────────
    make_metric(
        "fgt-wuh-cr-blocks",
        "FortiGate WUH — Threat Intel Blocks (crlevel=high)",
        query=CR_QUERY
    ),

    # ── Panel 8: Top CR-blocked IPs ───────────────────────────────────────
    make_table(
        "fgt-wuh-cr-top-ips",
        "FortiGate WUH — Top Threat Intel Blocked IPs",
        [
            ("data.srcip.keyword",    "Source IP"),
            ("data.dstip.keyword",    "Destination IP"),
            ("data.dstcountry.keyword", "Dst Country"),
            ("data.service.keyword",  "Service"),
        ],
        query=CR_QUERY
    ),

    # ── Panel 9: UTM events by subtype ────────────────────────────────────
    make_pie(
        "fgt-wuh-utm-subtypes",
        "FortiGate WUH — UTM Events by Subtype",
        "data.fgt_subtype.keyword",
        query=UTM_QUERY
    ),

    # ── Panel 10: Top applications (app-ctrl DPI) ─────────────────────────
    make_bar(
        "fgt-wuh-top-apps",
        "FortiGate WUH — Top Applications (App-Ctrl)",
        "data.app.keyword",
        query=f'{GROUP_FILTER} AND data.fgt_subtype: "app-ctrl"',
        top=20
    ),

    # ── Panel 11: App risk distribution ───────────────────────────────────
    make_pie(
        "fgt-wuh-apprisk",
        "FortiGate WUH — Application Risk Levels",
        "data.apprisk.keyword",
        query=UTM_QUERY
    ),

    # ── Panel 12: SSL anomalies timeline ──────────────────────────────────
    make_timeline(
        "fgt-wuh-ssl-timeline",
        "FortiGate WUH — SSL Certificate Anomalies Over Time",
        query=SSL_QUERY
    ),

    # ── Panel 13: SSL anomaly sources ─────────────────────────────────────
    make_table(
        "fgt-wuh-ssl-sources",
        "FortiGate WUH — SSL Anomaly Sources",
        [
            ("data.srcip.keyword",       "Source IP"),
            ("data.sni.keyword",         "SNI"),
            ("data.tlsver.keyword",      "TLS Version"),
            ("data.eventsubtype.keyword","Event Subtype"),
        ],
        query=SSL_QUERY
    ),

    # ── Panel 14: Admin/user events ───────────────────────────────────────
    make_timeline(
        "fgt-wuh-admin-timeline",
        "FortiGate WUH — Admin & Auth Events Over Time",
        split_field="rule.description.keyword",
        query=ADMIN_QUERY
    ),

    # ── Panel 15: Admin events table ──────────────────────────────────────
    make_table(
        "fgt-wuh-admin-events",
        "FortiGate WUH — Admin Events Detail",
        [
            ("data.username.keyword",   "Username"),
            ("data.srcip.keyword",      "Source IP"),
            ("rule.description.keyword","Event Description"),
            ("data.state.keyword",      "State"),
        ],
        query=ADMIN_QUERY
    ),

    # ── Panel 16: Configuration changes ──────────────────────────────────
    make_metric(
        "fgt-wuh-config-changes",
        "FortiGate WUH — Config Changes (24h)",
        query=CFG_QUERY
    ),

    # ── Panel 17: Alert level distribution ────────────────────────────────
    make_pie(
        "fgt-wuh-alert-levels",
        "FortiGate WUH — Alert Level Distribution",
        "rule.level",
        query=GROUP_FILTER
    ),

    # ── Panel 18: Rule ID distribution ────────────────────────────────────
    make_table(
        "fgt-wuh-rule-counts",
        "FortiGate WUH — Events by Rule",
        [
            ("rule.id.keyword",          "Rule ID"),
            ("rule.description.keyword", "Description"),
        ],
        query=GROUP_FILTER
    ),
]

# ─────────────────────────────────────────────────────────────────────────────
# Dashboard layout  (18 panels, 4 per row)
# ─────────────────────────────────────────────────────────────────────────────
panel_ids = [v["id"] for v in vis_objects]

panels = []
cols = 4
panel_w = 24 // cols   # 6 wide each
panel_h = 8

for i, vid in enumerate(panel_ids):
    row = i // cols
    col = i %  cols
    panels.append({
        "panelIndex": str(i + 1),
        "gridData": {
            "x": col * panel_w,
            "y": row * panel_h,
            "w": panel_w,
            "h": panel_h,
            "i": str(i + 1)
        },
        "version": "7.10.2",
        "type": "visualization",
        "id": vid
    })

obj_dashboard = {
    "type": "dashboard",
    "id": "fortigate-wuh-security-overview",
    "attributes": {
        "title": "FortiGate WUH — Security Overview",
        "description": "FW-WUH01 + FW-WUH02 FortiOS 7.x traffic, UTM, and event monitoring",
        "panelsJSON": json.dumps(panels),
        "optionsJSON": json.dumps({
            "darkTheme": False,
            "useMargins": True,
            "hidePanelTitles": False
        }),
        "timeRestore": True,
        "timeTo": "now",
        "timeFrom": "now-24h",
        "refreshInterval": {"pause": False, "value": 300000},
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps({
                "query": {"language": "kuery", "query": ""},
                "filter": []
            })
        }
    },
    "references": [
        {"name": f"panel_{i + 1}", "type": "visualization", "id": vid}
        for i, vid in enumerate(panel_ids)
    ]
}

# ─────────────────────────────────────────────────────────────────────────────
# Write NDJSON
# ─────────────────────────────────────────────────────────────────────────────
out_path = os.path.join(REPO_ROOT, "visualizations", "fortigate", "fortigate-wuh-dashboard.ndjson")

all_objects = [obj_index, obj_search] + vis_objects + [obj_dashboard]

with open(out_path, "w", encoding="utf-8") as f:
    for obj in all_objects:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

print(f"[OK] Written {len(all_objects)} saved objects → {out_path}")
print()
print("Import via Wazuh Dashboard UI:")
print("  Stack Management → Saved Objects → Import → select fortigate-wuh-dashboard.ndjson")
print()
print("Dashboard: 'FortiGate WUH — Security Overview'")
print(f"Panels   : {len(vis_objects)}")
print("Time range: last 24 hours, auto-refresh every 5 min")
