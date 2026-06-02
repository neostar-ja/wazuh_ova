#!/usr/bin/env python3
"""
Wazuh Generic Telegram Integration
- Level 12-14  → 🟠 แจ้งเตือนระดับสูง (HIGH)
- Level 15+    → 🔴 แจ้งเตือนวิกฤต (CRITICAL)
- ข้ามกลุ่มที่มี integration เฉพาะอยู่แล้ว (AbuseIPDB, OTX, Suricata)
- ระบุอุปกรณ์ต้นทาง (FortiGate / Huawei USG / MikroTik)
- แนบ link ไปยัง Wazuh Dashboard
"""
import sys
import json
import re
import os
import urllib.parse
from datetime import datetime, timedelta, timezone

try:
    import requests
except ImportError:
    sys.exit(0)

DEBUG_LOG = "/var/ossec/logs/telegram_generic_debug.log"

def dbg(msg):
    try:
        with open(DEBUG_LOG, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().isoformat()} - {msg}\n")
    except Exception:
        pass

if len(sys.argv) < 4:
    sys.exit(0)

try:
    with open(sys.argv[1]) as f:
        alert_json = json.load(f)
except Exception:
    sys.exit(0)

hook_url  = sys.argv[3]
chat_id   = sys.argv[2]

DASHBOARD_BASE = os.environ.get("WAZUH_DASHBOARD_URL", "https://10.251.151.14")
THAI_MONTHS    = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
                  "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]
TZ_THAI        = timezone(timedelta(hours=7))

# กลุ่มที่มี integration เฉพาะที่ส่ง Telegram รายละเอียดกว่าอยู่แล้ว
SKIP_GROUPS = {
    "abuseipdb", "abuseipdb_malicious", "abuseipdb_suspicious",
    "otx_intel", "otx_malicious", "otx_suspicious",
    "cdb_malicious_ip",   # AbuseIPDB integration จัดการแล้วพร้อม score/ISP/country
    "network_anomaly",
    "suricata", "ids",
}

rule        = alert_json.get("rule", {})
agent       = alert_json.get("agent", {})
data        = alert_json.get("data", {})
rule_groups = set(rule.get("groups", []))
timestamp   = alert_json.get("timestamp", "")

if SKIP_GROUPS & rule_groups:
    dbg(f"skip rule_id={rule.get('id')} groups={rule_groups & SKIP_GROUPS}")
    sys.exit(0)

level = int(rule.get("level", 0))
MIN_LEVEL = 12
if level < MIN_LEVEL:
    dbg(f"skip rule_id={rule.get('id')} level={level} < {MIN_LEVEL}")
    sys.exit(0)

# ── helpers ───────────────────────────────────────────────────

def detect_device(d):
    if d.get("devname"):     return f"FortiGate ({d['devname']})"
    if d.get("usg_hostname"): return f"Huawei USG ({d['usg_hostname']})"
    if d.get("access_method"): return "MikroTik"
    if d.get("fgt_type"):    return "FortiGate"
    return ""

def fmt_ts(ts_str):
    """แปลง ISO timestamp เป็นเวลาไทย (UTC+7, พ.ศ.)"""
    try:
        s = re.sub(r'\.\d+', '', ts_str)
        s = re.sub(r'([+-])(\d{2})(\d{2})$', r'\1\2:\3', s)
        s = s.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        dt_th = dt.astimezone(TZ_THAI)
        month = THAI_MONTHS[dt_th.month - 1]
        return f"{dt_th.day:02d} {month} {dt_th.year + 543}  {dt_th.hour:02d}:{dt_th.minute:02d} น."
    except Exception:
        return ts_str

def build_dashboard_url(ts_str, rule_id, agent_name):
    try:
        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        t_from = (ts - timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        t_to   = (ts + timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    except Exception:
        t_from, t_to = "now-1h", "now"
    kql = f'rule.id:{rule_id} AND agent.name:"{agent_name}"'
    return (
        f"{DASHBOARD_BASE}/app/discover#/"
        f"?_g=(time:(from:'{t_from}',to:'{t_to}'))"
        f"&_a=(index:'wazuh-alerts-*',"
        f"query:(language:kuery,query:'{urllib.parse.quote(kql, safe='')}'))"
    )

# ── build message ─────────────────────────────────────────────

rid        = rule.get("id", "?")
desc       = rule.get("description", "?")
aname      = agent.get("name", "?")
device     = detect_device(data)
dash_url   = build_dashboard_url(timestamp, rid, aname)

# ข้อมูลเสริมจาก data fields
srcip   = data.get("srcip", data.get("src_ip", ""))
dstip   = data.get("dstip", data.get("dst_ip", ""))
dstport = data.get("dstport", "")
username = data.get("username", data.get("user", ""))

if level >= 15:
    flag  = "🔴"
    label = "วิกฤต (CRITICAL)"
else:
    flag  = "🟠"
    label = "สูง (HIGH)"

msg  = f"{flag} <b>แจ้งเตือน Wazuh — {label}  Level {level}</b>\n"
msg += "─────────────────────────────\n"
msg += f"📝 {desc}\n"

# แสดงข้อมูลเสริมเฉพาะที่มีค่า
if srcip:
    msg += f"🌐 <b>IP ต้นทาง:</b>  <code>{srcip}</code>\n"
if dstip:
    dst_str = f"{dstip}:{dstport}" if dstport else dstip
    msg += f"🎯 <b>ปลายทาง:</b>  <code>{dst_str}</code>\n"
if username:
    msg += f"👤 <b>ผู้ใช้:</b>  <code>{username}</code>\n"

msg += "─────────────────────────────\n"
msg += f"📋 <b>Rule {rid}</b>  (Level {level})\n"
if timestamp:
    msg += f"🕐 <b>เวลา:</b>  {fmt_ts(timestamp)}\n"

msg += "─────────────────────────────\n"
msg += f"🖥️ <b>Agent:</b>  {aname}\n"
if device:
    msg += f"🔌 <b>อุปกรณ์:</b>  {device}\n"

msg += f"\n🔗 <a href=\"{dash_url}\">ดู Log ทั้งหมดใน Dashboard</a>"

try:
    dbg(f"sending rule_id={rid} level={level} agent={aname}")
    resp = requests.post(hook_url, json={
        "chat_id": chat_id,
        "text": msg,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }, timeout=10)
    dbg(f"status={resp.status_code}")
except Exception as e:
    dbg(f"send error rule_id={rid}: {e}")
