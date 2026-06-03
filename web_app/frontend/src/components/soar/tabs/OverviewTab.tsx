import { useMemo } from 'react'
import { Box, Typography, Stack, Skeleton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded'
import { IrisAlert } from '../../../services/soarApi'
import { getSev, getStat, fmtTime, hexRgb } from '../soarUtils'
import { BRAND, CHART_TIP_STYLE } from '../../ui/tokens'

interface Props {
  alerts: IrisAlert[]
  loading: boolean
}

export default function OverviewTab({ alerts, loading }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)'
  const cardBord  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'
  const tipStyle  = isDark ? CHART_TIP_STYLE : {
    background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(123,91,164,0.2)',
    borderRadius: 8, fontSize: 12, color: '#1A1033', boxShadow: '0 4px 16px rgba(123,91,164,0.12)',
  }

  const sevData = useMemo(() => {
    const map: Record<string, { count: number; color: string }> = {}
    for (const a of alerts) {
      const s = getSev(a.alert_severity_id)
      if (!map[s.labelTh]) map[s.labelTh] = { count: 0, color: s.color }
      map[s.labelTh].count++
    }
    return Object.entries(map).map(([name, { count, color }]) => ({ name, value: count, color }))
  }, [alerts])

  const statusData = useMemo(() => {
    let open = 0, closed = 0
    for (const a of alerts) {
      const s = getStat(a.alert_status_id)
      if (s.label === 'Closed') closed++
      else open++
    }
    return [
      { name: 'เปิดอยู่',  value: open,   color: '#3B82F6' },
      { name: 'ปิดแล้ว',  value: closed, color: '#64748B' },
    ].filter(d => d.value > 0)
  }, [alerts])

  const sourceData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of alerts) map[a.alert_source] = (map[a.alert_source] ?? 0) + 1
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
    return Object.entries(map).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 20)
  }, [alerts])

  const recentAlerts = useMemo(() =>
    [...alerts].sort((a, b) => {
      const ta = new Date(a.alert_source_event_time || a.alert_creation_time || 0).getTime()
      const tb = new Date(b.alert_source_event_time || b.alert_creation_time || 0).getTime()
      return tb - ta
    }).slice(0, 8),
    [alerts]
  )

  if (loading) return (
    <Stack spacing={2} className="animate-fade-in">
      {[1,2,3].map(i => <Skeleton key={i} variant="rectangular" height={140} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />)}
    </Stack>
  )

  function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
      <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', mb: 2, textTransform: 'uppercase',
        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)' }}>
        {children}
      </Typography>
    )
  }

  return (
    <Stack spacing={3.5} className="animate-fade-in">
      {/* Charts row */}
      <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Severity Pie */}
        <Box className="rounded-2xl p-4" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <SectionLabel>การกระจายความรุนแรง</SectionLabel>
          {sevData.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: textMuted }}>ไม่มีข้อมูล</Typography>
          ) : (
            <Box className="flex items-center gap-4">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={sevData} cx="50%" cy="50%" innerRadius={24} outerRadius={40} dataKey="value" paddingAngle={3}>
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
          )}
        </Box>

        {/* Status Pie */}
        <Box className="rounded-2xl p-4" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <SectionLabel>สถานะการแจ้งเตือน</SectionLabel>
          {statusData.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: textMuted }}>ไม่มีข้อมูล</Typography>
          ) : (
            <Box className="flex items-center gap-4">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={24} outerRadius={40} dataKey="value" paddingAngle={3}>
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
          )}
        </Box>

        {/* Alert Sources */}
        <Box className="rounded-2xl p-4" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <SectionLabel>แหล่งที่มาการแจ้งเตือน</SectionLabel>
          {sourceData.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: textMuted }}>ไม่มีข้อมูล</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={sourceData.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.6)' }} width={70} />
                <RTooltip contentStyle={tipStyle} />
                <Bar dataKey="count" fill={BRAND.purple} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Box>

      {/* Tags + Recent */}
      <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tag Cloud */}
        <Box className="rounded-2xl p-4" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <Box className="flex items-center gap-2 mb-3">
            <LocalOfferRoundedIcon sx={{ fontSize: 13, color: BRAND.purple }} />
            <SectionLabel>แท็กการแจ้งเตือน</SectionLabel>
          </Box>
          {tagData.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: textMuted }}>ไม่พบแท็ก</Typography>
          ) : (
            <Box className="flex flex-wrap gap-2">
              {tagData.map(({ tag, count }) => (
                <Box key={tag} className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                  sx={{ background: `rgba(${hexRgb(BRAND.purple)},0.12)`, border: `1px solid rgba(${hexRgb(BRAND.purple)},0.25)` }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: isDark ? '#C4B5FD' : BRAND.purpleDark }}>
                    {tag}
                  </Typography>
                  <Box className="w-4 h-4 rounded-full flex items-center justify-center" sx={{ background: BRAND.purple }}>
                    <Typography sx={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>{count}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Recent Alerts */}
        <Box className="rounded-2xl p-4" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <Box className="flex items-center gap-2 mb-3">
            <AccessTimeRoundedIcon sx={{ fontSize: 13, color: BRAND.purple }} />
            <SectionLabel>การแจ้งเตือนล่าสุด</SectionLabel>
          </Box>
          <Stack spacing={1.5}>
            {recentAlerts.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: textMuted }}>ไม่มีข้อมูล</Typography>
            ) : recentAlerts.map(a => {
              const sev  = getSev(a.alert_severity_id)
              const stat = getStat(a.alert_status_id)
              return (
                <Box key={a.alert_id} className="flex items-start gap-2.5">
                  <Box className="w-2 h-2 rounded-full mt-1.5 shrink-0" sx={{ background: sev.color }} />
                  <Box className="flex-1 min-w-0">
                    <Typography className="text-xs truncate font-medium" title={a.alert_title} sx={{ color: textSec }}>
                      {a.alert_title}
                    </Typography>
                    <Box className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Typography sx={{ fontSize: 9, color: textMuted }}>
                        {fmtTime(a.alert_source_event_time)}
                      </Typography>
                      <Box className="px-1.5 py-0 rounded text-[8px] font-bold"
                        sx={{ background: `rgba(${hexRgb(stat.color)},0.15)`, color: stat.color }}>
                        {stat.labelTh}
                      </Box>
                      <Box className="px-1.5 py-0 rounded text-[8px] font-bold"
                        sx={{ background: `rgba(${hexRgb(sev.color)},0.12)`, color: sev.color }}>
                        {sev.labelTh}
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
