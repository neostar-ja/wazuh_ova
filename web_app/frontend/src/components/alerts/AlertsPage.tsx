import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Chip, TextField, Select, MenuItem,
  FormControl, Button, IconButton,
  Tooltip, Table, TableBody, TableCell, TableHead, TableRow,
  LinearProgress, Collapse, InputAdornment, Badge, useTheme,
  Card,
} from '@mui/material'
import SearchRoundedIcon       from '@mui/icons-material/SearchRounded'
import RefreshRoundedIcon      from '@mui/icons-material/RefreshRounded'
import FilterListRoundedIcon   from '@mui/icons-material/FilterListRounded'
import DownloadRoundedIcon     from '@mui/icons-material/DownloadRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import FiberManualRecordIcon   from '@mui/icons-material/FiberManualRecord'
import { alertsApi } from '../../services/api'
import { format, formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { useSnackbar } from 'notistack'
import { AlertStats, MitreAttackInfo, SeverityName, AlertSeverity, WazuhAlertItem } from '../../types/alert'
import {
  BRAND, SEV_COLOR, getBorder,
  CATEGORY_COLOR, SOURCE_COLOR_MAP, fmtN,
} from '../ui/tokens'
import { PageShell } from '../ui/layout'
import { AlertDrawer } from './AlertDrawer'
import { DashboardSection } from './panels'
import { LevelChip, CopyBtn, getFlag } from './shared/AlertUiBits'
import { getVisibleAlertGroups, resolveAlertGroup, summarizeAlertGroupBuckets } from './alertTaxonomy'

interface SeverityOption {
  key: SeverityName;
  label: string;
  color: string;
  min: number;
  max: number;
}

const SEV: SeverityOption[] = [
  { key: 'critical', label: 'Critical', color: SEV_COLOR.critical, min: 15, max: 99 },
  { key: 'high',     label: 'High',     color: SEV_COLOR.high,     min: 12, max: 14 },
  { key: 'medium',   label: 'Medium',   color: SEV_COLOR.medium,   min: 7,  max: 11 },
  { key: 'low',      label: 'Low',      color: SEV_COLOR.low,      min: 1,  max: 6  },
]

// Mapping from stats.by_source label → GET /alerts?source= key
const SOURCE_LABEL_TO_KEY: Record<string, string> = {
  'MikroTik Router':  'mikrotik',
  'FortiGate WUH':    'fortigate',
  'Huawei USG/FW':    'huawei_usg',
  'Huawei AC WiFi':   'huawei_ac',
  'Huawei Agile Controller': 'huawei_ac',
  'Infoblox DNS':     'infoblox_dns',
  'Infoblox DHCP':    'infoblox_dhcp',
  'Suricata IDS':     'suricata',
  'Linux/SSH':        'sshd',
  'Linux/System':     'systemd',
}
const TIME_OPTS = [
  { value: '1h',  label: '1 ชั่วโมง' },
  { value: '6h',  label: '6 ชั่วโมง' },
  { value: '24h', label: '24 ชั่วโมง' },
  { value: '7d',  label: '7 วัน' },
  { value: '30d', label: '30 วัน' },
]

function mapLevelToSeverity(level: number): AlertSeverity {
  if (level >= 15) return 'critical';
  if (level >= 12) return 'high';
  if (level >= 7) return 'medium';
  if (level >= 1) return 'low';
  return 'info';
}

export function normalizeWazuhAlert(raw: any): WazuhAlertItem {
  const rule = raw.rule || {};
  const data = raw.data || {};
  const agent = raw.agent || {};
  const geo = raw.GeoLocation || {};
  const pre = raw.predecoder || {};
  const decoder = raw.decoder || {};

  const level = Number(rule.level || 0);
  const id = raw.id || raw._id || `${raw['@timestamp'] || ''}-${rule.id || ''}-${agent.id || ''}`;

  return {
    id,
    timestamp: raw['@timestamp'] || raw.timestamp || new Date().toISOString(),
    ruleId: rule.id,
    ruleLevel: level,
    severity: mapLevelToSeverity(level),
    description: rule.description || raw.full_log || 'No description available',
    agentId: agent.id,
    agentName: agent.name,
    agentIp: agent.ip || data.srcip || undefined,
    managerName: raw.manager?.name,
    decoderName: decoder.name || pre.program_name,
    programName: pre.program_name,
    location: raw.location,
    sourceIp: data.srcip,
    sourcePort: data.srcport,
    destinationIp: data.dstip,
    destinationPort: data.dstport,
    protocol: data.protocol,
    mitreTactics: rule.mitre?.tactic || [],
    mitreTechniques: rule.mitre?.technique || [],
    groups: rule.groups || [],
    pciDss: rule.pci_dss || [],
    gdpr: rule.gdpr || [],
    hipaa: rule.hipaa || [],
    nist80053: rule.nist_800_53 || [],
    cis: rule.tsc || [],
    fullLog: raw.full_log,
    countryName: geo.country_name || geo.country_code || undefined,
    raw: raw,
  };
}

export function normalizeStats(rawStats: any): AlertStats {
  if (!rawStats) {
    return {
      total: 0,
      by_level: {},
      by_severity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      timeline: []
    };
  }

  const rawByLevel = rawStats.by_level || {};
  const by_severity: Record<SeverityName, number> = {
    critical: Number(rawByLevel.critical || 0),
    high:     Number(rawByLevel.high || 0),
    medium:   Number(rawByLevel.medium || 0),
    low:      Number(rawByLevel.low || 0),
    info:     Number(rawByLevel.info || 0),
  };

  const timeline = (rawStats.timeline || []).map((t: any) => ({
    timestamp: t.time || t.timestamp,
    count: t.total !== undefined ? t.total : (t.count || 0),
    severity_breakdown: {
      critical: t.critical || 0,
      high: t.high || 0,
      medium: t.medium || 0,
      low: t.low || 0,
    }
  }));

  return {
    total: rawStats.total || 0,
    by_level: rawByLevel,
    by_severity,
    timeline,
    by_agent: rawStats.by_agent || [],
    by_mitre: rawStats.by_mitre || [],
    by_srcip: rawStats.by_srcip || [],
    by_source: rawStats.by_source || [],
    by_group: rawStats.by_group || [],
    by_rule: rawStats.by_rule || [],
    by_country: rawStats.by_country || [],
    by_decoder: rawStats.by_decoder || [],
  };
}

type ResolvedSource = { key: string; label: string; color: string }

const DEFAULT_SOURCE_META: ResolvedSource = {
  key: 'unknown',
  label: 'Unknown',
  color: BRAND.primaryLight,
}

const SOURCE_META_BY_KEY: Record<string, ResolvedSource> = {
  fortigate_wuh: { key: 'fortigate', label: 'FortiGate WUH', color: CATEGORY_COLOR.fortigate },
  fortigate:     { key: 'fortigate', label: 'FortiGate WUH', color: CATEGORY_COLOR.fortigate },
  mikrotik:      { key: 'mikrotik', label: 'MikroTik Router', color: CATEGORY_COLOR.mikrotik },
  routeros:      { key: 'mikrotik', label: 'MikroTik Router', color: CATEGORY_COLOR.mikrotik },
  huawei_usg:    { key: 'huawei_usg', label: 'Huawei USG/FW', color: CATEGORY_COLOR.huaweiUsg },
  huawei_ac:     { key: 'huawei_ac', label: 'Huawei Agile Controller', color: CATEGORY_COLOR.huaweiAc },
  infoblox_dns:  { key: 'infoblox_dns', label: 'Infoblox DNS', color: CATEGORY_COLOR.infobloxDns },
  infoblox_dhcp: { key: 'infoblox_dhcp', label: 'Infoblox DHCP', color: CATEGORY_COLOR.infobloxDhcp },
  infoblox:      { key: 'infoblox_dns', label: 'Infoblox', color: CATEGORY_COLOR.infobloxDns },
  suricata:      { key: 'suricata', label: 'Suricata IDS', color: CATEGORY_COLOR.suricata },
  ids:           { key: 'suricata', label: 'Suricata IDS', color: CATEGORY_COLOR.suricata },
  sshd:          { key: 'sshd', label: 'Linux/SSH', color: SEV_COLOR.medium },
  systemd:       { key: 'systemd', label: 'Linux/System', color: CATEGORY_COLOR.linuxSystem },
  windows:       { key: 'windows', label: 'Windows', color: CATEGORY_COLOR.windows },
}

function resolveAlertSource(alert: WazuhAlertItem): ResolvedSource {
  const groups = (alert.groups || []).map((group) => String(group).toLowerCase())
  const decoder = String(alert.decoderName || '').toLowerCase()
  const program = String(alert.programName || '').toLowerCase()
  const rawData = (alert.raw as any)?.data || {}

  const groupPriority = [
    'huawei_ac',
    'huawei_usg',
    'fortigate_wuh',
    'mikrotik',
    'infoblox_dhcp',
    'infoblox_dns',
    'suricata',
    'ids',
    'sshd',
    'windows',
    'systemd',
  ]
  const matchedGroup = groupPriority.find((group) => groups.includes(group))
  if (matchedGroup) return SOURCE_META_BY_KEY[matchedGroup]

  if (program === 'agile-controller' || program === 'huawei-ac' || program === 'huawei-nac') {
    return SOURCE_META_BY_KEY.huawei_ac
  }
  if (
    decoder.includes('huawei-ac')
    || decoder.includes('agilecontroller')
    || decoder.includes('agile-controller')
    || rawData.ac_msg_type
    || rawData.ac_auth_result
    || rawData.ap_mac
    || rawData.switch_name
  ) {
    return SOURCE_META_BY_KEY.huawei_ac
  }
  if (
    decoder.includes('huawei-usg')
    || decoder.includes('seclog')
    || groups.includes('firewall_drop')
    || groups.includes('network_policy')
  ) {
    return SOURCE_META_BY_KEY.huawei_usg
  }
  if (decoder.includes('fortigate')) return SOURCE_META_BY_KEY.fortigate_wuh
  if (decoder.includes('mikrotik') || decoder.includes('routeros')) return SOURCE_META_BY_KEY.mikrotik
  if (decoder.includes('infoblox') || program.includes('named')) return SOURCE_META_BY_KEY.infoblox_dns
  if (decoder.includes('dhcp') || rawData.dhcp_action) return SOURCE_META_BY_KEY.infoblox_dhcp
  if (decoder.includes('suricata')) return SOURCE_META_BY_KEY.suricata
  if (decoder.includes('sshd') || program === 'sshd') return SOURCE_META_BY_KEY.sshd
  if (program === 'systemd' || program === 'sudo' || program === 'kernel') return SOURCE_META_BY_KEY.systemd

  return decoder ? {
    key: alert.decoderName || 'unknown',
    label: alert.decoderName || 'Unknown',
    color: DEFAULT_SOURCE_META.color,
  } : DEFAULT_SOURCE_META
}

const CHART_GROUPS = ['fortigate', 'mikrotik', 'huawei', 'infoblox_dns', 'compliance', 'authentication', 'windows', 'suricata', 'syscheck']

// ── Main Alerts Page ──────────────────────────────────────────────────────────
export default function AlertsPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const qc = useQueryClient()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Filter state
  const [level,            setLevel]            = useState<number>(12)  // Default: High+
  const [source,           setSource]           = useState<string>('')
  const [timeRange,        setTimeRange]        = useState<string>('24h')
  const [search,           setSearch]           = useState<string>('')
  const [searchInput,      setSearchInput]      = useState<string>('')
  const [agentFilter,      setAgentFilter]      = useState<string>('')
  const [mitreFilter,      setMitreFilter]      = useState<string>('')
  const [countryFilter,    setCountryFilter]    = useState<string>('')
  const [showFilters,      setShowFilters]      = useState<boolean>(false)

  // Advanced Filters
  const [ruleIdFilter,     setRuleIdFilter]     = useState<string>('')
  const [srcIpFilter,      setSrcIpFilter]      = useState<string>('')
  const [dstIpFilter,      setDstIpFilter]      = useState<string>('')
  const [decoderFilter,    setDecoderFilter]    = useState<string>('')
  const [complianceFilter, setComplianceFilter] = useState<string>('all')

  // Group quick-filter
  const [groupFilter,      setGroupFilter]      = useState<string>('')

  // Alert detail
  const [selectedAlert,    setSelected]         = useState<WazuhAlertItem | null>(null)
  const [drawerOpen,       setDrawer]           = useState<boolean>(false)

  // Live alert indicator & auto refresh
  const [newCount,         setNewCount]         = useState<number>(0)
  const [refreshInterval,  setRefreshInterval]  = useState<number>(30000) // 30s default
  const [lastTotal,        setLastTotal]        = useState<number | null>(null)

  // Free-text search query only (other filters sent as explicit params)
  const searchQuery = useMemo(() => search.trim() || undefined, [search])

  // Alerts query — all filters as explicit safe params
  const { data: rawAlerts = [], isLoading, isError, refetch, dataUpdatedAt } = useQuery<any[]>({
    queryKey: ['alerts', level, source, timeRange, searchQuery, agentFilter, mitreFilter,
               groupFilter, ruleIdFilter, srcIpFilter, dstIpFilter, decoderFilter, countryFilter, complianceFilter],
    queryFn: () => alertsApi.list({
      level,
      source: source || undefined,
      time_range: timeRange,
      q: searchQuery,
      agent: agentFilter || undefined,
      mitre_tactic: mitreFilter || undefined,
      group: groupFilter || undefined,
      rule_id: ruleIdFilter || undefined,
      srcip: srcIpFilter || undefined,
      dstip: dstIpFilter || undefined,
      decoder: decoderFilter || undefined,
      country: countryFilter || undefined,
      compliance: complianceFilter !== 'all' ? complianceFilter : undefined,
      limit: 500,
    }).then(r => r.data),
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    staleTime: 15000,
  })

  const alerts = useMemo(() => (rawAlerts || []).map(normalizeWazuhAlert), [rawAlerts])

  // Stats query
  const { data: rawStats, isLoading: loadingStats, isError: isErrorStats } = useQuery<any>({
    queryKey: ['alert-stats', timeRange, level],
    queryFn: () => alertsApi.stats(timeRange, level).then(r => r.data),
    refetchInterval: refreshInterval > 0 ? refreshInterval * 2 : false,
    staleTime: 30000,
  })

  const stats = useMemo(() => normalizeStats(rawStats), [rawStats])

  // Detect new alerts (compare total)
  useEffect(() => {
    const total = stats?.total || 0
    if (lastTotal !== null && total > lastTotal) setNewCount(n => n + (total - lastTotal))
    setLastTotal(total)
  }, [stats?.total, lastTotal])

  const commitSearch = () => setSearch(searchInput)
  const selectedSourceLabel =
    Object.values(SOURCE_META_BY_KEY).find((meta) => meta.key === source)?.label || source

  // Active filter chips
  const activeFilters = [
    source && { label: `Source: ${selectedSourceLabel}`, clear: () => setSource('') },
    groupFilter && { label: `Group: ${resolveAlertGroup(groupFilter).label}`, clear: () => setGroupFilter('') },
    agentFilter && { label: `Agent: ${agentFilter}`, clear: () => setAgentFilter('') },
    mitreFilter && { label: `MITRE: ${mitreFilter}`, clear: () => setMitreFilter('') },
    countryFilter && { label: `Country: ${countryFilter}`, clear: () => setCountryFilter('') },
    search && { label: `ค้นหา: "${search}"`, clear: () => { setSearch(''); setSearchInput('') } },
    ruleIdFilter && { label: `Rule ID: ${ruleIdFilter}`, clear: () => setRuleIdFilter('') },
    srcIpFilter && { label: `Src IP: ${srcIpFilter}`, clear: () => setSrcIpFilter('') },
    dstIpFilter && { label: `Dst IP: ${dstIpFilter}`, clear: () => setDstIpFilter('') },
    decoderFilter && { label: `Decoder: ${decoderFilter}`, clear: () => setDecoderFilter('') },
    complianceFilter && complianceFilter !== 'all' && { label: `Compliance: ${complianceFilter}`, clear: () => setComplianceFilter('all') },
    level !== 12 && { label: `Level: ${level}+`, clear: () => setLevel(12) },
  ].filter(Boolean) as { label: string; clear: () => void }[]

  const handleClearAll = () => {
    setSource('')
    setGroupFilter('')
    setSearch('')
    setSearchInput('')
    setAgentFilter('')
    setMitreFilter('')
    setCountryFilter('')
    setLevel(12)   // Reset to High+ default, not all levels
    setRuleIdFilter('')
    setSrcIpFilter('')
    setDstIpFilter('')
    setDecoderFilter('')
    setComplianceFilter('all')
  }

  const handleExport = async (fmt: 'csv' | 'json') => {
    try {
      const r = await alertsApi.export({
        level,
        source: source || undefined,
        time_range: timeRange,
        q: searchQuery,
        agent: agentFilter || undefined,
        mitre_tactic: mitreFilter || undefined,
        group: groupFilter || undefined,
        rule_id: ruleIdFilter || undefined,
        srcip: srcIpFilter || undefined,
        dstip: dstIpFilter || undefined,
        decoder: decoderFilter || undefined,
        country: countryFilter || undefined,
        compliance: complianceFilter !== 'all' ? complianceFilter : undefined,
        fmt,
      })
      const url  = URL.createObjectURL(new Blob([r.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `alerts-${timeRange}.${fmt}`
      link.click()
      enqueueSnackbar(`Export ${fmt.toUpperCase()} สำเร็จ`, { variant: 'success' })
    } catch { enqueueSnackbar('Export ล้มเหลว', { variant: 'error' }) }
  }

  const connectionStatus = useMemo(() => {
    if (isError || isErrorStats) return { label: 'Error', color: '#ef4444' }
    if (isLoading || loadingStats) return { label: 'Syncing', color: '#eab308' }
    return { label: 'Connected', color: '#22c55e' }
  }, [isError, isErrorStats, isLoading, loadingStats])

  return (
    <PageShell variant="console">
      {/* ── Header ── compact professional single-row ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
        {/* Left: title + badges */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              การแจ้งเตือนภัยคุกคาม
            </Typography>
            {/* High+ badge */}
            <Box sx={{ px: 0.9, py: 0.2, borderRadius: '6px', bgcolor: `${SEV_COLOR.high}15`, border: `1px solid ${SEV_COLOR.high}40` }}>
              <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: SEV_COLOR.high, letterSpacing: '0.05em', lineHeight: 1 }}>HIGH+</Typography>
            </Box>
            {/* Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.9, py: 0.25, borderRadius: '6px', bgcolor: `${connectionStatus.color}12`, border: `1px solid ${connectionStatus.color}30` }}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: connectionStatus.color, animation: connectionStatus.label !== 'Error' ? 'pulseGlow 2s ease-in-out infinite' : 'none' }} />
              <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: connectionStatus.color, letterSpacing: '0.06em', lineHeight: 1 }}>
                {connectionStatus.label.toUpperCase()}
              </Typography>
            </Box>
            {newCount > 0 && (
              <Box onClick={() => { setNewCount(0); refetch() }} sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 0.9, py: 0.25, borderRadius: '6px', bgcolor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer', animation: 'pulse-critical 2s ease-in-out infinite' }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#EF4444' }} />
                <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>+{newCount} ใหม่</Typography>
              </Box>
            )}
          </Box>
          <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 500, lineHeight: 1 }}>
            Threat Alerts · High+ · {timeRange} · {alerts.length >= 500 ? '500 latest' : `${alerts.length.toLocaleString()} records`}
            {level !== 1 && (
              <Box component="span" onClick={() => setLevel(1)} sx={{ ml: 1, color: BRAND.primary, fontWeight: 700, cursor: 'pointer', fontSize: 10.5, '&:hover': { textDecoration: 'underline' } }}>
                ดูทุกระดับ →
              </Box>
            )}
          </Typography>
        </Box>

        {/* Right: action controls */}
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0 }}>
          {/* Auto-refresh pill */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 0.9, py: 0.35, borderRadius: '8px', bgcolor: 'rgba(79,110,247,0.06)', border: '1px solid rgba(79,110,247,0.14)' }}>
            <FiberManualRecordIcon sx={{ fontSize: 7, color: refreshInterval > 0 ? '#22C55E' : 'text.disabled' }} />
            <FormControl size="small">
              <Select value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))}
                sx={{ height: 22, fontSize: 9.5, color: 'text.secondary', bgcolor: 'transparent', '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, '& .MuiSelect-select': { py: 0, pr: '22px !important' } }}>
                <MenuItem value={0} sx={{ fontSize: 11 }}>Off</MenuItem>
                <MenuItem value={15000} sx={{ fontSize: 11 }}>15s</MenuItem>
                <MenuItem value={30000} sx={{ fontSize: 11 }}>30s</MenuItem>
                <MenuItem value={60000} sx={{ fontSize: 11 }}>60s</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton size="small" onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['alert-stats'] }); setNewCount(0) }}
              sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider', p: 0.75, '&:hover': { borderColor: BRAND.primary, color: BRAND.primary } }}>
              <RefreshRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Button size="small" startIcon={<DownloadRoundedIcon sx={{ fontSize: 13 }} />}
            onClick={() => handleExport('csv')} variant="outlined"
            sx={{ borderRadius: '8px', fontSize: 11, py: 0.6, px: 1.25, minWidth: 0, '& .MuiButton-startIcon': { mr: 0.4 } }}>
            CSV
          </Button>
        </Box>
      </Box>

      {/* ── Dashboard Section ── */}
      <DashboardSection
        stats={stats}
        loading={loadingStats}
        activeLevel={level}
        onLevelClick={lv => setLevel(prev => prev === lv ? 12 : lv)}
        onGroupClick={g => setGroupFilter(prev => prev === g ? '' : g)}
        onRuleClick={id => { setRuleIdFilter(prev => prev === id ? '' : id); setShowFilters(true) }}
        onSrcIpClick={ip => { setSrcIpFilter(prev => prev === ip ? '' : ip); setShowFilters(true) }}
        onSourceClick={label => {
          const key = SOURCE_LABEL_TO_KEY[label] || label.toLowerCase().replace(/\s+/g, '_')
          setSource(prev => prev === key ? '' : key)
        }}
        onCountryClick={c => { setCountryFilter(prev => prev === c ? '' : c); setShowFilters(true) }}
        onAgentClick={a => { setAgentFilter(prev => prev === a ? '' : a); setShowFilters(true) }}
        navigate={navigate}
      />

      {/* ── Group Quick-Filter Rail (horizontal scroll, no wrap) ── */}
      {(() => {
        const dynamicGroups = summarizeAlertGroupBuckets(
          (stats?.by_group || []).filter((g: any) => g.count > 0),
          14,
        )
        if (!dynamicGroups.length) return null
        return (
          <Box sx={{ mb: 1, mt: 1.5 }}>
            <Box sx={{
              display: 'flex', gap: 0.75, alignItems: 'center',
              overflowX: 'auto', whiteSpace: 'nowrap',
              pb: 0.5,
              '&::-webkit-scrollbar': { height: 3 },
              '&::-webkit-scrollbar-thumb': { borderRadius: 2, bgcolor: 'rgba(79,110,247,0.2)' },
            }}>
              <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: 'text.disabled', letterSpacing: '0.08em', flexShrink: 0, mr: 0.25, textTransform: 'uppercase' }}>
                GROUP:
              </Typography>
              {dynamicGroups.map(g => {
                const isActive = groupFilter === g.filterKey
                return (
                  <Box
                    key={g.key}
                    onClick={() => setGroupFilter(prev => prev === g.filterKey ? '' : g.filterKey)}
                    sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.5,
                      flexShrink: 0, maxWidth: 150,
                      px: 1, py: 0.4, borderRadius: '7px', cursor: 'pointer',
                      border: `1px solid ${isActive ? g.color : 'transparent'}`,
                      bgcolor: isActive ? `${g.color}18` : 'action.hover',
                      transition: 'all 0.16s',
                      '&:hover': { bgcolor: `${g.color}18`, borderColor: `${g.color}55` },
                    }}
                  >
                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: g.color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: isActive ? g.color : 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                      {g.label}
                    </Typography>
                    <Typography sx={{ fontSize: 9, fontFamily: '"IBM Plex Mono"', color: isActive ? g.color : 'text.disabled', fontWeight: 700, flexShrink: 0, lineHeight: 1.2 }}>
                      {fmtN(g.count)}
                    </Typography>
                  </Box>
                )
              })}
              {groupFilter && (
                <Box onClick={() => setGroupFilter('')} sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, px: 0.75, py: 0.4, borderRadius: '7px', cursor: 'pointer', bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', '&:hover': { bgcolor: 'rgba(239,68,68,0.18)' } }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>✕ ล้าง</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )
      })()}

      {/* ── Filter Bar ── */}
      <Card sx={{ mb: 1.5, p: 1.25, border: `1px solid ${getBorder(isDark, 'subtle')}`, boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', mb: activeFilters.length ? 0.75 : 0 }}>
          {/* Search */}
          <TextField size="small" placeholder="ค้นหา IP, Rule, Description..." value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitSearch()}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
            sx={{ minWidth: 220, flex: 1 }} />

          {/* Level */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={level} onChange={e => setLevel(Number(e.target.value))} displayEmpty sx={{ fontSize: 12 }}>
              <MenuItem value={1} sx={{ fontSize: 12 }}>ทุกระดับ</MenuItem>
              {SEV.map(s => {
                const thLabel = ({ critical: 'วิกฤต (15+)', high: 'สูง High+ (12+)', medium: 'กลาง (7+)', low: 'ต่ำ (1+)', info: 'Info' } as Record<string, string>)[s.key] || s.label
                return (
                  <MenuItem key={s.key} value={s.min} sx={{ fontSize: 12 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                      {thLabel}
                    </Box>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>

          {/* Source — dynamic from stats.by_source */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={source} onChange={e => setSource(e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
              <MenuItem value="">ทุกแหล่งข้อมูล</MenuItem>
              {(stats?.by_source || []).map((s: any) => {
                const key = SOURCE_LABEL_TO_KEY[s.name] || s.name.toLowerCase().replace(/\s+/g, '_')
                return <MenuItem key={key} value={key} sx={{ fontSize: 12 }}>{s.name} ({fmtN(s.count)})</MenuItem>
              })}
            </Select>
          </FormControl>

          {/* Time range */}
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select value={timeRange} onChange={e => setTimeRange(e.target.value)} sx={{ fontSize: 12 }}>
              {TIME_OPTS.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>

          {/* More filters toggle */}
          <Tooltip title="ตัวกรองเพิ่มเติม">
            <IconButton size="small" onClick={() => setShowFilters(o => !o)}
              sx={{ borderRadius: '8px', border: '1px solid', borderColor: showFilters ? BRAND.primary : 'divider', bgcolor: showFilters ? `${BRAND.primary}12` : 'transparent', color: showFilters ? BRAND.primaryLight : 'text.secondary', p: 0.75 }}>
              <Badge badgeContent={[agentFilter, mitreFilter, countryFilter, decoderFilter, ruleIdFilter, srcIpFilter, dstIpFilter, complianceFilter !== 'all' ? 1 : null].filter(Boolean).length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: 8, minWidth: 14, height: 14 } }}>
                <FilterListRoundedIcon sx={{ fontSize: 16 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Button size="small" variant="contained" onClick={commitSearch}
            sx={{ borderRadius: '8px', fontSize: 11.5, py: 0.65, px: 1.75, minWidth: 72, bgcolor: BRAND.primary, '&:hover': { bgcolor: BRAND.primaryDark } }}>
            ค้นหา
          </Button>
        </Box>

        {/* Extra filters */}
        <Collapse in={showFilters}>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.75, pt: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
            {/* Agent filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
                <MenuItem value="">ทุก Agent</MenuItem>
                {(stats?.by_agent || []).map((a: any) => <MenuItem key={a.name} value={a.name} sx={{ fontSize: 12 }}>{a.name} ({fmtN(a.count)})</MenuItem>)}
              </Select>
            </FormControl>

            {/* MITRE tactic */}
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <Select value={mitreFilter} onChange={e => setMitreFilter(e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
                <MenuItem value="">ทุก MITRE Tactic</MenuItem>
                {(stats?.by_mitre || []).map((m: any) => <MenuItem key={m.name} value={m.name} sx={{ fontSize: 12 }}>{m.name} ({fmtN(m.count)})</MenuItem>)}
              </Select>
            </FormControl>

            {/* Country filter — dynamic from stats.by_country */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
                <MenuItem value="">ทุกประเทศ</MenuItem>
                {(stats?.by_country || []).map((c: any) => <MenuItem key={c.name} value={c.name} sx={{ fontSize: 12 }}>{getFlag(c.name)} {c.name} ({fmtN(c.count)})</MenuItem>)}
              </Select>
            </FormControl>

            {/* Decoder filter — dynamic from stats.by_decoder */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select value={decoderFilter} onChange={e => setDecoderFilter(e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
                <MenuItem value="">ทุก Decoder</MenuItem>
                {(stats?.by_decoder || []).map((d: any) => <MenuItem key={d.name} value={d.name} sx={{ fontSize: 12 }}>{d.name} ({fmtN(d.count)})</MenuItem>)}
              </Select>
            </FormControl>

            {/* Rule ID */}
            <TextField size="small" placeholder="Rule ID เช่น 101053" value={ruleIdFilter}
              onChange={e => setRuleIdFilter(e.target.value)}
              sx={{ minWidth: 130, maxWidth: 140, '& .MuiInputBase-input': { fontSize: 12 } }} />

            {/* Source IP */}
            <TextField size="small" placeholder="IP ต้นทาง" value={srcIpFilter}
              onChange={e => setSrcIpFilter(e.target.value)}
              sx={{ minWidth: 130, maxWidth: 150, '& .MuiInputBase-input': { fontSize: 12 } }} />

            {/* Dest IP */}
            <TextField size="small" placeholder="IP ปลายทาง" value={dstIpFilter}
              onChange={e => setDstIpFilter(e.target.value)}
              sx={{ minWidth: 130, maxWidth: 150, '& .MuiInputBase-input': { fontSize: 12 } }} />

            {/* Compliance Framework */}
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select value={complianceFilter} onChange={e => setComplianceFilter(e.target.value)} sx={{ fontSize: 12 }}>
                <MenuItem value="all">ทุก Compliance Standard</MenuItem>
                <MenuItem value="pci_dss">PCI-DSS</MenuItem>
                <MenuItem value="gdpr">GDPR</MenuItem>
                <MenuItem value="hipaa">HIPAA</MenuItem>
                <MenuItem value="nist_800_53">NIST 800-53</MenuItem>
                <MenuItem value="cis">CIS Controls</MenuItem>
              </Select>
            </FormControl>

            {/* Top attackers quick-filter */}
            {(stats?.by_srcip || []).length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', mr: 0.5 }}>IP โจมตีสูงสุด:</Typography>
                {(stats?.by_srcip || []).slice(0, 5).map((ip: any) => (
                  <Chip key={ip.name} label={ip.name} size="small" onClick={() => setSrcIpFilter(prev => prev === ip.name ? '' : ip.name)}
                    sx={{ height: 18, fontSize: 9, fontFamily: '"IBM Plex Mono"', cursor: 'pointer',
                      bgcolor: srcIpFilter === ip.name ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
                      color: '#EF4444', border: `1px solid ${srcIpFilter === ip.name ? '#EF4444' : 'transparent'}`,
                      '&:hover': { bgcolor: 'rgba(239,68,68,0.2)' } }} />
                ))}
              </Box>
            )}
          </Box>
        </Collapse>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75, pt: 0.75, borderTop: '1px solid', borderColor: 'divider', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 700, flexShrink: 0 }}>กรองด้วย:</Typography>
            {activeFilters.map((f, i) => (
              <Chip key={i} label={f.label} size="small" onDelete={f.clear}
                sx={{ height: 18, fontSize: 9.5, bgcolor: `${BRAND.primary}12`, color: BRAND.primaryLight, maxWidth: 160, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }, '& .MuiChip-deleteIcon': { fontSize: 12, color: BRAND.primaryLight } }} />
            ))}
            <Chip label="ล้างทั้งหมด" size="small" onClick={handleClearAll}
              sx={{ height: 18, fontSize: 9.5, cursor: 'pointer', bgcolor: 'rgba(239,68,68,0.1)', color: '#EF4444' }} />
          </Box>
        )}
      </Card>

      {/* ── Source chips — horizontal scroll rail ── */}
      {stats && !loadingStats && (stats.by_source || []).length > 0 && (
        <Box sx={{
          display: 'flex', gap: 0.6, alignItems: 'center', mb: 1,
          overflowX: 'auto', whiteSpace: 'nowrap',
          '&::-webkit-scrollbar': { height: 3 },
          '&::-webkit-scrollbar-thumb': { borderRadius: 2, bgcolor: 'rgba(79,110,247,0.2)' },
        }}>
          <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: 'text.disabled', letterSpacing: '0.08em', flexShrink: 0, textTransform: 'uppercase' }}>
            Source:
          </Typography>
          {(stats.by_source || []).slice(0, 8).map((s: any) => {
            const key = SOURCE_LABEL_TO_KEY[s.name] || s.name.toLowerCase().replace(/\s+/g, '_')
            const sc  = SOURCE_COLOR_MAP[s.name] || BRAND.primary
            const isActive = source === key
            return (
              <Box key={s.name} onClick={() => setSource(prev => prev === key ? '' : key)} sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.4, flexShrink: 0,
                px: 0.9, py: 0.35, borderRadius: '7px', cursor: 'pointer',
                bgcolor: isActive ? `${sc}20` : `${sc}0A`,
                border: `1px solid ${isActive ? sc : 'transparent'}`,
                transition: 'all 0.16s',
                '&:hover': { bgcolor: `${sc}18`, borderColor: `${sc}50` },
              }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: sc, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: isActive ? sc : 'text.secondary', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
                  {s.name}
                </Typography>
                <Typography sx={{ fontSize: 9, fontFamily: '"IBM Plex Mono"', color: isActive ? sc : 'text.disabled', fontWeight: 700, lineHeight: 1.2, flexShrink: 0 }}>
                  {fmtN(s.count)}
                </Typography>
              </Box>
            )
          })}
          {source && (
            <Box onClick={() => setSource('')} sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, px: 0.75, py: 0.35, borderRadius: '7px', cursor: 'pointer', bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', '&:hover': { bgcolor: 'rgba(239,68,68,0.18)' } }}>
              <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>✕</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ── Alerts Table ── */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        {isLoading && <LinearProgress sx={{ height: 2, '& .MuiLinearProgress-bar': { bgcolor: BRAND.primary } }} />}

        {/* Table header bar */}
        <Box sx={{
          px: 2, py: 1.25,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid', borderColor: 'divider',
          background: 'linear-gradient(90deg, rgba(79,110,247,0.04) 0%, transparent 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: BRAND.primary }} />
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary' }}>รายการแจ้งเตือน</Typography>
            {!isLoading && (
              <Chip label={`${alerts.length.toLocaleString()} รายการ`} size="small"
                sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: `${BRAND.primary}18`, color: BRAND.primaryLight }} />
            )}
          </Box>
          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
            ทั้งระบบ {(stats?.total || 0).toLocaleString()} รายการ
            {dataUpdatedAt ? ` · ${formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true, locale: th })}` : ''}
          </Typography>
        </Box>

        <Box sx={{ overflow: 'auto' }} className="scrollbar-thin">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-stickyHeader': { bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider' } }}>
                {[
                  { label: 'เวลา',        w: 120, mobile: true  },
                  { label: 'ระดับ',       w: 90,  mobile: true  },
                  { label: 'คำอธิบาย',    w: 'auto', mobile: true },
                  { label: 'แหล่งข้อมูล', w: 120, mobile: false },
                  { label: 'IP ต้นทาง',   w: 140, mobile: false },
                  { label: '🌐 ประเทศ',   w: 120, mobile: false },
                  { label: 'Agent',       w: 110, mobile: false },
                ].map(h => (
                  <TableCell key={h.label} sx={{
                    fontSize: 10, fontWeight: 800, color: 'text.disabled',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    py: 1.25, whiteSpace: 'nowrap', width: h.w,
                    display: h.mobile ? 'table-cell' : { xs: 'none', md: 'table-cell' },
                  }}>
                    {h.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8, border: 'none' }}>
                    <Box sx={{ mb: 1.5 }}>
                      <NotificationsActiveRoundedIcon sx={{ fontSize: 52, color: BRAND.primary, opacity: 0.25, display: 'block', mx: 'auto' }} />
                    </Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                      {level >= 12 ? 'ไม่พบ High+ alerts ในช่วงเวลานี้' : 'ไม่พบรายการแจ้งเตือน'}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>
                      {activeFilters.length > 0 ? 'ลองล้างตัวกรองและค้นหาใหม่' : 'ลองขยายช่วงเวลาหรือลดระดับความรุนแรง'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {level !== 1 && (
                        <Button size="small" variant="outlined" onClick={() => setLevel(1)}
                          sx={{ borderRadius: '10px', fontSize: 12, borderColor: BRAND.primary, color: BRAND.primary }}>
                          แสดงทุกระดับ
                        </Button>
                      )}
                      {timeRange !== '7d' && (
                        <Button size="small" variant="outlined" onClick={() => setTimeRange('7d')}
                          sx={{ borderRadius: '10px', fontSize: 12 }}>
                          ขยายเป็น 7 วัน
                        </Button>
                      )}
                      {activeFilters.length > 0 && (
                        <Button size="small" variant="outlined" color="error" onClick={handleClearAll}
                          sx={{ borderRadius: '10px', fontSize: 12 }}>
                          ล้างตัวกรองทั้งหมด
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((a, i) => {
                  const lv      = a.ruleLevel
                  const srcip   = a.sourceIp
                  const country = a.countryName
                  const flag    = getFlag(country)
                  const groups: string[] = a.groups || []
                  const mitre: MitreAttackInfo = { tactic: a.mitreTactics, technique: a.mitreTechniques }
                  const isCrit  = lv >= 15
                  const isHigh  = lv >= 12 && lv < 15
                  const isMed   = lv >= 7  && lv < 12
                  const accentColor = isCrit ? SEV_COLOR.critical : isHigh ? SEV_COLOR.high : isMed ? SEV_COLOR.medium : SEV_COLOR.low
                  const sourceMeta = resolveAlertSource(a)

                  return (
                    <TableRow
                      key={i}
                      hover
                      onClick={() => { setSelected(a); setDrawer(true) }}
                      sx={{
                        cursor: 'pointer',
                        position: 'relative',
                        bgcolor: isCrit ? 'rgba(239,68,68,0.03)' : isHigh ? 'rgba(249,115,22,0.025)' : 'transparent',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          bgcolor: `${accentColor}08`,
                        },
                        '& .MuiTableCell-root': {
                          borderColor: isCrit ? 'rgba(239,68,68,0.08)' : 'divider',
                        },
                      }}
                    >
                      {/* Time — left accent border */}
                      <TableCell sx={{
                        py: 1.25, pl: 1.5,
                        borderLeft: `3px solid ${isCrit || isHigh ? accentColor : `${accentColor}50`}`,
                      }}>
                        <Typography sx={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono"', color: 'text.secondary', lineHeight: 1.2 }}>
                          {a.timestamp ? format(new Date(a.timestamp), 'dd/MM/yy') : '-'}
                        </Typography>
                        <Typography sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono"', color: 'text.primary', fontWeight: 600, lineHeight: 1.2, mt: 0.2 }}>
                          {a.timestamp ? format(new Date(a.timestamp), 'HH:mm:ss') : '-'}
                        </Typography>
                      </TableCell>

                      {/* Level */}
                      <TableCell sx={{ py: 1.25 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
                          <LevelChip level={lv} animate={isCrit} />
                          {a.ruleId && (
                            <Typography sx={{ fontSize: 9, fontFamily: '"IBM Plex Mono"', color: 'text.disabled' }}>
                              #{a.ruleId}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Description + MITRE tags */}
                      <TableCell sx={{ py: 1.25, maxWidth: 320, minWidth: 220 }}>
                        <Typography sx={{
                          fontSize: 12.5, lineHeight: 1.4, fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: isCrit ? '#FCA5A5' : isHigh ? '#FDBA74' : 'text.primary',
                          maxWidth: 310,
                        }}>
                          {a.description || '-'}
                        </Typography>
                        {(groups.length > 0 || (mitre.tactic && mitre.tactic.length > 0)) && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, mt: 0.5 }}>
                            {getVisibleAlertGroups(groups, 3).map((groupMeta) => {
                              return (
                                <Box key={groupMeta.key} sx={{
                                  px: 0.75, py: 0.15, borderRadius: '4px', fontSize: 9, fontWeight: 700,
                                  bgcolor: `${groupMeta.color}18`, color: groupMeta.color, border: `1px solid ${groupMeta.color}30`,
                                  letterSpacing: '0.03em',
                                }}>
                                  {groupMeta.label}
                                </Box>
                              )
                            })}
                            {(mitre.tactic || []).slice(0, 2).map(t => (
                              <Box key={t} sx={{
                                px: 0.75, py: 0.15, borderRadius: '4px', fontSize: 9, fontWeight: 700,
                                bgcolor: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)',
                              }}>
                                ⚔ {t}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </TableCell>

                      {/* Source (decoder) — hidden on mobile */}
                      <TableCell sx={{ py: 1.25, display: { xs: 'none', md: 'table-cell' } }}>
                        <Box sx={{
                          display: 'inline-flex', alignItems: 'center', gap: 0.5,
                          px: 0.9, py: 0.35, borderRadius: '6px',
                          bgcolor: `${sourceMeta.color}15`, border: `1px solid ${sourceMeta.color}30`,
                          cursor: 'pointer', transition: 'all 0.15s',
                          '&:hover': { bgcolor: `${sourceMeta.color}25` },
                        }}
                          onClick={e => { e.stopPropagation(); setSource(sourceMeta.key) }}
                        >
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sourceMeta.color, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: sourceMeta.color, whiteSpace: 'nowrap' }}>
                            {sourceMeta.label}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Src IP — hidden on mobile */}
                      <TableCell sx={{ py: 1.25, display: { xs: 'none', md: 'table-cell' } }}>
                        {srcip ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            <Typography sx={{
                              fontSize: 11.5, fontFamily: '"IBM Plex Mono"', fontWeight: 600,
                              color: BRAND.primaryLight, cursor: 'pointer', lineHeight: 1,
                              '&:hover': { color: BRAND.primary, textDecoration: 'underline' },
                            }}
                              onClick={e => { e.stopPropagation(); navigate(`/investigate?q=${srcip}`) }}>
                              {srcip}
                            </Typography>
                            <CopyBtn text={srcip} />
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                        )}
                        {a.sourcePort && (
                          <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"', mt: 0.2 }}>
                            :{a.sourcePort}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Country + flag — hidden on mobile */}
                      <TableCell sx={{ py: 1.25, display: { xs: 'none', md: 'table-cell' } }}>
                        {country ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {flag && (
                              <Box sx={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{flag}</Box>
                            )}
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>
                              {country}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>

                      {/* Agent — hidden on mobile */}
                      <TableCell sx={{ py: 1.25, display: { xs: 'none', md: 'table-cell' } }}>
                        {a.agentName ? (
                          <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            px: 0.8, py: 0.3, borderRadius: '6px',
                            bgcolor: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.15)',
                          }}>
                            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#22C55E', flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {a.agentName}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Box>

        {/* Table footer */}
        <Box sx={{
          px: 2, py: 1.25, borderTop: '1px solid', borderColor: 'divider',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(90deg, rgba(79,110,247,0.02) 0%, transparent 100%)',
        }}>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            แสดง {Math.min(alerts.length, 500).toLocaleString()} จาก {(stats?.total || alerts.length).toLocaleString()} รายการ
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[['ดาวน์โหลด CSV', 'csv'], ['ดาวน์โหลด JSON', 'json']].map(([label, fmt]) => (
              <Button key={fmt} size="small" onClick={() => handleExport(fmt as 'csv' | 'json')}
                variant="outlined"
                sx={{ fontSize: 10, py: 0.4, px: 1.25, borderRadius: '8px', color: 'text.secondary', borderColor: 'divider',
                  '&:hover': { color: BRAND.primaryLight, borderColor: BRAND.primary } }}>
                {label}
              </Button>
            ))}
          </Box>
        </Box>
      </Card>

      {/* Alert Drawer */}
      <AlertDrawer alert={selectedAlert} open={drawerOpen} onClose={() => setDrawer(false)} />
    </PageShell>
  )
}
