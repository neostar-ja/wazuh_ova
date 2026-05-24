import React from 'react'
import { Box } from '@mui/material'
import { ContentGridProps, GridGap } from './layout.types'

const GAP_MAP: Record<GridGap, { xs: number; md: number }> = {
  xs: { xs: 1,   md: 1.5 },
  sm: { xs: 1.5, md: 2   },
  md: { xs: 2,   md: 2.5 },
  lg: { xs: 2.5, md: 3.5 },
}

/**
 * ContentGrid — responsive CSS-grid wrapper.
 *
 * Three modes:
 *
 * 1. fixed columns (default)
 *    <ContentGrid columns={3} gap="md">
 *      <Card/><Card/><Card/>
 *    </ContentGrid>
 *
 * 2. auto-fit (fills available width, wraps naturally)
 *    <ContentGrid variant="auto-fit" minCardWidth={280}>
 *      …many cards…
 *    </ContentGrid>
 *
 * 3. dashboard 12-column grid (use className for col-span)
 *    <ContentGrid variant="dashboard" gap="md">
 *      <Box className="col-span-12 lg:col-span-8">…</Box>
 *      <Box className="col-span-12 lg:col-span-4">…</Box>
 *    </ContentGrid>
 *
 * Notes:
 *  - Never overflows horizontally (minWidth:0 on items)
 *  - Tables / charts inside still need their own overflow handling
 */
export function ContentGrid({
  children,
  columns = 1,
  gap = 'md',
  minCardWidth = 260,
  variant = 'fixed',
  align = 'stretch',
  className = '',
}: ContentGridProps) {
  const g = GAP_MAP[gap]

  if (variant === 'auto-fit') {
    return (
      <Box
        className={className}
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(${minCardWidth}px, 1fr))`,
          gap: { xs: g.xs, md: g.md },
          alignItems: align,
          minWidth: 0,
          '& > *': { minWidth: 0 },
        }}
      >
        {children}
      </Box>
    )
  }

  if (variant === 'dashboard') {
    // 12-column grid — children use className like "col-span-12 lg:col-span-8"
    return (
      <Box
        className={`grid grid-cols-12 ${className}`}
        sx={{
          gap: { xs: g.xs, md: g.md },
          alignItems: align,
          minWidth: 0,
          '& > *': { minWidth: 0 },
        }}
      >
        {children}
      </Box>
    )
  }

  // fixed: map column count to responsive breakpoints
  const colMap: Record<number, object> = {
    1:  { xs: 1 },
    2:  { xs: 1, sm: 2 },
    3:  { xs: 1, sm: 2, md: 3 },
    4:  { xs: 1, sm: 2, lg: 4 },
    6:  { xs: 1, sm: 2, md: 3, lg: 6 },
    12: { xs: 1, sm: 2, md: 3, lg: 4 },
  }

  const gridCols = colMap[columns] ?? { xs: 1 }
  const gridTemplateColumns = Object.entries(gridCols).reduce<Record<string, string>>(
    (acc, [bp, count]) => {
      acc[bp] = `repeat(${count}, 1fr)`
      return acc
    },
    {}
  )

  return (
    <Box
      className={className}
      sx={{
        display: 'grid',
        gridTemplateColumns,
        gap: { xs: g.xs, md: g.md },
        alignItems: align,
        minWidth: 0,
        '& > *': { minWidth: 0 },
      }}
    >
      {children}
    </Box>
  )
}

export default ContentGrid
