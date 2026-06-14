import { Card, CardContent, Box, Typography, CircularProgress, useTheme } from '@mui/material'
import { fmtN } from '../../ui/tokens'
import { Sparkline } from '../shared/AlertUiBits'

// ── Alert Metric Card (MetricHero style) ─────────────────────────────────────
interface AlertMetricCardProps {
  title: string
  count?: number | null
  subtitle?: string
  subtitleLabel?: string
  color: string
  icon: React.ReactNode
  sparklineData?: { timestamp: string; count: number }[]
  isActive?: boolean
  loading?: boolean
  onClick?: () => void
  badge?: string
  accentLabel?: string
}

export function AlertMetricCard({ title, count, subtitle, subtitleLabel, color, icon, sparklineData, isActive, loading, onClick, badge, accentLabel }: AlertMetricCardProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  return (
    <Card onClick={onClick} sx={{
      cursor: onClick ? 'pointer' : 'default',
      position: 'relative', overflow: 'hidden',
      height: { xs: 'auto', sm: '116px' },
      border: `1px solid`,
      borderColor: isActive ? color : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
      background: isActive
        ? `linear-gradient(135deg, ${color}14 0%, ${color}04 100%)`
        : isDark ? 'rgba(16,14,30,0.7)' : 'rgba(255,255,255,0.85)',
      boxShadow: isActive
        ? `0 0 0 2px ${color}25, 0 4px 16px ${color}18`
        : isDark ? '0 1px 6px rgba(0,0,0,0.3)' : '0 1px 6px rgba(0,0,0,0.06)',
      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
      '&:hover': onClick ? {
        transform: 'translateY(-3px)',
        boxShadow: isActive
          ? `0 0 0 2px ${color}35, 0 8px 24px ${color}25`
          : `0 6px 20px ${color}18`,
        borderColor: color,
        '& .card-watermark': { opacity: 0.08 },
      } : {},
    }}>
      {/* Top accent bar */}
      <Box sx={{ height: 2.5, background: `linear-gradient(90deg, ${color} 0%, ${color}55 100%)` }} />
      {/* Watermark icon — very faint */}
      <Box className="card-watermark" sx={{
        position: 'absolute', bottom: 4, right: 4,
        color, opacity: 0.05, lineHeight: 1,
        transform: 'scale(2.6)', transformOrigin: 'bottom right',
        pointerEvents: 'none', transition: 'opacity 0.25s ease',
      }}>{icon}</Box>
      <CardContent sx={{ p: '10px 14px !important', position: 'relative', zIndex: 1, height: 'calc(100% - 2.5px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Label row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: isActive ? color : 'text.disabled', lineHeight: 1 }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            {badge && <Box sx={{ px: 0.6, py: 0.1, borderRadius: '4px', bgcolor: `${color}25`, border: `1px solid ${color}40` }}>
              <Typography sx={{ fontSize: 8, fontWeight: 900, color, lineHeight: 1, letterSpacing: '0.06em' }}>{badge}</Typography>
            </Box>}
            {isActive && <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 6px ${color}` }} />}
          </Box>
        </Box>

        {/* Main content */}
        {loading ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}><CircularProgress size={20} sx={{ color }} /></Box>
        ) : subtitle != null ? (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600, mb: 0.2, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitleLabel || 'Top'}
            </Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color, lineHeight: 1.2, mb: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"IBM Plex Mono"', maxWidth: '100%' }}>
              {subtitle || '—'}
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {count != null ? fmtN(count) : '—'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: { xs: 26, sm: 30 }, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.03em' }}>
              {count != null ? fmtN(count) : '—'}
            </Typography>
          </Box>
        )}

        {/* Footer row: sparkline + accent label */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 0.25, minHeight: 22 }}>
          {sparklineData && sparklineData.length > 0 ? (
            <Box sx={{ opacity: 0.65 }}><Sparkline data={sparklineData} color={color} height={22} /></Box>
          ) : <Box />}
          {accentLabel && !loading && (
            <Typography sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 700, letterSpacing: '0.04em', fontFamily: '"IBM Plex Mono"' }}>{accentLabel}</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Shared panel card style ───────────────────────────────────────────────────
export const PANEL_HEIGHT = 288

export function PanelCard({ accentColor, children, isDark }: { accentColor: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <Box sx={{
      height: PANEL_HEIGHT,
      borderRadius: '14px',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
      background: isDark
        ? `linear-gradient(145deg, rgba(22,18,42,0.92) 0%, rgba(16,14,30,0.85) 100%)`
        : `linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(248,247,255,0.95) 100%)`,
      boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.35)' : '0 2px 12px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* top accent bar */}
      <Box sx={{ height: 2.5, background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}50 100%)`, flexShrink: 0 }} />
      {/* decorative glow */}
      <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
      {children}
    </Box>
  )
}

export function PanelHeader({ accent, title, badge }: { accent: string; title: string; badge?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.75, pt: 1.5, pb: 1, flexShrink: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ width: 3.5, height: 14, borderRadius: 2, bgcolor: accent, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.primary', letterSpacing: '-0.01em' }}>{title}</Typography>
      </Box>
      {badge}
    </Box>
  )
}
