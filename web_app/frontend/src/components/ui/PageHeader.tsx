import { ReactNode } from 'react'
import { Box, Typography, Breadcrumbs, Link, Chip, Skeleton } from '@mui/material'
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  actions?: ReactNode
  status?: 'live' | 'paused' | 'offline'
  statusLabel?: string
  lastUpdated?: string
  loading?: boolean
  className?: string
}

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
  const statusConfig = {
    live:    { color: '#22C55E', label: 'LIVE',   animate: true  },
    paused:  { color: '#9A90BF', label: 'PAUSED', animate: false },
    offline: { color: '#EF4444', label: 'OFFLINE', animate: false },
  }
  const sc = status ? statusConfig[status] : null

  return (
    <Box className={`flex items-start justify-between flex-wrap gap-3 ${className}`}>
      <Box>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs
            separator={<NavigateNextRoundedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
            sx={{ mb: 0.5 }}
          >
            {breadcrumbs.map((b, i) =>
              b.href ? (
                <Link key={i} href={b.href} sx={{ fontSize: 11.5, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                  {b.label}
                </Link>
              ) : (
                <Typography key={i} sx={{ fontSize: 11.5, color: 'text.disabled' }}>
                  {b.label}
                </Typography>
              )
            )}
          </Breadcrumbs>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {loading ? (
            <Skeleton width={200} height={32} />
          ) : (
            <Typography sx={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>
              {title}
            </Typography>
          )}

          {sc && (
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 1.5, py: 0.5, borderRadius: '20px',
                bgcolor: `${sc.color}12`,
                border: `1.5px solid ${sc.color}35`,
              }}
            >
              <FiberManualRecordIcon sx={{
                fontSize: 8, color: sc.color,
                animation: sc.animate ? 'pulseGlow 2.5s ease-in-out infinite' : 'none',
              }} />
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: sc.color, letterSpacing: '0.08em' }}>
                {statusLabel || sc.label}
              </Typography>
            </Box>
          )}
        </Box>

        {(subtitle || lastUpdated) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.4, flexWrap: 'wrap' }}>
            {subtitle && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {subtitle}
              </Typography>
            )}
            {lastUpdated && (
              <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: '"IBM Plex Mono", monospace' }}>
                {lastUpdated}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {actions && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {actions}
        </Box>
      )}
    </Box>
  )
}

export default PageHeader
