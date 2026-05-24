import { ReactNode } from 'react'
import { Box, Typography, Skeleton, Divider, useTheme } from '@mui/material'

// ─── Prop types ───────────────────────────────────────────────────────────────

type SectionCardSize    = 'sm' | 'md' | 'lg'
type SectionCardVariant = 'default' | 'glass' | 'flat' | 'elevated'
type SectionCardDensity = 'comfortable' | 'compact'

interface SectionCardProps {
  // Content
  title: string
  subtitle?: string
  icon?: ReactNode
  iconColor?: string
  action?: ReactNode
  children: ReactNode

  // Visual
  accent?: string
  size?: SectionCardSize
  variant?: SectionCardVariant
  density?: SectionCardDensity

  // Layout
  noPad?: boolean
  minHeight?: number | string
  bodyScroll?: boolean
  headerDivider?: boolean

  // Extra slots
  toolbar?: ReactNode
  footer?: ReactNode

  // State
  loading?: boolean
  error?: ReactNode
  empty?: ReactNode

  className?: string
}

// ─── Size maps ────────────────────────────────────────────────────────────────

const SIZE_MAP: Record<SectionCardSize, {
  titleSize: number; subtitleSize: number; iconSize: number; headerPx: number; headerPy: number
}> = {
  sm: { titleSize: 12,   subtitleSize: 10,   iconSize: 15, headerPx: 1.75, headerPy: 1.1  },
  md: { titleSize: 13,   subtitleSize: 10.5, iconSize: 17, headerPx: 2.25, headerPy: 1.5  },
  lg: { titleSize: 14.5, subtitleSize: 11.5, iconSize: 19, headerPx: 2.5,  headerPy: 1.75 },
}

const DENSITY_PAD: Record<SectionCardDensity, number> = {
  comfortable: 2,
  compact:     1.25,
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * SectionCard — standard content card for the SOC Center UI.
 *
 * Variants:
 *   default   — glass background with border (dark) / white card (light)
 *   glass     — heavier blur, slightly more transparent
 *   flat      — no shadow, subtle border only
 *   elevated  — stronger shadow, no border
 *
 * Usage:
 *   <SectionCard title="Threat Timeline" icon={<ChartIcon/>} accent="#EF4444">
 *     <MyChart />
 *   </SectionCard>
 */
export function SectionCard({
  title,
  subtitle,
  icon,
  iconColor,
  action,
  children,
  accent,
  size = 'md',
  variant = 'default',
  density = 'comfortable',
  noPad = false,
  minHeight,
  bodyScroll = false,
  headerDivider = true,
  toolbar,
  footer,
  loading = false,
  error,
  empty,
  className = '',
}: SectionCardProps) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const accentColor = accent || '#7B5BA4'
  const sz = SIZE_MAP[size]
  const bodyPad = noPad ? 0 : DENSITY_PAD[density]

  // Background / shadow per variant
  const cardBg = (() => {
    if (variant === 'glass') {
      return isDark
        ? 'rgba(18,14,34,0.78)'
        : 'rgba(255,255,255,0.82)'
    }
    if (variant === 'flat') {
      return isDark ? 'rgba(22,17,40,0.6)' : 'rgba(255,255,255,0.8)'
    }
    if (variant === 'elevated') {
      return isDark ? 'rgba(30,23,52,0.95)' : '#FFFFFF'
    }
    // default
    return isDark ? 'rgba(22,17,42,0.85)' : 'rgba(255,255,255,0.95)'
  })()

  const cardBorder = (() => {
    if (variant === 'elevated') return 'none'
    if (variant === 'flat') return `1px solid ${isDark ? 'rgba(123,91,164,0.14)' : 'rgba(123,91,164,0.1)'}`
    return `1px solid ${isDark ? 'rgba(123,91,164,0.22)' : 'rgba(123,91,164,0.14)'}`
  })()

  const cardShadow = (() => {
    if (variant === 'flat')    return 'none'
    if (variant === 'elevated') {
      return isDark
        ? '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
        : '0 8px 24px rgba(123,91,164,0.16)'
    }
    if (variant === 'glass') {
      return isDark
        ? '0 6px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
        : '0 4px 20px rgba(123,91,164,0.12)'
    }
    return isDark
      ? '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)'
      : '0 2px 16px rgba(123,91,164,0.1)'
  })()

  const blurFilter = (variant === 'glass' || variant === 'default') && isDark
    ? 'blur(20px)'
    : 'none'

  const headerBg = accent
    ? isDark
      ? `linear-gradient(90deg, ${accentColor}14 0%, transparent 70%)`
      : `linear-gradient(90deg, ${accentColor}08 0%, transparent 70%)`
    : isDark
      ? 'linear-gradient(90deg, rgba(123,91,164,0.07) 0%, transparent 60%)'
      : 'linear-gradient(90deg, rgba(123,91,164,0.04) 0%, transparent 60%)'

  const dividerColor = isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)'

  return (
    <Box
      className={`flex flex-col ${className}`}
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: cardBorder,
        bgcolor: cardBg,
        backdropFilter: blurFilter,
        WebkitBackdropFilter: blurFilter,
        boxShadow: cardShadow,
        height: '100%',
        minHeight,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          borderColor: variant !== 'elevated'
            ? isDark ? 'rgba(123,91,164,0.32)' : 'rgba(123,91,164,0.2)'
            : undefined,
          boxShadow: variant === 'flat' ? 'none' : isDark
            ? '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 6px 24px rgba(123,91,164,0.14)',
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: sz.headerPx, py: sz.headerPy,
        flexShrink: 0,
        borderBottom: headerDivider ? `1px solid ${dividerColor}` : 'none',
        background: headerBg,
        borderLeft: `3px solid ${accentColor}`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          {icon && (
            <Box sx={{
              color: iconColor || accentColor,
              display: 'flex',
              fontSize: sz.iconSize,
              flexShrink: 0,
              filter: `drop-shadow(0 0 5px ${iconColor || accentColor}55)`,
            }}>
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{
              fontSize: sz.titleSize,
              fontWeight: 700,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: isDark ? 'rgba(237,233,250,0.95)' : '#1A1033',
              letterSpacing: '-0.1px',
            }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography sx={{ fontSize: sz.subtitleSize, color: 'text.disabled', mt: 0.15, lineHeight: 1.3 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {action && <Box sx={{ flexShrink: 0, ml: 1 }}>{action}</Box>}
      </Box>

      {/* Toolbar (between header and body) */}
      {toolbar && (
        <Box sx={{
          px: sz.headerPx, py: 1,
          borderBottom: `1px solid ${dividerColor}`,
          bgcolor: isDark ? 'rgba(123,91,164,0.04)' : 'rgba(123,91,164,0.025)',
          flexShrink: 0,
        }}>
          {toolbar}
        </Box>
      )}

      {/* Body */}
      <Box
        className={bodyScroll ? 'overflow-auto scrollbar-thin' : 'flex-1'}
        sx={{
          flex: bodyScroll ? undefined : 1,
          p: bodyPad,
          minHeight: 0,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: noPad ? 2 : 0 }}>
            {[80, 60, 75, 50].map((w, i) => (
              <Skeleton key={i} height={20} width={`${w}%`} sx={{ borderRadius: '6px' }} />
            ))}
          </Box>
        ) : error ? (
          <Box>{error}</Box>
        ) : empty ? (
          <Box>{empty}</Box>
        ) : (
          children
        )}
      </Box>

      {/* Footer */}
      {footer && (
        <>
          <Divider sx={{ borderColor: dividerColor }} />
          <Box sx={{
            px: sz.headerPx, py: 1.25,
            flexShrink: 0,
            bgcolor: isDark ? 'rgba(123,91,164,0.04)' : 'rgba(123,91,164,0.025)',
          }}>
            {footer}
          </Box>
        </>
      )}
    </Box>
  )
}

export default SectionCard
