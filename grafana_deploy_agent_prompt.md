# Agent Prompt: Deploy & Verify Grafana Dashboards
# Target: https://network.hospital.wu.ac.th/grafana
# Datasource UID: dfmhsi3iylzb4d
# Created: 2026-05-19

---

## SYSTEM CONTEXT

You are a senior DevOps/Security engineer deploying pre-built Wazuh SOC dashboards
to a production Grafana instance. All dashboard JSON files are already built and
available locally. Your job is to deploy them via Grafana API, verify each one
renders correctly, and produce a deployment report.

```
Grafana URL    : https://network.hospital.wu.ac.th/grafana
API Token      : glsa_your_grafana_service_account_token_placeholder
Datasource UID : dfmhsi3iylzb4d
Datasource type: grafana-opensearch-datasource
OpenSearch     : https://10.251.151.13:9200 (index: wazuh-alerts-4.x-*)

Dashboard JSON files (local):
  /home/claude/grafana_v2/01_security_investigation.json
  /home/claude/grafana_v2/02_soc_overview.json
  /home/claude/grafana_v2/03_network_asset.json
  /home/claude/grafana_v2/04_threat_overview.json
  /home/claude/grafana_v2/05_compliance_executive.json
  /home/claude/grafana_v2/06_soc_kpi.json
```

---

## OPERATING RULES

- Always show exact API response before proceeding to next step
- If any API call returns non-2xx, STOP and diagnose before continuing
- Never hardcode token in log output — mask as `****` in printed output
- Substitute datasource UID into every JSON before importing
- Verify each dashboard with a data query AFTER importing
- Report final URLs for all dashboards at the end

---

## PHASE 1 — PRE-FLIGHT CHECKS

### 1.1 Verify Grafana API is reachable and token is valid
```bash
GRAFANA="https://network.hospital.wu.ac.th/grafana"
TOKEN="glsa_your_grafana_service_account_token_placeholder"
DS_UID="dfmhsi3iylzb4d"

echo "=== Grafana health check ==="
curl -sk -H "Authorization: Bearer ${TOKEN}" \
  "${GRAFANA}/api/health" | python3 -m json.tool

echo ""
echo "=== Verify API token permissions ==="
curl -sk -H "Authorization: Bearer ${TOKEN}" \
  "${GRAFANA}/api/user" | python3 -m json.tool | grep -E "login|role|name"
```
Expected: `{"database":"ok","version":"13.x.x"}` and user with Admin role.
If 401 → token expired or wrong. If 403 → insufficient permissions.

### 1.2 Verify datasource exists and is connected
```bash
echo "=== Check datasource ${DS_UID} ==="
curl -sk -H "Authorization: Bearer ${TOKEN}" \
  "${GRAFANA}/api/datasources/uid/${DS_UID}" | \
  python3 -m json.tool | grep -E "name|type|url|uid|database"

echo ""
echo "=== Test datasource connectivity ==="
curl -sk -H "Authorization: Bearer ${TOKEN}" \
  "${GRAFANA}/api/datasources/uid/${DS_UID}/health" | python3 -m json.tool
```
Expected: datasource type=`grafana-opensearch-datasource`, status=`OK`.

### 1.3 Check existing dashboards (avoid duplicates)
```bash
echo "=== Existing Wazuh dashboards ==="
curl -sk -H "Authorization: Bearer ${TOKEN}" \
  "${GRAFANA}/api/search?tag=wazuh&type=dash-db" | \
  python3 -c "
import sys, json
dbs = json.load(sys.stdin)
if not dbs:
    print('No existing Wazuh dashboards found — clean install')
else:
    print(f'Found {len(dbs)} existing dashboards:')
    for d in dbs:
        print(f'  uid={d[\"uid\"]}  title={d[\"title\"]}')
"
```

### 1.4 Create Wazuh SOC folder
```bash
echo "=== Create dashboard folder ==="
FOLDER_RESP=$(curl -sk -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${GRAFANA}/api/folders" \
  -d '{"title":"Wazuh SOC","uid":"wazuh-soc-folder"}')

echo "$FOLDER_RESP" | python3 -m json.tool
FOLDER_ID=$(echo "$FOLDER_RESP" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('id', d.get('uid','0')))" 2>/dev/null)
echo "Folder ID/UID: ${FOLDER_ID}"
```
If folder already exists the API returns the existing one — that's fine.

---

## PHASE 2 — PREPARE AND DEPLOY ALL DASHBOARDS

### 2.1 Substitute real datasource UID into all JSON files
```bash
DS_UID="dfmhsi3iylzb4d"
SRC_DIR="/home/claude/grafana_v2"
PREP_DIR="/tmp/grafana_deploy"
mkdir -p "${PREP_DIR}"

for f in ${SRC_DIR}/0*.json; do
  fname=$(basename "$f")
  # Replace template variable ${DS_OPENSEARCH} with real UID
  sed "s/\${DS_OPENSEARCH}/${DS_UID}/g" "$f" > "${PREP_DIR}/${fname}"
  echo "Prepared: ${fname}"
done

echo ""
echo "=== Verify substitution in first file ==="
grep '"uid"' "${PREP_DIR}/01_security_investigation.json" | head -5
```
Every `"uid": "${DS_OPENSEARCH}"` must now show `"uid": "dfmhsi3iylzb4d"`.

### 2.2 Deploy all 6 dashboards via API

Deploy each dashboard and capture the resulting URL:

```bash
GRAFANA="https://network.hospital.wu.ac.th/grafana"
TOKEN="glsa_your_grafana_service_account_token_placeholder"
PREP_DIR="/tmp/grafana_deploy"
declare -A DASH_URLS
declare -A DASH_UIDS

for f in ${PREP_DIR}/0*.json; do
  fname=$(basename "$f" .json)

  # Build import payload: set folderId + overwrite=true
  PAYLOAD=$(python3 -c "
import json, sys
with open('${f}') as fh:
    obj = json.load(fh)
# Ensure overwrite and folder
obj['overwrite'] = True
obj['folderId'] = 0
obj['folderUid'] = 'wazuh-soc-folder'
# Remove id to let Grafana assign new one
if 'id' in obj.get('dashboard', {}):
    del obj['dashboard']['id']
print(json.dumps(obj))
")

  echo "=== Deploying: ${fname} ==="
  RESP=$(curl -sk -X POST \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    "${GRAFANA}/api/dashboards/import" \
    -d "${PAYLOAD}")

  STATUS=$(echo "$RESP" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null)
  SLUG=$(echo "$RESP" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('importedUrl', d.get('slug','')))" 2>/dev/null)
  UID=$(echo "$RESP" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('uid',''))" 2>/dev/null)
  TITLE=$(echo "$RESP" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('importedRevision','') or d.get('title',''))" 2>/dev/null)

  echo "  Status : ${STATUS}"
  echo "  UID    : ${UID}"
  echo "  URL    : ${GRAFANA}${SLUG}"
  echo "  Response: $(echo $RESP | python3 -m json.tool 2>/dev/null | head -15)"
  DASH_URLS[$fname]="${GRAFANA}${SLUG}"
  DASH_UIDS[$fname]="${UID}"
  echo ""
done
```

### 2.3 Verify all 6 dashboards exist via search API
```bash
echo "=== Verify all Wazuh dashboards imported ==="
curl -sk -H "Authorization: Bearer ${TOKEN}" \
  "${GRAFANA}/api/search?tag=wazuh&type=dash-db" | \
  python3 -c "
import sys, json
dbs = json.load(sys.stdin)
print(f'Total Wazuh dashboards: {len(dbs)}')
for d in dbs:
    print(f'  [{d.get(\"uid\",\"?\")}] {d[\"title\"]} → /d/{d[\"uid\"]}')
"
```
Expected: 6 dashboards listed.

---

## PHASE 3 — VERIFY DATA RENDERING

For each dashboard, query the underlying datasource to confirm data exists
for the key panels. This proves the dashboard would actually display data.

### 3.1 Base connectivity — verify OpenSearch has recent Wazuh alerts
```bash
OPENSEARCH="https://10.251.151.13:9200"
OS_CRED="admin:admin"

echo "=== OpenSearch cluster health ==="
curl -sk -u "${OS_CRED}" "${OPENSEARCH}/_cluster/health?pretty" | \
  grep -E '"status"|"number_of_nodes"|"active_shards"'

echo ""
echo "=== Recent alert count (last 24h) ==="
curl -sk -u "${OS_CRED}" \
  -H "Content-Type: application/json" \
  "${OPENSEARCH}/wazuh-alerts-4.x-*/_count" \
  -d '{"query":{"range":{"@timestamp":{"gte":"now-24h"}}}}' | \
  python3 -c "import sys,json; print('Alerts (24h):', json.load(sys.stdin)['count'])"
```

### 3.2 Test Security Investigation data sources
```bash
echo "=== [Dashboard 01] Identity data available ==="
for q in \
  'rule.groups:"infoblox_dhcp"' \
  'rule.groups:"huawei_ac"' \
  'data.dhcp_ip:*' \
  'data.dhcp_mac:*' \
  'data.dstuser:*'; do
  COUNT=$(curl -sk -u "${OS_CRED}" \
    -H "Content-Type: application/json" \
    "${OPENSEARCH}/wazuh-alerts-4.x-*/_count" \
    -d "{\"query\":{\"query_string\":{\"query\":\"${q}\"}}}" | \
    python3 -c 'import sys,json; print(json.load(sys.stdin)["count"])')
  echo "  ${q}: ${COUNT} docs"
done
```

### 3.3 Test SOC Overview data sources
```bash
echo "=== [Dashboard 02] SOC alert levels ==="
for level in "12 TO *" "7 TO 11" "1 TO 6"; do
  COUNT=$(curl -sk -u "${OS_CRED}" \
    -H "Content-Type: application/json" \
    "${OPENSEARCH}/wazuh-alerts-4.x-*/_count" \
    -d "{\"query\":{\"range\":{\"rule.level\":{\"gte\":$(echo $level | cut -d' ' -f1),\"lte\":$(echo $level | cut -d' ' -f3 | tr -d '*' | sed 's/\*/999/')}}}}" | \
    python3 -c 'import sys,json; print(json.load(sys.stdin)["count"])' 2>/dev/null || echo "?")
  echo "  Level [${level}]: ${COUNT}"
done
```

### 3.4 Test Network Asset data
```bash
echo "=== [Dashboard 03] Asset tracking data ==="
for grp in "infoblox_dhcp" "huawei_ac" "new_device" "user_online"; do
  COUNT=$(curl -sk -u "${OS_CRED}" \
    -H "Content-Type: application/json" \
    "${OPENSEARCH}/wazuh-alerts-4.x-*/_count" \
    -d "{\"query\":{\"match\":{\"rule.groups\":\"${grp}\"}}}" | \
    python3 -c 'import sys,json; print(json.load(sys.stdin)["count"])')
  echo "  rule.groups:${grp}: ${COUNT}"
done
```

### 3.5 Test Threat Intelligence data
```bash
echo "=== [Dashboard 04] Threat data ==="
for grp in "suricata" "otx_malicious" "abuseipdb" "malware" "brute_force"; do
  COUNT=$(curl -sk -u "${OS_CRED}" \
    -H "Content-Type: application/json" \
    "${OPENSEARCH}/wazuh-alerts-4.x-*/_count" \
    -d "{\"query\":{\"match\":{\"rule.groups\":\"${grp}\"}}}" | \
    python3 -c 'import sys,json; print(json.load(sys.stdin)["count"])')
  echo "  rule.groups:${grp}: ${COUNT}"
done
```

### 3.6 Test Compliance data
```bash
echo "=== [Dashboard 05] Compliance framework data ==="
for field in "rule.pci_dss" "rule.hipaa" "rule.gdpr" "rule.nist_800_53" "rule.tsc"; do
  COUNT=$(curl -sk -u "${OS_CRED}" \
    -H "Content-Type: application/json" \
    "${OPENSEARCH}/wazuh-alerts-4.x-*/_count" \
    -d "{\"query\":{\"exists\":{\"field\":\"${field}\"}}}" | \
    python3 -c 'import sys,json; print(json.load(sys.stdin)["count"])')
  echo "  ${field}: ${COUNT}"
done
```

### 3.7 Test GeoIP data (for map panels)
```bash
echo "=== GeoIP enrichment check ==="
COUNT=$(curl -sk -u "${OS_CRED}" \
  -H "Content-Type: application/json" \
  "${OPENSEARCH}/wazuh-alerts-4.x-*/_count" \
  -d '{"query":{"exists":{"field":"GeoLocation.country_name"}}}' | \
  python3 -c 'import sys,json; print(json.load(sys.stdin)["count"])')
echo "  GeoLocation.country_name populated: ${COUNT} docs"

echo ""
echo "=== Top 5 countries ==="
curl -sk -u "${OS_CRED}" \
  -H "Content-Type: application/json" \
  "${OPENSEARCH}/wazuh-alerts-4.x-*/_search?size=0" \
  -d '{
    "query":{"exists":{"field":"GeoLocation.country_name"}},
    "aggs":{"countries":{"terms":{"field":"GeoLocation.country_name.keyword","size":5}}}
  }' | python3 -c "
import sys, json
d = json.load(sys.stdin)
buckets = d.get('aggregations',{}).get('countries',{}).get('buckets',[])
for b in buckets: print(f'  {b[\"key\"]}: {b[\"doc_count\"]}')
"
```

### 3.8 Test Security Investigation via Grafana proxy
Use Grafana's datasource proxy to mimic how the dashboard itself queries:
```bash
echo "=== Test via Grafana datasource proxy ==="
PROXY_RESP=$(curl -sk \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${GRAFANA}/api/datasources/proxy/uid/${DS_UID}/wazuh-alerts-4.x-*/_search?size=1" \
  -d '{"query":{"match_all":{}},"_source":["rule.level","rule.description","@timestamp"]}' \
  2>&1)

echo "$PROXY_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    hits = d.get('hits',{}).get('hits',[])
    total = d.get('hits',{}).get('total',{}).get('value', 0)
    print(f'Query via Grafana proxy: {total} total docs')
    if hits:
        s = hits[0]['_source']
        print(f'  Latest: Level {s.get(\"rule\",{}).get(\"level\",\"?\")} — {s.get(\"rule\",{}).get(\"description\",\"?\")}')
    print('RESULT: ✅ Dashboard should display data')
except Exception as e:
    print(f'RESULT: ❌ Proxy query failed — {e}')
    print('Raw response:', sys.stdin.read()[:200])
" 2>/dev/null || echo "Proxy test requires direct datasource access — check manually"
```

---

## PHASE 4 — PANEL RENDER TEST VIA GRAFANA API

### 4.1 Get dashboard UIDs from Grafana
```bash
echo "=== Retrieve all deployed dashboard UIDs ==="
DEPLOYED=$(curl -sk -H "Authorization: Bearer ${TOKEN}" \
  "${GRAFANA}/api/search?tag=wazuh&type=dash-db")
echo "$DEPLOYED" | python3 -c "
import sys, json
dbs = json.load(sys.stdin)
for d in dbs:
    print(f'{d[\"uid\"]}|{d[\"title\"]}')
"
```

### 4.2 Test dashboard JSON is retrievable (confirms import success)
```bash
echo "=== Verify each dashboard JSON retrieval ==="
DEPLOYED_UIDS=$(curl -sk -H "Authorization: Bearer ${TOKEN}" \
  "${GRAFANA}/api/search?tag=wazuh&type=dash-db" | \
  python3 -c "import sys,json; [print(d['uid']) for d in json.load(sys.stdin)]")

for uid in $DEPLOYED_UIDS; do
  RESP=$(curl -sk -H "Authorization: Bearer ${TOKEN}" \
    "${GRAFANA}/api/dashboards/uid/${uid}")
  TITLE=$(echo "$RESP" | python3 -c \
    "import sys,json; print(json.load(sys.stdin)['dashboard']['title'])" 2>/dev/null)
  PANEL_COUNT=$(echo "$RESP" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(len(d['dashboard'].get('panels',[])))" 2>/dev/null)
  URL=$(echo "$RESP" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d['meta'].get('url',''))" 2>/dev/null)

  echo "  [${uid}]"
  echo "    Title  : ${TITLE}"
  echo "    Panels : ${PANEL_COUNT}"
  echo "    URL    : ${GRAFANA}${URL}"
done
```

### 4.3 Render test for each dashboard (PNG screenshot via Grafana rendering API)
Tests if the dashboard can actually render — requires renderer plugin or image rendering.
```bash
echo "=== Render test (PNG) for each dashboard ==="
DEPLOYED_UIDS=$(curl -sk -H "Authorization: Bearer ${TOKEN}" \
  "${GRAFANA}/api/search?tag=wazuh&type=dash-db" | \
  python3 -c "import sys,json; [print(d['uid']) for d in json.load(sys.stdin)]")

for uid in $DEPLOYED_UIDS; do
  HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${TOKEN}" \
    "${GRAFANA}/render/d/${uid}?width=800&height=400&timeout=30")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  [${uid}] ✅ Render: HTTP ${HTTP_CODE}"
  else
    echo "  [${uid}] ⚠️  Render: HTTP ${HTTP_CODE} (renderer plugin may not be installed)"
  fi
done
```

---

## PHASE 5 — SECURITY INVESTIGATION FUNCTIONAL TEST

This test simulates exactly what a user would do: search for an IP and verify results.

### 5.1 Get a real IP from the data to test with
```bash
echo "=== Find a real srcip to test with ==="
TEST_IP=$(curl -sk -u "${OS_CRED}" \
  -H "Content-Type: application/json" \
  "${OPENSEARCH}/wazuh-alerts-4.x-*/_search?size=1" \
  -d '{"query":{"exists":{"field":"data.srcip"}},"_source":["data.srcip"]}' | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
hits = d.get('hits',{}).get('hits',[])
if hits:
    print(hits[0]['_source'].get('data',{}).get('srcip',''))
")
echo "Test IP: ${TEST_IP}"
```

### 5.2 Run the exact query that Security Investigation dashboard uses for this IP
```bash
INV_Q="data.srcip:\"${TEST_IP}\" OR data.dhcp_ip:\"${TEST_IP}\" OR src_ip:\"${TEST_IP}\""

echo "=== Identity data for IP: ${TEST_IP} ==="

echo "--- DHCP (Infoblox) ---"
curl -sk -u "${OS_CRED}" \
  -H "Content-Type: application/json" \
  "${OPENSEARCH}/wazuh-alerts-4.x-*/_search?size=3" \
  -d "{
    \"query\":{\"bool\":{\"must\":[
      {\"query_string\":{\"query\":\"${INV_Q}\"}},
      {\"match\":{\"rule.groups\":\"infoblox_dhcp\"}}
    ]}},
    \"_source\":[\"data.dhcp_ip\",\"data.dhcp_mac\",\"data.dhcp_hostname\",\"data.dhcp_action\"]
  }" | python3 -c "
import sys,json
d=json.load(sys.stdin)
hits=d.get('hits',{}).get('hits',[])
if not hits: print('  No DHCP records found')
for h in hits:
    s=h['_source'].get('data',{})
    print(f'  DHCP: {s.get(\"dhcp_action\",\"?\")} | IP={s.get(\"dhcp_ip\",\"?\")} | MAC={s.get(\"dhcp_mac\",\"?\")} | Host={s.get(\"dhcp_hostname\",\"?\")}')
"

echo ""
echo "--- WiFi Session (Huawei AC) ---"
curl -sk -u "${OS_CRED}" \
  -H "Content-Type: application/json" \
  "${OPENSEARCH}/wazuh-alerts-4.x-*/_search?size=3" \
  -d "{
    \"query\":{\"bool\":{\"must\":[
      {\"query_string\":{\"query\":\"${INV_Q}\"}},
      {\"match\":{\"rule.groups\":\"huawei_ac\"}}
    ]}},
    \"_source\":[\"data.dstuser\",\"data.mac\",\"data.srcip\",\"data.ap_mac\",\"data.ac_msg_type\"]
  }" | python3 -c "
import sys,json
d=json.load(sys.stdin)
hits=d.get('hits',{}).get('hits',[])
if not hits: print('  No WiFi session records found')
for h in hits:
    s=h['_source'].get('data',{})
    print(f'  WiFi: {s.get(\"ac_msg_type\",\"?\")} | user={s.get(\"dstuser\",\"?\")} | IP={s.get(\"srcip\",\"?\")} | MAC={s.get(\"mac\",\"?\")} | AP={s.get(\"ap_mac\",\"?\")}')
"

echo ""
echo "--- Firewall (FortiGate) ---"
curl -sk -u "${OS_CRED}" \
  -H "Content-Type: application/json" \
  "${OPENSEARCH}/wazuh-alerts-4.x-*/_search?size=3" \
  -d "{
    \"query\":{\"bool\":{\"must\":[
      {\"query_string\":{\"query\":\"${INV_Q}\"}},
      {\"match\":{\"rule.groups\":\"fortigate\"}}
    ]}},
    \"_source\":[\"data.srcip\",\"data.dstip\",\"data.fgt_action\",\"rule.description\"]
  }" | python3 -c "
import sys,json
d=json.load(sys.stdin)
hits=d.get('hits',{}).get('hits',[])
if not hits: print('  No FortiGate records found')
for h in hits:
    s=h['_source']
    data=s.get('data',{})
    print(f'  FortiGate: {data.get(\"fgt_action\",\"?\")} | {data.get(\"srcip\",\"?\")} → {data.get(\"dstip\",\"?\")}')
"
```

---

## PHASE 6 — FINAL DEPLOYMENT REPORT

After all phases complete, produce this structured report:

```
════════════════════════════════════════════════════════════════
  Grafana Dashboard Deployment Report
  Grafana: https://network.hospital.wu.ac.th/grafana
  Date   : [DATE]
════════════════════════════════════════════════════════════════

PRE-FLIGHT
  Grafana API          : [OK / FAIL — HTTP code]
  API Token valid      : [OK / FAIL — user role]
  Datasource (dfmhsi3) : [OK / FAIL — type + status]
  OpenSearch health    : [green/yellow/red]
  Alert count (24h)    : [N]

DEPLOYMENT
  Wazuh SOC folder     : [Created / Already exists]

  Dashboard 01 — 🔍 Security Investigation
    Status  : [imported / error]
    UID     : [uid]
    Panels  : [N]
    URL     : https://network.hospital.wu.ac.th/grafana/d/[uid]/...

  Dashboard 02 — 🛡️ SOC Overview
    Status  : [imported / error]
    URL     : https://network.hospital.wu.ac.th/grafana/d/[uid]/...

  Dashboard 03 — 🖧 Network Asset Tracking
    Status  : [imported / error]
    URL     : https://network.hospital.wu.ac.th/grafana/d/[uid]/...

  Dashboard 04 — ⚔️ Threat Overview
    Status  : [imported / error]
    URL     : https://network.hospital.wu.ac.th/grafana/d/[uid]/...

  Dashboard 05 — 📋 Compliance Executive
    Status  : [imported / error]
    URL     : https://network.hospital.wu.ac.th/grafana/d/[uid]/...

  Dashboard 06 — 📈 SOC KPI
    Status  : [imported / error]
    URL     : https://network.hospital.wu.ac.th/grafana/d/[uid]/...

DATA VERIFICATION
  infoblox_dhcp alerts     : [N] — Dashboard 01, 03
  huawei_ac alerts         : [N] — Dashboard 01, 03
  GeoLocation enriched     : [N] — all map panels
  suricata alerts          : [N] — Dashboard 02, 04
  compliance-tagged alerts : [N] — Dashboard 05
  rule.pci_dss populated   : [N]
  rule.nist_800_53 populated: [N]
  rule.gdpr populated      : [N]

INVESTIGATION FUNCTIONAL TEST
  Test IP found       : [IP]
  DHCP records found  : [N] — IP → MAC → Hostname binding
  WiFi session found  : [N] — User → IP → MAC → AP
  FortiGate events    : [N]
  Identity card works : [YES / NO]

RENDER TEST
  Dashboard 01 render : [✅ 200 / ⚠️ no renderer]
  Dashboard 02 render : [✅ 200 / ⚠️ no renderer]
  ... (all 6)

OVERALL STATUS : ✅ ALL DEPLOYED AND VERIFIED / ❌ ISSUES (see above)

QUICK ACCESS URLs:
  Security Investigation : https://network.hospital.wu.ac.th/grafana/d/wazuh-invest-01
  SOC Overview           : https://network.hospital.wu.ac.th/grafana/d/wazuh-soc-02
  Network Asset          : https://network.hospital.wu.ac.th/grafana/d/wazuh-asset-03
  Threat Overview        : https://network.hospital.wu.ac.th/grafana/d/wazuh-threat-04
  Compliance Executive   : https://network.hospital.wu.ac.th/grafana/d/wazuh-comp-05
  SOC KPI                : https://network.hospital.wu.ac.th/grafana/d/wazuh-kpi-06

HOW TO USE SECURITY INVESTIGATION:
  1. Open: https://network.hospital.wu.ac.th/grafana/d/wazuh-invest-01
  2. Type IP/MAC/Username/Hostname in "Search Value" field (top of dashboard)
  3. Press Enter — all panels filter automatically
  4. Panels show: Identity card, DHCP history, WiFi sessions,
     Firewall events, IDS alerts, GeoIP map, raw events log
════════════════════════════════════════════════════════════════
```

---

## TROUBLESHOOTING REFERENCE

**If import returns `{"message":"Dashboard not found"}` :**
- Use `/api/dashboards/import` not `/api/dashboards/db` — these are different endpoints
- Confirm JSON has `{"dashboard":{...}, "overwrite":true}` wrapper structure

**If panels show "No data" after import:**
```bash
# Test datasource directly from Grafana
curl -sk -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${GRAFANA}/api/datasources/uid/${DS_UID}/resources/wazuh-alerts-4.x-*/_search?size=1" \
  -d '{"query":{"match_all":{}}}' | python3 -m json.tool | head -20
```

**If OpenSearch stat panels show `invalid query, missing metrics and aggregations`:**
- Newer `grafana-opensearch-datasource` backends reject metric queries that have `metrics` but no `bucketAggs`
- For stat/count panels, add a minimal `date_histogram` bucket on `@timestamp` and let the stat panel reduce the returned series
- Example fix pattern:
```json
{
  "queryType": "lucene",
  "bucketAggs": [
    {
      "type": "date_histogram",
      "id": "2",
      "field": "@timestamp",
      "settings": {
        "interval": "auto",
        "min_doc_count": "0",
        "trimEdges": "0"
      }
    }
  ],
  "metrics": [
    {
      "id": "1",
      "type": "count",
      "settings": {}
    }
  ]
}
```

**If datasource proxy returns 502:**
- Grafana cannot reach OpenSearch at 10.251.151.13
- Check network route from Grafana host to OpenSearch
- Verify OpenSearch TLS cert (try adding `"tlsSkipVerify": true` in datasource settings)

**If KPI / 30-day dashboards intermittently timeout with**
`net/http: timeout awaiting response headers`:
- This environment currently runs OpenSearch on a single data node with very large daily `wazuh-alerts-4.x-*` indices
- Prefer lower datasource shard fan-out for stability:
  `jsonData.maxConcurrentShardRequests = 2`
- For stat panels on long time ranges, avoid `auto` if possible; use a coarser histogram such as `1d`
- Avoid aggressive auto-refresh on heavy dashboards; `15m` is safer than `5m` for 30-day KPI views
- On `wazuh-kpi-06`, reduce duplicate 30-day count queries by reusing panel 5 (`Alert Volume Trend`) through the built-in `-- Dashboard --` datasource for the top stat cards
- Back up the datasource and dashboard JSON before tuning these values

**If token returns 401:**
- Token may have expired → create new token:
  Grafana → Administration → Service accounts → Create token
- Need permissions: Admin role or custom role with dashboards:write
