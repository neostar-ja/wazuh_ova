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
- Worker network-anomaly Telegram script also enforces `12+`
- Current network-anomaly rules `100101-100108` are still level `7-8`, so they are suppressed by Telegram until those rule levels are raised
- CDB source-IP rule logic:
  - `100300` stays `level 10` by default, so generic Telegram suppresses it
  - `100303` keeps matched source-IP deny/block/drop/reset/close events at `level 10`

## Current Documentation

- `wazuh_ova.md` — Thai project index
- `docs/current/LIVE_SERVER_BASELINE_2026-05-17.md` — verified live cluster inventory
- `docs/current/REPO_LAYOUT.md` — how the reorganized repo is structured
- `docs/integrations/` — vendor-specific deployment and operation guides

## Historical Material

Everything under `docs/archive/` is retained for traceability only. Those files may contain older assumptions such as:

- manager/indexer confusion around `10.251.151.13`
- outdated deployment paths from the old flat repo layout
- legacy network-anomaly active-response workflow that is not deployed on the live servers as of `2026-05-17`
