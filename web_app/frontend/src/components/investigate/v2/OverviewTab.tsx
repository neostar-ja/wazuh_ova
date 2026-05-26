import { Box, Skeleton, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { BRAND, SEV_COLOR, CHART_TIP_STYLE, PIE_COLORS, fmtN } from '../../ui/tokens'

interface Props {
  loading: boolean
  hourly: Array<{ time: string; count: number }>
  levelDist: Record<string, number>
  topSources: Array<{ name: string; count: number }>
  topRules: Array<{ id: string; desc: string; count: number }>
  entityType: string
}

const SEV_BARS = [
  { key: 'critical', color: SEV_COLOR.critical, label: 'Critical' },
  { key: 'high',     color: SEV_COLOR.high,     label: 'High' },
  { key: 'medium',   color: SEV_COLOR.medium,   label: 'Medium' },
  { key: 'low',      color: SEV_COLOR.low,       label: 'Low' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme()
  return (
    <Typography className="text-[9px] font-bold tracking-widest mb-3"
      sx={{ color: palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)' }}>
      {children}
    </Typography>
  )
}

function SkeletonBlock({ height }: { height: number }) {
  return <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />
}

export default function OverviewTab({ loading, hourly, levelDist, topSources, topRules }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted  = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(60,40,100,0.4)'
  const textSec    = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const trackBg    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'
  const rowHover   = isDark ? 'rgba(123,91,164,0.07)' : 'rgba(123,91,164,0.04)'
  const rowAlt     = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(123,91,164,0.02)'

  const sevData  = SEV_BARS.map(s => ({ name: s.label, value: levelDist[s.key] ?? 0, color: s.color }))
  const total    = sevData.reduce((a, b) => a + b.value, 0)

  const tipStyle = isDark ? CHART_TIP_STYLE : {
    background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(123,91,164,0.2)',
    borderRadius: 8, fontSize: 12, color: '#1A1033', boxShadow: '0 4px 16px rgba(123,91,164,0.12)',
  }

  return (
    <Stack spacing={3.5} className="animate-fade-in">
      {/* Timeline */}
      <Box>
        <SectionLabel>ACTIVITY TIMELINE (HOURLY)</SectionLabel>
        {loading ? <SkeletonBlock height={160} /> : hourly.length === 0 ? (
          <Empty message="No timeline data" />
        ) : (
          <Box className="rounded-xl overflow-hidden p-3" sx={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(123,91,164,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.08)'}` }}>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={hourly} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fill: textMuted, fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: textMuted, fontSize: 9 }} tickLine={false} axisLine={false} />
                <RTooltip contentStyle={tipStyle} cursor={{ fill: 'rgba(123,91,164,0.08)' }} />
                <Bar dataKey="count" fill={BRAND.purple} radius={[3, 3, 0, 0]} name="Events" opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>

      {/* Severity + Sources */}
      <Box className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity bars */}
        <Box>
          <SectionLabel>SEVERITY DISTRIBUTION</SectionLabel>
          {loading ? <SkeletonBlock height={160} /> : total === 0 ? <Empty message="No data" /> : (
            <Stack spacing={2}>
              {sevData.map(({ name, value, color }) => {
                const pct = total > 0 ? (value / total) * 100 : 0
                return (
                  <Box key={name}>
                    <Box className="flex items-center justify-between mb-1.5">
                      <Box className="flex items-center gap-2">
                        <Box className="w-2 h-2 rounded-sm" sx={{ background: color }} />
                        <Typography sx={{ fontSize: 11.5, color: textSec }}>{name}</Typography>
                      </Box>
                      <Box className="flex items-center gap-2">
                        <Typography className="font-mono text-[11px]" sx={{ color: value > 0 ? color : textMuted }}>
                          {fmtN(value)}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: textMuted }}>
                          {pct.toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Box className="h-1.5 rounded-full overflow-hidden" sx={{ background: trackBg }}>
                      <Box className="h-full rounded-full transition-all duration-700 ease-out"
                        sx={{ width: `${pct}%`, background: `linear-gradient(90deg,${color}99,${color})` }} />
                    </Box>
                  </Box>
                )
              })}
              <Box className="mt-2 pt-2" sx={{ borderTop: `1px solid ${trackBg}` }}>
                <Box className="flex items-center justify-between">
                  <Typography sx={{ fontSize: 11, color: textMuted }}>Total events</Typography>
                  <Typography className="font-mono text-sm font-bold" sx={{ color: isDark ? '#EDE9FA' : '#1A1033' }}>
                    {fmtN(total)}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          )}
        </Box>

        {/* Top sources pie */}
        <Box>
          <SectionLabel>TOP LOG SOURCES</SectionLabel>
          {loading ? <SkeletonBlock height={160} /> : topSources.length === 0 ? <Empty message="No source data" /> : (
            <ResponsiveContainer width="100%" height={185}>
              <PieChart>
                <Pie data={topSources.slice(0, 5)} dataKey="count" nameKey="name"
                  cx="50%" cy="45%" outerRadius={62} innerRadius={28} paddingAngle={3}>
                  {topSources.slice(0, 5).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <RTooltip contentStyle={tipStyle} formatter={(v) => fmtN(Number(v ?? 0))} />
                <Legend iconSize={8} iconType="circle"
                  wrapperStyle={{ fontSize: 10, color: textSec, paddingTop: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Box>

      {/* Top rules */}
      {topRules.length > 0 && (
        <Box>
          <SectionLabel>TOP TRIGGERED RULES</SectionLabel>
          <Box className="rounded-xl overflow-hidden"
            sx={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.1)'}` }}>
            {/* Header */}
            <Box className="grid px-3 py-2" sx={{ gridTemplateColumns: '60px 1fr 52px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)' }}>
              {['RULE ID', 'DESCRIPTION', 'COUNT'].map(h => (
                <Typography key={h} className="text-[9px] font-bold tracking-wider" sx={{ color: textMuted }}>{h}</Typography>
              ))}
            </Box>
            {topRules.map((rule, i) => (
              <Box key={rule.id}
                className="grid px-3 py-2 transition-colors duration-100"
                sx={{
                  gridTemplateColumns: '60px 1fr 52px',
                  background: i % 2 === 0 ? rowAlt : 'transparent',
                  borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)'}`,
                  '&:hover': { background: rowHover },
                }}
              >
                <Typography className="font-mono text-[11px] font-semibold"
                  sx={{ color: BRAND.purple }}>#{rule.id}</Typography>
                <Typography className="text-[11px] truncate pr-2" sx={{ color: textSec }}>
                  {rule.desc || '—'}
                </Typography>
                <Typography className="font-mono text-[11px] text-right" sx={{ color: textMuted }}>
                  {fmtN(rule.count)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Stack>
  )
}

function Empty({ message }: { message: string }) {
  const { palette } = useTheme()
  return (
    <Box className="h-24 flex items-center justify-center">
      <Typography sx={{ fontSize: 12, color: palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(60,40,100,0.3)' }}>
        {message}
      </Typography>
    </Box>
  )
}
