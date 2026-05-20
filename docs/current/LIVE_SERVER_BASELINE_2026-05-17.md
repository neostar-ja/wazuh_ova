# Live Server Baseline — 2026-05-17

This document summarizes what was verified directly from the live Wazuh environment on `2026-05-17`.

## Cluster Topology

| Node | IP | Verified Role | Version | Notes |
| --- | --- | --- | --- | --- |
| `wazuh-master` | `10.251.151.11` | `master` | Wazuh `4.14.5` | Holds current rules, decoders, master integrations |
| `wazuh-worker` | `10.251.151.12` | `worker` | Wazuh `4.14.5` | Receives syslog and runs Suricata |
| `node-1` | `10.251.151.13` | OpenSearch node | `7.10.2` | cluster `wazuh-cluster` |
| `wazuh-dashboard` | `10.251.151.14` | Dashboard | HTTP redirect to login | HTTPS `443` |

## OpenSearch / Dashboard

- `https://10.251.151.13:9200/` returned:
  - `cluster_name = wazuh-cluster`
  - `version.number = 7.10.2`
- `/_cluster/health` returned:
  - `status = yellow`
  - `number_of_nodes = 1`
  - `unassigned_shards = 1`
- `https://10.251.151.14/` returned HTTP `302` to `/app/login`

## Worker Runtime State

- `suricata -V` = `7.0.10`
- `systemctl is-active suricata` = `active`
- Worker `ossec.conf` contains live syslog listeners:
  - `secure tcp/1514`
  - `syslog udp/1514`
  - `syslog udp/514`
  - `syslog tcp/514`
- Worker `ossec.conf` contains localfile:

```xml
<localfile>
  <log_format>json</log_format>
  <location>/var/log/suricata/eve.json</location>
  <label key="@source">suricata</label>
</localfile>
```

- Worker Telegram integrations verified in `ossec.conf`:

```xml
<integration>
  <name>custom-telegram-anomaly.py</name>
  <rule_id>100101,100102,100103,100104,100105,100106,100107,100108</rule_id>
  <alert_format>json</alert_format>
</integration>

<integration>
  <name>custom-suricata-telegram</name>
  <level>12</level>
  <group>suricata,</group>
  <alert_format>json</alert_format>
</integration>

<integration>
  <name>custom-telegram.py</name>
  <level>12</level>
  <alert_format>json</alert_format>
</integration>
```

- Worker `custom-telegram.py`, `custom-suricata-telegram`, and `custom-telegram-anomaly.py` now enforce:
  - High: rule level `12-14`
  - Critical: rule level `15+`
- On the live worker, `custom-suricata-telegram` should reuse the existing Telegram `hook_url` and `api_key` from the `custom-telegram.py` integration block when dedicated env vars are absent
- Worker local Suricata rules currently use these live messages:
  - `LOCAL SSH brute force attempt`
  - `LOCAL Port scan detected - SYN flood`
- The repo's Suricata Wazuh mapping must accept those exact live strings; deterministic EVE injection is the reliable way to validate the Telegram path end-to-end
- Network-anomaly rules `100101-100108` remain level `7-8`, so they do not produce Telegram messages under the current policy

## Master Runtime State

Master `cluster_control -l` returned:

- `wazuh-master` → role `master`
- `wazuh-worker` → role `worker`

Master `wazuh-control status` showed the expected daemons running, including:

- `wazuh-analysisd`
- `wazuh-remoted`
- `wazuh-clusterd`
- `wazuh-integratord`
- `wazuh-apid`

Master `ossec.conf` contains these integration blocks:

```xml
<integration>
  <name>custom-telegram.py</name>
  <level>12</level>
  <alert_format>json</alert_format>
</integration>

<integration>
  <name>custom-otx</name>
  <group>huawei,mikrotik,fortigate,firewall_drop,firewall_traffic,</group>
  <level>12</level>
  <alert_format>json</alert_format>
</integration>

<integration>
  <name>custom-abuseipdb</name>
  <level>12</level>
  <alert_format>json</alert_format>
</integration>

<integration>
  <name>custom-suricata-telegram</name>
  <level>12</level>
  <group>suricata,</group>
  <alert_format>json</alert_format>
</integration>
```

Secrets and tokens were intentionally omitted from this repository.

## Verified Live Files

### Decoders on master

- `0100-huawei-ac-decoders.xml`
- `1001-mikrotik_decoders.xml`
- `1003-infoblox-decoders.xml`
- `1004-fortigate-wuh-decoders.xml`
- `local_decoder.xml`

### Rules on master

- `1000-huawei_rules.xml`
- `1001-mikrotik_rules.xml`
- `1002-huawei-ac-rules.xml`
- `1003-network-anomaly-rules.xml`
- `1004-infoblox-rules.xml`
- `1005-fortigate-wuh-rules.xml`
- `1006-suricata-ids-rules.xml`
- `local_abuseipdb_rules.xml`
- `local_rules.xml`

### Integrations on master

- `custom-abuseipdb.py`
- `custom-otx.py`
- `custom-telegram.py`
- `custom-suricata-telegram`

### Integrations on worker

- `custom-telegram-anomaly.py`
- `custom-telegram.py`
- `custom-suricata-telegram`

## Ownership / Permissions Observed

Examples captured from the live servers:

- Master decoders/rules:
  - `root:wazuh`, mode mostly `660`
- Master integrations:
  - `root:wazuh`, mode `750`
- Worker integrations:
  - `root:wazuh`, mode `750`
- Worker `ossec.conf`:
  - `root:wazuh`
- Worker Suricata config:
  - `/etc/suricata/suricata.yaml` owned by `root:root`

## Repo Sync Decisions

These repo changes were made to match the live environment:

- renamed `decoders/1001-huawei_decoders.xml` → `decoders/local_decoder.xml`
- renamed `rules/1001-huawei_rules.xml` → `rules/1000-huawei_rules.xml`
- added `rules/local_abuseipdb_rules.xml`
- split master and worker integration scripts into separate directories
- updated worker generic and Suricata Telegram thresholds in repo and live config to `level >= 12`
- aligned worker anomaly Telegram script to the same `12-14` High / `15+` Critical policy
- kept secrets redacted instead of committing live credentials

## Known Historical Drift

Historical documents in `docs/archive/` may still mention:

- manager operations on `10.251.151.13`
- old flat repo paths such as `/opt/code/wazuh_ova/*.py`
- pre-reorg dashboard locations
- older network-anomaly deployment assumptions

## GeoIP Enrichment (added 2026-05-18)

- **Status**: Active
- **Database**: MaxMind GeoLite2-City at `/etc/wazuh-indexer/ingest-geoip/GeoLite2-City-local.mmdb` (63MB)
- **Note on filename**: Named `GeoLite2-City-local.mmdb` — OpenSearch 2.19.5 reserves `GeoLite2-City.mmdb` for its internal auto-downloader; using the built-in name causes a startup crash
- **Pipeline**: `wazuh-geoip-pipeline` in OpenSearch ingest (3 processors: data.srcip, data.dstip, src_ip)
- **Mapping template**: `wazuh-alerts-custom-geoip` (priority 150) — geo_point + keyword fields
- **Default pipeline template**: `wazuh-alerts-default-pipeline` (priority 200)
- **Auto-update**: `/etc/cron.weekly/update-geoip` (weekly, sources MAXMIND_LICENSE_KEY from `/etc/wazuh-indexer/geoip.env`)
- **Key storage on Indexer**: `/etc/wazuh-indexer/geoip.env` (mode 600, root:root)
- **Fields enriched**: `GeoLocation.{country_name,city_name,region_name,location,ip}` and `DestLocation.*`
- **Coverage**: All new alerts with `data.srcip` (FortiGate, Huawei USG, MikroTik, Infoblox) or `src_ip` (Suricata)
- **OpenSearch bind address**: `10.251.151.13:9200` — not localhost; all API calls must use the IP

## Compliance Dashboard (added 2026-05-18)

- **Status**: Active
- **Frameworks**: PCI DSS 3.2.1, HIPAA, GDPR, NIST 800-53, TSC (SOC2)
- **Rules**: `1007-compliance-tags.xml` — 44 overlay rules, IDs 120001–120074 (live on Master 10.251.151.11 and Worker 10.251.151.12)
- **Trigger mechanism**: mixed overlay correlation using `<if_group>` and `<if_sid>`; DNS/Infoblox overlays added on `2026-05-18` use `if_sid` because this cluster did not fire same-event child rules reliably with `if_matched_group`
- **XML format**: compliance tags in `<group>` as `pci_dss_X.X,` (NOT standalone XML elements — Wazuh 4.14.5 limitation)
- **Dashboard**: `visualizations/compliance/compliance-overview-dashboard.ndjson` — 24 repo objects, 23 panels, ID: `wazuh-compliance-overview`
- **Generator**: `scripts/generate/generate_compliance_dashboard.py`
- **Validation**: `scripts/tests/test_compliance_dashboard.py`
- **Primary data source**: built-in Wazuh compliance fields `rule.pci_dss`, `rule.hipaa`, `rule.gdpr`, `rule.nist_800_53`, `rule.tsc`
- **Index-pattern note**: repo NDJSON excludes the shared `wazuh-alerts-*` saved object so imports do not overwrite live field metadata
- **Dashboard URL**: https://10.251.151.14 → Dashboard → Compliance Overview
- **Built-in module**: Dashboard → Modules → Regulatory Compliance (pre-existing)
- **Pre-existing compliance data**: PCI 3.7M, HIPAA 3.7M, GDPR 3.9M, NIST 3.7M, TSC 51K alerts (built-in rules)
- **DNS/Infoblox extension**: 16 additional overlay child rules were added on `2026-05-18`:
  - DNS / RPZ / DNS Firewall: `120050–120057`
  - DHCP: `120060–120062`
  - Infoblox audit / config: `120070–120074`
- **Live proof**: Tagged worker injections on `2026-05-18` produced `120050`, `120052`, `120070`, and `120073` alerts in OpenSearch with framework fields populated
- **Reload note**: Worker-side event paths required a `wazuh-worker` restart after cluster sync before the new overlay rules were applied in runtime

## Vulnerability Detection & SCA (added 2026-05-18)

- **Status**: ✅ Active on wazuh-master (10.251.151.11) and wazuh-worker (10.251.151.12)
- **Vulnerability Detection**: `<vulnerability-detection>` block in ossec.conf, feed-update-interval=60m, index-status=yes
- **SCA**: `<sca>` block with 3 CIS policies — CIS Amazon Linux 2, CIS AL2023, CIS Distro Independent Linux — interval=12h, scan_on_start=yes
- **Syscollector**: `<wodle name="syscollector">` packages=yes, os=yes, network=yes, interval=1h (was already enabled)
- **SCA policy files added**: `etc/shared/cis_amazon_linux_2.yml` + `etc/shared/sca_distro_independent_linux.yml` (copied from `ruleset/sca/*.yml.disabled`)
- **First scan**: 2026-05-18 08:47:55 UTC — completed in 20 seconds
- **SCA results (today)**: 740 checks on Wazuh nodes — 658 passed, 1,126 failed, 76 not applicable
- **SCA CIS tags**: 1,865 entries with `data.sca.check.compliance.cis` populated
- **CVE alerts**: 227 total in `wazuh-alerts-4.x-*` — Critical: 4, High: 100, Medium: 98, Low: 24
- **Worker ossec.conf fix**: merged duplicate `<ossec_config>` block (pre-existing issue from manual append)
- **Backups**: `/var/ossec/etc/ossec.conf.bak.20260518` on both Master and Worker
- **Doc**: `docs/current/VULN_SCA_SETUP.md`
- **Known issue**: `IndexerConnector` logs WARNING for index `wazuh-states-vulnerabilities-wazuh` (actual index is `wazuh-states-vulnerabilities-wazuh-server`) — pre-existing name mismatch, not introduced by this change

## Alert Tuning System (added 2026-05-19)

- **File on Master**: `/var/ossec/etc/rules/1008-alert-tuning.xml`
- **Local repo**: `rules/1008-alert-tuning.xml`
- **Load order**: After 1000-1007, `overwrite="yes"` rules apply last — verified by `ls /var/ossec/etc/rules/*.xml | sort`
- **Active tuning**:
  - Rule 120061 (DHCP pool exhausted): level **13 → 8** | Reason: infra noise, not attack | Review: 2026-08-19
- **Verification**: Wazuh API logtest confirmed level=8, `rule.nist_800_53: ['SC.5']`, `rule.tsc: ['CC7.2']`, `rule.groups` includes `tuned`
- **Telegram effect**: Rule 120061 no longer triggers Telegram (level 8 < threshold 12)
- **Format note**: Wazuh 4.14.5 requires compliance tags in `<group>` as `nist_800_53_SC.5,tsc_CC7.2,` — standalone XML elements cause parser error
- **Docs**: `docs/current/ALERT_TUNING_GUIDE.md` + `docs/current/ALERT_TUNING_QUICK_REF.md`
- **Dashboard filter**: `rule.groups: tuned` shows all tuned alerts

## Hardware Inventory Fix (added 2026-05-20)

- **Symptom**: Wazuh Dashboard → Endpoints page showed "Not enough hardware or operating system information" for all agents
- **Root cause**: Three compounding misconfigurations in `<indexer>` block of `/var/ossec/etc/ossec.conf` on both master and worker:
  1. `<host>` pointed to `https://127.0.0.1:9200` — no OpenSearch runs locally on those nodes (OpenSearch is on `10.251.151.13`)
  2. `<certificate>` used `/etc/filebeat/certs/wazuh-server.pem` — OpenSearch rejects this cert (TLS alert: certificate unknown)
  3. Wazuh keystore had no `indexer` credentials (`username`/`password`) configured
- **How we diagnosed**:
  - `wazuh-states-inventory-*` indices existed at `10.251.151.13:9200` but had `docs.count = 0`
  - Wazuh API (`/syscollector/{id}/hardware`) returned correct data (SQLite DB was fine)
  - `ossec.log` showed `IndexerConnector initialization failed for index 'wazuh-states-inventory-hardware-wazuh'` — retrying loop
  - `ss -tlnp | grep 9200` on master: nothing listening on port 9200
  - `curl --cert filebeat.pem https://10.251.151.13:9200/` → HTTP 401 (TLS ok); with `wazuh-server.pem` → TLS rejected
- **Fix applied on master (10.251.151.11) and worker (10.251.151.12)**:
  - `sed -i 's|https://127.0.0.1:9200|https://10.251.151.13:9200|g' /var/ossec/etc/ossec.conf`
  - `sed -i 's|wazuh-server.pem|filebeat.pem|g' /var/ossec/etc/ossec.conf`
  - `sed -i 's|wazuh-server-key.pem|filebeat-key.pem|g' /var/ossec/etc/ossec.conf`
  - `echo 'admin' | /var/ossec/bin/wazuh-keystore -f indexer -k username`
  - `echo 'admin' | /var/ossec/bin/wazuh-keystore -f indexer -k password`
  - `sudo /var/ossec/bin/wazuh-control restart` (both nodes)
- **Backups**: `/var/ossec/etc/ossec.conf.bak.20260520_*` on master and worker
- **Post-fix result**: `IndexerConnector initialized successfully` for all 14 inventory indices; `wazuh-states-inventory-hardware-wazuh` = 5 docs, `wazuh-states-vulnerabilities-wazuh` = 6,645 docs
- **Cleanup**: 14 orphaned empty `*-wazuh-server` indices deleted from OpenSearch (pre-created by Dashboard setup, never written to)
- **Correct `<indexer>` block** (both master and worker):
  ```xml
  <indexer>
    <enabled>yes</enabled>
    <hosts>
      <host>https://10.251.151.13:9200</host>
    </hosts>
    <ssl>
      <certificate_authorities>
        <ca>/etc/filebeat/certs/root-ca.pem</ca>
      </certificate_authorities>
      <certificate>/etc/filebeat/certs/filebeat.pem</certificate>
      <key>/etc/filebeat/certs/filebeat-key.pem</key>
    </ssl>
  </indexer>
  ```
- **Diagnostic script**: `scripts/maintenance/diagnose_hardware_inventory.sh`
- **Note on `wazuh-server.pem`**: This cert (dated 2026-04-16) is distinct from `filebeat.pem` (dated 2026-05-10). Only `filebeat.pem` is trusted by the OpenSearch security plugin. Do not use `wazuh-server.pem` for the `<indexer>` block.
