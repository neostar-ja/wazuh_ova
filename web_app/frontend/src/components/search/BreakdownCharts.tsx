/**
 * Breakdown Charts - Action and Protocol distribution
 * Theme-aware: uses SectionCard wrapper and BRAND colors
 */

import { Box, Grid, Typography, useTheme } from '@mui/material'
import DonutSmallRoundedIcon from '@mui/icons-material/DonutSmallRounded'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Bucket, protoLabel } from './searchTypes'
import { BRAND, PIE_COLORS, getChartTipStyle } from '../ui/tokens'
import { SectionCard } from '../ui/SectionCard'

interface BreakdownChartsProps {
  topActions: Bucket[]
  topProtocols?: Bucket[]
}

export function BreakdownCharts({
  topActions,
  topProtocols = [],
}: BreakdownChartsProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const textColor = theme.palette.text.secondary as string
  const gridColor = isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)'
  const tooltipStyle = getChartTipStyle(isDark)

  const actionColors: Record<string, string> = {
    allow:   '#22C55E',
    accept:  '#22C55E',
    deny:    '#EF4444',
    drop:    '#EF4444',
    block:   '#EF4444',
    forward: '#38BDF8',
  }

  if (!topActions.length && !topProtocols.length) return null

  const protoData = topProtocols.slice(0, 6).map((p) => ({ ...p, key: protoLabel(p.key) }))

  return (
    <SectionCard
      title="Action & Protocol Breakdown"
      subtitle="การกระจายตัว action และ protocol ที่พบ"
      icon={<DonutSmallRoundedIcon />}
      iconColor={BRAND.orange}
      accent={BRAND.orange}
      size="md"
    >
      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        {/* Actions Bar Chart */}
        {topActions.length > 0 && (
          <Grid item xs={12} md={topProtocols.length > 0 ? 7 : 12}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'text.secondary',
                mb: 1.5,
              }}
            >
              By Action
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={topActions.slice(0, 6)}
                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="key"
                  tick={{ fill: textColor, fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: textColor, fontSize: 10 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {topActions.slice(0, 6).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={actionColors[entry.key.toLowerCase()] ?? BRAND.purple}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Grid>
        )}

        {/* Protocol Pie Chart */}
        {topProtocols.length > 0 && (
          <Grid item xs={12} md={topActions.length > 0 ? 5 : 12}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'text.secondary',
                mb: 1.5,
              }}
            >
              By Protocol
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={protoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="key"
                >
                  {protoData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: any, _name: any, props: any) => [
                    `${value} events`,
                    props?.payload?.key ?? '',
                  ]}
                />
                <Legend
                  formatter={(value: string) => (
                    <span style={{ fontSize: 11, color: textColor }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </Grid>
        )}
      </Grid>
    </SectionCard>
  )
}
