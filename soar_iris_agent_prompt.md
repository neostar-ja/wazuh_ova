# Agent Prompt: Shuffle SOAR + DFIR-IRIS — Full Integration
# Target: Wazuh Cluster + Shuffle + IRIS (already installed)
# Credentials: /opt/code/wazuh_ova/.env
# Created: 2026-05-23

---

## SYSTEM CONTEXT

You are a senior SOC engineer completing the SOAR integration for Walailak
University Hospital's security operations center. Shuffle SOAR and DFIR-IRIS
are already installed on a separate VM. Your task is to:
  1. Read all credentials from .env
  2. Configure Wazuh to send alerts to Shuffle
  3. Build 3 Shuffle workflows (Triage, Block, Escalate)
  4. Connect Shuffle to DFIR-IRIS via API
  5. Test end-to-end
  6. Document everything in Thai

```
Wazuh Cluster (DO NOT modify cluster config, only ossec.conf + integration scripts):
  Master     10.251.151.11  Wazuh 4.14.5 API :55000
  Worker     10.251.151.12  Wazuh 4.14.5 + Suricata
  Indexer    10.251.151.13  OpenSearch 7.10.2 :9200
  Dashboard  10.251.151.14

SSH creds: wazuh-user / [read from .env]
Wazuh API: [read from .env WAZUH_API_USER / WAZUH_API_PASS]

SOAR VM (already running):
  Shuffle    → URL and port from .env (SHUFFLE_URL)
  DFIR-IRIS  → URL and port from .env (IRIS_URL)
  Credentials → SHUFFLE_USER, SHUFFLE_PASS, IRIS_API_KEY, IRIS_CUSTOMER_ID

Project root: /opt/code/wazuh_ova/
Credentials : /opt/code/wazuh_ova/.env
Output docs : /opt/code/wazuh_ova/docs/current/SOAR_IRIS_INTEGRATION.md
Output guide: /opt/code/wazuh_ova/docs/current/SOAR_RUNBOOK_TH.md

Human-in-the-Loop policy:
  - Workflow 1 (Triage): FULLY AUTOMATED — enrich + create IRIS case + Telegram
  - Workflow 2 (Block IP): MANUAL TRIGGER ONLY — analyst clicks in IRIS
  - Workflow 3 (Escalate): MANUAL TRIGGER ONLY — analyst clicks in IRIS
  - NO automatic blocking without human approval
```

---

## OPERATING RULES

- Read /opt/code/wazuh_ova/.env FIRST — ALL credentials come from here
- Never hardcode any password, API key, or URL
- Show exact API response before proceeding to next step
- If any step fails, STOP and diagnose — do not skip
- Test each workflow with a real alert before moving to next
- Restart Wazuh only after xmllint validation passes
- Write documentation ONLY after all tests pass

---

## PHASE 0 — READ .ENV AND DISCOVER SERVICES

### 0.1 Extract all required variables
```bash
set -a
source /opt/code/wazuh_ova/.env
set +a

echo "=== Credential check ==="
echo "WAZUH_API_USER:    ${WAZUH_API_USER:+SET}"
echo "WAZUH_API_PASS:    ${WAZUH_API_PASS:+SET}"
echo "SHUFFLE_URL:       ${SHUFFLE_URL:-NOT SET — must discover}"
echo "SHUFFLE_USER:      ${SHUFFLE_USER:+SET}"
echo "SHUFFLE_PASS:      ${SHUFFLE_PASS:+SET}"
echo "IRIS_URL:          ${IRIS_URL:-NOT SET — must discover}"
echo "IRIS_API_KEY:      ${IRIS_API_KEY:0:8}****"
echo "IRIS_CUSTOMER_ID:  ${IRIS_CUSTOMER_ID:-NOT SET}"
echo "OPENSEARCH_USER:   ${OPENSEARCH_USER:+SET}"
echo "ABUSEIPDB_KEY:     ${ABUSEIPDB_KEY:+SET}"
echo "OTX_KEY:           ${OTX_KEY:+SET}"
echo "SHODAN_KEY:        ${SHODAN_KEY:+SET}"
echo "TELEGRAM_BOT_TOKEN:${TELEGRAM_BOT_TOKEN:+SET}"
echo "TELEGRAM_CHAT_ID:  ${TELEGRAM_CHAT_ID:-NOT SET}"
```

If SHUFFLE_URL or IRIS_URL are not in .env:
```bash
echo "=== Discover Shuffle and IRIS services ==="
# Scan for running services on SOAR VM (use IP from .env or discover)
SOAR_IP="${SOAR_VM_IP:-}"
if [ -z "$SOAR_IP" ]; then
  # Try to find from existing docker containers or known range
  for ip in 10.251.151.15 10.251.151.16 10.251.151.20; do
    curl -s --max-time 2 "http://$ip:3001/api/v1/health" | grep -q "shuffle" && \
      echo "Shuffle found at: $ip:3001" && SOAR_IP=$ip && break
  done
fi

# Test Shuffle
curl -s -u "${SHUFFLE_USER:-admin}:${SHUFFLE_PASS}" \
  "${SHUFFLE_URL:-http://$SOAR_IP:3001}/api/v1/health" | \
  python3 -m json.tool 2>/dev/null | head -5 || echo "Shuffle: check URL"

# Test IRIS
curl -sk -H "Authorization: Bearer ${IRIS_API_KEY}" \
  "${IRIS_URL:-https://$SOAR_IP:8443}/api/ping" | \
  python3 -m json.tool 2>/dev/null | head -5 || echo "IRIS: check URL"
```

### 0.2 Update .env if SHUFFLE_URL or IRIS_URL were missing
```bash
# After discovery, add to .env if not present
grep -q "SHUFFLE_URL" /opt/code/wazuh_ova/.env || \
  echo "SHUFFLE_URL=http://${SOAR_IP:-10.251.151.15}:3001" >> /opt/code/wazuh_ova/.env
grep -q "IRIS_URL" /opt/code/wazuh_ova/.env || \
  echo "IRIS_URL=https://${SOAR_IP:-10.251.151.15}:8443" >> /opt/code/wazuh_ova/.env

echo "=== Updated .env ==="
grep -E "SHUFFLE_URL|IRIS_URL|SOAR" /opt/code/wazuh_ova/.env
```

### 0.3 Get Shuffle API token
```bash
source /opt/code/wazuh_ova/.env

SHUFFLE_TOKEN=$(curl -s -X POST "${SHUFFLE_URL}/api/v1/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${SHUFFLE_USER}\",\"password\":\"${SHUFFLE_PASS}\"}" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))")

echo "Shuffle token: ${SHUFFLE_TOKEN:0:20}****"
# Save for use in later phases
export SHUFFLE_TOKEN
```

### 0.4 Get IRIS customer and user info
```bash
source /opt/code/wazuh_ova/.env

echo "=== IRIS API test ==="
curl -sk -H "Authorization: Bearer ${IRIS_API_KEY}" \
  "${IRIS_URL}/api/v2/manage/customers/list" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
customers = d.get('data', [])
print(f'Customers: {len(customers)}')
for c in customers:
    print(f'  ID={c.get(\"customer_id\")} Name={c.get(\"customer_name\")}')
"

echo ""
echo "=== IRIS current user ==="
curl -sk -H "Authorization: Bearer ${IRIS_API_KEY}" \
  "${IRIS_URL}/api/v2/users/me" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
u = d.get('data', {})
print(f'User: {u.get(\"user_name\")} | ID: {u.get(\"user_id\")} | Admin: {u.get(\"user_is_service_account\")}')
"
```

If IRIS_CUSTOMER_ID is not set, get it from the API and add to .env.

---

## PHASE 1 — CREATE SHUFFLE WEBHOOK FOR WAZUH

### 1.1 Create Workflow 1: Wazuh Triage
```bash
source /opt/code/wazuh_ova/.env

# Create new workflow via Shuffle API
WORKFLOW_RESP=$(curl -s -X POST "${SHUFFLE_URL}/api/v1/workflows" \
  -H "Authorization: Bearer ${SHUFFLE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wazuh Triage — Enrich + IRIS Case",
    "description": "Auto-triage Wazuh alerts: enrich IP with AbuseIPDB/OTX/GeoIP then create DFIR-IRIS case and notify Telegram",
    "tags": ["wazuh","triage","soar"]
  }')

WORKFLOW_ID=$(echo "$WORKFLOW_RESP" | python3 -c \
  "import sys,json; print(json.load(sys.stdin).get('id',''))")
echo "Workflow 1 ID: $WORKFLOW_ID"
```

### 1.2 Get the webhook trigger URL from Shuffle
```bash
# Get webhook URL for this workflow
WEBHOOK_INFO=$(curl -s "${SHUFFLE_URL}/api/v1/workflows/${WORKFLOW_ID}" \
  -H "Authorization: Bearer ${SHUFFLE_TOKEN}")

WEBHOOK_URL=$(echo "$WEBHOOK_INFO" | python3 -c "
import sys, json
d = json.load(sys.stdin)
triggers = d.get('triggers', [])
for t in triggers:
    if t.get('app_name') == 'Webhook' or t.get('trigger_type') == 'WEBHOOK':
        print(t.get('id',''))
        break
" 2>/dev/null)

# If no webhook trigger yet, the URL pattern is:
HOOK_URL="${SHUFFLE_URL}/api/v1/hooks/webhook_${WORKFLOW_ID}"
echo "Webhook URL: ${HOOK_URL}"
echo ""
echo "=== Save webhook URL to .env ==="
grep -q "SHUFFLE_WEBHOOK_URL" /opt/code/wazuh_ova/.env || \
  echo "SHUFFLE_WEBHOOK_URL=${HOOK_URL}" >> /opt/code/wazuh_ova/.env
```

### 1.3 Create Workflow 2: Manual Block IP
```bash
BLOCK_RESP=$(curl -s -X POST "${SHUFFLE_URL}/api/v1/workflows" \
  -H "Authorization: Bearer ${SHUFFLE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manual Block IP — Active Response",
    "description": "MANUAL ONLY: Analyst triggers from IRIS to block IP via Wazuh Active Response",
    "tags": ["wazuh","block","manual"]
  }')
BLOCK_ID=$(echo "$BLOCK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
echo "Workflow 2 (Block) ID: $BLOCK_ID"
```

### 1.4 Create Workflow 3: Escalate
```bash
ESCALATE_RESP=$(curl -s -X POST "${SHUFFLE_URL}/api/v1/workflows" \
  -H "Authorization: Bearer ${SHUFFLE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Escalate to Senior Analyst",
    "description": "MANUAL ONLY: Escalate IRIS case to senior analyst via Telegram",
    "tags": ["escalate","manual"]
  }')
ESC_ID=$(echo "$ESCALATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
echo "Workflow 3 (Escalate) ID: $ESC_ID"
```

---

## PHASE 2 — CONFIGURE WAZUH TO SEND ALERTS TO SHUFFLE

### 2.1 Backup ossec.conf on Master
```bash
ssh wazuh-user@10.251.151.11 "
  sudo cp /var/ossec/etc/ossec.conf \
          /var/ossec/etc/ossec.conf.bak.$(date +%Y%m%d_%H%M%S)
  echo 'Backup created'
  ls -lh /var/ossec/etc/ossec.conf.bak.*
"
```

### 2.2 Add Shuffle integration to ossec.conf
```bash
source /opt/code/wazuh_ova/.env
HOOK=${SHUFFLE_WEBHOOK_URL:-"${SHUFFLE_URL}/api/v1/hooks/webhook_CHANGEME"}

ssh wazuh-user@10.251.151.11 "sudo bash -s" << REMOTE
FILE='/var/ossec/etc/ossec.conf'
sudo sed -i 's|</ossec_config>||g' "\$FILE"

sudo tee -a "\$FILE" > /dev/null << 'BLOCK'

  <!-- ============================================================
       SHUFFLE SOAR INTEGRATION — Added $(date +%Y-%m-%d)
       Workflow 1: Triage (auto-enrich + IRIS case)
       Level threshold: 10+ (High and Critical only)
       Groups: security-relevant groups only
  ============================================================ -->
  <integration>
    <name>shuffle</name>
    <hook_url>${HOOK}</hook_url>
    <level>10</level>
    <alert_format>json</alert_format>
  </integration>

  <!-- Specific groups for L7+ (compliance, threat intel) -->
  <integration>
    <name>shuffle</name>
    <hook_url>${HOOK}</hook_url>
    <group>brute_force,malware,ids,otx_malicious,abuseipdb_malicious,rpz_storm,dga_malware,dns_axfr,</group>
    <alert_format>json</alert_format>
  </integration>

</ossec_config>
BLOCK
echo "Integration added"
sudo tail -20 "\$FILE"
REMOTE
```

### 2.3 Validate and restart Master
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Validate XML ==='
  sudo xmllint --noout /var/ossec/etc/ossec.conf && echo 'XML: OK'

  echo '=== Restart Master ==='
  sudo /var/ossec/bin/wazuh-control restart
  sleep 30

  echo '=== Check status ==='
  sudo /var/ossec/bin/wazuh-control status | grep -E 'analysisd|integratord'

  echo '=== Check integration log ==='
  sudo tail -20 /var/ossec/logs/integrations.log 2>/dev/null || \
    sudo tail -20 /var/ossec/logs/ossec.log | grep -i 'integrat\|shuffle'
"
```

---

## PHASE 3 — BUILD WORKFLOW 1: TRIAGE (VISUAL STEPS)

Since Shuffle uses a visual workflow editor, provide instructions AND API calls
to configure the workflow nodes programmatically where possible.

### 3.1 Workflow 1 node configuration guide

Instruct the agent to configure these nodes in sequence in Shuffle UI,
OR use the Shuffle API to set execution arguments:

**Node 1: Webhook Trigger**
- Name: wazuh_alert
- Start: enabled
- Get webhook URL and verify it matches SHUFFLE_WEBHOOK_URL in .env

**Node 2: Parse Alert**
```
App: Shuffle Tools
Action: Repeat back to me
Input:
  alert_level: $exec.rule.level
  rule_id: $exec.rule.id
  description: $exec.rule.description
  groups: $exec.rule.groups
  srcip: $exec.data.srcip
  agent: $exec.agent.name
  timestamp: $exec.timestamp
  pci_dss: $exec.rule.pci_dss
  nist: $exec.rule.nist_800_53
  mitre: $exec.rule.mitre.id
  geo_country: $exec.GeoLocation.country_name
  geo_city: $exec.GeoLocation.city_name
```

**Node 3: Filter (only process if level ≥ 10)**
```
Condition: $exec.rule.level >= 10
```

**Node 4: AbuseIPDB Check**
```
App: HTTP
Method: GET
URL: https://api.abuseipdb.com/api/v2/check
Headers:
  Key: {ABUSEIPDB_KEY from .env}
  Accept: application/json
Params:
  ipAddress: $exec.data.srcip
  maxAgeInDays: 30
```

**Node 5: OTX Check**
```
App: HTTP
Method: GET
URL: https://otx.alienvault.com/api/v1/indicators/IPv4/$exec.data.srcip/general
Headers:
  X-OTX-API-KEY: {OTX_KEY from .env}
```

**Node 6: Create DFIR-IRIS Alert**
```
App: HTTP
Method: POST
URL: {IRIS_URL}/api/v2/alerts/add
Headers:
  Authorization: Bearer {IRIS_API_KEY}
  Content-Type: application/json
Body:
{
  "alert_title": "Wazuh L$exec.rule.level — $exec.rule.description",
  "alert_description": "Source IP: $exec.data.srcip | Agent: $exec.agent.name | Rule: $exec.rule.id | AbuseIPDB Score: $node.abuseipdb.data.abuseConfidenceScore%",
  "alert_source": "Wazuh SIEM",
  "alert_source_ref": "$exec.rule.id",
  "alert_source_link": "https://10.251.151.14/app/wazuh",
  "alert_severity_id": 2,
  "alert_status_id": 2,
  "alert_customer_id": {IRIS_CUSTOMER_ID},
  "alert_tags": "$exec.rule.groups",
  "alert_source_event_time": "$exec.timestamp",
  "alert_iocs": [
    {
      "ioc_value": "$exec.data.srcip",
      "ioc_description": "Source IP from Wazuh alert",
      "ioc_tlp_id": 2,
      "ioc_type_id": 76
    }
  ]
}
```

**Node 7: Telegram Notification**
```
App: HTTP
Method: POST
URL: https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage
Body:
{
  "chat_id": "{TELEGRAM_CHAT_ID}",
  "text": "🔴 *IRIS Case Created*\n📌 {alert title}\n🖥️ Agent: {agent name}\n🌐 IP: {srcip} | AbuseIPDB: {score}% | {country}\n🔗 {IRIS_URL}/case/{case_id}",
  "parse_mode": "Markdown"
}
```

### 3.2 Verify workflow 1 structure via API
```bash
source /opt/code/wazuh_ova/.env

curl -s "${SHUFFLE_URL}/api/v1/workflows/${WORKFLOW_ID}" \
  -H "Authorization: Bearer ${SHUFFLE_TOKEN}" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Workflow: {d.get(\"name\")}')
print(f'Actions: {len(d.get(\"actions\", []))}')
print(f'Triggers: {len(d.get(\"triggers\", []))}')
for a in d.get('actions', []):
    print(f'  → {a.get(\"label\",\"?\")} ({a.get(\"app_name\",\"?\")})')
"
```

---

## PHASE 4 — BUILD WORKFLOW 2: MANUAL BLOCK IP

This workflow is triggered ONLY by a webhook call from DFIR-IRIS
(when analyst clicks "Block IP" button in an IRIS case).

### 4.1 Configure Block workflow nodes

**Node 1: Webhook (from IRIS)**
- Name: iris_block_request
- Receives: { "ip": "x.x.x.x", "case_id": "123", "analyst": "username" }

**Node 2: Wazuh Active Response — Block IP**
```
App: HTTP
Method: PUT
URL: https://10.251.151.11:55000/active-response
Headers:
  Authorization: Bearer {WAZUH_JWT_TOKEN}
  Content-Type: application/json
Body:
{
  "command": "firewall-drop",
  "arguments": ["-", "$exec.ip"],
  "alert": {
    "data": {"srcip": "$exec.ip"},
    "rule": {"id": "9001", "level": 12}
  }
}
```

**Node 3: Log in IRIS Case Timeline**
```
App: HTTP
Method: POST
URL: {IRIS_URL}/api/v2/cases/{case_id}/timeline/event/add
Headers:
  Authorization: Bearer {IRIS_API_KEY}
Body:
{
  "event_title": "IP Blocked via Active Response",
  "event_content": "IP $exec.ip blocked by $exec.analyst at $(date). Wazuh firewall-drop executed on all agents.",
  "event_source": "Shuffle SOAR",
  "event_in_summary": true
}
```

**Node 4: Telegram Confirm**
```
Body: "✅ *IP Blocked*\n🚫 IP: {ip}\n👤 By: {analyst}\n📋 Case: #{case_id}\n⏰ Duration: 3600s"
```

### 4.2 Get Block workflow webhook URL
```bash
BLOCK_HOOK="${SHUFFLE_URL}/api/v1/hooks/webhook_${BLOCK_ID}"
echo "Block webhook URL: ${BLOCK_HOOK}"
grep -q "SHUFFLE_BLOCK_URL" /opt/code/wazuh_ova/.env || \
  echo "SHUFFLE_BLOCK_URL=${BLOCK_HOOK}" >> /opt/code/wazuh_ova/.env
```

---

## PHASE 5 — BUILD WORKFLOW 3: MANUAL ESCALATE

### 5.1 Configure Escalate workflow nodes

**Node 1: Webhook (from IRIS)**
- Receives: { "case_id": "123", "case_title": "...", "severity": "High", "analyst": "..." }

**Node 2: Telegram to Senior Analyst**
```
Body: "⚠️ *Escalation Required*\n📋 Case #{case_id}: {case_title}\n⚡ Severity: {severity}\n👤 Requested by: {analyst}\n🔗 {IRIS_URL}/case/{case_id}\n\nAction needed within 1 hour"
```

**Node 3: Update IRIS Case Note**
```
POST {IRIS_URL}/api/v2/cases/{case_id}/notes/add
Body: { "note_title": "Escalated", "note_content": "Case escalated at $(date) by {analyst}" }
```

---

## PHASE 6 — CONFIGURE DFIR-IRIS

### 6.1 Verify IRIS API and customer setup
```bash
source /opt/code/wazuh_ova/.env

echo "=== IRIS customers ==="
curl -sk -H "Authorization: Bearer ${IRIS_API_KEY}" \
  "${IRIS_URL}/api/v2/manage/customers/list" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
for c in d.get('data', []):
    print(f'  Customer ID={c[\"customer_id\"]} Name={c[\"customer_name\"]}')
"

echo ""
echo "=== IRIS alert statuses ==="
curl -sk -H "Authorization: Bearer ${IRIS_API_KEY}" \
  "${IRIS_URL}/api/v2/alerts/status/list" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
for s in d.get('data', []):
    print(f'  Status ID={s[\"status_id\"]} Name={s[\"status_name\"]}')
"

echo ""
echo "=== IRIS IOC types (for srcip) ==="
curl -sk -H "Authorization: Bearer ${IRIS_API_KEY}" \
  "${IRIS_URL}/api/v2/manage/ioctypes/list" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
for t in d.get('data', []):
    if 'ip' in t.get('type_name','').lower():
        print(f'  IOC type: ID={t[\"type_id\"]} Name={t[\"type_name\"]}')
" | head -10
```

### 6.2 Create Wazuh integration in IRIS (official method)
```bash
source /opt/code/wazuh_ova/.env

# Deploy official Wazuh-IRIS integration script on Master
ssh wazuh-user@10.251.151.11 "
  echo '=== Clone integration script ==='
  sudo git clone https://github.com/nateuribe/Wazuh-IRIS-integration.git /tmp/iris-int 2>/dev/null || \
    sudo git -C /tmp/iris-int pull

  echo '=== Copy script to Wazuh integrations dir ==='
  sudo cp /tmp/iris-int/custom-iris.py /var/ossec/integrations/
  sudo chmod 750 /var/ossec/integrations/custom-iris.py
  sudo chown root:wazuh /var/ossec/integrations/custom-iris.py

  echo '=== Verify script ==='
  ls -lh /var/ossec/integrations/custom-iris.py
  head -20 /var/ossec/integrations/custom-iris.py
"
```

### 6.3 Configure direct Wazuh → IRIS integration (parallel to Shuffle)
```bash
source /opt/code/wazuh_ova/.env

# Add direct IRIS integration for critical alerts (L12+)
# This creates IRIS alerts directly, without Shuffle overhead
ssh wazuh-user@10.251.151.11 "sudo bash -s" << REMOTE
FILE='/var/ossec/etc/ossec.conf'
sudo sed -i 's|</ossec_config>||g' "\$FILE"

sudo tee -a "\$FILE" > /dev/null << IRISBLOCK

  <!-- ============================================================
       DFIR-IRIS DIRECT INTEGRATION — Critical alerts L12+
       Uses custom-iris.py script
       Parallel path: Shuffle for enrichment, IRIS direct for speed
  ============================================================ -->
  <integration>
    <name>custom-iris</name>
    <hook_url>${IRIS_URL}/api/v2/alerts/add</hook_url>
    <api_key>${IRIS_API_KEY}</api_key>
    <level>12</level>
    <alert_format>json</alert_format>
  </integration>

</ossec_config>
IRISBLOCK
echo "IRIS direct integration added"
REMOTE
```

### 6.4 Validate and restart
```bash
ssh wazuh-user@10.251.151.11 "
  sudo xmllint --noout /var/ossec/etc/ossec.conf && echo 'XML: OK'
  sudo /var/ossec/bin/wazuh-control restart
  sleep 30
  sudo /var/ossec/bin/wazuh-control status | grep -E 'analysisd|integratord'
  echo '=== Integration log (last 20 lines) ==='
  sudo tail -20 /var/ossec/logs/integrations.log 2>/dev/null | head -20
"
```

---

## PHASE 7 — END-TO-END TEST

### 7.1 Test 1: Simulate brute force → Shuffle → IRIS → Telegram

Send test alert via logger on Worker:
```bash
echo "=== Injecting test brute force alert ==="
ssh wazuh-user@10.251.151.12 "
  for i in 1 2 3 4 5 6; do
    logger -p local7.warning 'date=2026-05-23 time=10:01:0${i} devname=\"FGT-PROD\" \
      type=\"event\" subtype=\"system\" action=\"login\" status=\"failed\" \
      srcip=203.0.113.99 user=\"admin\" msg=\"Admin login failed attempt ${i}\"'
    sleep 2
  done
  echo 'Test logs sent (6 brute force attempts)'
"

echo "Waiting 60s for Wazuh to process and send to Shuffle..."
sleep 60
```

### 7.2 Verify Shuffle received the alert
```bash
source /opt/code/wazuh_ova/.env

curl -s "${SHUFFLE_URL}/api/v1/workflows/${WORKFLOW_ID}/executions" \
  -H "Authorization: Bearer ${SHUFFLE_TOKEN}" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
execs = d.get('executions', d if isinstance(d, list) else [])
print(f'Total executions: {len(execs)}')
if execs:
    last = execs[0] if isinstance(execs, list) else execs
    print(f'Last execution:')
    print(f'  Status: {last.get(\"status\",\"?\")}')
    print(f'  Started: {last.get(\"started_at\",\"?\")}')
    if last.get('status') == 'FINISHED':
        print('  Result: ✅ WORKFLOW COMPLETED')
    else:
        print(f'  Result: ❌ {last.get(\"status\")}')
"
```

### 7.3 Verify IRIS case created
```bash
source /opt/code/wazuh_ova/.env

echo "=== Check IRIS alerts ==="
curl -sk -H "Authorization: Bearer ${IRIS_API_KEY}" \
  "${IRIS_URL}/api/v2/alerts/filter" \
  -H "Content-Type: application/json" \
  -d '{"page": 1, "per_page": 5, "sort": "alert_source_event_time desc"}' | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
alerts = d.get('data', {}).get('alerts', [])
total = d.get('data', {}).get('total', 0)
print(f'Total IRIS alerts: {total}')
for a in alerts[:5]:
    print(f'  [{a.get(\"alert_status_name\",\"?\")}] {a.get(\"alert_title\",\"?\")[:60]}')
    print(f'    Source: {a.get(\"alert_source\",\"?\")} | Severity: {a.get(\"alert_severity_name\",\"?\")}')
"
```

### 7.4 Test 2: Simulate RPZ/DNS threat → IRIS case
```bash
ssh wazuh-user@10.251.151.12 "
  logger -p daemon.warning 'named[999]: client @0x7f 10.251.66.51#54321 \
    (malware-c2.badsite.com): rpz QNAME Policy Rewrite malware-c2.badsite.com/A/IN \
    via rpz.malware (NXDOMAIN)'
  echo 'DNS RPZ test sent'
"
sleep 30

echo "=== Check IRIS for RPZ alert ==="
source /opt/code/wazuh_ova/.env
curl -sk -H "Authorization: Bearer ${IRIS_API_KEY}" \
  "${IRIS_URL}/api/v2/alerts/filter" \
  -H "Content-Type: application/json" \
  -d '{"alert_source": "Wazuh SIEM", "page": 1, "per_page": 3}' | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
alerts = d.get('data', {}).get('alerts', [])
for a in alerts:
    print(f'Alert: {a.get(\"alert_title\",\"?\")[:70]}')
    print(f'  IOCs: {len(a.get(\"alert_iocs\",[]))} | Tags: {a.get(\"alert_tags\",\"?\")}')
"
```

### 7.5 Test 3: Manual Block IP via Shuffle Workflow 2
```bash
source /opt/code/wazuh_ova/.env

echo "=== Simulating analyst clicking Block IP ==="
curl -s -X POST "${SHUFFLE_BLOCK_URL:-${SHUFFLE_URL}/api/v1/hooks/webhook_${BLOCK_ID}}" \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "203.0.113.99",
    "case_id": "TEST-001",
    "analyst": "soc-admin",
    "reason": "Confirmed brute force attack"
  }' | python3 -m json.tool 2>/dev/null | head -10

sleep 15

echo "=== Verify Active Response on Worker ==="
ssh wazuh-user@10.251.151.12 "
  sudo iptables -L INPUT -n | grep '203.0.113.99' | head -5 || \
    sudo ipset list | grep '203.0.113.99' | head -5 || \
    echo 'No block rule found (check Active Response config)'
"
```

### 7.6 Test Summary check
```bash
source /opt/code/wazuh_ova/.env

echo "=========================================="
echo "  SOAR + IRIS Integration Test Results"
echo "=========================================="

echo ""
echo "--- Shuffle Workflow 1 (Triage) ---"
curl -s "${SHUFFLE_URL}/api/v1/workflows/${WORKFLOW_ID}/executions" \
  -H "Authorization: Bearer ${SHUFFLE_TOKEN}" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
execs = d if isinstance(d, list) else d.get('executions', [])
finished = sum(1 for e in execs if e.get('status') == 'FINISHED')
failed = sum(1 for e in execs if e.get('status') == 'FAILED')
print(f'  Executions: {len(execs)} total | {finished} OK | {failed} FAILED')
"

echo ""
echo "--- DFIR-IRIS Alerts Created ---"
curl -sk -H "Authorization: Bearer ${IRIS_API_KEY}" \
  "${IRIS_URL}/api/v2/alerts/filter" \
  -H "Content-Type: application/json" \
  -d '{"page":1,"per_page":1}' | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
total = d.get('data', {}).get('total', 0)
print(f'  Total IRIS alerts: {total}')
print(f'  Result: {\"✅ IRIS receiving alerts\" if total > 0 else \"❌ No IRIS alerts found\"} ')
"

echo ""
echo "--- Wazuh Integration Log ---"
ssh wazuh-user@10.251.151.11 "
  sudo tail -10 /var/ossec/logs/integrations.log 2>/dev/null | \
    grep -E 'shuffle|iris|error|success' | head -10 || echo '  No integration log found'
"
```

---

## PHASE 8 — SAVE WORKFLOW IDs TO .ENV

```bash
source /opt/code/wazuh_ova/.env

cat >> /opt/code/wazuh_ova/.env << ENVBLOCK

# Shuffle Workflows — Added $(date +%Y-%m-%d)
SHUFFLE_WORKFLOW_TRIAGE=${WORKFLOW_ID}
SHUFFLE_WORKFLOW_BLOCK=${BLOCK_ID}
SHUFFLE_WORKFLOW_ESCALATE=${ESC_ID}
SHUFFLE_BLOCK_URL=${SHUFFLE_URL}/api/v1/hooks/webhook_${BLOCK_ID}
SHUFFLE_ESC_URL=${SHUFFLE_URL}/api/v1/hooks/webhook_${ESC_ID}
ENVBLOCK

echo "=== Workflow IDs saved to .env ==="
grep "SHUFFLE_WORKFLOW\|SHUFFLE_BLOCK\|SHUFFLE_ESC" /opt/code/wazuh_ova/.env
```

---

## PHASE 9 — WRITE DOCUMENTATION

### 9.1 Create integration guide
Create `/opt/code/wazuh_ova/docs/current/SOAR_IRIS_INTEGRATION.md`:

```markdown
# Shuffle SOAR + DFIR-IRIS Integration
**Date:** [DATE]
**Status:** ✅ Active
**Wazuh Version:** 4.14.5

## Architecture

```
Wazuh Alert (L10+)
       │
       ├──→ Shuffle SOAR (Workflow 1: Triage)
       │         ├── AbuseIPDB enrich
       │         ├── OTX enrich
       │         ├── GeoIP lookup
       │         ├── Create DFIR-IRIS Alert (auto)
       │         └── Telegram notify (auto)
       │
       └──→ DFIR-IRIS (L12+ direct via custom-iris.py)

DFIR-IRIS Dashboard
       │
       └── Analyst review
               ├── False Positive → Close
               └── True Positive
                       ├── Block IP → Shuffle Workflow 2 (Manual)
                       ├── Escalate → Shuffle Workflow 3 (Manual)
                       └── Investigate → Add assets/IOCs/notes
```

## Workflow Details

### Workflow 1: Wazuh Triage (AUTOMATIC)
- **Trigger:** Wazuh alert L10+ via webhook
- **Webhook URL:** [SHUFFLE_WEBHOOK_URL from .env]
- **Actions:** Enrich → Create IRIS Alert → Telegram
- **IRIS Alert:** Title, severity, tags, IOCs, enrichment data
- **Telegram:** Summary with AbuseIPDB score and IRIS link

### Workflow 2: Block IP (MANUAL — analyst trigger)
- **Trigger:** Analyst webhook from IRIS case
- **Webhook URL:** [SHUFFLE_BLOCK_URL from .env]
- **Actions:** Wazuh Active Response → IRIS timeline → Telegram
- **Block duration:** 3600s (1 hour) via firewall-drop

### Workflow 3: Escalate (MANUAL — analyst trigger)
- **Trigger:** Analyst webhook from IRIS case
- **Webhook URL:** [SHUFFLE_ESC_URL from .env]
- **Actions:** Telegram → IRIS note

## DFIR-IRIS Configuration
- URL: [IRIS_URL from .env]
- Customer: Walailak University Hospital
- Customer ID: [IRIS_CUSTOMER_ID from .env]
- Direct integration: L12+ via custom-iris.py
- Shuffle integration: L10+ via Workflow 1

## Wazuh Configuration
- ossec.conf: 2 integration blocks (Shuffle L10+, IRIS direct L12+)
- Integration script: /var/ossec/integrations/custom-iris.py
- Groups covered: brute_force, malware, ids, otx_malicious, abuseipdb_malicious,
                  rpz_storm, dga_malware, dns_axfr

## Test Results
| Test | Result |
|------|--------|
| Brute force alert → Shuffle | [OK/FAIL] |
| IRIS alert created | [OK/FAIL] |
| Telegram notification | [OK/FAIL] |
| DNS RPZ alert → IRIS | [OK/FAIL] |
| Manual block IP webhook | [OK/FAIL] |
| Active Response executed | [OK/FAIL] |

## Maintenance

### Check Shuffle executions
```bash
source /opt/code/wazuh_ova/.env
curl -s "${SHUFFLE_URL}/api/v1/workflows/${SHUFFLE_WORKFLOW_TRIAGE}/executions" \
  -H "Authorization: Bearer ${SHUFFLE_TOKEN}" | python3 -m json.tool | head -30
```

### Check IRIS alerts
```bash
source /opt/code/wazuh_ova/.env
curl -sk -H "Authorization: Bearer ${IRIS_API_KEY}" \
  "${IRIS_URL}/api/v2/alerts/filter" -H "Content-Type: application/json" \
  -d '{"page":1,"per_page":10}' | python3 -m json.tool
```

### Check integration log
```bash
ssh wazuh-user@10.251.151.11
sudo tail -50 /var/ossec/logs/integrations.log
```
```

### 9.2 Create SOC Runbook (Thai)
Create `/opt/code/wazuh_ova/docs/current/SOAR_RUNBOOK_TH.md`:

```markdown
# SOC Runbook — Shuffle SOAR + DFIR-IRIS
**วันที่สร้าง:** [DATE]
**ผู้ดูแล:** SOC Team | Walailak University Hospital

---

## ภาพรวม

ระบบ SOAR (Security Orchestration, Automation and Response) ประกอบด้วย:
- **Shuffle SOAR** — orchestrate workflow อัตโนมัติ
- **DFIR-IRIS** — case management สำหรับ incident response
- **Human-in-the-Loop** — ทุกการ block ต้องให้ analyst อนุมัติก่อนเสมอ

---

## Workflow ที่มีในระบบ

### 1. Triage (อัตโนมัติ)
เมื่อมี alert ระดับ 10+ จาก Wazuh:
1. Shuffle รับ alert ผ่าน webhook
2. ดึงข้อมูล AbuseIPDB + OTX + GeoIP
3. สร้าง case ใน DFIR-IRIS อัตโนมัติ
4. ส่ง Telegram แจ้ง analyst

**ไม่มีการ block อัตโนมัติใดๆ**

### 2. Block IP (Manual)
เมื่อ analyst ต้องการ block IP:
1. เปิด IRIS case
2. คลิก "Block IP" button (ถ้า configure ไว้)
3. หรือส่ง webhook โดยตรง:
```bash
source /opt/code/wazuh_ova/.env
curl -X POST "${SHUFFLE_BLOCK_URL}" \
  -H "Content-Type: application/json" \
  -d '{"ip":"IP_ที่จะ block","case_id":"CASE_ID","analyst":"ชื่อคุณ","reason":"เหตุผล"}'
```
4. Shuffle จะ block ผ่าน Wazuh Active Response และบันทึกใน IRIS timeline

### 3. Escalate (Manual)
เมื่อ case ซับซ้อนเกิน:
```bash
source /opt/code/wazuh_ova/.env
curl -X POST "${SHUFFLE_ESC_URL}" \
  -H "Content-Type: application/json" \
  -d '{"case_id":"CASE_ID","case_title":"ชื่อ case","severity":"High","analyst":"ชื่อคุณ"}'
```

---

## ขั้นตอน Investigate Case ใน IRIS

1. เปิด **[IRIS_URL]**
2. ไปที่ **Alerts** → เลือก alert ที่น่าสงสัย
3. คลิก **Escalate to Case** เพื่อเปิด full investigation
4. ใน Case ให้เพิ่ม:
   - **Assets** — endpoint ที่เกี่ยวข้อง
   - **IOCs** — IP, domain, hash ที่เชื่อมโยง
   - **Notes** — บันทึกสิ่งที่พบ
   - **Timeline** — เหตุการณ์ตามลำดับเวลา
   - **Tasks** — งานที่ต้องทำ
5. ค้นหาข้อมูลเพิ่มเติมใน **SOC Center Web App** (/wazuh/investigate)
6. เมื่อสรุปผล → Close Case พร้อมกรอก Root Cause และ Remediation

---

## ตัดสินใจ: False Positive vs True Positive

| สัญญาณ | การตัดสินใจ |
|--------|------------|
| AbuseIPDB < 20% + OTX clean + internal IP | False Positive → Close + Tune rule |
| AbuseIPDB ≥ 50% หรือ OTX match | True Positive → Investigate + Block |
| Suricata severity 1-2 + external IP | True Positive → Block immediately |
| DHCP pool exhausted + same network | False Positive → Tune to L8 |
| Brute force 10+ failures external IP | True Positive → Block |

---

## Link สำคัญ

| ระบบ | URL |
|------|-----|
| SOC Center Web App | https://10.251.150.222:3348/wazuh |
| DFIR-IRIS | [IRIS_URL] |
| Shuffle SOAR | [SHUFFLE_URL] |
| Wazuh Dashboard | https://10.251.151.14 |
| Grafana | https://network.hospital.wu.ac.th/grafana |

---

## Troubleshooting

**Shuffle ไม่รับ alert:**
```bash
sudo tail -20 /var/ossec/logs/integrations.log
sudo tail -20 /var/ossec/logs/ossec.log | grep integrat
```

**IRIS ไม่มี alert:**
```bash
source /opt/code/wazuh_ova/.env
curl -sk -H "Authorization: Bearer ${IRIS_API_KEY}" "${IRIS_URL}/api/ping"
```

**Active Response ไม่ทำงาน:**
```bash
ssh wazuh-user@10.251.151.12
sudo tail -20 /var/ossec/logs/active-responses.log
```
```

---

## PHASE 10 — FINAL STATUS REPORT

```
════════════════════════════════════════════════════════════════
  Shuffle SOAR + DFIR-IRIS Integration — Final Status
  Date: [DATE]
════════════════════════════════════════════════════════════════

SHUFFLE SOAR
  Workflow 1 (Triage)  : [ID] | [OK/FAIL]
  Workflow 2 (Block)   : [ID] | [OK/FAIL]
  Workflow 3 (Escalate): [ID] | [OK/FAIL]
  Webhook (Wazuh→Shuf) : [URL]

DFIR-IRIS
  URL                  : [IRIS_URL]
  Customer             : Walailak University Hospital (ID=[N])
  API Key              : SET ✅
  Direct integration   : L12+ via custom-iris.py
  Total alerts created : [N]

WAZUH
  ossec.conf blocks    : 2 (Shuffle L10+, IRIS L12+)
  XML valid            : ✅
  Restart successful   : ✅
  Integration log      : [OK/errors]

END-TO-END TESTS
  BruteForce→Shuffle→IRIS  : [OK/FAIL]
  DNS RPZ→Shuffle→IRIS     : [OK/FAIL]
  Telegram notification    : [OK/FAIL]
  Manual Block IP webhook  : [OK/FAIL]

DOCUMENTATION
  SOAR_IRIS_INTEGRATION.md : docs/current/ [OK/FAIL]
  SOAR_RUNBOOK_TH.md       : docs/current/ [OK/FAIL]

HOW TO ACCESS:
  DFIR-IRIS   : [IRIS_URL]
  Shuffle SOAR: [SHUFFLE_URL]
  Runbook     : /opt/code/wazuh_ova/docs/current/SOAR_RUNBOOK_TH.md

POLICY REMINDER:
  ✅ Workflow 1 (Triage): Auto — enrich + create IRIS case + Telegram
  🔒 Workflow 2 (Block) : MANUAL ONLY — analyst must approve
  🔒 Workflow 3 (Escalate): MANUAL ONLY — analyst must approve
════════════════════════════════════════════════════════════════
```
