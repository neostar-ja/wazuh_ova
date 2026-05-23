import { ReactNode } from 'react'
import { Box, Typography, Skeleton, useTheme } from '@mui/material'

interface SectionCardProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  iconColor?: string
  action?: ReactNode
  children: ReactNode
  accent?: string
  loading?: boolean
  error?: ReactNode
  empty?: ReactNode
  noPad?: boolean
  minHeight?: number | string
  className?: string
}

export function SectionCard({
  title,
  subtitle,
  icon,
  iconColor,
  action,
  children,
  accent,
  loading = false,
  error,
  empty,
  noPad = false,
  minHeight,
  className = '',
}: SectionCardProps) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const accentColor = accent || '#7B5BA4'

  return (
    <Box
      className={`flex flex-col ${className}`}
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${isDark ? 'rgba(123,91,164,0.22)' : 'rgba(123,91,164,0.14)'}`,
        bgcolor: isDark ? 'rgba(22,17,42,0.85)' : 'rgba(255,255,255,0.95)',
        backdropFilter: isDark ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: isDark ? 'blur(20px)' : 'none',
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 2px 16px rgba(123,91,164,0.1)',
        height: '100%',
        minHeight,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          borderColor: isDark ? 'rgba(123,91,164,0.35)' : 'rgba(123,91,164,0.22)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 6px 24px rgba(123,91,164,0.14)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.25,
          py: 1.5,
          flexShrink: 0,
          borderBottom: `1px solid ${isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)'}`,
          background: accent
            ? isDark
              ? `linear-gradient(90deg, ${accentColor}14 0%, transparent 70%)`
              : `linear-gradient(90deg, ${accentColor}08 0%, transparent 70%)`
            : isDark
              ? 'linear-gradient(90deg, rgba(123,91,164,0.07) 0%, transparent 60%)'
              : 'linear-gradient(90deg, rgba(123,91,164,0.04) 0%, transparent 60%)',
          borderLeft: `3px solid ${accentColor}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          {icon && (
            <Box sx={{
              color: iconColor || accentColor,
              display: 'flex',
              fontSize: 17,
              flexShrink: 0,
              filter: `drop-shadow(0 0 6px ${iconColor || accentColor}60)`,
            }}>
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{
              fontSize: 13,
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
              <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.15 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {action && <Box sx={{ flexShrink: 0, ml: 1 }}>{action}</Box>}
      </Box>

      {/* Body */}
      <Box
        className="flex-1 overflow-auto scrollbar-thin"
        sx={{ p: noPad ? 0 : 2 }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: noPad ? 2 : 0 }}>
            {[80, 60, 75, 50].map((w, i) => (
              <Skeleton key={i} height={22} width={`${w}%`} sx={{ borderRadius: '6px' }} />
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
    </Box>
  )
}

export default SectionCard
