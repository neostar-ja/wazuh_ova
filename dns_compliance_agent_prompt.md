# Agent Prompt: DNS/Infoblox Compliance Coverage
# Target: Extend 1007-compliance-tags.xml with DNS group rules
# Project: /opt/code/wazuh_ova/
# Created: 2026-05-18

---

## SYSTEM CONTEXT

You are a senior Wazuh SIEM engineer extending the existing Compliance Dashboard
to fully cover DNS/Infoblox log sources. The compliance overlay rule file
`1007-compliance-tags.xml` was already deployed and covers firewall, auth, IDS,
and VPN groups. This task adds DNS-specific compliance rules to close the gap.

```
Cluster:
  Master    10.251.151.11  (Wazuh 4.14.5, role=master)
  Worker    10.251.151.12  (Wazuh 4.14.5, role=worker)
  Indexer   10.251.151.13  (OpenSearch 7.10.2)
  Dashboard 10.251.151.14  (HTTPS :443)

SSH : user=wazuh-user  password=wazuh  (sudo su for root)
API : admin / admin

Project root (local): /opt/code/wazuh_ova/

Existing compliance file (already deployed):
  rules/1007-compliance-tags.xml  (IDs 120001–120044)
  → DO NOT touch existing rules, only APPEND new rules

Infoblox rule file (read-only reference):
  rules/1004-infoblox-rules.xml   (IDs 100400–100499)

Infoblox decoder file (read-only reference):
  decoders/1003-infoblox-decoders.xml

Known Infoblox rule groups (from 1004-infoblox-rules.xml):
  DNS:   infoblox_dns, dns_query, dns_nxdomain, dga_malware, dns_axfr
         dns_update_denied, dns_denied, dns_notify, dns_firewall
  RPZ:   infoblox_threat, rpz_block, dns_threat, rpz_storm, infected_host
  DHCP:  infoblox_dhcp, dhcp_flood, dhcp_conflict, dhcp_pool_exhausted
         dos_attack, ip_conflict
  Audit: infoblox_audit, authentication_success, authentication_failed
         brute_force, config_change, dns_record_change, grid_event

New rule IDs to use: 120050–120079 (reserved for DNS/Infoblox compliance)
```

---

## OPERATING RULES

- Show exact command output before every change
- Read `1007-compliance-tags.xml` BEFORE editing — verify current max rule ID
- Never modify existing rules 120001–120044
- Never modify `1004-infoblox-rules.xml` (reference only)
- Use ONLY `<if_matched_group>` or `<if_sid>` — never hardcode device names
- Validate XML with xmllint before deploying
- Restart Master first → 30s wait → verify status
- Worker does NOT need restart (rules on Master only)
- Update documentation ONLY after all tests pass

---

## PHASE 1 — AUDIT CURRENT STATE

### 1.1 Read existing 1007-compliance-tags.xml on Master
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Current compliance rule file ==='
  sudo cat /var/ossec/etc/rules/1007-compliance-tags.xml

  echo ''
  echo '=== Current rule ID range ==='
  sudo grep 'rule id=' /var/ossec/etc/rules/1007-compliance-tags.xml | \
    grep -oP 'id=\"\K[0-9]+' | sort -n | tail -5
"
```
Expected: Last rule ID is 120044. Confirm before proceeding.

### 1.2 Check what Infoblox DNS groups already exist in live alerts
```bash
ssh wazuh-user@10.251.151.13 "
  echo '=== Infoblox DNS group coverage in alerts ==='
  for grp in infoblox_dns infoblox_threat rpz_block dns_nxdomain dga_malware \
              infoblox_dhcp dns_axfr infoblox_audit dns_record_change; do
    COUNT=\$(curl -sk -u admin:admin \
      'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
      -H 'Content-Type: application/json' \
      -d \"{\\\"query\\\":{\\\"match\\\":{\\\"rule.groups\\\":\\\"\$grp\\\"}}}\" \
      | python3 -c 'import sys,json; print(json.load(sys.stdin)[\"count\"])')
    echo \"  \$grp: \$COUNT alerts\"
  done
"
```

### 1.3 Check whether any Infoblox rules already have compliance tags
```bash
# On local machine — read project file
grep -E "pci_dss|hipaa|gdpr|nist_800_53|tsc" \
  /opt/code/wazuh_ova/rules/1004-infoblox-rules.xml

echo ''
echo '=== Infoblox rules already tagged ==='
grep -B5 "pci_dss\|nist_800_53\|gdpr\|hipaa" \
  /opt/code/wazuh_ova/rules/1004-infoblox-rules.xml | grep "rule id="
```
Note: Rules 100402 (AXFR) and 100430 (RPZ) already have `pci_dss_11.4` in group.
This is a group-tag approach — the new compliance overlay will add proper
`<pci_dss>`, `<nist_800_53>`, `<hipaa>`, `<gdpr>`, `<tsc>` XML tags via child rules.

### 1.4 Verify Infoblox is sending live data to cluster
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search' \
    -H 'Content-Type: application/json' \
    -d '{
      \"size\": 3,
      \"sort\": [{\"@timestamp\": {\"order\": \"desc\"}}],
      \"query\": {\"match\": {\"rule.groups\": \"infoblox\"}},
      \"_source\": [\"@timestamp\",\"rule.id\",\"rule.groups\",\"rule.description\",\"data.srcip\",\"data.dns_domain\"]
    }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
hits = d.get('hits',{}).get('hits',[])
print(f'Recent Infoblox alerts: {len(hits)}')
for h in hits:
  s = h['_source']
  print(f'  [{s.get(\\\"@timestamp\\\",\\\"?\\\")[:19]}] rule {s[\\\"rule\\\"][\\\"id\\\"]} | {s[\\\"rule\\\"][\\\"groups\\\"]} | {s[\\\"rule\\\"].get(\\\"description\\\",\\\"?\\\")[:50]}')
\"
"
```

### 1.5 Report Phase 1 findings
State:
- Last rule ID in 1007-compliance-tags.xml (must be 120044)
- Which DNS groups have live alert data (high-value targets first)
- Which Infoblox rules already have partial compliance tags in group field
- Whether Infoblox is actively sending data

---

## PHASE 2 — APPEND DNS COMPLIANCE RULES TO 1007-compliance-tags.xml

### 2.1 Backup existing file on Master
```bash
ssh wazuh-user@10.251.151.11 "
  sudo cp /var/ossec/etc/rules/1007-compliance-tags.xml \
          /var/ossec/etc/rules/1007-compliance-tags.xml.bak.$(date +%Y%m%d_%H%M%S)
  echo 'Backup created:'
  ls -lh /var/ossec/etc/rules/1007-compliance-tags.xml.bak.*
"
```

### 2.2 Also backup local project file
```bash
cp /opt/code/wazuh_ova/rules/1007-compliance-tags.xml \
   /opt/code/wazuh_ova/rules/1007-compliance-tags.xml.bak.$(date +%Y%m%d_%H%M%S)
```

### 2.3 Create the DNS compliance rules addition file locally
Create `/opt/code/wazuh_ova/rules/1007-dns-compliance-addition.xml`
with the following rules — these are CHILD rules using `<if_matched_group>`
to attach compliance tags to existing Infoblox alert chains:

```xml
<!-- DNS/Infoblox Compliance Rules — Appended to 1007-compliance-tags.xml -->
<!-- Rule ID range: 120050–120079 -->
<!-- Added: 2026-05-18 -->
<!-- Covers: infoblox_dns, infoblox_threat, rpz_block, infoblox_dhcp, infoblox_audit -->

  <!-- ==============================================================
       DNS SECURITY — PCI DSS + NIST + GDPR
  ============================================================== -->

  <!-- PCI 11.4 + NIST SI.4: RPZ blocks malicious domain/IP
       Trigger: infoblox_threat (rules 100430, 100431, 100432)
       Compliance: DNS Firewall is a required monitoring control -->
  <rule id="120050" level="8">
    <if_matched_group>infoblox_threat,</if_matched_group>
    <description>PCI 11.4 / NIST SI.4: DNS Firewall blocked malicious domain — $(data.dns_domain) for $(data.srcip)</description>
    <group>pci_dss_11.4,nist_800_53_SI.4,tsc_CC7.1,compliance,dns,</group>
    <pci_dss>11.4</pci_dss>
    <nist_800_53>SI.4</nist_800_53>
    <tsc>CC7.1</tsc>
    <mitre>
      <id>T1071.004</id>
    </mitre>
  </rule>

  <!-- PCI 10.6 + NIST SI.3 + GDPR Art 32: Infected host via RPZ storm
       Trigger: infected_host (rules 100433, 100434 — 10+ RPZ blocks)
       Compliance: Malware outbreak requiring immediate response -->
  <rule id="120051" level="12">
    <if_matched_group>rpz_storm,</if_matched_group>
    <description>PCI 10.6 / NIST SI.3 / GDPR Art 32: Infected host $(data.srcip) — repeated malicious DNS (C2/Malware)</description>
    <group>pci_dss_10.6,nist_800_53_SI.3,gdpr_IV_32,tsc_CC7.2,compliance,malware,dns,</group>
    <pci_dss>10.6</pci_dss>
    <nist_800_53>SI.3</nist_800_53>
    <gdpr>IV_32</gdpr>
    <tsc>CC7.2</tsc>
    <mitre>
      <id>T1071.004</id>
    </mitre>
  </rule>

  <!-- PCI 11.4 + NIST SC.5: DNS Zone Transfer attempt (Reconnaissance)
       Trigger: dns_axfr (rules 100402, 100403)
       Compliance: Zone transfer = sensitive network enumeration -->
  <rule id="120052" level="10">
    <if_matched_group>dns_axfr,</if_matched_group>
    <description>PCI 11.4 / NIST SC.5: DNS Zone Transfer attempt from $(data.srcip) — Reconnaissance detected</description>
    <group>pci_dss_11.4,nist_800_53_SC.5,compliance,recon,dns,</group>
    <pci_dss>11.4</pci_dss>
    <nist_800_53>SC.5</nist_800_53>
    <mitre>
      <id>T1590.002</id>
    </mitre>
  </rule>

  <!-- NIST SI.3 + GDPR Art 32: DGA Malware detection via NXDOMAIN flood
       Trigger: dga_malware (rule 100408 — 20+ NXDOMAIN/60s)
       Compliance: DGA is a key malware C2 evasion indicator -->
  <rule id="120053" level="12">
    <if_matched_group>dga_malware,</if_matched_group>
    <description>NIST SI.3 / GDPR Art 32: DGA Malware activity from $(data.srcip) — 20+ NXDOMAIN in 60s</description>
    <group>nist_800_53_SI.3,gdpr_IV_32,tsc_CC7.2,compliance,malware,dns,</group>
    <nist_800_53>SI.3</nist_800_53>
    <gdpr>IV_32</gdpr>
    <tsc>CC7.2</tsc>
    <mitre>
      <id>T1568.002</id>
    </mitre>
  </rule>

  <!-- NIST SC.5 + TSC CC7.1: DNS NXDOMAIN anomaly (potential DGA early stage)
       Trigger: dns_nxdomain (rule 100407 — single NXDOMAIN response)
       Compliance: Individual NXDOMAIN = warning signal -->
  <rule id="120054" level="5">
    <if_matched_group>dns_nxdomain,</if_matched_group>
    <description>NIST SC.5: DNS NXDOMAIN response for $(data.dns_domain) from $(data.srcip)</description>
    <group>nist_800_53_SC.5,tsc_CC7.1,compliance,dns,</group>
    <nist_800_53>SC.5</nist_800_53>
    <tsc>CC7.1</tsc>
  </rule>

  <!-- PCI 6.6 + NIST SC.5: DNS dynamic update denied (DNS hijack attempt)
       Trigger: dns_update_denied (rule 100404)
       Compliance: Unauthorized DNS modification attempt -->
  <rule id="120055" level="7">
    <if_matched_group>dns_update_denied,</if_matched_group>
    <description>PCI 6.6 / NIST SC.5: DNS Dynamic Update denied from $(data.srcip) — Possible DNS hijack attempt</description>
    <group>pci_dss_6.6,nist_800_53_SC.5,compliance,dns,</group>
    <pci_dss>6.6</pci_dss>
    <nist_800_53>SC.5</nist_800_53>
    <mitre>
      <id>T1584</id>
    </mitre>
  </rule>

  <!-- NIST SC.5: Recursive DNS query denied (unauthorized resolver use)
       Trigger: dns_denied (rule 100406)
       Compliance: Open resolver access = DNS amplification risk -->
  <rule id="120056" level="5">
    <if_matched_group>dns_denied,</if_matched_group>
    <description>NIST SC.5: Unauthorized DNS recursive query denied from $(data.srcip)</description>
    <group>nist_800_53_SC.5,compliance,dns,access_control,</group>
    <nist_800_53>SC.5</nist_800_53>
  </rule>

  <!-- TSC CC6.7 + GDPR Art 32 + HIPAA 164.312: DNS tunnel / exfiltration
       Trigger: infoblox_threat + dns_firewall (rule 100426 threat category match)
       Compliance: DNS tunneling = data exfiltration channel -->
  <rule id="120057" level="10">
    <if_matched_group>dns_firewall,</if_matched_group>
    <description>TSC CC6.7 / GDPR Art 32 / HIPAA 164.312: DNS Firewall threat category match — $(data.dns_domain) from $(data.srcip)</description>
    <group>tsc_CC6.7,gdpr_IV_32,hipaa_164.312,compliance,dns,exfiltration,</group>
    <tsc>CC6.7</tsc>
    <gdpr>IV_32</gdpr>
    <hipaa>164.312.e.2.ii</hipaa>
    <mitre>
      <id>T1071.004</id>
    </mitre>
  </rule>

  <!-- ==============================================================
       DHCP SECURITY — NIST + PCI + TSC
  ============================================================== -->

  <!-- NIST SC.5 + TSC CC7.1: DHCP starvation / flood attack
       Trigger: dhcp_flood (rule 100418 — 20+ DISCOVER from same MAC)
       Compliance: DHCP DoS = network availability attack -->
  <rule id="120060" level="10">
    <if_matched_group>dhcp_flood,</if_matched_group>
    <description>NIST SC.5 / TSC CC7.1: DHCP flood from $(data.dhcp_mac) — Possible DHCP starvation attack</description>
    <group>nist_800_53_SC.5,tsc_CC7.1,compliance,dhcp,dos,</group>
    <nist_800_53>SC.5</nist_800_53>
    <tsc>CC7.1</tsc>
    <mitre>
      <id>T1499</id>
    </mitre>
  </rule>

  <!-- NIST SC.5 + TSC CC7.2: DHCP pool exhaustion (DoS / starvation attack)
       Trigger: dhcp_pool_exhausted (rules 100441, 100442)
       Compliance: Pool exhaustion = network service disruption -->
  <rule id="120061" level="12">
    <if_matched_group>dhcp_pool_exhausted,</if_matched_group>
    <description>NIST SC.5 / TSC CC7.2: DHCP pool exhausted — Active DHCP starvation attack suspected</description>
    <group>nist_800_53_SC.5,tsc_CC7.2,compliance,dhcp,dos,critical,</group>
    <nist_800_53>SC.5</nist_800_53>
    <tsc>CC7.2</tsc>
    <mitre>
      <id>T1499</id>
    </mitre>
  </rule>

  <!-- NIST SC.5 + PCI 1.3: DHCP IP conflict (possible spoofing)
       Trigger: dhcp_conflict (rule 100417 — DHCPDECLINE)
       Compliance: IP conflict = potential spoofing or rogue device -->
  <rule id="120062" level="8">
    <if_matched_group>dhcp_conflict,</if_matched_group>
    <description>PCI 1.3 / NIST SC.5: DHCP IP conflict — $(data.dhcp_mac) declined $(data.dhcp_ip) — Possible IP spoofing</description>
    <group>pci_dss_1.3,nist_800_53_SC.5,compliance,dhcp,</group>
    <pci_dss>1.3</pci_dss>
    <nist_800_53>SC.5</nist_800_53>
    <mitre>
      <id>T1557</id>
    </mitre>
  </rule>

  <!-- ==============================================================
       INFOBLOX AUDIT / ADMIN — PCI + NIST + GDPR + HIPAA
  ============================================================== -->

  <!-- PCI 8.3 + NIST AC.3 + HIPAA 164.308: Infoblox admin login failure
       Trigger: infoblox_audit + authentication_failed (rule 100422)
       Compliance: Admin login failure = access control violation -->
  <rule id="120070" level="7">
    <if_matched_group>infoblox_audit,</if_matched_group>
    <if_matched_group>authentication_failed,</if_matched_group>
    <description>PCI 8.3 / NIST AC.3 / HIPAA 164.308: Infoblox admin login failed — $(data.username) from $(data.srcip)</description>
    <group>pci_dss_8.3,nist_800_53_AC.3,hipaa_164.308,compliance,authentication,dns,</group>
    <pci_dss>8.3</pci_dss>
    <nist_800_53>AC.3</nist_800_53>
    <hipaa>164.308.a.5.ii.c</hipaa>
    <mitre>
      <id>T1110</id>
    </mitre>
  </rule>

  <!-- PCI 8.3 + NIST AC.3: Infoblox admin brute force
       Trigger: infoblox_audit + brute_force (rule 100423 — 5+ failures)
       Compliance: Repeated admin login failures = credential attack -->
  <rule id="120071" level="12">
    <if_matched_group>infoblox_audit,</if_matched_group>
    <if_matched_group>brute_force,</if_matched_group>
    <description>PCI 8.3 / NIST AC.3: Infoblox BRUTE FORCE — multiple admin login failures from $(data.srcip)</description>
    <group>pci_dss_8.3,nist_800_53_AC.3,hipaa_164.308,tsc_CC6.1,compliance,brute_force,dns,</group>
    <pci_dss>8.3</pci_dss>
    <nist_800_53>AC.3</nist_800_53>
    <hipaa>164.308.a.5.ii.c</hipaa>
    <tsc>CC6.1</tsc>
    <mitre>
      <id>T1110.001</id>
    </mitre>
  </rule>

  <!-- PCI 10.2 + NIST AU.14: Infoblox admin login success
       Trigger: infoblox_audit + authentication_success (rule 100421)
       Compliance: Privileged access must be logged and monitored -->
  <rule id="120072" level="5">
    <if_matched_group>infoblox_audit,</if_matched_group>
    <if_matched_group>authentication_success,</if_matched_group>
    <description>PCI 10.2 / NIST AU.14: Infoblox admin $(data.username) logged in from $(data.srcip)</description>
    <group>pci_dss_10.2,nist_800_53_AU.14,compliance,authentication,dns,</group>
    <pci_dss>10.2</pci_dss>
    <nist_800_53>AU.14</nist_800_53>
  </rule>

  <!-- PCI 10.6 + NIST CM.7 + GDPR Art 5: DNS record modified by admin
       Trigger: config_change + dns_record_change (rule 100424)
       Compliance: DNS record changes = critical infrastructure modification -->
  <rule id="120073" level="8">
    <if_matched_group>dns_record_change,</if_matched_group>
    <description>PCI 10.6 / NIST CM.7 / GDPR Art 5: Infoblox DNS record changed ($(data.action)) by admin — $(data.dns_domain)</description>
    <group>pci_dss_10.6,nist_800_53_CM.7,gdpr_IV_5,tsc_CC8.1,compliance,config_change,dns,</group>
    <pci_dss>10.6</pci_dss>
    <nist_800_53>CM.7</nist_800_53>
    <gdpr>IV_5.1.f</gdpr>
    <tsc>CC8.1</tsc>
    <mitre>
      <id>T1584.002</id>
    </mitre>
  </rule>

  <!-- NIST CM.7 + TSC CC8.1: General Infoblox config change
       Trigger: infoblox_audit + config_change (rule 100424 broad)
       Compliance: Any infra config change needs audit trail -->
  <rule id="120074" level="7">
    <if_matched_group>infoblox_audit,</if_matched_group>
    <if_matched_group>config_change,</if_matched_group>
    <description>NIST CM.7 / TSC CC8.1: Infoblox configuration change event logged</description>
    <group>nist_800_53_CM.7,tsc_CC8.1,compliance,config_change,dns,</group>
    <nist_800_53>CM.7</nist_800_53>
    <tsc>CC8.1</tsc>
  </rule>
```

### 2.4 Append new rules to the existing file on Master

The new rules need to be inserted BEFORE the closing `</group>` tag
of the existing `1007-compliance-tags.xml`. Do this carefully:

```bash
# First verify the closing tag exists
ssh wazuh-user@10.251.151.11 "
  sudo tail -5 /var/ossec/etc/rules/1007-compliance-tags.xml
"
# Expected last lines:
#   </rule>
#   </group>

# Remove closing </group> tag, append new rules, re-add </group>
ssh wazuh-user@10.251.151.11 "sudo bash -s" << 'REMOTE_SCRIPT'
set -e

FILE='/var/ossec/etc/rules/1007-compliance-tags.xml'

# Remove the last </group> line (closing tag of compliance group)
sudo sed -i '/<\/group>$/d' \$FILE

# Append new DNS compliance rules
sudo tee -a \$FILE > /dev/null << 'DNS_RULES'

  <!-- ==============================================================
       DNS/INFOBLOX COMPLIANCE RULES — Added 2026-05-18
       Rule IDs: 120050–120074
       Covers: infoblox_dns, infoblox_threat, rpz_block, rpz_storm,
               dga_malware, dns_axfr, dns_nxdomain, dns_update_denied,
               dns_denied, dns_firewall, dhcp_flood, dhcp_conflict,
               dhcp_pool_exhausted, infoblox_audit
  ============================================================== -->

  <rule id="120050" level="8">
    <if_matched_group>infoblox_threat,</if_matched_group>
    <description>PCI 11.4 / NIST SI.4: DNS Firewall blocked malicious domain</description>
    <group>pci_dss_11.4,nist_800_53_SI.4,tsc_CC7.1,compliance,dns,</group>
    <pci_dss>11.4</pci_dss>
    <nist_800_53>SI.4</nist_800_53>
    <tsc>CC7.1</tsc>
    <mitre><id>T1071.004</id></mitre>
  </rule>

  <rule id="120051" level="12">
    <if_matched_group>rpz_storm,</if_matched_group>
    <description>PCI 10.6 / NIST SI.3 / GDPR Art 32: Infected host — repeated malicious DNS activity</description>
    <group>pci_dss_10.6,nist_800_53_SI.3,gdpr_IV_32,tsc_CC7.2,compliance,malware,dns,</group>
    <pci_dss>10.6</pci_dss>
    <nist_800_53>SI.3</nist_800_53>
    <gdpr>IV_32</gdpr>
    <tsc>CC7.2</tsc>
    <mitre><id>T1071.004</id></mitre>
  </rule>

  <rule id="120052" level="10">
    <if_matched_group>dns_axfr,</if_matched_group>
    <description>PCI 11.4 / NIST SC.5: DNS Zone Transfer attempt — Reconnaissance</description>
    <group>pci_dss_11.4,nist_800_53_SC.5,compliance,recon,dns,</group>
    <pci_dss>11.4</pci_dss>
    <nist_800_53>SC.5</nist_800_53>
    <mitre><id>T1590.002</id></mitre>
  </rule>

  <rule id="120053" level="12">
    <if_matched_group>dga_malware,</if_matched_group>
    <description>NIST SI.3 / GDPR Art 32: DGA Malware activity — 20+ NXDOMAIN in 60s</description>
    <group>nist_800_53_SI.3,gdpr_IV_32,tsc_CC7.2,compliance,malware,dns,</group>
    <nist_800_53>SI.3</nist_800_53>
    <gdpr>IV_32</gdpr>
    <tsc>CC7.2</tsc>
    <mitre><id>T1568.002</id></mitre>
  </rule>

  <rule id="120054" level="5">
    <if_matched_group>dns_nxdomain,</if_matched_group>
    <description>NIST SC.5: DNS NXDOMAIN response anomaly</description>
    <group>nist_800_53_SC.5,tsc_CC7.1,compliance,dns,</group>
    <nist_800_53>SC.5</nist_800_53>
    <tsc>CC7.1</tsc>
  </rule>

  <rule id="120055" level="7">
    <if_matched_group>dns_update_denied,</if_matched_group>
    <description>PCI 6.6 / NIST SC.5: DNS Dynamic Update denied — Possible DNS hijack</description>
    <group>pci_dss_6.6,nist_800_53_SC.5,compliance,dns,</group>
    <pci_dss>6.6</pci_dss>
    <nist_800_53>SC.5</nist_800_53>
    <mitre><id>T1584</id></mitre>
  </rule>

  <rule id="120056" level="5">
    <if_matched_group>dns_denied,</if_matched_group>
    <description>NIST SC.5: Unauthorized DNS recursive query denied</description>
    <group>nist_800_53_SC.5,compliance,dns,access_control,</group>
    <nist_800_53>SC.5</nist_800_53>
  </rule>

  <rule id="120057" level="10">
    <if_matched_group>dns_firewall,</if_matched_group>
    <description>TSC CC6.7 / GDPR Art 32 / HIPAA 164.312: DNS Firewall threat category match</description>
    <group>tsc_CC6.7,gdpr_IV_32,hipaa_164.312,compliance,dns,exfiltration,</group>
    <tsc>CC6.7</tsc>
    <gdpr>IV_32</gdpr>
    <hipaa>164.312.e.2.ii</hipaa>
    <mitre><id>T1071.004</id></mitre>
  </rule>

  <rule id="120060" level="10">
    <if_matched_group>dhcp_flood,</if_matched_group>
    <description>NIST SC.5 / TSC CC7.1: DHCP flood — Possible DHCP starvation attack</description>
    <group>nist_800_53_SC.5,tsc_CC7.1,compliance,dhcp,dos,</group>
    <nist_800_53>SC.5</nist_800_53>
    <tsc>CC7.1</tsc>
    <mitre><id>T1499</id></mitre>
  </rule>

  <rule id="120061" level="12">
    <if_matched_group>dhcp_pool_exhausted,</if_matched_group>
    <description>NIST SC.5 / TSC CC7.2: DHCP pool exhausted — Active starvation attack</description>
    <group>nist_800_53_SC.5,tsc_CC7.2,compliance,dhcp,dos,critical,</group>
    <nist_800_53>SC.5</nist_800_53>
    <tsc>CC7.2</tsc>
    <mitre><id>T1499</id></mitre>
  </rule>

  <rule id="120062" level="8">
    <if_matched_group>dhcp_conflict,</if_matched_group>
    <description>PCI 1.3 / NIST SC.5: DHCP IP conflict — Possible IP spoofing</description>
    <group>pci_dss_1.3,nist_800_53_SC.5,compliance,dhcp,</group>
    <pci_dss>1.3</pci_dss>
    <nist_800_53>SC.5</nist_800_53>
    <mitre><id>T1557</id></mitre>
  </rule>

  <rule id="120070" level="7">
    <if_matched_group>infoblox_audit,</if_matched_group>
    <if_matched_group>authentication_failed,</if_matched_group>
    <description>PCI 8.3 / NIST AC.3 / HIPAA 164.308: Infoblox admin login failed</description>
    <group>pci_dss_8.3,nist_800_53_AC.3,hipaa_164.308,compliance,authentication,dns,</group>
    <pci_dss>8.3</pci_dss>
    <nist_800_53>AC.3</nist_800_53>
    <hipaa>164.308.a.5.ii.c</hipaa>
    <mitre><id>T1110</id></mitre>
  </rule>

  <rule id="120071" level="12">
    <if_matched_group>infoblox_audit,</if_matched_group>
    <if_matched_group>brute_force,</if_matched_group>
    <description>PCI 8.3 / NIST AC.3: Infoblox admin brute force</description>
    <group>pci_dss_8.3,nist_800_53_AC.3,hipaa_164.308,tsc_CC6.1,compliance,brute_force,dns,</group>
    <pci_dss>8.3</pci_dss>
    <nist_800_53>AC.3</nist_800_53>
    <hipaa>164.308.a.5.ii.c</hipaa>
    <tsc>CC6.1</tsc>
    <mitre><id>T1110.001</id></mitre>
  </rule>

  <rule id="120072" level="5">
    <if_matched_group>infoblox_audit,</if_matched_group>
    <if_matched_group>authentication_success,</if_matched_group>
    <description>PCI 10.2 / NIST AU.14: Infoblox admin login success</description>
    <group>pci_dss_10.2,nist_800_53_AU.14,compliance,authentication,dns,</group>
    <pci_dss>10.2</pci_dss>
    <nist_800_53>AU.14</nist_800_53>
  </rule>

  <rule id="120073" level="8">
    <if_matched_group>dns_record_change,</if_matched_group>
    <description>PCI 10.6 / NIST CM.7 / GDPR Art 5: Infoblox DNS record changed</description>
    <group>pci_dss_10.6,nist_800_53_CM.7,gdpr_IV_5,tsc_CC8.1,compliance,config_change,dns,</group>
    <pci_dss>10.6</pci_dss>
    <nist_800_53>CM.7</nist_800_53>
    <gdpr>IV_5.1.f</gdpr>
    <tsc>CC8.1</tsc>
    <mitre><id>T1584.002</id></mitre>
  </rule>

  <rule id="120074" level="7">
    <if_matched_group>infoblox_audit,</if_matched_group>
    <if_matched_group>config_change,</if_matched_group>
    <description>NIST CM.7 / TSC CC8.1: Infoblox configuration change event</description>
    <group>nist_800_53_CM.7,tsc_CC8.1,compliance,config_change,dns,</group>
    <nist_800_53>CM.7</nist_800_53>
    <tsc>CC8.1</tsc>
  </rule>

</group>
DNS_RULES

echo "Append complete. Verifying structure..."
sudo tail -10 \$FILE
REMOTE_SCRIPT
```

### 2.5 Validate the updated XML
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== XML validation ==='
  sudo xmllint --noout /var/ossec/etc/rules/1007-compliance-tags.xml && echo 'XML: OK'

  echo ''
  echo '=== Total compliance rules now ==='
  sudo grep -c '<rule id=' /var/ossec/etc/rules/1007-compliance-tags.xml

  echo ''
  echo '=== New DNS rules confirmed ==='
  sudo grep 'rule id=\"1200[5-7]' /var/ossec/etc/rules/1007-compliance-tags.xml

  echo ''
  echo '=== Rule ID range ==='
  sudo grep 'rule id=' /var/ossec/etc/rules/1007-compliance-tags.xml | \
    grep -oP 'id=\"\K[0-9]+' | sort -n | head -3
  echo '...'
  sudo grep 'rule id=' /var/ossec/etc/rules/1007-compliance-tags.xml | \
    grep -oP 'id=\"\K[0-9]+' | sort -n | tail -3
"
```
Expected: 28 original + 17 new DNS = 45 total rules. Last ID = 120074. XML OK.

### 2.6 Restart Master and verify
```bash
ssh wazuh-user@10.251.151.11 "
  sudo /var/ossec/bin/wazuh-control restart
  sleep 30
  echo '=== Service status ==='
  sudo /var/ossec/bin/wazuh-control status | grep -E 'analysisd|integratord|clusterd'

  echo ''
  echo '=== Check no errors from new rules ==='
  sudo grep -i 'error\|warning' /var/ossec/logs/ossec.log | \
    grep -v 'deprecated' | tail -10
"
```
If any error mentions rule ID 1200xx → fix XML and restart again before continuing.

---

## PHASE 3 — TEST DNS COMPLIANCE RULES

### 3.1 Test with wazuh-logtest on Master
```bash
ssh wazuh-user@10.251.151.11 "sudo -u ossec /var/ossec/bin/wazuh-logtest"
```

**Test 1: RPZ block → should trigger 100430 + 120050 (PCI 11.4 / NIST SI.4)**
Paste this log:
```
May 18 10:01:00 infoblox named[1234]: client @0x7f 10.251.66.51#54321 (malware.example.com): rpz QNAME Policy Rewrite malware.example.com/A/IN via rpz.malware (NXDOMAIN)
```
Expected:
- Phase 2 decoder: `infoblox-dns-rpz`
- Phase 3 rule: 100430 level 8 (infoblox_threat, rpz_block)
- Phase 3 child rule: 120050 level 8 (compliance, pci_dss_11.4, nist_800_53_SI.4)

**Test 2: AXFR denied → should trigger 100402 + 120052 (PCI 11.4 / NIST SC.5)**
Paste:
```
May 18 10:02:00 infoblox named[1234]: client 10.251.66.52#45678: denied AXFR from '10.251.66.52'
```
Expected: rule 100402 + child 120052

**Test 3: Admin login failure → should trigger 100422 + 120070 (PCI 8.3 / HIPAA)**
Paste:
```
May 18 10:03:00 infoblox infoblox-syslog: [admin]: FAILED LOGIN adminuser from 10.251.1.100
```
Expected: rule 100422 + child 120070

**Test 4: DNS record change → should trigger 100424 + 120073 (PCI 10.6 / NIST CM.7)**
Paste:
```
May 18 10:04:00 infoblox infoblox-syslog: admin: MODIFY: Record A 'server.corp.local' Changed: IP Old=10.0.0.1, New=10.0.0.2
```
Expected: rule 100424 + child 120073

### 3.2 Inject test logs via logger on Worker
```bash
ssh wazuh-user@10.251.151.12 "

  echo '--- Test 1: RPZ block (PCI 11.4 / NIST SI.4) ---'
  logger -p daemon.warning 'named[99]: client @0x7f1a 10.251.66.51#54321 (malware-test.badsite.com): rpz QNAME Policy Rewrite malware-test.badsite.com/A/IN via rpz.malware (NXDOMAIN)'

  sleep 2

  echo '--- Test 2: AXFR denied (PCI 11.4 / NIST SC.5) ---'
  logger -p daemon.warning 'named[99]: client 203.0.113.10#45678: denied AXFR from 203.0.113.10#45678'

  sleep 2

  echo '--- Test 3: Admin login failure (PCI 8.3 / HIPAA) ---'
  logger -p daemon.warning 'infoblox-syslog: [admin]: FAILED LOGIN hacker from 198.51.100.77'

  sleep 2

  echo '--- Test 4: DNS record change (NIST CM.7 / GDPR) ---'
  logger -p daemon.warning 'infoblox-syslog: admin: MODIFY: Record A server.corp.local Changed: IP Old=10.0.0.1, New=10.0.0.99'

  echo 'Test logs sent. Checking alerts in 30 seconds...'
"
```

### 3.3 Verify compliance alerts in OpenSearch
```bash
sleep 30

ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search' \
    -H 'Content-Type: application/json' \
    -d '{
      \"size\": 10,
      \"sort\": [{\"@timestamp\": {\"order\": \"desc\"}}],
      \"query\": {
        \"bool\": {
          \"must\": [
            {\"range\": {\"@timestamp\": {\"gte\": \"now-5m\"}}},
            {\"match\": {\"rule.groups\": \"compliance\"}},
            {\"match\": {\"rule.groups\": \"dns\"}}
          ]
        }
      },
      \"_source\": [\"@timestamp\",\"rule.id\",\"rule.level\",\"rule.description\",
                   \"rule.pci_dss\",\"rule.nist_800_53\",\"rule.hipaa\",\"rule.gdpr\",\"rule.tsc\"]
    }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
hits = d.get('hits',{}).get('hits',[])
print(f'DNS compliance alerts in last 5 min: {len(hits)}')
for h in hits:
  s = h['_source']
  r = s.get('rule',{})
  ts = s.get('@timestamp','?')[:19]
  print(f'  [{ts}] Rule {r.get(\\\"id\\\",\\\"?\\\")} level {r.get(\\\"level\\\",\\\"?\\\")}')
  print(f'    PCI: {r.get(\\\"pci_dss\\\",\\\"N/A\\\")} | NIST: {r.get(\\\"nist_800_53\\\",\\\"N/A\\\")} | HIPAA: {r.get(\\\"hipaa\\\",\\\"N/A\\\")}')
  print(f'    {r.get(\\\"description\\\",\\\"?\\\")[:70]}')
\"
"
```
Expected: 4 alerts matching the 4 test logs, each with correct compliance fields.

### 3.4 Verify DNS compliance count by framework
```bash
ssh wazuh-user@10.251.151.13 "
  echo '=== DNS Compliance coverage by framework ==='
  for field in rule.pci_dss rule.nist_800_53 rule.hipaa rule.gdpr rule.tsc; do
    COUNT=\$(curl -sk -u admin:admin \
      'https://localhost:9200/wazuh-alerts-4.x-*/_count' \
      -H 'Content-Type: application/json' \
      -d \"{
        \\\"query\\\":{
          \\\"bool\\\":{
            \\\"must\\\":[
              {\\\"exists\\\":{\\\"field\\\":\\\"\$field\\\"}},
              {\\\"match\\\":{\\\"rule.groups\\\":\\\"dns\\\"}}
            ]
          }
        }
      }\" \
      | python3 -c 'import sys,json; print(json.load(sys.stdin)[\"count\"])')
    echo \"  DNS alerts with \$field: \$COUNT\"
  done
"
```

---

## PHASE 4 — UPDATE LOCAL PROJECT FILE AND SYNC

### 4.1 Pull the updated file from Master to local project
```bash
# Copy updated file from Master back to local project
scp wazuh-user@10.251.151.11:/var/ossec/etc/rules/1007-compliance-tags.xml \
    /opt/code/wazuh_ova/rules/1007-compliance-tags.xml

echo "=== Verify local file updated ==="
grep -c '<rule id=' /opt/code/wazuh_ova/rules/1007-compliance-tags.xml
grep 'rule id="12007' /opt/code/wazuh_ova/rules/1007-compliance-tags.xml
```

### 4.2 Clean up temp file
```bash
rm -f /opt/code/wazuh_ova/rules/1007-compliance-tags.xml.bak.*
rm -f /opt/code/wazuh_ova/rules/1007-dns-compliance-addition.xml
```

---

## PHASE 5 — UPDATE DOCUMENTATION

### 5.1 Update COMPLIANCE_DASHBOARD_COMPLETED.md
Append to `/opt/code/wazuh_ova/docs/current/COMPLIANCE_DASHBOARD_COMPLETED.md`:

```markdown
## DNS/Infoblox Compliance Update — 2026-05-18

**New rules added:** 120050–120074 (17 rules)
**Added to:** `rules/1007-compliance-tags.xml`

### DNS Compliance Rules Added

| Rule ID | Framework Controls | Trigger Group | Scenario |
|---------|-------------------|---------------|----------|
| 120050 | PCI 11.4, NIST SI.4, TSC CC7.1 | infoblox_threat | DNS Firewall RPZ block |
| 120051 | PCI 10.6, NIST SI.3, GDPR Art 32, TSC CC7.2 | rpz_storm | Infected host / C2 callback |
| 120052 | PCI 11.4, NIST SC.5 | dns_axfr | Zone Transfer attempt |
| 120053 | NIST SI.3, GDPR Art 32, TSC CC7.2 | dga_malware | DGA malware NXDOMAIN flood |
| 120054 | NIST SC.5, TSC CC7.1 | dns_nxdomain | NXDOMAIN anomaly |
| 120055 | PCI 6.6, NIST SC.5 | dns_update_denied | DNS hijack attempt |
| 120056 | NIST SC.5 | dns_denied | Unauthorized recursive query |
| 120057 | TSC CC6.7, GDPR Art 32, HIPAA 164.312 | dns_firewall | DNS threat category match |
| 120060 | NIST SC.5, TSC CC7.1 | dhcp_flood | DHCP starvation attack |
| 120061 | NIST SC.5, TSC CC7.2 | dhcp_pool_exhausted | DHCP pool exhausted |
| 120062 | PCI 1.3, NIST SC.5 | dhcp_conflict | IP conflict / spoofing |
| 120070 | PCI 8.3, NIST AC.3, HIPAA 164.308 | infoblox_audit+auth_failed | Admin login failure |
| 120071 | PCI 8.3, NIST AC.3, HIPAA 164.308, TSC CC6.1 | infoblox_audit+brute_force | Admin brute force |
| 120072 | PCI 10.2, NIST AU.14 | infoblox_audit+auth_success | Admin login success |
| 120073 | PCI 10.6, NIST CM.7, GDPR Art 5, TSC CC8.1 | dns_record_change | DNS record modified |
| 120074 | NIST CM.7, TSC CC8.1 | infoblox_audit+config_change | Infoblox config change |

### Full Compliance Coverage Summary (after this update)

| Log Source | PCI DSS | HIPAA | GDPR | NIST 800-53 | TSC |
|-----------|---------|-------|------|-------------|-----|
| FortiGate | ✅ | ✅ | ✅ | ✅ | ✅ |
| Huawei USG | ✅ | ✅ | ✅ | ✅ | ✅ |
| MikroTik | ✅ | - | - | ✅ | ✅ |
| Suricata IDS | ✅ | ✅ | ✅ | ✅ | ✅ |
| Infoblox DNS | ✅ | ✅ | ✅ | ✅ | ✅ |
| Infoblox DHCP | ✅ | - | - | ✅ | ✅ |
| Infoblox Audit | ✅ | ✅ | ✅ | ✅ | ✅ |
| AbuseIPDB / OTX | ✅ | - | ✅ | - | - |
```

### 5.2 Update README.md rule count
Update the rule count reference in `/opt/code/wazuh_ova/README.md`:
- Change "28 rules" to "45 rules" for `1007-compliance-tags.xml`
- Note: "Covers DNS/Infoblox, DHCP, and Infoblox Audit events"

### 5.3 Append to Live Server Baseline
Append to `docs/current/LIVE_SERVER_BASELINE_2026-05-17.md`:
```markdown
### Compliance Rules Update — 2026-05-18

- `1007-compliance-tags.xml` expanded: 28 → 45 rules
- Added DNS/Infoblox compliance coverage (IDs 120050–120074)
- New groups covered: infoblox_threat, rpz_storm, dga_malware, dns_axfr,
  dns_nxdomain, dns_update_denied, dns_denied, dns_firewall,
  dhcp_flood, dhcp_conflict, dhcp_pool_exhausted, infoblox_audit
```

---

## PHASE 6 — FINAL VERIFICATION REPORT

```
════════════════════════════════════════════════════════════
  DNS Compliance Extension — Final Status Report
  Date: [DATE]
════════════════════════════════════════════════════════════

RULES ADDED
  File        : /var/ossec/etc/rules/1007-compliance-tags.xml
  New rules   : 17 (IDs 120050–120074)
  Total rules : 45 (was 28)
  XML valid   : [OK/FAIL]
  Restart     : [OK/FAIL]

DNS GROUP COVERAGE
  infoblox_threat (RPZ block)   → 120050  [PCI 11.4 / NIST SI.4]
  rpz_storm (infected host)     → 120051  [PCI 10.6 / NIST SI.3 / GDPR]
  dns_axfr (zone transfer)      → 120052  [PCI 11.4 / NIST SC.5]
  dga_malware (NXDOMAIN flood)  → 120053  [NIST SI.3 / GDPR]
  dns_nxdomain (single)         → 120054  [NIST SC.5]
  dns_update_denied (hijack)    → 120055  [PCI 6.6 / NIST SC.5]
  dns_denied (resolver)         → 120056  [NIST SC.5]
  dns_firewall (threat cat)     → 120057  [GDPR / HIPAA / TSC]

DHCP GROUP COVERAGE
  dhcp_flood (starvation)       → 120060  [NIST SC.5 / TSC CC7.1]
  dhcp_pool_exhausted           → 120061  [NIST SC.5 / TSC CC7.2]
  dhcp_conflict (IP spoof)      → 120062  [PCI 1.3 / NIST SC.5]

INFOBLOX AUDIT COVERAGE
  infoblox_audit+auth_failed    → 120070  [PCI 8.3 / NIST AC.3 / HIPAA]
  infoblox_audit+brute_force    → 120071  [PCI 8.3 / NIST AC.3 / TSC]
  infoblox_audit+auth_success   → 120072  [PCI 10.2 / NIST AU.14]
  dns_record_change             → 120073  [PCI 10.6 / NIST CM.7 / GDPR]
  infoblox_audit+config_change  → 120074  [NIST CM.7 / TSC CC8.1]

TEST RESULTS
  RPZ block test       → Rule 100430 + 120050  [OK/FAIL]
  AXFR denied test     → Rule 100402 + 120052  [OK/FAIL]
  Admin login fail     → Rule 100422 + 120070  [OK/FAIL]
  DNS record change    → Rule 100424 + 120073  [OK/FAIL]

DOCUMENTATION
  COMPLIANCE_DASHBOARD_COMPLETED.md : updated [OK/FAIL]
  README.md rule count updated      : [OK/FAIL]
  LIVE_SERVER_BASELINE updated      : [OK/FAIL]

OVERALL: ✅ ALL SOURCES NOW HAVE DNS COMPLIANCE COVERAGE
════════════════════════════════════════════════════════════
```
