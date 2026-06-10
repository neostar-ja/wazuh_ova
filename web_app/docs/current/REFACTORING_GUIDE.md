# Log Search Page - Refactoring & Improvement Guide

**วันที่**: 2026-06-09  
**สถานะ**: Phase 1 - Component Architecture (กำลังดำเนินการ)

---

## 📋 Executive Summary

หน้า Search ปัจจุบันเป็นไฟล์เดียวขนาด 1422 บรรทัด ซึ่งทำให้บำรุงรักษาและปรับปรุงยากลำบาก เอกสารนี้ร่างไว้แนวทางการ refactor ให้เป็นโครงสร้าง component ที่ cleaner, maintainable และสอดคล้องกับ Design System ของโปรเจค

### ผลลัพธ์ที่คาดหวัง
- ✅ Modular component architecture
- ✅ 100% Design System compliance
- ✅ Full Dark/Light mode support
- ✅ Responsive design (360px-1920px)
- ✅ Enhanced UX (Saved searches, history, better mobile)
- ✅ Better maintainability & testability

---

## 🏗️ Architecture Overview

### ปัจจุบัน (Before)
```
src/components/search/
└── LogSearchPage.tsx (1422 lines - ทั้งหมดในไฟล์เดียว)
```

### เป้าหมาย (After)
```
src/components/search/
├── LogSearchPage.tsx (Main page - ~150 lines)
├── SearchHero.tsx ✅ (Search bar + quick filters)
├── AdvancedFilters.tsx ✅ (Collapsible filters)
├── SearchResultsCards.tsx ✅ (MetricCard, CoverageCard, DirectionPill, TopList)
├── SearchResultsTable.tsx ✅ (Results table component)
├── ActiveFiltersDisplay.tsx (Active filters chips)
├── SourceCoverage.tsx (Source coverage section)
├── PortListenersSection.tsx (Port listeners table)
├── TimelineChart.tsx (Timeline area chart)
├── BreakdownCharts.tsx (Action/Protocol breakdown)
├── SearchResultsGrid.tsx (Grid of top lists)
├── EmptyState.tsx (Empty state UI)
├── LoadingState.tsx (Loading skeleton)
├── ErrorState.tsx (Error handling)
├── searchTypes.ts ✅ (Types, constants, utilities)
├── searchUtils.ts (Additional utilities)
├── hooks/
│   └── useLogSearch.ts ✅ (Main state management hook)
└── __tests__/
    ├── SearchHero.test.tsx
    ├── useLogSearch.test.ts
    └── searchUtils.test.ts
```

---

## 📦 Created Components (✅ Completed)

### 1. `searchTypes.ts` ✅
**ไฟล์**: `/opt/code/wazuh_ova/web_app/frontend/src/components/search/searchTypes.ts`

**เนื้อหา**:
- Interfaces: `SearchFormState`, `SearchResponse`, `PortListenersResponse`, `SavedSearch`
- Constants: `DEFAULT_SEARCH_FORM`, `TIME_RANGES`, `QUICK_FILTERS`, `SOURCE_FAMILY_*`
- Utilities: `hasSearchCriteria()`, `buildRequestParams()`, `serializeParams()`, `deriveSourceFamily()` ฯลฯ

**ประโยชน์**: Single source of truth สำหรับทั้ง module

---

### 2. `SearchResultsCards.tsx` ✅
**ไฟล์**: `/opt/code/wazuh_ova/web_app/frontend/src/components/search/SearchResultsCards.tsx`

**Components**:
- `MetricCard` - KPI cards (Events, Matched Port, Unique IPs ฯลฯ)
- `CoverageCard` - Log source coverage indicators
- `DirectionPill` - Inbound/Outbound/Lateral indicators
- `TopList` - Top N items with bar visualization

**Usage**:
```typescript
import { MetricCard, CoverageCard, DirectionPill, TopList } from './SearchResultsCards'

<MetricCard label="Events" value={fmtN(total)} accent="#0FC4FF" />
<TopList title="Top Source IPs" items={topSrcIp} accent="#38BDF8" onSelect={handleSelect} />
```

---

### 3. `SearchHero.tsx` ✅
**ไฟล์**: `/opt/code/wazuh_ova/web_app/frontend/src/components/search/SearchHero.tsx`

**ความจุ**:
- Search input with suggestions
- Time range selector
- Quick filter chips
- Hunt checklist sidebar
- Source family chips

**Props**:
```typescript
interface SearchHeroProps {
  form: SearchFormState
  onFieldChange: (key, value) => void
  onSearch: () => void
  onApplyPatch: (patch, autoCommit?) => void
  canSearch: boolean
  isLoading: boolean
  suggestions: SearchSuggestion[]
  onSuggestionSelect: (suggestion) => void
}
```

---

### 4. `AdvancedFilters.tsx` ✅
**ไฟล์**: `/opt/code/wazuh_ova/web_app/frontend/src/components/search/AdvancedFilters.tsx`

**ความจุ**:
- Collapsible filters panel
- Grid layout (responsive)
- All structured filter fields
- Toggle button

**Fields**:
- Port, Src Port, Dst Port, Agent
- Src IP, Dst IP, Rule Group, Max Results
- Protocol, Direction, Action, Source Family

---

### 5. `useLogSearch.ts` ✅
**ไฟล์**: `/opt/code/wazuh_ova/web_app/frontend/src/components/search/hooks/useLogSearch.ts`

**ความจุ**:
- All search state management
- Query handling
- Suggestions with debounce
- Form state sync to URL
- API calls (flow + listeners)

**Return values**:
```typescript
{
  // Form state
  form, submitted, showAdvanced, suggestions, inputRef,
  
  // Query state
  flowQ, listenersQ, canSearch, matchedPort,
  
  // Data
  total, events, sourceFamilies, topLogSources, topActions,
  topProtocols, topCountries, topSrcIp, topDstIp, topAgents,
  timeline, activeChips,
  
  // Methods
  commitSearch, handleFieldChange, clearField, resetSearch,
  applyPatch, downloadResults
}
```

---

### 6. `SearchResultsTable.tsx` ✅
**ไฟล์**: `/opt/code/wazuh_ova/web_app/frontend/src/components/search/SearchResultsTable.tsx`

**ความจุ**:
- Sticky header table
- 10 columns with meaningful data
- Collapsible content
- Loading/empty states
- Responsive (future enhancement for mobile)

**Columns**:
- Time, Direction, Agent, Src, Dst, Proto, Action, Family, Log Source, Pivot

---

## 🚀 Next Steps to Complete Refactoring

### Phase 1: Core Components (Ongoing)

#### ✅ Done
- [x] `searchTypes.ts` - All types and utilities
- [x] `SearchResultsCards.tsx` - MetricCard, CoverageCard, DirectionPill, TopList
- [x] `SearchHero.tsx` - Main search interface
- [x] `AdvancedFilters.tsx` - Filter panel
- [x] `useLogSearch.ts` - State management hook
- [x] `SearchResultsTable.tsx` - Results table

#### 🔜 To Do (These components are straightforward to extract)
- [ ] `ActiveFiltersDisplay.tsx` - Active filter chips (5-10 lines)
- [ ] `SourceCoverage.tsx` - Coverage cards grid (20-30 lines)
- [ ] `PortListenersSection.tsx` - Port listeners collapsible section (50-80 lines)
- [ ] `TimelineChart.tsx` - Timeline area chart (40-60 lines)
- [ ] `BreakdownCharts.tsx` - Action/Protocol breakdown (80-100 lines)
- [ ] `SearchResultsGrid.tsx` - Grid of top lists (20-30 lines)
- [ ] `EmptyState.tsx` - Empty state UI (15-20 lines)
- [ ] `LoadingState.tsx` - Loading skeleton (20-30 lines)
- [ ] `ErrorState.tsx` - Error handling (15-20 lines)

### Phase 2: Main Page Refactoring
- [ ] Refactor `LogSearchPage.tsx` to use new components
- [ ] Move from 1422 lines → ~200 lines
- [ ] Implement proper styling with tokens
- [ ] Add PageShell wrapper

### Phase 3: Design System Alignment
- [ ] Replace all hardcoded colors with tokens from `ui/tokens.ts`
- [ ] Verify Dark/Light mode
- [ ] Test all spacing/padding consistency
- [ ] Update Typography sizes

### Phase 4: Responsive & Accessibility
- [ ] Test on 360px, 390px, 768px, 1024px, 1280px, 1440px, 1920px
- [ ] Mobile: Table → Cards conversion
- [ ] Mobile: Filter drawer for filters
- [ ] Add ARIA labels
- [ ] Keyboard navigation

### Phase 5: Feature Additions
- [ ] Saved Searches (localStorage initially)
- [ ] Search History
- [ ] Enhanced Export (CSV + custom columns)
- [ ] Query suggestions improvements

### Phase 6: Testing & Documentation
- [ ] Unit tests for components
- [ ] E2E tests
- [ ] LOG_SEARCH_PAGE_UI_UX.md
- [ ] JSDoc comments

---

## 🔧 How to Extract Remaining Components

### Example: ActiveFiltersDisplay.tsx

**Current code in LogSearchPage** (approx lines 645-665):
```typescript
{activeChips.length > 0 && (
  <Box sx={{ borderRadius: 4, p: 2, border: '1px solid rgba(15,196,255,0.12)', background: 'rgba(7,18,31,0.4)' }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
      <InfoOutlinedIcon sx={{ fontSize: 16, color: '#0FC4FF' }} />
      <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary' }}>
        ACTIVE FILTERS
      </Typography>
    </Stack>
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {activeChips.map((chip) => (
        <Chip
          key={`${chip.key}-${chip.label}`}
          label={chip.label}
          onDelete={() => clearField(chip.key)}
          sx={{ bgcolor: 'rgba(15,196,255,0.1)', border: '1px solid rgba(15,196,255,0.14)' }}
        />
      ))}
    </Stack>
  </Box>
)}
```

**Create file**: `src/components/search/ActiveFiltersDisplay.tsx`
```typescript
import { Box, Chip, Stack, Typography } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { SearchFormState } from './searchTypes'

interface ActiveFiltersDisplayProps {
  activeChips: Array<{ key: keyof SearchFormState; label: string }>
  onClearField: (key: keyof SearchFormState) => void
}

export function ActiveFiltersDisplay({ activeChips, onClearField }: ActiveFiltersDisplayProps) {
  if (!activeChips.length) return null
  
  return (
    <Box sx={{ borderRadius: 4, p: 2, border: '1px solid rgba(15,196,255,0.12)', background: 'rgba(7,18,31,0.4)' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: '#0FC4FF' }} />
        <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary' }}>
          ACTIVE FILTERS
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {activeChips.map((chip) => (
          <Chip
            key={`${chip.key}-${chip.label}`}
            label={chip.label}
            onDelete={() => onClearField(chip.key)}
            sx={{ bgcolor: 'rgba(15,196,255,0.1)', border: '1px solid rgba(15,196,255,0.14)' }}
          />
        ))}
      </Stack>
    </Box>
  )
}
```

**Pattern**: Extract, pass data as props, no side effects in component.

---

## 📝 Updated LogSearchPage Structure

Once all components are extracted, LogSearchPage should look like:

```typescript
import { useNavigate } from 'react-router-dom'
import { Box, Button, Stack, Alert } from '@mui/material'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'

import { PageShell } from '../ui/layout'
import { useLogSearch } from './hooks/useLogSearch'
import { SearchHero } from './SearchHero'
import { AdvancedFilters } from './AdvancedFilters'
import { ActiveFiltersDisplay } from './ActiveFiltersDisplay'
import { SearchMetricsGrid } from './SearchMetricsGrid'
import { SourceCoverage } from './SourceCoverage'
import { PivotActions } from './PivotActions'
import { TimelineChart } from './TimelineChart'
import { BreakdownCharts } from './BreakdownCharts'
import { SearchResultsGrid } from './SearchResultsGrid'
import { SearchResultsTable } from './SearchResultsTable'
import { PortListenersSection } from './PortListenersSection'
import { EmptyState } from './EmptyState'
import { LoadingState } from './LoadingState'
import { ErrorState } from './ErrorState'

export default function LogSearchPage() {
  const navigate = useNavigate()
  const search = useLogSearch()

  const actions = (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Button
        variant="outlined"
        size="small"
        startIcon={<RestartAltRoundedIcon />}
        onClick={search.resetSearch}
      >
        ล้างตัวกรอง
      </Button>
      <Button
        variant="contained"
        size="small"
        startIcon={<DownloadRoundedIcon />}
        disabled={!search.canSearch}
        onClick={search.downloadResults}
      >
        Export JSON
      </Button>
    </Stack>
  )

  return (
    <PageShell
      title="ค้นหา Log"
      subtitle="ค้นหาและวิเคราะห์เหตุการณ์จาก Wazuh, OpenSearch, Firewall, Syslog และแหล่งข้อมูลเครือข่ายจากจุดเดียว"
      variant="workbench"
      maxWidth="wide"
      actions={actions}
    >
      {/* Search Hero */}
      <SearchHero
        form={search.form}
        onFieldChange={search.handleFieldChange}
        onSearch={() => search.commitSearch(search.form)}
        onApplyPatch={search.applyPatch}
        canSearch={search.canSearch}
        isLoading={search.flowQ.isFetching}
        suggestions={search.suggestions}
        onSuggestionSelect={(s) => {
          search.setForm({ ...search.form, query: s.query })
          search.commitSearch({ ...search.form, query: s.query })
        }}
      />

      {/* Advanced Filters */}
      <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, pt: { xs: 2, md: 3 }, mb: 2.6 }}>
        <AdvancedFilters
          form={search.form}
          onFieldChange={search.handleFieldChange}
          showAdvanced={search.showAdvanced}
          onToggle={() => search.setShowAdvanced(!search.showAdvanced)}
        />
      </Box>

      {/* Empty State */}
      {!search.canSearch && <EmptyState />}

      {/* Results Section */}
      {search.canSearch && (
        <Stack spacing={2.5}>
          {/* Active Filters */}
          {search.activeChips.length > 0 && (
            <ActiveFiltersDisplay
              activeChips={search.activeChips}
              onClearField={search.clearField}
            />
          )}

          {/* Error State */}
          {search.flowQ.isError && (
            <ErrorState message="เกิดข้อผิดพลาดในการค้นหา" onRetry={() => search.flowQ.refetch()} />
          )}

          {/* Loading State */}
          {search.flowQ.isLoading && <LoadingState />}

          {/* Results */}
          {!search.flowQ.isLoading && !search.flowQ.isError && (
            <>
              <SearchMetricsGrid
                total={search.total}
                matchedPort={search.matchedPort}
                uniqueSrcIp={search.flowQ.data?.unique_srcip ?? 0}
                uniqueDstIp={search.flowQ.data?.unique_dstip ?? 0}
                uniqueAgent={search.flowQ.data?.unique_agent ?? 0}
                inboundCount={search.flowQ.data?.inbound_count ?? 0}
                outboundCount={search.flowQ.data?.outbound_count ?? 0}
              />

              <SourceCoverage
                sourceFamilies={search.sourceFamilies}
                matchedPort={search.matchedPort}
                listenersTotal={search.listenersQ.data?.total ?? 0}
              />

              <PivotActions
                topSrcIp={search.topSrcIp}
                topDstIp={search.topDstIp}
                matchedPort={search.matchedPort}
                onNavigate={(value) =>
                  navigate(`/investigate?q=${encodeURIComponent(value)}&range=${encodeURIComponent(search.submitted.timeRange)}`)
                }
                onApplyPatch={search.applyPatch}
              />

              <TimelineChart timeline={search.timeline} />

              <BreakdownCharts topActions={search.topActions} />

              <SearchResultsGrid
                topSrcIp={search.topSrcIp}
                topDstIp={search.topDstIp}
                topAgents={search.topAgents}
                topProtocols={search.topProtocols}
                topLogSources={search.topLogSources}
                topCountries={search.topCountries}
                onSelect={search.applyPatch}
              />

              <PortListenersSection
                matchedPort={search.matchedPort}
                listeners={search.listenersQ.data?.listeners ?? []}
                isLoading={search.listenersQ.isLoading}
              />

              <SearchResultsTable
                events={search.events}
                total={search.total}
                matchedPort={search.matchedPort}
                showEvents={search.showEvents}
                onToggle={() => search.setShowEvents(!search.showEvents)}
                onInvestigate={(value) =>
                  navigate(`/investigate?q=${encodeURIComponent(value)}&range=${encodeURIComponent(search.submitted.timeRange)}`)
                }
              />
            </>
          )}
        </Stack>
      )}
    </PageShell>
  )
}
```

---

## 🎨 Design System Token Usage

### Replace These Hardcoded Colors
```typescript
// OLD (Hardcoded)
bgcolor: 'rgba(15,196,255,0.14)'

// NEW (Using tokens)
import { BRAND } from '../ui/tokens'
bgcolor: `${BRAND.purple}18` // or use proper MUI theme.palette
```

### Color Reference
```typescript
// From src/components/ui/tokens.ts
BRAND.purple      = '#7B5BA4'
BRAND.purpleLight = '#9B7DC4'
BRAND.orange      = '#F17422'
BRAND.orangeLight = '#FF9642'

SEV_COLOR.critical = '#EF4444'  // Red
SEV_COLOR.high     = '#F17422'  // Orange
SEV_COLOR.medium   = '#EAB308'  // Yellow
SEV_COLOR.low      = '#22C55E'  // Green
SEV_COLOR.info     = '#38BDF8'  // Sky
```

---

## ✅ Checklist for Completion

### Code
- [ ] Extract all remaining components
- [ ] Refactor main LogSearchPage
- [ ] Replace hardcoded colors with tokens
- [ ] Update all imports
- [ ] Fix TypeScript errors
- [ ] Remove old code

### Testing
- [ ] Test search functionality
- [ ] Test Dark mode
- [ ] Test Light mode
- [ ] Test responsive (360px-1920px)
- [ ] Test all filters
- [ ] Test pagination
- [ ] Test export
- [ ] Test Investigate pivot

### Documentation
- [ ] Create LOG_SEARCH_PAGE_UI_UX.md
- [ ] Add JSDoc comments
- [ ] Document component props
- [ ] Create storybook stories (optional)

### Deployment
- [ ] Run TypeScript check
- [ ] Build frontend
- [ ] Test in staging
- [ ] Deploy

---

## 📚 Reference Files

- **Current Implementation**: `/opt/code/wazuh_ova/web_app/frontend/src/components/search/LogSearchPage.tsx`
- **Design System**: `/opt/code/wazuh_ova/web_app/DESIGN_SYSTEM.md`
- **Tokens**: `/opt/code/wazuh_ova/web_app/frontend/src/components/ui/tokens.ts`
- **Backend API**: `/opt/code/wazuh_ova/web_app/backend/app/routers/search.py`
- **API Service**: `/opt/code/wazuh_ova/web_app/frontend/src/services/api.ts`

---

## 🚦 Next Action

1. ✅ Review this document
2. ✅ Created components are ready to use
3. **Next**: Extract remaining components (ActiveFiltersDisplay, SourceCoverage, etc.)
4. **Then**: Refactor main LogSearchPage to use all components
5. **Finally**: Test, document, deploy

---

## 📞 Support & Questions

For questions about specific components or implementation details, refer to:
- Component implementation in the file header
- Props interface documentation
- Usage examples in this document
