import json
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def create_infoblox_dashboard():
    index_pattern_id = "wazuh-infoblox-alerts"
    
    # 1. Index pattern definition
    obj_index = {
        "type": "index-pattern",
        "id": index_pattern_id,
        "attributes": {
            "title": "wazuh-alerts-*",
            "timeFieldName": "timestamp",
            "fields": "[]"
        }
    }
    
    # 2. Saved Search for Infoblox logs
    search_query = "rule.groups: \"infoblox\""
    obj_search = {
        "type": "search",
        "id": "infoblox-events-search",
        "attributes": {
            "title": "Infoblox DDI - DNS & DHCP Events",
            "description": "Live raw transaction log for recursive DNS queries and DHCP lease lifecycle events",
            "columns": [
                "timestamp",
                "rule.id",
                "rule.description",
                "data.srcip",
                "data.dns_domain",
                "data.dns_type",
                "data.dhcp_action",
                "data.dhcp_ip",
                "data.dhcp_mac",
                "data.dhcp_hostname"
            ],
            "sort": [["timestamp", "desc"]],
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "index": index_pattern_id,
                    "query": {"language": "kuery", "query": search_query},
                    "filter": []
                })
            }
        },
        "references": [
            {"name": "kibanaSavedObjectMeta.searchSourceJSON.index", "type": "index-pattern", "id": index_pattern_id}
        ]
    }
    
    # Helper method to make custom visualizations
    def make_vis(vis_id, title, vis_type, field, is_donut=True):
        if vis_type == "pie":
            vis_state = {
                "title": title,
                "type": "pie",
                "params": {
                    "addTooltip": True,
                    "addLegend": True,
                    "legendPosition": "right",
                    "isDonut": is_donut
                },
                "aggs": [
                    {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
                    {"id": "2", "enabled": True, "type": "terms", "schema": "segment", "params": {"field": field, "size": 10, "order": "desc", "orderBy": "1"}}
                ]
            }
        elif vis_type == "histogram":
            vis_state = {
                "title": title,
                "type": "histogram",
                "params": {
                    "type": "histogram",
                    "grid": {"categoryLines": False},
                    "categoryAxes": [{"id": "CategoryAxis-1", "type": "category", "position": "bottom", "show": True, "style": {}, "scale": {"type": "linear"}, "labels": {"show": True, "truncate": 100}, "title": {}}],
                    "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1", "type": "value", "position": "left", "show": True, "style": {}, "scale": {"type": "linear", "mode": "normal"}, "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100}, "title": {"text": "Count"}}],
                    "seriesParams": [{"show": True, "type": "histogram", "mode": "stacked", "data": {"label": "Count", "id": "1"}, "valueAxis": "ValueAxis-1"}],
                    "addTooltip": True,
                    "addLegend": False
                },
                "aggs": [
                    {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
                    {"id": "2", "enabled": True, "type": "terms", "schema": "segment", "params": {"field": field, "size": 10, "order": "desc", "orderBy": "1"}}
                ]
            }
        elif vis_type == "horizontal_bar":
            vis_state = {
                "title": title,
                "type": "horizontal_bar",
                "params": {
                    "type": "histogram",
                    "grid": {"categoryLines": False},
                    "categoryAxes": [{"id": "CategoryAxis-1", "type": "category", "position": "left", "show": True, "style": {}, "scale": {"type": "linear"}, "labels": {"show": True, "truncate": 100}, "title": {}}],
                    "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1", "type": "value", "position": "bottom", "show": True, "style": {}, "scale": {"type": "linear", "mode": "normal"}, "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100}, "title": {"text": "Count"}}],
                    "seriesParams": [{"show": True, "type": "histogram", "mode": "stacked", "data": {"label": "Count", "id": "1"}, "valueAxis": "ValueAxis-1"}],
                    "addTooltip": True,
                    "addLegend": False
                },
                "aggs": [
                    {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
                    {"id": "2", "enabled": True, "type": "terms", "schema": "segment", "params": {"field": field, "size": 10, "order": "desc", "orderBy": "1"}}
                ]
            }
        return {
            "type": "visualization",
            "id": vis_id,
            "attributes": {
                "title": title,
                "visState": json.dumps(vis_state),
                "uiStateJSON": "{}",
                "description": f"{title} visualization",
                "version": 1,
                "kibanaSavedObjectMeta": {
                    "searchSourceJSON": json.dumps({
                        "index": index_pattern_id,
                        "query": {"language": "kuery", "query": search_query},
                        "filter": []
                    })
                }
            },
            "references": [
                {"name": "kibanaSavedObjectMeta.searchSourceJSON.index", "type": "index-pattern", "id": index_pattern_id}
            ]
        }

    # Build visual objects
    vis_dhcp_actions = make_vis("infoblox-dhcp-actions", "Infoblox DHCP - Lease Lifecycle Operations", "pie", "data.dhcp_action")
    vis_dns_types = make_vis("infoblox-dns-types", "Infoblox DNS - Top Query Records", "pie", "data.dns_type")
    vis_dns_domains = make_vis("infoblox-dns-domains", "Infoblox DNS - Top Queried Domains", "horizontal_bar", "data.dns_domain")
    vis_dns_clients = make_vis("infoblox-dns-clients", "Infoblox DNS - Top Querying Clients", "horizontal_bar", "data.srcip")
    vis_dhcp_hostnames = make_vis("infoblox-dhcp-hostnames", "Infoblox DHCP - Top Client Hostnames", "pie", "data.dhcp_hostname")
    vis_rule_breakdown = make_vis("infoblox-rule-breakdown", "Infoblox DDI - Events by OSSEC Rule ID", "pie", "rule.id.keyword")

    # Dashboard grid data
    panels = [
        # Row 1 (Y=0): Essential High-Level Pie Donuts
        {"version": "2.19.5", "gridData": {"x": 0, "y": 0, "w": 16, "h": 11, "i": "1"}, "panelIndex": "1", "embeddableConfig": {}, "panelRefName": "panel_1"},
        {"version": "2.19.5", "gridData": {"x": 16, "y": 0, "w": 16, "h": 11, "i": "2"}, "panelIndex": "2", "embeddableConfig": {}, "panelRefName": "panel_2"},
        {"version": "2.19.5", "gridData": {"x": 32, "y": 0, "w": 16, "h": 11, "i": "3"}, "panelIndex": "3", "embeddableConfig": {}, "panelRefName": "panel_3"},

        # Row 2 (Y=11): Deep DNS & DHCP Metrics
        {"version": "2.19.5", "gridData": {"x": 0, "y": 11, "w": 24, "h": 13, "i": "4"}, "panelIndex": "4", "embeddableConfig": {}, "panelRefName": "panel_4"},
        {"version": "2.19.5", "gridData": {"x": 24, "y": 11, "w": 24, "h": 13, "i": "5"}, "panelIndex": "5", "embeddableConfig": {}, "panelRefName": "panel_5"},

        # Row 3 (Y=24): Secondary Metrics
        {"version": "2.19.5", "gridData": {"x": 0, "y": 24, "w": 48, "h": 11, "i": "6"}, "panelIndex": "6", "embeddableConfig": {}, "panelRefName": "panel_6"},

        # Row 4 (Y=35): Event Feed Search Results
        {"version": "2.19.5", "gridData": {"x": 0, "y": 35, "w": 48, "h": 20, "i": "7"}, "panelIndex": "7", "embeddableConfig": {}, "panelRefName": "panel_7"},
    ]

    obj_dashboard = {
        "type": "dashboard",
        "id": "infoblox-ddi-main-dashboard",
        "attributes": {
            "title": "Infoblox DDI - DNS & DHCP Monitoring Dashboard",
            "description": "Comprehensive real-time analytics for recursive DNS queries and ISC lease operations",
            "timeRestore": False,
            "optionsJSON": json.dumps({"useMargins": True, "hidePanelTitles": False}),
            "panelsJSON": json.dumps(panels),
            "version": 1,
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "query": {"language": "kuery", "query": search_query},
                    "filter": []
                })
            }
        },
        "references": [
            {"name": "panel_1", "type": "visualization", "id": "infoblox-dns-types"},
            {"name": "panel_2", "type": "visualization", "id": "infoblox-dhcp-actions"},
            {"name": "panel_3", "type": "visualization", "id": "infoblox-dhcp-hostnames"},
            {"name": "panel_4", "type": "visualization", "id": "infoblox-dns-domains"},
            {"name": "panel_5", "type": "visualization", "id": "infoblox-dns-clients"},
            {"name": "panel_6", "type": "visualization", "id": "infoblox-rule-breakdown"},
            {"name": "panel_7", "type": "search", "id": "infoblox-events-search"}
        ]
    }

    out_path = os.path.join(REPO_ROOT, 'visualizations', 'infoblox_ddi_dashboard.ndjson')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        f.write(json.dumps(obj_index) + '\n')
        f.write(json.dumps(obj_search) + '\n')
        f.write(json.dumps(vis_dns_types) + '\n')
        f.write(json.dumps(vis_dhcp_actions) + '\n')
        f.write(json.dumps(vis_dhcp_hostnames) + '\n')
        f.write(json.dumps(vis_dns_domains) + '\n')
        f.write(json.dumps(vis_dns_clients) + '\n')
        f.write(json.dumps(vis_rule_breakdown) + '\n')
        f.write(json.dumps(obj_dashboard) + '\n')
    
    print(f"Successfully created Infoblox dashboard NDJSON at: {out_path}")

if __name__ == '__main__':
    create_infoblox_dashboard()
