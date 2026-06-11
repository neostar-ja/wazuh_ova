/**
 * Timeline Chart - Area chart showing events over time
 * Theme-aware: uses SectionCard wrapper and BRAND purple gradient
 */

import { Box, Typography, useTheme, useMediaQuery } from '@mui/material'
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { BRAND, getChartTipStyle } from '../ui/tokens'
import { SectionCard } from '../ui/SectionCard'

interface TimelineChartProps {
  timeline: Array<{ time: string; count: number }>
}

export function TimelineChart({ timeline }: TimelineChartProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isDark = theme.palette.mode === 'dark'

  if (!timeline.length) return null

  const textColor = theme.palette.text.secondary
  const gridColor = isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)'
  const tooltipStyle = getChartTipStyle(isDark)

  return (
    <SectionCard
      title="Events Timeline"
      subtitle="จำนวน event ตามช่วงเวลา"
      icon={<TimelineRoundedIcon />}
      iconColor={BRAND.purple}
      accent={BRAND.purple}
      noPad={false}
      size="md"
    >
      <Box sx={{ mt: 1 }}>
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 260}>
          <AreaChart
            data={timeline}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="searchTimeline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND.purple} stopOpacity={0.35} />
                <stop offset="95%" stopColor={BRAND.purple} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: textColor as string, fontSize: 10 }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: textColor as string, fontSize: 10 }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: any) => [`${value} events`, 'จำนวน']}
              labelStyle={{ color: isDark ? '#EDE9FA' : '#1A1033', fontWeight: 700, marginBottom: 4 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={BRAND.purple}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#searchTimeline)"
              dot={false}
              activeDot={{ r: 4, fill: BRAND.purple, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </SectionCard>
  )
}
