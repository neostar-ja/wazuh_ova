# Archive Notes

Files in this directory are preserved for audit trail and past troubleshooting context.

They are **not** the source of truth for the current repository or the live Wazuh cluster.

Common reasons archive files may differ from the current state:

- they reference the old flat repository layout
- they refer to historical deployment scripts now stored in `scripts/archive/`
- they may mention `10.251.151.13` as a manager target in old workflows
- they may describe legacy network anomaly active-response scripts that are not deployed now

For current state, start with:

- `README.md`
- `wazuh_ova.md`
- `docs/current/LIVE_SERVER_BASELINE_2026-05-17.md`
