import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Box, Typography, Grid, Chip, Table, TableBody, TableCell,
  TableHead, TableRow, Tabs, Tab, TextField, Button, Select,
  MenuItem, FormControl, InputLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Alert as MuiAlert,
  IconButton, Tooltip, Skeleton, InputAdornment, Link, Stack,
  TablePagination,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import WorkspacesRoundedIcon from '@mui/icons-material/WorkspacesRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import EscalatorWarningRoundedIcon from '@mui/icons-material/EscalatorWarningRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import WebhookRoundedIcon from '@mui/icons-material/WebhookRounded'
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecord'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded'
import { useSnackbar } from 'notistack'
import { format } from 'date-fns'
import { PageShell } from '../ui/layout'
import { MetricCard } from '../ui/MetricCard'
import { BRAND, SEV_COLOR, CHART_TIP_STYLE, fmtN } from '../ui/tokens'
import { soarApi, IrisAlert, IrisCase, ShuffleWorkflow, MispAttribute } from '../../services/soarApi'

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

const IRIS_SEV: Record<number, { label: string; color: string }> = {
  1: { label: 'Unspecified', color: '#64748B' },
  2: { label: 'Unspecified', color: '#64748B' },
  3: { label: 'Low',         color: '#22C55E' },
  4: { label: 'Low',         color: '#22C55E' },
  5: { label: 'Medium',      color: '#F59E0B' },
  6: { label: 'Medium',      color: '#F59E0B' },
  7: { label: 'High',        color: '#F17422' },
  8: { label: 'High',        color: '#F17422' },
  9: { label: 'Critical',    color: '#EF4444' },
}

const IRIS_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Unspecified', color: '#64748B' },
  2: { label: 'New',         color: '#3B82F6' },
  3: { label: 'Assigned',    color: '#8B5CF6' },
  4: { label: 'In Progress', color: '#F59E0B' },
  5: { label: 'Pending',     color: '#F17422' },
  6: { label: 'Closed',      color: '#64748B' },
}

function getSev(id: number) { return IRIS_SEV[id] ?? { label: 'Unknown', color: '#64748B' } }
function getStat(id: number) { return IRIS_STATUS[id] ?? { label: 'Unknown', color: '#64748B' } }

function fmtTime(s: string | null | undefined): string {
  if (!s) return '—'
  try { return format(new Date(s), 'dd MMM yy HH:mm') }
  catch { return s }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme()
  return (
    <Typography className="text-[9px] font-bold tracking-widest mb-3"
      sx={{ color: palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)' }}>
      {children}
    </Typography>
  )
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Box className="flex items-center gap-1.5 px-3 py-1 rounded-full"
      sx={{
        background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${ok ? '#22C55E' : '#EF4444'}30`,
      }}>
      <FiberManualRecordRoundedIcon sx={{ fontSize: 7, color: ok ? '#22C55E' : '#EF4444',
        animation: ok ? 'pulseGlow 2.5s ease-in-out infinite' : 'none' }} />
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: ok ? '#22C55E' : '#EF4444', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
    </Box>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ alerts, loading }: { alerts: IrisAlert[]; loading: boolean }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)'
  const cardBord  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'

  const tipStyle = isDark ? CHART_TIP_STYLE : {
    background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(123,91,164,0.2)',
    borderRadius: 8, fontSize: 12, color: '#1A1033', boxShadow: '0 4px 16px rgba(123,91,164,0.12)',
  }

  const sevData = useMemo(() => {
    const map: Record<string, { count: number; color: string }> = {}
    for (const a of alerts) {
      const s = getSev(a.alert_severity_id)
      if (!map[s.label]) map[s.label] = { count: 0, color: s.color }
      map[s.label].count++
    }
    return Object.entries(map).map(([name, { count, color }]) => ({ name, value: count, color }))
  }, [alerts])

  const statusData = useMemo(() => {
    let open = 0, closed = 0
    for (const a of alerts) {
      const s = getStat(a.alert_status_id)
      if (s.label === 'Closed' || s.label === 'Unspecified' && a.alert_status_id === 6) closed++
      else open++
    }
    return [
      { name: 'Open',   value: open,   color: '#3B82F6' },
      { name: 'Closed', value: closed, color: '#64748B' },
    ].filter(d => d.value > 0)
  }, [alerts])

  const sourceData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of alerts) { map[a.alert_source] = (map[a.alert_source] ?? 0) + 1 }
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [alerts])

  const tagData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of alerts) {
      if (!a.alert_tags) continue
      for (const tag of a.alert_tags.split(',').map(t => t.trim())) {
        if (tag) map[tag] = (map[tag] ?? 0) + 1
      }
    }
    return Object.entries(map).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
  }, [alerts])

  const recentAlerts = useMemo(() => [...alerts].sort((a, b) => {
    const ta = new Date(a.alert_source_event_time || a.alert_creation_time || 0).getTime()
    const tb = new Date(b.alert_source_event_time || b.alert_creation_time || 0).getTime()
    return tb - ta
  }).slice(0, 6), [alerts])

  if (loading) return (
    <Stack spacing={2} className="animate-fade-in">
      {[1,2,3].map(i => <Skeleton key={i} variant="rectangular" height={140} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />)}
    </Stack>
  )

  return (
    <Stack spacing={3.5} className="animate-fade-in">
      {/* Charts row */}
      <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Severity Pie */}
        <Box className="rounded-2xl p-4" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <SectionLabel>SEVERITY DISTRIBUTION</SectionLabel>
          <Box className="flex items-center gap-4">
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={sevData} cx="50%" cy="50%" innerRadius={28} outerRadius={44}
                  dataKey="value" paddingAngle={3}>
                  {sevData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <RTooltip contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <Stack spacing={0.75} className="flex-1">
              {sevData.map(d => (
                <Box key={d.name} className="flex items-center justify-between">
                  <Box className="flex items-center gap-1.5">
                    <Box className="w-2 h-2 rounded-full" sx={{ background: d.color }} />
                    <Typography sx={{ fontSize: 11, color: textSec }}>{d.name}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: d.color, fontFamily: '"IBM Plex Mono", monospace' }}>
                    {d.value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>

        {/* Status Pie */}
        <Box className="rounded-2xl p-4" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <SectionLabel>ALERT STATUS</SectionLabel>
          <Box className="flex items-center gap-4">
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={28} outerRadius={44}
                  dataKey="value" paddingAngle={3}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <RTooltip contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <Stack spacing={0.75} className="flex-1">
              {statusData.map(d => (
                <Box key={d.name} className="flex items-center justify-between">
                  <Box className="flex items-center gap-1.5">
                    <Box className="w-2 h-2 rounded-full" sx={{ background: d.color }} />
                    <Typography sx={{ fontSize: 11, color: textSec }}>{d.name}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: d.color, fontFamily: '"IBM Plex Mono", monospace' }}>
                    {d.value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>

        {/* Alert Sources */}
        <Box className="rounded-2xl p-4" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <SectionLabel>ALERT SOURCES</SectionLabel>
          {sourceData.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: textMuted }}>No data</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={sourceData} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.6)' }} width={72} />
                <RTooltip contentStyle={tipStyle} />
                <Bar dataKey="count" fill={BRAND.purple} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Box>

      {/* Tags + Activity */}
      <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tag Cloud */}
        <Box className="rounded-2xl p-4" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <Box className="flex items-center gap-2 mb-3">
            <LocalOfferRoundedIcon sx={{ fontSize: 14, color: BRAND.purple }} />
            <SectionLabel>ALERT TAGS</SectionLabel>
          </Box>
          {tagData.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: textMuted }}>No tags found</Typography>
          ) : (
            <Box className="flex flex-wrap gap-2">
              {tagData.map(({ tag, count }) => (
                <Box key={tag} className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                  sx={{ background: `rgba(${hexRgb(BRAND.purple)},0.12)`, border: `1px solid rgba(${hexRgb(BRAND.purple)},0.25)` }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: isDark ? '#C4B5FD' : BRAND.purpleDark }}>
                    {tag}
                  </Typography>
                  <Box className="w-4 h-4 rounded-full flex items-center justify-center"
                    sx={{ background: BRAND.purple }}>
                    <Typography sx={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>{count}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Recent Activity */}
        <Box className="rounded-2xl p-4" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <Box className="flex items-center gap-2 mb-3">
            <AccessTimeRoundedIcon sx={{ fontSize: 14, color: BRAND.purple }} />
            <SectionLabel>RECENT ALERTS</SectionLabel>
          </Box>
          <Stack spacing={1.5}>
            {recentAlerts.map((a) => {
              const sev = getSev(a.alert_severity_id)
              const stat = getStat(a.alert_status_id)
              return (
                <Box key={a.alert_id} className="flex items-start gap-3">
                  <Box className="w-2 h-2 rounded-full mt-1.5 shrink-0 animate-pulse-slow" sx={{ background: sev.color }} />
                  <Box className="flex-1 min-w-0">
                    <Typography className="text-xs truncate" title={a.alert_title} sx={{ color: textSec, fontWeight: 500 }}>
                      {a.alert_title}
                    </Typography>
                    <Box className="flex items-center gap-2 mt-0.5">
                      <Typography sx={{ fontSize: 9, color: textMuted }}>
                        {fmtTime(a.alert_source_event_time)}
                      </Typography>
                      <Box className="px-1.5 py-0 rounded text-[8px] font-bold"
                        sx={{ background: `rgba(${hexRgb(stat.color)},0.15)`, color: stat.color }}>
                        {stat.label}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )
            })}
          </Stack>
        </Box>
      </Box>
    </Stack>
  )
}

// ── IRIS Tab ──────────────────────────────────────────────────────────────────
function IRISTab({ irisUrl }: { irisUrl?: string }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const [view, setView] = useState<'alerts' | 'cases'>('alerts')
  const [page, setPage] = useState(0)
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; ip?: string }>({ open: false })
  const { enqueueSnackbar } = useSnackbar()

  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const headBg    = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)'
  const rowHover  = isDark ? 'rgba(123,91,246,0.07)' : 'rgba(123,91,164,0.04)'
  const rowAlt    = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(123,91,164,0.015)'
  const divider   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.07)'

  const { data: alertsResp, isLoading: alertsLoading } = useQuery({
    queryKey: ['iris-alerts'],
    queryFn: () => soarApi.getIrisAlerts({ per_page: 50 }).then(r => r.data),
    refetchInterval: 60000,
  })
  const { data: casesResp, isLoading: casesLoading } = useQuery({
    queryKey: ['iris-cases'],
    queryFn: () => soarApi.getIrisCases({ per_page: 50 }).then(r => r.data),
    refetchInterval: 60000,
  })

  const blockMut = useMutation({
    mutationFn: ({ ip }: { ip: string }) => soarApi.triggerBlock(ip, undefined, 'SOC Analyst'),
    onSuccess: () => {
      enqueueSnackbar('Block IP command sent to Shuffle', { variant: 'success' })
      setBlockDialog({ open: false })
    },
    onError: () => enqueueSnackbar('Failed to send command', { variant: 'error' }),
  })

  const alerts: IrisAlert[] = alertsResp?.data?.alerts ?? []
  const cases: IrisCase[] = casesResp?.data ?? []
  const rowsPerPage = 10
  const pageAlerts = alerts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const tabs = [
    { key: 'alerts', label: 'Alerts', icon: <NotificationsActiveRoundedIcon sx={{ fontSize: 14 }} />, count: alerts.length },
    { key: 'cases',  label: 'Cases',  icon: <FolderOpenRoundedIcon sx={{ fontSize: 14 }} />, count: cases.length },
  ]

  return (
    <Stack spacing={2} className="animate-fade-in">
      {/* Sub-nav */}
      <Box className="flex items-center justify-between flex-wrap gap-2">
        <Box className="flex items-center gap-1 p-1 rounded-xl"
          sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)' }}>
          {tabs.map(t => (
            <Box key={t.key}
              onClick={() => { setView(t.key as 'alerts' | 'cases'); setPage(0) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 text-xs font-semibold select-none"
              sx={{
                background: view === t.key ? BRAND.purple : 'transparent',
                color: view === t.key ? '#fff' : textMuted,
                '&:hover': view !== t.key ? { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)', color: textSec } : {},
              }}>
              {t.icon}
              {t.label}
              <Box className="px-1.5 rounded-full text-[9px] font-bold"
                sx={{ background: view === t.key ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(123,91,164,0.12)'),
                      color: view === t.key ? '#fff' : textMuted }}>
                {t.count}
              </Box>
            </Box>
          ))}
        </Box>
        {irisUrl && (
          <Link href={`${irisUrl}/alerts`} target="_blank" rel="noopener" underline="none"
            className="flex items-center gap-1 text-xs font-semibold transition-colors"
            sx={{ color: BRAND.purple, '&:hover': { color: BRAND.purpleLight } }}>
            Open DFIR-IRIS <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
          </Link>
        )}
      </Box>

      {/* Alerts table */}
      {view === 'alerts' && (
        alertsLoading ? (
          <Stack spacing={1}>{[1,2,3,4,5].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />)}</Stack>
        ) : alerts.length === 0 ? (
          <Box className="py-16 flex flex-col items-center gap-3">
            <NotificationsActiveRoundedIcon sx={{ fontSize: 40, color: textMuted, opacity: 0.4 }} />
            <Typography sx={{ fontSize: 13, color: textMuted }}>No alerts found</Typography>
          </Box>
        ) : (
          <Box className="rounded-xl overflow-hidden" sx={{ border: `1px solid ${divider}` }}>
            <Box sx={{ overflowX: 'auto' }} className="scrollbar-thin">
              <Table size="small" sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow sx={{ background: headBg }}>
                    {['TIME', 'TITLE', 'SEVERITY', 'STATUS', 'SOURCE', 'TAGS', 'IOC', 'ACTIONS'].map(h => (
                      <TableCell key={h} sx={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: textMuted,
                        borderBottom: `1px solid ${divider}`, py: 1, px: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageAlerts.map((a, i) => {
                    const sev  = getSev(a.alert_severity_id)
                    const stat = getStat(a.alert_status_id)
                    const tags = a.alert_tags ? a.alert_tags.split(',').map(t => t.trim()).filter(Boolean) : []
                    const iocVal = a.iocs?.[0]?.ioc_value
                    return (
                      <TableRow key={a.alert_id} sx={{
                        background: i % 2 === 0 ? rowAlt : 'transparent',
                        '&:hover': { background: rowHover },
                        '& td': { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)'}` },
                      }}>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Typography className="font-mono text-[10px] whitespace-nowrap" sx={{ color: textMuted }}>
                            {fmtTime(a.alert_source_event_time)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 240 }}>
                          <Typography className="text-[11px] truncate font-medium" title={a.alert_title} sx={{ color: textSec }}>
                            {a.alert_title}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Box className="flex items-center gap-1.5">
                            <Box className="w-1.5 h-1.5 rounded-full" sx={{ background: sev.color }} />
                            <Typography className="text-[10px] font-bold whitespace-nowrap" sx={{ color: sev.color }}>
                              {sev.label.toUpperCase()}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Box className="px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex whitespace-nowrap"
                            sx={{ background: `rgba(${hexRgb(stat.color)},0.15)`, color: stat.color, border: `1px solid rgba(${hexRgb(stat.color)},0.3)` }}>
                            {stat.label}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Typography className="text-[10px] whitespace-nowrap" sx={{ color: textMuted }}>
                            {a.alert_source}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Box className="flex flex-wrap gap-1">
                            {tags.slice(0, 2).map(tag => (
                              <Box key={tag} className="px-1.5 py-0 rounded text-[8px] font-semibold"
                                sx={{ background: `rgba(${hexRgb(BRAND.purple)},0.12)`, color: isDark ? '#C4B5FD' : BRAND.purpleDark }}>
                                {tag}
                              </Box>
                            ))}
                            {tags.length > 2 && <Typography sx={{ fontSize: 9, color: textMuted }}>+{tags.length - 2}</Typography>}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          {iocVal ? (
                            <Typography className="font-mono text-[10px]" sx={{ color: SEV_COLOR.high }}>
                              {iocVal}
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: 10, color: textMuted }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Box className="flex items-center gap-0.5">
                            {iocVal && (
                              <Tooltip title={`Block IP: ${iocVal}`}>
                                <IconButton size="small"
                                  onClick={() => setBlockDialog({ open: true, ip: iocVal })}
                                  sx={{ color: SEV_COLOR.critical, '&:hover': { background: `rgba(${hexRgb(SEV_COLOR.critical)},0.12)` } }}>
                                  <BlockRoundedIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {irisUrl && (
                              <Tooltip title="Open in IRIS">
                                <IconButton size="small" component="a"
                                  href={`${irisUrl}/alerts?alert_id=${a.alert_id}`} target="_blank" rel="noopener"
                                  sx={{ color: BRAND.purple, '&:hover': { background: `rgba(${hexRgb(BRAND.purple)},0.12)` } }}>
                                  <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
            {alerts.length > rowsPerPage && (
              <Box sx={{ borderTop: `1px solid ${divider}`, background: headBg }}>
                <TablePagination
                  component="div"
                  count={alerts.length}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[rowsPerPage]}
                  sx={{ color: textMuted, fontSize: 11, minHeight: 44,
                    '.MuiTablePagination-displayedRows': { fontSize: 11 },
                    '.MuiTablePagination-actions button': { color: textMuted } }}
                />
              </Box>
            )}
          </Box>
        )
      )}

      {/* Cases table */}
      {view === 'cases' && (
        casesLoading ? (
          <Stack spacing={1}>{[1,2,3].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />)}</Stack>
        ) : cases.length === 0 ? (
          <Box className="py-16 flex flex-col items-center gap-3">
            <FolderOpenRoundedIcon sx={{ fontSize: 40, color: textMuted, opacity: 0.4 }} />
            <Typography sx={{ fontSize: 13, color: textMuted }}>No cases found</Typography>
          </Box>
        ) : (
          <Box className="rounded-xl overflow-hidden" sx={{ border: `1px solid ${divider}` }}>
            <Box sx={{ overflowX: 'auto' }} className="scrollbar-thin">
              <Table size="small" sx={{ minWidth: 600 }}>
                <TableHead>
                  <TableRow sx={{ background: headBg }}>
                    {['#', 'CASE NAME', 'OPENED', 'STATUS', 'OWNER', 'CLIENT', 'ACTIONS'].map(h => (
                      <TableCell key={h} sx={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: textMuted,
                        borderBottom: `1px solid ${divider}`, py: 1, px: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cases.map((c, i) => (
                    <TableRow key={c.case_id} sx={{
                      background: i % 2 === 0 ? rowAlt : 'transparent',
                      '&:hover': { background: rowHover },
                      '& td': { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)'}` },
                    }}>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="font-mono text-[10px] font-semibold" sx={{ color: BRAND.purple }}>
                          #{c.case_id}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 220 }}>
                        <Typography className="text-[11px] truncate font-semibold" title={c.case_name} sx={{ color: isDark ? '#EDE9FA' : '#1A1033' }}>
                          {c.case_name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="font-mono text-[10px] whitespace-nowrap" sx={{ color: textMuted }}>
                          {c.case_open_date}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Box className="px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex"
                          sx={c.case_close_date
                            ? { background: 'rgba(100,116,139,0.15)', color: '#64748B', border: '1px solid rgba(100,116,139,0.3)' }
                            : { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
                          {c.case_close_date ? 'Closed' : 'Open'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="text-[10px]" sx={{ color: textMuted }}>{c.owner || '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="text-[10px]" sx={{ color: textMuted }}>{c.client_name || '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Box className="flex items-center gap-0.5">
                          <Tooltip title="Escalate via Shuffle">
                            <IconButton size="small"
                              sx={{ color: '#F59E0B', '&:hover': { background: 'rgba(245,158,11,0.12)' } }}>
                              <EscalatorWarningRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          {irisUrl && (
                            <Tooltip title="Open in IRIS">
                              <IconButton size="small" component="a"
                                href={`${irisUrl}/case?cid=${c.case_id}`} target="_blank" rel="noopener"
                                sx={{ color: BRAND.purple, '&:hover': { background: `rgba(${hexRgb(BRAND.purple)},0.12)` } }}>
                                <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )
      )}

      {/* Block IP Dialog */}
      <Dialog open={blockDialog.open} onClose={() => setBlockDialog({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, color: SEV_COLOR.critical, pb: 1 }}>
          <BlockRoundedIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
          Block IP Address
        </DialogTitle>
        <DialogContent>
          <MuiAlert severity="warning" sx={{ mb: 2, fontSize: 12, borderRadius: 2 }}>
            This will send the IP to Shuffle for blocking on the firewall.
          </MuiAlert>
          <Typography sx={{ fontSize: 13, mb: 1, color: 'text.secondary' }}>Block this IP address?</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', color: SEV_COLOR.critical }}>
            {blockDialog.ip}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setBlockDialog({ open: false })} size="small" sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" size="small" color="error" disabled={blockMut.isPending}
            onClick={() => blockDialog.ip && blockMut.mutate({ ip: blockDialog.ip })}
            sx={{ borderRadius: 2, fontWeight: 700 }}>
            {blockMut.isPending ? <CircularProgress size={14} color="inherit" sx={{ mr: 1 }} /> : null}
            Block IP
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

// ── Shuffle Tab ───────────────────────────────────────────────────────────────
function ShuffleTab({ shuffleUrl }: { shuffleUrl?: string }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'

  const { data: workflows = [], isLoading } = useQuery<ShuffleWorkflow[]>({
    queryKey: ['shuffle-workflows'],
    queryFn: () => soarApi.getShuffleWorkflows().then(r => r.data),
    refetchInterval: 120000,
  })

  const triggerMut = useMutation({
    mutationFn: ({ type, payload }: { type: string; payload: Record<string, unknown> }) =>
      soarApi.triggerTriage({ workflow_type: type, ...payload }),
    onSuccess: () => enqueueSnackbar('Workflow triggered successfully', { variant: 'success' }),
    onError:   () => enqueueSnackbar('Failed to trigger workflow', { variant: 'error' }),
  })

  function getWfMeta(wf: ShuffleWorkflow) {
    const isWebhook = wf.tags?.includes('webhook') ||
      wf.name.toLowerCase().includes('wazuh') ||
      wf.name.toLowerCase().includes('siem') ||
      wf.name.toLowerCase().includes('triage')
    const isBlock   = wf.tags?.includes('block') || wf.name.toLowerCase().includes('block')
    const isEscalate = wf.tags?.includes('escalate') || wf.name.toLowerCase().includes('escalat')
    const color = isBlock ? SEV_COLOR.critical : isEscalate ? '#F59E0B' : isWebhook ? '#14B8A6' : BRAND.purple
    const triggerType = isWebhook ? 'Webhook' : 'Manual'
    return { color, triggerType, isBlock, isEscalate, isWebhook }
  }

  return (
    <Stack spacing={2.5} className="animate-fade-in">
      {/* Header */}
      <Box className="flex items-center justify-between flex-wrap gap-2">
        <Box className="flex items-center gap-2">
          <WorkspacesRoundedIcon sx={{ fontSize: 18, color: '#14B8A6' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: isDark ? '#E2E8F0' : '#1A1033' }}>
            Automation Workflows
          </Typography>
          <Box className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            sx={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }}>
            {workflows.length} workflows
          </Box>
        </Box>
        {shuffleUrl && (
          <Link href={shuffleUrl} target="_blank" rel="noopener" underline="none"
            className="flex items-center gap-1 text-xs font-semibold"
            sx={{ color: '#14B8A6', '&:hover': { color: '#2DD4BF' } }}>
            Open Shuffle SOAR <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
          </Link>
        )}
      </Box>

      {isLoading ? (
        <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} height={140} sx={{ borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.05)' }} />)}
        </Box>
      ) : workflows.length === 0 ? (
        <Box className="py-16 flex flex-col items-center gap-3">
          <WorkspacesRoundedIcon sx={{ fontSize: 40, color: textMuted, opacity: 0.4 }} />
          <Typography sx={{ fontSize: 13, color: textMuted }}>No workflows found</Typography>
        </Box>
      ) : (
        <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {workflows.map((wf) => {
            const { color, triggerType, isBlock, isEscalate } = getWfMeta(wf)
            const actionCount = typeof (wf as unknown as Record<string,unknown>).actions === 'number'
              ? (wf as unknown as Record<string,unknown>).actions as number
              : wf.name.includes('Triage') ? 5 : wf.name.includes('SIEM') ? 1 : 2
            return (
              <Box key={wf.id} className="rounded-2xl overflow-hidden transition-all duration-200 group"
                sx={{
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'}`,
                  '&:hover': {
                    border: `1px solid rgba(${hexRgb(color)},0.3)`,
                    boxShadow: `0 4px 20px rgba(${hexRgb(color)},0.1)`,
                  },
                }}>
                {/* Color strip */}
                <Box className="h-0.5" sx={{ background: `linear-gradient(90deg,${color}80,${color})` }} />

                <Box className="p-4">
                  {/* Header row */}
                  <Box className="flex items-start justify-between gap-2 mb-2.5">
                    <Box className="flex items-center gap-2.5">
                      <Box className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        sx={{ background: `rgba(${hexRgb(color)},0.12)` }}>
                        <WorkspacesRoundedIcon sx={{ fontSize: 18, color }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033', lineHeight: 1.3 }}>
                          {wf.name}
                        </Typography>
                        <Typography className="font-mono text-[9px] mt-0.5" sx={{ color: textMuted }}>
                          {wf.id.slice(0, 8)}…
                        </Typography>
                      </Box>
                    </Box>
                    {/* Status badge */}
                    <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                      sx={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                      <FiberManualRecordRoundedIcon sx={{ fontSize: 6, color: '#22C55E' }} />
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#22C55E' }}>ACTIVE</Typography>
                    </Box>
                  </Box>

                  {/* Description */}
                  {wf.description && (
                    <Typography sx={{ fontSize: 11, color: textSec, lineHeight: 1.5, mb: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {wf.description}
                    </Typography>
                  )}

                  {/* Meta row */}
                  <Box className="flex items-center gap-2 flex-wrap mb-3">
                    {/* Trigger type */}
                    <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                      sx={{ background: `rgba(${hexRgb(color)},0.1)`, border: `1px solid rgba(${hexRgb(color)},0.25)` }}>
                      {triggerType === 'Webhook'
                        ? <WebhookRoundedIcon sx={{ fontSize: 11, color }} />
                        : <TouchAppRoundedIcon sx={{ fontSize: 11, color }} />
                      }
                      <Typography sx={{ fontSize: 9.5, fontWeight: 700, color }}>{triggerType}</Typography>
                    </Box>
                    {/* Action count */}
                    <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                      sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)',
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(123,91,164,0.15)' }}>
                      <BarChartRoundedIcon sx={{ fontSize: 11, color: textMuted }} />
                      <Typography sx={{ fontSize: 9.5, fontWeight: 600, color: textMuted }}>{actionCount} actions</Typography>
                    </Box>
                    {/* Tags */}
                    {wf.tags?.slice(0, 2).map(tag => (
                      <Box key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                        sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)',
                              color: textMuted }}>
                        {tag}
                      </Box>
                    ))}
                  </Box>

                  {/* Action button */}
                  {triggerType === 'Webhook' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PlayArrowRoundedIcon sx={{ fontSize: 14 }} />}
                      disabled={triggerMut.isPending}
                      onClick={() => triggerMut.mutate({ type: isBlock ? 'block' : isEscalate ? 'escalate' : 'triage', payload: { workflow_id: wf.id } })}
                      sx={{
                        borderRadius: 2, fontSize: 11, fontWeight: 700, py: 0.5, px: 2,
                        borderColor: `rgba(${hexRgb(color)},0.4)`, color,
                        '&:hover': { borderColor: color, background: `rgba(${hexRgb(color)},0.08)` },
                      }}>
                      Trigger
                    </Button>
                  )}
                  {triggerType === 'Manual' && (
                    <Box className="px-2.5 py-1 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1"
                      sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)',
                            color: textMuted, border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(123,91,164,0.12)' }}>
                      <TouchAppRoundedIcon sx={{ fontSize: 12 }} />
                      Manual trigger only
                    </Box>
                  )}
                </Box>
              </Box>
            )
          })}
        </Box>
      )}
    </Stack>
  )
}

// ── MISP Tab ──────────────────────────────────────────────────────────────────
function MISPTab({ mispUrl }: { mispUrl?: string }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const [query, setQuery] = useState('')
  const [iocType, setIocType] = useState('')
  const [searched, setSearched] = useState(false)
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)'
  const cardBord  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'
  const divider   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.07)'
  const headBg    = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)'
  const rowAlt    = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(123,91,164,0.015)'
  const rowHover  = isDark ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.04)'

  const { data: mispStats, isLoading: statsLoading } = useQuery({
    queryKey: ['misp-stats'],
    queryFn: () => soarApi.getMispStats().then(r => r.data),
    staleTime: 300000,
    refetchInterval: 300000,
  })

  const { data: searchResp, isLoading: searchLoading, refetch: doSearch } = useQuery({
    queryKey: ['misp-search', query, iocType],
    queryFn: () => soarApi.searchMisp(query, iocType || undefined).then(r => r.data),
    enabled: false,
  })

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    setSearched(true)
    doSearch()
  }, [query, doSearch])

  const attrs: MispAttribute[] = searchResp?.response?.Attribute ?? []
  const byType: Record<string, string | number> = mispStats?.by_type ?? {}
  const statsError = !mispStats?.connected && mispStats?.error
  const statsAvailable = mispStats?.stats_available !== false

  const IOC_TYPES = [
    { value: '',          label: 'All types' },
    { value: 'ip-dst',   label: 'IP (Destination)' },
    { value: 'ip-src',   label: 'IP (Source)' },
    { value: 'domain',   label: 'Domain' },
    { value: 'url',      label: 'URL' },
    { value: 'md5',      label: 'MD5 Hash' },
    { value: 'sha256',   label: 'SHA-256' },
    { value: 'email-src', label: 'Email' },
  ]

  return (
    <Stack spacing={3} className="animate-fade-in">
      {/* Stats cards */}
      <Box className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Box className="rounded-2xl p-3.5" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: '#14B8A6', mb: 0.5, textTransform: 'uppercase' }}>
            Total IOCs
          </Typography>
          {statsLoading
            ? <Skeleton width={48} height={32} />
            : <Typography sx={{ fontSize: 26, fontWeight: 900, color: '#14B8A6', fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1 }}>
                {statsAvailable ? fmtN(mispStats?.total_iocs ?? 0) : 'Live'}
              </Typography>
          }
          <Typography sx={{ fontSize: 10, color: textMuted, mt: 0.5 }}>
            {mispStats?.version ? `MISP ${mispStats.version}` : (statsAvailable ? 'all categories' : 'search ready')}
          </Typography>
        </Box>
        {Object.entries(byType).slice(0, 3).map(([type, count]) => (
          <Box key={type} className="rounded-2xl p-3.5" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
            <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: BRAND.purple, mb: 0.5, textTransform: 'uppercase' }}>
              {type}
            </Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 900, color: BRAND.purple, fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1 }}>
              {fmtN(parseInt(count as string))}
            </Typography>
            <Typography sx={{ fontSize: 10, color: textMuted, mt: 0.5 }}>IOC entries</Typography>
          </Box>
        ))}
      </Box>

      {statsError && (
        <MuiAlert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
          {statsError}
        </MuiAlert>
      )}

      {/* Search bar */}
      <Box className="flex flex-wrap gap-2 items-stretch">
        <TextField
          size="small"
          placeholder="Search IOC: IP, domain, hash, URL…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          sx={{
            flex: 1, minWidth: 220,
            '& .MuiOutlinedInput-root': {
              fontSize: 13, borderRadius: '12px',
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.9)',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 16, color: textMuted }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ fontSize: 12 }}>IOC Type</InputLabel>
          <Select value={iocType} onChange={e => setIocType(e.target.value)} label="IOC Type"
            sx={{ fontSize: 12, borderRadius: '12px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.9)' }}>
            {IOC_TYPES.map(t => <MenuItem key={t.value} value={t.value} sx={{ fontSize: 12 }}>{t.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" size="small"
          onClick={handleSearch}
          disabled={!query.trim() || searchLoading}
          sx={{
            background: '#14B8A6', '&:hover': { background: '#0D9488' },
            borderRadius: '12px', height: 40, px: 3, fontWeight: 700, fontSize: 12,
            '&:disabled': { background: 'rgba(20,184,166,0.3)' },
          }}>
          {searchLoading ? <CircularProgress size={14} color="inherit" /> : 'Search'}
        </Button>
        {mispUrl && (
          <Link href={mispUrl} target="_blank" rel="noopener" underline="none"
            className="flex items-center gap-1 self-center px-3 text-xs font-semibold"
            sx={{ color: '#14B8A6', '&:hover': { color: '#2DD4BF' } }}>
            Open MISP <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
          </Link>
        )}
      </Box>

      {/* Results */}
      {searched && (
        searchLoading ? (
          <Stack spacing={1}>{[1,2,3].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />)}</Stack>
        ) : attrs.length === 0 ? (
          <Box className="py-12 flex flex-col items-center gap-3 rounded-2xl"
            sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
            <BugReportRoundedIcon sx={{ fontSize: 36, color: textMuted, opacity: 0.5 }} />
            <Typography sx={{ fontSize: 13, color: textMuted }}>No IOC matches found</Typography>
            <Typography sx={{ fontSize: 11, color: textMuted, opacity: 0.7 }}>
              Try a different query or check the MISP database
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography sx={{ fontSize: 11, color: textSec, mb: 1.5 }}>
              Found <Box component="span" sx={{ fontWeight: 700, color: '#14B8A6' }}>{attrs.length}</Box> results
            </Typography>
            <Box className="rounded-xl overflow-hidden" sx={{ border: `1px solid ${divider}` }}>
              <Box sx={{ overflowX: 'auto' }} className="scrollbar-thin">
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow sx={{ background: headBg }}>
                      {['VALUE', 'TYPE', 'CATEGORY', 'EVENT', 'IDS FLAG'].map(h => (
                        <TableCell key={h} sx={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: textMuted,
                          borderBottom: `1px solid ${divider}`, py: 1, px: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attrs.map((a, i) => (
                      <TableRow key={a.id} sx={{
                        background: i % 2 === 0 ? rowAlt : 'transparent',
                        '&:hover': { background: rowHover },
                        '& td': { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)'}` },
                      }}>
                        <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 280 }}>
                          <Typography className="font-mono text-[11px] break-all" sx={{ color: SEV_COLOR.high }}>
                            {a.value}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Box className="px-1.5 py-0.5 rounded text-[9px] font-semibold inline-flex"
                            sx={{ background: 'rgba(20,184,166,0.12)', color: '#14B8A6' }}>
                            {a.type}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Typography className="text-[10px]" sx={{ color: textSec }}>{a.category}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Typography className="font-mono text-[10px]" sx={{ color: BRAND.purple }}>#{a.event_id}</Typography>
                          {a.Event?.info && (
                            <Typography className="text-[9px] truncate" sx={{ color: textMuted, maxWidth: 160 }}>{a.Event.info}</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Box className="px-1.5 py-0.5 rounded text-[9px] font-bold inline-flex"
                            sx={a.to_ids
                              ? { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }
                              : { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)', color: textMuted }}>
                            {a.to_ids ? 'IDS' : 'Info'}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          </Box>
        )
      )}
    </Stack>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SOARPage() {
  const [activeTab, setActiveTab] = useState(0)
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['soar-stats'],
    queryFn: () => soarApi.getStats().then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: alertsResp } = useQuery({
    queryKey: ['iris-alerts'],
    queryFn: () => soarApi.getIrisAlerts({ per_page: 50 }).then(r => r.data),
    enabled: activeTab === 0,
    refetchInterval: 60000,
  })

  const iris    = stats?.iris    ?? {}
  const shuffle = stats?.shuffle ?? {}
  const alerts: IrisAlert[] = alertsResp?.data?.alerts ?? []

  const TABS = [
    { label: 'Overview',    icon: <BarChartRoundedIcon sx={{ fontSize: 15 }} /> },
    { label: 'DFIR-IRIS',   icon: <NotificationsActiveRoundedIcon sx={{ fontSize: 15 }} />, badge: iris.open_alerts },
    { label: 'Shuffle SOAR', icon: <WorkspacesRoundedIcon sx={{ fontSize: 15 }} /> },
    { label: 'MISP IOC',    icon: <ShieldRoundedIcon sx={{ fontSize: 15 }} /> },
  ]

  return (
    <PageShell
      title="SOAR & Incident Response"
      subtitle="Shuffle SOAR · DFIR-IRIS · MISP Threat Intelligence"
      breadcrumbs={[{ label: 'SECURITY OPERATIONS' }, { label: 'SOAR & IR' }]}
      status={iris.connected && shuffle.connected ? 'live' : 'offline'}
      statusLabel={iris.connected && shuffle.connected ? 'CONNECTED' : 'PARTIAL'}
      actions={
        <Box className="flex items-center gap-2 flex-wrap">
          <StatusPill ok={!!iris.connected}    label={`IRIS${iris.connected ? '' : ' OFFLINE'}`} />
          <StatusPill ok={!!shuffle.connected} label={`SHUFFLE${shuffle.connected ? '' : ' OFFLINE'}`} />
        </Box>
      }
    >
      {/* Metric cards */}
      <Box className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricCard title="IRIS Alerts"   value={statsLoading ? undefined : (iris.total_alerts ?? 0)}
          loading={statsLoading} color={BRAND.purple} icon={<NotificationsActiveRoundedIcon />}
          subtitle={`${iris.open_alerts ?? 0} open`} accent />
        <MetricCard title="IRIS Cases"    value={statsLoading ? undefined : (iris.total_cases ?? 0)}
          loading={statsLoading} color="#6366F1" icon={<FolderOpenRoundedIcon />}
          subtitle="active cases" accent />
        <MetricCard title="Workflows"     value={statsLoading ? undefined : (shuffle.total_workflows ?? 0)}
          loading={statsLoading} color="#14B8A6" icon={<WorkspacesRoundedIcon />}
          subtitle="automated" accent />
        <MetricCard title="SOAR Status"   value={iris.connected && shuffle.connected ? 'OK' : 'ERR'}
          loading={false} color={iris.connected && shuffle.connected ? '#22C55E' : SEV_COLOR.critical}
          icon={<SecurityRoundedIcon />} subtitle="integration health" accent />
      </Box>

      {/* Main panel */}
      <Box className="rounded-2xl overflow-hidden"
        sx={{
          background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.9)',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(123,91,164,0.12)',
          backdropFilter: 'blur(12px)',
        }}>
        {/* Tab bar */}
        <Box sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.1)'}` }}>
          <Box className="flex items-center gap-0 px-2 pt-1 overflow-x-auto scrollbar-hide">
            {TABS.map((tab, i) => (
              <Box key={tab.label}
                onClick={() => setActiveTab(i)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 cursor-pointer select-none transition-all duration-150 whitespace-nowrap relative shrink-0"
                sx={{
                  color: activeTab === i ? BRAND.purple : textMuted,
                  fontWeight: activeTab === i ? 700 : 500,
                  fontSize: 12.5,
                  '&::after': activeTab === i ? {
                    content: '""', position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                    background: BRAND.purple, borderRadius: '2px 2px 0 0',
                  } : {},
                  '&:hover': activeTab !== i ? { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)' } : {},
                }}>
                {tab.icon}
                {tab.label}
                {tab.badge > 0 && (
                  <Box className="px-1.5 rounded-full text-[9px] font-bold"
                    sx={{ background: `rgba(${hexRgb(SEV_COLOR.high)},0.2)`, color: SEV_COLOR.high }}>
                    {tab.badge}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Tab content */}
        <Box className="p-4 sm:p-5">
          {activeTab === 0 && <OverviewTab alerts={alerts} loading={!alertsResp && statsLoading} />}
          {activeTab === 1 && <IRISTab irisUrl={iris.iris_url} />}
          {activeTab === 2 && <ShuffleTab shuffleUrl={shuffle.shuffle_url} />}
          {activeTab === 3 && <MISPTab mispUrl="https://10.251.151.15:4430" />}
        </Box>
      </Box>
    </PageShell>
  )
}
