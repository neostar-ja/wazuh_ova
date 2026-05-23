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
      className={`rounded-2xl overflow-hidden flex flex-col ${className}`}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        height: '100%',
        minHeight,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          flexShrink: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          ...(accent
            ? {
                borderLeft: `3px solid ${accentColor}`,
                background: `linear-gradient(90deg, ${accentColor}0A 0%, transparent 60%)`,
              }
            : {}),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          {icon && (
            <Box sx={{ color: iconColor || accentColor, display: 'flex', fontSize: 17, flexShrink: 0 }}>
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.15 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {action && <Box sx={{ flexShrink: 0, ml: 1 }}>{action}</Box>}
      </Box>

      {/* Body */}
      <Box className="flex-1 overflow-auto" sx={{ p: noPad ? 0 : 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: noPad ? 2 : 0 }}>
            {[80, 60, 70, 50].map((w, i) => (
              <Skeleton key={i} height={24} width={`${w}%`} />
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
