#!/usr/bin/env python3
import datetime
import json
import sys

import requests

LOG_FILE = '/var/ossec/logs/telegram_general_debug.log'


def dbg(message):
    ts = datetime.datetime.now().isoformat()
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as handle:
            handle.write(f'{ts} - {message}\n')
    except Exception:
        pass


dbg(f'Script called. argv={sys.argv}')

if len(sys.argv) < 4:
    dbg('Not enough arguments, exit')
    sys.exit(0)

try:
    with open(sys.argv[1], encoding='utf-8') as handle:
        alert_json = json.load(handle)
except Exception as exc:
    dbg(f'Cannot read alert file: {exc}')
    sys.exit(0)

hook_url = sys.argv[3]
chat_id = sys.argv[2]

rule = alert_json.get('rule', {})
agent = alert_json.get('agent', {})
groups = rule.get('groups', [])
level = rule.get('level', '?')
rid = rule.get('id', '?')

dbg(f'Alert: rule={rid} level={level} groups={groups}')

SKIP_GROUPS = {
    'abuseipdb', 'otx_intel', 'otx_malicious', 'otx_suspicious',
    'abuseipdb_malicious', 'abuseipdb_suspicious',
    'network_anomaly',
    'suricata',
    'ids',
}
if SKIP_GROUPS & set(groups):
    dbg(f'Skipping - group in SKIP_GROUPS: {SKIP_GROUPS & set(groups)}')
    sys.exit(0)

desc = rule.get('description', '?')
aname = agent.get('name', '?')

msg = f'\U0001f514 *Wazuh Alert (Level {level})*\n'
msg += f'\U0001f4cc *Description:* {desc}\n'
msg += f'\U0001f5a5️ *Agent:* {aname}\n'
msg += f'\U0001f194 *Rule ID:* {rid}\n'

try:
    resp = requests.post(
        hook_url,
        json={
            'chat_id': chat_id,
            'text': msg,
            'parse_mode': 'Markdown'
        },
        timeout=10,
    )
    dbg(f'Telegram response: {resp.status_code} {resp.text[:100]}')
except Exception as exc:
    dbg(f'Telegram error: {exc}')
