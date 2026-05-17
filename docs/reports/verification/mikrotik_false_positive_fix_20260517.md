# MikroTik False Positive Fix - 2026-05-17

## Problem

- Telegram alerts appeared as:
  - Rule ID `101001`
  - Description: `MikroTik log:    by  from :`
- The underlying event was not MikroTik.
- The real source log was Huawei USG shell command activity such as:
  - `%%01SHELL/5/CMDRECORD(s)... Command="np-command by-string get fe tm backpressure"`

## Root Cause

- Decoder `mikrotik-log` in `decoders/1001-mikrotik_decoders.xml` had an overly broad prematch:
  - `(\S+) (\S+) (\S+) by`
- This allowed Huawei shell logs containing `by-string` / `by ...` patterns to be labeled as `mikrotik-log`.
- Once the decoder name was assigned, rule `101001` fired even though the MikroTik fields were empty.

## Fix

- Tightened the `mikrotik-log` prematch to require the real MikroTik Winbox marker:
  - `\bby tcp-msg\(winbox\):`

## Verification

Tested on the live worker with `wazuh-logtest`:

1. Huawei false-positive sample:
   - Result: `No decoder matched`
   - Result: rule `101001` no longer generated

2. Real MikroTik firewall sample:
   - Decoder: `mikrotik-firewall`
   - Rule: `101053`
   - Result: normal MikroTik parsing still works

## Files

- Decoder source: `decoders/1001-mikrotik_decoders.xml`
- Affected rule: `rules/1001-mikrotik_rules.xml`
