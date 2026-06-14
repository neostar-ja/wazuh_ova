import { ReactNode } from 'react'
import { Box, Typography, Skeleton } from '@mui/material'
import { SectionCard } from './SectionCard'
import { EmptyState, ErrorState } from './EmptyState'

interface ChartCardProps {
  title: string
  subtitle?: string
  insight?: string
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  error?: boolean
  errorMessage?: string
  onRetry?: () => void
  children: ReactNode
  action?: ReactNode
  accent?: string
  icon?: ReactNode
  height?: number | string
  noPad?: boolean
}

export function ChartCard({
  title,
  subtitle,
  insight,
  loading = false,
  empty = false,
  emptyMessage,
  error = false,
  errorMessage,
  onRetry,
  children,
  action,
  accent,
  icon,
  height = 240,
  noPad = false,
}: ChartCardProps) {
  let body: ReactNode

  if (loading) {
    body = (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Skeleton variant="rectangular" width="100%" height={height} sx={{ borderRadius: 2 }} />
      </Box>
    )
  } else if (error) {
    body = <ErrorState message={errorMessage} onRetry={onRetry} />
  } else if (empty) {
    body = <EmptyState description={emptyMessage} compact />
  } else {
    body = (
      <Box sx={{ height }}>
        {children}
      </Box>
    )
  }

  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      action={action}
      accent={accent}
      noPad={noPad}
    >
      {body}
      {insight && !loading && !error && !empty && (
        <Box sx={{
          mt: 1.5,
          px: 1.5, py: 1,
          borderRadius: '8px',
          bgcolor: 'rgba(79,110,247,0.06)',
          border: '1px solid rgba(79,110,247,0.12)',
        }}>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.5 }}>
            💡 {insight}
          </Typography>
        </Box>
      )}
    </SectionCard>
  )
}

export default ChartCard
