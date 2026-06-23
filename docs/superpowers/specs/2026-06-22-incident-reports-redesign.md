# Incident Reports Redesign

Date: 2026-06-22
Scope: `/reports/incidents` in the SOC Center web app.

## Goal

Redesign the incident reports page into a read-only operational report that matches the rest of the SOC Center interface and lets analysts inspect row-level details without leaving the page.

## Current State

The page currently renders a plain DataGrid with time range, quick search, Excel export, and CSV export. The backend already provides high and critical Wazuh alerts, best-effort IRIS case mapping, and summarized actions from tasks, activity logs, and Shuffle history.

## Data The Page Should Communicate

The page should help an analyst answer these questions quickly:

- How many high and critical incidents occurred in the selected time range.
- Which alerts are already linked to IRIS cases and which have no case.
- Whether response activity exists for linked cases.
- Which sources, agents, rules, source IPs, and countries appear most often.
- What evidence supports an incident row: timestamp, level, rule, description, source, agent, network fields, case status, actions, and raw alert context.

## Recommended Design

Use an operations report layout:

- Page header with Thai-first report title, concise subtitle, live status, time range selector, refresh, Excel export, and CSV export.
- Metric strip summarizing total incidents, critical, high, linked cases, no-case alerts, and action coverage.
- Insight panels for case coverage, top sources, top rules or top source IPs, and response readiness.
- Read-only incident table with severity badges, source chips, case status chips, concise action previews, and quick filter.
- Detail drawer opened by clicking a row. The drawer is read-only and shows alert details, IRIS case match, response actions, entity context, and raw alert summary.

## Interaction Model

- Changing time range reloads report data.
- Refresh reloads the current report.
- Export buttons download the current time range in Excel or CSV.
- Clicking a row opens the detail drawer.
- Closing the drawer returns the analyst to the same table state.
- The table remains read-only; no mutation actions are exposed.

## Frontend Architecture

Keep the implementation in `IncidentReportsPage.tsx` unless the file becomes hard to scan. Use existing primitives:

- `PageShell` for page framing.
- `SectionCard` for report panels.
- `MetricCard` for summary metrics.
- MUI DataGrid for the main report table.
- MUI Drawer for row details.
- Existing shared tokens for severity and surface colors.

Compute report summaries on the frontend from the existing API response to avoid backend churn. Add small helper functions in the same file for normalization, summary calculations, action parsing, and display labels.

## Backend Scope

No backend change is required for the first implementation. The current API response already contains the fields needed for the report:

- `timestamp`
- `level`
- `rule_id`
- `description`
- `source`
- `srcip`
- `country`
- `agent`
- `case_info`
- `actions_taken`
- `raw_alert`

If later accuracy is needed, the backend can return structured case metadata instead of only `case_info` and `actions_taken`, but that is outside this change.

## States

- Loading: show skeletons in summary and table.
- Empty: show a report-specific empty state with the selected time range.
- Error: show a clear error panel and keep controls visible.
- Exporting: disable export buttons and show progress in the clicked button.

## Testing And Verification

Use the existing frontend toolchain:

- Type-check/build the frontend.
- Verify the page renders and compiles.
- If a dev server is practical, inspect `/reports/incidents` manually.

No new backend behavior is introduced, so backend tests are not required for this change.

## Non-Goals

- No edit/create/close case actions.
- No changes to IRIS matching logic.
- No new API contract unless existing fields are insufficient.
- No navigation away from the report on row click.
