# IRIS Alert Context Enrichment Design

Date: 2026-06-17
Project: `/opt/code/wazuh_ova/web_app`
Scope: SOAR > IRIS > Alert detail drawer

## Goal

Replace the current partial IRIS alert detail view with a complete, real-data workbench that:

- shows the full IRIS alert payload that is already available from the IRIS API
- enriches the alert with Wazuh/OpenSearch context derived from `alert_source_link`
- falls back to deterministic correlation when the source link cannot be resolved directly
- never hardcodes fake incident data when source context is missing

## Current Problem

The frontend alert drawer currently calls `/soar/iris/alerts/{id}` and renders only a small subset of the returned IRIS fields. The backend route proxies `IRIS /alerts/filter?alert_id={id}` and returns the raw list-shaped response without enrichment.

As a result:

- important IRIS fields are hidden even though they are present in the payload
- the drawer does not show the originating Wazuh event context behind `alert_source_link`
- operators must leave the SOC app to understand the real triggering event
- missing source context is currently indistinguishable from incomplete implementation

## Selected Approach

Implement enrichment in the backend route `GET /soar/iris/alerts/{id}` and return a normalized response that combines:

1. the real IRIS alert object
2. source-link correlation metadata
3. Wazuh/OpenSearch event context

This keeps correlation logic server-side, reuses existing OpenSearch service functions, avoids duplicating matching logic in React, and gives the UI one stable contract.

## Non-Goals

- no scraping or iframe embedding of the Wazuh web UI
- no mutation of IRIS or Wazuh data during enrichment
- no synthetic placeholder case, IOC, or event content
- no redesign of the alerts table outside what is required to consume the enriched detail endpoint

## Data Sources

### IRIS

Primary source: `IRIS /alerts/filter?alert_id={id}`

Fields already observed in the live payload and expected to be surfaced:

- `alert_id`
- `alert_uuid`
- `alert_title`
- `alert_description`
- `alert_source`
- `alert_source_ref`
- `alert_source_link`
- `alert_source_content`
- `alert_source_event_time`
- `alert_creation_time`
- `alert_severity_id`
- `alert_status_id`
- `alert_note`
- `alert_tags`
- `alert_context`
- `alert_owner_id`
- `alert_customer_id`
- `alert_classification_id`
- `alert_resolution_status_id`
- `severity`
- `status`
- `customer`
- `classification`
- `owner`
- `resolution_status`
- `iocs`
- `assets`
- `cases`
- `comments`
- `modification_history`

### Wazuh / OpenSearch

Correlation target: the original event represented by the IRIS alert.

Candidate fields to surface from the matched Wazuh event:

- `@timestamp`
- `rule.id`
- `rule.level`
- `rule.description`
- `rule.groups`
- `rule.mitre`
- `agent.id`
- `agent.name`
- `agent.ip`
- `decoder.name`
- `predecoder.program_name`
- `location`
- `data.srcip`
- `data.dstip`
- `data.src_port`
- `data.dstport`
- `data.protocol`
- `full_log`
- full raw event payload for expandable JSON view

## Backend API Contract

`GET /soar/iris/alerts/{id}` will return:

```json
{
  "status": "success",
  "data": {
    "alert": {},
    "source_context": {
      "status": "matched",
      "source_type": "wazuh",
      "match_strategy": "direct_link",
      "source_url": "https://...",
      "source_ref": "100300",
      "event_time": "2026-06-17T01:22:49.939000",
      "notes": []
    },
    "wazuh_context": {
      "primary_event": {},
      "related_events": [],
      "summary": {
        "agent_name": "wazuh-worker",
        "rule_id": "100300",
        "rule_level": 10,
        "srcip": "80.82.77.202",
        "dstip": null,
        "decoder": null,
        "groups": ["threat_intel", "cdb_intel"],
        "mitre": {
          "tactic": [],
          "technique": []
        }
      }
    }
  }
}
```

If IRIS returns no alert, the route should preserve the failure semantics from the upstream response rather than inventing a local success shape.

## Correlation Strategy

### 1. Resolve from source link

If `alert_source_link` exists and points to the local Wazuh deployment domain, attempt direct extraction first.

Direct extraction should parse any usable identifiers from the URL, including:

- query parameters
- dashboard hash fragments
- saved-search style paths if present

If the link contains a resolvable event identifier, use that first.

### 2. Fallback correlation

If the direct link is absent or cannot be resolved, use deterministic correlation with a narrow event window around `alert_source_event_time`.

Fallback signals, in descending preference:

1. `alert_source_ref` mapped to `rule.id`
2. first IOC value mapped to `srcip` or `dstip`
3. `alert_title` and `alert_description` fragments if needed for tie-breaking
4. `alert_source_event_time` as the primary time anchor

Primary fallback strategies:

- `rule_ioc_time`
- `rule_time`
- `ioc_time`

### 3. Candidate scoring

When multiple OpenSearch events match, score them by:

- exact rule id match
- exact IOC match in source or destination fields
- closest timestamp distance to `alert_source_event_time`
- description similarity as a final tiebreaker

Return the highest-scoring event as `primary_event` and the next few close candidates as `related_events`.

## Source Context Status Model

`source_context.status` values:

- `matched`: primary Wazuh event found confidently
- `partial`: candidate events found but confidence is weak or link parsing failed
- `not_found`: no matching Wazuh event found
- `unsupported`: source link exists but does not target a supported source system
- `error`: OpenSearch lookup failed unexpectedly

`source_context.notes` contains operator-readable diagnostics, for example:

- source link not parseable
- Wazuh domain mismatch
- OpenSearch query failed
- no events found in correlation window

## Frontend Behavior

The drawer should render even when enrichment is incomplete.

### Sections

1. Header
   - alert title
   - alert id
   - alert UUID
   - severity, status, owner

2. IRIS alert details
   - source, source ref, source link, customer, timestamps
   - classification, resolution status
   - tags, note, comments count, assets count, cases count

3. Source context
   - correlation status badge
   - match strategy
   - source URL open action
   - notes from correlation

4. Wazuh event context
   - rule id, rule description, level
   - agent, decoder/program, location
   - src/dst IP and protocol/ports when present
   - visible groups and MITRE data
   - full log preview
   - expandable raw JSON

5. Related events
   - small list of nearby correlated Wazuh events with timestamp, rule, level, agent, srcip, dstip

6. IOC section
   - real IOC details from IRIS including type, description, TLP if present

7. History section
   - modification history rendered as audit entries

### Empty and degraded states

- If IRIS alert loads but Wazuh context is missing, show the IRIS alert normally with a `context unavailable` badge.
- If source link is unsupported, show `unsupported source` with no fake Wazuh block.
- If OpenSearch lookup errors, show a non-blocking warning card and keep the rest of the drawer usable.

## Implementation Plan Shape

### Backend

- add helper(s) in `soar_svc.py` or `soar.py` to normalize the IRIS alert detail object from the list-shaped IRIS response
- add helper(s) to parse and classify `alert_source_link`
- add helper(s) to query OpenSearch for candidate events in a narrow window
- add helper(s) to score candidates and build the `source_context` and `wazuh_context` payload
- update `/soar/iris/alerts/{id}` to return the enriched response

### Frontend

- extend the `soarApi` TypeScript types for the enriched alert response
- update `AlertDetailDrawer.tsx` to consume `data.alert`, `data.source_context`, and `data.wazuh_context`
- replace any static or misleading blocks with real source-context rendering
- preserve existing alert update and escalate actions

## Testing Strategy

### Backend tests

- normalize IRIS detail from the list-shaped response
- source link classified as supported Wazuh URL
- fallback correlation chooses the best event by rule, IOC, and time
- unsupported source link returns `unsupported`
- no candidate events returns `not_found`
- OpenSearch exception returns `error` without failing the whole route

### Frontend tests

- drawer renders full IRIS details from the enriched payload
- drawer renders matched Wazuh context
- drawer renders partial/not_found/unsupported states correctly
- drawer does not crash when `wazuh_context.primary_event` is missing

## Risks and Constraints

- `alert_source_link` may not contain a stable event identifier
- OpenSearch data may be rolled over or delayed relative to IRIS event creation
- multiple Wazuh events can legitimately match the same rule and IOC in the same minute
- the repo currently has unrelated work in progress, so changes must stay narrowly scoped

## Acceptance Criteria

- clicking an IRIS alert in the SOAR tab opens a drawer showing real IRIS alert data, not partial placeholders
- the drawer surfaces `alert_source_link` and Wazuh context derived from that source when available
- the backend returns explicit enrichment state instead of silent absence
- missing source context never results in fabricated incident details
- existing alert update and escalation flows still work
