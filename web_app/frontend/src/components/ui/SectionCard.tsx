import { ReactNode } from 'react'
import { Box, Typography, Skeleton, Divider, useTheme } from '@mui/material'
import { getBorder, getSoftBg, getSurface, RADIUS } from './tokens'

type SectionCardSize = 'sm' | 'md' | 'lg'
type SectionCardVariant = 'default' | 'glass' | 'flat' | 'elevated'
type SectionCardDensity = 'comfortable' | 'compact'

interface SectionCardProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  iconColor?: string
  action?: ReactNode
  children: ReactNode
  accent?: string
  size?: SectionCardSize
  variant?: SectionCardVariant
  density?: SectionCardDensity
  noPad?: boolean
  minHeight?: number | string
  bodyScroll?: boolean
  headerDivider?: boolean
  toolbar?: ReactNode
  footer?: ReactNode
  loading?: boolean
  error?: ReactNode
  empty?: ReactNode
  className?: string
}

const SIZE_MAP: Record<SectionCardSize, { titleSize: number; subtitleSize: number; iconSize: number; headerPx: number; headerPy: number }> = {
  sm: { titleSize: 12.5, subtitleSize: 10.5, iconSize: 15, headerPx: 1.75, headerPy: 1.25 },
  md: { titleSize: 13.5, subtitleSize: 11, iconSize: 16, headerPx: 2.25, headerPy: 1.5 },
  lg: { titleSize: 15, subtitleSize: 12, iconSize: 18, headerPx: 2.5, headerPy: 1.75 },
}

const DENSITY_PAD: Record<SectionCardDensity, number> = {
  comfortable: 2,
  compact: 1.25,
}

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
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accentColor = accent || iconColor || theme.palette.primary.main
  const sz = SIZE_MAP[size]
  const bodyPad = noPad ? 0 : DENSITY_PAD[density]

  const surfaceLevel = variant === 'elevated'
    ? 'elevated'
    : variant === 'flat'
      ? 'flat'
      : variant === 'glass'
        ? 'glass'
        : 'default'

  return (
    <Box
      className={className}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight,
        height: '100%',
        overflow: 'hidden',
        borderRadius: `${RADIUS.card}px`,
        border: variant === 'elevated' ? 'none' : `1px solid ${getBorder(isDark, 'default')}`,
        backgroundColor: getSurface(isDark, surfaceLevel),
        backdropFilter: variant === 'flat' ? 'none' : 'blur(18px)',
        WebkitBackdropFilter: variant === 'flat' ? 'none' : 'blur(18px)',
        boxShadow: variant === 'flat'
          ? 'none'
          : isDark
            ? '0 18px 36px rgba(2,6,23,0.18)'
            : '0 16px 32px rgba(15,23,42,0.06)',
        transition: 'border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
        '&:hover': {
          borderColor: variant === 'elevated' ? undefined : getBorder(isDark, 'divider'),
          boxShadow: variant === 'flat'
            ? 'none'
            : isDark
              ? '0 20px 40px rgba(2,6,23,0.22)'
              : '0 18px 36px rgba(15,23,42,0.08)',
        },
        '&::before': accentColor ? {
          content: '""',
          position: 'absolute',
          insetInline: 0,
          top: 0,
          height: 2,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}22)`,
        } : undefined,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          px: sz.headerPx,
          py: sz.headerPy,
          borderBottom: headerDivider ? `1px solid ${getBorder(isDark, 'divider')}` : 'none',
          backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.35)',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
          {icon && (
            <Box
              sx={{
                width: sz.iconSize + 16,
                height: sz.iconSize + 16,
                borderRadius: 3,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconColor || accentColor,
                bgcolor: getSoftBg(iconColor || accentColor, isDark ? 16 : 10),
              }}
            >
              {icon}
            </Box>
          )}

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: sz.titleSize,
                fontWeight: 700,
                lineHeight: 1.35,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                sx={{
                  mt: 0.25,
                  fontSize: sz.subtitleSize,
                  lineHeight: 1.45,
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>

      {toolbar && (
        <Box
          sx={{
            px: sz.headerPx,
            py: 1,
            borderBottom: `1px solid ${getBorder(isDark, 'divider')}`,
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,250,252,0.9)',
            flexShrink: 0,
          }}
        >
          {toolbar}
        </Box>
      )}

      <Box
        className={bodyScroll ? 'scrollbar-thin overflow-auto' : ''}
        sx={{
          flex: bodyScroll ? '1 1 auto' : 1,
          minHeight: 0,
          p: bodyPad,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, p: noPad ? 2 : 0 }}>
            {[92, 74, 86, 58].map((width, index) => (
              <Skeleton key={index} height={18} width={`${width}%`} sx={{ borderRadius: 2 }} />
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

      {footer && (
        <>
          <Divider sx={{ borderColor: getBorder(isDark, 'divider') }} />
          <Box
            sx={{
              px: sz.headerPx,
              py: 1.25,
              backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(248,250,252,0.9)',
              flexShrink: 0,
            }}
          >
            {footer}
          </Box>
        </>
      )}
    </Box>
  )
}

export default SectionCard
