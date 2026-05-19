# Agent Prompt: Vulnerability Detection & Security Config Assessment (SCA)
# Target: Wazuh Cluster — All Nodes
# OS: Amazon Linux 2
# Project: /opt/code/wazuh_ova/
# Created: 2026-05-18

---

## SYSTEM CONTEXT

You are a senior Wazuh SIEM engineer enabling two built-in modules that are
already present in Wazuh 4.14.5 but not yet activated on this cluster:
  1. Vulnerability Detection — scans agents for known CVEs
  2. Security Configuration Assessment (SCA) — audits hardening vs CIS Benchmark

Both modules require NO additional installation. They are enabled by editing
ossec.conf and agent configuration, then restarting services.

```
Cluster:
  Master     10.251.151.11  (Wazuh 4.14.5, role=master — ossec.conf changes here)
  Worker     10.251.151.12  (Wazuh 4.14.5, role=worker, Suricata 7.0.10)
  Indexer    10.251.151.13  (OpenSearch 7.10.2)
  Dashboard  10.251.151.14  (HTTPS :443)

SSH  : user=wazuh-user  password=wazuh  (sudo su for root)
API  : admin / admin
OS   : Amazon Linux 2

Project root: /opt/code/wazuh_ova/
Doc output  : docs/current/VULN_SCA_SETUP.md
Rule output : None needed — both modules are built-in

Target nodes for Vulnerability Detection scan:
  - wazuh-master  (10.251.151.11) — has Wazuh Agent built-in
  - wazuh-worker  (10.251.151.12) — has Wazuh Agent built-in
  (Indexer and Dashboard nodes scan themselves via their own wazuh-agent process)

SCA Policy Files (already present in Wazuh install):
  /var/ossec/ruleset/sca/cis_amazon_linux_2.yml   — Amazon Linux 2 CIS Benchmark
  /var/ossec/ruleset/sca/cis_rhel7_linux.yml      — fallback if AL2 file missing
  /var/ossec/ruleset/sca/sca_unix_audit.yml       — generic Unix audit
```

---

## OPERATING RULES

- Always run READ-ONLY audit first — show exact output before any changes
- Validate ossec.conf with xmllint before every restart
- Restart order: Master first → 30s wait → Worker
- Never remove existing config blocks — only ADD or MODIFY
- Show actual command output at every step — never assume success
- Save all output for the documentation phase
- Documentation written ONLY after all tests pass

---

## PHASE 1 — AUDIT CURRENT STATE

### 1.1 Check current Vulnerability Detection status on Master
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Vulnerability Detection in ossec.conf ==='
  sudo grep -A 10 'vulnerability-detection\|vulnerability_detection' \
    /var/ossec/etc/ossec.conf || echo 'NOT CONFIGURED'

  echo ''
  echo '=== Wazuh version ==='
  sudo /var/ossec/bin/wazuh-control info | head -5

  echo ''
  echo '=== Built-in vulnerability ruleset ==='
  ls /var/ossec/ruleset/rules/ | grep -i vuln | head -10

  echo ''
  echo '=== Current syscollector config (needed for vuln scan) ==='
  sudo grep -A 15 'syscollector' /var/ossec/etc/ossec.conf | head -20 || \
    echo 'No syscollector block found in ossec.conf'
"
```

### 1.2 Check SCA status on Master
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== SCA config in ossec.conf ==='
  sudo grep -A 10 '<sca>' /var/ossec/etc/ossec.conf || echo 'NOT CONFIGURED'

  echo ''
  echo '=== Available SCA policy files ==='
  ls -lh /var/ossec/ruleset/sca/*.yml 2>/dev/null | head -20

  echo ''
  echo '=== Amazon Linux 2 CIS policy exists? ==='
  ls -lh /var/ossec/ruleset/sca/cis_amazon_linux_2.yml 2>/dev/null && \
    echo 'CIS AL2 policy: FOUND' || echo 'CIS AL2 policy: MISSING'

  echo ''
  echo '=== SCA results directory ==='
  ls /var/ossec/queue/sca/ 2>/dev/null | head -10 || \
    echo 'No SCA results yet (not run)'
"
```

### 1.3 Check Wazuh Agent status on all nodes
```bash
for NODE in 10.251.151.11 10.251.151.12; do
  echo "=== Node $NODE ==="
  ssh wazuh-user@$NODE "
    sudo /var/ossec/bin/wazuh-control status | grep -E 'agent|syschk|vuln|sca'
    echo 'Agent config:'
    sudo grep -E 'syscollector|sca|vulnerability' /var/ossec/etc/ossec.conf | head -10
  " 2>/dev/null
  echo ''
done
```

### 1.4 Check if vulnerability databases exist
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Vulnerability databases ==='
  ls -lh /var/ossec/queue/vulnerabilities/ 2>/dev/null || \
    echo 'Vulnerability DB directory not found (will be downloaded on first run)'

  echo ''
  echo '=== CVE feed config ==='
  cat /var/ossec/etc/shared/vulnerability-detector.yml 2>/dev/null | head -30 || \
    echo 'No external config (built-in defaults will be used)'
"
```

### 1.5 Report Phase 1 Summary
State:
- Vulnerability Detection: enabled/disabled
- SCA: enabled/disabled
- CIS Amazon Linux 2 policy: present/absent
- Vulnerability DB: present/absent
- Syscollector: configured/not configured

---

## PHASE 2 — ENABLE VULNERABILITY DETECTION

### 2.1 Backup Master ossec.conf
```bash
ssh wazuh-user@10.251.151.11 "
  sudo cp /var/ossec/etc/ossec.conf \
          /var/ossec/etc/ossec.conf.bak.$(date +%Y%m%d_%H%M%S)
  echo 'Backup created:'
  ls -lh /var/ossec/etc/ossec.conf.bak.*
"
```

### 2.2 Add Vulnerability Detection block to Master ossec.conf
Check if the block already exists first:
```bash
ssh wazuh-user@10.251.151.11 "
  sudo grep -c 'vulnerability-detection' /var/ossec/etc/ossec.conf && \
    echo 'Already present — will update' || echo 'Not present — will add'
"
```

If NOT present, add before the closing `</ossec_config>` tag:
```bash
ssh wazuh-user@10.251.151.11 "sudo bash -s" << 'REMOTE_VULN'
FILE='/var/ossec/etc/ossec.conf'
# Remove closing ossec_config tag, add vuln block, re-add closing tag
sudo sed -i 's|</ossec_config>||g' "$FILE"

sudo tee -a "$FILE" > /dev/null << 'VULN_BLOCK'

  <!-- ============================================================
       VULNERABILITY DETECTION — Enabled 2026-05-18
       Scans: Amazon Linux 2 packages (yum)
       NVD feed: updated every 60 minutes
       Runs: every 12 hours + on startup
  ============================================================ -->
  <vulnerability-detection>
    <enabled>yes</enabled>
    <interval>12h</interval>
    <min-full-scan-interval>6h</min-full-scan-interval>
    <run-on-start>yes</run-on-start>
  </vulnerability-detection>

</ossec_config>
VULN_BLOCK

echo 'Vulnerability Detection block added'
sudo tail -15 "$FILE"
REMOTE_VULN
```

### 2.3 Ensure Syscollector is enabled (required for Vuln Detection)
Syscollector collects package inventory — without it, Vulnerability Detection cannot scan.

```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Checking syscollector block ==='
  sudo grep -c '<wodle name=\"syscollector\">' /var/ossec/etc/ossec.conf && \
    echo 'Syscollector already configured' || echo 'Need to add syscollector'
"
```

If syscollector is missing or packages disabled, add/fix it:
```bash
ssh wazuh-user@10.251.151.11 "sudo bash -s" << 'REMOTE_SYSCOLL'
FILE='/var/ossec/etc/ossec.conf'
# Check if syscollector already has packages enabled
if sudo grep -q 'wodle name="syscollector"' "$FILE"; then
  echo 'Syscollector block exists, checking packages...'
  if sudo grep -A 20 'syscollector' "$FILE" | grep -q 'packages.*no'; then
    echo 'Packages disabled — enabling'
    sudo sed -i 's|<packages>no</packages>|<packages>yes</packages>|g' "$FILE"
  fi
  if sudo grep -A 20 'syscollector' "$FILE" | grep -q 'os.*no'; then
    sudo sed -i 's|<os>no</os>|<os>yes</os>|g' "$FILE"
  fi
  echo 'Syscollector packages enabled'
else
  echo 'No syscollector block found — adding'
  # Add before </ossec_config>
  sudo sed -i 's|</ossec_config>||g' "$FILE"
  sudo tee -a "$FILE" > /dev/null << 'SCA_BLOCK'

  <wodle name="syscollector">
    <disabled>no</disabled>
    <interval>1h</interval>
    <scan_on_start>yes</scan_on_start>
    <hardware>yes</hardware>
    <os>yes</os>
    <network>yes</network>
    <packages>yes</packages>
    <ports all="no">yes</ports>
    <processes>yes</processes>
  </wodle>

</ossec_config>
SCA_BLOCK
fi
REMOTE_SYSCOLL
```

### 2.4 Validate XML
```bash
ssh wazuh-user@10.251.151.11 "
  sudo xmllint --noout /var/ossec/etc/ossec.conf && echo 'ossec.conf XML: OK'
  sudo grep -A 8 'vulnerability-detection' /var/ossec/etc/ossec.conf
"
```

---

## PHASE 3 — ENABLE SECURITY CONFIGURATION ASSESSMENT (SCA)

### 3.1 Check available CIS policies
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== All available SCA policies ==='
  ls -lh /var/ossec/ruleset/sca/ | grep -E '\.yml|\.yaml'

  echo ''
  echo '=== Policy for Amazon Linux 2 ==='
  head -20 /var/ossec/ruleset/sca/cis_amazon_linux_2.yml 2>/dev/null || \
    head -20 /var/ossec/ruleset/sca/cis_rhel7_linux.yml 2>/dev/null || \
    echo 'Neither AL2 nor RHEL7 CIS policy found'
"
```

### 3.2 Add SCA configuration block to Master ossec.conf
```bash
ssh wazuh-user@10.251.151.11 "
  sudo grep -c '<sca>' /var/ossec/etc/ossec.conf && \
    echo 'SCA block exists' || echo 'Need to add SCA block'
"
```

If SCA block is missing:
```bash
ssh wazuh-user@10.251.151.11 "sudo bash -s" << 'REMOTE_SCA'
FILE='/var/ossec/etc/ossec.conf'

# Determine which CIS policy file exists
if [ -f /var/ossec/ruleset/sca/cis_amazon_linux_2.yml ]; then
  CIS_POLICY="etc/shared/cis_amazon_linux_2.yml"
  sudo cp /var/ossec/ruleset/sca/cis_amazon_linux_2.yml \
          /var/ossec/etc/shared/cis_amazon_linux_2.yml
  sudo chown root:wazuh /var/ossec/etc/shared/cis_amazon_linux_2.yml
  echo "Using CIS Amazon Linux 2 policy"
elif [ -f /var/ossec/ruleset/sca/cis_rhel7_linux.yml ]; then
  CIS_POLICY="etc/shared/cis_rhel7_linux.yml"
  sudo cp /var/ossec/ruleset/sca/cis_rhel7_linux.yml \
          /var/ossec/etc/shared/cis_rhel7_linux.yml
  sudo chown root:wazuh /var/ossec/etc/shared/cis_rhel7_linux.yml
  echo "Using CIS RHEL7 policy (closest to Amazon Linux 2)"
else
  CIS_POLICY="etc/shared/sca_unix_audit.yml"
  sudo cp /var/ossec/ruleset/sca/sca_unix_audit.yml \
          /var/ossec/etc/shared/sca_unix_audit.yml
  sudo chown root:wazuh /var/ossec/etc/shared/sca_unix_audit.yml
  echo "Using generic Unix audit policy"
fi

sudo sed -i 's|</ossec_config>||g' "$FILE"
cat >> /tmp/sca_block.txt << SCAEOF

  <!-- ============================================================
       SECURITY CONFIGURATION ASSESSMENT (SCA) — Enabled 2026-05-18
       CIS Benchmark: Amazon Linux 2
       Interval: every 12 hours + on startup
  ============================================================ -->
  <sca>
    <enabled>yes</enabled>
    <scan_on_start>yes</scan_on_start>
    <interval>12h</interval>
    <skip_nfs>yes</skip_nfs>
    <policies>
      <policy>${CIS_POLICY}</policy>
      <policy>etc/shared/sca_unix_audit.yml</policy>
    </policies>
  </sca>

</ossec_config>
SCAEOF

sudo bash -c "cat /tmp/sca_block.txt >> $FILE"
rm -f /tmp/sca_block.txt
echo "SCA block added with policy: $CIS_POLICY"
REMOTE_SCA
```

### 3.3 Validate XML again
```bash
ssh wazuh-user@10.251.151.11 "
  sudo xmllint --noout /var/ossec/etc/ossec.conf && echo 'ossec.conf XML: OK'
  echo '=== SCA block ==='
  sudo grep -A 12 '<sca>' /var/ossec/etc/ossec.conf
"
```

---

## PHASE 4 — APPLY SAME CONFIG TO WORKER NODE

### 4.1 Check Worker ossec.conf for Syscollector and SCA
```bash
ssh wazuh-user@10.251.151.12 "
  echo '=== Worker syscollector ==='
  sudo grep -A 15 'syscollector' /var/ossec/etc/ossec.conf | head -20 || \
    echo 'No syscollector on Worker'

  echo ''
  echo '=== Worker SCA ==='
  sudo grep -A 10 '<sca>' /var/ossec/etc/ossec.conf || echo 'No SCA on Worker'

  echo ''
  echo '=== Worker Vulnerability Detection ==='
  sudo grep -A 8 'vulnerability-detection' /var/ossec/etc/ossec.conf || \
    echo 'No vuln-detection on Worker'
"
```

### 4.2 Apply Syscollector, SCA, and Vuln Detection to Worker
The Worker runs as wazuh-manager (syslog receiver). It also needs these modules
to scan the Worker host itself (including Suricata packages).

Apply the same blocks to Worker — follow the same sed/append pattern as Master.
Validate XML before restart:
```bash
ssh wazuh-user@10.251.151.12 "
  sudo xmllint --noout /var/ossec/etc/ossec.conf && echo 'Worker ossec.conf XML: OK'
"
```

---

## PHASE 5 — RESTART CLUSTER

### 5.1 Restart Master first
```bash
ssh wazuh-user@10.251.151.11 "
  sudo /var/ossec/bin/wazuh-control restart
  sleep 30
  echo '=== Master status ==='
  sudo /var/ossec/bin/wazuh-control status | grep -E 'running|stopped'
  echo ''
  echo '=== Check for errors ==='
  sudo grep -i 'error\|fatal\|critical' /var/ossec/logs/ossec.log | \
    grep -v 'deprecated' | tail -10
"
```

### 5.2 Wait 30 seconds then restart Worker
```bash
sleep 30
ssh wazuh-user@10.251.151.12 "
  sudo /var/ossec/bin/wazuh-control restart
  sleep 15
  echo '=== Worker status ==='
  sudo /var/ossec/bin/wazuh-control status | grep -E 'running|stopped'
"
```

### 5.3 Verify Vulnerability Detection daemon is running
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Vulnerability detector process ==='
  sudo pgrep -a wazuh-vulnerability || echo 'Process not found (may start shortly)'

  echo ''
  echo '=== Vulnerability log ==='
  sudo tail -20 /var/ossec/logs/ossec.log | grep -i 'vuln\|vulnerability'

  echo ''
  echo '=== SCA log ==='
  sudo tail -20 /var/ossec/logs/ossec.log | grep -i 'sca\|audit\|benchmark'
"
```

---

## PHASE 6 — VERIFY VULNERABILITY DETECTION

### 6.1 Wait for first scan to complete (5-10 minutes)
```bash
echo 'Waiting 10 minutes for initial scan...'
sleep 600

ssh wazuh-user@10.251.151.11 "
  echo '=== Vulnerability scan progress ==='
  sudo tail -50 /var/ossec/logs/ossec.log | grep -i 'vuln' | tail -20

  echo ''
  echo '=== Check vulnerability DB downloaded ==='
  ls -lh /var/ossec/queue/vulnerabilities/ 2>/dev/null || \
    echo 'DB directory not found yet'

  echo ''
  echo '=== CVE alerts in OpenSearch ==='
  curl -sk -u admin:admin \
    'https://10.251.151.13:9200/wazuh-alerts-4.x-*/_count' \
    -H 'Content-Type: application/json' \
    -d '{\"query\":{\"match\":{\"rule.groups\":\"vulnerability-detector\"}}}' | \
    python3 -c 'import sys,json; d=json.load(sys.stdin); print(f\"CVE alerts found: {d[\\\"count\\\"]}\")'
"
```

### 6.2 Query actual CVE findings
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search' \
    -H 'Content-Type: application/json' \
    -d '{
      \"size\": 10,
      \"sort\": [{\"@timestamp\": {\"order\": \"desc\"}}],
      \"query\": {
        \"bool\": {
          \"should\": [
            {\"match\": {\"rule.groups\": \"vulnerability-detector\"}},
            {\"match\": {\"data.vulnerability.severity\": \"High\"}},
            {\"match\": {\"data.vulnerability.severity\": \"Critical\"}}
          ]
        }
      },
      \"_source\": [\"@timestamp\",\"agent.name\",\"data.vulnerability.cve\",
                   \"data.vulnerability.severity\",\"data.vulnerability.package.name\",
                   \"data.vulnerability.package.version\",\"data.vulnerability.title\"]
    }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
hits = d.get('hits',{}).get('hits',[])
total = d.get('hits',{}).get('total',{}).get('value',0)
print(f'Total CVE alerts: {total}')
print('Top CVEs:')
for h in hits:
  s = h['_source']
  vuln = s.get('data',{}).get('vulnerability',{})
  pkg = vuln.get('package',{})
  print(f'  [{vuln.get(\\\"severity\\\",\\\"?\\\")}] {vuln.get(\\\"cve\\\",\\\"?\\\")} — {pkg.get(\\\"name\\\",\\\"?\\\")} {pkg.get(\\\"version\\\",\\\"?\\\")} | Agent: {s.get(\\\"agent\\\",{}).get(\\\"name\\\",\\\"?\\\")}')
  print(f'    {vuln.get(\\\"title\\\",\\\"?\\\")[:70]}')
\"
"
```

### 6.3 Check CVE severity breakdown
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search' \
    -H 'Content-Type: application/json' \
    -d '{
      \"size\": 0,
      \"query\": {\"match\": {\"rule.groups\": \"vulnerability-detector\"}},
      \"aggs\": {
        \"by_severity\": {
          \"terms\": {\"field\": \"data.vulnerability.severity\", \"size\": 10}
        },
        \"by_agent\": {
          \"terms\": {\"field\": \"agent.name\", \"size\": 5}
        }
      }
    }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
total = d.get('hits',{}).get('total',{}).get('value',0)
sev = d.get('aggregations',{}).get('by_severity',{}).get('buckets',[])
agents = d.get('aggregations',{}).get('by_agent',{}).get('buckets',[])
print(f'Total CVEs found: {total}')
print('By severity:')
for b in sev: print(f'  {b[\\\"key\\\"]}: {b[\\\"doc_count\\\"]}')
print('By agent:')
for b in agents: print(f'  {b[\\\"key\\\"]}: {b[\\\"doc_count\\\"]}')
\"
"
```

### 6.4 Verify via Dashboard
```
1. Open https://10.251.151.14
2. Go to: Modules → Vulnerability Detection
3. Verify agents appear in the list
4. Check: Critical / High / Medium / Low CVE counts
5. Click any CVE to see full details
```

---

## PHASE 7 — VERIFY SECURITY CONFIGURATION ASSESSMENT

### 7.1 Check SCA scan has run
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== SCA results on disk ==='
  ls -lh /var/ossec/queue/sca/ 2>/dev/null || \
    echo 'No SCA results yet'

  echo ''
  echo '=== SCA log output ==='
  sudo grep -i 'sca\|benchmark\|policy\|CIS' /var/ossec/logs/ossec.log | \
    tail -30

  echo ''
  echo '=== SCA alerts ==='
  sudo grep -c 'sca' /var/ossec/logs/alerts/alerts.json 2>/dev/null || \
    echo 'No SCA alerts yet in alerts.json'
"
```

### 7.2 Query SCA results from OpenSearch
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search' \
    -H 'Content-Type: application/json' \
    -d '{
      \"size\": 5,
      \"sort\": [{\"@timestamp\": {\"order\": \"desc\"}}],
      \"query\": {
        \"bool\": {
          \"should\": [
            {\"match\": {\"rule.groups\": \"sca\"}},
            {\"exists\": {\"field\": \"data.sca.check.result\"}}
          ]
        }
      },
      \"_source\": [\"@timestamp\",\"agent.name\",\"data.sca.policy\",
                   \"data.sca.check.title\",\"data.sca.check.result\",
                   \"data.sca.check.compliance.cis\",\"rule.description\"]
    }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
total = d.get('hits',{}).get('total',{}).get('value',0)
hits = d.get('hits',{}).get('hits',[])
print(f'Total SCA results: {total}')
for h in hits:
  s = h['_source']
  sca = s.get('data',{}).get('sca',{})
  chk = sca.get('check',{})
  print(f'  [{chk.get(\\\"result\\\",\\\"?\\\")}] {chk.get(\\\"title\\\",\\\"?\\\")[:60]}')
  print(f'    CIS: {chk.get(\\\"compliance\\\",{}).get(\\\"cis\\\",\\\"?\\\")} | Agent: {s.get(\\\"agent\\\",{}).get(\\\"name\\\",\\\"?\\\")}')
\"
"
```

### 7.3 Get SCA pass/fail summary per agent
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search' \
    -H 'Content-Type: application/json' \
    -d '{
      \"size\": 0,
      \"query\": {\"match\": {\"rule.groups\": \"sca\"}},
      \"aggs\": {
        \"by_result\": {
          \"terms\": {\"field\": \"data.sca.check.result\", \"size\": 5}
        },
        \"by_agent\": {
          \"terms\": {\"field\": \"agent.name\", \"size\": 5}
        }
      }
    }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
results = d.get('aggregations',{}).get('by_result',{}).get('buckets',[])
agents = d.get('aggregations',{}).get('by_agent',{}).get('buckets',[])
print('SCA results by pass/fail:')
for b in results: print(f'  {b[\\\"key\\\"]}: {b[\\\"doc_count\\\"]}')
print('SCA results by agent:')
for b in agents: print(f'  {b[\\\"key\\\"]}: {b[\\\"doc_count\\\"]}')
\"
"
```

### 7.4 Verify via Dashboard
```
1. Open https://10.251.151.14
2. Go to: Modules → Security Configuration Assessment
3. Select an agent (wazuh-master or wazuh-worker)
4. Verify: Policy loaded, scan date shown, pass/fail counts
5. Click on "failed" items to see remediation guidance
```

---

## PHASE 8 — COMPLIANCE INTEGRATION VERIFICATION

### 8.1 Verify SCA feeds into Compliance Dashboard
SCA results should now appear under compliance frameworks:
```bash
ssh wazuh-user@10.251.151.13 "
  echo '=== SCA alerts with CIS compliance tag ==='
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
    -H 'Content-Type: application/json' \
    -d '{\"query\":{\"exists\":{\"field\":\"data.sca.check.compliance.cis\"}}}' | \
    python3 -c 'import sys,json; d=json.load(sys.stdin); print(f\"SCA CIS results: {d[\\\"count\\\"]}\")'

  echo ''
  echo '=== SCA alerts with NIST tag ==='
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
    -H 'Content-Type: application/json' \
    -d '{\"query\":{\"exists\":{\"field\":\"data.sca.check.compliance.nist_800_53\"}}}' | \
    python3 -c 'import sys,json; d=json.load(sys.stdin); print(f\"SCA NIST-mapped results: {d[\\\"count\\\"]}\")'

  echo ''
  echo '=== SCA alerts with PCI DSS tag ==='
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
    -H 'Content-Type: application/json' \
    -d '{\"query\":{\"exists\":{\"field\":\"data.sca.check.compliance.pci_dss\"}}}' | \
    python3 -c 'import sys,json; d=json.load(sys.stdin); print(f\"SCA PCI-mapped results: {d[\\\"count\\\"]}\")'
"
```

---

## PHASE 9 — GENERATE DOCUMENTATION

After all tests in Phases 6-8 pass, write the documentation file.

### 9.1 Collect final stats for documentation
```bash
# Collect all key metrics
ssh wazuh-user@10.251.151.13 "
  echo '--- STATS FOR DOCUMENTATION ---'

  echo 'CVE total:'
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
    -H 'Content-Type: application/json' \
    -d '{\"query\":{\"match\":{\"rule.groups\":\"vulnerability-detector\"}}}' | \
    python3 -c 'import sys,json; print(json.load(sys.stdin)[\"count\"])'

  echo 'SCA total:'
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
    -H 'Content-Type: application/json' \
    -d '{\"query\":{\"match\":{\"rule.groups\":\"sca\"}}}' | \
    python3 -c 'import sys,json; print(json.load(sys.stdin)[\"count\"])'

  echo 'Critical CVEs:'
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
    -H 'Content-Type: application/json' \
    -d '{\"query\":{\"match\":{\"data.vulnerability.severity\":\"Critical\"}}}' | \
    python3 -c 'import sys,json; print(json.load(sys.stdin)[\"count\"])'

  echo 'High CVEs:'
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
    -H 'Content-Type: application/json' \
    -d '{\"query\":{\"match\":{\"data.vulnerability.severity\":\"High\"}}}' | \
    python3 -c 'import sys,json; print(json.load(sys.stdin)[\"count\"])'
"
```

### 9.2 Create documentation file
Create `/opt/code/wazuh_ova/docs/current/VULN_SCA_SETUP.md`:

```markdown
# Vulnerability Detection & Security Configuration Assessment
**Date:** [ACTUAL DATE FROM TEST]
**Status:** ✅ COMPLETED AND VERIFIED
**Wazuh Version:** 4.14.5
**Target Nodes:** wazuh-master (10.251.151.11), wazuh-worker (10.251.151.12)

---

## Overview

Both modules are **built-in** to Wazuh 4.14.5 — no additional packages needed.

| Module | Purpose | Data Source |
|--------|---------|-------------|
| Vulnerability Detection | Scan installed packages for known CVEs | Syscollector package inventory |
| Security Config Assessment (SCA) | Audit OS hardening vs CIS Benchmark | Direct system checks (files, permissions, services) |

---

## Configuration Added

### ossec.conf blocks added on both Master and Worker

**Syscollector** (required for Vulnerability Detection):
```xml
<wodle name="syscollector">
  <disabled>no</disabled>
  <interval>1h</interval>
  <scan_on_start>yes</scan_on_start>
  <hardware>yes</hardware>
  <os>yes</os>
  <network>yes</network>
  <packages>yes</packages>
  <ports all="no">yes</ports>
  <processes>yes</processes>
</wodle>
```

**Vulnerability Detection:**
```xml
<vulnerability-detection>
  <enabled>yes</enabled>
  <interval>12h</interval>
  <min-full-scan-interval>6h</min-full-scan-interval>
  <run-on-start>yes</run-on-start>
</vulnerability-detection>
```

**Security Configuration Assessment:**
```xml
<sca>
  <enabled>yes</enabled>
  <scan_on_start>yes</scan_on_start>
  <interval>12h</interval>
  <skip_nfs>yes</skip_nfs>
  <policies>
    <policy>etc/shared/cis_amazon_linux_2.yml</policy>
    <policy>etc/shared/sca_unix_audit.yml</policy>
  </policies>
</sca>
```

---

## SCA Policy Files

| File | Benchmark | Checks |
|------|-----------|--------|
| cis_amazon_linux_2.yml | CIS Amazon Linux 2 Level 1 | [N from test] |
| sca_unix_audit.yml | Generic Unix Security Audit | [N from test] |

**Location on Master:** `/var/ossec/etc/shared/`
**Source:** `/var/ossec/ruleset/sca/` (Wazuh built-in)

---

## Scan Schedule

| Module | Interval | On Startup |
|--------|---------|-----------|
| Syscollector (package inventory) | Every 1 hour | Yes |
| Vulnerability Detection | Every 12 hours | Yes |
| Security Config Assessment | Every 12 hours | Yes |

---

## Verification Results

### Vulnerability Detection

| Metric | Value |
|--------|-------|
| Total CVEs found | [FROM TEST] |
| Critical | [FROM TEST] |
| High | [FROM TEST] |
| Medium | [FROM TEST] |
| Low | [FROM TEST] |
| Agents scanned | wazuh-master, wazuh-worker |
| First scan completed | [DATE/TIME FROM TEST] |

### Security Config Assessment

| Metric | Value |
|--------|-------|
| Policy | CIS Amazon Linux 2 |
| Total checks | [FROM TEST] |
| Passed | [FROM TEST] |
| Failed | [FROM TEST] |
| Agents scanned | wazuh-master, wazuh-worker |
| First scan completed | [DATE/TIME FROM TEST] |

---

## Dashboard Access

**Vulnerability Detection:**
- Wazuh Dashboard → Modules → Vulnerability Detection
- Filter by: agent, severity, CVE, package name
- Action: click any CVE to see remediation guidance

**Security Config Assessment:**
- Wazuh Dashboard → Modules → Security Configuration Assessment
- Select agent → view CIS benchmark results
- Failed items include remediation commands

---

## Compliance Integration

SCA results are automatically tagged with compliance framework references:
- `data.sca.check.compliance.cis` — CIS Controls
- `data.sca.check.compliance.pci_dss` — PCI DSS
- `data.sca.check.compliance.nist_800_53` — NIST 800-53

These feed into the existing **Compliance Dashboard** (`compliance-overview-dashboard.ndjson`).

---

## Maintenance

### Manual re-scan
```bash
# Force immediate vulnerability scan
ssh wazuh-user@10.251.151.11
sudo wazuh-control restart

# Force SCA scan on specific agent (replace AGENT_ID)
curl -u admin:admin -k -X PUT \
  "https://10.251.151.11:55000/sca/AGENT_ID/run" \
  -H "Authorization: Bearer $(curl -su admin:admin -k \
    https://10.251.151.11:55000/security/user/authenticate \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)[\"data\"][\"token\"])')"
```

### Check vulnerability scan logs
```bash
ssh wazuh-user@10.251.151.11
sudo grep -i 'vulnerab' /var/ossec/logs/ossec.log | tail -20
```

### Check SCA scan logs
```bash
ssh wazuh-user@10.251.151.11
sudo grep -i 'sca\|benchmark' /var/ossec/logs/ossec.log | tail -20
```

---

## Known Limitations

- **Amazon Linux 2 + Wazuh 4.14.5:** CVE database is downloaded from NVD on first run.
  Initial download may take 5-15 minutes. If cluster has no internet access, CVE DB
  must be updated manually.
- **Suricata packages (on Worker):** These will appear in the vulnerability scan.
  Any CVEs found in Suricata 7.0.10 should be reviewed against the Suricata changelog.
- **SCA false positives:** Some CIS checks may flag intentional configurations
  (e.g., listening ports needed for Wazuh operation). Review failed items before
  attempting remediation.
- **No Windows agents:** Vulnerability Detection and SCA are not yet configured
  for Windows endpoints. Add when Windows Agent + Sysmon is deployed.
```

### 9.3 Update README.md
Add to `/opt/code/wazuh_ova/README.md` under Authoritative Files:
```markdown
### Modules Enabled (ossec.conf on Master + Worker)

- Syscollector: package/OS/network/process inventory — every 1h
- Vulnerability Detection: CVE scan via NVD — every 12h, on startup
- Security Config Assessment: CIS Amazon Linux 2 + Unix audit — every 12h, on startup
```

### 9.4 Update Live Server Baseline
Append to `docs/current/LIVE_SERVER_BASELINE_2026-05-17.md`:
```markdown
## Vulnerability Detection & SCA (added [DATE])

- **Status**: ✅ Active on wazuh-master and wazuh-worker
- **Vulnerability Detection**: `<vulnerability-detection>` block in ossec.conf, interval=12h
- **SCA**: `<sca>` block with CIS Amazon Linux 2 + Unix audit policies, interval=12h
- **Syscollector**: `<wodle name="syscollector">` packages=yes, interval=1h
- **First scan**: [DATE/TIME FROM TEST]
- **CVEs found**: [N] total — see Wazuh Dashboard → Vulnerability Detection
- **SCA results**: [N] checks — see Wazuh Dashboard → Security Config Assessment
- **Doc**: `docs/current/VULN_SCA_SETUP.md`
```

---

## PHASE 10 — FINAL VERIFICATION REPORT

```
════════════════════════════════════════════════════════════
  Vulnerability Detection & SCA — Final Status Report
  Date: [DATE]
════════════════════════════════════════════════════════════

MODULE 1: VULNERABILITY DETECTION
  Config added    : ossec.conf vulnerability-detection block    [OK/FAIL]
  Syscollector    : packages=yes enabled                        [OK/FAIL]
  XML valid       : xmllint passed                              [OK/FAIL]
  Service running : wazuh-vulnerability process active          [OK/FAIL]
  CVE DB          : downloaded to /var/ossec/queue/             [OK/FAIL]
  First scan done : [TIMESTAMP]                                 [OK/FAIL]
  CVEs found      : Total=[N] Critical=[N] High=[N] Med=[N]
  Dashboard       : Modules → Vulnerability Detection shows data[OK/FAIL]

MODULE 2: SECURITY CONFIG ASSESSMENT
  Config added    : ossec.conf sca block                        [OK/FAIL]
  Policy file     : cis_amazon_linux_2.yml in /var/ossec/etc/   [OK/FAIL]
  XML valid       : xmllint passed                              [OK/FAIL]
  First scan done : [TIMESTAMP]                                 [OK/FAIL]
  Checks run      : Total=[N] Pass=[N] Fail=[N]
  Dashboard       : Modules → SCA shows results                 [OK/FAIL]

COMPLIANCE INTEGRATION
  SCA CIS tags    : data.sca.check.compliance.cis populated     [OK/FAIL]
  SCA NIST tags   : data.sca.check.compliance.nist_800_53       [OK/FAIL]
  SCA PCI tags    : data.sca.check.compliance.pci_dss           [OK/FAIL]

NODES COVERED
  wazuh-master  (10.251.151.11)  : Vuln + SCA  [OK/FAIL]
  wazuh-worker  (10.251.151.12)  : Vuln + SCA  [OK/FAIL]

DOCUMENTATION
  VULN_SCA_SETUP.md created      : docs/current/               [OK/FAIL]
  README.md updated              :                              [OK/FAIL]
  LIVE_SERVER_BASELINE updated   :                              [OK/FAIL]

TOP 3 CVEs TO REMEDIATE (from scan):
  1. [CVE-ID] [Severity] [Package] — [brief title]
  2. [CVE-ID] [Severity] [Package] — [brief title]
  3. [CVE-ID] [Severity] [Package] — [brief title]

TOP 3 SCA FAILURES TO FIX:
  1. [CIS Control] — [brief title] — [remediation hint]
  2. [CIS Control] — [brief title] — [remediation hint]
  3. [CIS Control] — [brief title] — [remediation hint]

NEXT ACTION:
  Review Critical/High CVEs and plan patch schedule
  Review SCA failures and apply CIS hardening where safe

OVERALL: ✅ BOTH MODULES ACTIVE / ❌ ISSUES FOUND (see above)
════════════════════════════════════════════════════════════
```
