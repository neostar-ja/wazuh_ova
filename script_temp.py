#!/usr/bin/env python3
import sys
import json
import requests
import traceback
import os
from datetime import datetime
from typing import Dict, Any

DEBUG_LOG = "/var/ossec/logs/telegram_anomaly_debug.log"

def log_debug(msg):
    try:
        with open(DEBUG_LOG, "a") as f:
            f.write(f"{datetime.now().isoformat()} - {msg}\n")
    except:
        pass

def escape_markdown(text) -> str:
    if not text:
        return "N/A"
    text = str(text)
    # Escape special markdown characters for safe rendering in text fields
    for c in ['_', '*', '[', ']', '`']:
        text = text.replace(c, '\\' + c)
    return text

# Telegram Configuration (use environment variables)
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "<REPLACE_WITH_TELEGRAM_BOT_TOKEN>")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "<REPLACE_WITH_TELEGRAM_CHAT_ID>")

SEVERITY_EMOJI = {'critical': '🔴', 'high': '🟠', 'medium': '🟡', 'low': '🟢'}
ALERT_TYPE_EMOJI = {'inbound': '📥', 'outbound': '📤', 'brute_force': '🔨', 'attack': '⚔️', 'blocked': '🛡️', 'allowed': '⚠️'}

def get_severity_level(rule_level: int, flow_type: str, action: str) -> str:
    if flow_type == 'inbound' and action == 'permit':
        return 'critical'
    elif flow_type == 'inbound':
        return 'high'
    elif flow_type == 'outbound' and action == 'permit':
        return 'high'
    else:
        return 'medium'

def format_telegram_message(alert_data: Dict[str, Any]) -> str:
    flow_type = alert_data.get('flow_type', 'unknown')
    action = alert_data.get('action', 'unknown')
    severity = get_severity_level(int(alert_data.get('level', 0)), flow_type, action)
    severity_emoji = SEVERITY_EMOJI.get(severity, '⚠️')
    flow_emoji = ALERT_TYPE_EMOJI.get(flow_type, '📊')
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Escape variable contents to protect formatting
    srcip = escape_markdown(alert_data.get('srcip'))
    dstip = escape_markdown(alert_data.get('dstip'))
    srcport = escape_markdown(alert_data.get('srcport'))
    dstport = escape_markdown(alert_data.get('dstport'))
    protocol = escape_markdown(alert_data.get('protocol'))
    app = escape_markdown(alert_data.get('application'))
    rule_name = escape_markdown(alert_data.get('rule_name'))
    rule_id = escape_markdown(alert_data.get('rule_id'))
    src_zone = escape_markdown(alert_data.get('src_zone'))
    dst_zone = escape_markdown(alert_data.get('dst_zone'))
    threat_desc = escape_markdown(alert_data.get('threat_description'))
    recommendation = escape_markdown(alert_data.get('recommendation'))
    
    # Construct message with fixed headers and escaped bodies
    message = f"""
{severity_emoji} *NETWORK ANOMALY DETECTED* {flow_emoji}

🔍 *Alert Details*
├ Severity: {severity.upper()}
├ Type: {flow_type.upper()}
├ Action: {action.upper()}
├ Time: {timestamp}

📊 *Flow Information*
├ Source IP: `{srcip}`
├ Source Port: {srcport}
├ Dest IP: `{dstip}`
├ Dest Port: {dstport}
├ Protocol: {protocol}
├ Application: {app}

⚙️ *Policy Information*
├ Rule Name: `{rule_name}`
├ Rule ID: {rule_id}
├ Source Zone: {src_zone}
└ Dest Zone: {dst_zone}

💬 *Analysis*
{threat_desc}

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
        log_debug(f"Sending. RuleID: {alert_data.get('rule_id')} chat: {TELEGRAM_CHAT_ID}")
        response = requests.post(url, json=payload, timeout=15)
        log_debug(f"Status: {response.status_code}, response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        log_debug(f"Error sending alert: {traceback.format_exc()}")
        return False

def process_wazuh_alert(alert_file_path: str) -> bool:
    log_debug(f"Processing: {alert_file_path}")
    try:
        with open(alert_file_path, 'r') as f:
            raw_data = f.read()
            log_debug(f"RAW JSON RECEIVED: {raw_data}")
            alert_json = json.loads(raw_data)
    except Exception as e:
        log_debug(f"JSON load error: {traceback.format_exc()}")
        return False
    
    data = alert_json.get('data', {})
    rule = alert_json.get('rule', {})
    
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
        'level': rule.get('level', 0),
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
