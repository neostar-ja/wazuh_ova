# Agent Prompt: Compliance Dashboard — End-to-End Setup
# Target: Wazuh Cluster (All Nodes)
# Project root: /opt/code/wazuh_ova/
# Output: visualizations/compliance/ + docs/current/
# Created: 2026-05-18

---

## SYSTEM CONTEXT

You are a senior Wazuh SIEM engineer and compliance specialist.
Your task is to build a complete Compliance Dashboard for this production cluster
by leveraging existing rules, field mappings, and the project's dashboard
generator pattern that was already used for FortiGate dashboards.

```
Cluster:
  Master    10.251.151.11  (Wazuh 4.14.5, role=master)
  Worker    10.251.151.12  (Wazuh 4.14.5, role=worker, Suricata 7.0.10)
  Indexer   10.251.151.13  (OpenSearch 7.10.2)
  Dashboard 10.251.151.14  (HTTPS :443)

SSH       : user=wazuh-user  password=wazuh  (sudo su for root)
OpenSearch: admin / admin   https://10.251.151.13:9200
Dashboard : admin / admin   https://10.251.151.14

Project root (local): /opt/code/wazuh_ova/

Existing rules on Master (authoritative per README.md):
  rules/1000-huawei_rules.xml
  rules/1001-mikrotik_rules.xml
  rules/1002-huawei-ac-rules.xml
  rules/1003-network-anomaly-rules.xml
  rules/1004-infoblox-rules.xml
  rules/1005-fortigate-wuh-rules.xml
  rules/1006-suricata-ids-rules.xml
  rules/local_abuseipdb_rules.xml
  rules/local_rules.xml

OpenSearch compliance fields (already mapped as keyword):
  rule.pci_dss      rule.hipaa      rule.gdpr
  rule.nist_800_53  rule.tsc        rule.mitre.id
  rule.mitre.tactic rule.mitre.technique  rule.groups
  GeoLocation.country_name  GeoLocation.location

Dashboard generator pattern reference:
  scripts/generate/generate_fortigate_dashboard.py
  scripts/generate/generate_fortigate_advanced_dashboard.py
  visualizations/fortigate/ (existing .ndjson files)
```

---

## OPERATING RULES

- Show exact command output before every change
- Read existing rule files before creating new ones — never duplicate rule IDs
- Compliance rule IDs: use range 120000-120099 (reserved for compliance)
- All Wazuh rules go on Master Node (10.251.151.11) only
- All OpenSearch API calls go to Indexer Node (10.251.151.13)
- Validate XML before deploying — use xmllint
- Follow the same NDJSON generator pattern as generate_fortigate_dashboard.py
- Save generated .ndjson to visualizations/compliance/
- Update docs/current/ after all tests pass
- Wazuh restart order: Master first → 30s wait → Worker

---

## PHASE 1 — AUDIT EXISTING COMPLIANCE DATA

### 1.1 Check what compliance fields are already populated in OpenSearch
Run on Indexer Node (10.251.151.13):

```bash
ssh wazuh-user@10.251.151.13 "

echo '=== PCI DSS field population ==='
curl -sk -u admin:admin \
  'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
  -H 'Content-Type: application/json' \
  -d '{\"query\":{\"exists\":{\"field\":\"rule.pci_dss\"}}}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f\"Alerts with rule.pci_dss: {d[\\\"count\\\"]}\")'

echo '=== HIPAA field population ==='
curl -sk -u admin:admin \
  'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
  -H 'Content-Type: application/json' \
  -d '{\"query\":{\"exists\":{\"field\":\"rule.hipaa\"}}}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f\"Alerts with rule.hipaa: {d[\\\"count\\\"]}\")'

echo '=== GDPR field population ==='
curl -sk -u admin:admin \
  'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
  -H 'Content-Type: application/json' \
  -d '{\"query\":{\"exists\":{\"field\":\"rule.gdpr\"}}}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f\"Alerts with rule.gdpr: {d[\\\"count\\\"]}\")'

echo '=== NIST 800-53 field population ==='
curl -sk -u admin:admin \
  'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
  -H 'Content-Type: application/json' \
  -d '{\"query\":{\"exists\":{\"field\":\"rule.nist_800_53\"}}}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f\"Alerts with rule.nist_800_53: {d[\\\"count\\\"]}\")'

echo '=== TSC field population ==='
curl -sk -u admin:admin \
  'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
  -H 'Content-Type: application/json' \
  -d '{\"query\":{\"exists\":{\"field\":\"rule.tsc\"}}}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f\"Alerts with rule.tsc: {d[\\\"count\\\"]}\")'
"
```

### 1.2 Sample top PCI DSS requirements being triggered
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search' \
    -H 'Content-Type: application/json' \
    -d '{
      \"size\": 0,
      \"query\": {\"exists\": {\"field\": \"rule.pci_dss\"}},
      \"aggs\": {
        \"pci_reqs\": {
          \"terms\": {\"field\": \"rule.pci_dss\", \"size\": 15}
        }
      }
    }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
buckets = d.get('aggregations',{}).get('pci_reqs',{}).get('buckets',[])
print('Top PCI DSS requirements triggered:')
for b in buckets: print(f'  Req {b[\\\"key\\\"]}: {b[\\\"doc_count\\\"]} events')
\"
"
```

### 1.3 Check which existing rules already have compliance tags
```bash
# On local machine
for f in /opt/code/wazuh_ova/rules/*.xml; do
  echo "=== $f ==="
  grep -c "pci_dss\|hipaa\|gdpr\|nist_800_53\|tsc" "$f" 2>/dev/null || echo "0 compliance tags"
done
```

### 1.4 Check what Wazuh built-in compliance rules are loaded
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Built-in compliance rule files ==='
  ls /var/ossec/ruleset/rules/ | grep -E 'pci|hipaa|gdpr|nist|compliance'

  echo '=== Count compliance-tagged rules ==='
  grep -r '<pci_dss>' /var/ossec/ruleset/rules/ | wc -l
  grep -r '<hipaa>' /var/ossec/ruleset/rules/ | wc -l
  grep -r '<nist_800_53>' /var/ossec/ruleset/rules/ | wc -l
"
```

### 1.5 Report Phase 1 findings
State clearly:
- How many alerts already have each compliance field
- Which frameworks have the most existing data
- Which custom rule files currently lack compliance tags
- Whether any compliance data exists in the last 7 days

---

## PHASE 2 — ADD COMPLIANCE TAGS TO EXISTING CUSTOM RULES

Based on Phase 1 findings, add compliance tags to custom rules that are
currently missing them. Work on Master Node (10.251.151.11).

### 2.1 Backup all rule files first
```bash
ssh wazuh-user@10.251.151.11 "
  BACKUP_DIR='/var/ossec/etc/rules/backup_$(date +%Y%m%d_%H%M%S)'
  sudo mkdir -p \$BACKUP_DIR
  sudo cp /var/ossec/etc/rules/*.xml \$BACKUP_DIR/
  echo 'Backed up to:' \$BACKUP_DIR
  ls \$BACKUP_DIR
"
```

### 2.2 Create/update compliance-tagged rules file
Create `/var/ossec/etc/rules/1007-compliance-tags.xml` on Master:

This file adds compliance overlay rules that fire whenever specific
security events occur, tagging them with the appropriate framework control.

```xml
<!-- Save to /var/ossec/etc/rules/1007-compliance-tags.xml -->
<group name="compliance,">

  <!-- ============================================================
       PCI DSS v3.2.1 — Payment Card Industry
  ============================================================ -->

  <!-- PCI 1.3: Prohibit direct public access to cardholder data env -->
  <!-- Triggered by: FortiGate deny, Huawei deny, Suricata alert -->
  <rule id="120001" level="5">
    <if_matched_group>firewall_drop</if_matched_group>
    <description>PCI DSS 1.3: Unauthorized network access blocked — $(data.srcip)</description>
    <group>pci_dss_1.3,compliance,firewall,</group>
    <pci_dss>1.3</pci_dss>
  </rule>

  <!-- PCI 6.6: Web application attacks -->
  <rule id="120002" level="8">
    <if_matched_group>attack,</if_matched_group>
    <if_matched_group>ids,</if_matched_group>
    <description>PCI DSS 6.6: Web application attack detected — $(alert.signature)</description>
    <group>pci_dss_6.6,compliance,attack,</group>
    <pci_dss>6.6</pci_dss>
    <mitre>
      <id>T1190</id>
    </mitre>
  </rule>

  <!-- PCI 8.3: Authentication failures -->
  <rule id="120003" level="7">
    <if_matched_group>authentication_failed,</if_matched_group>
    <description>PCI DSS 8.3: Authentication failure detected from $(data.srcip)</description>
    <group>pci_dss_8.3,compliance,authentication,</group>
    <pci_dss>8.3</pci_dss>
    <mitre>
      <id>T1110</id>
    </mitre>
  </rule>

  <!-- PCI 8.3 brute force: repeated auth failures -->
  <rule id="120004" level="12">
    <if_matched_group>brute_force,</if_matched_group>
    <description>PCI DSS 8.3: Brute force attack — multiple auth failures from $(data.srcip)</description>
    <group>pci_dss_8.3,compliance,brute_force,</group>
    <pci_dss>8.3</pci_dss>
    <mitre>
      <id>T1110.001</id>
    </mitre>
  </rule>

  <!-- PCI 10.2: Successful admin login -->
  <rule id="120005" level="5">
    <if_matched_group>admin_login,</if_matched_group>
    <description>PCI DSS 10.2: Admin login event — user $(data.username) from $(data.srcip)</description>
    <group>pci_dss_10.2,compliance,authentication,</group>
    <pci_dss>10.2</pci_dss>
  </rule>

  <!-- PCI 10.6: Log review — high severity events -->
  <rule id="120006" level="10">
    <if_matched_group>malware,</if_matched_group>
    <description>PCI DSS 10.6: Malware/threat detected — $(alert.signature)</description>
    <group>pci_dss_10.6,compliance,malware,</group>
    <pci_dss>10.6</pci_dss>
    <mitre>
      <id>T1204</id>
    </mitre>
  </rule>

  <!-- PCI 11.4: IDS alert -->
  <rule id="120007" level="8">
    <if_matched_group>ids,attack,</if_matched_group>
    <description>PCI DSS 11.4: Intrusion attempt detected — $(alert.signature)</description>
    <group>pci_dss_11.4,compliance,ids,</group>
    <pci_dss>11.4</pci_dss>
  </rule>

  <!-- ============================================================
       HIPAA — Health Insurance Portability
  ============================================================ -->

  <!-- HIPAA 164.308: Unauthorized access attempt -->
  <rule id="120010" level="7">
    <if_matched_group>authentication_failed,</if_matched_group>
    <description>HIPAA 164.308: Unauthorized access attempt from $(data.srcip)</description>
    <group>hipaa_164.308,compliance,</group>
    <hipaa>164.308.a.5.ii.c</hipaa>
  </rule>

  <!-- HIPAA 164.312: Transmission security — suspicious traffic -->
  <rule id="120011" level="8">
    <if_matched_group>ids,attack,</if_matched_group>
    <description>HIPAA 164.312: Potential PHI transmission security incident</description>
    <group>hipaa_164.312,compliance,ids,</group>
    <hipaa>164.312.e.2.ii</hipaa>
    <mitre>
      <id>T1040</id>
    </mitre>
  </rule>

  <!-- HIPAA 164.312: Admin audit -->
  <rule id="120012" level="5">
    <if_matched_group>admin_login,</if_matched_group>
    <description>HIPAA 164.312: Administrative access logged — $(data.username)</description>
    <group>hipaa_164.312,compliance,authentication,</group>
    <hipaa>164.312.b</hipaa>
  </rule>

  <!-- ============================================================
       GDPR — General Data Protection Regulation
  ============================================================ -->

  <!-- GDPR Art 25: Access from unusual country -->
  <rule id="120020" level="7">
    <if_matched_group>authentication_success,</if_matched_group>
    <field name="GeoLocation.country_name" type="pcre2">.+</field>
    <description>GDPR Art 25: Remote access logged from $(GeoLocation.country_name) — $(data.username)</description>
    <group>gdpr_IV_25,compliance,authentication,</group>
    <gdpr>IV_25</gdpr>
  </rule>

  <!-- GDPR Art 32: Security incident — breach attempt -->
  <rule id="120021" level="10">
    <if_matched_group>attack,malware,</if_matched_group>
    <description>GDPR Art 32: Security incident detected — $(alert.signature)</description>
    <group>gdpr_IV_32,compliance,attack,</group>
    <gdpr>IV_32</gdpr>
    <mitre>
      <id>T1190</id>
    </mitre>
  </rule>

  <!-- GDPR Art 33: Data breach notification trigger -->
  <rule id="120022" level="12">
    <if_matched_group>malware,</if_matched_group>
    <field name="alert.severity" type="pcre2">^[12]$</field>
    <description>GDPR Art 33: Potential data breach event — immediate review required</description>
    <group>gdpr_IV_33,compliance,malware,critical,</group>
    <gdpr>IV_33</gdpr>
    <mitre>
      <id>T1005</id>
    </mitre>
  </rule>

  <!-- GDPR Art 5: Audit trail — config change -->
  <rule id="120023" level="8">
    <if_matched_group>config_changed,</if_matched_group>
    <description>GDPR Art 5: Configuration change detected — $(data.username) from $(data.srcip)</description>
    <group>gdpr_IV_5,compliance,config_change,</group>
    <gdpr>IV_5.1.f</gdpr>
  </rule>

  <!-- ============================================================
       NIST 800-53 — US Federal Security Controls
  ============================================================ -->

  <!-- NIST AC-3: Access enforcement failures -->
  <rule id="120030" level="7">
    <if_matched_group>authentication_failed,</if_matched_group>
    <description>NIST AC-3: Access control enforcement event from $(data.srcip)</description>
    <group>nist_800_53_AC.3,compliance,authentication,</group>
    <nist_800_53>AC.3</nist_800_53>
    <mitre>
      <id>T1110</id>
    </mitre>
  </rule>

  <!-- NIST AC-17: Remote access -->
  <rule id="120031" level="5">
    <if_matched_group>vpn,</if_matched_group>
    <description>NIST AC-17: Remote access session — $(data.username) from $(data.srcip)</description>
    <group>nist_800_53_AC.17,compliance,vpn,</group>
    <nist_800_53>AC.17</nist_800_53>
    <mitre>
      <id>T1133</id>
    </mitre>
  </rule>

  <!-- NIST AU-2: Audit events — all high severity -->
  <rule id="120032" level="10">
    <if_matched_group>attack,</if_matched_group>
    <description>NIST AU-2: Auditable security event — attack detected</description>
    <group>nist_800_53_AU.2,compliance,attack,</group>
    <nist_800_53>AU.2</nist_800_53>
  </rule>

  <!-- NIST AU-14: Session audit -->
  <rule id="120033" level="5">
    <if_matched_group>admin_login,</if_matched_group>
    <description>NIST AU-14: Privileged session established — $(data.username)</description>
    <group>nist_800_53_AU.14,compliance,authentication,</group>
    <nist_800_53>AU.14</nist_800_53>
  </rule>

  <!-- NIST CM-7: Least functionality — blocked services -->
  <rule id="120034" level="5">
    <if_matched_group>firewall_drop,</if_matched_group>
    <description>NIST CM-7: Unauthorized service blocked — $(data.srcip) → $(data.dstip):$(data.dstport)</description>
    <group>nist_800_53_CM.7,compliance,firewall,</group>
    <nist_800_53>CM.7</nist_800_53>
  </rule>

  <!-- NIST IR-4: Incident handling — IDS alert -->
  <rule id="120035" level="10">
    <if_matched_group>ids,attack,</if_matched_group>
    <description>NIST IR-4: Security incident detected — requires incident response</description>
    <group>nist_800_53_IR.4,compliance,ids,attack,</group>
    <nist_800_53>IR.4</nist_800_53>
  </rule>

  <!-- NIST SC-5: DoS protection — recon/scan detected -->
  <rule id="120036" level="8">
    <if_matched_group>recon,</if_matched_group>
    <description>NIST SC-5: Reconnaissance/denial-of-service attempt from $(data.srcip)</description>
    <group>nist_800_53_SC.5,compliance,recon,</group>
    <nist_800_53>SC.5</nist_800_53>
    <mitre>
      <id>T1046</id>
    </mitre>
  </rule>

  <!-- NIST SI-3: Malware protection -->
  <rule id="120037" level="12">
    <if_matched_group>malware,</if_matched_group>
    <description>NIST SI-3: Malware detected — $(alert.signature)</description>
    <group>nist_800_53_SI.3,compliance,malware,</group>
    <nist_800_53>SI.3</nist_800_53>
    <mitre>
      <id>T1204</id>
    </mitre>
  </rule>

  <!-- NIST SI-4: Information system monitoring — all IDS -->
  <rule id="120038" level="7">
    <if_matched_group>ids,</if_matched_group>
    <description>NIST SI-4: System monitoring alert — $(alert.signature)</description>
    <group>nist_800_53_SI.4,compliance,ids,</group>
    <nist_800_53>SI.4</nist_800_53>
  </rule>

  <!-- ============================================================
       TSC (SOC2 Trust Service Criteria)
  ============================================================ -->

  <!-- TSC CC6.1: Logical and physical access controls -->
  <rule id="120040" level="7">
    <if_matched_group>authentication_failed,</if_matched_group>
    <description>TSC CC6.1: Logical access control failure from $(data.srcip)</description>
    <group>tsc_CC6.1,compliance,authentication,</group>
    <tsc>CC6.1</tsc>
  </rule>

  <!-- TSC CC6.7: Transmission of data -->
  <rule id="120041" level="8">
    <if_matched_group>exfiltration,</if_matched_group>
    <description>TSC CC6.7: Potential data exfiltration — $(alert.signature)</description>
    <group>tsc_CC6.7,compliance,exfiltration,</group>
    <tsc>CC6.7</tsc>
    <mitre>
      <id>T1048</id>
    </mitre>
  </rule>

  <!-- TSC CC7.1: System operations — IDS events -->
  <rule id="120042" level="8">
    <if_matched_group>ids,attack,</if_matched_group>
    <description>TSC CC7.1: Security incident affecting system operations</description>
    <group>tsc_CC7.1,compliance,ids,</group>
    <tsc>CC7.1</tsc>
  </rule>

  <!-- TSC CC7.2: Monitoring — malware detection -->
  <rule id="120043" level="12">
    <if_matched_group>malware,</if_matched_group>
    <description>TSC CC7.2: Malware detection event — review required</description>
    <group>tsc_CC7.2,compliance,malware,</group>
    <tsc>CC7.2</tsc>
  </rule>

  <!-- TSC CC8.1: Change management — config changes -->
  <rule id="120044" level="8">
    <if_matched_group>config_changed,</if_matched_group>
    <description>TSC CC8.1: Configuration change event — $(data.username) from $(data.srcip)</description>
    <group>tsc_CC8.1,compliance,config_change,</group>
    <tsc>CC8.1</tsc>
  </rule>

</group>
```

### 2.3 Deploy to Master Node
```bash
# Copy from local project to Master
scp /opt/code/wazuh_ova/rules/1007-compliance-tags.xml \
    wazuh-user@10.251.151.11:/tmp/1007-compliance-tags.xml

ssh wazuh-user@10.251.151.11 "
  sudo cp /tmp/1007-compliance-tags.xml /var/ossec/etc/rules/
  sudo chown root:wazuh /var/ossec/etc/rules/1007-compliance-tags.xml
  sudo chmod 660 /var/ossec/etc/rules/1007-compliance-tags.xml

  echo '=== Validate XML ==='
  sudo xmllint --noout /var/ossec/etc/rules/1007-compliance-tags.xml && echo 'XML: OK'

  echo '=== Test with wazuh-logtest ==='
  echo 'Paste a FortiGate DENY log to verify rule 120001 fires'
"
```

Test with wazuh-logtest using a FortiGate deny sample:
```
date=2026-05-18 time=10:00:00 devname="FGT-PROD" logid="0000000001" type="traffic" subtype="forward" action="deny" srcip=203.0.113.99 dstip=10.251.151.11 dstport=22 service="SSH"
```
Expected: Should trigger built-in FortiGate rule + rule 120001 (PCI 1.3)

### 2.4 Restart Master and verify
```bash
ssh wazuh-user@10.251.151.11 "
  sudo /var/ossec/bin/wazuh-control restart
  sleep 30
  sudo /var/ossec/bin/wazuh-control status | head -5
  sudo grep -i 'error\|warning' /var/ossec/logs/ossec.log | tail -10
"
```

---

## PHASE 3 — GENERATE COMPLIANCE DASHBOARD NDJSON

Follow the same pattern as `scripts/generate/generate_fortigate_advanced_dashboard.py`.
Create: `/opt/code/wazuh_ova/scripts/generate/generate_compliance_dashboard.py`

```python
#!/usr/bin/env python3
"""
Compliance Dashboard Generator
Frameworks: PCI DSS 3.2.1 | HIPAA | GDPR | NIST 800-53 | TSC (SOC2)
Output: visualizations/compliance/compliance-overview-dashboard.ndjson
Pattern: Same as generate_fortigate_advanced_dashboard.py

Layout:
  Row 1 (5 metric cards): Alert counts per framework
  Row 2 (2×24): PCI DSS requirements timeline | NIST controls heatmap
  Row 3 (3×16): Top PCI reqs | Top NIST controls | Top GDPR articles
  Row 4 (2×24): Compliance events by source device | Geographic origin map
  Row 5 (3×16): Auth failures | Config changes | Malware events
  Row 6 (2×24): MITRE ATT&CK techniques | Compliance by rule group
  Row 7 (1×48): Full event table with compliance columns

Usage:
  python3 generate_compliance_dashboard.py
  Import via: Wazuh Dashboard → Stack Management → Saved Objects → Import
"""

import json
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
INDEX_PATTERN_ID = "wazuh-alerts-compliance"

# Queries aligned with existing rule groups in the cluster
BASE_Q       = 'rule.groups: "compliance"'
PCI_Q        = 'rule.pci_dss: *'
HIPAA_Q      = 'rule.hipaa: *'
GDPR_Q       = 'rule.gdpr: *'
NIST_Q       = 'rule.nist_800_53: *'
TSC_Q        = 'rule.tsc: *'
AUTH_FAIL_Q  = f'{BASE_Q} AND rule.groups: "authentication_failed"'
AUTH_OK_Q    = f'{BASE_Q} AND rule.groups: "authentication_success"'
CONFIG_Q     = f'{BASE_Q} AND rule.groups: "config_changed"'
MALWARE_Q    = f'{BASE_Q} AND rule.groups: "malware"'
ATTACK_Q     = f'{BASE_Q} AND rule.groups: "attack"'
FIREWALL_Q   = f'{BASE_Q} AND rule.groups: "firewall_drop"'
GEO_Q        = f'{BASE_Q} AND GeoLocation.country_name: *'

# ─────────────────────────────────────────────────────────────────────────────
# Index Pattern
# ─────────────────────────────────────────────────────────────────────────────
obj_index = {
    "type": "index-pattern",
    "id": INDEX_PATTERN_ID,
    "attributes": {
        "title": "wazuh-alerts-*",
        "timeFieldName": "@timestamp",
        "fields": "[]"
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# Saved Search: Compliance Event Table (all compliance-tagged alerts)
# ─────────────────────────────────────────────────────────────────────────────
SEARCH_ID = "compliance-all-events"
obj_search = {
    "type": "search",
    "id": SEARCH_ID,
    "attributes": {
        "title": "Compliance — All Events",
        "description": "All alerts with compliance framework tags",
        "columns": [
            "@timestamp", "rule.id", "rule.level", "rule.description",
            "rule.pci_dss", "rule.hipaa", "rule.gdpr", "rule.nist_800_53",
            "rule.tsc", "rule.mitre.id", "data.srcip",
            "GeoLocation.country_name", "rule.groups"
        ],
        "sort": [["@timestamp", "desc"]],
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps({
                "index": INDEX_PATTERN_ID,
                "query": {"language": "kuery", "query": BASE_Q},
                "filter": []
            })
        }
    },
    "references": [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
                    "type": "index-pattern", "id": INDEX_PATTERN_ID}]
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper functions (matching fortigate generator style)
# ─────────────────────────────────────────────────────────────────────────────
def make_metric(vis_id, title, query, color="#1d9e75"):
    """Single big number metric card."""
    return {
        "type": "visualization", "id": vis_id,
        "attributes": {
            "title": title,
            "visState": json.dumps({
                "title": title, "type": "metric",
                "params": {
                    "addTooltip": True, "addLegend": False,
                    "type": "metric",
                    "metric": {
                        "percentageMode": False, "useRanges": False,
                        "colorSchema": "Green to Red",
                        "metricColorMode": "None",
                        "colorsRange": [{"from": 0, "to": 10000}],
                        "labels": {"show": True},
                        "invertColors": False,
                        "style": {"bgFill": "#000", "bgColor": False,
                                  "labelColor": False, "subText": "", "fontSize": 60}
                    }
                },
                "aggs": [{"id": "1", "enabled": True, "type": "count",
                          "schema": "metric", "params": {}}]
            }),
            "uiStateJSON": "{}",
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "index": INDEX_PATTERN_ID,
                    "query": {"language": "kuery", "query": query},
                    "filter": []
                })
            }
        },
        "references": [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
                        "type": "index-pattern", "id": INDEX_PATTERN_ID}]
    }

def make_bar(vis_id, title, field, query, size=15, label="Count"):
    """Horizontal bar chart for top N terms."""
    return {
        "type": "visualization", "id": vis_id,
        "attributes": {
            "title": title,
            "visState": json.dumps({
                "title": title, "type": "histogram",
                "params": {
                    "type": "histogram",
                    "grid": {"categoryLines": False},
                    "categoryAxes": [{"id": "CategoryAxis-1", "type": "category",
                                      "position": "left", "show": True,
                                      "scale": {"type": "linear"},
                                      "labels": {"show": True, "truncate": 120},
                                      "title": {}}],
                    "valueAxes": [{"id": "ValueAxis-1", "name": "BottomAxis-1",
                                   "type": "value", "position": "bottom", "show": True,
                                   "labels": {"show": True, "rotate": 0, "filter": True,
                                              "truncate": 100},
                                   "title": {"text": label}}],
                    "seriesParams": [{"show": True, "type": "histogram", "mode": "normal",
                                      "data": {"label": label, "id": "1"},
                                      "valueAxis": "ValueAxis-1",
                                      "drawLinesBetweenPoints": True,
                                      "showCircles": True}],
                    "addTooltip": True, "addLegend": False,
                    "times": [], "addTimeMarker": False
                },
                "aggs": [
                    {"id": "1", "enabled": True, "type": "count",
                     "schema": "metric", "params": {}},
                    {"id": "2", "enabled": True, "type": "terms",
                     "schema": "bucket",
                     "params": {"field": field, "size": size,
                                "order": "desc", "orderBy": "1"}}
                ]
            }),
            "uiStateJSON": "{}",
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "index": INDEX_PATTERN_ID,
                    "query": {"language": "kuery", "query": query},
                    "filter": []
                })
            }
        },
        "references": [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
                        "type": "index-pattern", "id": INDEX_PATTERN_ID}]
    }

def make_area(vis_id, title, query, split_field=None, interval="1h"):
    """Area chart timeline, optionally split by a field."""
    aggs = [{"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {"id": "2", "enabled": True, "type": "date_histogram", "schema": "segment",
             "params": {"field": "@timestamp", "interval": interval,
                        "customInterval": "2h", "min_doc_count": 1,
                        "extended_bounds": {}, "customLabel": "Time"}}]
    if split_field:
        aggs.append({"id": "3", "enabled": True, "type": "terms", "schema": "group",
                     "params": {"field": split_field, "size": 5,
                                "order": "desc", "orderBy": "1"}})
    return {
        "type": "visualization", "id": vis_id,
        "attributes": {
            "title": title,
            "visState": json.dumps({
                "title": title, "type": "area",
                "params": {
                    "type": "area", "grid": {"categoryLines": False},
                    "categoryAxes": [{"id": "CategoryAxis-1", "type": "category",
                                      "position": "bottom", "show": True,
                                      "labels": {"show": True, "truncate": 100}}],
                    "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1",
                                   "type": "value", "position": "left", "show": True,
                                   "labels": {"show": True},
                                   "title": {"text": "Events"}}],
                    "seriesParams": [{"show": True, "type": "area", "mode": "stacked",
                                      "data": {"label": "Count", "id": "1"},
                                      "valueAxis": "ValueAxis-1",
                                      "drawLinesBetweenPoints": True,
                                      "showCircles": True}],
                    "addTooltip": True, "addLegend": True,
                    "times": [], "addTimeMarker": False
                },
                "aggs": aggs
            }),
            "uiStateJSON": "{}",
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "index": INDEX_PATTERN_ID,
                    "query": {"language": "kuery", "query": query},
                    "filter": []
                })
            }
        },
        "references": [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
                        "type": "index-pattern", "id": INDEX_PATTERN_ID}]
    }

def make_pie(vis_id, title, field, query, size=10):
    """Donut pie chart."""
    return {
        "type": "visualization", "id": vis_id,
        "attributes": {
            "title": title,
            "visState": json.dumps({
                "title": title, "type": "pie",
                "params": {
                    "type": "pie", "addTooltip": True, "addLegend": True,
                    "legendPosition": "right", "isDonut": True,
                    "labels": {"show": True, "values": True,
                               "last_level": True, "truncate": 100}
                },
                "aggs": [
                    {"id": "1", "enabled": True, "type": "count",
                     "schema": "metric", "params": {}},
                    {"id": "2", "enabled": True, "type": "terms",
                     "schema": "segment",
                     "params": {"field": field, "size": size,
                                "order": "desc", "orderBy": "1"}}
                ]
            }),
            "uiStateJSON": "{}",
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "index": INDEX_PATTERN_ID,
                    "query": {"language": "kuery", "query": query},
                    "filter": []
                })
            }
        },
        "references": [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index",
                        "type": "index-pattern", "id": INDEX_PATTERN_ID}]
    }

# ─────────────────────────────────────────────────────────────────────────────
# Build all visualization objects
# ─────────────────────────────────────────────────────────────────────────────
vis_objects = [
    # Row 1: Metric cards per framework
    make_metric("comp-metric-pci",   "PCI DSS — Events (24h)",  PCI_Q),
    make_metric("comp-metric-hipaa", "HIPAA — Events (24h)",    HIPAA_Q),
    make_metric("comp-metric-gdpr",  "GDPR — Events (24h)",     GDPR_Q),
    make_metric("comp-metric-nist",  "NIST 800-53 — Events (24h)", NIST_Q),
    make_metric("comp-metric-tsc",   "TSC/SOC2 — Events (24h)", TSC_Q),

    # Row 2: Timelines
    make_area("comp-pci-timeline",  "PCI DSS — Events Over Time",
              PCI_Q, split_field="rule.pci_dss"),
    make_area("comp-nist-timeline", "NIST 800-53 — Events Over Time",
              NIST_Q, split_field="rule.nist_800_53"),

    # Row 3: Top requirements
    make_bar("comp-top-pci",  "Top PCI DSS Requirements",  "rule.pci_dss",    PCI_Q,  size=15),
    make_bar("comp-top-nist", "Top NIST 800-53 Controls",  "rule.nist_800_53", NIST_Q, size=15),
    make_bar("comp-top-gdpr", "Top GDPR Articles",         "rule.gdpr",        GDPR_Q, size=10),

    # Row 4: Source analysis with GeoIP
    make_pie("comp-by-device",  "Compliance Events by Source Device",
             "agent.name", BASE_Q, size=10),
    make_pie("comp-by-country", "Source Countries (GeoIP)",
             "GeoLocation.country_name", GEO_Q, size=15),

    # Row 5: Event type breakdown
    make_bar("comp-auth-fail", "Authentication Failures by Source IP",
             "data.srcip", AUTH_FAIL_Q, size=20),
    make_area("comp-config-timeline", "Configuration Changes Over Time",
              CONFIG_Q),
    make_bar("comp-malware", "Malware Events by Signature",
             "alert.signature", MALWARE_Q, size=15),

    # Row 6: MITRE and rule groups
    make_pie("comp-mitre-tactics", "MITRE ATT&CK Tactics",
             "rule.mitre.tactic", BASE_Q, size=12),
    make_bar("comp-by-rulegroup", "Compliance Events by Rule Group",
             "rule.groups", BASE_Q, size=20),
]

# ─────────────────────────────────────────────────────────────────────────────
# Dashboard layout  (matching fortigate generator row logic)
# ─────────────────────────────────────────────────────────────────────────────
panels = []
refs   = []

def add_panel(idx, ptype, pid, x=0, y=0, w=12, h=10):
    panels.append({
        "panelIndex": str(idx),
        "gridData": {"x": x, "y": y, "w": w, "h": h, "i": str(idx)},
        "version": "7.10.2", "type": ptype, "id": pid
    })
    refs.append({"name": f"panel_{idx}", "type": ptype, "id": pid})

# Row 1: 5 metric cards (w=9 each, gap logic)
for i, vis in enumerate(vis_objects[0:5]):
    add_panel(i+1, "visualization", vis["id"], x=i*9+i, y=0, w=9, h=8)

# Row 2: 2 × 24 timelines
for i, vis in enumerate(vis_objects[5:7]):
    add_panel(i+6, "visualization", vis["id"], x=i*24, y=8, w=24, h=10)

# Row 3: 3 × 16
for i, vis in enumerate(vis_objects[7:10]):
    add_panel(i+8, "visualization", vis["id"], x=i*16, y=18, w=16, h=12)

# Row 4: 2 × 24
for i, vis in enumerate(vis_objects[10:12]):
    add_panel(i+11, "visualization", vis["id"], x=i*24, y=30, w=24, h=10)

# Row 5: 3 × 16
for i, vis in enumerate(vis_objects[12:15]):
    add_panel(i+13, "visualization", vis["id"], x=i*16, y=40, w=16, h=12)

# Row 6: 2 × 24
for i, vis in enumerate(vis_objects[15:17]):
    add_panel(i+16, "visualization", vis["id"], x=i*24, y=52, w=24, h=10)

# Row 7: Full-width event table
add_panel(18, "search", SEARCH_ID, x=0, y=62, w=48, h=20)

obj_dashboard = {
    "type": "dashboard",
    "id": "wazuh-compliance-overview",
    "attributes": {
        "title": "Compliance Overview — PCI DSS | HIPAA | GDPR | NIST 800-53 | TSC",
        "description": (
            "Unified compliance dashboard for all frameworks | "
            "Cluster: wazuh-master + wazuh-worker | "
            "Sources: FortiGate, Huawei USG, MikroTik, Suricata, Infoblox"
        ),
        "panelsJSON": json.dumps(panels),
        "optionsJSON": json.dumps({
            "useMargins": True,
            "hidePanelTitles": False
        }),
        "version": 1,
        "timeRestore": True,
        "timeTo": "now",
        "timeFrom": "now-24h",
        "refreshInterval": {"pause": False, "value": 300000},
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps({
                "query": {"language": "kuery", "query": ""},
                "filter": []
            })
        }
    },
    "references": refs
}

# ─────────────────────────────────────────────────────────────────────────────
# Write NDJSON
# ─────────────────────────────────────────────────────────────────────────────
out_dir = os.path.join(REPO_ROOT, "visualizations", "compliance")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "compliance-overview-dashboard.ndjson")

all_objects = [obj_index, obj_search] + vis_objects + [obj_dashboard]

with open(out_path, "w", encoding="utf-8") as f:
    for obj in all_objects:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

print(f"[OK] Written {len(all_objects)} saved objects → {out_path}")
print()
print("Objects:")
for o in all_objects:
    print(f"  {o['type']:18s}  {o['id']}")
print()
print("Dashboard: 'Compliance Overview — PCI DSS | HIPAA | GDPR | NIST 800-53 | TSC'")
print(f"Panels   : {len(panels)} ({len(vis_objects)} visualizations + 1 event table)")
print("Time range: last 24 hours, auto-refresh every 5 min")
print()
print("Import via:")
print("  Wazuh Dashboard → Stack Management → Saved Objects → Import")
print(f"  → select {out_path}")
```

### 3.1 Run the generator locally
```bash
cd /opt/code/wazuh_ova
python3 scripts/generate/generate_compliance_dashboard.py
ls -lh visualizations/compliance/
# Expected: compliance-overview-dashboard.ndjson ~60-100KB
```

---

## PHASE 4 — IMPORT DASHBOARD TO WAZUH

### 4.1 Import via API (automated)
```bash
# Import saved objects via Wazuh Dashboard API
curl -sk -u admin:admin \
  -X POST "https://10.251.151.14/api/saved_objects/_import?overwrite=true" \
  -H "osd-xsrf: true" \
  -F "file=@/opt/code/wazuh_ova/visualizations/compliance/compliance-overview-dashboard.ndjson" \
  | python3 -m json.tool
```
Expected response: `{"success": true, "successCount": N, "errors": []}`

### 4.2 If API import fails — use UI
Manual steps:
```
1. Open https://10.251.151.14
2. Go to: Stack Management → Saved Objects → Import
3. Select: visualizations/compliance/compliance-overview-dashboard.ndjson
4. Check "Overwrite existing objects"
5. Click Import
6. Verify all N objects imported successfully
```

### 4.3 Open and verify dashboard
```
1. Go to: Dashboard → [Compliance Overview — PCI DSS | HIPAA | GDPR | NIST 800-53 | TSC]
2. Set time range: Last 7 days
3. Verify each panel loads without error
4. Check metric panels show non-zero counts (if compliance data exists)
```

---

## PHASE 5 — VERIFY COMPLIANCE DATA FLOW

### 5.1 Inject test events to verify compliance rules fire
Run on Worker Node (10.251.151.12):

```bash
ssh wazuh-user@10.251.151.12 "
  # Test 1: Auth failure → PCI 8.3, NIST AC.3, TSC CC6.1
  logger -p local7.warning 'date=2026-05-18 time=10:01:00 devname=\"FGT-PROD\" type=\"event\" subtype=\"system\" action=\"login\" status=\"failed\" srcip=198.51.100.77 user=\"testuser\" msg=\"Login failure from 198.51.100.77\"'

  # Test 2: Traffic deny → PCI 1.3, NIST CM.7
  logger -p local7.warning 'date=2026-05-18 time=10:02:00 devname=\"FGT-PROD\" type=\"traffic\" action=\"deny\" srcip=203.0.113.5 dstip=10.251.151.11 dstport=22 service=\"SSH\" policyname=\"implicit-deny\"'

  echo 'Test logs sent. Check Dashboard in 60 seconds.'
"
```

### 5.2 Verify compliance alerts in OpenSearch
```bash
ssh wazuh-user@10.251.151.13 "
  sleep 30
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search' \
    -H 'Content-Type: application/json' \
    -d '{
      \"size\": 5,
      \"sort\": [{\"@timestamp\": {\"order\": \"desc\"}}],
      \"query\": {\"exists\": {\"field\": \"rule.pci_dss\"}},
      \"_source\": [\"@timestamp\", \"rule.id\", \"rule.description\", \"rule.pci_dss\", \"rule.nist_800_53\"]
    }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
hits = d.get('hits',{}).get('hits',[])
print(f'Compliance alerts found: {len(hits)}')
for h in hits:
    s = h['_source']
    print(f'  Rule {s.get(\\\"rule\\\",{}).get(\\\"id\\\",\\\"?\\\")} | PCI:{s.get(\\\"rule\\\",{}).get(\\\"pci_dss\\\",\\\"N/A\\\")} | NIST:{s.get(\\\"rule\\\",{}).get(\\\"nist_800_53\\\",\\\"N/A\\\")} | {s.get(\\\"rule\\\",{}).get(\\\"description\\\",\\\"?\\\")[:50]}')
\"
"
```

### 5.3 Verify Wazuh built-in compliance module
```bash
ssh wazuh-user@10.251.151.13 "
  echo '=== Count per framework (last 24h) ==='
  for field in rule.pci_dss rule.hipaa rule.gdpr rule.nist_800_53 rule.tsc; do
    COUNT=\$(curl -sk -u admin:admin \
      'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
      -H 'Content-Type: application/json' \
      -d \"{\\\"query\\\":{\\\"exists\\\":{\\\"field\\\":\\\"\$field\\\"}}}\" \
      | python3 -c 'import sys,json; print(json.load(sys.stdin)[\"count\"])')
    echo \"  \$field: \$COUNT alerts\"
  done
"
```

---

## PHASE 6 — CONFIGURE TELEGRAM ALERT FOR COMPLIANCE EVENTS

### 6.1 Add compliance integration to Master ossec.conf
Add to `/var/ossec/etc/ossec.conf` on Master (10.251.151.11):
```xml
<!-- Compliance critical alerts → Telegram -->
<integration>
  <name>custom-telegram.py</name>
  <level>10</level>
  <group>compliance,</group>
  <alert_format>json</alert_format>
</integration>
```

Rationale: compliance alerts starting level 10 (NIST IR-4, malware-related)
are critical enough for immediate notification without overloading level-12 threshold.

```bash
ssh wazuh-user@10.251.151.11 "
  sudo xmllint --noout /var/ossec/etc/ossec.conf && echo 'ossec.conf OK'
  sudo /var/ossec/bin/wazuh-control restart
  sleep 30
  sudo /var/ossec/bin/wazuh-control status | head -3
"
```

---

## PHASE 7 — UPDATE DOCUMENTATION

### 7.1 Create compliance setup doc
Create `/opt/code/wazuh_ova/docs/current/COMPLIANCE_DASHBOARD_COMPLETED.md`:

```markdown
# Compliance Dashboard — Deployment Report
**Date:** [ACTUAL DATE]
**Status:** ✅ COMPLETED
**Frameworks:** PCI DSS 3.2.1 | HIPAA | GDPR | NIST 800-53 | TSC (SOC2)

## Rules Deployed

File: `rules/1007-compliance-tags.xml` on Master (10.251.151.11)
Rule IDs: 120001–120044

| Rule ID | Framework | Control | Trigger Group | Level |
|---------|-----------|---------|---------------|-------|
| 120001 | PCI DSS | 1.3 | firewall_drop | 5 |
| 120002 | PCI DSS | 6.6 | attack+ids | 8 |
| 120003 | PCI DSS | 8.3 | authentication_failed | 7 |
| 120004 | PCI DSS | 8.3 | brute_force | 12 |
| 120005 | PCI DSS | 10.2 | admin_login | 5 |
| 120006 | PCI DSS | 10.6 | malware | 10 |
| 120007 | PCI DSS | 11.4 | ids+attack | 8 |
| 120010 | HIPAA | 164.308 | authentication_failed | 7 |
| 120011 | HIPAA | 164.312 | ids+attack | 8 |
| 120012 | HIPAA | 164.312 | admin_login | 5 |
| 120020 | GDPR | Art 25 | authentication_success+GeoIP | 7 |
| 120021 | GDPR | Art 32 | attack+malware | 10 |
| 120022 | GDPR | Art 33 | malware+severity1-2 | 12 |
| 120023 | GDPR | Art 5 | config_changed | 8 |
| 120030 | NIST | AC.3 | authentication_failed | 7 |
| 120031 | NIST | AC.17 | vpn | 5 |
| 120032 | NIST | AU.2 | attack | 10 |
| 120033 | NIST | AU.14 | admin_login | 5 |
| 120034 | NIST | CM.7 | firewall_drop | 5 |
| 120035 | NIST | IR.4 | ids+attack | 10 |
| 120036 | NIST | SC.5 | recon | 8 |
| 120037 | NIST | SI.3 | malware | 12 |
| 120038 | NIST | SI.4 | ids | 7 |
| 120040 | TSC | CC6.1 | authentication_failed | 7 |
| 120041 | TSC | CC6.7 | exfiltration | 8 |
| 120042 | TSC | CC7.1 | ids+attack | 8 |
| 120043 | TSC | CC7.2 | malware | 12 |
| 120044 | TSC | CC8.1 | config_changed | 8 |

## Dashboard

File: `visualizations/compliance/compliance-overview-dashboard.ndjson`
Dashboard ID: `wazuh-compliance-overview`
Title: `Compliance Overview — PCI DSS | HIPAA | GDPR | NIST 800-53 | TSC`
Panels: 17 visualizations + 1 event table = 18 total

## Log Sources Covered

All existing log sources auto-tagged via rule groups:
- FortiGate → groups: firewall_drop, firewall_allowed, admin_login, vpn, malware
- Huawei USG → groups: firewall_drop, authentication_failed, vpn
- MikroTik → groups: firewall_drop, authentication_failed
- Suricata IDS → groups: ids, attack, malware, recon
- Infoblox DNS → groups: dns
- AbuseIPDB → groups: threat_intel (correlated with srcip)
- GeoIP → GeoLocation.country_name enriches GDPR Art 25 rule

## Telegram Alert

Integration block added: level 10+, group compliance
Trigger examples: NIST IR.4 (incident), NIST SI.3 (malware), GDPR Art 33

## Maintenance

- Rule updates: edit `rules/1007-compliance-tags.xml`, validate XML, restart Master
- Dashboard updates: re-run `scripts/generate/generate_compliance_dashboard.py`, re-import
- View: https://10.251.151.14 → Dashboard → Compliance Overview
- Wazuh built-in module: Dashboard → Modules → Regulatory Compliance
```

### 7.2 Update README.md — add compliance to Authoritative Files
Append to `/opt/code/wazuh_ova/README.md`:
```markdown
- `rules/1007-compliance-tags.xml` — compliance overlay rules (PCI/HIPAA/GDPR/NIST/TSC)
```

And to visualizations section:
```markdown
- `visualizations/compliance/compliance-overview-dashboard.ndjson`
```

### 7.3 Update Live Server Baseline
Append to `docs/current/LIVE_SERVER_BASELINE_2026-05-17.md`:
```markdown
## Compliance Dashboard (added [DATE])

- **Status**: ✅ Active
- **Frameworks**: PCI DSS 3.2.1, HIPAA, GDPR, NIST 800-53, TSC (SOC2)
- **Rules**: `1007-compliance-tags.xml` — 28 rules, IDs 120001–120044
- **Dashboard**: `compliance-overview-dashboard.ndjson` — 18 panels
- **Telegram**: level 10+ on compliance group
- **Built-in module**: Wazuh Dashboard → Modules → Regulatory Compliance
```

---

## PHASE 8 — FINAL VERIFICATION REPORT

```
════════════════════════════════════════════════════════
  Compliance Dashboard — Final Status Report
  Date: [DATE]
════════════════════════════════════════════════════════

RULES
  File        : /var/ossec/etc/rules/1007-compliance-tags.xml    [OK/FAIL]
  Rule count  : 28 rules (120001–120044)                         [OK/FAIL]
  XML valid   : xmllint passed                                   [OK/FAIL]
  Restart     : Master restarted without errors                  [OK/FAIL]

COMPLIANCE DATA (last 24h)
  PCI DSS     : [N] alerts tagged                               [OK/EMPTY]
  HIPAA       : [N] alerts tagged                               [OK/EMPTY]
  GDPR        : [N] alerts tagged                               [OK/EMPTY]
  NIST 800-53 : [N] alerts tagged                               [OK/EMPTY]
  TSC         : [N] alerts tagged                               [OK/EMPTY]

DASHBOARD
  NDJSON file : visualizations/compliance/compliance-overview-dashboard.ndjson  [OK/FAIL]
  Objects     : [N] (index-pattern + search + 17 vis + 1 dashboard)
  Import      : [successCount]/[N] objects imported              [OK/FAIL]
  Dashboard   : https://10.251.151.14 → Compliance Overview     [OK/FAIL]
  Panels      : 18 panels rendering                             [OK/FAIL]

TELEGRAM
  Integration : compliance group level 10+                      [OK/FAIL]

DOCUMENTATION
  COMPLIANCE_DASHBOARD_COMPLETED.md  : created in docs/current/ [OK/FAIL]
  README.md updated                  : YES/NO
  LIVE_SERVER_BASELINE updated       : YES/NO

NEXT RECOMMENDATIONS
  1. Enable built-in SCA: Modules → Security Config Assessment → Enable CIS checks
  2. Set up scheduled compliance reports: Wazuh → Reporting module
  3. Fine-tune rule levels if too many Telegram alerts
  4. Add ISO 27001 tags to rules (field: rule.iso_27001-2013 already mapped)
  5. Consider Active Response on rule 120022 (GDPR Art 33 data breach)
════════════════════════════════════════════════════════
```
