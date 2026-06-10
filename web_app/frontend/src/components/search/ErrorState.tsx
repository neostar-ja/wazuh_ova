/**
 * Error State - Shows error message and retry button
 */

import { Box, Typography, Button, useTheme } from '@mui/material'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = 'เกิดข้อผิดพลาดในการค้นหา',
  onRetry,
}: ErrorStateProps) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        borderRadius: 5,
        p: { xs: 3, md: 5 },
        border: '1px solid rgba(239,68,68,0.24)',
        background: 'rgba(239,68,68,0.08)',
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 3,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'rgba(239,68,68,0.12)',
          color: '#EF4444',
          mx: 'auto',
          mb: 2,
        }}
      >
        <ErrorOutlineRoundedIcon sx={{ fontSize: 32 }} />
      </Box>

      <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#EF4444', mb: 1 }}>
        เกิดข้อผิดพลาด
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
        {message}
      </Typography>

      {onRetry && (
        <Button
          variant="contained"
          startIcon={<RefreshRoundedIcon />}
          onClick={onRetry}
          sx={{
            bgcolor: '#EF4444',
            '&:hover': { bgcolor: '#DC2626' },
          }}
        >
          ลองใหม่
        </Button>
      )}
    </Box>
  )
}
