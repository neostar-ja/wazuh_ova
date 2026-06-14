import { ReactNode } from 'react'
import { Box, Typography, Breadcrumbs, Link, Chip, Skeleton } from '@mui/material'
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded'
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecordRounded'

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  actions?: ReactNode
  status?: 'live' | 'paused' | 'offline' | 'ready' | 'warning' | 'error'
  statusLabel?: string
  lastUpdated?: string
  loading?: boolean
  className?: string
}

const STATUS_CONFIG = {
  live: { color: '#22C55E', label: 'Live', animate: true },
  ready: { color: '#38BDF8', label: 'Ready', animate: false },
  paused: { color: '#A78BFA', label: 'Paused', animate: false },
  warning: { color: '#F59E0B', label: 'Warning', animate: false },
  error: { color: '#EF4444', label: 'Error', animate: false },
  offline: { color: '#94A3B8', label: 'Offline', animate: false },
} as const

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  status,
  statusLabel,
  lastUpdated,
  loading = false,
  className = '',
}: PageHeaderProps) {
  const statusMeta = status ? STATUS_CONFIG[status] : null

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', lg: 'flex-end' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', lg: 'row' },
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0, maxWidth: 980 }}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs
            separator={<NavigateNextRoundedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
            sx={{ mb: 0.8 }}
          >
            {breadcrumbs.map((breadcrumb, index) =>
              breadcrumb.href ? (
                <Link
                  key={index}
                  href={breadcrumb.href}
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'text.secondary',
                    '&:hover': { color: 'text.primary' },
                  }}
                >
                  {breadcrumb.label}
                </Link>
              ) : (
                <Typography key={index} sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 600 }}>
                  {breadcrumb.label}
                </Typography>
              )
            )}
          </Breadcrumbs>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.25 }}>
          {loading ? (
            <Skeleton width={240} height={42} sx={{ borderRadius: 2 }} />
          ) : (
            <Typography
              sx={{
                fontSize: { xs: 26, md: 32 },
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-0.04em',
                color: 'text.primary',
              }}
            >
              {title}
            </Typography>
          )}

          {statusMeta && (
            <Chip
              icon={
                <FiberManualRecordRoundedIcon
                  sx={{
                    fontSize: '0.75rem !important',
                    animation: statusMeta.animate ? 'pulseGlow 2.8s ease-in-out infinite' : 'none',
                  }}
                />
              }
              label={statusLabel || statusMeta.label}
              sx={{
                px: 0.8,
                borderRadius: 999,
                fontWeight: 700,
                color: statusMeta.color,
                bgcolor: `${statusMeta.color}14`,
                border: `1px solid ${statusMeta.color}28`,
              }}
            />
          )}
        </Box>

        {(subtitle || lastUpdated) && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.2, mt: 1 }}>
            {subtitle && (
              <Typography
                sx={{
                  maxWidth: '72ch',
                  fontSize: { xs: 13.5, md: 14.5 },
                  lineHeight: 1.7,
                  color: 'text.secondary',
                }}
              >
                {subtitle}
              </Typography>
            )}
            {lastUpdated && (
              <Typography
                sx={{
                  fontSize: 12,
                  color: 'text.disabled',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                {lastUpdated}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {actions && (
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, width: { xs: '100%', lg: 'auto' } }}>
          {actions}
        </Box>
      )}
    </Box>
  )
}

export default PageHeader
