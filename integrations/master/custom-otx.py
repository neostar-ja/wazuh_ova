#!/usr/bin/env python3
"""
AlienVault OTX Integration for Wazuh
Checks IPs, domains, and file hashes via pulse_count (not deprecated reputation field)
Sends rich Telegram alert on any hit
"""
import sys
import json
import ipaddress
import os

import requests

# Live server currently stores these values directly in production.
# The repo keeps them externalized to avoid committing secrets.
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "<REDACTED_LIVE_SERVER_TOKEN>")
TELEGRAM_CHAT_ID   = os.environ.get("TELEGRAM_CHAT_ID", "<REDACTED_LIVE_SERVER_CHAT_ID>")

def is_public_ip(ip_str):
    try:
        ip = ipaddress.ip_address(ip_str)
        return not (ip.is_private or ip.is_loopback or ip.is_multicast or
                    ip.is_link_local or ip.is_reserved or ip.is_unspecified)
    except Exception:
        return False

def send_telegram(msg):
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        requests.post(url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": msg,
            "parse_mode": "Markdown"
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
    pi      = result.get("pulse_info", {})
    count   = pi.get("count", 0)
    pulses  = pi.get("pulses", [])
    name    = pulses[0].get("name", "")[:80] if pulses else ""
    tags    = pulses[0].get("tags", [])[:5]  if pulses else []
    return count, name, tags

def main():
    if len(sys.argv) < 3:
        sys.exit(0)
    try:
        with open(sys.argv[1]) as f:
            alert_json = json.load(f)
    except Exception:
        sys.exit(0)

    api_key    = sys.argv[2]
    data       = alert_json.get("data", {})
    rule       = alert_json.get("rule", {})
    level      = int(rule.get("level", 0))
    if level < 12:
        sys.exit(0)
    agent      = alert_json.get("agent", {})
    syscheck   = alert_json.get("syscheck", {})
    orig_desc  = rule.get("description", "")
    agent_name = agent.get("name", "N/A")

    iocs = []  # (ioc_type, value, field_label)

    # ── IP ──────────────────────────────────────────────────
    for field in ["srcip", "dstip"]:
        ip = data.get(field, "").strip()
        if ip and is_public_ip(ip):
            iocs.append(("IPv4", ip, field))

    # ── Domain ──────────────────────────────────────────────
    domain = (
        data.get("hostname")
        or (data.get("url", "").split("/")[2] if data.get("url","").startswith("http") else "")
        or data.get("dns", {}).get("question", {}).get("name", "")
    )
    domain = domain.strip().rstrip(".")
    if domain and "." in domain and not domain.replace(".", "").isdigit():
        iocs.append(("domain", domain, "hostname"))

    # ── File hash (FIM / syscheck) ───────────────────────────
    for hfield in ["sha256_after", "md5_after"]:
        h = syscheck.get(hfield, "").strip()
        if len(h) in (32, 64):
            iocs.append(("file", h, hfield))
            break

    # ── General data hash fields ─────────────────────────────
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

        # JSON output for Wazuh rule matching
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

        # Telegram alert
        severity = "MALICIOUS" if pulse_count >= 5 else "SUSPICIOUS"
        flag     = "🔴" if pulse_count >= 5 else "🟡"
        labels   = {"IPv4": "IP", "domain": "Domain", "file": "File Hash"}
        label    = labels.get(ioc_type, ioc_type)

        msg  = f"{flag} *OTX Alert — {severity}*\n\n"
        msg += f"🔍 *{label}:* `{value}` ({field})\n"
        msg += f"📊 *Pulses:* {pulse_count} threat feed(s)\n"
        msg += f"🏷️ *Tags:* {', '.join(tags) if tags else 'N/A'}\n"
        msg += f"📋 *Feed:* {first_name}\n\n"
        msg += f"📌 *Triggered by:*\n  {orig_desc}\n"
        msg += f"🖥️ *Source:* {agent_name}"
        send_telegram(msg)

if __name__ == "__main__":
    main()
