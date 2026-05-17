#!/usr/bin/env python3
"""
AbuseIPDB Integration for Wazuh
- Per-IP cache (TTL 1 hour, max 500 entries) to stay within free-tier 1000 req/day
- Skips RFC1918/private IPs and whitelisted IPs
- Sends rich Telegram alert when score >= 50
- Prints JSON result for Wazuh rule matching
"""
import sys
import json
import os
import time
import ipaddress

try:
    import requests
except ImportError:
    sys.exit(0)

# Live server currently stores these values directly in production.
# The repo keeps them externalized to avoid committing secrets.
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "<REDACTED_LIVE_SERVER_TOKEN>")
TELEGRAM_CHAT_ID   = os.environ.get("TELEGRAM_CHAT_ID", "<REDACTED_LIVE_SERVER_CHAT_ID>")
CACHE_FILE         = "/var/ossec/tmp/abuseipdb_cache.json"
CACHE_TTL          = 3600   # 1 hour per IP
CACHE_MAX          = 500    # max IPs to keep

def is_public_ip(ip_str):
    try:
        ip = ipaddress.ip_address(ip_str)
        return not (ip.is_private or ip.is_loopback or
                    ip.is_multicast or ip.is_link_local or
                    ip.is_reserved or ip.is_unspecified)
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

    url = "https://api.abuseipdb.com/api/v2/check"
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

    api_key = sys.argv[2]
    data    = alert_json.get("data", {})
    rule    = alert_json.get("rule", {})
    level   = int(rule.get("level", 0))
    if level < 12:
        sys.exit(0)
    agent   = alert_json.get("agent", {})

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

    score       = result.get("abuseConfidenceScore", 0)
    if score < 50:
        sys.exit(0)
    if result.get("isWhitelisted", False):
        sys.exit(0)

    country      = result.get("countryCode", "N/A")
    isp          = result.get("isp", "N/A")
    last_seen    = result.get("lastReportedAt", "N/A")
    total_reports= result.get("totalReports", 0)
    domain       = result.get("domain", "N/A")
    usage_type   = result.get("usageType", "N/A")
    is_tor       = result.get("isTor", False)

    severity = "MALICIOUS"  if score >= 80 else "SUSPICIOUS"
    flag     = "🔴"         if score >= 80 else "🟡"

    output = {
        "integration": "abuseipdb",
        "abuseipdb": {
            "ip":         ip_to_check,
            "field":      ip_field,
            "score":      score,
            "severity":   severity,
            "reports":    total_reports,
            "country":    country,
            "isp":        isp,
            "domain":     domain,
            "usage_type": usage_type,
            "is_tor":     is_tor,
            "last_seen":  last_seen,
        }
    }
    print(json.dumps(output))

    orig_rule_id   = rule.get("id", "N/A")
    orig_rule_desc = rule.get("description", "N/A")
    agent_name     = agent.get("name", "N/A")
    orig_level     = rule.get("level", "N/A")
    tor_badge      = " 🧅 TOR" if is_tor else ""

    msg  = f"{flag} *AbuseIPDB Alert — {severity}*{tor_badge}\n\n"
    msg += f"🌐 *IP:* `{ip_to_check}` ({ip_field})\n"
    msg += f"📊 *Score:* {score}/100 ({total_reports} reports)\n"
    msg += f"🏳️ *Country:* {country}\n"
    msg += f"🏢 *ISP:* {isp}\n"
    msg += f"🌍 *Domain:* {domain}\n"
    msg += f"🕐 *Last Seen:* {last_seen}\n\n"
    msg += f"📌 *Triggered by:*\n"
    msg += f"  Rule {orig_rule_id} (Level {orig_level})\n"
    msg += f"  {orig_rule_desc}\n"
    msg += f"🖥️ *Source:* {agent_name}"
    send_telegram(msg)

if __name__ == "__main__":
    main()
