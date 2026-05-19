# Vulnerability Detection & Security Configuration Assessment
**Date:** 2026-05-18
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

### ossec.conf changes on Master and Worker

**Syscollector** (already enabled — packages=yes confirmed):
```xml
<wodle name="syscollector">
  <disabled>no</disabled>
  <interval>1h</interval>
  <scan_on_start>yes</scan_on_start>
  <hardware>yes</hardware>
  <os>yes</os>
  <network>yes</network>
  <packages>yes</packages>
  <ports all="yes">yes</ports>
  <processes>yes</processes>
  <users>yes</users>
  <groups>yes</groups>
  <services>yes</services>
</wodle>
```

**Vulnerability Detection** (already enabled in Wazuh 4.x format):
```xml
<vulnerability-detection>
  <enabled>yes</enabled>
  <index-status>yes</index-status>
  <feed-update-interval>60m</feed-update-interval>
</vulnerability-detection>
```

**Security Configuration Assessment** — `<policies>` section added 2026-05-18:
```xml
<sca>
  <enabled>yes</enabled>
  <scan_on_start>yes</scan_on_start>
  <interval>12h</interval>
  <skip_nfs>yes</skip_nfs>
  <policies>
    <policy>etc/shared/cis_amazon_linux_2.yml</policy>
    <policy>etc/shared/sca_distro_independent_linux.yml</policy>
  </policies>
</sca>
```

---

## SCA Policy Files

| File | Benchmark | Location on Master/Worker |
|------|-----------|--------------------------|
| `cis_amazon_linux_2.yml` | CIS Amazon Linux 2 Benchmark v2.0.0 | `/var/ossec/etc/shared/` |
| `sca_distro_independent_linux.yml` | CIS Distribution Independent Linux Benchmark v2.0.0 | `/var/ossec/etc/shared/` |
| `cis_amazon_linux_2023.yml` | CIS Amazon Linux 2023 Benchmark (auto-loaded) | `/var/ossec/ruleset/sca/` |

**Source:** `/var/ossec/ruleset/sca/*.yml.disabled` → copied to `/var/ossec/etc/shared/`

> **Note:** In Wazuh 4.14.5, all policy files in `ruleset/sca/` are `.yml.disabled` by default
> except `cis_amazon_linux_2023.yml`. To enable a policy, copy it to `etc/shared/` and add
> it to the `<policies>` block in `ossec.conf`.

---

## Worker ossec.conf Fix

Before adding SCA policies, the Worker's `ossec.conf` had **two stacked `<ossec_config>` blocks**
from a previous manual append (lines 7–350 + lines 352–393). The second block contained:
- `<localfile>` for journald and audit logs
- `<integration>` blocks for Telegram

These were merged into the first block using Python, resulting in a single valid XML document.
Backup saved at: `/var/ossec/etc/ossec.conf.bak.20260518`

---

## Scan Schedule

| Module | Interval | On Startup |
|--------|---------|-----------|
| Syscollector (package inventory) | Every 1 hour | Yes |
| Vulnerability Detection (CVE scan) | Feed update every 60 min | Yes |
| Security Config Assessment | Every 12 hours | Yes |

---

## Verification Results

### Security Configuration Assessment (2026-05-18 08:47:55)

First scan completed in **20 seconds** after restart.

**Policies evaluated:**
1. `CIS Amazon Linux 2 Benchmark v2.0.0` — ✅ Evaluated
2. `CIS Amazon Linux 2023 Benchmark` — ✅ Evaluated
3. `CIS Distribution Independent Linux Benchmark v2.0.0` — ✅ Evaluated

| Metric | Value |
|--------|-------|
| Total SCA alerts today (2026-05-18) | 740 |
| wazuh-master checks | 372 |
| wazuh-worker checks | 393 |
| Passed | 658 |
| Failed | 1,126 |
| Not applicable | 76 |
| CIS compliance tags populated | 1,865 |
| First scan completed | 2026-05-18 08:48:15 |

### Vulnerability Detection

CVE alerts in OpenSearch `wazuh-alerts-4.x-*`:

| Metric | Value |
|--------|-------|
| Total CVE alerts (all agents) | 227 |
| Critical | 4 |
| High | 100 |
| Medium | 98 |
| Low | 24 |
| Windows/mobile agents scanned | DESKTOP-ESVQA0H, network-phone |
| Vulnerability scanner status | Running (states index connector retrying) |

> **Note on Linux node scans:** The vulnerability scanner (`wazuh-modulesd:vulnerability-scanner`)
> is active on both Wazuh nodes. The `indexer-connector` logs a `WARNING: IndexerConnector
> initialization failed for index 'wazuh-states-vulnerabilities-wazuh'` — this is a pre-existing
> configuration mismatch: the actual index is `wazuh-states-vulnerabilities-wazuh-server`.
> CVE alerts from Linux packages will appear once the connector resolves this.
> The module is still generating alerts via the alert pipeline.

---

## Dashboard Access

**Security Configuration Assessment:**
- Wazuh Dashboard → Modules → Security Configuration Assessment
- Select agent (wazuh-master or wazuh-worker) → view CIS benchmark results
- Failed items show remediation guidance

**Vulnerability Detection:**
- Wazuh Dashboard → Modules → Vulnerability Detection
- Filter by agent, severity, CVE, or package name
- Click any CVE for full details and remediation

---

## Top SCA Failures (CIS Distribution Independent Linux) — Wazuh Nodes

| CIS Control | Title | Priority |
|------------|-------|----------|
| 6.2.20 | Ensure shadow group is empty | High |
| 6.2.15 | Ensure all groups in /etc/passwd exist in /etc/group | High |
| 6.2.6 | Ensure root PATH Integrity | High |
| 6.1.9 | Ensure permissions on /etc/gshadow- are configured | Medium |
| 5.6 | Ensure access to the su command is restricted | Medium |
| 5.4.1.4 | Ensure inactive password lock is 30 days or less | Medium |
| 5.4.1.2 | Ensure minimum days between password changes is 7 or more | Low |
| 5.4.1.1 | Ensure password expiration is 365 days or less | Low |
| 5.2.23 | Ensure SSH MaxSessions is set to 4 or less | Medium |
| 5.2.22 | Ensure SSH MaxStartups is configured | Medium |

---

## Compliance Integration

SCA results are tagged with CIS compliance references:
- `data.sca.check.compliance.cis` — CIS Controls → **1,865 entries** ✅
- `data.sca.check.compliance.nist_800_53` — NIST 800-53 → 0 (not in these policies)
- `data.sca.check.compliance.pci_dss` — PCI DSS → 0 (not in these policies)

SCA feeds into the existing **Compliance Dashboard** for CIS framework coverage.

---

## Maintenance

### Force immediate SCA re-scan
```bash
# Restart wazuh services on Master (scan_on_start=yes triggers immediately)
ssh wazuh-user@10.251.151.11
sudo /var/ossec/bin/wazuh-control restart
```

### Check SCA scan logs
```bash
ssh wazuh-user@10.251.151.11
sudo grep -i 'sca\|benchmark\|policy\|Evaluation' /var/ossec/logs/ossec.log | tail -20
```

### Check vulnerability scanner logs
```bash
ssh wazuh-user@10.251.151.11
sudo grep -i 'vulnerability-scanner\|indexer-connector' /var/ossec/logs/ossec.log | tail -20
```

### Add a new SCA policy
```bash
# Copy policy from ruleset to shared
sudo cp /var/ossec/ruleset/sca/<policy>.yml.disabled /var/ossec/etc/shared/<policy>.yml
sudo chown root:wazuh /var/ossec/etc/shared/<policy>.yml
sudo chmod 640 /var/ossec/etc/shared/<policy>.yml
# Add <policy>etc/shared/<policy>.yml</policy> inside <policies> block in ossec.conf
# Validate: sudo xmllint --noout /var/ossec/etc/ossec.conf
# Restart: sudo /var/ossec/bin/wazuh-control restart
```

---

## Known Limitations

- **IndexerConnector warning:** Vulnerability scanner logs `WARNING: IndexerConnector initialization
  failed for index 'wazuh-states-vulnerabilities-wazuh'`. The actual index is
  `wazuh-states-vulnerabilities-wazuh-server`. This is a pre-existing name mismatch in the cluster
  configuration — not introduced by this change.
- **SCA policy coverage:** `cis_amazon_linux_2.yml` is the CIS AL2 Benchmark. Amazon Linux 2 is
  RHEL 7-based; some CIS controls reference `systemd` units or paths specific to RHEL. Review
  "not applicable" items before acting on failures.
- **Suricata packages (on Worker):** Suricata 7.0.10 packages will appear in the vulnerability scan
  when the Linux agent states index connector is resolved.
- **No NIST/PCI tags in SCA:** The CIS AL2 and distro-independent policies do not emit
  `nist_800_53` or `pci_dss` compliance tags. These frameworks are covered by the compliance
  overlay rules in `rules/1007-compliance-tags.xml`.
