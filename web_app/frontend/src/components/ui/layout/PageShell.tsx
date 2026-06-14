import React from 'react'
import { Box, Skeleton, useTheme } from '@mui/material'
import { PageShellProps, PageMaxWidth } from './layout.types'
import { PageHeader } from '../PageHeader'

function resolveMaxWidth(maxWidth: PageMaxWidth): string | number {
  if (maxWidth === 'full') return '100%'
  if (maxWidth === 'wide') return 1600
  if (maxWidth === 'content') return 1180
  return maxWidth
}

function PageLoadingSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Skeleton width={140} height={14} sx={{ borderRadius: 2 }} />
        <Skeleton width="min(440px, 80%)" height={40} sx={{ borderRadius: 2 }} />
        <Skeleton width="min(720px, 100%)" height={18} sx={{ borderRadius: 2 }} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} height={110} sx={{ borderRadius: 4 }} />
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.6fr 1fr' }, gap: 2 }}>
        <Skeleton height={260} sx={{ borderRadius: 4 }} />
        <Skeleton height={260} sx={{ borderRadius: 4 }} />
      </Box>
    </Box>
  )
}

const VARIANT_TONES: Record<string, string> = {
  dashboard: '123,91,164',
  workbench: '56,189,248',
  console: '239,68,68',
  report: '34,197,94',
  management: '100,116,139',
  default: '123,91,164',
}

export function PageShell({
  title,
  subtitle,
  breadcrumbs,
  actions,
  status,
  statusLabel,
  lastUpdated,
  children,
  maxWidth = 'full',
  density = 'comfortable',
  variant = 'default',
  loading = false,
  error,
  empty,
  className = '',
}: PageShellProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const px = density === 'compact'
    ? { xs: 1.5, sm: 2, md: 2.5, xl: 3 }
    : { xs: 2, sm: 2.5, md: 3, xl: 3.5 }

  const py = density === 'compact'
    ? { xs: 1.5, sm: 1.75, md: 2.25 }
    : { xs: 2, sm: 2.5, md: 3 }

  const gapY = density === 'compact' ? { xs: 2, md: 2.5 } : { xs: 2.5, md: 3.25 }
  const hasHeader = !!(title || subtitle || breadcrumbs?.length || actions || status || lastUpdated)
  const maxWidthValue = resolveMaxWidth(maxWidth)
  const tone = VARIANT_TONES[variant] ?? VARIANT_TONES.default

  return (
    <Box
      className={`page-enter ${className}`}
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: 0,
        overflow: 'hidden',
        borderRadius: { xs: 0, md: 4 },
        backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.55)',
        border: { xs: 'none', md: '1px solid' },
        borderColor: { md: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.06)' },
        boxShadow: { md: isDark ? '0 18px 40px rgba(2,6,23,0.18)' : '0 18px 40px rgba(15,23,42,0.04)' },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: isDark
            ? `
              radial-gradient(circle at top right, rgba(${tone},0.12), transparent 26%),
              linear-gradient(180deg, rgba(255,255,255,0.03), transparent 26%)
            `
            : `
              radial-gradient(circle at top right, rgba(${tone},0.08), transparent 26%),
              linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0))
            `,
        }}
      />

      <Box
        sx={{
          position: 'relative',
          maxWidth: maxWidthValue,
          mx: 'auto',
          px,
          py,
          display: 'flex',
          flexDirection: 'column',
          gap: gapY,
          minWidth: 0,
        }}
      >
        {hasHeader && (
          <PageHeader
            title={title ?? ''}
            subtitle={subtitle}
            breadcrumbs={breadcrumbs}
            actions={actions}
            status={status}
            statusLabel={statusLabel}
            lastUpdated={lastUpdated}
            loading={loading && !title}
          />
        )}

        {loading ? (
          <PageLoadingSkeleton />
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

export default PageShell
