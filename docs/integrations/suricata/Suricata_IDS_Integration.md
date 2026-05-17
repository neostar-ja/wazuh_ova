# Suricata IDS Integration with Wazuh + Telegram

**Deployed:** 2026-05-16
**Version:** Suricata 7.0.10 | Wazuh 4.14.5
**Status:** Production ✅

---

## Architecture Overview

```
Network Traffic (eth0)
       │  AF_PACKET (passive, no drop)
       ▼
┌──────────────────────────────────┐
│  Worker Node: 10.251.151.12      │
│  Amazon Linux 2023               │
│                                  │
│  Suricata 7.0.10 (IDS mode)      │
│  ├─ ET Open Rules (50,155)       │
│  ├─ Custom local.rules (7 rules) │
│  └─ /var/log/suricata/eve.json   │
│                                  │
│  Wazuh Manager (logcollector)    │
│  └─ reads eve.json → alerts      │
└──────────────────────────────────┘
       │  Cluster TCP:1516
       ▼
┌──────────────────────────────────┐
│  Master Node: 10.251.151.11      │
│                                  │
│  Wazuh Rules                     │
│  └─ 1006-suricata-ids-rules.xml  │
│     (IDs 200000–200050)          │
│                                  │
│  Wazuh Integration               │
│  └─ custom-suricata-telegram     │
│     trigger: group=suricata      │
│              level >= 12         │
└──────────────────────────────────┘
       │  Telegram Bot API
       ▼
  📱 Telegram Notification
```

---

## Infrastructure

| Component | IP | Role |
|-----------|-----|------|
| Worker | 10.251.151.12 | Suricata IDS + Wazuh Agent |
| Master | 10.251.151.11 | Wazuh Manager + Rules |
| Indexer | 10.251.151.13 | OpenSearch :9200 |
| Dashboard | 10.251.151.14 | Wazuh Dashboard :443 |

---

## Installation Summary

### Suricata (Worker Node)

| Item | Value |
|------|-------|
| Version | 7.0.10 (built from source) |
| Installation method | Source build (DPDK/Hyperscan not available on AL2023) |
| Interface | eth0 (AF_PACKET, cluster_flow) |
| Run mode | IDS passive — NO packet dropping |
| Config | `/etc/suricata/suricata.yaml` |
| Log output | `/var/log/suricata/eve.json` |
| Rules path | `/etc/suricata/rules/` |
| ET Open rules | 50,155 enabled |
| Custom rules | `/etc/suricata/rules/local.rules` (SIDs 9000001–9000007) |
| Rule update | `/etc/cron.d/suricata-update` (daily 03:00) |
| Service | `systemctl status suricata` |

### Wazuh Integration (Worker)

File: `/var/ossec/etc/ossec.conf` — localfile block:
```xml
<localfile>
  <log_format>json</log_format>
  <location>/var/log/suricata/eve.json</location>
  <label key="@source">suricata</label>
</localfile>
```

### Wazuh Rules (Master)

File: `/var/ossec/etc/rules/1006-suricata-ids-rules.xml`

Rule chain architecture:
```
Built-in 86600 (Suricata JSON base, requires timestamp)
└─ Built-in 86601 (event_type=alert)  ← anchor for our chain
   └─ 200000  Base alert L3
      ├─ 200001  Severity 1 (Critical)   L14 + MITRE T1190
      ├─ 200002  Severity 2 (High)       L12 + MITRE T1190
      ├─ 200003  Severity 3 (Medium)     L7
      ├─ 200004  Severity 4 (Low)        L3
      ├─ 200010  Malware/Trojan/C2 sig   L14 + MITRE T1071
      ├─ 200011  Exploit/WebApp attack   L12 + MITRE T1190
      ├─ 200012  Recon/Port scan         L8  + MITRE T1046
      ├─ 200013  Brute force             L10 + MITRE T1110
      ├─ 200014  DNS tunnel/exfil        L10 + MITRE T1071.004
      ├─ 200015  Suspicious TLS/SSL      L8  + MITRE T1573
      ├─ 200016  Policy violation        L6
      ├─ 200020  LOCAL Port scan         L10 + MITRE T1046
      ├─ 200021  LOCAL SSH brute force   L12 + MITRE T1110.001
      └─ 200050  HIGH CONFIDENCE (child of 200001/200002/200010/200011) L15
Built-in 86600
├─ 200030  Anomaly event   L5
└─ 200040  Stats event     L0 (suppressed)
```

> **Design note:** Rules 200000–200050 are children of the built-in rule 86601
> (not independent root rules). This is required because Wazuh stops evaluating
> root rules once the 86600→86601 chain fires for Suricata JSON with `timestamp`.

### Telegram Notification (Worker)

File: `/var/ossec/integrations/custom-suricata-telegram`
Local source: `/opt/code/wazuh_ova/integrations/worker/custom-suricata-telegram`

ossec.conf integration block:
```xml
<integration>
  <name>custom-suricata-telegram</name>
  <level>12</level>
  <group>suricata,</group>
  <alert_format>json</alert_format>
</integration>
```

Credentials: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` environment variables
Trigger threshold: Level ≥ 12
Severity mapping: `12-14 = HIGH`, `15+ = CRITICAL`

---

## Custom Suricata Rules (local.rules)

File: `/etc/suricata/rules/local.rules`

| SID | Description | Threshold |
|-----|-------------|-----------|
| 9000001 | Port scan detected (SYN flood) | 100 SYN/10s per src |
| 9000002 | SSH brute force attempt | 10 attempts/60s per src |
| 9000003 | Wazuh Dashboard external access | 20 connections/60s |
| 9000004 | OpenSearch API access | Any attempt |
| 9000007 | ICMP ping sweep | 10 pings/5s per src |

---

## Wazuh Dashboard

URL: `https://10.251.151.14`
Login: admin / admin

### View Suricata Alerts

1. Go to **Threat Hunting** module
2. Add filter: `rule.groups: suricata`
3. Or filter by specific rules: `rule.id: [200000 TO 200050]`

### Recommended Dashboard Panels

- **Alert Timeline**: `rule.groups:suricata AND data.event_type:alert` by 30min interval
- **Top Source IPs**: Terms on `data.src_ip.keyword` (Top 20)
- **Alert Categories**: Terms on `data.alert.category.keyword`
- **Top Signatures**: Terms on `data.alert.signature.keyword`
- **High/Critical Alerts Count**: `rule.level: [12 TO 15] AND rule.groups:suricata`

---

## Telegram Message Format

```
🔴 SURICATA IDS ALERT ⚔️

🔍 Alert Details
├ Severity: CRITICAL (Level 14)
├ Rule: 200001 — Suricata: CRITICAL alert [...]
├ Time: 2026-05-16 15:30:00

📡 IDS Signature
├ Signature: `ET MALWARE Cobalt Strike Beacon`
├ Category: `Malware Command and Control Activity Detected`
└ Suri Severity: 1

📊 Traffic
├ From: `185.220.101.1:443`
├ To: `10.251.151.12:49500`
├ Protocol: TCP
└ Flow ID: 987654321

💬 Description
Suricata: CRITICAL alert [Malware...] - ET MALWARE ...
```

Level mapping: `12-14` 🟠 HIGH | `15+` 🔴 CRITICAL

---

## Operational Reference

### Key Commands

```bash
# Check Suricata status
sudo systemctl status suricata

# Tail live alerts
sudo tail -f /var/log/suricata/eve.json | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        e = json.loads(line)
        if e.get('event_type') == 'alert':
            print(e['alert']['signature'], '|', e.get('src_ip'), '->', e.get('dest_ip'))
    except: pass
"

# Update ET rules (live reload)
sudo suricata-update --no-reload
sudo kill -USR2 $(cat /var/run/suricata/suricata.pid)

# Test config
sudo suricata -T -c /etc/suricata/suricata.yaml

# Interactive socket
sudo suricatasc -c "iface-list"
sudo suricatasc -c "dump-counters" | python3 -m json.tool

# Test Wazuh rule matching
ssh wazuh-user@10.251.151.11
echo '{"timestamp":"...","event_type":"alert",...}' | sudo /var/ossec/bin/wazuh-logtest

# Check Wazuh alerts (Worker node)
sudo tail -f /var/ossec/logs/alerts/alerts.json | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        a = json.loads(line)
        r = a.get('rule', {})
        if 'suricata' in str(r.get('groups', [])):
            print(f'Rule {r[\"id\"]} L{r[\"level\"]}: {r[\"description\"]}')
    except: pass
"
```

### Key Files

| File | Node | Purpose |
|------|------|---------|
| `/etc/suricata/suricata.yaml` | Worker | Main config |
| `/etc/suricata/rules/local.rules` | Worker | Custom environment rules |
| `/etc/suricata/threshold.config` | Worker | Noise suppression |
| `/var/log/suricata/eve.json` | Worker | Primary output → Wazuh reads this |
| `/var/log/suricata/fast.log` | Worker | Quick alert review |
| `/var/log/suricata/suricata.log` | Worker | Service log |
| `/var/ossec/etc/rules/1006-suricata-ids-rules.xml` | Master | Custom Wazuh rules |
| `/var/ossec/etc/ossec.conf` | Worker | localfile directive |
| `/var/ossec/integrations/custom-suricata-telegram` | Worker | Telegram notification |
| `/etc/cron.d/suricata-update` | Worker | Daily ET rule update |
| `/etc/logrotate.d/suricata` | Worker | Log rotation (7 days) |
| `/etc/systemd/system/suricata.service` | Worker | Systemd service |

### Local Dev Files

| File | Purpose |
|------|---------|
| `/opt/code/wazuh_ova/rules/1006-suricata-ids-rules.xml` | Source of truth for rules |
| `/opt/code/wazuh_ova/integrations/worker/custom-suricata-telegram` | Telegram script source |
| `/opt/code/wazuh_ova/scripts/deploy/deploy_suricata_ids.sh` | Re-deployment script |

---

## Issues Encountered & Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `yum install suricata` failed | Amazon Linux 2023 — no EPEL package | Built from source (suricata 7.0.10) |
| `chown root:ossec` failed | Group is `wazuh` not `ossec` on this cluster | Changed to `root:wazuh` |
| Custom rules not firing in production | Rules 200xxx were root rules; Wazuh stops evaluating after 86600→86601 chain fires | Made 200000 a child of `<if_sid>86601</if_sid>` |
| Duplicate localfile warning | Deploy script ran twice before idempotency fix | Removed duplicate with Python script |

---

## Recommendations for Next Steps

1. **Tune threshold.config** — some ET rules are noisy on this network; review `fast.log` for recurring signatures to suppress
2. **Set up SPAN/mirror port** from the MikroTik switch to eth0 on Worker to capture inter-VLAN traffic (currently only sees traffic to/from Worker itself)
3. **Dashboard panels** — create "Suricata IDS Overview" dashboard in Wazuh (see panel specs above)
4. **IPS evaluation** — after 2 weeks of IDS tuning to establish false-positive baseline, consider enabling `nfqueue` drop mode for confirmed malicious signatures only
5. **FortiGate community-id correlation** — Suricata's `community-id: true` enables cross-correlation with FortiGate flow logs for the same connection
