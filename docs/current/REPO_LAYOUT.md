# Repository Layout

## Purpose

The repo was reorganized to separate:

- authoritative live configuration
- deployment and generator scripts
- node-specific integrations
- historical reports
- raw OpenSearch artifacts

## Main Directories

### `decoders/`

Current custom decoders. `local_decoder.xml` is the live Huawei USG decoder name used on the master node.

### `rules/`

Current Wazuh rules. `1000-huawei_rules.xml` and `local_abuseipdb_rules.xml` were aligned to the live server state.

### `lists/`

Shared CDB and whitelist resources.

### `integrations/`

- `master/` holds scripts verified on `10.251.151.11`
- `worker/` holds scripts verified on `10.251.151.12`
- `archive/` holds non-live or superseded variants

### `scripts/`

- `deploy/` current deployment workflows
- `generate/` dashboard generators
- `maintenance/` fix/reindex/dashboard maintenance utilities
- `analysis/` helper scripts for sample generation and log analysis
- `tests/` validation and test tooling
- `remote_execution/` repo discovery helpers
- `archive/` scripts retained only for historical traceability

### `visualizations/`

Saved-object exports (`.ndjson`) ready for Wazuh Dashboard import. FortiGate dashboards live under `visualizations/fortigate/`.

### `data/`

- `opensearch/` mappings, templates, legacy payloads
- `reference/` sample JSON and one-off extracted reports

### `docs/`

- `current/` authoritative docs
- `integrations/` vendor-specific guides
- `reports/` verification reports worth keeping
- `archive/` superseded reports and old implementation notes
