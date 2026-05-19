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
from datetime import datetime

DEBUG_LOG = "/var/ossec/logs/telegram_generic_debug.log"


def log_debug(message: str) -> None:
    try:
        with open(DEBUG_LOG, "a", encoding="utf-8") as handle:
            handle.write(f"{datetime.now().isoformat()} - {message}\n")
    except Exception:
        pass

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
    log_debug(f"Skipping rule_id={rule.get('id')} due to dedicated integration groups={groups}")
    sys.exit(0)

MIN_ALERT_LEVEL = 12
level = int(rule.get("level", 0))
if level < MIN_ALERT_LEVEL:
    log_debug(f"Skipping rule_id={rule.get('id')} level={level} below minimum {MIN_ALERT_LEVEL}")
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
    log_debug(
        f"Sending rule_id={rid} level={level} agent={aname} chat_id={chat_id}"
    )
    response = requests.post(hook_url, json={
        "chat_id": chat_id,
        "text": msg,
        "parse_mode": "Markdown",
    }, timeout=10)
    log_debug(f"Telegram status={response.status_code} body={response.text[:200]}")
except Exception:
    log_debug(f"Telegram send error for rule_id={rid}")
