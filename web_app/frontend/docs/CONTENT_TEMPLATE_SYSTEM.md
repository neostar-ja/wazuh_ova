# Content Template System — SOC Center

Enterprise UI template system for all content pages.  
All components live under `src/components/ui/layout/`.

---

## Quick Start

```tsx
import { PageShell, ContentGrid, MetricGrid } from '../ui/layout'
import { SectionCard } from '../ui/SectionCard'

export default function MyPage() {
  return (
    <PageShell
      title="Threat Alerts"
      subtitle="Monitor and investigate security alerts from Wazuh"
      status="live"
      variant="console"
      actions={<Button>Refresh</Button>}
    >
      <MetricGrid cols={4}>
        <MetricCard title="Total" value={1234} color="#7B5BA4" />
        <MetricCard title="Critical" value={7}  color="#EF4444" />
        <MetricCard title="High"     value={42} color="#F17422" />
        <MetricCard title="Medium"   value={89} color="#EAB308" />
      </MetricGrid>

      <ContentGrid columns={2} gap="md">
        <SectionCard title="Chart A">…</SectionCard>
        <SectionCard title="Chart B">…</SectionCard>
      </ContentGrid>
    </PageShell>
  )
}
```

---

## Components

### `PageShell`

Universal content-area wrapper. **Use this on every page.**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | — | Page title in header |
| `subtitle` | string | — | Subtitle / description |
| `breadcrumbs` | `PageBreadcrumb[]` | — | Breadcrumb trail |
| `actions` | ReactNode | — | Right-side header controls |
| `status` | `'live'\|'paused'\|'offline'\|'ready'\|'warning'\|'error'` | — | Status badge |
| `statusLabel` | string | — | Override default status text |
| `lastUpdated` | string | — | "Updated X ago" text |
| `maxWidth` | `'full'\|'wide'\|'content'\|number` | `'full'` | Content column width |
| `density` | `'comfortable'\|'compact'` | `'comfortable'` | Spacing density |
| `variant` | `PageVariant` | `'default'` | Layout hint (see below) |
| `loading` | boolean | false | Show full-page skeleton |
| `error` | ReactNode | — | Replace body with error panel |
| `empty` | ReactNode | — | Replace body with empty state |

#### Page Variants

| Variant | Use on | Layout hints |
|---------|--------|-------------|
| `default` | Any generic page | Neutral tint |
| `dashboard` | Dashboard / overview | Purple-tinted bg |
| `workbench` | Investigate / search | Blue-tinted bg |
| `console` | Alerts / event list | Red-tinted bg |
| `report` | Compliance / audit | Green-tinted bg |
| `management` | Admin / settings | Grey-tinted bg |

---

### `ContentGrid`

Responsive CSS-grid container.

```tsx
// Fixed 3-column grid
<ContentGrid columns={3} gap="md">
  <SectionCard title="A" />
  <SectionCard title="B" />
  <SectionCard title="C" />
</ContentGrid>

// Auto-fit (fills width, wraps naturally)
<ContentGrid variant="auto-fit" minCardWidth={280}>
  {cards}
</ContentGrid>

// 12-column dashboard grid (use Tailwind col-span on children)
<ContentGrid variant="dashboard" gap="md">
  <Box className="col-span-12 lg:col-span-8">…</Box>
  <Box className="col-span-12 lg:col-span-4">…</Box>
</ContentGrid>
```

| Prop | Type | Default |
|------|------|---------|
| `columns` | `1\|2\|3\|4\|6\|12` | `1` |
| `gap` | `'xs'\|'sm'\|'md'\|'lg'` | `'md'` |
| `minCardWidth` | number (px) | `260` |
| `variant` | `'fixed'\|'auto-fit'\|'dashboard'` | `'fixed'` |
| `align` | `'stretch'\|'start'\|'center'` | `'stretch'` |

**Responsive column breakpoints (fixed mode):**

| `columns` | xs | sm | md | lg |
|-----------|----|----|----|----|
| 1 | 1 | 1 | 1 | 1 |
| 2 | 1 | 2 | 2 | 2 |
| 3 | 1 | 2 | 3 | 3 |
| 4 | 1 | 2 | 2 | 4 |
| 6 | 1 | 2 | 3 | 6 |

---

### `MetricGrid`

Responsive container for metric/stat cards.

```tsx
<MetricGrid cols={5}>
  <MetricCard title="Total Alerts" value={stats.total} color="#7B5BA4" />
  <MetricCard title="Critical"     value={stats.critical} color="#EF4444" />
  <MetricCard title="High"         value={stats.high}     color="#F17422" />
  <MetricCard title="Medium"       value={stats.medium}   color="#EAB308" />
  <MetricCard title="Low"          value={stats.low}      color="#22C55E" />
</MetricGrid>
```

| `cols` | xs | sm | lg |
|--------|----|----|-----|
| 2 | 2 | 2 | 2 |
| 3 | 2 | 3 | 3 |
| 4 | 2 | 2 | 4 |
| 5 | 2 | 3 | 5 |
| 6 | 2 | 3 | 6 |

---

### `PageSection`

Lightweight section heading inside a page (lighter than SectionCard — no card frame).

```tsx
<PageSection
  title="Summary"
  subtitle="Last 24 hours"
  actions={<RefreshButton />}
  divider
>
  …content…
</PageSection>
```

Use when grouping blocks without a card container — e.g. a group of MetricCards under a heading.

---

### `SectionCard` (enhanced)

Standard card container. Now supports:

```tsx
<SectionCard
  title="Alert Timeline"
  subtitle="Events per hour"
  icon={<TimelineIcon />}
  accent="#EF4444"
  variant="glass"      // 'default'|'glass'|'flat'|'elevated'
  size="md"            // 'sm'|'md'|'lg'
  density="compact"    // 'comfortable'|'compact'
  toolbar={<FilterBar />}   // below header, above body
  footer={<PaginationRow />}
  bodyScroll           // overflow-auto on body
  noPad                // remove body padding (for tables/maps)
>
  <MyChart />
</SectionCard>
```

#### `variant` visual guide

| Variant | Background | Border | Shadow | Use for |
|---------|-----------|--------|--------|---------|
| `default` | Semi-transparent | Yes | Medium | General cards |
| `glass` | More transparent, heavier blur | Yes | Strong | Featured/hero cards |
| `flat` | Solid, no blur | Subtle | None | Dense data panels |
| `elevated` | Opaque | None | Strong | Dialogs, popovers |

---

### State Components

```tsx
import { LoadingState, EmptyStateNew, ErrorStateNew, NotConfiguredState, PermissionState, OfflineState } from '../ui/layout'

// Inside a card body:
{loading && <LoadingState type="table" rows={6} />}
{error   && <ErrorStateNew retry={refetch} />}
{empty   && <EmptyStateNew title="No alerts found" description="ลองเปลี่ยนช่วงเวลา…" />}

// LoadingState types
<LoadingState type="page"  />  // full-page skeleton
<LoadingState type="card"  />  // lines skeleton
<LoadingState type="table" rows={5} />  // table rows skeleton
<LoadingState type="chart" height={240} />  // rect skeleton
<LoadingState type="list"  rows={6} />  // avatar + text list
```

---

## Responsive Design Rules

| Screen | Padding | Gap | Grid |
|--------|---------|-----|------|
| Mobile (xs) | 16px | 12px | 1 col |
| Tablet (sm) | 20px | 16px | 2 col |
| Desktop (md+) | 28px | 20px | 3–4 col |
| Large (xl) | 32px | 24px | 4–12 col |

- Tables: wrap in `overflow-auto` container, or use `noPad + bodyScroll` on SectionCard
- Charts: always use `ResponsiveContainer` from recharts
- Content max-width: `1600px` default (PageShell `maxWidth="wide"`)

---

## Dark / Light Mode

All components automatically switch via `theme.palette.mode`.

| Element | Dark | Light |
|---------|------|-------|
| Page bg | `#080612 → #110D1E` | `#F5F3FF` |
| Card bg | `rgba(22,17,42,0.85)` | `rgba(255,255,255,0.95)` |
| Card border | `rgba(123,91,164,0.22)` | `rgba(123,91,164,0.14)` |
| Section label | 50% opacity purple | 55% opacity purple |
| Body text | `rgba(237,233,250,0.9)` | `#1A1033` |
| Muted text | `rgba(237,233,250,0.38)` | `rgba(26,16,51,0.45)` |

---

## Page Variant Reference

### Dashboard Variant
```
PageShell variant="dashboard"
  SecurityPostureBanner
  SystemHealthStrip
  MetricGrid cols=5        ← hero metrics
  ContentGrid dashboard    ← severity + insights
  ContentGrid dashboard    ← timeline + sources
  ContentGrid dashboard    ← geo + rules + mitre + agents
  ContentGrid dashboard    ← map + top-IPs + recent alerts
```

### Console Variant (Alerts page)
```
PageShell variant="console"
  DataToolbar              ← search + filters + actions
  MetricGrid cols=4        ← summary counts
  SectionCard noPad        ← data table with StickyHeader
  Drawer                   ← detail side-panel
```

### Workbench Variant (Investigate page)
```
PageShell variant="workbench"
  SearchHero               ← big search bar
  EntityProfileCard        ← entity summary
  Tabs                     ← Timeline | Events | Network | …
  ContentGrid columns=2    ← evidence panels
```

### Report Variant (Compliance page)
```
PageShell variant="report"
  ScoreBanner              ← compliance score
  ContentGrid auto-fit     ← framework cards
  SectionCard              ← evidence list
  SectionCard              ← remediation actions
```

### Management Variant (Admin page)
```
PageShell variant="management"
  PageSection divider      ← section groups
  SectionCard flat         ← settings tables
  SectionCard flat         ← user management
```

---

## Migration Checklist

- [ ] Wrap each page in `<PageShell>` and move `<PageHeader>` props into it
- [ ] Replace raw `div.grid.grid-cols-*` with `<ContentGrid>`
- [ ] Replace ad-hoc metric rows with `<MetricGrid>`
- [ ] Replace inline loading skeletons with `<LoadingState type="…">`
- [ ] Replace inline empty boxes with `<EmptyStateNew>`
- [ ] Add `variant`, `toolbar`, `footer` to SectionCards where needed
- [ ] Run `npm run typecheck && npm run build`
