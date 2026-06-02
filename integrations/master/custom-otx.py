#!/usr/bin/env python3
"""
AlienVault OTX Integration for Wazuh
- ตรวจสอบ IP, domain, file hash ผ่าน OTX pulse count
- กรองทราฟฟิคที่ถูก block/deny ออก (ไม่ต้องแจ้งเตือน)
- ระบุอุปกรณ์ต้นทาง (FortiGate / Huawei USG / MikroTik)
- ส่ง Telegram alert พร้อม link ไปยัง Wazuh Dashboard
"""
import sys
import json
import ipaddress
import os
import re
import urllib.parse
from datetime import datetime, timedelta, timezone

try:
    import requests
except ImportError:
    sys.exit(0)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "<REDACTED_LIVE_SERVER_TOKEN>")
TELEGRAM_CHAT_ID   = os.environ.get("TELEGRAM_CHAT_ID", "<REDACTED_LIVE_SERVER_CHAT_ID>")
DASHBOARD_BASE = os.environ.get("WAZUH_DASHBOARD_URL", "https://10.251.151.14")
THAI_MONTHS    = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
                  "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]
TZ_THAI        = timezone(timedelta(hours=7))

# actions ที่หมายความว่าทราฟฟิคถูกปิดกั้น — ไม่ต้องแจ้งเตือน
BLOCKED_ACTIONS = {"block", "deny", "drop", "reset", "close", "reject", "blocked", "denied"}

def is_public_ip(ip_str):
    try:
        ip = ipaddress.ip_address(ip_str)
        return not (ip.is_private or ip.is_loopback or ip.is_multicast or
                    ip.is_link_local or ip.is_reserved or ip.is_unspecified)
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

def detect_device(data):
    """ระบุชื่ออุปกรณ์ต้นทางจาก decoded fields"""
    if data.get("devname"):
        return f"FortiGate ({data['devname']})"
    if data.get("usg_hostname"):
        return f"Huawei USG ({data['usg_hostname']})"
    if data.get("access_method"):
        return "MikroTik"
    if data.get("fgt_type"):
        return "FortiGate"
    return ""

def build_dashboard_url(timestamp_str, rule_id, ip_field, ip):
    """สร้าง Discover URL พร้อม KQL filter และ time window ±5 นาที"""
    try:
        ts = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
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
        s = re.sub(r'\.\d+', '', ts_str)
        s = re.sub(r'([+-])(\d{2})(\d{2})$', r'\1\2:\3', s)
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

def check_otx(ioc_type, value, api_key):
    url = f"https://otx.alienvault.com/api/v1/indicators/{ioc_type}/{value}/general"
    try:
        resp = requests.get(url, headers={"X-OTX-API-KEY": api_key}, timeout=8)
        return resp.json() if resp.status_code == 200 else None
    except Exception:
        return None

def parse_pulses(result):
    pi     = result.get("pulse_info", {})
    count  = pi.get("count", 0)
    pulses = pi.get("pulses", [])
    name   = pulses[0].get("name", "")[:80] if pulses else ""
    tags   = pulses[0].get("tags", [])[:6]  if pulses else []
    return count, name, tags

def parse_geo(result, ioc_type):
    """ดึง country และ ISP/ASN จาก OTX response (สำหรับ IPv4)"""
    if ioc_type != "IPv4":
        return "", ""
    country = result.get("country_code", "")
    asn_raw = result.get("asn", "")
    # asn มักอยู่ในรูป "AS12345 ISP Name" — ตัด AS number ออก
    if asn_raw and " " in asn_raw:
        isp = " ".join(asn_raw.split(" ")[1:])
    else:
        isp = asn_raw
    return country, isp

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
    syscheck    = alert_json.get("syscheck", {})
    timestamp   = alert_json.get("timestamp", "")

    # กรองทราฟฟิคที่ถูกปิดกั้นแล้ว — ไม่มีความเสี่ยงที่ต้องแจ้งเตือน
    if is_blocked_traffic(rule_groups, data):
        sys.exit(0)

    if level < 10:
        sys.exit(0)

    orig_rule_id  = rule.get("id", "N/A")
    orig_level    = rule.get("level", "N/A")
    orig_desc     = rule.get("description", "")
    agent_name    = agent.get("name", "N/A")
    device_info   = detect_device(data)

    iocs = []  # (ioc_type, value, field_label)

    for field in ["srcip", "dstip"]:
        ip = data.get(field, "").strip()
        if ip and is_public_ip(ip):
            iocs.append(("IPv4", ip, field))

    domain = (
        data.get("hostname")
        or (data.get("url", "").split("/")[2] if data.get("url", "").startswith("http") else "")
        or data.get("dns", {}).get("question", {}).get("name", "")
    )
    domain = domain.strip().rstrip(".")
    if domain and "." in domain and not domain.replace(".", "").isdigit():
        iocs.append(("domain", domain, "hostname"))

    for hfield in ["sha256_after", "md5_after"]:
        h = syscheck.get(hfield, "").strip()
        if len(h) in (32, 64):
            iocs.append(("file", h, hfield))
            break

    if not any(t == "file" for t, _, _ in iocs):
        for hfield in ["sha256", "md5", "hash"]:
            h = data.get(hfield, "").strip()
            if len(h) in (32, 64):
                iocs.append(("file", h, hfield))
                break

    if not iocs:
        sys.exit(0)

    for ioc_type, value, field in iocs:
        result = check_otx(ioc_type, value, api_key)
        if not result:
            continue

        pulse_count, first_name, tags = parse_pulses(result)
        if pulse_count == 0:
            continue

        country, isp = parse_geo(result, ioc_type)

        output = {
            "otx_status":      "malicious",
            "otx_ioc_type":    ioc_type,
            "otx_pulse_count": pulse_count,
            "otx_ip":          value if ioc_type == "IPv4"   else "",
            "otx_ip_type":     field if ioc_type == "IPv4"   else "",
            "otx_domain":      value if ioc_type == "domain" else "",
            "otx_hash":        value if ioc_type == "file"   else "",
            "otx_pulse_name":  first_name,
            "otx_tags":        ", ".join(tags),
            "otx_original_description": orig_desc,
        }
        print(json.dumps(output))

        # ส่ง Telegram เฉพาะ High (12-14) และ Critical (15+) เท่านั้น
        if level < 12:
            continue

        severity = "อันตรายสูงมาก" if pulse_count >= 5 else "น่าสงสัย"
        flag     = "🔴" if pulse_count >= 5 else "🟡"
        labels   = {"IPv4": "IP", "domain": "โดเมน", "file": "File Hash"}
        label    = labels.get(ioc_type, ioc_type)
        dash_url = build_dashboard_url(timestamp, orig_rule_id, field, value)

        dstip   = data.get("dstip", data.get("dst_ip", ""))
        dstport = data.get("dstport", "")
        dst_info = f"<code>{dstip}:{dstport}</code>" if dstip and dstport else (f"<code>{dstip}</code>" if dstip else "")

        tags_str = "  ·  ".join(tags) if tags else "—"

        msg  = f"{flag} <b>แจ้งเตือน OTX Threat Intelligence — {severity}</b>\n"
        msg += "─────────────────────────────\n"

        msg += f"🔍 <b>{label}:</b>  <code>{value}</code>  ({field})\n"
        if dst_info:
            msg += f"🎯 <b>ปลายทาง:</b>  {dst_info}\n"
        if country:
            msg += f"🏳️ <b>ประเทศ:</b>  {country}"
            if isp:
                msg += f"  ·  🏢 <b>ISP:</b>  {isp}"
            msg += "\n"
        msg += f"📊 <b>Threat Feeds:</b>  {pulse_count:,} pulses\n"
        if tags:
            msg += f"🏷️ <b>หมวดหมู่:</b>  {tags_str}\n"
        if first_name:
            msg += f"📋 <b>Feed หลัก:</b>  {first_name}\n"
        if timestamp:
            msg += f"🕐 <b>เวลาตรวจพบ:</b>  {fmt_ts(timestamp)}\n"

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
