# MISP Integration — Wazuh SIEM

**Completed:** 2026-05-25  
**MISP Version:** 2.5.34.1  
**Cluster:** Wazuh 4.14.5 (Master: 10.251.151.11)  
**SOAR VM:** 10.251.151.15 (MISP 4430, Shuffle 3001, IRIS 443)

---

## Architecture

```
MISP (10.251.151.15:4430)
  ├── Feeds: CIRCL, Feodo, URLhaus, MalwareBazaar, Botvrij, abuse.ch
  └── API key: /opt/code/wazuh_ova/.env → MISP_API_KEY

Wazuh Master (10.251.151.11)
  ├── Method 1: CDB List Sync (hourly)
  │     /etc/cron.hourly/misp-sync → /opt/misp-to-cdb.py
  │     → Wazuh API upload → /var/ossec/etc/lists/misp-*
  │
  └── Method 2: Real-time Query (per alert)
        integratord → /var/ossec/integrations/custom-misp → custom-misp.py
        → MISP /attributes/restSearch
        → Wazuh rule 100620-100624 (level 10-14)
```

---

## Infrastructure

| Component | Location | Port |
|-----------|----------|------|
| MISP Web | 10.251.151.15 | 4430 (HTTPS) |
| MISP DB | Docker: misp_db | internal |
| MISP Redis | Docker: misp_redis | internal |
| MISP Modules | Docker: misp_modules | internal |
| MISP Mail | Docker: misp_mail | internal |

### Docker Container Names
All containers prefixed with `misp_` — managed at `/opt/misp-docker/` on SOAR VM.

---

## MISP Credentials

| Item | Value |
|------|-------|
| Admin Email | misp-admin@hospital.wu.ac.th |
| Admin Password | see `.env` → `MISP_ADMIN_PASS` |
| API Key | see `.env` → `MISP_API_KEY` |
| Web URL | https://10.251.151.15:4430 |

---

## Threat Feeds Active

| Feed ID | Name | Type |
|---------|------|------|
| 1 | CIRCL OSINT Feed | Event |
| 2 | The Botvrij.eu Data | Event |
| 12 | Feodo IP Blocklist | CSV (C2 IPs) |
| 34 | abuse.ch SSL IPBL | CSV |
| 41 | URLHaus Malware URLs | CSV |
| 61 | Malware Bazaar | CSV |
| 64 | MalwareBazaar | CSV |
| 65 | URLhaus | CSV |

---

## Method 1: CDB List Sync

**Script:** `/opt/misp-to-cdb.py` (Wazuh Master)  
**Source:** `/opt/code/wazuh_ova/integrations/misp/misp-to-cdb.py`  
**Config:** `/etc/misp-integration.env` on Master  
**Cron:** `/etc/cron.hourly/misp-sync` (runs every hour)  
**CDB output:** `/var/ossec/etc/lists/misp-*`

### IOC Types Synced

| MISP type | CDB filename |
|-----------|-------------|
| ip-dst | misp-ip-dst |
| ip-src | misp-ip-src |
| domain | misp-domains |
| hostname | misp-hostnames |
| md5 | misp-md5 |
| sha256 | misp-sha256 |
| url | misp-urls |

### Manual sync
```bash
ssh wazuh-user@10.251.151.11
sudo python3 /opt/misp-to-cdb.py
sudo ls -lh /var/ossec/etc/lists/misp-*
```

---

## Method 2: Real-time Query

**Scripts:** `/var/ossec/integrations/custom-misp` (shell wrapper) + `custom-misp.py`  
**ossec.conf group trigger:** `syscheck, ids, fortigate, firewall_drop, authentication_failed, brute_force, infoblox_dns`  
**Config read:** `/etc/misp-integration.env` then `/opt/code/wazuh_ova/.env`

### Integration block in ossec.conf
```xml
<integration>
  <name>custom-misp</name>
  <hook_url>https://10.251.151.15:4430</hook_url>
  <api_key><!-- see MISP_API_KEY in .env --></api_key>
  <group>syscheck,ids,fortigate,firewall_drop,authentication_failed,brute_force,infoblox_dns,</group>
  <alert_format>json</alert_format>
</integration>
```

### Wazuh Rules (1009-misp-rules.xml)

| Rule ID | Level | Description |
|---------|-------|-------------|
| 100620 | 10 | Base MISP integration event |
| 100621 | 3 | MISP API error |
| 100622 | 12 | IOC match found (any category) |
| 100623 | 14 | Malware IOC detected |
| 100624 | 13 | High-confidence IOC (5+ events) |

---

## Shuffle SOAR Integration

Add MISP check node to Shuffle Triage Workflow (manual via UI):

- **Workflow:** Wazuh Triage (`3bf766d1-23cf-4639-86a2-51e911eea286`)
- **Node name:** `misp_check`
- **Type:** HTTP → POST
- **URL:** `https://10.251.151.15:4430/attributes/restSearch`
- **Headers:**
  ```
  Authorization: <MISP_API_KEY from .env>
  Accept: application/json
  Content-Type: application/json
  ```
- **Body:**
  ```json
  {"returnFormat":"json","value":"$exec.execution_argument.data.srcip","to_ids":1,"enforceWarninglist":1}
  ```
- **Connect:** after AbuseIPDB node, output feeds into IRIS case description

---

## Maintenance

### Check MISP status
```bash
export SSHPASS='bB7#skBI$Tnu5S'
sshpass -e ssh wazuh_user@10.251.151.15 \
  "echo 'bB7#skBI\$Tnu5S' | sudo -S docker ps --filter 'name=misp_'"
```

### Force feed cache update
```bash
source /opt/code/wazuh_ova/.env
curl -sk -X POST -H "Authorization: ${MISP_API_KEY}" \
  -H "Accept: application/json" \
  "${MISP_URL}/feeds/cacheFeeds/all"
```

### Check IOC count
```bash
source /opt/code/wazuh_ova/.env
curl -sk -H "Authorization: ${MISP_API_KEY}" \
  -H "Accept: application/json" \
  "${MISP_URL}/attributes/attributeStatistics" | python3 -m json.tool
```

### Test MISP query for an IP
```bash
source /opt/code/wazuh_ova/.env
curl -sk -X POST \
  -H "Authorization: ${MISP_API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"returnFormat":"json","value":"194.165.16.72","enforceWarninglist":1}' \
  "${MISP_URL}/attributes/restSearch" | python3 -c "
import sys, json
d = json.load(sys.stdin)
attrs = d.get('response', {}).get('Attribute', [])
print(f'{len(attrs)} matches')
for a in attrs[:3]:
    print(f'  {a.get(\"type\")} | {a.get(\"category\")} | event={a.get(\"event_id\")}')
"
```

### CDB sync log
```bash
ssh wazuh-user@10.251.151.11 "sudo tail -20 /var/log/misp-cdb-sync.log"
```

---

## Key Technical Notes

- **MISP API auth**: 40-char key in `Authorization: <key>` header (not Bearer)
- **authkey management**: Use `docker exec misp_core /var/www/MISP/app/Console/cake User change_authkey 1` to regenerate
- **No compliance tags**: Wazuh 4.14.5 does not support `<pci_dss>`, `<gdpr>`, `<nist_800_53>` in custom rules
- **Private IPs filtered**: custom-misp.py skips RFC1918 addresses automatically
- **MISP env file on Master**: `/etc/misp-integration.env` (owner: root:wazuh, mode: 640)
- **Feed cache**: Takes 10-30 min on first run; check MISP UI → Sync Actions → List Feeds

---

## File Locations

| File | Location |
|------|----------|
| MISP Docker config | 10.251.151.15:/opt/misp-docker/.env |
| MISP compose override | 10.251.151.15:/opt/misp-docker/docker-compose.override.yml |
| CDB sync script | 10.251.151.11:/opt/misp-to-cdb.py |
| Real-time script | 10.251.151.11:/var/ossec/integrations/custom-misp.py |
| Shell wrapper | 10.251.151.11:/var/ossec/integrations/custom-misp |
| Rules | 10.251.151.11:/var/ossec/etc/rules/1009-misp-rules.xml |
| MISP env on Master | 10.251.151.11:/etc/misp-integration.env |
| Hourly cron | 10.251.151.11:/etc/cron.hourly/misp-sync |
| Sync log | 10.251.151.11:/var/log/misp-cdb-sync.log |
