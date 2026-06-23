#!/usr/bin/env python3
"""
Wazuh Custom Integration: Send alerts to Shuffle SOAR
Sends alert as JSON object (not string) in execution_argument
Includes calculated iris_severity_id to correct mapping inside Shuffle flow
"""
import sys
import json
import os
import urllib.request
import urllib.error

SHUFFLE_URL = "http://10.251.151.15:3001"
SHUFFLE_API_KEY = "f58c3878-a71a-434e-8297-9f303a42379c"
SHUFFLE_WORKFLOW_ID = "3bf766d1-23cf-4639-86a2-51e911eea286"
EXECUTE_URL = f"{SHUFFLE_URL}/api/v1/workflows/{SHUFFLE_WORKFLOW_ID}/execute"

# Severity map: Wazuh level → IRIS severity_id
# IRIS: 1=Medium, 2=Unspecified, 3=Informational, 4=Low, 5=High, 6=Critical
def map_severity(level):
    if level >= 15: return 6   # Critical
    if level >= 13: return 5   # High
    if level >= 10: return 1   # Medium
    if level >= 7:  return 4   # Low
    return 3                    # Informational

def main():
    alert_file = sys.argv[1] if len(sys.argv) > 1 else None

    if alert_file and os.path.isfile(alert_file):
        with open(alert_file) as f:
            alert = json.load(f)
    else:
        alert = json.loads(sys.stdin.read())

    # Map severity for IRIS integration inside Shuffle
    level = int(alert.get("rule", {}).get("level", 0))
    if "rule" not in alert:
        alert["rule"] = {}
    alert["rule"]["iris_severity_id"] = map_severity(level)

    # Send alert object directly as execution_argument
    payload = json.dumps({
        "execution_argument": alert,
        "start": ""
    }).encode('utf-8')

    req = urllib.request.Request(
        EXECUTE_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {SHUFFLE_API_KEY}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            if result.get("success"):
                print(f"Shuffle OK: execution_id={result.get('execution_id','?')}")
                sys.exit(0)
            else:
                print(f"Shuffle FAIL: {result}")
                sys.exit(1)
    except Exception as e:
        print(f"Shuffle error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
