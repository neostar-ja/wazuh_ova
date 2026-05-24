import React from 'react'
import { Box } from '@mui/material'
import { MetricGridProps, GridGap } from './layout.types'

const GAP_MAP: Record<GridGap, { xs: number; md: number }> = {
  xs: { xs: 1,   md: 1.5 },
  sm: { xs: 1.5, md: 2   },
  md: { xs: 2,   md: 2.5 },
  lg: { xs: 2.5, md: 3   },
}

// Col map per desktop count → responsive grid-template-columns
const COL_MAP: Record<number, object> = {
  2: { xs: '1fr 1fr' },
  3: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' },
  4: { xs: '1fr 1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' },
  5: { xs: '1fr 1fr', sm: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' },
  6: { xs: '1fr 1fr', sm: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' },
}

/**
 * MetricGrid — responsive container for MetricCard rows.
 *
 * Automatically distributes cards across screen widths:
 *  - Mobile: 2 columns (or 1 for very narrow)
 *  - Tablet: 3 columns
 *  - Desktop: `cols` columns (2–6)
 *
 * Usage:
 *   <MetricGrid cols={5}>
 *     <MetricCard title="Total" value={1234} color="#7B5BA4" />
 *     <MetricCard title="Critical" value={7} color="#EF4444" />
 *     …
 *   </MetricGrid>
 */
export function MetricGrid({ children, cols = 4, gap = 'md', className = '' }: MetricGridProps) {
  const g = GAP_MAP[gap]
  const gridTemplateColumns = COL_MAP[cols] ?? COL_MAP[4]

  return (
    <Box
      className={className}
      sx={{
        display: 'grid',
        gridTemplateColumns,
        gap: { xs: g.xs, md: g.md },
        minWidth: 0,
        '& > *': { minWidth: 0 },
      }}
    >
      {children}
    </Box>
  )
}

export default MetricGrid
