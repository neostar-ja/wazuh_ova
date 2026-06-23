#!/usr/bin/env python3
"""
Wazuh Custom Integration: Create DFIR-IRIS alerts
IRIS v2.4.29 — uses /alerts/add (no /api/v2 prefix)
Called by Wazuh integratord for alerts L12+
"""
import sys
import json
import os
import urllib.request
import urllib.error
import ssl

# Configuration
IRIS_URL = "https://10.251.151.15"
IRIS_API_KEY = "Fw9PvrqiEpISMORwj9BesBzKSfmIKpzBqc0x7jESL3uQ_SLlpY7uCTMDR8Au3Mr7_zRlR5QQpS56DrQgwZsP-g"
IRIS_CUSTOMER_ID = 1
ALERTS_ENDPOINT = f"{IRIS_URL}/alerts/add"

# Severity map: Wazuh level → IRIS severity_id
# IRIS: 1=Medium, 2=Unspecified, 3=Informational, 4=Low, 5=High, 6=Critical
def map_severity(level):
    if level >= 15: return 6   # Critical
    if level >= 13: return 5   # High
    if level >= 10: return 1   # Medium
    if level >= 7:  return 4   # Low
    return 3                    # Informational

def main():
    # Wazuh calls: custom-iris.py <alert_file> <api_key> <hook_url>
    alert_file = sys.argv[1] if len(sys.argv) > 1 else None

    if alert_file and os.path.isfile(alert_file):
        with open(alert_file) as f:
            alert = json.load(f)
    else:
        alert = json.loads(sys.stdin.read())

    rule = alert.get("rule", {})
    agent = alert.get("agent", {})
    data = alert.get("data", {})

    level = int(rule.get("level", 0))
    rule_id = rule.get("id", "0")
    description = rule.get("description", "No description")
    groups = ",".join(rule.get("groups", []))
    srcip = data.get("srcip", data.get("src_ip", "unknown"))
    agent_name = agent.get("name", "unknown")
    timestamp = alert.get("timestamp", "")

    mitre_ids = rule.get("mitre", {}).get("id", [])
    pci_dss = rule.get("pci_dss", [])

    title = f"Wazuh L{level} — {description}"
    if len(title) > 150:
        title = title[:147] + "..."

    body = {
        "alert_title": title,
        "alert_description": (
            f"Source IP: {srcip} | Agent: {agent_name} | "
            f"Rule: {rule_id} | Groups: {groups} | Timestamp: {timestamp}"
        ),
        "alert_source": "Wazuh SIEM",
        "alert_source_ref": str(rule_id),
        "alert_source_link": "https://10.251.151.14/app/wazuh",
        "alert_severity_id": map_severity(level),
        "alert_status_id": 2,
        "alert_customer_id": IRIS_CUSTOMER_ID,
        "alert_tags": groups[:200] if groups else f"wazuh,level-{level}",
        "alert_source_event_time": timestamp,
    }

    # Add IOC if srcip is not private/unknown
    if srcip and srcip not in ("unknown", "127.0.0.1") and not srcip.startswith("10."):
        body["alert_iocs"] = [{
            "ioc_value": srcip,
            "ioc_description": f"Source IP from Wazuh rule {rule_id}",
            "ioc_tlp_id": 2,
            "ioc_type_id": 76
        }]

    payload = json.dumps(body).encode("utf-8")

    # Disable SSL verification for self-signed cert
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        ALERTS_ENDPOINT,
        data=payload,
        headers={
            "Authorization": f"Bearer {IRIS_API_KEY}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            if result.get("status") == "success":
                alert_id = result.get("data", {}).get("alert_id", "?")
                print(f"IRIS alert created: ID={alert_id} title={title[:50]}")
                sys.exit(0)
            else:
                print(f"IRIS error: {result.get('message','unknown')}")
                sys.exit(1)
    except urllib.error.HTTPError as e:
        body_err = e.read().decode()[:200]
        print(f"IRIS HTTP {e.code}: {body_err}")
        sys.exit(1)
    except Exception as e:
        print(f"IRIS integration error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
