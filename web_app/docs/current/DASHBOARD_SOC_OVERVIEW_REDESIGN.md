# SOC Dashboard (ภาพรวมระบบ) — Posture, Recommended Actions & Deep-Linking

**Route**: `/` (Dashboard)
**Main Component**: `src/components/dashboard/DashboardPage.tsx`
**Last Updated**: June 2026

---

## Purpose

The SOC Dashboard is the landing page for analysts and should answer 5 questions within 5–10 seconds:

1. **Is the system at risk right now?** → SOC Posture Banner
2. **How severe are current threats, and is the trend up or down?** → KPI Hero + timeline
3. **Where are attacks coming from?** → Top IPs / Countries / World Map
4. **Which hosts/agents are affected?** → Top Agents, Wazuh Agents panel
5. **What should I do next?** → Recommended Actions panel

Phase 1/2 of the SOC Center redesign already implemented rows 1–5 of the dashboard
(KPI Hero, Threat Summary, Severity Breakdown, Insight Cards, timelines, Top
IPs/Countries/Rules, MITRE, Cluster, Agents, World Map, Recent Alerts) using the v3
Indigo/Cyan brand tokens (`BRAND.primary = #4F6EF7`, `BRAND.accent = #22D3EE`). This
phase adds the two pieces that were still missing — **SOC Posture** and
**Recommended Next Actions** — and wires up deep-link navigation so that clicking
through from the Dashboard actually pre-filters the Alerts page.

---

## Current Implementation Summary

```
DashboardPage.tsx
├── SecurityPostureBanner   ← NEW: 4-level risk banner with reasons + integration health
├── MetricHero               ← Row 1: 5 KPI cards (Critical/High/Medium/Low/Total) + sparklines
├── Row 2 (ContentGrid)
│   ├── ThreatSummary         (Level 12+ counts, top IP, top rule)
│   ├── SeverityBreakdown      (donut)
│   └── InsightCards
├── Row 3 (ContentGrid)
│   └── Dual timeline (threat vs all-activity) + Log Source donut
├── Row 4 (ContentGrid)
│   ├── IPWithCountryBar       (Top Attacking IPs)
│   ├── CountriesPanel
│   ├── HBar (Threat Rules)
│   └── MitreTactics
├── Row 5 (ContentGrid)
│   ├── ClusterStatus           (Wazuh Cluster nodes)
│   ├── AgentsMini               (Wazuh Agents)
│   ├── WorldMap                  (attack source geo)
│   └── AlertFeed                  (recent Critical/High alerts)
└── RecommendedActionsPanel   ← NEW: ≤5 prioritized next-step cards
```

Rows 1–5 are unchanged from Phase 1/2. This document focuses on the two new
sections and the deep-link wiring.

---

## Data Sources / Endpoints

| Query key | Endpoint | Refresh | Used by |
|---|---|---|---|
| `dash-stats` | `GET /dashboard/stats?time_range=` | 30s (live) | KPI Hero, posture fallback |
| `dash-threat` | `GET /dashboard/threat_stats?time_range=` | 30s (live) | Threat Summary, posture, recommended actions |
| `dash-cluster` | `GET /dashboard/cluster` | 120s | Cluster Status, posture (`clusterDegraded`) |
| `dash-agents` | `GET /dashboard/agents` | 60s | Agents panel, posture (`disconnectedAgents`) |
| `dash-recent` | `GET /alerts?level=12&limit=30` | 30s (live) | Recent Alerts feed |
| `dash-integrations` | `GET /soar/integrations` | 60s | SOC Posture integration-health chips, Recommended Actions |

`dash-integrations` is a new, independent query — it does **not** block the
primary `dash-stats`/`dash-threat` queries (perf requirement: posture/KPIs must
render even if the SOAR integration check is slow or fails). It reuses the
existing `/soar/integrations` endpoint (alias of `/soar/health`,
`app/routers/soar.py:818`) — no backend changes were needed.

All queries pause when the page's Live/Paused toggle is set to **Paused**, and
`doRefresh()` invalidates all six query keys (including `dash-integrations`).

---

## SOC Posture Logic (`dashboardUtils.ts` → `computePosture`)

Inputs: `stats`, `threatStats`, `agentData`, `cluster`, `trend` (from
`calcTrend(allTl)`, already used by `MetricHero`).

Derived facts:
- `critical = threatStats.critical ?? stats.critical ?? 0`
- `high = threatStats.high ?? stats.high ?? 0`
- `disconnected = agentData.disconnected ?? 0`
- `topSourceIP`, `topRule` — from `threatStats.by_srcip[0]` / `by_rule[0]`,
  falling back to `stats`.
- `clusterDegraded` — true if any Wazuh cluster node's `status !== 'active'`.

Risk level (`RiskLevel = 'normal' | 'watch' | 'elevated' | 'critical'`):

| Level | Condition |
|---|---|
| **critical** | `critical >= 5` **or** ≥2 cluster nodes down |
| **elevated** | `critical > 0` **or** (trend ↑ **and** `high >= 5`) |
| **watch** | `high > 0` **or** cluster degraded (single node) |
| **normal** | none of the above |

`reasons: string[]` — up to 5 Thai sentences built only from non-zero facts
(e.g. "พบ Critical N รายการ", "IP ที่พบมากที่สุด: x.x.x.x (N ครั้ง)", "Agent
ขาดการเชื่อมต่อ N เครื่อง"). If nothing is wrong, a single "ไม่พบสิ่งผิดปกติ"
reason is shown.

`suggestedAction` — one fixed Thai sentence per risk level.

**Integration health is shown independently of the risk level.** If
`dash-integrations` is loading or failed, the banner shows a neutral
"ข้อมูล Integration ไม่ครบ" chip — it never implies "ปลอดภัย" (safe) based on
incomplete data.

---

## Recommended Actions Logic (`dashboardUtils.ts` → `computeRecommendedActions`)

Builds a candidate list (only when the underlying condition is true), each
item pointing at a route that already works today:

| Condition | Action | Route |
|---|---|---|
| `criticalCount > 0` | ตรวจสอบ Alerts ระดับ Critical | `/alerts?level=15` |
| `topSourceIP` set | Investigate IP `<ip>` | `/investigate?q=<ip>` |
| `disconnectedAgents > 0` | ตรวจสอบ Agent ที่ขาดการเชื่อมต่อ | `/assets` |
| `topRule` set | ตรวจสอบ Rule ที่พบบ่อยที่สุด | `/alerts?rule_id=<id>` |
| Shuffle integration `simulation_only` | ใช้ Simulate Block ก่อนดำเนินการจริง | `/soar` |
| Infoblox/Huawei NAC `not_configured` | เชื่อมต่อ DNS/DHCP/NAC เพื่อเพิ่ม context | `/admin` |

The list is sorted by severity (`critical → high → medium → info`) and capped
at **5** items. If the list is empty (normal posture, nothing to act on), the
panel shows an empty state instead.

---

## Component Structure

- **`SecurityPostureBanner.tsx`** — risk icon well, title/description, reason
  chips, integration-health mini chips (Wazuh, OpenSearch, IRIS, Shuffle, MISP,
  Infoblox, NAC), quick stats (critical/high counts, top IP), suggested-action
  line, and action buttons ("ดูการแจ้งเตือน" / "ตรวจสอบ IP"). Returns `null`
  while `dash-stats`/`dash-threat` are loading.
- **`RecommendedActionsPanel.tsx`** — `SectionCard` wrapping ≤5 clickable rows
  (left color bar by severity, icon, title, description, chevron). Each row is
  `role="button"`, `tabIndex={0}`, and activates on `Enter` for keyboard
  accessibility. Empty state shows a green check + "ไม่มีการดำเนินการที่ต้อง
  ทำเพิ่มเติมในขณะนี้".
- **`dashboardUtils.ts`** — pure functions `computePosture` and
  `computeRecommendedActions`, called via `useMemo` in `DashboardPage.tsx` so
  they only recompute when their inputs change.

---

## Navigation Map (Dashboard → other pages)

| Source | Target |
|---|---|
| KPI Hero cards (Critical/High/Medium/Low/Total) | `/alerts?level=15\|12\|7\|1` / `/alerts` |
| Posture Banner — "ดูการแจ้งเตือน" | `/alerts` |
| Posture Banner — "ตรวจสอบ IP" / top-IP label | `/investigate?q=<ip>` / `/alerts?srcip=<ip>` |
| Top Attacking IPs (Row 4) | `/investigate?q=<ip>` |
| Countries (Row 4) | `/alerts?country=<name>` |
| Threat Rules (Row 4) | `/alerts?rule_id=<id>` |
| Recommended Action: Critical alerts | `/alerts?level=15` |
| Recommended Action: Investigate top IP | `/investigate?q=<ip>` |
| Recommended Action: Disconnected agents | `/assets` |
| Recommended Action: Top rule | `/alerts?rule_id=<id>` |
| Recommended Action: Shuffle simulation | `/soar` |
| Recommended Action: Network integrations | `/admin` |

**AlertsPage deep-link support** — `AlertsPage.tsx` now reads `useSearchParams()`
once on mount and applies `level`, `rule_id`, `country`, `srcip`, `group`,
`source`, `agent`, and `q` to its existing filter state setters. This means
every link above lands on Alerts **pre-filtered**, instead of resetting to the
default High+ view. (`InvestigatePageV2` already read `?q=` correctly before
this change.)

---

## Responsive Behavior & Theming

- The Posture Banner and Recommended Actions panel reuse existing layout
  primitives (`PageShell`, `SectionCard`, `Chip`, `Box` flex/grid) and inherit
  the same responsive breakpoints as the rest of the dashboard — no new
  breakpoints were introduced.
- All colors come from `tokens.ts` (`SEV_COLOR`, `BRAND`, `getSoftBg`) and are
  theme-aware via `useTheme()` / `palette.mode`, matching Phase 1/2 dark and
  light mode support.

---

## Loading / Empty / Error States

- **Posture Banner**: renders `null` while `dash-stats`/`dash-threat` are
  loading (no skeleton — avoids layout jump before KPIs are ready).
- **Integration chips**: show "ข้อมูล Integration ไม่ครบ" while
  `dash-integrations` is loading or if it errors (capped `retry: 1`).
- **Recommended Actions**: empty state (green check) when the posture is
  normal and no candidate actions apply.

---

## Known Limitations

- In this environment, **Infoblox** and **Huawei NAC** are always
  `not_configured` (no credentials configured), so the corresponding
  Recommended Action ("เชื่อมต่อ DNS/DHCP/NAC") will typically always appear
  unless higher-severity actions fill all 5 slots first.
- `clusterDegraded` is derived from `/dashboard/cluster`, which can itself
  return `error: true` if the Wazuh API is unreachable — in that case
  `getClusterNodes()` returns an empty list and `clusterDegraded` is `false`
  (cluster health is simply not factored into posture, rather than assumed bad).

---

## Future Improvements

- Persist dismissed/acknowledged Recommended Actions per-analyst (currently
  recomputed on every refresh).
- Surface SLA/MTTR-based actions once `kpis.sla_compliance` /
  `avg_resolution_time` are populated from real data.
- Consider a dedicated `/dashboard/posture` backend endpoint if posture logic
  needs to be shared with non-web consumers (e.g. Slack/Line alerting bots).
