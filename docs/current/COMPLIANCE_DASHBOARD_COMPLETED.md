# Compliance Dashboard — Current State

**Verified on:** 2026-05-18  
**Dashboard ID:** `wazuh-compliance-overview`  
**Title:** `Compliance Overview — PCI DSS | HIPAA | GDPR | NIST 800-53 | TSC`

## What This Dashboard Uses

The Compliance Overview dashboard is built on the existing Wazuh compliance
fields already present in OpenSearch:

- `rule.pci_dss`
- `rule.hipaa`
- `rule.gdpr`
- `rule.nist_800_53`
- `rule.tsc`
- `rule.mitre.tactic`
- `rule.mitre.technique`
- `GeoLocation.country_name`

This is the primary data source. The custom overlay rule file
`rules/1007-compliance-tags.xml` is supplemental and is not required for the
main dashboard panels to populate.

## Repo Artifacts

- Generator: `scripts/generate/generate_compliance_dashboard.py`
- Saved objects: `visualizations/compliance/compliance-overview-dashboard.ndjson`
- Validation: `scripts/tests/test_compliance_dashboard.py`

The repo NDJSON intentionally excludes the shared `wazuh-alerts-*`
index-pattern saved object. This avoids overwriting live field metadata when
the dashboard is re-imported.

## Dashboard Scope

- Time range: `now-7d` to `now`
- Refresh: every 5 minutes
- Panels: `23`
  - `22` visualizations
  - `1` saved search / event table

### Panel Set

1. PCI DSS — Total Events
2. HIPAA — Total Events
3. GDPR — Total Events
4. NIST 800-53 — Total Events
5. TSC / SOC2 — Total Events
6. Compliance Events Over Time (All Frameworks)
7. PCI DSS — Events by Requirement
8. Top PCI DSS Requirements
9. Top NIST 800-53 Controls
10. Top GDPR Articles
11. Top HIPAA Controls
12. Top TSC / SOC2 Criteria
13. Events by Source Device
14. Attacker Countries (GeoIP)
15. MITRE ATT&CK — Top Tactics
16. MITRE ATT&CK — Top Techniques
17. Alert Severity Distribution
18. Events by Rule Group
19. Authentication Events Over Time
20. Top Source IPs — Auth Failures
21. PCI DSS Requirements — Tag Cloud
22. NIST 800-53 Events by Control
23. Compliance — Full Event Table

## Live Validation Results

`python3 scripts/tests/test_compliance_dashboard.py` passed against the live
cluster on 2026-05-18 and verified:

- the generated NDJSON contains `24` repo objects:
  - `22` visualizations
  - `1` saved search
  - `1` dashboard
- the live dashboard layout matches the repo layout exactly
- the live dashboard query set matches the generator query set exactly
- the live dashboard uses `now-7d` and contains `23` panels

### Compliance Field Counts Seen During One Validation Run

- `rule.pci_dss`: `3,705,052`
- `rule.hipaa`: `3,699,983`
- `rule.gdpr`: `3,865,481`
- `rule.nist_800_53`: `3,700,939`
- `rule.tsc`: `51,745`

These are point-in-time values and will continue to change as new alerts arrive.

### Top PCI DSS Requirements Seen During One Validation Run

- `10.6.1`: `3,651,347`
- `10.2.5`: `45,319`
- `10.2.2`: `3,652`

## Operational Notes

- Dashboard URL: `https://10.251.151.14/app/dashboards#/view/wazuh-compliance-overview`
- The dashboard depends on the existing live saved object `wazuh-alerts-*`
- Regeneration workflow:
  - `python3 scripts/generate/generate_compliance_dashboard.py`
  - `python3 scripts/tests/test_compliance_dashboard.py`

## Conclusion

The repo generator, saved-object artifact, live dashboard layout, and live data
queries are now aligned. The previous repo version that described an 18-panel
dashboard and relied on `rule.groups: "compliance"` as the base query is no
longer authoritative.
