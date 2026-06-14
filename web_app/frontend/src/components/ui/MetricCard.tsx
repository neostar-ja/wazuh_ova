import { ReactNode } from 'react'
import { Box, Typography, Skeleton, Tooltip } from '@mui/material'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded'
import TrendingFlatRoundedIcon from '@mui/icons-material/TrendingFlatRounded'
import { fmtN, RADIUS } from './tokens'

interface MetricCardProps {
  title: string
  value?: number | string | null
  subtitle?: string
  icon?: ReactNode
  color?: string
  bgColor?: string
  trend?: 'up' | 'down' | 'flat'
  trendValue?: string
  loading?: boolean
  onClick?: () => void
  compact?: boolean
  animate?: boolean
  className?: string
  accent?: boolean
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = '#4F6EF7',
  bgColor,
  trend,
  trendValue,
  loading = false,
  onClick,
  compact = false,
  animate = false,
  className = '',
  accent = false,
}: MetricCardProps) {
  const bg = bgColor || `${color}12`
  const formattedValue = typeof value === 'number' ? fmtN(value) : (value ?? '—')

  const TrendIcon = trend === 'up'
    ? TrendingUpRoundedIcon
    : trend === 'down'
      ? TrendingDownRoundedIcon
      : TrendingFlatRoundedIcon

  const trendColor = trend === 'up' ? '#EF4444' : trend === 'down' ? '#22C55E' : '#8B95B3'

  return (
    <Box
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
      sx={{
        p: compact ? '12px 14px' : '16px 18px',
        bgcolor: bg,
        borderRadius: `${RADIUS.card}px`,
        border: `1px solid ${color}20`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        '&::after': accent
          ? {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: color,
              borderRadius: `${RADIUS.card}px ${RADIUS.card}px 0 0`,
            }
          : undefined,
        '&:hover': onClick
          ? {
              bgcolor: `${color}1A`,
              borderColor: `${color}35`,
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 24px ${color}20`,
            }
          : {},
      }}
    >
      {/* Watermark */}
      {icon && (
        <Box sx={{
          position: 'absolute', bottom: -8, right: -4,
          fontSize: compact ? 40 : 52,
          opacity: 0.06, color,
          pointerEvents: 'none',
          userSelect: 'none',
          display: 'flex',
        }}>
          {icon}
        </Box>
      )}

      <Typography sx={{
        fontSize: 9.5,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        color,
        mb: 0.5,
        position: 'relative',
        zIndex: 1,
      }}>
        {title}
      </Typography>

      {loading ? (
        <Skeleton width={64} height={compact ? 28 : 36} />
      ) : (
        <Typography sx={{
          fontSize: compact ? '1.4rem' : '1.9rem',
          fontWeight: 900,
          color,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          position: 'relative',
          zIndex: 1,
          fontFamily: '"IBM Plex Mono", monospace',
        }}>
          {formattedValue}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.75 }}>
        {subtitle && (
          <Typography sx={{ fontSize: 10, color: 'text.disabled', position: 'relative', zIndex: 1 }}>
            {subtitle}
          </Typography>
        )}
        {trend && !loading && (
          <Tooltip title={trendValue || ''}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <TrendIcon sx={{ fontSize: 13, color: trendColor }} />
              {trendValue && (
                <Typography sx={{ fontSize: 10, color: trendColor, fontWeight: 700 }}>
                  {trendValue}
                </Typography>
              )}
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  )
}

export default MetricCard
