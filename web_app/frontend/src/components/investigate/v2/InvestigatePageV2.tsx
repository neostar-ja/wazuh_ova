import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Box, Tab, Tabs, Typography, Skeleton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import TrafficRoundedIcon from '@mui/icons-material/TrafficRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded'
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded'
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import NetworkCheckRoundedIcon from '@mui/icons-material/NetworkCheckRounded'
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded'
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded'
import FlashOnRoundedIcon from '@mui/icons-material/FlashOnRounded'

import { PageShell } from '../../ui/layout'
import { fmtN, BRAND, getSoftBg } from '../../ui/tokens'
import api from '../../../services/api'
import { safeStorage } from '../../../utils/safeStorage'

import SearchHero from './SearchHero'
import EntitySidebar from './EntitySidebar'
import OverviewTab from './OverviewTab'
import NetworkTab from './NetworkTab'
import AlertsTab from './AlertsTab'
import ThreatIntelTabV2 from './ThreatIntelTabV2'
import MitreTabV2 from './MitreTabV2'
import DataSourceCoveragePanel from './DataSourceCoveragePanel'
import DNSDHCPTab from './DNSDHCPTab'
import NACTab from './NACTab'
import RiskAnalysisTab from './RiskAnalysisTab'
import EntityGraphTab, { buildEntityGraph } from './EntityGraphTab'
import ActionsTab from './ActionsTab'

const RECENT_KEY = 'wazuh-inv-v2-recent'

function getRecent(): string[] {
  try {
    const p = JSON.parse(safeStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(p) ? p.filter((e): e is string => typeof e === 'string') : []
  } catch { return [] }
}

function saveRecent(q: string) {
  const next = [q, ...getRecent().filter(e => e !== q)].slice(0, 8)
  safeStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | '90d'

interface InvestigateResult {
  query: string; type: string; count: number; events: unknown[]
  identity: Record<string, unknown>
  mitre: { tactics: string[]; techniques: string[] }
  level_dist: Record<string, number>
  hourly: Array<{ time: string; count: number }>
  top_sources: Array<{ name: string; count: number }>
  correlation: Record<string, unknown>
  dhcp: unknown[]; wifi: unknown[]
}

const TABS = [
  { label: 'Overview',      icon: <BarChartRoundedIcon      fontSize="small" /> },
  { label: 'Network',       icon: <TrafficRoundedIcon       fontSize="small" /> },
  { label: 'Alerts',        icon: <NotificationsActiveRoundedIcon fontSize="small" /> },
  { label: 'Threat Intel',  icon: <PolicyRoundedIcon        fontSize="small" /> },
  { label: 'MITRE',         icon: <PsychologyRoundedIcon    fontSize="small" /> },
  { label: 'DNS / DHCP',    icon: <DnsRoundedIcon           fontSize="small" /> },
  { label: 'Network Access',icon: <NetworkCheckRoundedIcon  fontSize="small" /> },
  { label: 'Risk',          icon: <AssessmentRoundedIcon    fontSize="small" /> },
  { label: 'Entity Graph',  icon: <AccountTreeRoundedIcon   fontSize="small" /> },
  { label: 'Actions',       icon: <FlashOnRoundedIcon       fontSize="small" /> },
]

export default function InvestigatePageV2() {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ     = searchParams.get('q') ?? ''
  const initialRange = (searchParams.get('range') as TimeRange) ?? '30d'

  const [query,          setQuery]          = useState(initialQ)
  const [timeRange,      setTimeRange]      = useState<TimeRange>(initialRange)
  const [committed,      setCommitted]      = useState(initialQ)
  const [activeTab,      setActiveTab]      = useState(0)
  const [recentSearches, setRecentSearches] = useState(getRecent)
  const [netflowEnabled, setNetflowEnabled] = useState(false)
  const [dnsEnabled,     setDnsEnabled]     = useState(false)
  const [dhcpEnabled,    setDhcpEnabled]    = useState(false)
  const [nacEnabled,     setNacEnabled]     = useState(false)
  const [riskEnabled,    setRiskEnabled]    = useState(false)

  useEffect(() => {
    if (committed) setSearchParams({ q: committed, range: timeRange }, { replace: true })
  }, [committed, timeRange, setSearchParams])

  const handleSearch = useCallback((q: string, range: TimeRange) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setQuery(trimmed); setTimeRange(range); setCommitted(trimmed); setActiveTab(0)
    saveRecent(trimmed); setRecentSearches(getRecent())
    // Reset lazy-load flags
    setNetflowEnabled(false); setDnsEnabled(false); setDhcpEnabled(false)
    setNacEnabled(false); setRiskEnabled(false)
  }, [])

  // ── Main investigation query ──────────────────────────────────────────────
  const investigateQ = useQuery<InvestigateResult>({
    queryKey: ['investigate-v2', committed, timeRange],
    queryFn: async () => {
      const r = await api.get('/investigate', { params: { q: committed, time_range: timeRange, size: 500 } })
      return r.data
    },
    enabled: !!committed, staleTime: 2 * 60 * 1000,
  })

  // ── IRIS context ──────────────────────────────────────────────────────────
  const irisQ = useQuery({
    queryKey: ['investigate-iris', committed],
    queryFn: async () => {
      const r = await api.get('/investigate/iris-context', { params: { q: committed } })
      return r.data
    },
    enabled: !!committed, staleTime: 5 * 60 * 1000,
  })

  // ── Threat intel enrichment ───────────────────────────────────────────────
  const threatQ = useQuery({
    queryKey: ['investigate-threat', committed],
    queryFn: async () => {
      const r = await api.get('/investigate/enrich', { params: { ip: committed } })
      return r.data
    },
    enabled: !!committed && investigateQ.data?.type === 'ip', staleTime: 10 * 60 * 1000,
  })

  // ── Network flow ──────────────────────────────────────────────────────────
  const netflowQ = useQuery({
    queryKey: ['investigate-netflow', committed, timeRange],
    queryFn: async () => {
      const r = await api.get('/investigate/netflow', { params: { q: committed, time_range: timeRange } })
      return r.data
    },
    enabled: !!committed && netflowEnabled, staleTime: 2 * 60 * 1000,
  })

  // ── Source health ─────────────────────────────────────────────────────────
  const sourcesHealthQ = useQuery({
    queryKey: ['sources-health'],
    queryFn: async () => {
      const r = await api.get('/investigate/sources/health')
      return r.data
    },
    staleTime: 5 * 60 * 1000,
  })

  // ── Source coverage per entity ────────────────────────────────────────────
  const coverageQ = useQuery({
    queryKey: ['sources-coverage', committed, timeRange],
    queryFn: async () => {
      const r = await api.get('/investigate/sources/coverage', { params: { q: committed, range: timeRange } })
      return r.data
    },
    enabled: !!committed, staleTime: 3 * 60 * 1000,
  })

  // ── DNS logs ──────────────────────────────────────────────────────────────
  const dnsQ = useQuery({
    queryKey: ['investigate-dns', committed, timeRange],
    queryFn: async () => {
      const r = await api.get('/investigate/dns', { params: { q: committed, range: timeRange } })
      return r.data
    },
    enabled: !!committed && dnsEnabled, staleTime: 3 * 60 * 1000,
  })

  // ── DHCP logs ─────────────────────────────────────────────────────────────
  const dhcpQ = useQuery({
    queryKey: ['investigate-dhcp', committed, timeRange],
    queryFn: async () => {
      const r = await api.get('/investigate/dhcp', { params: { q: committed, range: timeRange } })
      return r.data
    },
    enabled: !!committed && dhcpEnabled, staleTime: 3 * 60 * 1000,
  })

  // ── NAC logs ──────────────────────────────────────────────────────────────
  const nacQ = useQuery({
    queryKey: ['investigate-nac', committed, timeRange],
    queryFn: async () => {
      const r = await api.get('/investigate/nac', { params: { q: committed, range: timeRange } })
      return r.data
    },
    enabled: !!committed && nacEnabled, staleTime: 3 * 60 * 1000,
  })

  // ── Risk score ────────────────────────────────────────────────────────────
  const riskQ = useQuery({
    queryKey: ['investigate-risk', committed, timeRange],
    queryFn: async () => {
      const r = await api.get('/investigate/risk', { params: { q: committed, time_range: timeRange } })
      return r.data
    },
    enabled: !!committed && riskEnabled, staleTime: 5 * 60 * 1000,
  })

  const handleTabChange = (_: unknown, val: number) => {
    setActiveTab(val)
    if (val === 1) setNetflowEnabled(true)
    if (val === 5) { setDnsEnabled(true); setDhcpEnabled(true) }
    if (val === 6) setNacEnabled(true)
    if (val === 7) setRiskEnabled(true)
  }

  const data       = investigateQ.data
  const isLoading  = investigateQ.isFetching
  const entityType = data?.type ?? 'auto'
  const levelDist  = data?.level_dist ?? { critical: 0, high: 0, medium: 0, low: 0 }

  const divider    = isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.1)'
  const tabBg      = isDark ? 'rgba(18,14,33,0.9)' : 'rgba(255,255,255,0.9)'
  const tabBord    = isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.12)'

  const threatData = (() => {
    if (!threatQ.data || typeof threatQ.data !== 'object') return undefined
    return threatQ.data as { score?: number; is_private?: boolean; feeds?: Record<string, unknown>; cached?: boolean; expires_at?: string }
  })()

  const topRules = (() => {
    const rules = (data?.correlation as Record<string, unknown>)?.top_rules
    if (!Array.isArray(rules)) return []
    return rules.slice(0, 10).map((r: unknown) => {
      const ro = r as Record<string, unknown>
      return { id: String(ro.id ?? ''), desc: String(ro.description ?? ''), count: Number(ro.count ?? 0) }
    })
  })()

  const sourcesCoverage = (() => {
    const cov = coverageQ.data?.coverage
    if (!cov) return undefined
    // Map backend coverage keys to source IDs
    return {
      wazuh:          cov.wazuh,
      infoblox_dns:   cov.infoblox_dns,
      infoblox_dhcp:  cov.infoblox_dhcp,
      huawei_nac:     cov.huawei_nac,
    }
  })()

  const irisConfigured    = !!(sourcesHealthQ.data?.sources?.find((s: { id: string; configured: boolean }) => s.id === 'iris')?.configured)
  const shuffleConfigured = !!(sourcesHealthQ.data?.sources?.find((s: { id: string; configured: boolean }) => s.id === 'shuffle')?.configured)

  // Build entity graph from available data
  const entityGraph = buildEntityGraph(
    committed,
    entityType,
    data?.identity,
    levelDist,
    data?.mitre,
    irisQ.data,
    nacQ.data,
  )

  // DNS/NAC alert badges for tab labels
  const hasDnsAlert = (dnsQ.data?.has_malicious ?? false) && !dnsQ.isFetching
  const hasNacAlert = (nacQ.data?.has_posture_fail ?? false) && !nacQ.isFetching

  const metrics = [
    { title: 'Total Events',    value: fmtN(data?.count ?? 0),                                         color: '#0EA5E9', icon: '📊' },
    { title: 'Critical + High', value: fmtN((levelDist.critical ?? 0) + (levelDist.high ?? 0)),        color: '#EF4444', icon: '🚨' },
    { title: 'MITRE Techniques',value: String(data?.mitre?.techniques?.length ?? 0),                   color: '#8B5CF6', icon: '🎯' },
    { title: 'IRIS Alerts',     value: irisQ.isFetching ? '…' : String(irisQ.data?.alert_count ?? 0), color: irisQ.data?.found ? '#EF4444' : '#64748B', icon: '🔔' },
  ]

  return (
    <PageShell title="Investigation Workbench" subtitle="Entity forensic analysis — IP · Host · User · MAC · DNS · DHCP · NAC">
      <Box sx={{ mx: -2 }}>
        <SearchHero
          value={query} timeRange={timeRange} loading={isLoading}
          recentSearches={recentSearches}
          onChange={setQuery} onSearch={handleSearch}
        />
      </Box>

      {!committed ? (
        <LandingHero isDark={isDark} onSearch={(q) => handleSearch(q, '30d')} />
      ) : (
        <Box className="flex flex-col gap-3 mt-4 animate-fade-in">
          {/* Data Source Coverage Panel — always visible */}
          <DataSourceCoveragePanel
            sources={sourcesHealthQ.data?.sources}
            coverage={sourcesCoverage}
            loading={sourcesHealthQ.isFetching}
            query={committed}
          />

          <Box className="flex flex-col lg:flex-row gap-4 items-start">
            {/* LEFT sidebar */}
            <Box className="w-full lg:w-64 shrink-0">
              <EntitySidebar
                query={committed} entityType={entityType}
                identity={data?.identity} levelDist={levelDist}
                totalCount={data?.count ?? 0}
                irisData={irisQ.data} threatData={threatData}
                loading={isLoading}
                onDrillDown={(q) => handleSearch(q, timeRange)}
              />
            </Box>

            {/* RIGHT: Main content */}
            <Box className="flex-1 min-w-0 flex flex-col gap-3">
              {/* Metric cards */}
              <Box className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {metrics.map(m => (
                  <Box key={m.title}
                    className="rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-200"
                    sx={{
                      background: getSoftBg(m.color, isDark ? 7 : 5),
                      border: `1px solid ${getSoftBg(m.color, 20)}`,
                      '&:hover': { border: `1px solid ${getSoftBg(m.color, 35)}`, transform: 'translateY(-1px)', boxShadow: `0 4px 16px ${getSoftBg(m.color, 10)}` },
                    }}
                  >
                    <span className="text-xl leading-none">{m.icon}</span>
                    <Box>
                      <Typography className="text-[9px] font-bold tracking-wide mb-0.5"
                        sx={{ color: getSoftBg(m.color, 70) }}>
                        {m.title}
                      </Typography>
                      {isLoading ? (
                        <Skeleton variant="text" width={40} sx={{ bgcolor: getSoftBg(m.color, 15) }} />
                      ) : (
                        <Typography className="font-mono font-bold text-base leading-none" sx={{ color: m.color }}>
                          {m.value}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Tabs panel */}
              <Box className="rounded-2xl overflow-hidden"
                sx={{ background: tabBg, border: `1px solid ${tabBord}`, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 20px rgba(123,91,164,0.08)' }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    borderBottom: `1px solid ${divider}`,
                    background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(123,91,164,0.03)',
                    '& .MuiTab-root': {
                      minHeight: 46, fontSize: 11.5, gap: 0.5, px: 2, py: 1,
                      color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,100,0.5)',
                      transition: 'color 0.2s, background 0.2s',
                      '&:hover': { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(60,40,100,0.8)', background: isDark ? 'rgba(123,91,164,0.06)' : 'rgba(123,91,164,0.04)' },
                    },
                    '& .Mui-selected': { color: `${BRAND.purpleLight} !important`, fontWeight: 700 },
                    '& .MuiTabs-indicator': { backgroundColor: '#8B5CF6', height: 2, borderRadius: '2px 2px 0 0' },
                    '& .MuiTabScrollButton-root': { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)' },
                  }}
                >
                  {TABS.map((t, i) => {
                    const hasBadge = (i === 5 && hasDnsAlert) || (i === 6 && hasNacAlert)
                    return (
                      <Tab
                        key={i}
                        icon={t.icon}
                        iconPosition="start"
                        label={
                          hasBadge ? (
                            <Box className="flex items-center gap-1">
                              {t.label}
                              <Box className="w-1.5 h-1.5 rounded-full animate-pulse" sx={{ background: '#EF4444' }} />
                            </Box>
                          ) : t.label
                        }
                      />
                    )
                  })}
                </Tabs>

                <Box className="p-4 md:p-5">
                  {activeTab === 0 && (
                    <OverviewTab loading={isLoading} hourly={data?.hourly ?? []} levelDist={levelDist}
                      topSources={data?.top_sources ?? []} topRules={topRules} entityType={entityType} />
                  )}
                  {activeTab === 1 && (
                    <NetworkTab loading={netflowQ.isFetching} data={netflowQ.data}
                      entityType={entityType} onDrillDown={(ip) => handleSearch(ip, timeRange)} />
                  )}
                  {activeTab === 2 && (
                    <AlertsTab loading={isLoading} events={data?.events ?? []}
                      onDrillDown={(q) => handleSearch(q, timeRange)} />
                  )}
                  {activeTab === 3 && (
                    <ThreatIntelTabV2 loading={threatQ.isFetching} data={threatData}
                      irisData={irisQ.data} entityType={entityType} query={committed} />
                  )}
                  {activeTab === 4 && (
                    <MitreTabV2 loading={isLoading} mitre={data?.mitre ?? { tactics: [], techniques: [] }}
                      events={data?.events ?? []} />
                  )}
                  {activeTab === 5 && (
                    <DNSDHCPTab
                      dns={dnsQ.data} dhcp={dhcpQ.data}
                      dnsLoading={dnsQ.isFetching} dhcpLoading={dhcpQ.isFetching}
                      onDrillDown={(q) => handleSearch(q, timeRange)}
                    />
                  )}
                  {activeTab === 6 && (
                    <NACTab
                      data={nacQ.data}
                      loading={nacQ.isFetching}
                      onDrillDown={(q) => handleSearch(q, timeRange)}
                    />
                  )}
                  {activeTab === 7 && (
                    <RiskAnalysisTab
                      data={riskQ.data}
                      loading={riskQ.isFetching}
                    />
                  )}
                  {activeTab === 8 && (
                    <EntityGraphTab
                      graph={entityGraph}
                      onDrillDown={(q) => handleSearch(q, timeRange)}
                    />
                  )}
                  {activeTab === 9 && (
                    <ActionsTab
                      query={committed}
                      entityType={entityType}
                      irisConfigured={irisConfigured}
                      shuffleConfigured={shuffleConfigured}
                      events={data?.events ?? []}
                      mitre={data?.mitre}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </PageShell>
  )
}

const EXAMPLES = ['10.251.65.217', '139.59.170.85', 'admin', '10.251.150.151', 'AA:BB:CC:DD:EE:FF']

function LandingHero({ isDark, onSearch }: { isDark: boolean; onSearch: (q: string) => void }) {
  const textMuted = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(60,40,100,0.45)'
  const chipBg    = isDark ? 'rgba(123,91,164,0.1)'   : 'rgba(123,91,164,0.06)'
  const chipBord  = isDark ? 'rgba(123,91,164,0.25)'  : 'rgba(123,91,164,0.15)'

  return (
    <Box className="flex flex-col items-center justify-center gap-5 py-20 animate-fade-in">
      <Box className="w-20 h-20 rounded-3xl flex items-center justify-center animate-pulse-glow"
        sx={{ background: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)', border: '1px solid rgba(123,91,164,0.2)' }}>
        <TravelExploreRoundedIcon sx={{ fontSize: 38, color: isDark ? 'rgba(167,139,250,0.8)' : '#7B5BA4' }} />
      </Box>

      <Box className="text-center max-w-lg">
        <Typography variant="h5" className="font-bold mb-2"
          sx={{ color: isDark ? '#EDE9FA' : '#1A1033' }}>
          SOC Investigation Workbench
        </Typography>
        <Typography className="text-sm leading-relaxed" sx={{ color: textMuted }}>
          ค้นหา IP · Hostname · Username · MAC address เพื่อดู alerts, DNS/DHCP history,
          NAC context, MITRE ATT&CK mapping, threat intelligence และ risk scoring
        </Typography>
      </Box>

      <Box className="flex flex-col items-center gap-2">
        <Typography className="text-[10px] font-bold tracking-widest" sx={{ color: textMuted }}>
          TRY AN EXAMPLE
        </Typography>
        <Box className="flex flex-wrap justify-center gap-2">
          {EXAMPLES.map(ex => (
            <Box
              key={ex}
              onClick={() => onSearch(ex)}
              className="px-3.5 py-2 rounded-xl cursor-pointer transition-all duration-200 font-mono text-[12px] select-none"
              sx={{
                background: chipBg, border: `1px solid ${chipBord}`,
                color: isDark ? '#C4B5FD' : '#5A3E85',
                '&:hover': {
                  background: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.1)',
                  borderColor: isDark ? 'rgba(123,91,164,0.4)' : 'rgba(123,91,164,0.3)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(123,91,164,0.15)',
                },
              }}
            >
              {ex}
            </Box>
          ))}
        </Box>
      </Box>

      <Box className="flex flex-wrap justify-center gap-2 mt-2 max-w-2xl">
        {[
          { icon: '🌐', label: 'Network Traffic' },
          { icon: '🔔', label: 'IRIS Alert Correlation' },
          { icon: '🎯', label: 'MITRE ATT&CK' },
          { icon: '🛡️', label: 'Threat Intelligence' },
          { icon: '🔍', label: 'DNS / DHCP History' },
          { icon: '🔐', label: 'NAC Auth Context' },
          { icon: '⚠️', label: 'Risk Scoring' },
          { icon: '🕸️', label: 'Entity Graph' },
          { icon: '⚡', label: 'SOAR Actions' },
        ].map(f => (
          <Box key={f.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px]"
            sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)', color: textMuted, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}` }}>
            <span>{f.icon}</span>
            {f.label}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
