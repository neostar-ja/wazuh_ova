import json

def convert():
    with open("/opt/code/wazuh_ova/legacy_wazuh.json", "r") as f:
        legacy = json.load(f)
    
    # Extract mappings, settings, aliases from the legacy template
    # Legacy template structure is usually: { "wazuh": { "index_patterns": ..., "settings": ..., "mappings": ... } }
    template_key = list(legacy.keys())[0] # Should be "wazuh"
    wazuh_data = legacy[template_key]
    
    mappings = wazuh_data.get("mappings", {})
    settings = wazuh_data.get("settings", {})
    
    # Create Composable Component Template Payload
    component_payload = {
        "template": {
            "mappings": mappings,
            "settings": settings
        }
    }
    
    with open("/opt/code/wazuh_ova/wazuh_core_mappings_component.json", "w") as out:
        json.dump(component_payload, out)
        
    print("✅ Success: Extracted mappings and settings to component json payload.")

if __name__ == "__main__":
    convert()
