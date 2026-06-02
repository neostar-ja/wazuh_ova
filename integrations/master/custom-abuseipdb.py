#!/usr/bin/env python3
"""
AbuseIPDB Integration for Wazuh
- Per-IP cache (TTL 1 hour, max 500 entries) to stay within free-tier 1000 req/day
- กรองทราฟฟิคที่ถูก block/deny ออก (ไม่ต้องแจ้งเตือน)
- ระบุอุปกรณ์ต้นทาง (FortiGate / Huawei USG / MikroTik)
- ส่ง Telegram alert พร้อม link ไปยัง Wazuh Dashboard
"""
import sys
import json
import os
import time
import ipaddress
import re
import urllib.parse
from datetime import datetime, timedelta, timezone

try:
    import requests
except ImportError:
    sys.exit(0)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "<REDACTED_LIVE_SERVER_TOKEN>")
TELEGRAM_CHAT_ID   = os.environ.get("TELEGRAM_CHAT_ID", "<REDACTED_LIVE_SERVER_CHAT_ID>")
DASHBOARD_BASE     = os.environ.get("WAZUH_DASHBOARD_URL", "https://10.251.151.14")
THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
               "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]
TZ_THAI     = timezone(timedelta(hours=7))
CACHE_FILE  = "/var/ossec/tmp/abuseipdb_cache.json"
CACHE_TTL          = 3600
CACHE_MAX          = 500

# actions ที่หมายความว่าทราฟฟิคถูกปิดกั้น — ไม่ต้องแจ้งเตือน
BLOCKED_ACTIONS = {"block", "deny", "drop", "reset", "close", "reject", "blocked", "denied"}

def is_public_ip(ip_str):
    try:
        ip = ipaddress.ip_address(ip_str)
        return not (ip.is_private or ip.is_loopback or
                    ip.is_multicast or ip.is_link_local or
                    ip.is_reserved or ip.is_unspecified)
    except Exception:
        return False

def is_blocked_traffic(rule_groups, data):
    """คืนค่า True ถ้าทราฟฟิคถูกปิดกั้นโดย firewall แล้ว (ไม่ต้องแจ้งเตือน)"""
    if "firewall_drop" in rule_groups:
        return True
    action = (
        data.get("action", "")
        or data.get("fgt_action", "")
        or data.get("usg_action", "")
    ).lower().strip()
    return any(a in action for a in BLOCKED_ACTIONS)

# syslog source IP → ชื่ออุปกรณ์ (fallback เมื่อ decoded fields ไม่ครบ)
LOCATION_DEVICE_MAP = {
    "10.251.151.1": "FortiGate",
    "10.251.0.5":   "Huawei USG (WUH-B-DC-USG6712E-1)",
    "10.251.1.3":   "Huawei Firewall",
    "10.252.0.1":   "MikroTik",
}

def detect_device(data, location=""):
    """ระบุชื่ออุปกรณ์ต้นทาง — ตรวจ decoded fields ก่อน แล้ว fallback ด้วย syslog source IP"""
    if data.get("devname"):
        return f"FortiGate ({data['devname']})"
    if data.get("usg_hostname"):
        return f"Huawei USG ({data['usg_hostname']})"
    if data.get("access_method"):
        return "MikroTik"
    if data.get("fgt_type"):
        return "FortiGate"
    # Huawei zone-based firewall fields (dst_zone/src_zone/rule_name จาก SECLOG)
    if data.get("dst_zone") or data.get("src_zone") or data.get("rule_name"):
        return "Huawei Firewall"
    # fallback: map syslog source IP → device name
    for ip, name in LOCATION_DEVICE_MAP.items():
        if location and ip in location:
            return name
    return ""

def _norm_ts(ts_str):
    """Normalize timestamp string ให้ fromisoformat รับได้ทุก format"""
    s = re.sub(r'\.\d+', '', ts_str)                      # strip .ms
    s = re.sub(r'([+-])(\d{2})(\d{2})$', r'\1\2:\3', s)  # +0000 → +00:00
    return s.replace("Z", "+00:00")

def build_dashboard_url(timestamp_str, rule_id, ip_field, ip):
    """สร้าง Discover URL พร้อม KQL filter และ time window ±5 นาที"""
    try:
        ts = datetime.fromisoformat(_norm_ts(timestamp_str))
        t_from = (ts - timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        t_to   = (ts + timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    except Exception:
        t_from, t_to = "now-1h", "now"
    kql = f'rule.id:{rule_id} AND data.{ip_field}:"{ip}"'
    return (
        f"{DASHBOARD_BASE}/app/discover#/"
        f"?_g=(time:(from:'{t_from}',to:'{t_to}'))"
        f"&_a=(index:'wazuh-alerts-*',"
        f"query:(language:kuery,query:'{urllib.parse.quote(kql, safe='')}'))"
    )

def fmt_ts(ts_str):
    """แปลง ISO timestamp เป็นเวลาไทย (UTC+7, พ.ศ.)"""
    try:
        s = re.sub(r'\.\d+', '', ts_str)                          # ตัด .milliseconds
        s = re.sub(r'([+-])(\d{2})(\d{2})$', r'\1\2:\3', s)      # +0000 → +00:00
        s = s.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        dt_th = dt.astimezone(TZ_THAI)
        month = THAI_MONTHS[dt_th.month - 1]
        return f"{dt_th.day:02d} {month} {dt_th.year + 543}  {dt_th.hour:02d}:{dt_th.minute:02d} น."
    except Exception:
        return ts_str

def send_telegram(msg):
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        requests.post(url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": msg,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }, timeout=10)
    except Exception:
        pass

def load_cache():
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE) as f:
                return json.load(f)
    except Exception:
        pass
    return {}

def save_cache(cache):
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f)
    except Exception:
        pass

def get_cached(ip):
    cache = load_cache()
    entry = cache.get(ip)
    if entry and (time.time() - entry.get("ts", 0)) < CACHE_TTL:
        return entry.get("data")
    return None

def set_cache(ip, data):
    cache = load_cache()
    cache[ip] = {"ts": time.time(), "data": data}
    if len(cache) > CACHE_MAX:
        oldest_keys = sorted(cache, key=lambda k: cache[k].get("ts", 0))[:100]
        for k in oldest_keys:
            del cache[k]
    save_cache(cache)

def check_abuseipdb(ip, api_key):
    cached = get_cached(ip)
    if cached is not None:
        return cached
    url     = "https://api.abuseipdb.com/api/v2/check"
    headers = {"Accept": "application/json", "Key": api_key}
    params  = {"ipAddress": ip, "maxAgeInDays": 30, "verbose": ""}
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        if resp.status_code != 200:
            return None
        data = resp.json().get("data", {})
        set_cache(ip, data)
        return data
    except Exception:
        return None

def main():
    if len(sys.argv) < 3:
        sys.exit(0)
    try:
        with open(sys.argv[1]) as f:
            alert_json = json.load(f)
    except Exception:
        sys.exit(0)

    api_key     = sys.argv[2]
    data        = alert_json.get("data", {})
    rule        = alert_json.get("rule", {})
    level       = int(rule.get("level", 0))
    rule_groups = set(rule.get("groups", []))
    agent       = alert_json.get("agent", {})
    timestamp   = alert_json.get("timestamp", "")

    # กรองทราฟฟิคที่ถูกปิดกั้นแล้ว — ไม่มีความเสี่ยงที่ต้องแจ้งเตือน
    if is_blocked_traffic(rule_groups, data):
        sys.exit(0)

    if level < 10:
        sys.exit(0)

    ip_to_check = None
    ip_field    = None
    for field in ["srcip", "src_ip", "remote_ip", "dstip", "dst_ip"]:
        val = data.get(field, "")
        if val and is_public_ip(val):
            ip_to_check = val
            ip_field    = field
            break

    if not ip_to_check:
        sys.exit(0)

    result = check_abuseipdb(ip_to_check, api_key)
    if not result:
        sys.exit(0)

    score        = result.get("abuseConfidenceScore", 0)
    if score < 50:
        sys.exit(0)
    if result.get("isWhitelisted", False):
        sys.exit(0)

    country       = result.get("countryCode", "")
    isp           = result.get("isp", "")
    last_seen     = result.get("lastReportedAt", "")
    total_reports = result.get("totalReports", 0)
    domain        = result.get("domain", "")
    is_tor        = result.get("isTor", False)

    severity  = "อันตรายสูงมาก" if score >= 80 else "น่าสงสัย"
    flag      = "🔴" if score >= 80 else "🟡"
    tor_badge = "  🧅 <b>TOR Node</b>" if is_tor else ""
    is_allowed = "firewall_allowed" in rule_groups

    output = {
        "integration": "abuseipdb",
        "abuseipdb": {
            "ip":         ip_to_check,
            "field":      ip_field,
            "score":      score,
            "severity":   "MALICIOUS" if score >= 80 else "SUSPICIOUS",
            "reports":    total_reports,
            "country":    country,
            "isp":        isp,
            "domain":     domain,
            "is_tor":     is_tor,
            "last_seen":  last_seen,
        }
    }
    print(json.dumps(output))

    # ส่ง Telegram เฉพาะ High (12-14) และ Critical (15+) เท่านั้น
    if level < 12:
        sys.exit(0)

    orig_rule_id  = rule.get("id", "N/A")
    orig_level    = rule.get("level", "N/A")
    orig_desc     = rule.get("description", "N/A")
    agent_name    = agent.get("name", "N/A")
    location      = alert_json.get("location", "")
    device_info   = detect_device(data, location)
    dash_url      = build_dashboard_url(timestamp, orig_rule_id, ip_field, ip_to_check)

    dstip    = data.get("dstip", data.get("dst_ip", ""))
    dstport  = data.get("dstport", "")
    dst_info = f"<code>{dstip}:{dstport}</code>" if dstip and dstport else (f"<code>{dstip}</code>" if dstip else "")

    msg  = f"{flag} <b>แจ้งเตือน — IP {severity}</b>{tor_badge}\n"
    if is_allowed:
        msg += "⚠️ <b>TRAFFIC ALLOWED — ต้องดำเนินการด่วน!</b>\n"
    msg += "─────────────────────────────\n"

    msg += f"🌐 <b>IP:</b>  <code>{ip_to_check}</code>  ({ip_field})\n"
    if dst_info:
        msg += f"🎯 <b>ปลายทาง:</b>  {dst_info}\n"
    msg += f"📊 <b>คะแนน AbuseIPDB:</b>  {score}/100  ·  {total_reports:,} รายงาน\n"
    if country:
        msg += f"🏳️ <b>ประเทศ:</b>  {country}"
        if isp:
            msg += f"  ·  🏢 <b>ISP:</b>  {isp}"
        msg += "\n"
    if domain:
        msg += f"🌍 <b>โดเมน:</b>  {domain}\n"
    if last_seen:
        msg += f"🕐 <b>รายงานล่าสุด (AbuseIPDB):</b>  {fmt_ts(last_seen)}\n"
    if timestamp:
        msg += f"📅 <b>เวลาเหตุการณ์:</b>  {fmt_ts(timestamp)}\n"

    msg += "─────────────────────────────\n"
    msg += f"📌 <b>กฎที่ตรงกัน</b>\n"
    msg += f"   Rule {orig_rule_id}  (Level {orig_level})\n"
    msg += f"   {orig_desc}\n"

    msg += "─────────────────────────────\n"
    msg += f"🖥️ <b>Agent:</b>  {agent_name}\n"
    if device_info:
        msg += f"🔌 <b>อุปกรณ์:</b>  {device_info}\n"

    msg += f"\n🔗 <a href=\"{dash_url}\">ดู Log ทั้งหมดใน Dashboard</a>"

    send_telegram(msg)

if __name__ == "__main__":
    main()
