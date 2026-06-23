import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box, Typography, Chip, Skeleton, Select, MenuItem, FormControl,
  Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Tooltip, useTheme, Button, Alert, Divider,
} from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import GppBadRoundedIcon from '@mui/icons-material/GppBadRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import GpsFixedRoundedIcon from '@mui/icons-material/GpsFixedRounded'
import NetworkCheckRoundedIcon from '@mui/icons-material/NetworkCheckRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTip, ResponsiveContainer,
  Cell, PieChart, Pie, BarChart, Bar,
} from 'recharts'
import { dashboardApi, alertsApi } from '../../services/api'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { countryFlag } from './WorldMap'
import { useSnackbar } from 'notistack'
import { SectionCard } from '../ui/SectionCard'
import { PageShell, ContentGrid } from '../ui/layout'
import { BRAND, SEV_COLOR, PIE_COLORS, fmtN, sevColor, sevLabelShort, getChartTipStyle } from '../ui/tokens'
import { DashboardStats, SeverityTrend, TimelinePoint } from '../../types/dashboard'
import { SeverityBreakdown } from './SeverityBreakdown'
import { InsightCards } from './InsightCards'
import { AlertFeed } from './AlertFeed'
import { RecommendedActionsPanel } from './RecommendedActionsPanel'
import { computePosture, computeRecommendedActions } from './dashboardUtils'

const B = {
  purple: BRAND.purple, purpleL: BRAND.purpleLight, purpleD: BRAND.purpleDark,
  orange: SEV_COLOR.high, orangeL: '#FDBA74',
  red: SEV_COLOR.critical, yellow: SEV_COLOR.medium, green: SEV_COLOR.low,
  sky: SEV_COLOR.info, pink: '#EC4899', teal: '#14B8A6',
  indigo: '#6366F1',
}
const PIE = PIE_COLORS
const N = fmtN
const LC = sevColor
const LL = sevLabelShort
const AUTO_MS = 30_000

// ─── Trend helper ────────────────────────────────────────────────────────────
function calcTrend(data: TimelinePoint[]): SeverityTrend | null {
  if (!data || data.length < 4) return null
  const mid = Math.floor(data.length / 2)
  const a = data.slice(0, mid).reduce((s, p) => s + (p.total || p.count || 0), 0)
  const b = data.slice(mid).reduce((s, p) => s + (p.total || p.count || 0), 0)
  if (!a) return null
  const change = Math.round(((b - a) / a) * 100)
  return { change: Math.abs(change), direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable' }
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
function Spark({ data = [], color, w = 80, h = 28 }: { data?: any[]; color: string; w?: number; h?: number }) {
  const vals = data.map(d => d.total || d.count || 0)
  if (vals.length < 2) return null
  const max = Math.max(...vals, 1)
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - (v / max) * (h - 3) - 1.5).toFixed(1)}`).join(' ')
  const area = `M 0,${h} L ${pts.split(' ').join(' L ')} L ${w},${h} Z`
  const gid = `sp${color.replace('#', '')}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── KPI Hero Strip ───────────────────────────────────────────────────────────
function MetricHero({ stats, threatStats, isLoading, tl, navigate }:
  { stats: DashboardStats | undefined; threatStats: any; isLoading: boolean; tl: TimelinePoint[]; navigate: (p: string) => void }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const trend = calcTrend(tl)

  const total = (stats?.critical || 0) + (stats?.high || 0) + (stats?.medium || 0) + (stats?.low || 0)
  const metrics = [
    { key: 'critical', label: 'Critical', labelTh: 'วิกฤต', color: B.red, icon: '⚡', nav: '/alerts?level=15' },
    { key: 'high', label: 'High', labelTh: 'สูง', color: B.orange, icon: '▲', nav: '/alerts?level=12' },
    { key: 'medium', label: 'Medium', labelTh: 'กลาง', color: B.yellow, icon: '◆', nav: '/alerts?level=7' },
    { key: 'low', label: 'Low', labelTh: 'ต่ำ', color: B.green, icon: '●', nav: '/alerts?level=1' },
    { key: 'total', label: 'Total Events', labelTh: 'ทั้งหมด', color: B.purple, icon: '∑', nav: '/alerts' },
  ] as const
  const vals: Record<string, number> = {
    critical: stats?.critical || 0, high: stats?.high || 0,
    medium: stats?.medium || 0, low: stats?.low || 0, total,
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {metrics.map(m => (
        <Box key={m.key} onClick={() => navigate(m.nav)} sx={{
          position: 'relative', overflow: 'hidden', cursor: 'pointer',
          borderRadius: '16px', p: { xs: '14px 14px 12px', md: '18px 18px 14px' },
          border: `1px solid ${m.color}28`,
          background: isDark
            ? `linear-gradient(145deg, ${m.color}1A 0%, rgba(15,18,32,0.9) 60%)`
            : `linear-gradient(145deg, ${m.color}0E 0%, rgba(255,255,255,0.95) 60%)`,
          boxShadow: isDark
            ? `0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
            : `0 2px 12px ${m.color}14, 0 1px 3px rgba(0,0,0,0.06)`,
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          '&::before': {
            content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
            background: `linear-gradient(90deg, ${m.color} 0%, ${m.color}80 100%)`,
            boxShadow: `0 0 12px ${m.color}70`
          },
          '&:hover': {
            transform: 'translateY(-4px)', border: `1px solid ${m.color}50`,
            boxShadow: isDark ? `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px ${m.color}20` : `0 10px 28px ${m.color}22`
          },
        }}>
          {/* Watermark */}
          <Box sx={{
            position: 'absolute', bottom: -14, right: -8, fontSize: { xs: 60, md: 72 }, opacity: 0.07,
            color: m.color, fontWeight: 900, lineHeight: 1, userSelect: 'none', fontFamily: '"IBM Plex Mono",monospace'
          }}>
            {m.icon}
          </Box>
          {/* Label */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, position: 'relative', zIndex: 1 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: m.color }}>
              {m.label}
            </Typography>
            <Box sx={{
              width: 22, height: 22, borderRadius: '7px', bgcolor: `${m.color}18`, border: `1px solid ${m.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Typography sx={{ fontSize: 11, color: m.color, fontWeight: 800 }}>{m.icon}</Typography>
            </Box>
          </Box>
          {/* Value */}
          {isLoading
            ? <Skeleton width={72} height={40} sx={{ borderRadius: '8px', bgcolor: `${m.color}15` }} />
            : <Typography sx={{
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.2rem' }, fontWeight: 900, color: m.color,
              lineHeight: 1, letterSpacing: '-0.04em', position: 'relative', zIndex: 1,
              fontFamily: '"IBM Plex Mono",monospace',
              textShadow: isDark ? `0 0 20px ${m.color}40` : 'none'
            }}>
              {N(vals[m.key])}
            </Typography>
          }
          {/* Bottom row */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 1.25, position: 'relative', zIndex: 1, gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500 }}>
                {m.key === 'total' ? 'แจ้งเตือนทั้งหมด' : total > 0 ? `${((vals[m.key] / total) * 100).toFixed(1)}% ของทั้งหมด` : '—'}
              </Typography>
              {!isLoading && trend && m.key === 'total' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  {trend.direction === 'up'
                    ? <><TrendingUpRoundedIcon sx={{ fontSize: 12, color: '#EF4444' }} /><Typography sx={{ fontSize: 11, color: '#EF4444', fontWeight: 700 }}>+{trend.change}%</Typography></>
                    : trend.direction === 'down'
                      ? <><TrendingDownRoundedIcon sx={{ fontSize: 12, color: '#22C55E' }} /><Typography sx={{ fontSize: 11, color: '#22C55E', fontWeight: 700 }}>-{trend.change}%</Typography></>
                      : <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 700 }}>— stable</Typography>
                  }
                </Box>
              )}
            </Box>
            {!isLoading && <Spark data={tl} color={m.color} w={64} h={24} />}
          </Box>
        </Box>
      ))}
    </div>
  )
}

// ─── Dual Timeline (threat + activity) ───────────────────────────────────────
function DualTimeline({ allData = [], threatData = [], isLoading, isDark }:
  { allData?: any[]; threatData?: any[]; isLoading: boolean; isDark: boolean }) {
  const [view, setView] = useState<'threat' | 'all'>('threat')
  const data = view === 'threat' ? threatData : allData
  const title = view === 'threat' ? 'ภัยคุกคาม (Level 12+)' : 'กิจกรรมทั้งหมด'

  if (isLoading) return <Skeleton variant="rectangular" height={240} sx={{ borderRadius: '12px' }} />
  if (!data.length) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 2 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 600 }}>ยังไม่มีข้อมูล</Typography>
    </Box>
  )
  return (
    <Box>
      {/* Toggle */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {(['threat', 'all'] as const).map(v => (
          <Box key={v} onClick={() => setView(v)} sx={{
            px: 2, py: 0.6, borderRadius: '20px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            bgcolor: view === v ? (v === 'threat' ? `${B.red}18` : `${B.purple}18`) : 'transparent',
            color: view === v ? (v === 'threat' ? B.red : B.purple) : 'text.disabled',
            border: `1px solid ${view === v ? (v === 'threat' ? `${B.red}40` : `${B.purple}40`) : 'transparent'}`,
            transition: 'all 0.18s ease',
          }}>
            {v === 'threat' ? '⚠ ภัยคุกคาม' : '📊 กิจกรรมทั้งหมด'}
          </Box>
        ))}
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {view === 'threat'
            ? [['Critical', B.red], ['High', B.orange]].map(([l, c]) => (
              <Box key={l as string} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 10, height: 3, borderRadius: 1.5, bgcolor: c as string }} />
                <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{l}</Typography>
              </Box>
            ))
            : [['Total', B.purple], ['Critical', B.red], ['High', B.orange], ['Medium', B.yellow]].map(([l, c]) => (
              <Box key={l as string} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 10, height: 3, borderRadius: 1.5, bgcolor: c as string }} />
                <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{l}</Typography>
              </Box>
            ))
          }
        </Box>
      </Box>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
          <defs>
            {[['gt', B.purple, 0.22], ['gc', B.red, 0.5], ['gh', B.orange, 0.38], ['gm', B.yellow, 0.28]].map(([id, c, o]) => (
              <linearGradient key={id as string} id={id as string} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c as string} stopOpacity={o as number} />
                <stop offset="95%" stopColor={c as string} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={isDark ? 'rgba(79,110,247,0.1)' : 'rgba(79,110,247,0.08)'} vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: isDark ? '#64748B' : '#94A3B8' }} axisLine={false} tickLine={false}
            tickFormatter={t => { try { return format(new Date(t), 'HH:mm') } catch { return '' } }}
            interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: isDark ? '#64748B' : '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={N} width={44} />
          <RechartTip contentStyle={getChartTipStyle(isDark)} formatter={(v, n) => [N(v as number), n]}
            labelFormatter={l => { try { return format(new Date(l), 'dd/MM HH:mm') } catch { return l } }} />
          {view === 'threat' ? (
            <>
              <Area type="monotone" dataKey="critical" name="Critical" stroke={B.red} strokeWidth={2} fill="url(#gc)" dot={false} />
              <Area type="monotone" dataKey="high" name="High" stroke={B.orange} strokeWidth={1.5} fill="url(#gh)" dot={false} />
            </>
          ) : (
            <>
              <Area type="monotone" dataKey="total" name="Total" stroke={B.purple} strokeWidth={2.5} fill="url(#gt)" dot={false} />
              <Area type="monotone" dataKey="critical" name="Critical" stroke={B.red} strokeWidth={1.5} fill="url(#gc)" dot={false} />
              <Area type="monotone" dataKey="high" name="High" stroke={B.orange} strokeWidth={1.5} fill="url(#gh)" dot={false} />
              <Area type="monotone" dataKey="medium" name="Medium" stroke={B.yellow} strokeWidth={1} fill="url(#gm)" dot={false} />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  )
}

// ─── HBar ─────────────────────────────────────────────────────────────────────
function HBar({ items = [], isLoading, limit = 8, colorFn, mono, onItemClick, emptyMsg = 'ยังไม่มีข้อมูล' }:
  { items?: any[]; isLoading: boolean; limit?: number; colorFn?: (i: number, item: any) => string; mono?: boolean; onItemClick?: (item: any) => void; emptyMsg?: string }) {
  if (isLoading) return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={28} sx={{ borderRadius: '8px' }} />)}
    </div>
  )
  if (!items.length) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 5, gap: 1.5 }}>
      <GppBadRoundedIcon sx={{ fontSize: 26, color: 'text.disabled', opacity: 0.35 }} />
      <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 500 }}>{emptyMsg}</Typography>
    </Box>
  )
  const max = Math.max(...items.map(i => i.count), 1)
  return (
    <div className="flex flex-col gap-2">
      {items.slice(0, limit).map((item, i) => {
        const pct = Math.round((item.count / max) * 100)
        const color = colorFn ? colorFn(i, item) : B.purple
        const desc = item.description || ''
        return (
          <Box key={item.name || i} onClick={() => onItemClick?.(item)} sx={{
            p: '7px 10px', borderRadius: '10px', bgcolor: `${color}08`, border: `1px solid ${color}15`,
            transition: 'all 0.2s ease', cursor: onItemClick ? 'pointer' : 'default',
            '&:hover': onItemClick ? { bgcolor: `${color}12`, border: `1px solid ${color}28` } : {},
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{
                    color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontFamily: mono ? '"IBM Plex Mono",monospace' : 'inherit',
                    fontSize: mono ? 11 : 11.5, fontWeight: 500
                  }}>
                    {item.name || 'Unknown'}
                  </Typography>
                  {desc && (
                    <Typography sx={{ fontSize: 9.5, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {desc}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color, ml: 1, flexShrink: 0, fontFamily: '"IBM Plex Mono",monospace' }}>
                {N(item.count)}
              </Typography>
            </Box>
            <Box sx={{ height: 6, borderRadius: '6px', bgcolor: `${color}15`, overflow: 'hidden' }}>
              <Box sx={{
                height: '100%', width: `${pct}%`, borderRadius: '6px',
                background: `linear-gradient(90deg, ${color} 0%, ${color}B0 100%)`,
                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 0 10px ${color}60`
              }} />
            </Box>
          </Box>
        )
      })}
    </div>
  )
}

// ─── IP + Country Bar ─────────────────────────────────────────────────────────
function IPWithCountryBar({ items = [], isLoading, onItemClick }:
  { items?: any[]; isLoading: boolean; onItemClick?: (item: any) => void }) {
  if (isLoading) return (
    <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={38} sx={{ borderRadius: '8px' }} />)}</div>
  )
  if (!items.length) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 5, gap: 1.5 }}>
      <RouterRoundedIcon sx={{ fontSize: 26, color: 'text.disabled', opacity: 0.35 }} />
      <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 500 }}>ไม่มีภัยคุกคามที่มี srcip</Typography>
    </Box>
  )
  const max = Math.max(...items.map(i => i.count), 1)
  return (
    <div className="flex flex-col gap-2">
      {items.slice(0, 7).map((item, i) => {
        const color = i === 0 ? B.red : i < 3 ? B.orange : B.purple
        const pct = Math.round((item.count / max) * 100)
        const country = item.country || ''
        const flag = country ? countryFlag(country) : ''
        return (
          <Box key={item.name || i} onClick={() => onItemClick?.(item)} sx={{
            p: '6px 10px', borderRadius: '10px',
            bgcolor: i === 0 ? `${color}12` : `${color}08`,
            border: `1px solid ${color}${i === 0 ? '30' : '18'}`,
            cursor: onItemClick ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            '&:hover': onItemClick ? { bgcolor: `${color}18`, transform: 'translateX(3px)' } : {},
          }}>
            {/* IP + country row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
                <Box sx={{
                  width: 16, height: 16, borderRadius: '5px', bgcolor: `${color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Typography sx={{ fontSize: 8.5, fontWeight: 900, color }}>{i + 1}</Typography>
                </Box>
                <Typography sx={{
                  fontSize: 11, color, fontFamily: '"IBM Plex Mono",monospace',
                  fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {item.name}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color, fontFamily: '"IBM Plex Mono",monospace', flexShrink: 0, ml: 1 }}>
                {N(item.count)}
              </Typography>
            </Box>
            {/* Country + flag */}
            {country && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.6, ml: '24px' }}>
                {flag && <Typography sx={{ fontSize: 12, lineHeight: 1 }}>{flag}</Typography>}
                <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{country}</Typography>
              </Box>
            )}
            {/* Progress bar */}
            <Box sx={{ height: 4, borderRadius: 3, bgcolor: `${color}15`, overflow: 'hidden', ml: '24px' }}>
              <Box sx={{
                height: '100%', width: `${pct}%`, borderRadius: 3,
                background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
                transition: 'width 0.8s ease', boxShadow: `0 0 8px ${color}50`
              }} />
            </Box>
          </Box>
        )
      })}
    </div>
  )
}

// ─── Network Source Donut ─────────────────────────────────────────────────────
function NetworkDonut({ data = [], isLoading }: { data?: any[]; isLoading: boolean }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  if (isLoading) return <Skeleton variant="rectangular" height={200} sx={{ borderRadius: '12px' }} />
  if (!data.length) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 1.5 }}>
      <RouterRoundedIcon sx={{ fontSize: 24, color: B.purple, opacity: 0.4 }} />
      <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>ยังไม่มีข้อมูล Log Source</Typography>
    </Box>
  )
  const total = data.reduce((s, d) => s + d.count, 0)
  const pd = data.slice(0, 7).map(s => ({ name: s.name?.split('-')[0] || s.name || '?', value: s.count }))
  return (
    <Box>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={pd} dataKey="value" cx="50%" cy="50%" outerRadius={62} innerRadius={32} paddingAngle={3}>
            {pd.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} stroke="transparent" />)}
          </Pie>
          <RechartTip contentStyle={getChartTipStyle(isDark)} formatter={(v) => [N(v as number), 'events']} />
        </PieChart>
      </ResponsiveContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
        {pd.map((item, i) => (
          <Box key={item.name} sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 1, py: 0.5, borderRadius: '7px', transition: 'background 0.15s',
            '&:hover': { bgcolor: `${PIE[i % PIE.length]}0A` }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{
                width: 10, height: 10, borderRadius: '3px', bgcolor: PIE[i % PIE.length],
                flexShrink: 0, boxShadow: `0 0 6px ${PIE[i % PIE.length]}60`
              }} />
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 500 }}>{item.name}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                {total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : ''}
              </Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: PIE[i % PIE.length], fontFamily: '"IBM Plex Mono",monospace' }}>
                {N(item.value)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// ─── MITRE Tactics ─────────────────────────────────────────────────────────────
const TACTIC_COLOR: Record<string, string> = {
  'initial-access': SEV_COLOR.critical, 'execution': SEV_COLOR.critical, 'persistence': SEV_COLOR.high,
  'privilege-escalation': SEV_COLOR.high, 'defense-evasion': SEV_COLOR.medium, 'credential-access': SEV_COLOR.medium,
  'discovery': SEV_COLOR.low, 'lateral-movement': SEV_COLOR.info, 'collection': SEV_COLOR.info,
  'command-and-control': '#A855F7', 'exfiltration': '#A855F7', 'impact': '#EC4899',
}

function MitreTactics({ data = [], isLoading }: { data?: any[]; isLoading: boolean }) {
  if (isLoading) return <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={26} />)}</div>
  if (!data.length) return (
    <Box className="flex flex-col items-center justify-center py-6 gap-2">
      <SecurityRoundedIcon sx={{ fontSize: 28, color: 'text.disabled', opacity: 0.3 }} />
      <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center' }}>ไม่พบ MITRE ATT&CK mapping</Typography>
      <Typography sx={{ fontSize: 10, color: 'text.disabled', opacity: 0.6, textAlign: 'center' }}>
        ข้อมูลมาจากภัยคุกคาม Level 12+
      </Typography>
    </Box>
  )
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex flex-col gap-2">
      {data.slice(0, 8).map(item => {
        const color = TACTIC_COLOR[item.name.toLowerCase()] || B.purple
        const pct = Math.round((item.count / max) * 100)
        return (
          <Box key={item.name} sx={{
            p: '6px 10px', borderRadius: '9px', bgcolor: `${color}08`, border: `1px solid ${color}18`,
            transition: 'all 0.18s ease', '&:hover': { bgcolor: `${color}12` },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '3px', bgcolor: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'capitalize', fontWeight: 500 }}>
                  {item.name.replace(/-/g, ' ')}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color, fontFamily: '"IBM Plex Mono",monospace' }}>
                {N(item.count)}
              </Typography>
            </Box>
            <Box sx={{ height: 5, borderRadius: '4px', bgcolor: `${color}18`, overflow: 'hidden' }}>
              <Box sx={{
                height: '100%', width: `${pct}%`, borderRadius: '4px', bgcolor: color,
                transition: 'width 0.7s ease', boxShadow: `0 0 8px ${color}60`
              }} />
            </Box>
          </Box>
        )
      })}
    </div>
  )
}

// ─── Countries Panel with Flags ──────────────────────────────────────────────
function CountriesPanel({ countries = [], isLoading, onCountryClick }:
  { countries?: any[]; isLoading: boolean; onCountryClick?: (c: any) => void }) {
  if (isLoading) return <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={34} />)}</div>
  if (!countries.length) return (
    <Box className="flex flex-col items-center py-6 gap-2">
      <PublicRoundedIcon sx={{ fontSize: 28, color: 'text.disabled', opacity: 0.3 }} />
      <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center' }}>ไม่มีข้อมูล GeoIP</Typography>
      <Typography sx={{ fontSize: 10, color: 'text.disabled', opacity: 0.6, textAlign: 'center' }}>ข้อมูลมาจาก Level 12+</Typography>
    </Box>
  )
  const max = Math.max(...countries.map(c => c.count), 1)
  const total = countries.reduce((s, c) => s + c.count, 0)
  return (
    <div className="flex flex-col gap-1.5">
      {countries.slice(0, 8).map((c, i) => {
        const color = i === 0 ? B.red : i < 3 ? B.orange : i < 6 ? B.yellow : B.purple
        const pct = Math.round((c.count / max) * 100)
        const sharePct = total > 0 ? ((c.count / total) * 100).toFixed(1) : '0'
        const flag = countryFlag(c.name)
        return (
          <Box key={c.name} onClick={() => onCountryClick?.(c)} sx={{
            p: '7px 10px', borderRadius: '10px',
            bgcolor: i === 0 ? `${color}12` : `${color}07`,
            border: `1px solid ${color}${i === 0 ? '30' : '18'}`,
            cursor: onCountryClick ? 'pointer' : 'default',
            transition: 'all 0.2s',
            '&:hover': onCountryClick ? { bgcolor: `${color}18`, border: `1px solid ${color}35` } : {},
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                {/* Rank badge */}
                <Box sx={{
                  width: 16, height: 16, borderRadius: '5px', bgcolor: `${color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Typography sx={{ fontSize: 8.5, fontWeight: 900, color }}>{i + 1}</Typography>
                </Box>
                {/* Flag */}
                {flag && (
                  <Typography sx={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{flag}</Typography>
                )}
                {/* Country name */}
                <Typography sx={{
                  fontSize: 11.5, color: 'text.secondary', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: i === 0 ? 700 : 500
                }}>
                  {c.name || 'Unknown'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{sharePct}%</Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color, fontFamily: '"IBM Plex Mono",monospace' }}>
                  {N(c.count)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ height: 5, borderRadius: 3, bgcolor: `${color}15`, overflow: 'hidden' }}>
              <Box sx={{
                height: '100%', width: `${pct}%`, borderRadius: 3,
                background: `linear-gradient(90deg, ${color} 0%, ${color}90 100%)`,
                transition: 'width 0.8s ease', boxShadow: `0 0 8px ${color}50`
              }} />
            </Box>
          </Box>
        )
      })}
    </div>
  )
}

// ─── Cluster Health ───────────────────────────────────────────────────────────
function ClusterStatus({ cluster }: { cluster: any }) {
  let nodes: any[] = []
  if (cluster) {
    const items = cluster.data?.affected_items || cluster.affected_items
    if (Array.isArray(items)) {
      nodes = items.map(n => ({
        name: n.info?.name || n.name || '?',
        type: n.info?.type || n.type || 'worker',
        status: n.info?.status || n.status || 'active',
        ip: n.info?.ip || n.ip || '',
        agents: n.info?.n_active_agents ?? null,
      }))
    }
  }
  if (!nodes.length) return (
    <Box className="flex flex-col gap-2">
      {cluster?.error
        ? <Alert severity="warning" sx={{ fontSize: 11, py: 0.5 }}>ไม่สามารถเชื่อมต่อ Wazuh API</Alert>
        : Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={40} sx={{ borderRadius: 1.5 }} />)
      }
    </Box>
  )
  return (
    <div className="flex flex-col gap-2.5">
      {nodes.map((node, i) => {
        const ok = (node.status || 'active') === 'active'
        const col = ok ? B.green : B.red
        return (
          <Box key={node.name || i} sx={{
            display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, borderRadius: '12px',
            bgcolor: `${col}08`, border: `1px solid ${col}25`,
            background: `linear-gradient(90deg, ${col}0C 0%, transparent 80%)`,
            transition: 'all 0.2s ease', '&:hover': { bgcolor: `${col}12`, border: `1px solid ${col}40` },
          }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
              borderRadius: '10px', bgcolor: `${col}15`, flexShrink: 0, border: `1px solid ${col}25`
            }}>
              <Box sx={{
                width: 10, height: 10, borderRadius: '50%', bgcolor: col, boxShadow: `0 0 10px ${col}`,
                animation: ok ? 'pulseGlow 2.5s ease-in-out infinite' : 'none'
              }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
                {node.name}
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.2 }}>
                {node.type} · {node.ip}
                {node.agents !== null ? ` · ${node.agents} agents` : ''}
              </Typography>
            </Box>
            <Box sx={{ px: 1.25, py: 0.35, borderRadius: '20px', bgcolor: `${col}18`, border: `1px solid ${col}30` }}>
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

// ─── Agents Panel ─────────────────────────────────────────────────────────────
function AgentsMini({ agentData, isLoading }: { agentData: any; isLoading: boolean }) {
  const navigate = useNavigate()
  if (isLoading) return <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
  if (!agentData || agentData.error) return (
    <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>ไม่สามารถดึงข้อมูล Agent</Typography>
  )
  const { total = 0, active = 0, disconnected = 0, never_connected = 0 } = agentData
  const bars = [
    { label: 'Active', count: active, color: B.green },
    { label: 'Disconnected', count: disconnected, color: B.red },
    { label: 'Never seen', count: never_connected, color: '#94A3B8' },
  ]
  const healthPct = total > 0 ? Math.round((active / total) * 100) : 0
  const healthColor = healthPct >= 80 ? B.green : healthPct >= 50 ? B.orange : B.red

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
        {/* Circle indicator */}
        <Box sx={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(79,110,247,0.1)" strokeWidth="5" />
            <circle cx="28" cy="28" r="22" fill="none" stroke={healthColor} strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 22}`}
              strokeDashoffset={`${2 * Math.PI * 22 * (1 - healthPct / 100)}`}
              strokeLinecap="round" transform="rotate(-90 28 28)"
              style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <Box sx={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <Typography sx={{ fontSize: 14, fontWeight: 900, color: healthColor, lineHeight: 1 }}>{total}</Typography>
            <Typography sx={{ fontSize: 8, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em' }}>total</Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 1 }}>
          {bars.map(b => (
            <Box key={b.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.6 }}>
              <Box sx={{
                width: 7, height: 7, borderRadius: '50%', bgcolor: b.color, flexShrink: 0,
                boxShadow: b.count > 0 ? `0 0 5px ${b.color}80` : 'none'
              }} />
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', flex: 1 }}>{b.label}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.count}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      {agentData.by_os?.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, pt: 1.5, borderTop: '1px solid rgba(79,110,247,0.15)' }}>
          {agentData.by_os.slice(0, 4).map((os: any) => (
            <Chip key={os.name} label={`${os.name} ${os.count}`} size="small"
              sx={{ height: 18, fontSize: 9.5, bgcolor: 'rgba(79,110,247,0.1)', color: B.purpleL }} />
          ))}
        </Box>
      )}
      <Button size="small" onClick={() => navigate('/assets')}
        sx={{
          mt: 1.5, fontSize: 11, color: B.purpleL, p: 0, textTransform: 'none',
          '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
        }}>
        ดูทั้งหมด {total} agents →
      </Button>
    </Box>
  )
}

// ─── Recent Alerts Table ──────────────────────────────────────────────────────
function RecentAlerts({ alerts = [], isLoading }: { alerts?: any[]; isLoading: boolean }) {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const top = alerts.filter(a => Number(a['rule.level'] || a?.rule?.level || 0) >= 12).slice(0, 15)

  if (isLoading) return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={40} sx={{ borderRadius: '9px' }} />)}
    </div>
  )
  if (!top.length) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 2 }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: '16px', bgcolor: 'rgba(34,197,94,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(34,197,94,0.2)'
      }}>
        <CheckCircleRoundedIcon sx={{ fontSize: 28, color: B.green }} />
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: B.green }}>ระบบปลอดภัย</Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }}>ไม่มีการแจ้งเตือนระดับสูงในช่วงนี้</Typography>
      </Box>
    </Box>
  )
  return (
    <Box sx={{ maxHeight: 440, overflow: 'auto' }} className="scrollbar-thin">
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {['เวลา', 'ระดับ', 'คำอธิบาย', 'Source IP', 'Agent'].map(h => (
              <TableCell key={h} sx={{
                fontSize: 9.5, fontWeight: 800, py: 1, color: 'text.disabled',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                bgcolor: 'rgba(79,110,247,0.06)', whiteSpace: 'nowrap',
                borderBottom: '1px solid rgba(79,110,247,0.15)'
              }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {top.map((a, i) => {
            const lv = Number(a['rule.level'] || a?.rule?.level || 0)
            const clr = LC(lv)
            const srcip = a['data.srcip'] || a?.data?.srcip
            return (
              <TableRow key={i} hover onClick={() => navigate('/alerts')} sx={{
                cursor: 'pointer', borderLeft: `3px solid ${clr}`,
                bgcolor: lv >= 15 ? 'rgba(239,68,68,0.04)' : 'transparent',
                transition: 'background 0.15s', '&:hover': { bgcolor: 'rgba(79,110,247,0.07)' },
              }}>
                <TableCell sx={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono"', whiteSpace: 'nowrap', py: 1.1, color: 'text.secondary' }}>
                  {a['@timestamp'] ? format(new Date(a['@timestamp']), 'HH:mm:ss') : '—'}
                </TableCell>
                <TableCell sx={{ py: 1.1 }}>
                  <Box sx={{
                    display: 'inline-flex', alignItems: 'center', px: 0.9, py: 0.3, borderRadius: '6px',
                    bgcolor: `${clr}18`, border: `1px solid ${clr}35`
                  }}>
                    <Typography sx={{ fontSize: 9.5, fontWeight: 900, color: clr, fontFamily: '"IBM Plex Mono",monospace' }}>
                      {lv} {LL(lv)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 1.1, maxWidth: 260 }}>
                  <Typography sx={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                    {a['rule.description'] || a?.rule?.description || '—'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                  {srcip ? (
                    <Box className="flex items-center gap-1">
                      <Typography sx={{
                        fontSize: 10.5, fontFamily: '"IBM Plex Mono"', color: B.purpleL,
                        cursor: 'pointer', '&:hover': { textDecoration: 'underline' }
                      }}
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
                  {a['agent.name'] || a?.agent?.name || '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Box>
  )
}

// ─── Threat Summary Card ──────────────────────────────────────────────────────
function ThreatSummary({ threatStats, isLoading, navigate }:
  { threatStats: any; isLoading: boolean; navigate: (p: string) => void }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const total = threatStats?.total || 0
  const critical = threatStats?.critical || 0
  const high = threatStats?.high || 0
  const topIP = threatStats?.by_srcip?.[0]
  const topRule = threatStats?.by_rule?.[0]

  const items = [
    { label: 'ภัยคุกคามทั้งหมด', value: total, color: B.purple, icon: <GpsFixedRoundedIcon sx={{ fontSize: 16 }} />, nav: '/alerts?level=12' },
    { label: 'วิกฤต (≥15)', value: critical, color: B.red, icon: <WarningAmberRoundedIcon sx={{ fontSize: 16 }} />, nav: '/alerts?level=15' },
    { label: 'สูง (12–14)', value: high, color: B.orange, icon: <BugReportRoundedIcon sx={{ fontSize: 16 }} />, nav: '/alerts?level=12' },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Count strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1.5 }}>
        {items.map(item => (
          <Box key={item.label} onClick={() => navigate(item.nav)} sx={{
            px: 2, py: 1.5, borderRadius: '12px', cursor: 'pointer',
            bgcolor: isDark ? `${item.color}12` : `${item.color}08`,
            border: `1px solid ${item.color}22`,
            transition: 'all 0.2s ease',
            '&:hover': { bgcolor: `${item.color}1C`, border: `1px solid ${item.color}40`, transform: 'translateY(-2px)' },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, color: item.color }}>
              {item.icon}
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: item.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {item.label}
              </Typography>
            </Box>
            {isLoading
              ? <Skeleton width={50} height={28} sx={{ borderRadius: '6px' }} />
              : <Typography sx={{
                fontSize: '1.5rem', fontWeight: 900, color: item.color, lineHeight: 1,
                fontFamily: '"IBM Plex Mono",monospace'
              }}>
                {N(item.value)}
              </Typography>
            }
          </Box>
        ))}
      </Box>

      {/* Top threat sources */}
      {!isLoading && (topIP || topRule) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1, borderTop: '1px solid rgba(79,110,247,0.12)' }}>
          {topIP && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: '8px',
              bgcolor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)'
            }}>
              <RouterRoundedIcon sx={{ fontSize: 14, color: B.red, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.2 }}>IP โจมตีมากที่สุด</Typography>
                <Typography sx={{
                  fontSize: 11.5, color: B.red, fontFamily: '"IBM Plex Mono",monospace',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
                  onClick={() => navigate(`/investigate?q=${topIP.name}`)}>
                  {topIP.name}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: B.red, fontFamily: '"IBM Plex Mono",monospace', flexShrink: 0 }}>
                {N(topIP.count)}
              </Typography>
            </Box>
          )}
          {topRule && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: '8px',
              bgcolor: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.12)'
            }}>
              <ShieldRoundedIcon sx={{ fontSize: 14, color: B.orange, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.2 }}>Rule ที่พบบ่อยสุด</Typography>
                <Typography sx={{ fontSize: 11, color: B.orange, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topRule.description || `Rule ${topRule.name}`}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: B.orange, fontFamily: '"IBM Plex Mono",monospace', flexShrink: 0 }}>
                {N(topRule.count)}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────
function Panel({ title, icon, iconColor, action, children, accent, noPad = false, subtitle }:
  { title: string; icon?: React.ReactNode; iconColor?: string; action?: React.ReactNode; children: React.ReactNode; accent?: string; noPad?: boolean; subtitle?: string }) {
  return (
    <SectionCard title={title} icon={icon} iconColor={iconColor} action={action} accent={accent} noPad={noPad} subtitle={subtitle}>
      {children}
    </SectionCard>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [timeRange, setTimeRange] = useState('24h')
  const [paused, setPaused] = useState(false)
  const [countdown, setCountdown] = useState(30)

  const refetchInterval = paused ? false : AUTO_MS

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dash-stats', timeRange],
    queryFn: () => dashboardApi.stats(timeRange).then(r => r.data),
    refetchInterval, staleTime: 15_000,
  })
  const { data: threatStats, isLoading: threatLoading } = useQuery({
    queryKey: ['dash-threat', timeRange],
    queryFn: () => dashboardApi.threatStats(timeRange).then(r => r.data),
    refetchInterval, staleTime: 15_000,
  })
  const { data: cluster } = useQuery({
    queryKey: ['dash-cluster'],
    queryFn: () => dashboardApi.cluster().then(r => r.data),
    refetchInterval: 120_000, staleTime: 60_000,
  })
  const { data: agentData, isLoading: agentLoading } = useQuery({
    queryKey: ['dash-agents'],
    queryFn: () => dashboardApi.agents().then(r => r.data),
    refetchInterval: 60_000, staleTime: 30_000,
  })
  const { data: recentAlerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['dash-recent'],
    queryFn: () => alertsApi.list({ level: 12, limit: 30, time_range: '24h' }).then(r => r.data),
    refetchInterval, staleTime: 15_000,
  })
  useEffect(() => {
    if (paused) return
    setCountdown(30)
    const id = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000)
    return () => clearInterval(id)
  }, [paused, timeRange])

  const doRefresh = () => {
    qc.invalidateQueries({ queryKey: ['dash-stats'] })
    qc.invalidateQueries({ queryKey: ['dash-threat'] })
    qc.invalidateQueries({ queryKey: ['dash-recent'] })
    qc.invalidateQueries({ queryKey: ['dash-agents'] })
    setCountdown(30)
  }

  const allTl = stats?.timeline || []
  const threatTl = threatStats?.timeline || []
  const eps = stats?.eps || 0

  const trend = calcTrend(allTl)
  const posture = useMemo(
    () => computePosture(stats, threatStats, agentData, cluster, trend),
    [stats, threatStats, agentData, cluster, trend],
  )
  const recommendedActions = useMemo(
    () => computeRecommendedActions(posture, undefined),
    [posture],
  )
  const TIME_OPTS = [
    { v: '1h', l: '1 ชั่วโมง' }, { v: '6h', l: '6 ชั่วโมง' },
    { v: '24h', l: '24 ชั่วโมง' }, { v: '7d', l: '7 วัน' }, { v: '30d', l: '30 วัน' },
  ]

  const headerActions = (
    <>
      {eps > 0 && (
        <Box className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          sx={{ bgcolor: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)', cursor: 'default' }}>
          <BoltRoundedIcon sx={{ fontSize: 13, color: B.purple }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: B.purpleL }}>
            {eps} <span style={{ fontWeight: 400, fontSize: 10 }}>EPS</span>
          </Typography>
        </Box>
      )}
      <Tooltip title={paused ? 'คลิกเพื่อเปิด Auto-refresh' : 'คลิกเพื่อหยุด Auto-refresh'}>
        <Button size="small" variant="outlined" onClick={() => setPaused(p => !p)}
          sx={{
            fontSize: 11, borderRadius: '9px', py: 0.5, px: 1.25, fontWeight: 700,
            color: paused ? 'text.secondary' : B.green, borderColor: paused ? 'divider' : `${B.green}40`
          }}>
          {paused ? '⏸ Paused' : '▶ Live'}
        </Button>
      </Tooltip>
      <Tooltip title="รีเฟรชทันที">
        <IconButton size="small" onClick={doRefresh} aria-label="รีเฟรชข้อมูล"
          sx={{ bgcolor: 'rgba(79,110,247,0.08)', '&:hover': { bgcolor: 'rgba(79,110,247,0.16)' } }}>
          <RefreshRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        </IconButton>
      </Tooltip>
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <Select value={timeRange} onChange={e => setTimeRange(e.target.value)} sx={{ fontSize: 13, borderRadius: '10px' }}>
          {TIME_OPTS.map(t => <MenuItem key={t.v} value={t.v}>{t.l}</MenuItem>)}
        </Select>
      </FormControl>
    </>
  )

  return (
    <PageShell
      title="ภาพรวมระบบ"
      subtitle="Security Operations Center · โรงพยาบาลวลัยลักษณ์"
      status={paused ? 'paused' : 'live'}
      statusLabel={paused ? 'PAUSED' : `LIVE · ${countdown}s`}
      actions={headerActions}
      variant="dashboard"
      density="comfortable"
    >
      {/* ══ ROW 1: KPI Hero ═════════════════════════════════════════════════ */}
      <MetricHero stats={stats} threatStats={threatStats} isLoading={isLoading} tl={allTl} navigate={navigate} />

      {/* ══ ROW 2: Threat Summary + Severity Breakdown + Insights ══════════ */}
      <ContentGrid variant="dashboard" gap="md">
        <div className="col-span-12 lg:col-span-4">
          <Panel
            title="ภัยคุกคาม (Level 12+)"
            icon={<GpsFixedRoundedIcon sx={{ fontSize: 16 }} />}
            iconColor={B.red}
            accent={B.red}
            subtitle="ข้อมูลจาก Threat Intelligence"
          >
            <ThreatSummary threatStats={threatStats} isLoading={threatLoading} navigate={navigate} />
          </Panel>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Panel
            title="การแบ่งระดับความรุนแรง"
            icon={<GppBadRoundedIcon sx={{ fontSize: 16 }} />}
            accent={B.orange}
          >
            <SeverityBreakdown
              critical={stats?.critical || 0}
              high={stats?.high || 0}
              medium={stats?.medium || 0}
              low={stats?.low || 0}
              isLoading={isLoading}
            />
          </Panel>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Panel
            title="SOC Insights"
            icon={<TrendingUpRoundedIcon sx={{ fontSize: 16 }} />}
            accent={B.purple}
          >
            <InsightCards
              topAgent={threatStats?.by_agent?.[0] || stats?.by_agent?.[0]}
              topIP={threatStats?.by_srcip?.[0] || stats?.by_srcip?.[0]}
              topRule={threatStats?.by_rule?.[0] || stats?.by_rule?.[0]}
              isLoading={isLoading || threatLoading}
            />
          </Panel>
        </div>
      </ContentGrid>

      {/* ══ ROW 3: Timeline (8/12) + Network Sources (4/12) ════════════════ */}
      <ContentGrid variant="dashboard" gap="md">
        <div className="col-span-12 lg:col-span-8">
          <Panel
            title="แนวโน้ม Alert ตามเวลา"
            icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M3.5 18.5l6-6 4 4 7-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>}
          >
            <DualTimeline allData={allTl} threatData={threatTl} isLoading={isLoading || threatLoading} isDark={isDark} />
          </Panel>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Panel
            title="แหล่งที่มา Log"
            icon={<NetworkCheckRoundedIcon sx={{ fontSize: 16 }} />}
            subtitle="Network devices · สะสม 24h"
          >
            <NetworkDonut data={stats?.by_source || []} isLoading={isLoading} />
          </Panel>
        </div>
      </ContentGrid>

      {/* ══ ROW 4: Threat data panels ═══════════════════════════════════════ */}
      <ContentGrid variant="dashboard" gap="md">
        {/* Top Attacking IPs with country */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Panel
            title="IP โจมตีสูงสุด"
            icon={<RouterRoundedIcon sx={{ fontSize: 16 }} />}
            accent={B.red}
            subtitle="Level 12+ · พร้อมประเทศ"
            action={
              <Chip label="Threats" size="small"
                sx={{
                  height: 18, fontSize: 9.5, bgcolor: `${B.red}15`, color: B.red, border: `1px solid ${B.red}30`,
                  '& .MuiChip-label': { px: 0.7 }
                }} />
            }
          >
            <IPWithCountryBar
              items={threatStats?.by_srcip || []}
              isLoading={threatLoading}
              onItemClick={item => navigate(`/investigate?q=${encodeURIComponent(item.name)}`)}
            />
          </Panel>
        </div>

        {/* Countries (from threats only) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Panel
            title="ประเทศต้นทางโจมตี"
            icon={<PublicRoundedIcon sx={{ fontSize: 16 }} />}
            accent={B.orange}
            subtitle="Level 12+ เท่านั้น"
          >
            <CountriesPanel
              countries={threatStats?.by_country || []}
              isLoading={threatLoading}
              onCountryClick={c => navigate(`/alerts?country=${encodeURIComponent(c.name)}`)}
            />
          </Panel>
        </div>

        {/* Threat rules */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Panel
            title="Threat Rules"
            icon={<ShieldRoundedIcon sx={{ fontSize: 16 }} />}
            accent={B.purple}
            subtitle="Level 12+ เท่านั้น"
          >
            <HBar
              items={threatStats?.by_rule || []}
              isLoading={threatLoading}
              colorFn={(i) => i === 0 ? B.red : i < 3 ? B.orange : B.purple}
              mono limit={7}
              emptyMsg="ไม่มีข้อมูล Threat Rule"
              onItemClick={item => navigate(`/alerts?rule_id=${encodeURIComponent(item.name)}`)}
            />
          </Panel>
        </div>

        {/* MITRE + Cluster + Agents */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-4">
          <Panel title="MITRE ATT&CK" icon={<SecurityRoundedIcon sx={{ fontSize: 16 }} />} accent="#A855F7"
            subtitle="Level 12+ เท่านั้น">
            <MitreTactics data={threatStats?.by_mitre || []} isLoading={threatLoading} />
          </Panel>
        </div>
      </ContentGrid>

      {/* ══ ROW 5: Cluster + Agents + World Map + Recent Alerts ════════════ */}
      <ContentGrid variant="dashboard" gap="md">
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <Panel title="Wazuh Cluster" icon={<StorageRoundedIcon sx={{ fontSize: 16 }} />} accent={B.green}>
            <ClusterStatus cluster={cluster} />
          </Panel>
          <Panel title="Wazuh Agents" icon={<DevicesRoundedIcon sx={{ fontSize: 16 }} />} accent={B.purple}>
            <AgentsMini agentData={agentData} isLoading={agentLoading} />
          </Panel>
        </div>

        {/* Attack map removed from dashboard (exists on Attack Map page). Space reflowed. */}

        <div className="col-span-12 lg:col-span-9">
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
            <Box sx={{ p: 1.5 }}>
              <AlertFeed alerts={recentAlerts as any[]} isLoading={alertsLoading} maxItems={8} />
            </Box>
          </Panel>
        </div>
      </ContentGrid>

      {/* ══ Recommended Next Actions ════════════════════════════════════════ */}
      <RecommendedActionsPanel actions={recommendedActions} />

    </PageShell>
  )
}
