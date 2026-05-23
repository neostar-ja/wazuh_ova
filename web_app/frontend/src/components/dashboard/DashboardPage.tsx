import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  Box, Typography, Chip, Skeleton, Select, MenuItem, FormControl,
  Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Tooltip, useTheme, Button, Alert,
} from '@mui/material'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import StorageRoundedIcon              from '@mui/icons-material/StorageRounded'
import BoltRoundedIcon                 from '@mui/icons-material/BoltRounded'
import DevicesRoundedIcon              from '@mui/icons-material/DevicesRounded'
import SecurityRoundedIcon             from '@mui/icons-material/SecurityRounded'
import GppBadRoundedIcon               from '@mui/icons-material/GppBadRounded'
import ContentCopyRoundedIcon          from '@mui/icons-material/ContentCopyRounded'
import RouterRoundedIcon               from '@mui/icons-material/RouterRounded'
import PublicRoundedIcon               from '@mui/icons-material/PublicRounded'
import ErrorRoundedIcon                from '@mui/icons-material/ErrorRounded'
import OpenInNewRoundedIcon            from '@mui/icons-material/OpenInNewRounded'
import FiberManualRecordIcon           from '@mui/icons-material/FiberManualRecord'
import ShieldRoundedIcon               from '@mui/icons-material/ShieldRounded'
import RefreshRoundedIcon              from '@mui/icons-material/RefreshRounded'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import { dashboardApi, alertsApi } from '../../services/api'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import WorldMap from './WorldMap'
import { useSnackbar } from 'notistack'
import { PageHeader } from '../ui/PageHeader'
import { SectionCard } from '../ui/SectionCard'
import { BRAND, CHART_TIP_STYLE, PIE_COLORS, fmtN, sevColor, sevLabelShort } from '../ui/tokens'

// ─── Brand aliases ────────────────────────────────────────────────────────────
const B = {
  purple:  BRAND.purple,     purpleL: BRAND.purpleLight, purpleD: BRAND.purpleDark,
  orange:  BRAND.orange,     orangeL: BRAND.orangeLight,
  red:     '#EF4444',        yellow:  '#EAB308',         green:   '#22C55E',
  sky:     '#38BDF8',        pink:    '#EC4899',
}
const TIP = CHART_TIP_STYLE
const PIE = PIE_COLORS
const AUTO_MS = 30000

// ─── Helpers ──────────────────────────────────────────────────────────────────
const N  = fmtN
const LC = sevColor
const LL = sevLabelShort

// ─── Inline sparkline (pure SVG) ─────────────────────────────────────────────
interface SparkProps {
  data?: any[]
  color: string
  w?: number
  h?: number
}

function Spark({ data = [], color, w = 80, h = 28 }: SparkProps) {
  const vals = data.map(d => d.total || d.count || 0)
  if (vals.length < 2) return null
  const max = Math.max(...vals, 1)
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w
    const y = h - (v / max) * (h - 3) - 1.5
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const area = `M 0,${h} L ${pts.split(' ').map(p => p).join(' L ')} L ${w},${h} Z`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sp${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Metric Hero Card ─────────────────────────────────────────────────────────
interface MetricHeroProps {
  stats: any
  isLoading: boolean
  tl: any[]
  navigate: (path: string) => void
}

function MetricHero({ stats, isLoading, tl, navigate }: MetricHeroProps) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  const metrics = [
    { key: 'total',    label: 'Total Alerts', labelTh: 'รวมทั้งหมด', color: B.purple,  icon: '∑' },
    { key: 'critical', label: 'Critical',     labelTh: 'วิกฤต',       color: B.red,     icon: '⚡' },
    { key: 'high',     label: 'High',         labelTh: 'สูง',          color: B.orange,  icon: '▲' },
    { key: 'medium',   label: 'Medium',       labelTh: 'กลาง',         color: B.yellow,  icon: '◆' },
    { key: 'low',      label: 'Low',          labelTh: 'ต่ำ',          color: B.green,   icon: '●' },
  ] as const
  const total = (stats?.critical||0)+(stats?.high||0)+(stats?.medium||0)+(stats?.low||0)
  const vals: Record<string, number> = {
    total,
    critical: stats?.critical||0, high: stats?.high||0,
    medium: stats?.medium||0, low: stats?.low||0,
  }
  const navLevel = { critical: 15, high: 12, medium: 7, low: 1 } as const

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {metrics.map((m) => (
        <Box
          key={m.key}
          onClick={() => {
            if (m.key !== 'total') navigate(`/alerts?level=${navLevel[m.key as keyof typeof navLevel]}`)
            else navigate('/alerts')
          }}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            borderRadius: '16px',
            p: { xs: '14px 14px 12px', md: '18px 18px 14px' },
            border: `1px solid ${m.color}28`,
            background: isDark
              ? `linear-gradient(145deg, ${m.color}1A 0%, rgba(16,12,32,0.9) 60%)`
              : `linear-gradient(145deg, ${m.color}0E 0%, rgba(255,255,255,0.95) 60%)`,
            backdropFilter: isDark ? 'blur(20px)' : 'none',
            boxShadow: isDark
              ? `0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
              : `0 2px 12px ${m.color}14, 0 1px 3px rgba(0,0,0,0.06)`,
            transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
            '&::before': {
              content: '""',
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '4px',
              background: `linear-gradient(90deg, ${m.color} 0%, ${m.color}80 100%)`,
              boxShadow: `0 0 12px ${m.color}70`,
            },
            '&:hover': {
              transform: 'translateY(-4px)',
              border: `1px solid ${m.color}50`,
              boxShadow: isDark
                ? `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px ${m.color}20, inset 0 1px 0 rgba(255,255,255,0.06)`
                : `0 10px 28px ${m.color}22, 0 2px 6px rgba(0,0,0,0.08)`,
            },
          }}
        >
          {/* Large watermark number */}
          <Box sx={{
            position: 'absolute', bottom: -14, right: -8,
            fontSize: { xs: 60, md: 72 }, opacity: 0.07, color: m.color,
            fontWeight: 900, lineHeight: 1, userSelect: 'none',
            fontFamily: '"IBM Plex Mono", monospace',
          }}>
            {m.icon}
          </Box>

          {/* Label row */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, position: 'relative', zIndex: 1 }}>
            <Typography sx={{
              fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: m.color,
              textShadow: isDark ? `0 0 12px ${m.color}60` : 'none',
            }}>
              {m.label}
            </Typography>
            <Box sx={{
              width: 22, height: 22, borderRadius: '7px',
              bgcolor: `${m.color}18`,
              border: `1px solid ${m.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: 11, color: m.color, fontWeight: 800 }}>{m.icon}</Typography>
            </Box>
          </Box>

          {/* Value */}
          {isLoading ? (
            <Skeleton width={72} height={40} sx={{ borderRadius: '8px', bgcolor: `${m.color}15` }} />
          ) : (
            <Typography sx={{
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.2rem' },
              fontWeight: 900,
              color: m.color,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              position: 'relative', zIndex: 1,
              fontFamily: '"IBM Plex Mono", monospace',
              textShadow: isDark ? `0 0 20px ${m.color}40` : 'none',
            }}>
              {N(vals[m.key])}
            </Typography>
          )}

          {/* Bottom row: percent + sparkline */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 1.25, position: 'relative', zIndex: 1 }}>
            <Box>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500 }}>
                {m.key !== 'total' && total > 0
                  ? `${((vals[m.key]/total)*100).toFixed(1)}% ของทั้งหมด`
                  : 'แจ้งเตือนทั้งหมด'}
              </Typography>
            </Box>
            {!isLoading && <Spark data={tl} color={m.color} w={64} h={24} />}
          </Box>
        </Box>
      ))}
    </div>
  )
}

// ─── Timeline chart ───────────────────────────────────────────────────────────
interface TimelineProps {
  data?: any[]
  isLoading: boolean
  isDark: boolean
}

function Timeline({ data = [], isLoading, isDark }: TimelineProps) {
  if (isLoading) return <Skeleton variant="rectangular" height={240} sx={{ borderRadius: '12px' }} />
  if (!data.length) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 2 }}>
      <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: 'rgba(123,91,164,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(123,91,164,0.15)' }}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill={B.purple} opacity="0.5"><path d="M3.5 18.5l6-6 4 4 7-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 600 }}>ยังไม่มีข้อมูล Timeline</Typography>
        <Typography sx={{ color: 'text.disabled', fontSize: 11, mt: 0.5 }}>ลองเปลี่ยนช่วงเวลา หรือรอข้อมูลใหม่</Typography>
      </Box>
    </Box>
  )
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
        <defs>
          {[
            ['gt', B.purple, 0.22], ['gc', B.red, 0.50],
            ['gh', B.orange, 0.38], ['gm', B.yellow, 0.28],
          ].map(([id, c, o]) => (
            <linearGradient key={id as string} id={id as string} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"   stopColor={c as string} stopOpacity={o as number} />
              <stop offset="95%"  stopColor={c as string} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke={isDark ? 'rgba(123,91,164,0.1)' : 'rgba(123,91,164,0.08)'} vertical={false} />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: isDark ? '#6B5F8A' : '#9B90B5' }} axisLine={false} tickLine={false}
          tickFormatter={t => { try { return format(new Date(t), 'HH:mm') } catch { return '' } }}
          interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: isDark ? '#6B5F8A' : '#9B90B5' }} axisLine={false} tickLine={false} tickFormatter={N} width={44} />
        <RechartTip contentStyle={TIP} formatter={(v, n) => [N(v as number), n]}
          labelFormatter={l => { try { return format(new Date(l), 'dd/MM HH:mm') } catch { return l } }} />
        <Area type="monotone" dataKey="total"    name="Total"    stroke={B.purple} strokeWidth={2.5} fill="url(#gt)" dot={false} />
        <Area type="monotone" dataKey="critical" name="Critical" stroke={B.red}    strokeWidth={1.5} fill="url(#gc)" dot={false} />
        <Area type="monotone" dataKey="high"     name="High"     stroke={B.orange} strokeWidth={1.5} fill="url(#gh)" dot={false} />
        <Area type="monotone" dataKey="medium"   name="Medium"   stroke={B.yellow} strokeWidth={1}   fill="url(#gm)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────
interface PanelProps {
  title: string
  icon?: React.ReactNode
  iconColor?: string
  action?: React.ReactNode
  children: React.ReactNode
  accent?: string
  className?: string
  noPad?: boolean
}

function Panel({ title, icon, iconColor, action, children, accent, className = '', noPad = false }: PanelProps) {
  return (
    <SectionCard
      title={title}
      icon={icon}
      iconColor={iconColor}
      action={action}
      accent={accent}
      noPad={noPad}
      className={className}
    >
      {children}
    </SectionCard>
  )
}

// ─── Top-N horizontal bar ────────────────────────────────────────────────────
interface HBarItem {
  name: string
  count: number
}

interface HBarProps {
  items?: HBarItem[]
  isLoading: boolean
  limit?: number
  colorFn?: (index: number, item: HBarItem) => string
  mono?: boolean
}

function HBar({ items = [], isLoading, limit = 8, colorFn, mono }: HBarProps) {
  if (isLoading) return (
    <div className="flex flex-col gap-2.5">
      {Array.from({length:5}).map((_,i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton height={28} sx={{ flex: 1, borderRadius: '8px' }} />
        </Box>
      ))}
    </div>
  )
  if (!items.length) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 5, gap: 1.5 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(123,91,164,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GppBadRoundedIcon sx={{ fontSize: 22, color: 'text.disabled', opacity: 0.5 }} />
      </Box>
      <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 500 }}>ยังไม่มีข้อมูล</Typography>
    </Box>
  )
  const max = Math.max(...items.map(i => i.count), 1)
  return (
    <div className="flex flex-col gap-2.5">
      {items.slice(0, limit).map((item, i) => {
        const pct = Math.round((item.count / max) * 100)
        const color = colorFn ? colorFn(i, item) : B.purple
        return (
          <Box key={item.name || i} sx={{
            p: '7px 10px',
            borderRadius: '10px',
            bgcolor: `${color}08`,
            border: `1px solid ${color}15`,
            transition: 'all 0.2s ease',
            '&:hover': { bgcolor: `${color}12`, border: `1px solid ${color}28` },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                <Typography sx={{
                  color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: mono ? '"IBM Plex Mono",monospace' : 'inherit',
                  fontSize: mono ? 11 : 11.5, fontWeight: 500,
                }}>
                  {item.name || 'Unknown'}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color, ml: 1, flexShrink: 0, fontFamily: '"IBM Plex Mono",monospace' }}>
                {N(item.count)}
              </Typography>
            </Box>
            <Box sx={{ height: 6, borderRadius: '6px', bgcolor: `${color}15`, overflow: 'hidden' }}>
              <Box sx={{
                height: '100%', width: `${pct}%`, borderRadius: '6px',
                background: `linear-gradient(90deg, ${color} 0%, ${color}B0 100%)`,
                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: `0 0 10px ${color}60`,
              }} />
            </Box>
          </Box>
        )
      })}
    </div>
  )
}

// ─── Source donut ────────────────────────────────────────────────────────────
interface SourceDonutProps {
  data?: any[]
  isLoading: boolean
}

function SourceDonut({ data = [], isLoading }: SourceDonutProps) {
  if (isLoading) return <Skeleton variant="rectangular" height={200} sx={{ borderRadius: '12px' }} />
  if (!data.length) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 1.5 }}>
      <Box sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: 'rgba(123,91,164,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(123,91,164,0.15)' }}>
        <RouterRoundedIcon sx={{ fontSize: 24, color: B.purple, opacity: 0.5 }} />
      </Box>
      <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 500 }}>ยังไม่มีข้อมูล Log Source</Typography>
      <Typography sx={{ fontSize: 11, color: 'text.disabled', opacity: 0.6 }}>ตรวจสอบการส่ง log จาก agent</Typography>
    </Box>
  )
  const pd = data.slice(0, 7).map(s => ({ name: s.name?.split('-')[0] || s.name || '?', value: s.count }))
  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={pd} dataKey="value" cx="50%" cy="50%" outerRadius={68} innerRadius={36} paddingAngle={3}>
            {pd.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} stroke="transparent" />)}
          </Pie>
          <RechartTip contentStyle={TIP} formatter={(v) => [N(v as number), 'alerts']} />
        </PieChart>
      </ResponsiveContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1.5 }}>
        {pd.map((item, i) => (
          <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: '7px', '&:hover': { bgcolor: `${PIE[i%PIE.length]}0A` }, transition: 'background 0.15s' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: PIE[i%PIE.length], flexShrink: 0, boxShadow: `0 0 6px ${PIE[i%PIE.length]}60` }} />
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 500 }}>{item.name}</Typography>
            </Box>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: PIE[i%PIE.length], fontFamily: '"IBM Plex Mono",monospace' }}>{N(item.value)}</Typography>
          </Box>
        ))}
      </Box>
    </div>
  )
}

// ─── MITRE tactics ────────────────────────────────────────────────────────────
const TACTIC_COLORS: Record<string, string> = {
  'initial-access': B.red, 'execution': B.red, 'persistence': B.orange,
  'privilege-escalation': B.orange, 'defense-evasion': B.yellow,
  'credential-access': B.yellow, 'discovery': B.green,
  'lateral-movement': B.sky, 'collection': B.sky,
  'command-and-control': '#A855F7', 'exfiltration': '#A855F7', 'impact': B.pink,
}

interface MitreTacticsProps {
  data?: any[]
  isLoading: boolean
}

function MitreTactics({ data = [], isLoading }: MitreTacticsProps) {
  if (isLoading) return <div className="flex flex-col gap-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} height={26}/>)}</div>
  if (!data.length) return (
    <Box className="flex flex-col items-center justify-center py-6 gap-1">
      <SecurityRoundedIcon sx={{ fontSize: 28, color: 'text.disabled', opacity: 0.3 }} />
      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>ไม่พบ MITRE mapping ในข้อมูลนี้</Typography>
      <Typography sx={{ fontSize: 10, color: 'text.disabled', opacity: 0.6 }}>ตรวจสอบการตั้งค่า rule groups</Typography>
    </Box>
  )
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex flex-col gap-2">
      {data.slice(0,8).map(item => {
        const color = TACTIC_COLORS[item.name.toLowerCase()] || B.purple
        const pct = Math.round((item.count/max)*100)
        return (
          <Box key={item.name} sx={{
            p: '6px 10px',
            borderRadius: '9px',
            bgcolor: `${color}08`,
            border: `1px solid ${color}18`,
            transition: 'all 0.18s ease',
            '&:hover': { bgcolor: `${color}12` },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '3px', bgcolor: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'capitalize', fontWeight: 500 }}>{item.name}</Typography>
              </Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color, fontFamily: '"IBM Plex Mono",monospace' }}>{N(item.count)}</Typography>
            </Box>
            <Box sx={{ height: 5, borderRadius: '4px', bgcolor: `${color}18`, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: '4px', bgcolor: color, transition: 'width 0.7s ease', boxShadow: `0 0 8px ${color}60` }} />
            </Box>
          </Box>
        )
      })}
    </div>
  )
}

// ─── Cluster health ────────────────────────────────────────────────────────────
interface ClusterStatusProps {
  cluster: any
}

function ClusterStatus({ cluster }: ClusterStatusProps) {
  let nodes: any[] = []
  if (cluster) {
    if (Array.isArray(cluster.data?.affected_items))  nodes = cluster.data.affected_items
    else if (Array.isArray(cluster?.affected_items))   nodes = cluster.affected_items
    else if (cluster && !cluster.error && typeof cluster === 'object') {
      nodes = [{ name: cluster.node || 'Manager', status: 'active', type: 'master' }]
    }
  }
  if (!nodes.length) return (
    <Box className="flex flex-col gap-2">
      {cluster?.error
        ? <Alert severity="warning" sx={{ fontSize: 11, py: 0.5 }}>ไม่สามารถเชื่อมต่อ Wazuh API</Alert>
        : Array.from({length:2}).map((_,i) => <Skeleton key={i} height={40} sx={{ borderRadius: 1.5 }} />)
      }
    </Box>
  )
  return (
    <div className="flex flex-col gap-2.5">
      {nodes.map((node, i) => {
        const ok = (node?.status||'active') === 'active'
        const col = ok ? B.green : B.red
        return (
          <Box key={node?.name||i} sx={{
            display: 'flex', alignItems: 'center', gap: 2,
            px: 2, py: 1.5, borderRadius: '12px',
            bgcolor: `${col}08`,
            border: `1px solid ${col}25`,
            background: `linear-gradient(90deg, ${col}0C 0%, transparent 80%)`,
            transition: 'all 0.2s ease',
            '&:hover': { bgcolor: `${col}12`, border: `1px solid ${col}40` },
          }}>
            {/* Status indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '10px', bgcolor: `${col}15`, flexShrink: 0, border: `1px solid ${col}25` }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col,
                boxShadow: `0 0 10px ${col}`,
                animation: ok ? 'pulseGlow 2.5s ease-in-out infinite' : 'none' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
                {node?.name||`Node ${i+1}`}
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'capitalize', mt: 0.2 }}>
                {node?.type||'worker'} node
              </Typography>
            </Box>
            <Box sx={{
              px: 1.25, py: 0.35, borderRadius: '20px',
              bgcolor: `${col}18`, border: `1px solid ${col}30`,
            }}>
              <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: col }}>
                {ok ? 'ACTIVE' : 'DOWN'}
              </Typography>
            </Box>
          </Box>
        )
      })}
    </div>
  )
}

// ─── Agents mini panel ────────────────────────────────────────────────────────
interface AgentsMiniProps {
  agentData: any
  isLoading: boolean
}

function AgentsMini({ agentData, isLoading }: AgentsMiniProps) {
  const navigate = useNavigate()
  if (isLoading) return <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
  if (!agentData || agentData.error) return <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>ไม่สามารถดึงข้อมูล Agent</Typography>
  const { total=0, active=0, disconnected=0, never_connected=0 } = agentData
  const bars = [
    { label: 'Active', count: active, color: B.green },
    { label: 'Disconnected', count: disconnected, color: B.red },
    { label: 'Never seen', count: never_connected, color: '#9A90BF' },
  ]
  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div className="text-center">
          <Typography sx={{ fontSize: 28, fontWeight: 900, color: B.purple, lineHeight: 1 }}>{total}</Typography>
          <Typography sx={{ fontSize: 9, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total</Typography>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {bars.map(b => (
            <div key={b.label} className="flex items-center gap-2">
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: b.color, flexShrink: 0,
                boxShadow: b.count > 0 ? `0 0 5px ${b.color}80` : 'none' }} />
              <Typography sx={{ fontSize: 10, color: 'text.secondary', flex: 1 }}>{b.label}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.count}</Typography>
            </div>
          ))}
        </div>
      </div>
      {agentData.by_os?.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2 border-t" style={{ borderColor: 'rgba(123,91,164,0.15)' }}>
          {agentData.by_os.slice(0,4).map((os: any) => (
            <Chip key={os.name} label={`${os.name} ${os.count}`} size="small"
              sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(123,91,164,0.1)', color: B.purpleL }} />
          ))}
        </div>
      )}
      <Button size="small" onClick={() => navigate('/assets')}
        sx={{ mt: 1.5, fontSize: 11, color: B.purpleL, p: 0, textTransform: 'none',
          '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>
        ดูทั้งหมด {total} agents →
      </Button>
    </div>
  )
}

// ─── Recent critical alerts ───────────────────────────────────────────────────
interface RecentAlertsProps {
  alerts?: any[]
  isLoading: boolean
}

function RecentAlerts({ alerts = [], isLoading }: RecentAlertsProps) {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const top = alerts.filter(a => Number(a['rule.level']||a?.rule?.level||0) >= 12).slice(0,12)
  if (isLoading) return (
    <div className="flex flex-col gap-2">
      {Array.from({length:6}).map((_,i) => <Skeleton key={i} height={40} sx={{ borderRadius: '9px' }} />)}
    </div>
  )
  if (!top.length) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 2 }}>
      <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(34,197,94,0.2)' }}>
        <CheckCircleRoundedIcon sx={{ fontSize: 28, color: B.green }} />
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: B.green }}>ระบบปลอดภัย</Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }}>ไม่มีการแจ้งเตือนระดับสูงในช่วงนี้</Typography>
      </Box>
    </Box>
  )
  return (
    <Box sx={{ maxHeight: 420, overflow: 'auto' }} className="scrollbar-thin">
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {['เวลา','ระดับ','คำอธิบาย','Source IP','Agent'].map(h => (
              <TableCell key={h} sx={{
                fontSize: 9.5, fontWeight: 800, py: 1, color: 'text.disabled',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                bgcolor: 'rgba(123,91,164,0.06)', whiteSpace: 'nowrap',
                borderBottom: '1px solid rgba(123,91,164,0.15)',
              }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {top.map((a, i) => {
            const lv   = Number(a['rule.level']||a?.rule?.level||0)
            const clr  = LC(lv)
            const srcip = a['data.srcip']||a?.data?.srcip
            return (
              <TableRow key={i} hover onClick={() => navigate('/alerts')} sx={{
                cursor: 'pointer',
                borderLeft: `3px solid ${clr}`,
                bgcolor: lv >= 15 ? 'rgba(239,68,68,0.04)' : 'transparent',
                transition: 'background 0.15s',
                '&:hover': { bgcolor: 'rgba(123,91,164,0.07)' },
              }}>
                <TableCell sx={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono"', whiteSpace: 'nowrap', py: 1.1, color: 'text.secondary' }}>
                  {a['@timestamp'] ? format(new Date(a['@timestamp']), 'HH:mm:ss') : '—'}
                </TableCell>
                <TableCell sx={{ py: 1.1 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 0.9, py: 0.3, borderRadius: '6px', bgcolor: `${clr}18`, border: `1px solid ${clr}35` }}>
                    <Typography sx={{ fontSize: 9.5, fontWeight: 900, color: clr, fontFamily: '"IBM Plex Mono",monospace' }}>
                      {lv} {LL(lv)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 1.1, maxWidth: 280 }}>
                  <Typography sx={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                    {a['rule.description']||a?.rule?.description||'—'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                  {srcip ? (
                    <Box className="flex items-center gap-1">
                      <Typography sx={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono"', color: B.purpleL,
                        cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        onClick={e => { e.stopPropagation(); navigate(`/investigate?q=${srcip}`) }}>
                        {srcip}
                      </Typography>
                      <IconButton size="small"
                        onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(srcip); enqueueSnackbar('คัดลอกแล้ว', { variant: 'info', autoHideDuration: 1500 }) }}
                        sx={{ opacity: 0.4, '&:hover': { opacity: 1 }, p: 0.3 }}>
                        <ContentCopyRoundedIcon sx={{ fontSize: 11 }} />
                      </IconButton>
                    </Box>
                  ) : <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>}
                </TableCell>
                <TableCell sx={{ fontSize: 10.5, py: 1, color: 'text.secondary' }}>
                  {a['agent.name']||a?.agent?.name||'—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Box>
  )
}

// ─── Countries panel ──────────────────────────────────────────────────────────
interface CountryItem {
  name: string
  count: number
}

interface CountriesPanelProps {
  countries?: CountryItem[]
  isLoading: boolean
}

function CountriesPanel({ countries = [], isLoading }: CountriesPanelProps) {
  if (isLoading) return <div className="flex flex-col gap-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} height={26}/>)}</div>
  if (!countries.length) return (
    <Box className="flex flex-col items-center py-6 gap-1">
      <PublicRoundedIcon sx={{ fontSize: 28, color: 'text.disabled', opacity: 0.3 }} />
      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>ไม่มีข้อมูล GeoIP</Typography>
    </Box>
  )
  const max = Math.max(...countries.map(c => c.count), 1)
  return (
    <div className="flex flex-col gap-2">
      {countries.slice(0,8).map((c, i) => {
        const pct = Math.round((c.count/max)*100)
        const color = i < 3 ? B.red : i < 6 ? B.orange : B.purple
        return (
          <div key={c.name}>
            <div className="flex justify-between items-center mb-0.5">
              <Typography sx={{ fontSize: 11, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                {c.name||'Unknown'}
              </Typography>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color, ml: 1, flexShrink: 0 }}>{N(c.count)}</Typography>
            </div>
            <Box sx={{ height: 5, borderRadius: 2.5, bgcolor: `${color}15`, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 2.5,
                background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
                transition: 'width 0.7s ease', boxShadow: `0 0 8px ${color}40` }} />
            </Box>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const theme    = useTheme()
  const isDark   = theme.palette.mode === 'dark'

  const [timeRange, setTimeRange] = useState('24h')
  const [paused, setPaused]       = useState(false)
  const [countdown, setCountdown] = useState(30)

  const refetchInterval = paused ? false : AUTO_MS

  const { data: stats, isLoading }     = useQuery({ queryKey: ['dash-stats', timeRange], queryFn: () => dashboardApi.stats(timeRange).then(r=>r.data), refetchInterval, staleTime: 15000 })
  const { data: cluster }              = useQuery({ queryKey: ['dash-cluster'],            queryFn: () => dashboardApi.cluster().then(r=>r.data),                refetchInterval: 120000, staleTime: 60000 })
  const { data: agentData, isLoading: agentLoading } = useQuery({ queryKey: ['dash-agents'], queryFn: () => dashboardApi.agents().then(r=>r.data), refetchInterval: 60000, staleTime: 30000 })
  const { data: recentAlerts = [], isLoading: alertsLoading } = useQuery({ queryKey: ['dash-recent'], queryFn: () => alertsApi.list({ level: 12, limit: 30, time_range: '24h' }).then(r=>r.data), refetchInterval, staleTime: 15000 })

  useEffect(() => {
    if (paused) return
    setCountdown(30)
    const id = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000)
    return () => clearInterval(id)
  }, [paused, timeRange])

  const doRefresh = () => {
    qc.invalidateQueries({ queryKey: ['dash-stats'] })
    qc.invalidateQueries({ queryKey: ['dash-recent'] })
    qc.invalidateQueries({ queryKey: ['dash-agents'] })
    setCountdown(30)
  }

  const tl        = stats?.timeline   || []
  const countries = stats?.by_country || []
  const eps       = stats?.eps        || 0

  const TIME_OPTS = [
    {v:'1h',l:'1 ชั่วโมง'},{v:'6h',l:'6 ชั่วโมง'},
    {v:'24h',l:'24 ชั่วโมง'},{v:'7d',l:'7 วัน'},{v:'30d',l:'30 วัน'},
  ]

  return (
    <Box className="page-enter flex flex-col gap-4 md:gap-5">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <PageHeader
        title="ภาพรวมระบบ"
        subtitle="Security Operations Center · โรงพยาบาลวลัยลักษณ์"
        status={paused ? 'paused' : 'live'}
        statusLabel={paused ? 'PAUSED' : `LIVE · ${countdown}s`}
        actions={
          <>
            {eps > 0 && (
              <Box className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                sx={{ bgcolor: 'rgba(123,91,164,0.08)', border: '1px solid rgba(123,91,164,0.2)', cursor: 'default' }}>
                <BoltRoundedIcon sx={{ fontSize: 13, color: B.purple }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: B.purpleL }}>
                  {eps} <span style={{ fontWeight: 400, fontSize: 10 }}>EPS</span>
                </Typography>
              </Box>
            )}
            <Tooltip title={paused ? 'คลิกเพื่อเปิด Auto-refresh' : 'คลิกเพื่อหยุด Auto-refresh'}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setPaused(p => !p)}
                sx={{ fontSize: 11, borderRadius: '9px', py: 0.5, px: 1.25, fontWeight: 700, color: paused ? 'text.secondary' : B.green, borderColor: paused ? 'divider' : `${B.green}40` }}
              >
                {paused ? '⏸ Paused' : '▶ Live'}
              </Button>
            </Tooltip>
            <Tooltip title="รีเฟรชทันที">
              <IconButton size="small" onClick={doRefresh}
                aria-label="รีเฟรชข้อมูล"
                sx={{ bgcolor: 'rgba(123,91,164,0.08)', '&:hover': { bgcolor: 'rgba(123,91,164,0.16)' } }}>
                <RefreshRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </IconButton>
            </Tooltip>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select value={timeRange} onChange={e => setTimeRange(e.target.value as string)} sx={{ fontSize: 13, borderRadius: '10px' }}>
                {TIME_OPTS.map(t => <MenuItem key={t.v} value={t.v}>{t.l}</MenuItem>)}
              </Select>
            </FormControl>
          </>
        }
      />

      {/* ══ ROW 1: Metric Hero Strip ═════════════════════════════════════════ */}
      <MetricHero stats={stats} isLoading={isLoading} tl={tl} navigate={navigate} />

      {/* ══ ROW 2: Timeline (left 2/3) + Sources+Countries (right 1/3) ══════ */}
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {/* Timeline */}
        <div className="col-span-12 lg:col-span-8">
          <Panel
            title="แนวโน้ม Alert ตามเวลา"
            icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3.5 18.5l6-6 4 4 7-8"/><path d="M3.5 18.5l6-6 4 4 7-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            action={
              <div className="flex items-center gap-3">
                {[['Total',B.purple],['Critical',B.red],['High',B.orange],['Medium',B.yellow]].map(([l,c]) => (
                  <div key={l as string} className="flex items-center gap-1">
                    <Box sx={{ width: 12, height: 3, borderRadius: 1.5, bgcolor: c as string }} />
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{l}</Typography>
                  </div>
                ))}
              </div>
            }
          >
            <Timeline data={tl} isLoading={isLoading} isDark={isDark} />
          </Panel>
        </div>

        {/* Sources */}
        <div className="col-span-12 lg:col-span-4">
          <Panel title="แหล่งที่มา Log" icon={<RouterRoundedIcon sx={{ fontSize: 16 }} />}>
            <SourceDonut data={stats?.by_source||[]} isLoading={isLoading} />
          </Panel>
        </div>
      </div>

      {/* ══ ROW 3: Countries · Rules · MITRE · Agents ════════════════════════ */}
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {/* Countries */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Panel title="ประเทศต้นทางโจมตี" icon={<PublicRoundedIcon sx={{ fontSize: 16 }} />} accent={B.red}>
            <CountriesPanel countries={countries} isLoading={isLoading} />
          </Panel>
        </div>

        {/* Top Rules */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Panel
            title="Rule ที่พบบ่อยสุด"
            icon={<ShieldRoundedIcon sx={{ fontSize: 16 }} />}
            accent={B.orange}
            action={
              <Tooltip title="ดูใน Alerts">
                <IconButton size="small" onClick={() => navigate('/alerts')}>
                  <OpenInNewRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                </IconButton>
              </Tooltip>
            }
          >
            <HBar items={stats?.by_rule||[]} isLoading={isLoading} colorFn={(i)=>i===0?B.red:i<3?B.orange:B.purple} mono />
          </Panel>
        </div>

        {/* MITRE */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Panel title="MITRE ATT&CK" icon={<SecurityRoundedIcon sx={{ fontSize: 16 }} />} accent="#A855F7">
            <MitreTactics data={stats?.by_mitre||[]} isLoading={isLoading} />
          </Panel>
        </div>

        {/* Cluster + Agents stacked */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-4">
          <Panel title="Wazuh Cluster" icon={<StorageRoundedIcon sx={{ fontSize: 16 }} />} accent={B.green}>
            <ClusterStatus cluster={cluster} />
          </Panel>
          <Panel
            title="Wazuh Agents"
            icon={<DevicesRoundedIcon sx={{ fontSize: 16 }} />}
            accent={B.purple}
          >
            <AgentsMini agentData={agentData} isLoading={agentLoading} />
          </Panel>
        </div>
      </div>

      {/* ══ ROW 4: World Map + Top IPs/Agents + Recent Alerts ═══════════════ */}
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {/* World Map */}
        <div className="col-span-12 lg:col-span-5">
          <Panel
            title="แผนที่แหล่งโจมตี"
            icon={<PublicRoundedIcon sx={{ fontSize: 16 }} />}
            accent={B.red}
            action={countries.length > 0 && (
              <Chip label={`${countries.length} ประเทศ`} size="small" color="primary"
                sx={{ height: 18, fontSize: 10, '& .MuiChip-label':{px:0.7} }} />
            )}
            noPad
          >
            <Box sx={{ height: 240, overflow: 'hidden' }}>
              <WorldMap countries={countries} loading={isLoading} />
            </Box>
          </Panel>
        </div>

        {/* Top IPs + Top Agents */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-4">
          <Panel title="IP โจมตีสูงสุด" icon={<RouterRoundedIcon sx={{ fontSize: 16 }} />} accent={B.red}>
            <HBar items={stats?.by_srcip||[]} isLoading={isLoading} colorFn={()=>B.red} mono limit={6} />
          </Panel>
          <Panel title="Agent ที่มี Alert สูง" icon={<DevicesRoundedIcon sx={{ fontSize: 16 }} />} accent={B.orange}>
            <HBar items={stats?.by_agent||[]} isLoading={isLoading} colorFn={(i)=>i===0?B.orange:B.purple} limit={5} />
          </Panel>
        </div>

        {/* Recent Critical Alerts */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4">
          <Panel
            title="การแจ้งเตือนล่าสุด (Critical / High)"
            icon={<ErrorRoundedIcon sx={{ fontSize: 16, color: B.red }} />}
            action={
              <Button size="small" onClick={() => navigate('/alerts')}
                endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 12 }} />}
                sx={{ fontSize: 11, color: B.purpleL, borderRadius: '8px', py: 0.4, px: 1.25, textTransform: 'none' }}>
                ดูทั้งหมด
              </Button>
            }
            noPad
          >
            <Box sx={{ p: 0 }}>
              <RecentAlerts alerts={recentAlerts} isLoading={alertsLoading} />
            </Box>
          </Panel>
        </div>
      </div>

    </Box>
  )
}
