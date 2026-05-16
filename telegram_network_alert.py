#!/usr/bin/env python3
"""
Network Anomaly Telegram Alert Sender
Sends real-time Telegram alerts for suspicious network flows
- Internal to External with non-standard ports
- External to Internal (inbound attacks) with non-standard ports
- Both DENY and PERMIT policies
Created: 2026-05-14
"""

import sys
import json
import requests
import os
from datetime import datetime
from typing import Dict, Any

# Telegram Configuration
# Read sensitive values from environment variables. Do NOT commit secrets to Git.
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "<REPLACE_WITH_TELEGRAM_BOT_TOKEN>")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "<REPLACE_WITH_TELEGRAM_CHAT_ID>")

# Severity levels to emoji mapping
SEVERITY_EMOJI = {
    'critical': '🔴',
    'high': '🟠',
    'medium': '🟡',
    'low': '🟢'
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

def get_severity_level(rule_level: int, flow_type: str, action: str) -> str:
    """Determine severity based on rule level and context"""
    if flow_type == 'inbound' and action == 'permit':
        return 'critical'
    elif flow_type == 'inbound':
        return 'high'
    elif flow_type == 'outbound' and action == 'permit':
        return 'high'
    else:
        return 'medium'

def format_telegram_message(alert_data: Dict[str, Any]) -> str:
    """Format alert data for Telegram"""
    
    flow_type = alert_data.get('flow_type', 'unknown')
    action = alert_data.get('action', 'unknown')
    severity = get_severity_level(
        int(alert_data.get('level', 0)),
        flow_type,
        action
    )
    
    severity_emoji = SEVERITY_EMOJI.get(severity, '⚠️')
    flow_emoji = ALERT_TYPE_EMOJI.get(flow_type, '📊')
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Build message
    message = f"""
{severity_emoji} *NETWORK ANOMALY DETECTED* {flow_emoji}

🔍 **Alert Details**
├ Severity: {severity.upper()}
├ Type: {flow_type.upper()}
├ Action: {action.upper()}
├ Time: {timestamp}

📊 **Flow Information**
├ Source IP: `{alert_data.get('srcip', 'N/A')}`
├ Source Port: {alert_data.get('srcport', 'N/A')}
├ Dest IP: `{alert_data.get('dstip', 'N/A')}`
├ Dest Port: {alert_data.get('dstport', 'N/A')}
├ Protocol: {alert_data.get('protocol', 'N/A')}
├ Application: {alert_data.get('application', 'N/A')}

⚙️ **Policy Information**
├ Rule Name: `{alert_data.get('rule_name', 'N/A')}`
├ Rule ID: {alert_data.get('rule_id', 'N/A')}
├ Source Zone: {alert_data.get('src_zone', 'N/A')}
└ Dest Zone: {alert_data.get('dst_zone', 'N/A')}

💬 **Analysis**
{alert_data.get('threat_description', 'Suspicious network flow detected')}

📋 **Recommendation**
{alert_data.get('recommendation', 'Review firewall logs for more details')}
"""
    
    return message

def send_telegram_alert(alert_data: Dict[str, Any]) -> bool:
    """Send alert to Telegram"""
    
    try:
        message = format_telegram_message(alert_data)
        
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            'chat_id': TELEGRAM_CHAT_ID,
            'text': message,
            'parse_mode': 'Markdown',
            'disable_web_page_preview': True
        }
        
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200:
            return True
        else:
            return False
            
    except Exception as e:
        return False

def process_wazuh_alert(alert_file_path: str) -> bool:
    """Read Wazuh alert and send Telegram notification"""
    
    try:
        with open(alert_file_path, 'r') as f:
            alert_json = json.load(f)
    except Exception:
        return False
    
    # Extract data
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
    
    # Determine flow type
    if 'inbound' in rule.get('description', '').lower():
        alert_data['flow_type'] = 'inbound'
    elif 'outbound' in rule.get('description', '').lower():
        alert_data['flow_type'] = 'outbound'
    
    # Send to Telegram
    return send_telegram_alert(alert_data)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Usage: telegram_network_alert.py <alert_file>',
            'status': 'error'
        }))
        sys.exit(1)
    
    alert_file = sys.argv[1]
    success = process_wazuh_alert(alert_file)
    sys.exit(0 if success else 1)
