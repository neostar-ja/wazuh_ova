#!/usr/bin/env python3
"""
FortiGate WUH Advanced Dashboard Generator
Devices: FW-WUH01 + FW-WUH02
Output : fortigate-wuh-advanced-dashboard.ndjson

Layout (เลียนแบบ Huawei USG Advanced Dashboard):
  Row 1 (4×12): Events by Rule | Top Source | Top Dest | Top Policy
  Row 2 (3×16): Top Source Deny | Top Dest Deny | Top Protocol
  Row 3 (3×16): Top Application | App Risk | Traffic Action
  Row 4 (2×24): Source Interface | Dest Countries
  Row 5 (2×24): Traffic Timeline | Deny Timeline
  Row 6 (2×24): Admin Timeline | UTM Timeline
  Row 7 (1×48): Event Table (saved search)

Usage:
  python3 generate_fortigate_advanced_dashboard.py
  # Import via Wazuh Dashboard → Stack Management → Saved Objects → Import
"""

import json
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

INDEX_PATTERN_ID = "wazuh-alerts-fortigate-adv"
GROUP_FILTER     = '(rule.groups: "fortigate" OR decoder.name: "fortigate-firewall-v5")'
TRAFFIC_QUERY    = f'{GROUP_FILTER} AND (data.type: "traffic" OR data.fgt_type: "traffic")'
DENY_QUERY       = (
    f'{TRAFFIC_QUERY} AND '
    '(data.action: "deny" OR data.fgt_action: "deny")'
)
UTM_QUERY        = f'{GROUP_FILTER} AND (data.type: "utm" OR data.fgt_type: "utm")'
APP_CTRL_QUERY   = (
    f'{UTM_QUERY} AND '
    '(data.subtype: "app-ctrl" OR data.fgt_subtype: "app-ctrl")'
)
ADMIN_QUERY      = f'{GROUP_FILTER} AND rule.id: (110031 OR 110032 OR 110033 OR 110034 OR 110035)'

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
# Saved Search: Event Table (เหมือน Huawei USG pattern)
# ─────────────────────────────────────────────────────────────────────────────
SEARCH_ID = "fortigate-wuh-adv-events"

obj_search = {
    "type": "search",
    "id": SEARCH_ID,
    "attributes": {
        "title": "FortiGate WUH — Events Table",
        "description": "All FortiGate FW-WUH01/FW-WUH02 decoded alerts with full fields",
        "columns": [
            "timestamp",
            "rule.id",
            "rule.level",
            "rule.description",
            "data.type",
            "data.subtype",
            "data.action",
            "data.srcip",
            "data.srcport",
            "data.dstip",
            "data.dstport",
            "data.service",
            "data.app",
            "data.policyid",
            "data.srcintf",
            "data.dstintf",
            "data.srccountry",
            "data.dstcountry",
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
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _vis_base(vis_id, title, vis_state, query):
    return {
        "type": "visualization",
        "id": vis_id,
        "attributes": {
            "title": title,
            "visState": json.dumps(vis_state),
            "uiStateJSON": "{}",
            "description": "",
            "version": 1,
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
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "segment",
             "params": {"field": field, "size": top, "order": "desc", "orderBy": "1"}}
        ]
    }
    return _vis_base(vis_id, title, vis_state, query)


def make_histogram(vis_id, title, field, query=GROUP_FILTER, top=10, y_label="Events"):
    """Vertical bar chart (histogram) — ใช้สำหรับ Top-N ranking"""
    vis_state = {
        "title": title,
        "type": "histogram",
        "params": {
            "type": "histogram",
            "grid": {"categoryLines": False},
            "categoryAxes": [{
                "id": "CategoryAxis-1", "type": "category", "position": "bottom",
                "show": True, "style": {}, "scale": {"type": "linear"},
                "labels": {"show": True, "truncate": 100}, "title": {}
            }],
            "valueAxes": [{
                "id": "ValueAxis-1", "name": "LeftAxis-1", "type": "value",
                "position": "left", "show": True, "style": {},
                "scale": {"type": "linear", "mode": "normal"},
                "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100},
                "title": {"text": y_label}
            }],
            "seriesParams": [{
                "show": True, "type": "histogram", "mode": "stacked",
                "data": {"label": "Count", "id": "1"},
                "valueAxis": "ValueAxis-1",
                "drawLinesBetweenPoints": True, "showCircles": True
            }],
            "addTooltip": True,
            "addLegend": False,
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "segment",
             "params": {"field": field, "size": top, "order": "desc", "orderBy": "1"}}
        ]
    }
    return _vis_base(vis_id, title, vis_state, query)


def make_timeline(vis_id, title, split_field=None, query=GROUP_FILTER, split_top=5):
    aggs = [
        {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
        {"id": "2", "enabled": True, "type": "date_histogram", "schema": "segment",
         "params": {"field": "timestamp", "interval": "auto",
                    "customInterval": "2h", "min_doc_count": 1, "extended_bounds": {}}},
    ]
    if split_field:
        aggs.append({
            "id": "3", "enabled": True, "type": "terms", "schema": "group",
            "params": {"field": split_field, "size": split_top,
                       "order": "desc", "orderBy": "1"}
        })
    vis_state = {
        "title": title,
        "type": "area",
        "params": {
            "type": "area",
            "grid": {"categoryLines": False, "style": {"color": "#eee"}},
            "categoryAxes": [{
                "id": "CategoryAxis-1", "type": "category", "position": "bottom",
                "show": True, "style": {}, "scale": {"type": "linear"},
                "labels": {"show": True, "truncate": 100}, "title": {}
            }],
            "valueAxes": [{
                "id": "ValueAxis-1", "name": "LeftAxis-1", "type": "value",
                "position": "left", "show": True, "style": {},
                "scale": {"type": "linear", "mode": "normal"},
                "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100},
                "title": {"text": "Events"}
            }],
            "seriesParams": [{
                "show": True, "type": "area", "mode": "stacked",
                "data": {"label": "Count", "id": "1"},
                "drawLinesBetweenPoints": True, "showCircles": True,
                "interpolate": "linear", "valueAxis": "ValueAxis-1"
            }],
            "addTooltip": True,
            "addLegend": True,
            "legendPosition": "right",
            "times": [],
            "addTimeMarker": False
        },
        "aggs": aggs
    }
    return _vis_base(vis_id, title, vis_state, query)


# ─────────────────────────────────────────────────────────────────────────────
# Build Visualizations
# ─────────────────────────────────────────────────────────────────────────────
vis_objects = [

    # ── Row 1: Traffic Overview (4 × 12 wide) ────────────────────────────────

    # Panel 1: Events by Rule (Donut)
    make_pie(
        "fgt-adv-events-by-rule",
        "FortiGate — Events by Rule",
        "rule.id",
        query=GROUP_FILTER, top=10
    ),

    # Panel 2: Top Source IPs (Histogram)
    make_histogram(
        "fgt-adv-top-source",
        "FortiGate — Top Source IPs",
        "data.srcip",
        query=TRAFFIC_QUERY, top=10
    ),

    # Panel 3: Top Destination IPs (Histogram)
    make_histogram(
        "fgt-adv-top-dest",
        "FortiGate — Top Destination IPs",
        "data.dstip",
        query=TRAFFIC_QUERY, top=10
    ),

    # Panel 4: Top Policy IDs (Donut)
    # Note: FortiGate logs include policyid (numeric) but not policyname
    make_pie(
        "fgt-adv-top-policy",
        "FortiGate — Top Policy IDs",
        "data.policyid",
        query=TRAFFIC_QUERY, top=10
    ),

    # ── Row 2: Deny Analysis (3 × 16 wide) ───────────────────────────────────

    # Panel 5: Top Source Deny (Histogram)
    make_histogram(
        "fgt-adv-top-src-deny",
        "FortiGate — Top Source Deny",
        "data.srcip",
        query=DENY_QUERY, top=10,
        y_label="Denied Events"
    ),

    # Panel 6: Top Dest Deny (Histogram)
    make_histogram(
        "fgt-adv-top-dst-deny",
        "FortiGate — Top Dest Deny",
        "data.dstip",
        query=DENY_QUERY, top=10,
        y_label="Denied Events"
    ),

    # Panel 7: Top Protocol/Service (Donut)
    make_pie(
        "fgt-adv-top-protocol",
        "FortiGate — Top Protocol (Service)",
        "data.service",
        query=TRAFFIC_QUERY, top=12
    ),

    # ── Row 3: Application & Action (3 × 16 wide) ────────────────────────────

    # Panel 8: Top Applications (Donut)
    make_pie(
        "fgt-adv-top-app",
        "FortiGate — Top Applications",
        "data.app",
        query=APP_CTRL_QUERY, top=12
    ),

    # Panel 9: App Risk Distribution (Donut)
    make_pie(
        "fgt-adv-app-risk",
        "FortiGate — App Risk Distribution",
        "data.apprisk",
        query=UTM_QUERY, top=5
    ),

    # Panel 10: Traffic Action Split (Donut)
    make_pie(
        "fgt-adv-action-split",
        "FortiGate — Traffic Action Split",
        "data.action",
        query=TRAFFIC_QUERY, top=8
    ),

    # ── Row 4: Network Context (2 × 24 wide) ─────────────────────────────────

    # Panel 11: Source Interface / VLAN (Donut)
    make_pie(
        "fgt-adv-src-intf",
        "FortiGate — Source Interface (VLAN)",
        "data.srcintf",
        query=TRAFFIC_QUERY, top=12
    ),

    # Panel 12: Destination Countries (Donut)
    make_pie(
        "fgt-adv-dst-country",
        "FortiGate — Destination Countries",
        "data.dstcountry",
        query=TRAFFIC_QUERY, top=12
    ),

    # ── Row 5: Timelines (2 × 24 wide) ───────────────────────────────────────

    # Panel 13: Traffic Over Time split by Action
    make_timeline(
        "fgt-adv-traffic-timeline",
        "FortiGate — Traffic Over Time (by Action)",
        split_field="data.action",
        query=TRAFFIC_QUERY, split_top=5
    ),

    # Panel 14: Denied Traffic Over Time
    make_timeline(
        "fgt-adv-deny-timeline",
        "FortiGate — Denied Traffic Over Time",
        query=DENY_QUERY
    ),

    # ── Row 6: Security Events (2 × 24 wide) ─────────────────────────────────

    # Panel 15: Admin & Auth Events Timeline
    make_timeline(
        "fgt-adv-admin-timeline",
        "FortiGate — Admin & Auth Events Timeline",
        split_field="rule.description",
        query=ADMIN_QUERY, split_top=5
    ),

    # Panel 16: UTM Events Timeline split by subtype
    make_timeline(
        "fgt-adv-utm-timeline",
        "FortiGate — UTM Events Timeline",
        split_field="data.subtype",
        query=UTM_QUERY, split_top=5
    ),
]

# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Layout
# ─────────────────────────────────────────────────────────────────────────────
# Grid: 48 units wide
# Row 1: panels 1-4   → 4 × w=12, h=10, y=0
# Row 2: panels 5-7   → 3 × w=16, h=10, y=10
# Row 3: panels 8-10  → 3 × w=16, h=10, y=20
# Row 4: panels 11-12 → 2 × w=24, h=10, y=30
# Row 5: panels 13-14 → 2 × w=24, h=12, y=40
# Row 6: panels 15-16 → 2 × w=24, h=10, y=52
# Row 7: event table  → 1 × w=48, h=20, y=62

PANEL_VERSION = "2.19.5"

panels = []
refs   = []

def add_panel(idx, obj_type, obj_id, x, y, w, h):
    n = str(idx)
    panels.append({
        "version": PANEL_VERSION,
        "gridData": {"x": x, "y": y, "w": w, "h": h, "i": n},
        "panelIndex": n,
        "embeddableConfig": {},
        "panelRefName": f"panel_{n}"
    })
    refs.append({"name": f"panel_{n}", "type": obj_type, "id": obj_id})

# Row 1 — 4 × 12
for i, vis in enumerate(vis_objects[0:4]):
    add_panel(i+1, "visualization", vis["id"], x=i*12, y=0, w=12, h=10)

# Row 2 — 3 × 16
for i, vis in enumerate(vis_objects[4:7]):
    add_panel(i+5, "visualization", vis["id"], x=i*16, y=10, w=16, h=10)

# Row 3 — 3 × 16
for i, vis in enumerate(vis_objects[7:10]):
    add_panel(i+8, "visualization", vis["id"], x=i*16, y=20, w=16, h=10)

# Row 4 — 2 × 24
for i, vis in enumerate(vis_objects[10:12]):
    add_panel(i+11, "visualization", vis["id"], x=i*24, y=30, w=24, h=10)

# Row 5 — 2 × 24
for i, vis in enumerate(vis_objects[12:14]):
    add_panel(i+13, "visualization", vis["id"], x=i*24, y=40, w=24, h=12)

# Row 6 — 2 × 24
for i, vis in enumerate(vis_objects[14:16]):
    add_panel(i+15, "visualization", vis["id"], x=i*24, y=52, w=24, h=10)

# Row 7 — Event Table full width
add_panel(17, "search", SEARCH_ID, x=0, y=62, w=48, h=20)

obj_dashboard = {
    "type": "dashboard",
    "id": "fortigate-wuh-advanced-dashboard",
    "attributes": {
        "title": "FortiGate WUH — Advanced Dashboard",
        "description": (
            "FW-WUH01 + FW-WUH02 | Top Source/Dest/Policy, Deny Analysis, "
            "Protocol, Application, Timeline & Event Table"
        ),
        "panelsJSON": json.dumps(panels),
        "optionsJSON": json.dumps({
            "useMargins": True,
            "hidePanelTitles": False
        }),
        "version": 1,
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
    "references": refs
}

# ─────────────────────────────────────────────────────────────────────────────
# Write NDJSON
# ─────────────────────────────────────────────────────────────────────────────
out_path = os.path.join(
    REPO_ROOT,
    "visualizations",
    "fortigate",
    "fortigate-wuh-advanced-dashboard.ndjson",
)

all_objects = [obj_index, obj_search] + vis_objects + [obj_dashboard]

with open(out_path, "w", encoding="utf-8") as f:
    for obj in all_objects:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

print(f"[OK] Written {len(all_objects)} saved objects → {out_path}")
print()
print("Objects:")
for o in all_objects:
    print(f"  {o['type']:18s} {o['id']}")
print()
print("Dashboard: 'FortiGate WUH — Advanced Dashboard'")
print(f"Panels   : {len(panels)} (16 visualizations + 1 event table)")
print("Time range: last 24 hours, auto-refresh every 5 min")
print()
print("Import via:")
print("  Wazuh Dashboard → Stack Management → Saved Objects → Import")
print("  → select fortigate-wuh-advanced-dashboard.ndjson")
