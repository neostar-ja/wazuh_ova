import json
import os

def create_ac_dashboard():
    index_pattern_id = "wazuh-huawei-ac-alerts"
    
    # 1. Index pattern
    obj_index = {
        "type": "index-pattern",
        "id": index_pattern_id,
        "attributes": {
            "title": "wazuh-alerts-*",
            "timeFieldName": "timestamp",
            "fields": "[]"
        }
    }
    
    # 2. Saved search
    search_query = "decoder.name: \"huawei-ac\""
    obj_search = {
        "type": "search",
        "id": "huawei-ac-events-search",
        "attributes": {
            "title": "Huawei AgileController - Events",
            "description": "Huawei AgileController authentication, user session, and portal events",
            "columns": [
                "timestamp",
                "rule.id",
                "rule.description",
                "data.dstuser",
                "data.srcip",
                "data.mac",
                "data.ap_mac",
                "data.switch_name",
                "data.ac_auth_result",
                "data.ac_result",
                "data.ac_msg_type",
                "data.ac_log_type",
                "data.error_code"
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
    
    # Common helper to build visualizations
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

    # Build specific visualizations
    vis_auth_result = make_vis("huawei-ac-auth-result", "Huawei AC - Radius Authentication Results", "pie", "data.ac_auth_result")
    vis_msg_type = make_vis("huawei-ac-msg-type", "Huawei AC - Radius User Sessions", "pie", "data.ac_msg_type")
    
    # PORTAL-SPECIFIC VISUALIZATIONS (NEW)
    vis_portal_result = make_vis("huawei-ac-portal-result", "Huawei AC - Portal Logon Results (0=Success)", "pie", "data.ac_result")
    vis_portal_logon = make_vis("huawei-ac-portal-logon", "Huawei AC - Portal Logon vs Logoff (1=Logon, 2=Logoff)", "pie", "data.ac_log_type")
    
    vis_rules = make_vis("huawei-ac-rules", "Huawei AC - Alert Types by Rule", "pie", "rule.id.keyword")
    vis_top_users = make_vis("huawei-ac-top-users", "Huawei AC - Top Connected Users", "histogram", "data.dstuser")
    vis_top_mac = make_vis("huawei-ac-top-mac", "Huawei AC - Top Connected MACs", "histogram", "data.mac")
    vis_errors = make_vis("huawei-ac-errors", "Huawei AC - Radius Error Breakdown", "pie", "data.error_code")
    vis_switches = make_vis("huawei-ac-switches", "Huawei AC - Top Authentication Switches", "histogram", "data.switch_name")
    vis_aps = make_vis("huawei-ac-aps", "Huawei AC - Top Connected APs", "pie", "data.ap_mac")
    
    # GeoIP maps if they exist
    vis_geoip_src = {
        "type": "visualization",
        "id": "huawei-ac-geomap-src",
        "attributes": {
            "title": "Huawei AC - User Locations Map",
            "visState": json.dumps({
                "title": "Huawei AC - User Locations Map",
                "type": "tile_map",
                "params": {
                    "addTooltip": True, "colorSchema": "Yellow to Red", "mapType": "Scaled Circle Markers", 
                    "isDesaturated": True, "mapZoom": 2, "center": [0,0], "wms": {"enabled": False, "timeout": 20000}
                },
                "aggs": [
                    {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
                    {"id": "2", "enabled": True, "type": "geohash_grid", "schema": "segment", "params": {"field": "GeoLocation.location", "autoPrecision": True, "isFilteredByCollar": True, "useGeocentroid": True}}
                ]
            }),
            "uiStateJSON": "{}",
            "description": "Geographical distribution of authenticated source IPs",
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

    # Dashboard container
    panels = [
        # Row 1 (Y=0): Radius Metrics
        {"version": "2.19.5", "gridData": {"x": 0, "y": 0, "w": 16, "h": 10, "i": "1"}, "panelIndex": "1", "embeddableConfig": {}, "panelRefName": "panel_1"},
        {"version": "2.19.5", "gridData": {"x": 16, "y": 0, "w": 16, "h": 10, "i": "2"}, "panelIndex": "2", "embeddableConfig": {}, "panelRefName": "panel_2"},
        {"version": "2.19.5", "gridData": {"x": 32, "y": 0, "w": 16, "h": 10, "i": "3"}, "panelIndex": "3", "embeddableConfig": {}, "panelRefName": "panel_3"},
        
        # Row 2 (Y=10): Portal Web Auth Metrics (NEW!)
        {"version": "2.19.5", "gridData": {"x": 0, "y": 10, "w": 24, "h": 10, "i": "11"}, "panelIndex": "11", "embeddableConfig": {}, "panelRefName": "panel_11"},
        {"version": "2.19.5", "gridData": {"x": 24, "y": 10, "w": 24, "h": 10, "i": "12"}, "panelIndex": "12", "embeddableConfig": {}, "panelRefName": "panel_12"},
        
        # Row 3 (Y=20): Top Users & Top MACs
        {"version": "2.19.5", "gridData": {"x": 0, "y": 20, "w": 24, "h": 12, "i": "4"}, "panelIndex": "4", "embeddableConfig": {}, "panelRefName": "panel_4"},
        {"version": "2.19.5", "gridData": {"x": 24, "y": 20, "w": 24, "h": 12, "i": "5"}, "panelIndex": "5", "embeddableConfig": {}, "panelRefName": "panel_5"},
        
        # Row 4 (Y=32): Network Devices
        {"version": "2.19.5", "gridData": {"x": 0, "y": 32, "w": 16, "h": 10, "i": "6"}, "panelIndex": "6", "embeddableConfig": {}, "panelRefName": "panel_6"},
        {"version": "2.19.5", "gridData": {"x": 16, "y": 32, "w": 16, "h": 10, "i": "7"}, "panelIndex": "7", "embeddableConfig": {}, "panelRefName": "panel_7"},
        {"version": "2.19.5", "gridData": {"x": 32, "y": 32, "w": 16, "h": 10, "i": "8"}, "panelIndex": "8", "embeddableConfig": {}, "panelRefName": "panel_8"},
        
        # Row 5 (Y=42): Geography Map
        {"version": "2.19.5", "gridData": {"x": 0, "y": 42, "w": 48, "h": 12, "i": "9"}, "panelIndex": "9", "embeddableConfig": {}, "panelRefName": "panel_9"},
        
        # Row 6 (Y=54): All Events Logs
        {"version": "2.19.5", "gridData": {"x": 0, "y": 54, "w": 48, "h": 20, "i": "10"}, "panelIndex": "10", "embeddableConfig": {}, "panelRefName": "panel_10"},
    ]
    
    obj_dashboard = {
        "type": "dashboard",
        "id": "huawei-ac-main-dashboard",
        "attributes": {
            "title": "Huawei AgileController - Authentication & Session Dashboard",
            "description": "Premium real-time visiblity of user authentication, online state, and network client access",
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
            {"name": "panel_1", "type": "visualization", "id": "huawei-ac-auth-result"},
            {"name": "panel_2", "type": "visualization", "id": "huawei-ac-msg-type"},
            {"name": "panel_3", "type": "visualization", "id": "huawei-ac-errors"},
            {"name": "panel_4", "type": "visualization", "id": "huawei-ac-top-users"},
            {"name": "panel_5", "type": "visualization", "id": "huawei-ac-top-mac"},
            {"name": "panel_6", "type": "visualization", "id": "huawei-ac-switches"},
            {"name": "panel_7", "type": "visualization", "id": "huawei-ac-aps"},
            {"name": "panel_8", "type": "visualization", "id": "huawei-ac-rules"},
            {"name": "panel_9", "type": "visualization", "id": "huawei-ac-geomap-src"},
            {"name": "panel_10", "type": "search", "id": "huawei-ac-events-search"},
            {"name": "panel_11", "type": "visualization", "id": "huawei-ac-portal-result"},
            {"name": "panel_12", "type": "visualization", "id": "huawei-ac-portal-logon"}
        ]
    }
    
    out_path = '/opt/code/wazuh_ova/visualizations/huawei_ac_dashboard.ndjson'
    with open(out_path, 'w') as f:
        f.write(json.dumps(obj_index) + '\n')
        f.write(json.dumps(obj_search) + '\n')
        f.write(json.dumps(vis_auth_result) + '\n')
        f.write(json.dumps(vis_msg_type) + '\n')
        f.write(json.dumps(vis_rules) + '\n')
        f.write(json.dumps(vis_top_users) + '\n')
        f.write(json.dumps(vis_top_mac) + '\n')
        f.write(json.dumps(vis_errors) + '\n')
        f.write(json.dumps(vis_switches) + '\n')
        f.write(json.dumps(vis_aps) + '\n')
        f.write(json.dumps(vis_geoip_src) + '\n')
        f.write(json.dumps(vis_portal_result) + '\n')
        f.write(json.dumps(vis_portal_logon) + '\n')
        f.write(json.dumps(obj_dashboard) + '\n')
    
    print(f"Successfully created dashboard NDJSON at: {out_path}")

if __name__ == '__main__':
    create_ac_dashboard()
