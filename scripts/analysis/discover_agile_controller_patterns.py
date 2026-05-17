import json
import urllib.request
import ssl
import re

def discover_patterns():
    url = "https://10.251.151.13:9200/wazuh-alerts-4.x-2026.05.15/_search"
    query = {
        "query": { "match": { "full_log": "AgileController" } },
        "size": 300,
        "_source": ["full_log"]
    }
    
    # Bypass SSL validation for local cluster
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(url, data=json.dumps(query).encode('utf-8'), headers={'Content-Type': 'application/json'})
    # Use base64 encoded admin:admin
    import base64
    auth = base64.b64encode(b"admin:admin").decode("ascii")
    req.add_header("Authorization", f"Basic {auth}")
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        hits = data.get("hits", {}).get("hits", [])
        print(f"Total hits downloaded: {len(hits)}")
        
        patterns = {}
        for h in hits:
            full_log = h.get("_source", {}).get("full_log", "")
            # Extract pattern identifier like %%01PORTALLOG/6/LOGONOROFF or any word starting with %%
            match = re.search(r'%%(\d+[A-Z]+/?[0-9A-Z/]+)\([^)]+\)', full_log)
            if match:
                pattern = match.group(1)
            else:
                # Fallback to general description part before the attributes
                parts = full_log.split(":")
                if len(parts) > 1:
                    pattern = parts[0].strip()
                else:
                    pattern = full_log[:50].strip()
            
            if pattern not in patterns:
                patterns[pattern] = []
            patterns[pattern].append(full_log)
            
        print("\n--- DISCOVERED UNIQUE PATTERNS ---")
        for pat, examples in patterns.items():
            print(f"\n[Pattern]: {pat} (Occurrences: {len(examples)})")
            print(f"Example 1: {examples[0]}")
            if len(examples) > 1:
                print(f"Example 2: {examples[1]}")
                
    except Exception as e:
        print(f"Error running discovery: {e}")

if __name__ == "__main__":
    discover_patterns()
