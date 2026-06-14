import { useMemo } from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartTip } from 'recharts'
import { BRAND, SOURCE_COLOR_MAP, fmtN, getChartTipStyle } from '../../ui/tokens'
import { AlertStats } from '../../../types/alert'
import { PanelCard, PanelHeader } from './shared'

// ── Threat Distribution Panel ─────────────────────────────────────────────────
export function ThreatDistributionPanel({ stats, onSourceClick }: { stats?: AlertStats; onSourceClick: (label: string) => void }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const data = useMemo(() => {
    const sources = stats?.by_source || []
    return sources.slice(0, 6).map(s => ({
      name: s.name,
      count: s.count,
      color: SOURCE_COLOR_MAP[s.name] || BRAND.primary,
      pct: 0,
    })).filter(d => d.count > 0)
  }, [stats])

  const total = data.reduce((sum, d) => sum + d.count, 0)
  const withPct = data.map(d => ({ ...d, pct: total > 0 ? Math.round((d.count / total) * 100) : 0 }))

  if (!data.length) return (
    <PanelCard accentColor={BRAND.primary} isDark={isDark}>
      <PanelHeader accent={BRAND.primary} title="Threat Distribution" />
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>ไม่มีข้อมูล</Typography>
      </Box>
    </PanelCard>
  )

  const totalBadge = (
    <Box sx={{ px: 1, py: 0.3, borderRadius: '6px', bgcolor: `${BRAND.primary}14`, border: `1px solid ${BRAND.primary}28` }}>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: BRAND.primaryLight, fontFamily: '"IBM Plex Mono"', lineHeight: 1 }}>
        {fmtN(total)}
      </Typography>
    </Box>
  )

  return (
    <PanelCard accentColor={BRAND.primary} isDark={isDark}>
      <PanelHeader accent={BRAND.primary} title="Threat Distribution" badge={totalBadge} />

      {/* Donut centred + legend below */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: 1.75, pb: 1.5, gap: 1.25, minHeight: 0 }}>
        {/* Donut */}
        <Box sx={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <Box sx={{ position: 'relative', width: 110, height: 110 }}>
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={withPct} dataKey="count" cx="50%" cy="50%" innerRadius={30} outerRadius={50}
                  paddingAngle={2} startAngle={90} endAngle={-270}>
                  {withPct.map((entry, idx) => <Cell key={idx} fill={entry.color} stroke="none" />)}
                </Pie>
                <RechartTip contentStyle={getChartTipStyle(isDark)} formatter={(v: any, name: any) => [fmtN(Number(v)), name]} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: 'text.disabled', lineHeight: 1, mb: 0.2 }}>Total</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: BRAND.primaryLight, lineHeight: 1, fontFamily: '"IBM Plex Mono"' }}>{fmtN(total)}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Legend rows */}
        <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {withPct.map(d => (
            <Box key={d.name} onClick={() => onSourceClick(d.name)} sx={{
              display: 'flex', alignItems: 'center', gap: 0.75,
              cursor: 'pointer', borderRadius: '8px', px: 0.75, py: 0.45,
              border: '1px solid transparent',
              transition: 'all 0.15s',
              '&:hover': { bgcolor: `${d.color}12`, borderColor: `${d.color}30` },
            }}>
              {/* color swatch */}
              <Box sx={{ width: 8, height: 8, borderRadius: '3px', bgcolor: d.color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 10, color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                {d.name}
              </Typography>
              {/* percent pill */}
              <Box sx={{ px: 0.6, py: 0.1, borderRadius: '4px', bgcolor: `${d.color}18`, flexShrink: 0 }}>
                <Typography sx={{ fontSize: 8.5, fontWeight: 800, color: d.color, lineHeight: 1, fontFamily: '"IBM Plex Mono"' }}>{d.pct}%</Typography>
              </Box>
              <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"', flexShrink: 0, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>
                {fmtN(d.count)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </PanelCard>
  )
}
