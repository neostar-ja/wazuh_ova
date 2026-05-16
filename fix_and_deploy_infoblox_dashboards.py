#!/usr/bin/env python3
"""
Infoblox Dashboard Fix & Deploy Script
- แก้ไข "Could not locate that index-pattern-field" ใน all visualizations
- สร้าง dashboard เพิ่มเติม: DNS Security + DHCP Asset Tracker
- ใช้ field.keyword สำหรับ terms aggregations ทั้งหมด
"""
import json
import urllib.request
import urllib.error
import ssl
import base64
import sys

OSD_HOST = "https://10.251.151.14"
OSD_USER = "admin"
OSD_PASS = "admin"
INDEX_PATTERN = "wazuh-alerts-*"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def api(method, path, body=None):
    url = f"{OSD_HOST}{path}"
    data = json.dumps(body).encode() if body else None
    headers = {
        "Content-Type": "application/json",
        "osd-xsrf": "true",
        "Authorization": "Basic " + base64.b64encode(f"{OSD_USER}:{OSD_PASS}".encode()).decode()
    }
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  HTTP {e.code}: {body[:200]}")
        return None

def upsert(obj_type, obj_id, attrs, refs=None, overwrite=True):
    payload = {"attributes": attrs}
    if refs:
        payload["references"] = refs
    result = api("POST",
        f"/api/saved_objects/{obj_type}/{obj_id}?overwrite={str(overwrite).lower()}",
        payload)
    if result:
        print(f"  OK  {obj_type}/{obj_id}")
    else:
        print(f"  ERR {obj_type}/{obj_id}")
    return result

def make_pie(vis_id, title, field, size=10, filter_query="rule.groups: \"infoblox\""):
    vis_state = {
        "title": title,
        "type": "pie",
        "params": {
            "addTooltip": True, "addLegend": True,
            "legendPosition": "right", "isDonut": True
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "segment",
             "params": {"field": field, "size": size, "order": "desc", "orderBy": "1"}}
        ]
    }
    attrs = {
        "title": title,
        "visState": json.dumps(vis_state),
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps({
                "index": INDEX_PATTERN,
                "query": {"language": "kuery", "query": filter_query},
                "filter": []
            })
        }
    }
    refs = [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
             "type": "index-pattern", "id": INDEX_PATTERN}]
    return upsert("visualization", vis_id, attrs, refs)

def make_hbar(vis_id, title, field, size=15, filter_query="rule.groups: \"infoblox\""):
    vis_state = {
        "title": title,
        "type": "horizontal_bar",
        "params": {
            "type": "histogram",
            "grid": {"categoryLines": False},
            "categoryAxes": [{"id": "CategoryAxis-1", "type": "category", "position": "left",
                              "show": True, "style": {}, "scale": {"type": "linear"},
                              "labels": {"show": True, "truncate": 150}, "title": {}}],
            "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1", "type": "value",
                           "position": "bottom", "show": True, "style": {},
                           "scale": {"type": "linear", "mode": "normal"},
                           "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100},
                           "title": {"text": "Count"}}],
            "seriesParams": [{"show": True, "type": "histogram", "mode": "stacked",
                              "data": {"label": "Count", "id": "1"}, "valueAxis": "ValueAxis-1"}],
            "addTooltip": True, "addLegend": False
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "segment",
             "params": {"field": field, "size": size, "order": "desc", "orderBy": "1"}}
        ]
    }
    attrs = {
        "title": title,
        "visState": json.dumps(vis_state),
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps({
                "index": INDEX_PATTERN,
                "query": {"language": "kuery", "query": filter_query},
                "filter": []
            })
        }
    }
    refs = [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
             "type": "index-pattern", "id": INDEX_PATTERN}]
    return upsert("visualization", vis_id, attrs, refs)

def make_metric(vis_id, title, filter_query):
    vis_state = {
        "title": title,
        "type": "metric",
        "params": {
            "addTooltip": True, "addLegend": False, "type": "metric",
            "metric": {"percentageMode": False, "useRanges": False, "colorSchema": "Green to Red",
                       "metricColorMode": "None", "colorsRange": [{"from": 0, "to": 10000}],
                       "labels": {"show": True}, "invertColors": False,
                       "style": {"bgFill": "#000", "bgColor": False, "labelColor": False,
                                 "subText": "", "fontSize": 60}}
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}}
        ]
    }
    attrs = {
        "title": title,
        "visState": json.dumps(vis_state),
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps({
                "index": INDEX_PATTERN,
                "query": {"language": "kuery", "query": filter_query},
                "filter": []
            })
        }
    }
    refs = [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
             "type": "index-pattern", "id": INDEX_PATTERN}]
    return upsert("visualization", vis_id, attrs, refs)

def make_timeline(vis_id, title, filter_query):
    vis_state = {
        "title": title,
        "type": "line",
        "params": {
            "type": "line",
            "grid": {"categoryLines": False},
            "categoryAxes": [{"id": "CategoryAxis-1", "type": "category", "position": "bottom",
                              "show": True, "style": {}, "scale": {"type": "linear"},
                              "labels": {"show": True, "truncate": 100}, "title": {}}],
            "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1", "type": "value",
                           "position": "left", "show": True, "style": {},
                           "scale": {"type": "linear", "mode": "normal"},
                           "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100},
                           "title": {"text": "Events"}}],
            "seriesParams": [{"show": True, "type": "line", "mode": "normal",
                              "data": {"label": "Count", "id": "1"}, "lineWidth": 2,
                              "interpolate": "linear", "showCircles": True,
                              "valueAxis": "ValueAxis-1"}],
            "addTooltip": True, "addLegend": True
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {"id": "2", "enabled": True, "type": "date_histogram", "schema": "segment",
             "params": {"field": "@timestamp", "interval": "auto", "min_doc_count": 1,
                        "extended_bounds": {}}}
        ]
    }
    attrs = {
        "title": title,
        "visState": json.dumps(vis_state),
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps({
                "index": INDEX_PATTERN,
                "query": {"language": "kuery", "query": filter_query},
                "filter": []
            })
        }
    }
    refs = [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
             "type": "index-pattern", "id": INDEX_PATTERN}]
    return upsert("visualization", vis_id, attrs, refs)

def make_search(search_id, title, desc, columns, filter_query):
    attrs = {
        "title": title,
        "description": desc,
        "columns": columns,
        "sort": [["@timestamp", "desc"]],
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps({
                "index": INDEX_PATTERN,
                "query": {"language": "kuery", "query": filter_query},
                "filter": [],
                "highlight": {"pre_tags": ["@kibana-highlighted-field@"],
                              "post_tags": ["@/kibana-highlighted-field@"],
                              "fields": {"*": {}}, "require_field_match": False,
                              "fragment_size": 2147483647}
            })
        }
    }
    refs = [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
             "type": "index-pattern", "id": INDEX_PATTERN}]
    return upsert("search", search_id, attrs, refs)

def make_dashboard(dash_id, title, desc, panels, query=""):
    panels_json = []
    for i, (panel_id, obj_type, x, y, w, h) in enumerate(panels):
        panels_json.append({
            "version": "2.19.5",
            "gridData": {"x": x, "y": y, "w": w, "h": h, "i": str(i+1)},
            "panelIndex": str(i+1),
            "embeddableConfig": {},
            "panelRefName": f"panel_{i+1}"
        })
    refs = []
    for i, (panel_id, obj_type, x, y, w, h) in enumerate(panels):
        refs.append({"name": f"panel_{i+1}", "type": obj_type, "id": panel_id})
    refs.append({"name": "kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index",
                 "type": "index-pattern", "id": INDEX_PATTERN})

    attrs = {
        "title": title,
        "description": desc,
        "timeRestore": False,
        "optionsJSON": json.dumps({"useMargins": True, "hidePanelTitles": False}),
        "panelsJSON": json.dumps(panels_json),
        "version": 1,
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps({
                "query": {"language": "kuery", "query": query},
                "filter": []
            })
        }
    }
    return upsert("dashboard", dash_id, attrs, refs)

print("=" * 60)
print("Infoblox Dashboard Fix & Deploy")
print("=" * 60)

# ===== STEP 1: Fix existing visualizations (use .keyword fields) =====
print("\n[1] Fixing existing visualizations (adding .keyword)...")

make_pie("infoblox-dns-types",
         "Infoblox DNS - Top Query Record Types",
         "data.dns_type.keyword",
         filter_query='rule.groups: "infoblox_dns"')

make_hbar("infoblox-dhcp-actions",
          "Infoblox DHCP - Lease Lifecycle Operations",
          "data.dhcp_action.keyword",
          filter_query='rule.groups: "infoblox_dhcp"')

make_hbar("infoblox-dhcp-hostnames",
          "Infoblox DHCP - Top Client Hostnames",
          "data.dhcp_hostname.keyword",
          size=20,
          filter_query='rule.groups: "infoblox_dhcp"')

make_hbar("infoblox-dns-domains",
          "Infoblox DNS - Top Queried Domains",
          "data.dns_domain.keyword",
          size=20,
          filter_query='rule.groups: "infoblox_dns"')

make_hbar("infoblox-dns-clients",
          "Infoblox DNS - Top Querying Clients",
          "data.srcip.keyword",
          filter_query='rule.groups: "infoblox_dns"')

make_hbar("infoblox-rule-breakdown",
          "Infoblox DDI - Events by Rule ID",
          "rule.id.keyword",
          filter_query='rule.groups: "infoblox"')

# Fix saved search to use correct index
make_search("infoblox-events-search",
            "Infoblox DDI - DNS & DHCP Events",
            "Live raw transaction log for DNS queries and DHCP lease events",
            ["timestamp", "rule.id", "rule.description", "data.srcip",
             "data.dns_domain", "data.dns_type", "data.dhcp_action",
             "data.dhcp_ip", "data.dhcp_mac", "data.dhcp_hostname"],
            'rule.groups: "infoblox"')

# ===== STEP 2: Update main dashboard =====
print("\n[2] Updating Infoblox DDI main dashboard...")

make_dashboard(
    "infoblox-ddi-main-dashboard",
    "Infoblox DDI - DNS & DHCP Monitoring Dashboard",
    "Comprehensive real-time analytics for recursive DNS queries and ISC lease operations",
    [
        ("infoblox-dns-types",       "visualization", 0,  0,  16, 11),
        ("infoblox-dhcp-actions",    "visualization", 16, 0,  16, 11),
        ("infoblox-dhcp-hostnames",  "visualization", 32, 0,  16, 11),
        ("infoblox-dns-domains",     "visualization", 0,  11, 24, 13),
        ("infoblox-dns-clients",     "visualization", 24, 11, 24, 13),
        ("infoblox-rule-breakdown",  "visualization", 0,  24, 48, 11),
        ("infoblox-events-search",   "search",        0,  35, 48, 20),
    ],
    query='rule.groups: "infoblox"'
)

# ===== STEP 3: Create DNS Security Dashboard =====
print("\n[3] Creating DNS Security Dashboard...")

make_metric("infoblox-dns-sec-rpz-count",
            "Infoblox RPZ Blocks (Total)",
            'rule.groups: "rpz_block"')

make_metric("infoblox-dns-sec-nxdomain-count",
            "Infoblox NXDOMAIN Events",
            'rule.groups: "dns_nxdomain"')

make_metric("infoblox-dns-sec-axfr-count",
            "Zone Transfer Attempts",
            'rule.id: "100402" OR rule.id: "100403"')

make_hbar("infoblox-dns-sec-rpz-clients",
          "DNS Security - Top Blocked Clients (RPZ)",
          "data.srcip.keyword",
          size=15,
          filter_query='rule.groups: "rpz_block"')

make_hbar("infoblox-dns-sec-rpz-domains",
          "DNS Security - Top Blocked Domains",
          "data.dns_domain.keyword",
          size=15,
          filter_query='rule.groups: "rpz_block"')

make_hbar("infoblox-dns-sec-nxdomain-clients",
          "DNS Security - Top NXDOMAIN Sources (Possible DGA)",
          "data.srcip.keyword",
          size=15,
          filter_query='rule.groups: "dns_nxdomain"')

make_timeline("infoblox-dns-sec-timeline",
              "DNS Security - Threat Events Over Time",
              'rule.groups: "infoblox_threat" OR rule.groups: "dns_nxdomain" OR rule.id: "100402"')

make_search("infoblox-dns-sec-events",
            "Infoblox DNS Security - Threat Events",
            "RPZ blocks, NXDOMAIN floods, Zone Transfer attempts, Query denials",
            ["timestamp", "rule.id", "rule.level", "rule.description",
             "data.srcip", "data.dns_domain", "data.dns_type", "rule.mitre.id"],
            'rule.groups: "infoblox_threat" OR rule.groups: "dns_nxdomain" OR '
            'rule.id: "100402" OR rule.id: "100403" OR rule.id: "100406"')

make_dashboard(
    "infoblox-dns-security-dashboard",
    "Infoblox DDI - DNS Security & Threat Dashboard",
    "RPZ Firewall blocks, NXDOMAIN flood detection, Zone Transfer monitoring, and DNS anomalies",
    [
        ("infoblox-dns-sec-rpz-count",      "visualization", 0,  0,  16, 8),
        ("infoblox-dns-sec-nxdomain-count",  "visualization", 16, 0,  16, 8),
        ("infoblox-dns-sec-axfr-count",      "visualization", 32, 0,  16, 8),
        ("infoblox-dns-sec-timeline",        "visualization", 0,  8,  48, 12),
        ("infoblox-dns-sec-rpz-clients",     "visualization", 0,  20, 24, 14),
        ("infoblox-dns-sec-rpz-domains",     "visualization", 24, 20, 24, 14),
        ("infoblox-dns-sec-nxdomain-clients","visualization", 0,  34, 48, 11),
        ("infoblox-dns-sec-events",          "search",        0,  45, 48, 20),
    ],
    query='rule.groups: "infoblox_dns"'
)

# ===== STEP 4: Create DHCP Asset Tracker Dashboard =====
print("\n[4] Creating DHCP Asset Tracker Dashboard...")

make_metric("infoblox-dhcp-asset-leases",
            "Active Leases (DHCPACK)",
            'rule.id: "100411"')

make_metric("infoblox-dhcp-asset-new",
            "New Devices (DHCPDISCOVER)",
            'rule.id: "100413"')

make_metric("infoblox-dhcp-asset-conflict",
            "IP Conflicts (DHCPDECLINE)",
            'rule.id: "100417"')

make_hbar("infoblox-dhcp-asset-mac",
          "DHCP Asset - Top Active MAC Addresses",
          "data.dhcp_mac.keyword",
          size=20,
          filter_query='rule.id: "100411"')

make_hbar("infoblox-dhcp-asset-hostname",
          "DHCP Asset - Top Client Hostnames",
          "data.dhcp_hostname.keyword",
          size=20,
          filter_query='rule.groups: "infoblox_dhcp"')

make_hbar("infoblox-dhcp-asset-network",
          "DHCP Asset - Top Leased IP Subnets",
          "data.dhcp_interface.keyword",
          size=15,
          filter_query='rule.id: "100411"')

make_hbar("infoblox-dhcp-asset-ip",
          "DHCP Asset - Top Leased IPs",
          "data.dhcp_ip.keyword",
          size=20,
          filter_query='rule.id: "100411"')

make_timeline("infoblox-dhcp-asset-timeline",
              "DHCP Asset - Lease Activity Over Time",
              'rule.groups: "infoblox_dhcp"')

make_search("infoblox-dhcp-asset-search",
            "Infoblox DHCP - Asset Lease Log",
            "Full DHCP lifecycle: IP assignments, renewals, releases, conflicts",
            ["timestamp", "data.dhcp_action", "data.dhcp_ip", "data.dhcp_mac",
             "data.dhcp_hostname", "data.dhcp_interface", "rule.level", "rule.description"],
            'rule.groups: "infoblox_dhcp"')

make_dashboard(
    "infoblox-dhcp-asset-dashboard",
    "Infoblox DDI - DHCP Asset Tracker Dashboard",
    "Track IP-to-MAC assignments, hostname mapping, new device detection, and IP conflicts",
    [
        ("infoblox-dhcp-asset-leases",   "visualization", 0,  0,  16, 8),
        ("infoblox-dhcp-asset-new",      "visualization", 16, 0,  16, 8),
        ("infoblox-dhcp-asset-conflict", "visualization", 32, 0,  16, 8),
        ("infoblox-dhcp-asset-timeline", "visualization", 0,  8,  48, 12),
        ("infoblox-dhcp-asset-mac",      "visualization", 0,  20, 24, 14),
        ("infoblox-dhcp-asset-hostname", "visualization", 24, 20, 24, 14),
        ("infoblox-dhcp-asset-ip",       "visualization", 0,  34, 24, 13),
        ("infoblox-dhcp-asset-network",  "visualization", 24, 34, 24, 13),
        ("infoblox-dhcp-asset-search",   "search",        0,  47, 48, 20),
    ],
    query='rule.groups: "infoblox_dhcp"'
)

print("\n" + "=" * 60)
print("Done! Dashboard deploy complete.")
print("=" * 60)
print("\nDashboards available:")
print("  - Infoblox DDI - DNS & DHCP Monitoring Dashboard (fixed)")
print("  - Infoblox DDI - DNS Security & Threat Dashboard (new)")
print("  - Infoblox DDI - DHCP Asset Tracker Dashboard (new)")
print("\nAccess at: https://10.251.151.14")
