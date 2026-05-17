#!/usr/bin/env python3
"""
Wazuh Generic Telegram Integration
Deployed to: /var/ossec/integrations/custom-telegram.py
Sends alerts for level >= 12 only:
  Level 12-14  -> 🟠 HIGH
  Level 15+    -> 🔴 CRITICAL
"""
import sys
import json
import requests

if len(sys.argv) < 4:
    sys.exit(0)

try:
    with open(sys.argv[1]) as f:
        alert_json = json.load(f)
except Exception:
    sys.exit(0)

hook_url = sys.argv[3]
chat_id  = sys.argv[2]

rule   = alert_json.get("rule", {})
agent  = alert_json.get("agent", {})
groups = rule.get("groups", [])

# Skip: these integrations already send their own rich Telegram alerts
SKIP_GROUPS = {
    "abuseipdb", "otx_intel", "otx_malicious", "otx_suspicious",
    "abuseipdb_malicious", "abuseipdb_suspicious",
}
if SKIP_GROUPS & set(groups):
    sys.exit(0)

MIN_ALERT_LEVEL = 12
level = int(rule.get("level", 0))
if level < MIN_ALERT_LEVEL:
    sys.exit(0)

if level >= 15:
    severity_emoji = "\U0001f534"   # 🔴
    severity_label = "CRITICAL"
else:
    severity_emoji = "\U0001f7e0"   # 🟠
    severity_label = "HIGH"

desc  = rule.get("description", "?")
rid   = rule.get("id", "?")
aname = agent.get("name", "?")

msg  = f"{severity_emoji} *Wazuh Alert — {severity_label} (Level {level})*\n"
msg += f"\U0001f4cc *Description:* {desc}\n"
msg += f"\U0001f5a5️ *Agent:* {aname}\n"
msg += f"\U0001f194 *Rule ID:* {rid}\n"

try:
    requests.post(hook_url, json={
        "chat_id": chat_id,
        "text": msg,
        "parse_mode": "Markdown",
    }, timeout=10)
except Exception:
    pass
