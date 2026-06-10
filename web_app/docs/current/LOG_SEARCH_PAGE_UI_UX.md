# Log Search Page — UI/UX Design & Implementation

**Route**: `/search`  
**Main Component**: `src/components/search/LogSearchPage.tsx`  
**Last Updated**: June 2026

---

## Overview

The Log Search page provides a **unified search interface** for querying network events across all log sources: Wazuh agents, Firewall, IDS/Suricata, DNS, DHCP, and NAC.

The page follows the **SOC Center Design System** — purple/orange brand tokens (`BRAND.purple = #7B5BA4`, `BRAND.orange = #F17422`), `IBM Plex Sans Thai` typography, `SectionCard` layout pattern, and full Dark/Light mode support.

---

## Component Architecture

```
LogSearchPage.tsx           ← Route entry, orchestrates all
├── SearchHero.tsx          ← Search bar + time range + quick presets + source chips
├── AdvancedFilters.tsx     ← Collapsible panel: Network + Context structured filters
├── ActiveFiltersDisplay.tsx ← Active filter chips (existing, unchanged)
├── SearchMetricsGrid.tsx   ← KPI metrics: Events, IPs, Agents, Inbound, Outbound
├── SourceCoverage.tsx      ← Log source family coverage cards
├── PivotActions.tsx        ← Quick pivots to Investigate (existing, unchanged)
├── TimelineChart.tsx       ← Area chart: events over time
├── BreakdownCharts.tsx     ← Bar (actions) + Pie (protocols) charts
├── SearchResultsGrid.tsx   ← TopList grid: IPs, Agents, Protocols, Sources, Countries
├── PortListenersSection.tsx ← Port listener info (existing, unchanged)
├── SearchResultsTable.tsx  ← Event table with click-to-detail
├── EmptyState.tsx          ← Shown when no search is active
├── LoadingState.tsx        ← Loading skeleton (existing, unchanged)
├── ErrorState.tsx          ← Error with retry (existing, unchanged)
└── LogDetailDrawer.tsx     ← NEW: Right-side drawer for event details
```

### Supporting Files
- `hooks/useLogSearch.ts` — state machine (URL sync, TanStack Query, debounce)
- `searchTypes.ts` — types, utility functions, metadata
- `SearchResultsCards.tsx` — shared primitives: CoverageCard, DirectionPill, TopList

---

## Design System Integration

### Colors
| Usage | Token | Value |
|---|---|---|
| Primary accent (search btn, metrics, timeline) | `BRAND.purple` | `#7B5BA4` |
| Secondary accent (export, source coverage) | `BRAND.orange` | `#F17422` |
| Critical severity | `SEV_COLOR.critical` | `#EF4444` |
| Low/OK | `SEV_COLOR.low` | `#22C55E` |
| Card backgrounds | `theme.palette.background.paper` | adaptive |

### Typography
- **Body**: IBM Plex Sans Thai (400, 500, 700)
- **Monospace fields** (IP, timestamp, rule ID): `"IBM Plex Mono", monospace`
- **Labels/Titles**: fontWeight 800-900, letterSpacing for uppercase

### Card Pattern
All sections use `SectionCard` from `ui/SectionCard.tsx`:
- `title`, `subtitle`, `icon`, `iconColor`, `accent`
- `noPad` for tables (no inner padding, border handles it)
- `size="md"` for content sections

---

## SearchHero

**File**: `SearchHero.tsx`

### Features
| Feature | Details |
|---|---|
| Search input | IBM Plex Mono, "/" keyboard shortcut to focus |
| Clear button | Appears when query is not empty |
| Time range | MUI TextField select with MenuItem (1h, 6h, 24h, 7d, 30d, 90d) |
| Search button | BRAND.purple filled, disabled during loading |
| Recent searches | localStorage soc-search-history, max 10, shown on focus |
| Quick presets | 8 hunt presets (SSH, RDP, Failed Login, Firewall Deny, DNS, Firewall, IDS) |
| Source family chips | Filter by: firewall, ids, wazuh, dns, dhcp, nac |
| Theme | Gradient top-border (purple to orange), Dark/Light card bg |

### Recent Search History
- localStorage key: `soc-search-history`
- Max 10 entries, shown as dropdown when input is focused
- Clear individual entries or clear all

---

## SearchMetricsGrid

**File**: `SearchMetricsGrid.tsx`

Uses the shared `MetricCard` from `ui/MetricCard.tsx`:

| Metric | Color | Icon |
|---|---|---|
| Total Events | `BRAND.purple` | SearchRoundedIcon |
| Matched Port | `BRAND.orange` | RouterRoundedIcon |
| Unique Src IPs | `SEV_COLOR.high` | PublicRoundedIcon |
| Unique Dst IPs | `BRAND.purpleLight` | DeviceHubRoundedIcon |
| Unique Agents | `#38BDF8` | DesktopWindowsRoundedIcon |
| Inbound | `SEV_COLOR.critical` | SouthWestRoundedIcon |
| Outbound | `SEV_COLOR.low` | NorthEastRoundedIcon |

---

## TimelineChart

**File**: `TimelineChart.tsx`

- Uses SectionCard with TimelineRoundedIcon
- Area chart with BRAND.purple gradient fill (opacity 0.35 to 0)
- recharts AreaChart with ResponsiveContainer
- Height: 260px (desktop), 180px (mobile)
- Tooltip: theme-conditional (dark/light styles)

---

## BreakdownCharts

**File**: `BreakdownCharts.tsx`

- Uses SectionCard with DonutSmallRoundedIcon, BRAND.orange accent
- Actions Bar Chart: action-semantic colors (allow=green, deny/drop/block=red, forward=blue, else purple)
- Protocol Pie Chart: uses PIE_COLORS from tokens
- Both: recharts with theme-conditional tooltip

---

## LogDetailDrawer

**File**: `LogDetailDrawer.tsx` (NEW)

### Opening
- Click any row in SearchResultsTable → onRowClick(event) → sets selectedEvent in hook → open={true}
- Close: X button, Escape key, backdrop click

### Header
- Level badge (color from sevColor(level), label from sevLabel(level))
- Rule ID chip
- Source family chip
- Rule description
- Timestamp
- Agent indicator
- MITRE ATT&CK tags (tactic=red, technique=purple)

### Tab 0: รายละเอียด
- Src to Dst: IP blocks with port chips and "Investigate" buttons
  - Src IP block: red accent, opens /investigate?q=IP
  - Dst IP block: purple accent, opens /investigate?q=IP
  - Protocol chip, action chip (color-coded), direction chip
- Rule Context: Rule ID, level, description, decoder, location, groups
- Agent / Host: name, ID, IP
- GeoIP: country, city, ASN, AS org
- Compliance: PCI-DSS, HIPAA, NIST, GDPR tags
- Actions: Navigate to Investigate, IOC, Download JSON

### Tab 1: Raw Log / JSON
- full_log in scrollable pre with copy button
- Full event JSON in pre with copy + download buttons
- No external JSON viewer library — uses plain pre (safe, no innerHTML)

### Navigation Actions
| Action | Target Route |
|---|---|
| Investigate Src IP | /investigate?q=srcip |
| Investigate Dst IP | /investigate?q=dstip |
| Check IOC | /ioc?q=srcip |
| Download JSON | Downloads log-event-timestamp.json |

---

## AdvancedFilters

**File**: `AdvancedFilters.tsx`

Organized into two sections with visual divider:
- Network: Port, Src Port, Dst Port, Src IP, Dst IP, Protocol
- Context: Agent/Host, Rule Group, Direction, Action, Source Family, Max Results

All TextField select use MenuItem (MUI-correct, not option element).

---

## EmptyState

**File**: `EmptyState.tsx`

- Centered layout with ManageSearchRoundedIcon in BRAND.purple square
- 5 quick tip boxes in responsive grid (example queries with descriptions)
- "เปิดตัวกรองขั้นสูง" button triggers advanced filters
- Theme-aware background (dark glass / light white)

---

## State Management

### useLogSearch Hook
**File**: `hooks/useLogSearch.ts`

New state additions:
- `showEvents: boolean` — toggle events table visibility (default: true)
- `selectedEvent: any | null` — event selected for detail drawer
- `setShowEvents(v: boolean)` — setter
- `setSelectedEvent(event: any | null)` — setter

All existing state preserved: form, submitted, showAdvanced, suggestions, flowQ, listenersQ, plus computed values.

---

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| xs (< 600px) | Single column, stacked search bar, mobile drawer width 95vw |
| sm (600-900px) | 2-col metrics, 2-col grid lists |
| md (900-1200px) | 4-col metrics, 2-col breakdown charts |
| lg (>= 1200px) | Full 6-7 col metrics, 3-col grid lists |

Drawer: min(760px, 95vw) — works on all screen sizes.

---

## Accessibility

- All IconButton elements have aria-label
- All TextField select use inputProps['aria-label']
- Keyboard shortcut: "/" focuses search input
- Escape closes drawer
- Focus ring via *:focus-visible in index.css
- Reduced motion via CSS media query in index.css
