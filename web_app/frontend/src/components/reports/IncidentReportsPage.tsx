import React, { useState, useMemo, useCallback } from 'react'
import {
  Box, Typography, Chip, Button, FormControl, Select, MenuItem,
  Skeleton, TextField, InputAdornment, Tooltip, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow,
  LinearProgress, Collapse, Card, useTheme,
} from '@mui/material'
import SearchRoundedIcon        from '@mui/icons-material/SearchRounded'
import RefreshRoundedIcon       from '@mui/icons-material/RefreshRounded'
import FilterListRoundedIcon    from '@mui/icons-material/FilterListRounded'
import DownloadRoundedIcon      from '@mui/icons-material/DownloadRounded'
import TableChartRoundedIcon    from '@mui/icons-material/TableChartRounded'
import AssignmentLateRoundedIcon from '@mui/icons-material/AssignmentLateRounded'
import WarningAmberRoundedIcon  from '@mui/icons-material/WarningAmberRounded'
import ErrorRoundedIcon         from '@mui/icons-material/ErrorRounded'
import CheckCircleRoundedIcon   from '@mui/icons-material/CheckCircleRounded'
import OpenInNewRoundedIcon     from '@mui/icons-material/OpenInNewRounded'
import FlagRoundedIcon          from '@mui/icons-material/FlagRounded'
import ShieldRoundedIcon        from '@mui/icons-material/ShieldRounded'
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded'
import ContentCopyRoundedIcon   from '@mui/icons-material/ContentCopyRounded'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow, subDays, subHours } from 'date-fns'
import { th } from 'date-fns/locale'
import { useSnackbar } from 'notistack'
import { reportsApi } from '../../services/api'
import { PageShell } from '../ui/layout'
import { SectionCard } from '../ui/SectionCard'
import {
  BRAND, SEV_COLOR, fmtN, sevColor, sevLabelShort, getChartTipStyle, getBorder,
} from '../ui/tokens'

// ─── Color helpers ─────────────────────────────────────────────────────────────
const C = {
  critical: SEV_COLOR.critical,
  high:     SEV_COLOR.high,
  medium:   SEV_COLOR.medium,
  low:      SEV_COLOR.low,
  brand:    BRAND.primary,
  brandL:   BRAND.primaryLight,
}

function levelFromInt(lv: number) {
  if (lv >= 15) return { label: 'Critical', color: C.critical, short: 'CRIT' }
  if (lv >= 12) return { label: 'High',     color: C.high,     short: 'HIGH' }
  if (lv >= 7)  return { label: 'Medium',   color: C.medium,   short: 'MED'  }
  return              { label: 'Low',       color: C.low,      short: 'LOW'  }
}

const TIME_OPTS = [
  { value: '24h', label: 'ย้อนหลัง 24 ชั่วโมง' },
  { value: '7d',  label: 'ย้อนหลัง 7 วัน' },
  { value: '30d', label: 'ย้อนหลัง 30 วัน' },
]

// ─── Sparkline mini chart ──────────────────────────────────────────────────────
function Spark({ data, color, w = 80, h = 26 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) =>
    `${((i / (data.length - 1)) * w).toFixed(1)},${(h - (v / max) * (h - 3) - 1.5).toFixed(1)}`
  ).join(' ')
  const area = `M 0,${h} L ${pts.split(' ').join(' L ')} L ${w},${h} Z`
  const gid = `spk${color.replace('#', '')}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label, labelTh, value, color, icon, pct, spark, isLoading, onClick,
}: {
  label: string; labelTh: string; value: number; color: string;
  icon: React.ReactNode; pct?: string; spark?: number[]; isLoading: boolean
  onClick?: () => void
}) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative', overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: '16px',
        p: { xs: '14px 14px 12px', md: '18px 18px 14px' },
        border: `1px solid ${color}28`,
        background: isDark
          ? `linear-gradient(145deg, ${color}1A 0%, rgba(15,18,32,0.9) 60%)`
          : `linear-gradient(145deg, ${color}0E 0%, rgba(255,255,255,0.95) 60%)`,
        boxShadow: isDark
          ? `0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
          : `0 2px 12px ${color}14, 0 1px 3px rgba(0,0,0,0.06)`,
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        '&::before': {
          content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: `linear-gradient(90deg, ${color} 0%, ${color}70 100%)`,
          boxShadow: `0 0 10px ${color}60`,
        },
        '&:hover': onClick ? {
          transform: 'translateY(-3px)',
          border: `1px solid ${color}45`,
          boxShadow: isDark
            ? `0 10px 28px rgba(0,0,0,0.5), 0 0 0 1px ${color}18`
            : `0 8px 24px ${color}20`,
        } : {},
      }}
    >
      {/* Watermark icon */}
      <Box sx={{
        position: 'absolute', bottom: -12, right: -6, opacity: 0.07,
        color, fontSize: 68, display: 'flex', userSelect: 'none',
      }}>
        {icon}
      </Box>

      {/* Label row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, position: 'relative', zIndex: 1 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color }}>
          {label}
        </Typography>
        <Box sx={{ width: 22, height: 22, borderRadius: '7px', bgcolor: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ fontSize: 13, color, display: 'flex', '& svg': { fontSize: 13 } }}>{icon}</Box>
        </Box>
      </Box>

      {/* Value */}
      {isLoading
        ? <Skeleton width={72} height={40} sx={{ borderRadius: '8px', bgcolor: `${color}15` }} />
        : <Typography sx={{
            fontSize: { xs: '1.75rem', md: '2.1rem' }, fontWeight: 900, color,
            lineHeight: 1, letterSpacing: '-0.04em', position: 'relative', zIndex: 1,
            fontFamily: '"IBM Plex Mono",monospace',
            textShadow: isDark ? `0 0 18px ${color}40` : 'none',
          }}>
            {fmtN(value)}
          </Typography>
      }

      {/* Bottom row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 1, position: 'relative', zIndex: 1, gap: 1 }}>
        <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500 }}>
          {labelTh}{pct ? ` · ${pct}` : ''}
        </Typography>
        {!isLoading && spark && <Spark data={spark} color={color} w={60} h={22} />}
      </Box>
    </Box>
  )
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ caseInfo }: { caseInfo: string }) {
  if (!caseInfo || caseInfo === 'No Case') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: '6px', bgcolor: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)' }}>
        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#94A3B8' }} />
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>ไม่มีเคส</Typography>
      </Box>
    )
  }
  const isOpen = caseInfo.toLowerCase().includes('open')
  const color = isOpen ? C.high : C.low
  const label = isOpen ? 'เปิดเคส' : 'ปิดแล้ว'
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: '6px', bgcolor: `${color}14`, border: `1px solid ${color}30` }}>
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 5px ${color}80` }} />
      <Typography sx={{ fontSize: 10, fontWeight: 700, color }}>{label}</Typography>
    </Box>
  )
}

// ─── Actions badge ─────────────────────────────────────────────────────────────
function ActionsBadge({ actions }: { actions: string }) {
  if (!actions || actions === '-') {
    return <Typography sx={{ fontSize: 11, color: 'text.disabled', fontStyle: 'italic' }}>—</Typography>
  }
  const count = actions.split(' | ').length
  const color = count >= 3 ? C.low : count >= 1 ? BRAND.primaryLight : '#94A3B8'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
      <Box sx={{ px: 0.8, py: 0.2, borderRadius: '5px', bgcolor: `${color}14`, border: `1px solid ${color}28` }}>
        <Typography sx={{ fontSize: 9.5, fontWeight: 800, color, fontFamily: '"IBM Plex Mono",monospace' }}>
          {count} actions
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
        {actions.split(' | ')[0]}
        {count > 1 ? ` +${count - 1} อื่นๆ` : ''}
      </Typography>
    </Box>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function IncidentReportsPage() {
  const qc = useQueryClient()
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()

  const [timeRange, setTimeRange]   = useState('7d')
  const [search, setSearch]         = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [exporting, setExporting]   = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [caseFilter, setCaseFilter] = useState<string>('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // ── Data fetch ────────────────────────────────────────────────────────────────
  const { data: raw = [], isLoading, isError, refetch, dataUpdatedAt } = useQuery<any[]>({
    queryKey: ['reports', 'incidentCases', timeRange],
    queryFn: async () => {
      const res = await reportsApi.getIncidentCases(timeRange, 500)
      return res.data?.data || []
    },
    staleTime: 60_000,
  })

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!raw.length) return { critical: 0, high: 0, withCase: 0, withActions: 0, total: 0 }
    const critical    = raw.filter(r => Number(r.level) >= 15).length
    const high        = raw.filter(r => Number(r.level) >= 12 && Number(r.level) < 15).length
    const withCase    = raw.filter(r => r.case_info && r.case_info !== 'No Case').length
    const withActions = raw.filter(r => r.actions_taken && r.actions_taken !== '-').length
    return { critical, high, withCase, withActions, total: raw.length }
  }, [raw])

  // Build hourly timeline from data
  const timeline = useMemo(() => {
    if (!raw.length) return []
    const buckets: Record<string, { crit: number; high: number; total: number }> = {}
    raw.forEach(r => {
      try {
        const dt  = new Date(r.timestamp)
        const key = format(dt, 'MM/dd HH:00')
        if (!buckets[key]) buckets[key] = { crit: 0, high: 0, total: 0 }
        buckets[key].total++
        if (Number(r.level) >= 15) buckets[key].crit++
        else if (Number(r.level) >= 12) buckets[key].high++
      } catch {}
    })
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([time, v]) => ({ time, ...v }))
  }, [raw])

  // ── Filtered rows ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = raw
    if (severityFilter === 'critical')    rows = rows.filter(r => Number(r.level) >= 15)
    else if (severityFilter === 'high')   rows = rows.filter(r => Number(r.level) >= 12 && Number(r.level) < 15)
    if (caseFilter === 'with')    rows = rows.filter(r => r.case_info && r.case_info !== 'No Case')
    else if (caseFilter === 'none') rows = rows.filter(r => !r.case_info || r.case_info === 'No Case')
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        r.description?.toLowerCase().includes(q) ||
        r.srcip?.toLowerCase().includes(q) ||
        r.rule_id?.toString().includes(q) ||
        r.agent?.toLowerCase().includes(q) ||
        r.case_info?.toLowerCase().includes(q)
      )
    }
    return rows
  }, [raw, search, severityFilter, caseFilter])

  // ── Export ────────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async (fmt: 'csv' | 'excel') => {
    try {
      setExporting(fmt)
      const res = await reportsApi.exportIncidentCases(fmt, timeRange)
      const blob = new Blob([res.data], {
        type: fmt === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `incident-report-${timeRange}.${fmt === 'excel' ? 'xlsx' : 'csv'}`
      document.body.appendChild(a); a.click()
      window.URL.revokeObjectURL(url); a.remove()
      enqueueSnackbar(`Export ${fmt.toUpperCase()} สำเร็จ`, { variant: 'success' })
    } catch {
      enqueueSnackbar('Export ล้มเหลว กรุณาลองใหม่', { variant: 'error' })
    } finally {
      setExporting(null)
    }
  }, [timeRange, enqueueSnackbar])

  const commitSearch = () => setSearch(searchInput)

  // Spark seeds (last few time buckets)
  const critSpark = timeline.slice(-8).map(t => t.crit)
  const highSpark = timeline.slice(-8).map(t => t.high)
  const caseSpark = timeline.slice(-8).map((_, i) => i)

  const total = stats.total || 1

  // ─── Render ────────────────────────────────────────────────────────────────────
  return (
    <PageShell variant="console">

      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              รายงาน Incident
            </Typography>
            {/* HIGH+ badge */}
            <Box sx={{ px: 1, py: 0.3, borderRadius: '7px', bgcolor: `${C.high}15`, border: `1px solid ${C.high}40` }}>
              <Typography sx={{ fontSize: 9.5, fontWeight: 900, color: C.high, letterSpacing: '0.1em' }}>LEVEL 12+</Typography>
            </Box>
            {/* Linked to IRIS */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: '7px', bgcolor: `${BRAND.primary}12`, border: `1px solid ${BRAND.primary}30` }}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: BRAND.primaryLight, animation: 'pulseGlow 2s ease-in-out infinite' }} />
              <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: BRAND.primaryLight, letterSpacing: '0.06em' }}>
                DFIR-IRIS LINKED
              </Typography>
            </Box>
          </Box>
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.4, fontWeight: 500 }}>
            High & Critical Alerts (Wazuh Level 12+) · แสดง Actions ที่ดำเนินการ
            {dataUpdatedAt ? ` · อัพเดต ${formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true, locale: th })}` : ''}
          </Typography>
        </Box>

        {/* Right controls */}
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0 }}>
          <FormControl size="small">
            <Select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              sx={{ height: 32, fontSize: 11.5, minWidth: 170, '& .MuiOutlinedInput-notchedOutline': { borderColor: getBorder(isDark, 'default') } }}
            >
              {TIME_OPTS.map(t => <MenuItem key={t.value} value={t.value} sx={{ fontSize: 12 }}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>

          <Tooltip title="รีเฟรช">
            <IconButton
              size="small"
              onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['reports'] }) }}
              sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider', p: 0.75, '&:hover': { borderColor: BRAND.primary, color: BRAND.primary } }}
            >
              <RefreshRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Button
            size="small"
            variant="outlined"
            startIcon={exporting === 'excel' ? <LinearProgress sx={{ width: 12, height: 12 }} /> : <TableChartRoundedIcon sx={{ fontSize: 13 }} />}
            onClick={() => handleExport('excel')}
            disabled={!!exporting || isLoading}
            sx={{ borderRadius: '8px', fontSize: 11, py: 0.65, px: 1.25, borderColor: C.low, color: C.low, '&:hover': { borderColor: C.low, bgcolor: `${C.low}10` } }}
          >
            Excel
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={exporting === 'csv' ? <LinearProgress sx={{ width: 12, height: 12 }} /> : <DownloadRoundedIcon sx={{ fontSize: 13 }} />}
            onClick={() => handleExport('csv')}
            disabled={!!exporting || isLoading}
            sx={{ borderRadius: '8px', fontSize: 11, py: 0.65, px: 1.25 }}
          >
            CSV
          </Button>
        </Box>
      </Box>

      {/* ── KPI Cards ─────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1.5, mb: 2 }}>
        <KpiCard
          label="Critical" labelTh="วิกฤต (Lv 15+)"
          value={stats.critical} color={C.critical}
          icon={<ErrorRoundedIcon />}
          pct={total > 0 ? `${((stats.critical / total) * 100).toFixed(1)}%` : undefined}
          spark={critSpark} isLoading={isLoading}
          onClick={() => setSeverityFilter(f => f === 'critical' ? '' : 'critical')}
        />
        <KpiCard
          label="High" labelTh="สูง (Lv 12-14)"
          value={stats.high} color={C.high}
          icon={<WarningAmberRoundedIcon />}
          pct={total > 0 ? `${((stats.high / total) * 100).toFixed(1)}%` : undefined}
          spark={highSpark} isLoading={isLoading}
          onClick={() => setSeverityFilter(f => f === 'high' ? '' : 'high')}
        />
        <KpiCard
          label="มีเคส IRIS" labelTh="แมปกับ IRIS Case"
          value={stats.withCase} color={BRAND.primary}
          icon={<FlagRoundedIcon />}
          pct={total > 0 ? `${((stats.withCase / total) * 100).toFixed(1)}%` : undefined}
          spark={caseSpark} isLoading={isLoading}
          onClick={() => setCaseFilter(f => f === 'with' ? '' : 'with')}
        />
        <KpiCard
          label="Actions บันทึก" labelTh="มี Action ดำเนินการ"
          value={stats.withActions} color={C.low}
          icon={<PendingActionsRoundedIcon />}
          pct={total > 0 ? `${((stats.withActions / total) * 100).toFixed(1)}%` : undefined}
          spark={caseSpark} isLoading={isLoading}
        />
        <KpiCard
          label="Alert ทั้งหมด" labelTh="High+Critical รวม"
          value={stats.total} color={BRAND.primaryLight}
          icon={<AssignmentLateRoundedIcon />}
          spark={timeline.slice(-8).map(t => t.total)} isLoading={isLoading}
        />
      </Box>

      {/* ── Timeline Chart ────────────────────────────────────────────────────── */}
      {!isLoading && timeline.length > 0 && (
        <SectionCard
          title="แนวโน้มการแจ้งเตือน High & Critical"
          subtitle="จัดกลุ่มตามเวลา · ย้อนหลังตามช่วงที่เลือก"
          icon={<ShieldRoundedIcon sx={{ fontSize: 16 }} />}
          iconColor={C.critical}
          accent={C.critical}
          density="compact"
          className="mb-4"
        >
          <Box sx={{ pt: 1.5 }}>
            {/* Legend */}
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5, px: 0.5 }}>
              {[['Critical', C.critical], ['High', C.high]].map(([lbl, clr]) => (
                <Box key={lbl} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 10, height: 3, borderRadius: 2, bgcolor: clr }} />
                  <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{lbl}</Typography>
                </Box>
              ))}
            </Box>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.critical} stopOpacity={0.45} />
                    <stop offset="95%" stopColor={C.critical} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.high} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={C.high} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={isDark ? 'rgba(79,110,247,0.1)' : 'rgba(79,110,247,0.07)'} vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 9.5, fill: isDark ? '#64748B' : '#94A3B8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9.5, fill: isDark ? '#64748B' : '#94A3B8' }} axisLine={false} tickLine={false} width={38} />
                <RechartTip contentStyle={getChartTipStyle(isDark)} formatter={(v, n) => [fmtN(v as number), n]} />
                <Area type="monotone" dataKey="crit" name="Critical" stroke={C.critical} strokeWidth={2} fill="url(#gc)" dot={false} />
                <Area type="monotone" dataKey="high" name="High" stroke={C.high} strokeWidth={1.5} fill="url(#gh)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </SectionCard>
      )}

      {/* ── Filter & Table Card ───────────────────────────────────────────────── */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden', mt: 1 }}>
        {isLoading && <LinearProgress sx={{ height: 2, '& .MuiLinearProgress-bar': { bgcolor: BRAND.primary } }} />}

        {/* Toolbar */}
        <Box sx={{
          px: 2, py: 1.25,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1,
          borderBottom: '1px solid', borderColor: 'divider',
          background: isDark
            ? 'linear-gradient(90deg, rgba(79,110,247,0.04) 0%, transparent 100%)'
            : 'linear-gradient(90deg, rgba(79,110,247,0.02) 0%, transparent 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: BRAND.primary }} />
            <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>รายการ Incident</Typography>
            {!isLoading && (
              <Chip
                label={`${filtered.length.toLocaleString()} รายการ`}
                size="small"
                sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: `${BRAND.primary}14`, color: BRAND.primaryLight }}
              />
            )}
            {(severityFilter || caseFilter || search) && (
              <Chip
                label="ล้างตัวกรอง"
                size="small"
                onDelete={() => { setSeverityFilter(''); setCaseFilter(''); setSearch(''); setSearchInput('') }}
                sx={{ height: 20, fontSize: 9.5, bgcolor: 'rgba(239,68,68,0.1)', color: '#EF4444', '& .MuiChip-deleteIcon': { color: '#EF4444', fontSize: 12 } }}
              />
            )}
          </Box>

          {/* Search + filter */}
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="ค้นหา IP, Rule ID, Description..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commitSearch()}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 15, color: 'text.secondary' }} /></InputAdornment> }}
              sx={{ minWidth: 200, '& .MuiInputBase-input': { fontSize: 12, py: 0.65 } }}
            />
            <Tooltip title="ตัวกรองเพิ่มเติม">
              <IconButton
                size="small"
                onClick={() => setShowFilters(o => !o)}
                sx={{
                  borderRadius: '8px', border: '1px solid', p: 0.65,
                  borderColor: showFilters ? BRAND.primary : 'divider',
                  bgcolor: showFilters ? `${BRAND.primary}12` : 'transparent',
                  color: showFilters ? BRAND.primaryLight : 'text.secondary',
                }}
              >
                <FilterListRoundedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            <Button size="small" variant="contained" onClick={commitSearch}
              sx={{ borderRadius: '8px', fontSize: 11, py: 0.6, px: 1.5, bgcolor: BRAND.primary, '&:hover': { bgcolor: BRAND.primaryDark } }}>
              ค้นหา
            </Button>
          </Box>
        </Box>

        {/* Extended filters */}
        <Collapse in={showFilters}>
          <Box sx={{
            px: 2, py: 1.25, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center',
            borderBottom: '1px solid', borderColor: 'divider',
            bgcolor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(248,250,252,0.8)',
          }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mr: 0.5 }}>
              กรองตาม:
            </Typography>
            <FormControl size="small">
              <Select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                displayEmpty
                sx={{ fontSize: 11.5, height: 28, minWidth: 130 }}
              >
                <MenuItem value="" sx={{ fontSize: 12 }}>ทุกระดับ</MenuItem>
                <MenuItem value="critical" sx={{ fontSize: 12 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: C.critical }} />Critical (15+)
                  </Box>
                </MenuItem>
                <MenuItem value="high" sx={{ fontSize: 12 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: C.high }} />High (12–14)
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select
                value={caseFilter}
                onChange={e => setCaseFilter(e.target.value)}
                displayEmpty
                sx={{ fontSize: 11.5, height: 28, minWidth: 140 }}
              >
                <MenuItem value="" sx={{ fontSize: 12 }}>ทุก Case Status</MenuItem>
                <MenuItem value="with" sx={{ fontSize: 12 }}>มี IRIS Case</MenuItem>
                <MenuItem value="none" sx={{ fontSize: 12 }}>ไม่มี IRIS Case</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Collapse>

        {/* Active filter chips */}
        {(severityFilter || caseFilter) && (
          <Box sx={{ px: 2, py: 0.75, display: 'flex', gap: 0.5, alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 700, mr: 0.5 }}>กรองด้วย:</Typography>
            {severityFilter && (
              <Chip
                label={severityFilter === 'critical' ? 'Critical (15+)' : 'High (12-14)'}
                size="small"
                onDelete={() => setSeverityFilter('')}
                sx={{ height: 18, fontSize: 9.5, bgcolor: `${severityFilter === 'critical' ? C.critical : C.high}14`, color: severityFilter === 'critical' ? C.critical : C.high, '& .MuiChip-deleteIcon': { fontSize: 11, color: 'inherit' } }}
              />
            )}
            {caseFilter && (
              <Chip
                label={caseFilter === 'with' ? 'มี IRIS Case' : 'ไม่มี IRIS Case'}
                size="small"
                onDelete={() => setCaseFilter('')}
                sx={{ height: 18, fontSize: 9.5, bgcolor: `${BRAND.primary}14`, color: BRAND.primaryLight, '& .MuiChip-deleteIcon': { fontSize: 11, color: 'inherit' } }}
              />
            )}
          </Box>
        )}

        {/* Table */}
        <Box sx={{ overflow: 'auto' }} className="scrollbar-thin">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-stickyHeader': { bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider' } }}>
                {[
                  { label: 'วัน/เวลา',           w: 140 },
                  { label: 'ระดับ',               w: 80  },
                  { label: 'Rule ID',             w: 80  },
                  { label: 'คำอธิบาย',            flex: 1 },
                  { label: 'Source IP',           w: 130 },
                  { label: 'Agent',               w: 120 },
                  { label: 'IRIS Case',           w: 120 },
                  { label: 'Actions ที่ดำเนินการ', flex: 1.5 },
                ].map(col => (
                  <TableCell key={col.label} sx={{
                    fontSize: 9.5, fontWeight: 900, py: 1, color: 'text.disabled',
                    textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
                    width: col.w, bgcolor: isDark ? 'rgba(79,110,247,0.05)' : 'rgba(79,110,247,0.03)',
                  }}>
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j} sx={{ py: 1.25 }}>
                      <Skeleton height={14} sx={{ borderRadius: '4px' }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 8, textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: `${C.low}12`, border: `1px solid ${C.low}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircleRoundedIcon sx={{ fontSize: 28, color: C.low }} />
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: C.low }}>
                          {search || severityFilter || caseFilter ? 'ไม่พบข้อมูลที่ตรงกับตัวกรอง' : 'ไม่พบการแจ้งเตือนระดับสูง'}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }}>
                          {search || severityFilter || caseFilter ? 'ลองปรับตัวกรองหรือช่วงเวลา' : 'ระบบปลอดภัยในช่วงเวลานี้'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && filtered.map((row, idx) => {
                const lv   = Number(row.level || 0)
                const sev  = levelFromInt(lv)
                const rowId = `${row.timestamp}-${row.rule_id}-${idx}`
                const isExpanded = expandedRow === rowId
                const srcip = row.srcip || ''

                return (
                  <React.Fragment key={rowId}>
                    <TableRow
                      hover
                      onClick={() => setExpandedRow(isExpanded ? null : rowId)}
                      sx={{
                        cursor: 'pointer',
                        borderLeft: `3px solid ${sev.color}`,
                        bgcolor: lv >= 15 ? `${C.critical}04` : 'transparent',
                        transition: 'background 0.15s',
                        '&:hover': { bgcolor: `${BRAND.primary}07` },
                      }}
                    >
                      {/* Timestamp */}
                      <TableCell sx={{ py: 1.1, fontSize: 10.5, fontFamily: '"IBM Plex Mono"', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                        {row.timestamp ? (
                          <>
                            <Typography component="span" sx={{ display: 'block', fontSize: 10.5, fontFamily: '"IBM Plex Mono"' }}>
                              {format(new Date(row.timestamp), 'dd/MM/yy')}
                            </Typography>
                            <Typography component="span" sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>
                              {format(new Date(row.timestamp), 'HH:mm:ss')}
                            </Typography>
                          </>
                        ) : '—'}
                      </TableCell>

                      {/* Level badge */}
                      <TableCell sx={{ py: 1.1 }}>
                        <Box sx={{
                          display: 'inline-flex', alignItems: 'center', px: 0.9, py: 0.35, borderRadius: '6px',
                          bgcolor: `${sev.color}18`, border: `1px solid ${sev.color}35`,
                        }}>
                          <Typography sx={{ fontSize: 9.5, fontWeight: 900, color: sev.color, fontFamily: '"IBM Plex Mono"', lineHeight: 1 }}>
                            {lv} {sev.short}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Rule ID */}
                      <TableCell sx={{ py: 1.1 }}>
                        <Typography sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono"', color: BRAND.primaryLight, fontWeight: 600 }}>
                          {row.rule_id || '—'}
                        </Typography>
                      </TableCell>

                      {/* Description */}
                      <TableCell sx={{ py: 1.1, maxWidth: 0 }}>
                        <Typography sx={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                          {row.description || '—'}
                        </Typography>
                        {row.country && (
                          <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{row.country}</Typography>
                        )}
                      </TableCell>

                      {/* Source IP */}
                      <TableCell sx={{ py: 1.1 }}>
                        {srcip ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono"', color: C.high, fontWeight: 600 }}>
                              {srcip}
                            </Typography>
                            <Tooltip title="คัดลอก">
                              <IconButton size="small" sx={{ p: 0.2 }} onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(srcip); enqueueSnackbar('คัดลอกแล้ว', { variant: 'info', autoHideDuration: 1200 }) }}>
                                <ContentCopyRoundedIcon sx={{ fontSize: 10, color: 'text.disabled' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ) : <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>}
                      </TableCell>

                      {/* Agent */}
                      <TableCell sx={{ py: 1.1 }}>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
                          {row.agent || '—'}
                        </Typography>
                      </TableCell>

                      {/* IRIS Case */}
                      <TableCell sx={{ py: 1.1 }}>
                        <StatusBadge caseInfo={row.case_info} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell sx={{ py: 1.1, maxWidth: 0 }}>
                        <ActionsBadge actions={row.actions_taken} />
                      </TableCell>
                    </TableRow>

                    {/* Expanded row */}
                    <TableRow>
                      <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{
                            px: 3, py: 2,
                            bgcolor: isDark ? `${sev.color}06` : `${sev.color}04`,
                            borderBottom: `1px solid ${sev.color}20`,
                            borderLeft: `3px solid ${sev.color}`,
                          }}>
                            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {/* Left: Alert details */}
                              <Box sx={{ flex: '1 1 280px', minWidth: 0 }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1 }}>
                                  รายละเอียด Alert
                                </Typography>
                                {[
                                  ['Rule ID', row.rule_id],
                                  ['Level', `${lv} (${sev.label})`],
                                  ['Source IP', srcip || '—'],
                                  ['Country', row.country || '—'],
                                  ['Agent', row.agent || '—'],
                                  ['Source', row.source || '—'],
                                ].map(([k, v]) => (
                                  <Box key={k} sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
                                    <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600, minWidth: 90, flexShrink: 0 }}>{k}:</Typography>
                                    <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: k === 'Rule ID' || k === 'Source IP' ? '"IBM Plex Mono"' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {v || '—'}
                                    </Typography>
                                  </Box>
                                ))}
                                <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                                  <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600, minWidth: 90, flexShrink: 0 }}>Description:</Typography>
                                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{row.description || '—'}</Typography>
                                </Box>
                              </Box>

                              {/* Right: IRIS case + actions */}
                              <Box sx={{ flex: '1 1 280px', minWidth: 0 }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1 }}>
                                  IRIS Case & Actions
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, mb: 0.75 }}>
                                  <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600, minWidth: 90, flexShrink: 0 }}>Case Info:</Typography>
                                  <Typography sx={{ fontSize: 11, color: row.case_info === 'No Case' ? 'text.disabled' : BRAND.primaryLight }}>
                                    {row.case_info || 'ไม่มีเคส'}
                                  </Typography>
                                </Box>
                                {row.actions_taken && row.actions_taken !== '-' && (
                                  <Box>
                                    <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600, mb: 0.5 }}>Actions ดำเนินการ:</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                                      {row.actions_taken.split(' | ').map((a: string, i: number) => (
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                                          <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: C.low, mt: 0.4, flexShrink: 0 }} />
                                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{a.trim()}</Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </Box>

        {/* Footer */}
        {!isLoading && (
          <Box sx={{
            px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1px solid', borderColor: 'divider',
            bgcolor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(248,250,252,0.9)',
          }}>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
              แสดง {filtered.length.toLocaleString()} / {raw.length.toLocaleString()} รายการ
              {isError ? ' · ⚠ โหลดข้อมูลล้มเหลว' : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              {[
                ['', 'ทุกระดับ'],
                [C.critical, 'Critical'],
                [C.high, 'High'],
              ].map(([color, label]) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {color && <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: color }} />}
                  <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Card>
    </PageShell>
  )
}
