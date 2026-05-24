import React from 'react'
import { Box, Skeleton, useTheme } from '@mui/material'
import { PageShellProps, PageMaxWidth } from './layout.types'
import { PageHeader } from '../PageHeader'

function resolveMaxWidth(mw: PageMaxWidth): string | number {
  if (mw === 'full')    return '100%'
  if (mw === 'wide')    return 1600
  if (mw === 'content') return 1280
  return mw
}

function PageLoadingSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
      {/* Header skeleton */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Skeleton width={80} height={14} sx={{ borderRadius: '6px' }} />
          <Skeleton width={260} height={32} sx={{ borderRadius: '8px' }} />
          <Skeleton width={180} height={14} sx={{ borderRadius: '6px' }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton width={90} height={34} sx={{ borderRadius: '10px' }} />
          <Skeleton width={120} height={34} sx={{ borderRadius: '10px' }} />
        </Box>
      </Box>
      {/* Metric strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={96} sx={{ borderRadius: '14px' }} />
        ))}
      </Box>
      {/* Content rows */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
        <Skeleton height={240} sx={{ borderRadius: '14px' }} />
        <Skeleton height={240} sx={{ borderRadius: '14px' }} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={180} sx={{ borderRadius: '14px' }} />
        ))}
      </Box>
    </Box>
  )
}

/**
 * PageShell — universal content-area wrapper for every route.
 *
 * Handles:
 *  - Consistent page padding (responsive)
 *  - Max-width constraint with centring
 *  - Optional PageHeader (title, subtitle, actions, status, breadcrumbs)
 *  - Page-level loading / error / empty state
 *  - Subtle background tint per variant
 *  - No horizontal overflow
 *
 * Usage:
 *   <PageShell title="Threat Alerts" status="live" actions={<Button>…</Button>}>
 *     …page content…
 *   </PageShell>
 *
 * Variants:
 *   default     — generic page
 *   dashboard   — overview/metric-heavy page
 *   workbench   — investigate/search split layout
 *   console     — alert list / event console
 *   report      — compliance/audit output
 *   management  — admin settings / tables
 */
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
    ? { xs: '12px', sm: '16px', md: '20px', xl: '24px' }
    : { xs: '16px', sm: '20px', md: '28px', xl: '32px' }

  const py = density === 'compact'
    ? { xs: '12px', sm: '14px', md: '16px' }
    : { xs: '16px', sm: '20px', md: '24px' }

  const gapY = density === 'compact' ? { xs: 2, md: 2.5 } : { xs: 2.5, md: 3.5 }

  const hasHeader = !!(title || subtitle || breadcrumbs?.length || actions || status)

  // Subtle per-variant bg tint
  const variantBg: Record<string, string> = {
    dashboard:  isDark ? 'rgba(123,91,164,0.03)' : 'rgba(123,91,164,0.015)',
    workbench:  isDark ? 'rgba(59,130,246,0.03)' : 'rgba(59,130,246,0.015)',
    console:    isDark ? 'rgba(239,68,68,0.025)' : 'rgba(239,68,68,0.012)',
    report:     isDark ? 'rgba(34,197,94,0.025)' : 'rgba(34,197,94,0.012)',
    management: isDark ? 'rgba(100,116,139,0.04)' : 'rgba(100,116,139,0.02)',
    default:    'transparent',
  }

  const resolvedMax = resolveMaxWidth(maxWidth)

  return (
    <Box
      className={`page-enter ${className}`}
      sx={{
        width: '100%',
        minHeight: 0,
        overflowX: 'hidden',
        bgcolor: variantBg[variant] ?? 'transparent',
      }}
    >
      <Box
        sx={{
          maxWidth: resolvedMax,
          mx: 'auto',
          px,
          py,
          display: 'flex',
          flexDirection: 'column',
          gap: gapY,
          minWidth: 0,
        }}
      >
        {/* Page header */}
        {hasHeader && (
          <PageHeader
            title={title ?? ''}
            subtitle={subtitle}
            breadcrumbs={breadcrumbs}
            actions={actions}
            status={status as 'live' | 'paused' | 'offline' | undefined}
            statusLabel={statusLabel}
            lastUpdated={lastUpdated}
            loading={loading && !title}
          />
        )}

        {/* Page body */}
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
