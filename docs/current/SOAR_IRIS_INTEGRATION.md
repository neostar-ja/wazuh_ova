# Shuffle SOAR + DFIR-IRIS Integration

**Completed:** 2026-05-25  
**Cluster:** Wazuh 4.14.5 (Master: 10.251.151.11)  
**SOAR VM:** 10.251.151.15 (Shuffle 3001, IRIS 443)

---

## Architecture

```
Wazuh Cluster → integratord → custom-shuffle → Shuffle WF1 (Triage)
                                                    ├── AbuseIPDB Enrich
                                                    ├── OTX Enrich
                                                    ├── IRIS Alert Create
                                                    └── Telegram Notify

              → integratord → custom-iris    → DFIR-IRIS (direct, L12+)

Analyst       → Manual trigger → Shuffle WF2 (Block IP Simulation)
                                     └── Telegram Notify (DISABLED real block)

Analyst       → Manual trigger → Shuffle WF3 (Escalate)
                                     └── Telegram Notify
```

---

## Components

| Component | Value |
|---|---|
| Shuffle URL | `http://10.251.151.15:3001` |
| IRIS URL | `https://10.251.151.15` |
| Shuffle API Key | See `.env` → `SHUFFLE_API_KEY` |
| IRIS API Key | See `.env` → `IRIS_API_KEY` |
| IRIS Customer ID | 1 |

### Shuffle Workflows

| Workflow | ID | Trigger | Level |
|---|---|---|---|
| Wazuh Triage | `3bf766d1-23cf-4639-86a2-51e911eea286` | Automatic (integratord) | L10+ |
| Block IP (Simulation) | `a44ec57c-90ed-4b32-b54d-4a546c8ecb97` | Manual only | — |
| Escalate | `6d68ca79-1a8d-4a14-a709-a81715ab34fe` | Manual only | — |

---

## Wazuh ossec.conf Integration Blocks

Location: `10.251.151.11:/var/ossec/etc/ossec.conf`

```xml
<!-- SHUFFLE: Level 10+ alerts (auto-triage) -->
<integration>
  <name>custom-shuffle</name>
  <hook_url>http://10.251.151.15:3001/api/v1/workflows/3bf766d1.../execute</hook_url>
  <api_key>f58c3878-...</api_key>
  <level>10</level>
  <alert_format>json</alert_format>
</integration>

<!-- SHUFFLE: Group-based (brute_force, malware, ids, etc.) -->
<integration>
  <name>custom-shuffle</name>
  <hook_url>http://10.251.151.15:3001/api/v1/workflows/3bf766d1.../execute</hook_url>
  <api_key>f58c3878-...</api_key>
  <group>brute_force,malware,ids,otx_malicious,abuseipdb_malicious,rpz_storm,dga_malware,dns_axfr,</group>
  <alert_format>json</alert_format>
</integration>

<!-- IRIS: Direct critical alerts L12+ -->
<integration>
  <name>custom-iris</name>
  <hook_url>https://10.251.151.15/alerts/add</hook_url>
  <api_key>Fw9Pvr...</api_key>
  <level>12</level>
  <alert_format>json</alert_format>
</integration>
```

---

## Integration Scripts

Both scripts at: `10.251.151.11:/var/ossec/integrations/`

| File | Purpose |
|---|---|
| `custom-shuffle` | Send L10+ alerts to Shuffle WF1 execute endpoint |
| `custom-iris` | Create DFIR-IRIS alerts for L12+ alerts |

Scripts are named without `.py` extension — Wazuh integratord requires this.

---

## Shuffle WF1 Triage — Node Details

1. **Parse Alert** (Shuffle Tools `repeat_back_to_me`) — start node, parses execution arg
2. **AbuseIPDB Check** (HTTP GET) — checks `$exec.execution_argument.data.srcip` against AbuseIPDB
3. **OTX Check** (HTTP GET) — checks srcip against AlienVault OTX
4. **Create IRIS Alert** (HTTP POST) — creates alert in DFIR-IRIS with enrichment
5. **Telegram Notify** (HTTP POST) — sends message to WUH-Wazuh group

Variable path in Shuffle: `$exec.execution_argument.<field>` (e.g., `$exec.execution_argument.rule.level`)

---

## Manual Workflow Triggers

### Block IP Simulation (WF2 — DRY-RUN only)

```bash
curl -s -X POST "http://10.251.151.15:3001/api/v1/workflows/a44ec57c-90ed-4b32-b54d-4a546c8ecb97/execute" \
  -H "Authorization: Bearer f58c3878-a71a-434e-8297-9f303a42379c" \
  -H "Content-Type: application/json" \
  -d '{"execution_argument": {"ip": "1.2.3.4", "case_id": "IRIS-001", "analyst": "soc-admin", "reason": "Confirmed brute force"}, "start": ""}'
```

**Note:** Active Response is DISABLED. This workflow sends Telegram notification only.

### Escalate to Senior Analyst (WF3)

```bash
curl -s -X POST "http://10.251.151.15:3001/api/v1/workflows/6d68ca79-1a8d-4a14-a709-a81715ab34fe/execute" \
  -H "Authorization: Bearer f58c3878-a71a-434e-8297-9f303a42379c" \
  -H "Content-Type: application/json" \
  -d '{"execution_argument": {"case_id": "IRIS-001", "case_title": "SSH Brute Force", "severity": "High", "analyst": "soc-admin"}, "start": ""}'
```

---

## Verification

| Check | Command |
|---|---|
| Shuffle health | `curl http://10.251.151.15:3001/api/v1/health` |
| IRIS health | `curl -k https://10.251.151.15/api/ping` |
| integratord status | SSH to master: `sudo /var/ossec/bin/wazuh-control status \| grep integratord` |
| Integration log | SSH to master: `sudo cat /var/ossec/logs/integrations.log` |
| IRIS alert count | `curl -sk -H "Authorization: Bearer <KEY>" https://10.251.151.15/alerts/filter` |
| Shuffle executions | Shuffle UI → Workflows → Wazuh Triage → Runs |

---

## Key Technical Notes

- **IRIS API paths**: Use `/alerts/add`, `/manage/customers/list` — NOT `/api/v2/...` prefix
- **Shuffle HTTP app**: Use `GET`/`POST` function names, not `call_url` (v1.4.0)
- **Wazuh script naming**: Integration scripts must have NO `.py` extension in `/var/ossec/integrations/`
- **Shuffle variable path**: `$exec.execution_argument.*` not `$exec.*` when triggered via execute endpoint
- **self-signed cert**: IRIS uses self-signed cert; `verify: false` set in Shuffle HTTP actions
