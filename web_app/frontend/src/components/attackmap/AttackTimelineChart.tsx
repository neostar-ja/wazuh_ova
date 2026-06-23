import { Box, Typography, useTheme } from '@mui/material'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import { SEV_COLOR, getBorder, getChartTipStyle, fmtN } from '../ui/tokens'
import SectionCard from '../ui/SectionCard'

export interface TimelinePoint { time: string; total: number; critical: number; high: number }

interface AttackTimelineChartProps {
  timeline?: TimelinePoint[]
  loading?: boolean
}

const SEV_LABEL: Record<string, string> = { critical: 'Critical', high: 'High' }

function AttackTimelineChart({ timeline = [], loading = false }: AttackTimelineChartProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const gridStroke = getBorder(isDark, 'subtle')
  const tickFill = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'

  return (
    <SectionCard
      title="แนวโน้มการโจมตีตามเวลา"
      subtitle="จำนวนเหตุการณ์ Critical / High แยกตามช่วงเวลา"
      icon={<TrendingUpRoundedIcon sx={{ fontSize: 16 }} />}
      iconColor={SEV_COLOR.critical}
      size="sm"
      density="compact"
      loading={loading}
      empty={!timeline.length ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1 }}>
          <TrendingUpRoundedIcon sx={{ fontSize: 26, color: 'text.disabled', opacity: 0.35 }} />
          <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 500 }}>ไม่มีข้อมูลแนวโน้ม</Typography>
        </Box>
      ) : undefined}
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={timeline} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="atc-critical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SEV_COLOR.critical} stopOpacity={0.4} />
              <stop offset="100%" stopColor={SEV_COLOR.critical} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="atc-high" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SEV_COLOR.high} stopOpacity={0.35} />
              <stop offset="100%" stopColor={SEV_COLOR.high} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9, fill: tickFill }}
            axisLine={false} tickLine={false}
            tickFormatter={(v) => format(new Date(v), 'dd/MM HH:mm')}
            minTickGap={48}
          />
          <YAxis tick={{ fontSize: 9, fill: tickFill }} axisLine={false} tickLine={false} width={36} />
          <RechartsTooltip
            contentStyle={getChartTipStyle(isDark)}
            labelFormatter={(v) => format(new Date(v), 'dd MMM yyyy HH:mm')}
            formatter={(value: any, name: any) => [fmtN(Number(value)), SEV_LABEL[String(name)] || String(name)]}
          />
          <Area type="monotone" dataKey="high" stackId="sev" stroke={SEV_COLOR.high} strokeWidth={1.5} fill="url(#atc-high)" name="high" dot={false} />
          <Area type="monotone" dataKey="critical" stackId="sev" stroke={SEV_COLOR.critical} strokeWidth={1.5} fill="url(#atc-critical)" name="critical" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

export default AttackTimelineChart
