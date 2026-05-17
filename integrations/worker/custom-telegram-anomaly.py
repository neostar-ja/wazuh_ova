#!/usr/bin/env python3
"""
Network Anomaly Telegram Alert Sender
Worker live variant as of 2026-05-17, with secrets redacted for Git.
"""

import json
import os
import sys
import traceback
from datetime import datetime
from typing import Any, Dict

import requests

DEBUG_LOG = "/var/ossec/logs/telegram_anomaly_debug.log"

# Live worker currently stores these values directly in production.
# The repo keeps them externalized to avoid committing secrets.
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "<REDACTED_LIVE_SERVER_TOKEN>")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "<REDACTED_LIVE_SERVER_CHAT_ID>")
MIN_ALERT_LEVEL = 12
CRITICAL_ALERT_LEVEL = 15

# Severity levels to emoji mapping
SEVERITY_EMOJI = {
    'critical': '🔴',
    'high': '🟠',
}

# Alert type to emoji mapping
ALERT_TYPE_EMOJI = {
    'inbound': '📥',
    'outbound': '📤',
    'brute_force': '🔨',
    'attack': '⚔️',
    'blocked': '🛡️',
    'allowed': '⚠️',
}

def log_debug(message: str) -> None:
    try:
        with open(DEBUG_LOG, "a", encoding="utf-8") as handle:
            handle.write(f"{datetime.now().isoformat()} - {message}\n")
    except Exception:
        pass


def escape_markdown(text: Any) -> str:
    if not text:
        return "N/A"
    text = str(text)
    for char in ["_", "*", "[", "]", "`"]:
        text = text.replace(char, "\\" + char)
    return text


def get_severity_level(rule_level: int) -> str:
    if rule_level >= CRITICAL_ALERT_LEVEL:
        return 'critical'
    if rule_level >= MIN_ALERT_LEVEL:
        return 'high'
    return 'suppressed'

def format_telegram_message(alert_data: Dict[str, Any]) -> str:
    flow_type = alert_data.get('flow_type', 'unknown')
    action = alert_data.get('action', 'unknown')
    level = int(alert_data.get('level', 0))
    severity = get_severity_level(level)
    
    severity_emoji = SEVERITY_EMOJI.get(severity, '⚠️')
    flow_emoji = ALERT_TYPE_EMOJI.get(flow_type, '📊')
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    srcip = escape_markdown(alert_data.get('srcip'))
    dstip = escape_markdown(alert_data.get('dstip'))
    srcport = escape_markdown(alert_data.get('srcport'))
    dstport = escape_markdown(alert_data.get('dstport'))
    protocol = escape_markdown(alert_data.get('protocol'))
    application = escape_markdown(alert_data.get('application'))
    rule_name = escape_markdown(alert_data.get('rule_name'))
    rule_id = escape_markdown(alert_data.get('rule_id'))
    src_zone = escape_markdown(alert_data.get('src_zone'))
    dst_zone = escape_markdown(alert_data.get('dst_zone'))
    threat_description = escape_markdown(alert_data.get('threat_description'))
    recommendation = escape_markdown(alert_data.get('recommendation'))
    message = f"""
{severity_emoji} *NETWORK ANOMALY DETECTED* {flow_emoji}

🔍 *Alert Details*
├ Severity: {severity.upper()} (Level {level})
├ Type: {flow_type.upper()}
├ Action: {action.upper()}
├ Time: {timestamp}

📊 *Flow Information*
├ Source IP: `{srcip}`
├ Source Port: {srcport}
├ Dest IP: `{dstip}`
├ Dest Port: {dstport}
├ Protocol: {protocol}
├ Application: {application}

⚙️ *Policy Information*
├ Rule Name: `{rule_name}`
├ Rule ID: {rule_id}
├ Source Zone: {src_zone}
└ Dest Zone: {dst_zone}

💬 *Analysis*
{threat_description}

📋 *Recommendation*
{recommendation}
"""
    return message

def send_telegram_alert(alert_data: Dict[str, Any]) -> bool:
    try:
        message = format_telegram_message(alert_data)
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            'chat_id': TELEGRAM_CHAT_ID,
            'text': message,
            'parse_mode': 'Markdown',
            'disable_web_page_preview': True
        }
        log_debug(f"Sending rule_id={alert_data.get('rule_id')} chat_id={TELEGRAM_CHAT_ID}")
        response = requests.post(url, json=payload, timeout=10)
        log_debug(f"Telegram status={response.status_code} body={response.text[:200]}")
        return response.status_code == 200
    except Exception:
        log_debug(f"Telegram error: {traceback.format_exc()}")
        return False

def process_wazuh_alert(alert_file_path: str) -> bool:
    log_debug(f"Processing alert file: {alert_file_path}")
    try:
        with open(alert_file_path, 'r', encoding='utf-8') as handle:
            raw_data = handle.read()
            log_debug(f"RAW JSON RECEIVED: {raw_data}")
            alert_json = json.loads(raw_data)
    except Exception:
        log_debug(f"JSON load error: {traceback.format_exc()}")
        return False
    data = alert_json.get('data', {})
    rule = alert_json.get('rule', {})
    try:
        level = int(rule.get('level', 0))
    except (TypeError, ValueError):
        level = 0
    if level < MIN_ALERT_LEVEL:
        log_debug(f"Skipping rule_id={rule.get('id')} level={level} below minimum {MIN_ALERT_LEVEL}")
        return True
    alert_data = {
        'srcip': data.get('srcip'),
        'dstip': data.get('dstip'),
        'srcport': data.get('srcport'),
        'dstport': data.get('dstport'),
        'protocol': data.get('protocol'),
        'application': data.get('application', 'N/A'),
        'rule_name': data.get('rule_name'),
        'src_zone': data.get('src_zone'),
        'dst_zone': data.get('dst_zone'),
        'rule_id': rule.get('id'),
        'level': level,
        'action': 'deny' if 'DENY' in rule.get('description', '') else 'permit',
        'flow_type': 'unknown',
        'threat_description': rule.get('description'),
        'recommendation': 'Review the alert in Wazuh Dashboard for more details'
    }
    if 'inbound' in rule.get('description', '').lower():
        alert_data['flow_type'] = 'inbound'
    elif 'outbound' in rule.get('description', '').lower():
        alert_data['flow_type'] = 'outbound'
    return send_telegram_alert(alert_data)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    alert_file = sys.argv[1]
    success = process_wazuh_alert(alert_file)
    sys.exit(0 if success else 1)
