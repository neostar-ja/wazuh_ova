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
