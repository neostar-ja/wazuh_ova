import json
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def modify_huawei():
    file_path = os.path.join(REPO_ROOT, 'visualizations', 'huawei_usg_dashboard.ndjson')
    lines = []
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if not line.strip(): continue
        obj = json.loads(line)
        if obj.get('id') == 'huawei-usg-advanced-dashboard' and obj.get('type') == 'dashboard':
            # modify layout
            panels = json.loads(obj['attributes']['panelsJSON'])
            for p in panels:
                if p['panelIndex'] == '13':
                    p['gridData']['y'] = 54
            
            # Add map panels
            panels.append({"version":"2.19.5","gridData":{"x":0,"y":40,"w":24,"h":14,"i":"14"},"panelIndex":"14","embeddableConfig":{},"panelRefName":"panel_14"})
            panels.append({"version":"2.19.5","gridData":{"x":24,"y":40,"w":24,"h":14,"i":"15"},"panelIndex":"15","embeddableConfig":{},"panelRefName":"panel_15"})
            
            obj['attributes']['panelsJSON'] = json.dumps(panels)
            
            # update references
            refs = obj.get('references', [])
            refs.append({"name":"panel_14","type":"visualization","id":"huawei-usg-geomap-src"})
            refs.append({"name":"panel_15","type":"visualization","id":"huawei-usg-geomap-dst"})
            obj['references'] = refs
            
            new_lines.append(json.dumps(obj) + '\n')
        else:
            new_lines.append(json.dumps(obj) + '\n')
            
    # Add new visualizations
    src_map = {"type":"visualization","id":"huawei-usg-geomap-src","attributes":{"title":"Huawei USG - Source Location Map","visState":"{\"title\":\"Huawei USG - Source Location Map\",\"type\":\"tile_map\",\"params\":{\"addTooltip\":true,\"colorSchema\":\"Yellow to Red\",\"mapType\":\"Scaled Circle Markers\",\"isDesaturated\":true,\"mapZoom\":2,\"center\":[0,0],\"wms\":{\"enabled\":false,\"url\":\"https://maps.elastic.co/v2/manifest\",\"options\":{\"format\":\"image/png\",\"transparent\":true},\"timeout\":20000}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"geohash_grid\",\"schema\":\"segment\",\"params\":{\"field\":\"GeoLocation.location\",\"autoPrecision\":true,\"isFilteredByCollar\":true,\"useGeocentroid\":true}}]}","uiStateJSON":"{}","description":"Geographical map of Source IPs for Huawei logs","version":1,"kibanaSavedObjectMeta":{"searchSourceJSON":"{\"index\":\"wazuh-huawei-usg-alerts\",\"query\":{\"language\":\"kuery\",\"query\":\"decoder.name: \\\"huawei-usg-custom\\\"\"},\"filter\":[]}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"wazuh-huawei-usg-alerts"}]}
    dst_map = {"type":"visualization","id":"huawei-usg-geomap-dst","attributes":{"title":"Huawei USG - Destination Location Map","visState":"{\"title\":\"Huawei USG - Destination Location Map\",\"type\":\"tile_map\",\"params\":{\"addTooltip\":true,\"colorSchema\":\"Yellow to Red\",\"mapType\":\"Scaled Circle Markers\",\"isDesaturated\":true,\"mapZoom\":2,\"center\":[0,0],\"wms\":{\"enabled\":false,\"url\":\"https://maps.elastic.co/v2/manifest\",\"options\":{\"format\":\"image/png\",\"transparent\":true},\"timeout\":20000}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"geohash_grid\",\"schema\":\"segment\",\"params\":{\"field\":\"DestLocation.location\",\"autoPrecision\":true,\"isFilteredByCollar\":true,\"useGeocentroid\":true}}]}","uiStateJSON":"{}","description":"Geographical map of Destination IPs for Huawei logs","version":1,"kibanaSavedObjectMeta":{"searchSourceJSON":"{\"index\":\"wazuh-huawei-usg-alerts\",\"query\":{\"language\":\"kuery\",\"query\":\"decoder.name: \\\"huawei-usg-custom\\\"\"},\"filter\":[]}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"wazuh-huawei-usg-alerts"}]}
    
    new_lines.append(json.dumps(src_map) + '\n')
    new_lines.append(json.dumps(dst_map) + '\n')
    
    with open(file_path, 'w') as f:
        f.writelines(new_lines)
    print("Updated Huawei dashboard")

def modify_mikrotik():
    file_path = os.path.join(REPO_ROOT, 'visualizations', 'mikrotik_routeros_dashboard.ndjson')
    lines = []
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if not line.strip(): continue
        obj = json.loads(line)
        if obj.get('id') == 'mikrotik-routeros-dashboard' and obj.get('type') == 'dashboard':
            # modify layout
            panels = json.loads(obj['attributes']['panelsJSON'])
            for p in panels:
                if p['panelIndex'] == '4': # search results
                    p['gridData']['y'] = 26
            
            # Add map panels
            panels.append({"version":"2.19.5","gridData":{"x":0,"y":12,"w":24,"h":14,"i":"5"},"panelIndex":"5","embeddableConfig":{},"panelRefName":"panel_5"})
            panels.append({"version":"2.19.5","gridData":{"x":24,"y":12,"w":24,"h":14,"i":"6"},"panelIndex":"6","embeddableConfig":{},"panelRefName":"panel_6"})
            
            obj['attributes']['panelsJSON'] = json.dumps(panels)
            
            # update references
            refs = obj.get('references', [])
            refs.append({"name":"panel_5","type":"visualization","id":"mikrotik-geomap-src"})
            refs.append({"name":"panel_6","type":"visualization","id":"mikrotik-geomap-dst"})
            obj['references'] = refs
            
            new_lines.append(json.dumps(obj) + '\n')
        else:
            new_lines.append(json.dumps(obj) + '\n')
            
    # Add new visualizations
    src_map = {"type":"visualization","id":"mikrotik-geomap-src","attributes":{"title":"MikroTik - Source Location Map","visState":"{\"title\":\"MikroTik - Source Location Map\",\"type\":\"tile_map\",\"params\":{\"addTooltip\":true,\"colorSchema\":\"Yellow to Red\",\"mapType\":\"Scaled Circle Markers\",\"isDesaturated\":true,\"mapZoom\":2,\"center\":[0,0],\"wms\":{\"enabled\":false,\"url\":\"https://maps.elastic.co/v2/manifest\",\"options\":{\"format\":\"image/png\",\"transparent\":true},\"timeout\":20000}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"geohash_grid\",\"schema\":\"segment\",\"params\":{\"field\":\"GeoLocation.location\",\"autoPrecision\":true,\"isFilteredByCollar\":true,\"useGeocentroid\":true}}]}","uiStateJSON":"{}","description":"Geographical map of Source IPs for MikroTik logs","version":1,"kibanaSavedObjectMeta":{"searchSourceJSON":"{\"index\":\"wazuh-mikrotik-alerts\",\"query\":{\"language\":\"kuery\",\"query\":\"rule.groups: \\\"mikrotik\\\"\"},\"filter\":[]}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"wazuh-mikrotik-alerts"}]}
    dst_map = {"type":"visualization","id":"mikrotik-geomap-dst","attributes":{"title":"MikroTik - Destination Location Map","visState":"{\"title\":\"MikroTik - Destination Location Map\",\"type\":\"tile_map\",\"params\":{\"addTooltip\":true,\"colorSchema\":\"Yellow to Red\",\"mapType\":\"Scaled Circle Markers\",\"isDesaturated\":true,\"mapZoom\":2,\"center\":[0,0],\"wms\":{\"enabled\":false,\"url\":\"https://maps.elastic.co/v2/manifest\",\"options\":{\"format\":\"image/png\",\"transparent\":true},\"timeout\":20000}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"geohash_grid\",\"schema\":\"segment\",\"params\":{\"field\":\"DestLocation.location\",\"autoPrecision\":true,\"isFilteredByCollar\":true,\"useGeocentroid\":true}}]}","uiStateJSON":"{}","description":"Geographical map of Destination IPs for MikroTik logs","version":1,"kibanaSavedObjectMeta":{"searchSourceJSON":"{\"index\":\"wazuh-mikrotik-alerts\",\"query\":{\"language\":\"kuery\",\"query\":\"rule.groups: \\\"mikrotik\\\"\"},\"filter\":[]}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"wazuh-mikrotik-alerts"}]}
    
    new_lines.append(json.dumps(src_map) + '\n')
    new_lines.append(json.dumps(dst_map) + '\n')
    
    with open(file_path, 'w') as f:
        f.writelines(new_lines)
    print("Updated MikroTik dashboard")

modify_huawei()
modify_mikrotik()
