# Wazuh OVA Repository

Authoritative baseline for the live Wazuh cluster verified on `2026-05-17`.

## Live Environment

| Component | Host | Status |
| --- | --- | --- |
| Master | `10.251.151.11` | Wazuh `4.14.5`, cluster role `master` |
| Worker | `10.251.151.12` | Wazuh `4.14.5`, cluster role `worker`, syslog `UDP/1514`, `UDP/514`, `TCP/514` |
| Indexer | `10.251.151.13` | OpenSearch `7.10.2`, cluster `wazuh-cluster` |
| Dashboard | `10.251.151.14` | Wazuh Dashboard HTTPS `443` |
| Suricata | `10.251.151.12` | `7.0.10`, service `active` |

OpenSearch health on `2026-05-17`: `yellow`, `1` unassigned shard.

## What Was Corrected

- Repo now matches the live Huawei USG filenames:
  - `decoders/local_decoder.xml`
  - `rules/1000-huawei_rules.xml`
- Added live rule file missing from Git:
  - `rules/local_abuseipdb_rules.xml`
- Split integrations by node:
  - `integrations/master/`
  - `integrations/worker/`
- Moved historical implementation reports out of the root into `docs/archive/`.
- Grouped deploy, generate, maintenance, analysis, and test scripts under `scripts/`.
- Grouped OpenSearch JSON artifacts under `data/opensearch/`.
- Grouped FortiGate dashboards under `visualizations/fortigate/`.

## Repository Layout

```text
wazuh_ova/
├── README.md
├── wazuh_ova.md
├── decoders/
├── rules/
├── lists/
├── integrations/
│   ├── master/
│   ├── worker/
│   └── archive/
├── scripts/
│   ├── deploy/
│   ├── generate/
│   ├── maintenance/
│   ├── analysis/
│   ├── tests/
│   ├── remote_execution/
│   └── archive/
├── visualizations/
│   ├── fortigate/        ← FortiGate dashboards
│   └── compliance/       ← Compliance dashboards (PCI/HIPAA/GDPR/NIST/TSC)
├── samples/
├── data/
└── docs/
    ├── current/
    ├── integrations/
    ├── reports/
    └── archive/
```

## Authoritative Files

### Master-managed Wazuh content

- `decoders/local_decoder.xml` — live Huawei USG decoder file
- `decoders/0100-huawei-ac-decoders.xml` — live Huawei AgileController decoder file
- `decoders/1001-mikrotik_decoders.xml`
- `decoders/1003-infoblox-decoders.xml`
- `decoders/1004-fortigate-wuh-decoders.xml`
- `rules/1000-huawei_rules.xml`
- `rules/1001-mikrotik_rules.xml`
- `rules/1002-huawei-ac-rules.xml`
- `rules/1003-network-anomaly-rules.xml`
- `rules/1004-infoblox-rules.xml`
- `rules/1005-fortigate-wuh-rules.xml`
- `rules/1006-suricata-ids-rules.xml`
- `rules/local_abuseipdb_rules.xml`
- `rules/local_rules.xml`
- `rules/1007-compliance-tags.xml` — compliance overlay rules (PCI DSS/HIPAA/GDPR/NIST 800-53/TSC), 44 rules total, IDs 120001–120074

### OpenSearch configuration (Indexer Node 10.251.151.13)

- **Ingest pipeline**: `wazuh-geoip-pipeline` — enriches `data.srcip` → `GeoLocation`, `data.dstip` → `DestLocation`, `src_ip` → `GeoLocation` (Suricata)
- **Index template**: `wazuh-alerts-custom-geoip` (priority 150) — geo_point + keyword mapping for GeoLocation/DestLocation
- **Index template**: `wazuh-alerts-default-pipeline` (priority 200) — sets `wazuh-geoip-pipeline` as default for all `wazuh-alerts-4.x-*` indexes
- **Setup script**: `scripts/deploy/setup_geoip_final.sh` (reads MAXMIND_LICENSE_KEY from env)
- **DB location**: `/etc/wazuh-indexer/ingest-geoip/GeoLite2-City-local.mmdb` (63MB, weekly auto-update)
- **DB filename note**: Must be `GeoLite2-City-local.mmdb` — OpenSearch 2.19.5 reserves `GeoLite2-City.mmdb` for internal use
- **Auto-update**: `/etc/cron.weekly/update-geoip` (sources key from `/etc/wazuh-indexer/geoip.env`)
- **Bind address**: OpenSearch binds to `10.251.151.13:9200` (not localhost) — use IP in all API calls
- **GeoIP dashboard index pattern**: `wazuh-alerts-geoip` excludes historical conflicting indexes `wazuh-alerts-4.x-2026.05.14-proper-timestamp` and `wazuh-alerts-4.x-2026.05.15` so `GeoLocation.location` remains usable as `geo_point` in Coordinate Map visualizations
- **MikroTik GeoIP map pattern**: `wazuh-mikrotik-geoip-clean` excludes `wazuh-alerts-4.x-2026.05.13`, `wazuh-alerts-4.x-2026.05.14-proper-timestamp`, and `wazuh-alerts-4.x-2026.05.15` so both `GeoLocation.location` and `DestLocation.location` remain usable as `geo_point` in MikroTik source/destination map panels

### Compliance Dashboard

- **Dashboard**: `visualizations/compliance/compliance-overview-dashboard.ndjson` — 23 panels (22 visualizations + 1 saved search), 5 frameworks
- **Generator**: `scripts/generate/generate_compliance_dashboard.py` — regenerates the repo artifact to match the live dashboard
- **Validation**: `scripts/tests/test_compliance_dashboard.py` — validates the generated NDJSON and the live dashboard via Saved Objects + OpenSearch APIs
- **Dashboard ID**: `wazuh-compliance-overview` — https://10.251.151.14 → Dashboard → Compliance Overview
- **Frameworks**: PCI DSS 3.2.1, HIPAA, GDPR, NIST 800-53, TSC (SOC2)
- **Data source**: built-in Wazuh compliance fields `rule.pci_dss`, `rule.hipaa`, `rule.gdpr`, `rule.nist_800_53`, `rule.tsc`
- **Import note**: repo NDJSON intentionally excludes the shared `wazuh-alerts-*` index-pattern saved object to avoid overwriting live field metadata
- **DNS/Infoblox overlay**: `rules/1007-compliance-tags.xml` now includes 16 DNS/Infoblox overlay child rules:
  - `120050–120057` DNS / RPZ / DNS Firewall
  - `120060–120062` DHCP
  - `120070–120074` Infoblox audit / config change
- **Implementation note**: On Wazuh `4.14.5`, compliance values must be embedded in `<group>` as `pci_dss_*`, `nist_800_53_*`, `hipaa_*`, `gdpr_*`, `tsc_*`; standalone XML elements like `<pci_dss>` are not accepted by the parser
- **Live validation**: `wazuh-logtest` passed for RPZ block, AXFR denied, Infoblox admin login failure, and DNS record change; tagged live injections on `wazuh-worker` produced rule IDs `120050`, `120052`, `120070`, and `120073` in OpenSearch on `2026-05-18`

### Node-specific integrations

- `integrations/master/custom-abuseipdb.py`
- `integrations/master/custom-otx.py`
- `integrations/master/custom-telegram.py`
- `integrations/worker/custom-telegram-anomaly.py`
- `integrations/worker/custom-suricata-telegram`
- `integrations/worker/custom-telegram.py`

Repo copies redact live secrets intentionally. Behavior and thresholds were synced from the live servers; credentials and tokens were not committed.

## Telegram Alert Policy

- Generic Wazuh Telegram alerts send only:
  - High: rule level `12-14`
  - Critical: rule level `15+`
- Worker Suricata Telegram follows the same threshold: `12+`
- Worker `custom-suricata-telegram` reuses the live Telegram `hook_url` and `api_key` from the worker's `custom-telegram.py` integration block when no dedicated env vars are present
- Worker Suricata local-signature mapping accepts the live worker messages:
  - `LOCAL SSH brute force attempt` → Wazuh rule `200021` → `level 12`
  - `LOCAL Port scan detected - SYN flood` → Wazuh rule `200020` → `level 10`
- `scripts/tests/ssh_bruteforce_test.sh` now defaults to deterministic EVE JSON injection (`inject`) because the older network-only SSH simulation is not reliable for triggering the worker's local Suricata SYN-threshold rule in the current environment
- Worker network-anomaly Telegram script also enforces `12+`
- Current network-anomaly rules `100101-100108` are still level `7-8`, so they are suppressed by Telegram until those rule levels are raised
- CDB source-IP rule logic:
  - `100300` stays `level 10` by default, so generic Telegram suppresses it
  - `100303` keeps matched source-IP deny/block/drop/reset/close events at `level 10`

### Alert Tuning System (added 2026-05-19)

- `rules/1008-alert-tuning.xml` — Alert level overrides with full audit trail
  - Load order: after all 1000-1007 files; `overwrite="yes"` takes effect last
  - Active tuning: Rule 120061 (DHCP pool exhausted) level 13 → level 8, review 2026-08-19
  - Full guide: `docs/current/ALERT_TUNING_GUIDE.md`
  - Quick ref: `docs/current/ALERT_TUNING_QUICK_REF.md`
  - **Rule format note (Wazuh 4.14.5):** compliance tags must be in `<group>` as `nist_800_53_SC.5,` — standalone elements `<nist_800_53>` cause parser error

### Modules Enabled (ossec.conf on Master + Worker — added 2026-05-18)

- **Syscollector**: package/OS/network/process inventory — every 1h
- **Vulnerability Detection**: CVE scan via NVD feed update every 60 min, `<index-status>yes</index-status>`
- **Security Config Assessment**: 3 CIS policies — CIS Amazon Linux 2 + CIS AL2023 + CIS Distro Independent Linux — every 12h, on startup
- **SCA policy files**: `etc/shared/cis_amazon_linux_2.yml` + `etc/shared/sca_distro_independent_linux.yml`
- **Doc**: `docs/current/VULN_SCA_SETUP.md`

## Current Documentation

- `wazuh_ova.md` — Thai project index
- `docs/current/LIVE_SERVER_BASELINE_2026-05-17.md` — verified live cluster inventory
- `docs/current/REPO_LAYOUT.md` — how the reorganized repo is structured
- `docs/current/VULN_SCA_SETUP.md` — Vulnerability Detection & SCA setup (2026-05-18)
- `docs/current/ALERT_TUNING_GUIDE.md` — Alert Tuning System operational guide (2026-05-19)
- `docs/current/ALERT_TUNING_QUICK_REF.md` — Alert Tuning quick reference card
- `docs/integrations/` — vendor-specific deployment and operation guides

## Historical Material

Everything under `docs/archive/` is retained for traceability only. Those files may contain older assumptions such as:

- manager/indexer confusion around `10.251.151.13`
- outdated deployment paths from the old flat repo layout
- legacy network-anomaly active-response workflow that is not deployed on the live servers as of `2026-05-17`
