/**
 * Log Search Page - Refactored Main Component
 * Orchestrates all search-related child components
 * Design System: purple/orange brand tokens, PageShell, SectionCard pattern
 */

import { useNavigate } from 'react-router-dom'
import { Box, Button, Stack, Tooltip, IconButton } from '@mui/material'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { BRAND, LAYOUT_GAP } from '../ui/tokens'

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
import { PortListenersSection } from './PortListenersSection'
import { SearchResultsTable } from './SearchResultsTable'
import { EmptyState } from './EmptyState'
import { LoadingState } from './LoadingState'
import { ErrorState } from './ErrorState'
import { LogDetailDrawer } from './LogDetailDrawer'

export default function LogSearchPage() {
  const navigate = useNavigate()
  const search = useLogSearch()

  const hasResults = !search.flowQ.isLoading && !search.flowQ.isError && search.canSearch

  // Header Actions
  const actions = (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
      <Tooltip title="รีเฟรชผลลัพธ์">
        <span>
          <IconButton
            size="small"
            onClick={() => search.flowQ.refetch()}
            disabled={!search.canSearch || search.flowQ.isFetching}
            aria-label="Refresh results"
            sx={{
              color: BRAND.purple,
              bgcolor: `${BRAND.purple}10`,
              borderRadius: '10px',
              border: `1px solid ${BRAND.purple}25`,
              '&:hover': { bgcolor: `${BRAND.purple}18` },
            }}
          >
            <RefreshRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Button
        variant="outlined"
        size="small"
        startIcon={<RestartAltRoundedIcon />}
        onClick={search.resetSearch}
        disabled={!search.canSearch}
        sx={{
          borderColor: `${BRAND.purple}30`,
          color: BRAND.purple,
          '&:hover': { borderColor: BRAND.purple, bgcolor: `${BRAND.purple}08` },
          borderRadius: '10px',
        }}
      >
        ล้างตัวกรอง
      </Button>
      <Button
        variant="contained"
        size="small"
        startIcon={<DownloadRoundedIcon />}
        disabled={!search.canSearch || !hasResults}
        onClick={search.downloadResults}
        sx={{
          bgcolor: BRAND.orange,
          boxShadow: `0 4px 12px ${BRAND.orange}35`,
          borderRadius: '10px',
          '&:hover': { bgcolor: BRAND.orangeDark },
        }}
      >
        Export JSON
      </Button>
    </Stack>
  )

  // Common SearchHero + Advanced Filters block (shared in both states)
  const searchInput = (
    <>
      <SearchHero
        form={search.form}
        onFieldChange={search.handleFieldChange}
        onSearch={() => search.commitSearch(search.form)}
        onApplyPatch={search.applyPatch}
        canSearch={search.canSearch}
        isLoading={search.flowQ.isFetching}
        suggestions={search.suggestions}
        onSuggestionSelect={(s) => {
          const next = { ...search.form, query: s.query }
          search.setForm(next)
          search.commitSearch(next)
        }}
      />
      <Box sx={{ mt: LAYOUT_GAP.section }}>
        <AdvancedFilters
          form={search.form}
          onFieldChange={search.handleFieldChange}
          showAdvanced={search.showAdvanced}
          onToggle={() => search.setShowAdvanced(!search.showAdvanced)}
        />
      </Box>
    </>
  )

  // Empty state (no search submitted yet)
  if (!search.canSearch) {
    return (
      <PageShell
        title="ค้นหา Log"
        subtitle="ค้นหาและวิเคราะห์เหตุการณ์จาก Wazuh, Firewall, IDS, DNS, DHCP และ NAC จากจุดเดียว"
        variant="workbench"
        maxWidth="wide"
        actions={actions}
      >
        {searchInput}
        <Box sx={{ mt: LAYOUT_GAP.section }}>
          <EmptyState onOpenAdvanced={() => search.setShowAdvanced(true)} />
        </Box>
      </PageShell>
    )
  }

  // Main page with results
  return (
    <PageShell
      title="ค้นหา Log"
      subtitle="ค้นหาและวิเคราะห์เหตุการณ์จาก Wazuh, Firewall, IDS, DNS, DHCP และ NAC จากจุดเดียว"
      variant="workbench"
      maxWidth="wide"
      status={hasResults ? 'live' : undefined}
      actions={actions}
    >
      {/* Search Hero + Advanced Filters */}
      {searchInput}

      {/* Main Results Section */}
      <Stack spacing={LAYOUT_GAP.section} sx={{ mt: LAYOUT_GAP.section }}>
        {/* Active Filters Display */}
        {search.activeChips.length > 0 && (
          <ActiveFiltersDisplay
            activeChips={search.activeChips}
            onClearField={search.clearField}
          />
        )}

        {/* Error State */}
        {search.flowQ.isError && (
          <ErrorState
            message="เกิดข้อผิดพลาดในการค้นหา"
            onRetry={() => search.flowQ.refetch()}
          />
        )}

        {/* Loading State */}
        {search.flowQ.isLoading && <LoadingState />}

        {/* Results */}
        {!search.flowQ.isLoading && !search.flowQ.isError && (
          <>
            {/* Metrics Grid */}
            <SearchMetricsGrid
              total={search.total}
              matchedPort={search.matchedPort}
              uniqueSrcIp={search.flowQ.data?.unique_srcip ?? 0}
              uniqueDstIp={search.flowQ.data?.unique_dstip ?? 0}
              uniqueAgent={search.flowQ.data?.unique_agent ?? 0}
              inboundCount={search.flowQ.data?.inbound_count ?? 0}
              outboundCount={search.flowQ.data?.outbound_count ?? 0}
            />

            {/* Source Coverage */}
            <SourceCoverage
              sourceFamilies={search.sourceFamilies}
              matchedPort={search.matchedPort}
              listenersTotal={search.listenersQ.data?.total ?? 0}
            />

            {/* Pivot Actions */}
            {(search.topSrcIp.length > 0 || search.topDstIp.length > 0) && (
              <PivotActions
                topSrcIp={search.topSrcIp}
                topDstIp={search.topDstIp}
                matchedPort={search.matchedPort}
                onNavigate={(value) => {
                  const q = encodeURIComponent(value)
                  const range = encodeURIComponent(search.submitted.timeRange)
                  navigate(`/investigate?q=${q}&range=${range}`)
                }}
              />
            )}

            {/* Timeline Chart */}
            {search.timeline.length > 0 && (
              <TimelineChart timeline={search.timeline} />
            )}

            {/* Breakdown Charts */}
            {(search.topActions.length > 0 || search.topProtocols.length > 0) && (
              <BreakdownCharts
                topActions={search.topActions}
                topProtocols={search.topProtocols}
              />
            )}

            {/* Top Analysis Grid */}
            <SearchResultsGrid
              topSrcIp={search.topSrcIp}
              topDstIp={search.topDstIp}
              topAgents={search.topAgents}
              topProtocols={search.topProtocols}
              topLogSources={search.topLogSources}
              topCountries={search.topCountries}
              onSelect={search.applyPatch}
            />

            {/* Port Listeners */}
            {search.matchedPort && (search.listenersQ.data?.listeners?.length ?? 0) > 0 && (
              <PortListenersSection
                matchedPort={search.matchedPort}
                listeners={search.listenersQ.data!.listeners}
                total={search.listenersQ.data?.total}
                isLoading={search.listenersQ.isFetching}
              />
            )}

            {/* Results Table */}
            <SearchResultsTable
              events={search.events}
              total={search.total}
              matchedPort={search.matchedPort}
              showEvents={search.showEvents}
              onToggle={() => search.setShowEvents(!search.showEvents)}
              onInvestigate={(value) => {
                const q = encodeURIComponent(value)
                const range = encodeURIComponent(search.submitted.timeRange)
                navigate(`/investigate?q=${q}&range=${range}`)
              }}
              onRowClick={(event) => search.setSelectedEvent(event)}
            />
          </>
        )}
      </Stack>

      {/* Log Detail Drawer */}
      <LogDetailDrawer
        event={search.selectedEvent}
        open={!!search.selectedEvent}
        onClose={() => search.setSelectedEvent(null)}
      />
    </PageShell>
  )
}
