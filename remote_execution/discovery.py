#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime

BASE = "/opt/code/wazuh_ova"

def collect():
    components = {"directories": [], "files": []}
    for root, dirs, files in os.walk(BASE):
        # skip internal remote_execution dir to avoid recursion
        if root.startswith(os.path.join(BASE, "remote_execution")):
            continue
        rel = os.path.relpath(root, BASE)
        if rel != ".":
            components["directories"].append(rel)
        for f in files:
            components["files"].append(os.path.join(rel, f))
    components["fetched_at"] = datetime.utcnow().isoformat() + "Z"
    return components

if __name__ == "__main__":
    data = collect()
    json.dump(data, sys.stdout, indent=2)
    sys.stdout.write("\n")
