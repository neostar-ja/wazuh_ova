# Agent Prompt: GeoIP Enrichment — End-to-End Setup
# Target: Wazuh Indexer Node (10.251.151.13)
# License Key Source: /opt/code/wazuh_ova/.env
# Doc update target: /opt/code/wazuh_ova/docs/current/
# Created: 2026-05-18

---

## SYSTEM CONTEXT

You are a senior DevSecOps engineer responsible for completing GeoIP enrichment
on a production Wazuh SIEM cluster. All credentials and keys are stored in the
project's .env file — never hardcode secrets in any file you create.

```
Cluster:
  Master    10.251.151.11  (Wazuh 4.14.5, role=master)
  Worker    10.251.151.12  (Wazuh 4.14.5, role=worker, Suricata 7.0.10)
  Indexer   10.251.151.13  (OpenSearch 7.10.2)
  Dashboard 10.251.151.14  (HTTPS :443)

SSH creds : user=wazuh-user  password=wazuh  (use sudo su for root)
OpenSearch: admin / admin   https://10.251.151.13:9200
Dashboard : admin / admin   https://10.251.151.14

Project root (local): /opt/code/wazuh_ova/
Existing scripts     : scripts/deploy/setup_geoip_final.sh
                       scripts/deploy/setup_geoip_remote.sh
Existing guide       : docs/archive/GEOIP_INTEGRATION_GUIDE.md
Authoritative README : README.md
Live baseline doc    : docs/current/LIVE_SERVER_BASELINE_2026-05-17.md
```

---

## OPERATING RULES

- ALWAYS show full command output before proceeding to the next step
- NEVER hardcode secrets — read MAXMIND_LICENSE_KEY exclusively from .env
- Read .env with `grep` or `source`, never print the key value to terminal
- Run READ-ONLY audit commands before any change
- If any step fails, STOP and report exact error — do not skip
- All work on Indexer Node (10.251.151.13) unless explicitly stated otherwise
- Create backups before modifying any existing OpenSearch template or pipeline
- Verify success with explicit API calls after every configuration step
- Update documentation ONLY after all tests pass

---

## PHASE 0 — READ LICENSE KEY FROM .ENV

### 0.1 Verify .env exists and contains the required key
```bash
# Run locally — do NOT SSH yet
ls -la /opt/code/wazuh_ova/.env
grep -c "MAXMIND_LICENSE_KEY" /opt/code/wazuh_ova/.env && echo "Key found" || echo "ERROR: Key not found"
```

If key is not found → STOP. Report: "MAXMIND_LICENSE_KEY not found in .env at /opt/code/wazuh_ova/.env"

### 0.2 Export the key for use in this session (local)
```bash
set -a
source /opt/code/wazuh_ova/.env
set +a
echo "License key loaded: ${MAXMIND_LICENSE_KEY:0:4}****"  # Show only first 4 chars
```

### 0.3 Verify key format (should be ~16 alphanumeric chars)
```bash
echo "${#MAXMIND_LICENSE_KEY} characters"
# Expected: 16 or more characters
# If 0 → the variable is empty despite the grep finding the line — check .env format
```

---

## PHASE 1 — PRE-INSTALLATION AUDIT

### 1.1 Check Indexer Node status
```bash
ssh wazuh-user@10.251.151.13 "
  echo '=== OS ===' && cat /etc/os-release | head -3
  echo '=== Disk ===' && df -h /etc /var
  echo '=== OpenSearch ===' && sudo systemctl status wazuh-indexer --no-pager | head -10
  echo '=== OpenSearch version ===' && curl -sk -u admin:admin https://localhost:9200 | python3 -m json.tool | grep -E 'version|number'
"
```

### 1.2 Check if GeoIP DB directory already exists
```bash
ssh wazuh-user@10.251.151.13 "
  ls -lh /etc/wazuh-indexer/ingest-geoip/ 2>/dev/null && echo 'DIR EXISTS' || echo 'DIR MISSING'
"
```

### 1.3 Check if ingest-geoip plugin is enabled
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin https://localhost:9200/_nodes/plugins?pretty \
    | python3 -c \"
import sys, json
d = json.load(sys.stdin)
nodes = d.get('nodes', {})
for nid, n in nodes.items():
    plugins = [p['name'] for p in n.get('plugins', [])]
    geoip = [p for p in plugins if 'geoip' in p.lower()]
    print(f'Node {n[\\\"name\\\"]}: GeoIP plugins = {geoip if geoip else \\\"NONE\\\"}')
\"
"
```

### 1.4 Check if pipeline already exists
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin https://localhost:9200/_ingest/pipeline/wazuh-geoip-pipeline?pretty \
    | python3 -c \"
import sys, json
try:
    d = json.load(sys.stdin)
    if 'wazuh-geoip-pipeline' in d:
        print('Pipeline EXISTS — will update')
    elif 'error' in d:
        print('Pipeline NOT FOUND — will create')
except: print('ERROR reading response')
\"
"
```

### 1.5 Check current index template for GeoLocation mapping
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin 'https://localhost:9200/_index_template/wazuh-alerts-custom-geoip' \
    | python3 -c \"
import sys, json
try:
    d = json.load(sys.stdin)
    if 'index_templates' in d and d['index_templates']:
        print('Template EXISTS — will check priority')
        tmpl = d['index_templates'][0]
        print(f'Priority: {tmpl.get(\\\"priority\\\", \\\"unknown\\\")}')
    elif 'error' in d:
        print('Template NOT FOUND — will create')
except: print('ERROR')
\"
"
```

### 1.6 Report Phase 1 summary
State:
- OpenSearch status: running / not running
- Disk space on /etc: adequate (need ~100MB) / insufficient
- GeoIP dir: exists / missing
- ingest-geoip plugin: present / absent
- Pipeline: exists / missing
- Template: exists / missing

---

## PHASE 2 — INSTALL MAXMIND GEOLITE2-CITY DATABASE

### 2.1 Create GeoIP directory on Indexer Node
```bash
ssh wazuh-user@10.251.151.13 "
  sudo mkdir -p /etc/wazuh-indexer/ingest-geoip
  ls -la /etc/wazuh-indexer/
"
```

### 2.2 Copy and run setup script from project (uses env var for key)
The existing script at `scripts/deploy/setup_geoip_final.sh` already handles
download, extraction, permissions, and cron setup. Transfer and execute it:

```bash
# Transfer script to Indexer
scp /opt/code/wazuh_ova/scripts/deploy/setup_geoip_final.sh \
    wazuh-user@10.251.151.13:/tmp/setup_geoip.sh

# Execute with the license key from .env
ssh wazuh-user@10.251.151.13 "
  sudo MAXMIND_LICENSE_KEY='${MAXMIND_LICENSE_KEY}' bash /tmp/setup_geoip.sh
"
```

If the script fails at download step, verify manually:
```bash
ssh wazuh-user@10.251.151.13 "
  sudo curl -v -L -o /tmp/test_geo.tar.gz \
    'https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz' \
    2>&1 | tail -5
  ls -lh /tmp/test_geo.tar.gz 2>/dev/null
"
# Expected: file size ~60-80MB
# If 401 Unauthorized → license key is wrong
# If file is tiny (<1KB) → download failed silently
```

### 2.3 Verify database installed correctly
```bash
ssh wazuh-user@10.251.151.13 "
  ls -lh /etc/wazuh-indexer/ingest-geoip/
  stat /etc/wazuh-indexer/ingest-geoip/GeoLite2-City.mmdb 2>/dev/null && echo 'DB OK' || echo 'ERROR: mmdb missing'
  sudo ls -la /etc/wazuh-indexer/ingest-geoip/
"
```
Expected output: GeoLite2-City.mmdb approximately 60-80MB, owned by wazuh-indexer:wazuh-indexer, mode 644

### 2.4 Verify cron job created
```bash
ssh wazuh-user@10.251.151.13 "
  sudo crontab -l | grep -i geoip || crontab -l 2>/dev/null | grep -i geoip || \
  ls -la /etc/cron.weekly/ | grep -i geoip
"
```

### 2.5 Restart OpenSearch to load the new DB
```bash
ssh wazuh-user@10.251.151.13 "
  sudo systemctl restart wazuh-indexer
  sleep 20
  sudo systemctl status wazuh-indexer --no-pager | head -10
  curl -sk -u admin:admin https://localhost:9200/_cluster/health?pretty | python3 -m json.tool
"
```
Expected cluster health: green or yellow (yellow is acceptable for single-replica setup)

---

## PHASE 3 — CONFIGURE OPENSEARCH MAPPINGS AND PIPELINE

All curl commands run ON the Indexer Node (10.251.151.13) via SSH.

### 3.1 Backup existing template if it exists
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/_index_template/wazuh-alerts-custom-geoip' \
    -o /tmp/geoip-template-backup-$(date +%Y%m%d).json
  echo 'Backup saved to /tmp/geoip-template-backup-$(date +%Y%m%d).json'
  cat /tmp/geoip-template-backup-*.json | python3 -m json.tool 2>/dev/null | head -20 || echo 'No existing template'
"
```

### 3.2 Create/Update geo_point mapping template (priority 150)
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    -X PUT 'https://localhost:9200/_index_template/wazuh-alerts-custom-geoip' \
    -H 'Content-Type: application/json' -d '{
    \"index_patterns\": [\"wazuh-alerts-4.x-*\"],
    \"priority\": 150,
    \"template\": {
      \"mappings\": {
        \"properties\": {
          \"GeoLocation\": {
            \"properties\": {
              \"location\": { \"type\": \"geo_point\" },
              \"city_name\": { \"type\": \"keyword\" },
              \"country_name\": { \"type\": \"keyword\" },
              \"region_name\": { \"type\": \"keyword\" },
              \"ip\": { \"type\": \"keyword\" }
            }
          },
          \"DestLocation\": {
            \"properties\": {
              \"location\": { \"type\": \"geo_point\" },
              \"city_name\": { \"type\": \"keyword\" },
              \"country_name\": { \"type\": \"keyword\" },
              \"region_name\": { \"type\": \"keyword\" },
              \"ip\": { \"type\": \"keyword\" }
            }
          }
        }
      }
    }
  }' | python3 -m json.tool
"
```
Expected response: `{ \"acknowledged\": true }`

### 3.3 Create Ingest Pipeline (enriches srcip + dstip)
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    -X PUT 'https://localhost:9200/_ingest/pipeline/wazuh-geoip-pipeline' \
    -H 'Content-Type: application/json' -d '{
    \"description\": \"Enrich srcip and dstip with MaxMind GeoLite2 City data\",
    \"processors\": [
      {
        \"geoip\": {
          \"field\": \"data.srcip\",
          \"target_field\": \"GeoLocation\",
          \"database_file\": \"GeoLite2-City.mmdb\",
          \"properties\": [\"city_name\", \"country_name\", \"region_name\", \"location\", \"ip\"],
          \"ignore_missing\": true,
          \"ignore_failure\": true
        }
      },
      {
        \"geoip\": {
          \"field\": \"data.dstip\",
          \"target_field\": \"DestLocation\",
          \"database_file\": \"GeoLite2-City.mmdb\",
          \"properties\": [\"city_name\", \"country_name\", \"region_name\", \"location\", \"ip\"],
          \"ignore_missing\": true,
          \"ignore_failure\": true
        }
      },
      {
        \"geoip\": {
          \"field\": \"src_ip\",
          \"target_field\": \"GeoLocation\",
          \"database_file\": \"GeoLite2-City.mmdb\",
          \"properties\": [\"city_name\", \"country_name\", \"region_name\", \"location\", \"ip\"],
          \"ignore_missing\": true,
          \"ignore_failure\": true
        }
      }
    ]
  }' | python3 -m json.tool
"
```
Note: third processor covers Suricata EVE JSON which uses `src_ip` not `data.srcip`
Expected response: `{ \"acknowledged\": true }`

### 3.4 Set pipeline as default for all wazuh-alerts indexes (priority 200)
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    -X PUT 'https://localhost:9200/_index_template/wazuh-alerts-default-pipeline' \
    -H 'Content-Type: application/json' -d '{
    \"index_patterns\": [\"wazuh-alerts-4.x-*\"],
    \"priority\": 200,
    \"template\": {
      \"settings\": {
        \"index.default_pipeline\": \"wazuh-geoip-pipeline\"
      }
    }
  }' | python3 -m json.tool
"
```
Expected response: `{ \"acknowledged\": true }`

### 3.5 Verify all three configs are in place
```bash
ssh wazuh-user@10.251.151.13 "
  echo '--- Pipeline ---'
  curl -sk -u admin:admin https://localhost:9200/_ingest/pipeline/wazuh-geoip-pipeline \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print(\"OK\" if \"wazuh-geoip-pipeline\" in d else \"MISSING\")'

  echo '--- GeoIP Mapping Template ---'
  curl -sk -u admin:admin https://localhost:9200/_index_template/wazuh-alerts-custom-geoip \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print(\"OK\" if d.get(\"index_templates\") else \"MISSING\")'

  echo '--- Default Pipeline Template ---'
  curl -sk -u admin:admin https://localhost:9200/_index_template/wazuh-alerts-default-pipeline \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print(\"OK\" if d.get(\"index_templates\") else \"MISSING\")'
"
```
All three must show OK before proceeding.

---

## PHASE 4 — TEST GEOIP ENRICHMENT

### 4.1 Pipeline simulation test with known IPs
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    -X POST 'https://localhost:9200/_ingest/pipeline/wazuh-geoip-pipeline/_simulate' \
    -H 'Content-Type: application/json' -d '{
    \"docs\": [
      {
        \"_source\": {
          \"data\": {
            \"srcip\": \"8.8.8.8\",
            \"dstip\": \"1.1.1.1\"
          }
        }
      },
      {
        \"_source\": {
          \"data\": {
            \"srcip\": \"203.0.113.50\",
            \"dstip\": \"10.251.151.12\"
          }
        }
      },
      {
        \"_source\": {
          \"src_ip\": \"77.88.55.55\",
          \"dest_ip\": \"10.251.151.12\"
        }
      }
    ]
  }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
docs = d.get('docs', [])
for i, doc in enumerate(docs):
    src = doc.get('_source', {})
    geo = src.get('GeoLocation', {})
    dst = src.get('DestLocation', {})
    print(f'Doc {i+1}:')
    print(f'  GeoLocation.country_name = {geo.get(\\\"country_name\\\", \\\"NOT ENRICHED\\\")}')
    print(f'  GeoLocation.city_name    = {geo.get(\\\"city_name\\\", \\\"N/A\\\")}')
    print(f'  GeoLocation.location     = {geo.get(\\\"location\\\", \\\"NOT ENRICHED\\\")}')
    print(f'  DestLocation.country     = {dst.get(\\\"country_name\\\", \\\"N/A (private IP)\\\")}')
    errs = doc.get('error', None)
    if errs: print(f'  ERROR: {errs}')
\"
"
```

Expected results:
- Doc 1 (8.8.8.8): GeoLocation.country_name = "United States", location = lat/lon pair
- Doc 2 (203.0.113.50): GeoLocation.country_name populated, DestLocation = N/A (private IP)
- Doc 3 (Yandex IP): GeoLocation.country_name = "Russia" or similar

If all show "NOT ENRICHED" → mmdb file not loaded by OpenSearch. Restart and check plugin.

### 4.2 Inject a real test alert and verify enrichment in the index
```bash
# Inject test document with srcip
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    -X POST 'https://localhost:9200/wazuh-alerts-4.x-$(date +%Y.%m.%d)/_doc?pipeline=wazuh-geoip-pipeline' \
    -H 'Content-Type: application/json' -d '{
    \"@timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"rule\": { \"id\": \"99999\", \"level\": 3, \"description\": \"GeoIP test document\" },
    \"data\": { \"srcip\": \"8.8.8.8\", \"dstip\": \"1.1.1.1\" },
    \"agent\": { \"name\": \"geoip-test\" }
  }' | python3 -m json.tool | grep -E '_id|result'
"
```

Wait 3 seconds, then retrieve and verify:
```bash
ssh wazuh-user@10.251.151.13 "
  sleep 3
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-$(date +%Y.%m.%d)/_search?pretty' \
    -H 'Content-Type: application/json' -d '{
    \"size\": 1,
    \"sort\": [{\"@timestamp\": {\"order\": \"desc\"}}],
    \"query\": { \"match\": { \"agent.name\": \"geoip-test\" } },
    \"_source\": [\"data.srcip\", \"GeoLocation\", \"DestLocation\"]
  }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
hits = d.get('hits', {}).get('hits', [])
if not hits:
    print('ERROR: Test document not found')
else:
    src = hits[0].get('_source', {})
    geo = src.get('GeoLocation', {})
    print('=== ENRICHMENT RESULT ===')
    print(f'srcip:            {src.get(\\\"data\\\",{}).get(\\\"srcip\\\",\\\"?\\\")}')
    print(f'country_name:     {geo.get(\\\"country_name\\\", \\\"MISSING — not enriched\\\")}')
    print(f'city_name:        {geo.get(\\\"city_name\\\", \\\"MISSING\\\")}')
    print(f'location (lat):   {geo.get(\\\"location\\\",{}).get(\\\"lat\\\", \\\"MISSING\\\")}')
    print(f'location (lon):   {geo.get(\\\"location\\\",{}).get(\\\"lon\\\", \\\"MISSING\\\")}')
    if geo.get('country_name'):
        print('\\nSTATUS: ✅ GeoIP enrichment is working correctly')
    else:
        print('\\nSTATUS: ❌ GeoIP enrichment FAILED — check mmdb and plugin')
\"
"
```

### 4.3 Verify real Wazuh alerts are being enriched (check last 10 alerts)
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search?pretty' \
    -H 'Content-Type: application/json' -d '{
    \"size\": 10,
    \"sort\": [{\"@timestamp\": {\"order\": \"desc\"}}],
    \"query\": { \"exists\": { \"field\": \"GeoLocation.country_name\" } },
    \"_source\": [\"@timestamp\", \"data.srcip\", \"GeoLocation.country_name\", \"GeoLocation.city_name\", \"rule.description\"]
  }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
total = d.get('hits',{}).get('total',{}).get('value', 0)
hits = d.get('hits',{}).get('hits', [])
print(f'Total alerts with GeoIP: {total}')
for h in hits:
    s = h['_source']
    ts = s.get('@timestamp','?')[:19]
    srcip = s.get('data',{}).get('srcip','?')
    country = s.get('GeoLocation',{}).get('country_name','?')
    city = s.get('GeoLocation',{}).get('city_name','?')
    rule = s.get('rule',{}).get('description','?')[:40]
    print(f'  [{ts}] {srcip} → {country}/{city} | {rule}')
\"
"
```

### 4.4 Check enrichment coverage (what % of alerts have GeoLocation)
```bash
ssh wazuh-user@10.251.151.13 "
  TOTAL=\$(curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)[\"count\"])')

  ENRICHED=\$(curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
    -H 'Content-Type: application/json' \
    -d '{\"query\":{\"exists\":{\"field\":\"GeoLocation.country_name\"}}}' \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)[\"count\"])')

  echo \"Total alerts: \$TOTAL\"
  echo \"Enriched with GeoIP: \$ENRICHED\"
  python3 -c \"print(f'Coverage: {(\$ENRICHED/\$TOTAL*100):.1f}%' if \$TOTAL > 0 else 'No data')\"
  echo ''
  echo 'NOTE: Only NEW alerts (after pipeline setup) will be enriched.'
  echo 'Historical alerts require reindexing (optional, not recommended in production).'
"
```

### 4.5 Country breakdown of top source IPs
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search?pretty' \
    -H 'Content-Type: application/json' -d '{
    \"size\": 0,
    \"query\": { \"exists\": { \"field\": \"GeoLocation.country_name\" } },
    \"aggs\": {
      \"top_countries\": {
        \"terms\": { \"field\": \"GeoLocation.country_name\", \"size\": 10 }
      }
    }
  }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
buckets = d.get('aggregations',{}).get('top_countries',{}).get('buckets',[])
print('=== Top Source Countries ===')
for b in buckets:
    print(f'  {b[\\\"key\\\"]}: {b[\\\"doc_count\\\"]} alerts')
if not buckets: print('No enriched data yet — wait for new alerts')
\"
"
```

---

## PHASE 5 — VERIFY DASHBOARD VISIBILITY

### 5.1 Check index pattern has geo_point field
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_mapping/field/GeoLocation.location?pretty' \
    | python3 -c \"
import sys, json
d = json.load(sys.stdin)
found = False
for idx, fields in d.items():
    mappings = fields.get('mappings', {})
    loc = mappings.get('GeoLocation.location', {}).get('mapping', {}).get('location', {})
    if loc.get('type') == 'geo_point':
        found = True
        print(f'geo_point mapping: VERIFIED in {idx}')
        break
if not found: print('WARNING: geo_point mapping not found — new index needed')
\"
"
```

### 5.2 Provide Dashboard configuration instructions
After tests pass, instruct the operator to:

```
1. Open https://10.251.151.14
2. Go to: Wazuh → Modules → Security Events → Refresh index pattern
3. Verify field GeoLocation.location appears as type "geo_point"
4. Go to: Dashboard → Create visualization
5. Select type: Maps (Coordinate Map)
6. Index pattern: wazuh-alerts-4.x-*
7. Metrics: Count
8. Buckets: Geo Coordinates on field GeoLocation.location
9. Add filter: exists GeoLocation.country_name
10. Save as: "Attack Source Map — GeoIP"

Useful Dashboard filters to pre-build:
  - FortiGate attacks:  rule.groups:fortigate AND GeoLocation.country_name:*
  - Suricata alerts:    rule.groups:suricata AND GeoLocation.country_name:*
  - Top countries:      Terms aggregation on GeoLocation.country_name
  - All external IPs:   exists GeoLocation.country_name
```

---

## PHASE 6 — AUTO-UPDATE CONFIGURATION VERIFICATION

### 6.1 Confirm cron/weekly script is in place
```bash
ssh wazuh-user@10.251.151.13 "
  echo '--- Cron entries ---'
  sudo crontab -l 2>/dev/null | grep -i geoip || echo 'None in root crontab'
  crontab -l 2>/dev/null | grep -i geoip || echo 'None in user crontab'

  echo '--- Weekly cron script ---'
  ls -la /etc/cron.weekly/ | grep -i geoip || echo 'No weekly script found'

  echo '--- Update script content (without showing key) ---'
  sudo cat /etc/cron.weekly/update-geoip 2>/dev/null \
    | sed 's/LICENSE_KEY=.*/LICENSE_KEY=****REDACTED****/' \
    | head -20 || echo 'Script not found at /etc/cron.weekly/update-geoip'
"
```

### 6.2 Do a dry-run of the update script (without restarting OpenSearch)
```bash
ssh wazuh-user@10.251.151.13 "
  echo 'Checking if update script can reach MaxMind...'
  sudo bash -c '
    source /etc/cron.weekly/update-geoip 2>/dev/null
    curl -s --max-time 10 -o /dev/null -w \"%{http_code}\" \
      \"https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=\${MAXMIND_LICENSE_KEY}&suffix=tar.gz\"
  ' 2>/dev/null | grep -q 200 && echo 'MaxMind API reachable ✅' || echo 'WARNING: Cannot reach MaxMind API'
"
```

---

## PHASE 7 — UPDATE DOCUMENTATION

Run this phase ONLY after all tests in Phase 4 pass.

### 7.1 Create GeoIP completion report
Save to: `/opt/code/wazuh_ova/docs/current/GEOIP_ENRICHMENT_COMPLETED.md`

Write the file with the following structure (fill in actual values from test results):

```markdown
# GeoIP Enrichment — Deployment Report
**Date:** [ACTUAL DATE]
**Status:** ✅ COMPLETED
**Deployed by:** AI Agent (supervised)

## Configuration Summary

| Item | Value | Location |
|------|-------|----------|
| MaxMind Database | GeoLite2-City.mmdb | /etc/wazuh-indexer/ingest-geoip/ |
| DB Size | [ACTUAL SIZE FROM ls -lh] | Indexer Node |
| Ingest Pipeline | wazuh-geoip-pipeline | OpenSearch _ingest/pipeline |
| Mapping Template | wazuh-alerts-custom-geoip | Priority 150 |
| Default Pipeline Template | wazuh-alerts-default-pipeline | Priority 200 |
| Auto-update | Weekly (cron.weekly/update-geoip) | Indexer Node |

## Fields Added to Each Alert

| Field | Type | Source | Example |
|-------|------|--------|---------|
| GeoLocation.country_name | keyword | data.srcip | "China" |
| GeoLocation.city_name | keyword | data.srcip | "Beijing" |
| GeoLocation.region_name | keyword | data.srcip | "Beijing" |
| GeoLocation.location | geo_point | data.srcip | {lat: 39.9, lon: 116.4} |
| GeoLocation.ip | keyword | data.srcip | "203.x.x.x" |
| DestLocation.country_name | keyword | data.dstip | same structure |

## Test Results

| Test | Result |
|------|--------|
| Pipeline simulation (8.8.8.8) | ✅ country_name="United States" |
| Pipeline simulation (1.1.1.1) | ✅ country_name="Australia" |
| Test document index + retrieval | ✅ GeoLocation populated |
| Real alert enrichment | ✅ [X]% of new alerts enriched |
| Country aggregation | ✅ Working |
| MaxMind API connectivity | ✅ HTTP 200 |

## Log Sources Covered

These log sources send srcip/dstip that will now be automatically enriched:
- FortiGate (data.srcip via decoder 1004-fortigate-wuh-decoders.xml)
- Suricata IDS (src_ip in EVE JSON via rule 1006-suricata-ids-rules.xml)
- Huawei USG (data.srcip via local_decoder.xml)
- MikroTik (data.srcip via 1001-mikrotik_decoders.xml)
- Infoblox DNS (data.srcip via 1003-infoblox-decoders.xml)
- AbuseIPDB integration (srcip cross-referenced)

## Dashboard Panels to Create

1. Attack Source Map → Coordinate Map on GeoLocation.location
2. Top Attacker Countries → Terms on GeoLocation.country_name
3. Alert by Country+Rule → Split by country_name + rule.description

## Maintenance

- Auto-update: every Sunday 00:00 via /etc/cron.weekly/update-geoip
- Manual update: `sudo bash /etc/cron.weekly/update-geoip`
- Check DB age: `stat /etc/wazuh-indexer/ingest-geoip/GeoLite2-City.mmdb`
- License key: stored in /opt/code/wazuh_ova/.env (MAXMIND_LICENSE_KEY)

## Known Limitations

- Historical alerts (before this setup) are NOT enriched
- Private IP ranges (RFC1918) will NOT produce GeoLocation (expected behavior)
- MaxMind GeoLite2 accuracy: country ~99%, city ~83% for IPv4
```

### 7.2 Update the Live Server Baseline document
Append to `docs/current/LIVE_SERVER_BASELINE_2026-05-17.md`:

```markdown
## GeoIP Enrichment (added [DATE])

- **Status**: ✅ Active
- **Database**: MaxMind GeoLite2-City at `/etc/wazuh-indexer/ingest-geoip/GeoLite2-City.mmdb`
- **Pipeline**: `wazuh-geoip-pipeline` in OpenSearch ingest
- **Mapping template**: `wazuh-alerts-custom-geoip` (priority 150)
- **Default pipeline template**: `wazuh-alerts-default-pipeline` (priority 200)
- **Auto-update**: `/etc/cron.weekly/update-geoip` (weekly, reads MAXMIND_LICENSE_KEY from env)
- **Fields enriched**: `GeoLocation.{country_name,city_name,region_name,location,ip}` and `DestLocation.*`
- **Coverage**: All new alerts with `data.srcip` or `src_ip` field (FortiGate, Suricata, Huawei, MikroTik, Infoblox)
```

### 7.3 Update main README.md — add GeoIP to "Authoritative Files" section
In `/opt/code/wazuh_ova/README.md`, add to the relevant section:

```markdown
### OpenSearch configuration (Indexer Node 10.251.151.13)

- Ingest pipeline: `wazuh-geoip-pipeline` — enriches `data.srcip` → `GeoLocation`
- Index template: `wazuh-alerts-custom-geoip` (priority 150) — geo_point mapping
- Index template: `wazuh-alerts-default-pipeline` (priority 200) — sets default pipeline
- Setup script: `scripts/deploy/setup_geoip_final.sh` (reads MAXMIND_LICENSE_KEY from .env)
- Auto-update: `/etc/wazuh-indexer/ingest-geoip/` updated weekly via cron
```

### 7.4 Verify all documentation files were written
```bash
ls -la /opt/code/wazuh_ova/docs/current/GEOIP_ENRICHMENT_COMPLETED.md
wc -l /opt/code/wazuh_ova/docs/current/GEOIP_ENRICHMENT_COMPLETED.md
# Expected: file exists, >50 lines
```

---

## PHASE 8 — FINAL VERIFICATION REPORT

After all phases complete, output a structured summary:

```
════════════════════════════════════════════════════════
  GeoIP Enrichment — Final Status Report
  Date: [DATE]
════════════════════════════════════════════════════════

INFRASTRUCTURE
  Indexer Node   : 10.251.151.13
  OpenSearch     : [version]
  DB installed   : /etc/wazuh-indexer/ingest-geoip/GeoLite2-City.mmdb
  DB size        : [size]
  DB date        : [mtime]

OPENSEARCH CONFIGURATION
  Ingest pipeline           : wazuh-geoip-pipeline        [OK/MISSING]
  Geo mapping template      : wazuh-alerts-custom-geoip   [OK/MISSING]
  Default pipeline template : wazuh-alerts-default-pipeline[OK/MISSING]

ENRICHMENT TEST RESULTS
  Pipeline simulation 8.8.8.8     : [country] [city]  [OK/FAIL]
  Pipeline simulation 203.x.x.x   : [country] [city]  [OK/FAIL]
  Test document retrieval          :           [OK/FAIL]
  Real alert enrichment            : [X]% coverage      [OK/FAIL]

AUTO-UPDATE
  Cron schedule : [schedule]
  Script path   : [path]
  Last tested   : [date]

DOCUMENTATION
  GEOIP_ENRICHMENT_COMPLETED.md  : [CREATED/MISSING]
  LIVE_SERVER_BASELINE updated    : [YES/NO]
  README.md updated               : [YES/NO]

OVERALL STATUS: ✅ SUCCESS / ❌ PARTIAL / ❌ FAILED

NEXT STEPS FOR OPERATOR:
1. Open Dashboard https://10.251.151.14
2. Go to Security Events → refresh index pattern
3. Create Coordinate Map visualization on GeoLocation.location
4. Add dashboard panel: Terms aggregation on GeoLocation.country_name
════════════════════════════════════════════════════════
```

---

## TROUBLESHOOTING REFERENCE

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Simulation returns "NOT ENRICHED" | mmdb not loaded by OpenSearch | Restart wazuh-indexer, check plugin |
| HTTP 401 from MaxMind download | Wrong license key | Re-check .env MAXMIND_LICENSE_KEY |
| Download file is <1KB | Key valid but network block | Check outbound HTTPS from Indexer |
| geo_point mapping error | Template priority conflict | Raise priority to 250 |
| 0% enrichment on real alerts | Pipeline not set as default | Re-run Phase 3.4 |
| Suricata alerts not enriched | Field is src_ip not data.srcip | Confirm third processor in pipeline |
| OpenSearch yellow after restart | Single-node cluster (normal) | Expected — not an error |

## KEY FILE LOCATIONS (INDEXER NODE)

```
/etc/wazuh-indexer/ingest-geoip/GeoLite2-City.mmdb  — MaxMind database
/etc/cron.weekly/update-geoip                         — weekly updater
/tmp/geoip-template-backup-*.json                     — config backups
```

## KEY API ENDPOINTS (VERIFY ANYTIME)

```bash
# Pipeline status
curl -sk -u admin:admin https://10.251.151.13:9200/_ingest/pipeline/wazuh-geoip-pipeline

# Template status
curl -sk -u admin:admin https://10.251.151.13:9200/_index_template/wazuh-alerts-custom-geoip

# Count enriched alerts
curl -sk -u admin:admin https://10.251.151.13:9200/wazuh-alerts-4.x-*/_count \
  -H 'Content-Type: application/json' \
  -d '{"query":{"exists":{"field":"GeoLocation.country_name"}}}'
```
