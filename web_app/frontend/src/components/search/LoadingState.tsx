/**
 * Loading State
 * Shows loading skeleton while data is being fetched
 */

import { Box, Skeleton, Stack, useTheme } from '@mui/material'

export function LoadingState() {
  const theme = useTheme()

  return (
    <Stack spacing={2.5}>
      {/* Metrics Grid Loading */}
      <Box
        sx={{
          borderRadius: 5,
          p: 2.5,
          border: '1px solid rgba(15,196,255,0.12)',
          background: 'rgba(7,18,31,0.46)',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 1.5,
          }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width="100%"
              height={102}
              sx={{ borderRadius: 4 }}
            />
          ))}
        </Box>
      </Box>

      {/* Coverage Section Loading */}
      <Box
        sx={{
          borderRadius: 5,
          p: 2.5,
          border: '1px solid rgba(15,196,255,0.12)',
          background: 'rgba(7,18,31,0.46)',
        }}
      >
        <Skeleton variant="text" width="40%" sx={{ mb: 1.5 }} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 1.5,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width="100%"
              height={80}
              sx={{ borderRadius: 3 }}
            />
          ))}
        </Box>
      </Box>

      {/* Timeline Loading */}
      <Box
        sx={{
          borderRadius: 5,
          p: 2.5,
          border: '1px solid rgba(15,196,255,0.12)',
          background: 'rgba(7,18,31,0.46)',
          minHeight: 250,
        }}
      >
        <Skeleton variant="text" width="20%" sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 2 }} />
      </Box>

      {/* Table Loading */}
      <Box
        sx={{
          borderRadius: 5,
          p: 2.5,
          border: '1px solid rgba(15,196,255,0.12)',
          background: 'rgba(7,18,31,0.46)',
        }}
      >
        <Skeleton variant="text" width="15%" sx={{ mb: 2 }} />
        <Stack spacing={1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="text"
              width="100%"
              height={40}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  )
}
