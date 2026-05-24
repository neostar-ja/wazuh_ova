import React from 'react'
import { Box, Typography, useTheme } from '@mui/material'

interface SidebarSectionProps {
  label: string
  collapsed: boolean
}

export default function SidebarSection({ label, collapsed }: SidebarSectionProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  if (collapsed) {
    return (
      <Box sx={{ px: 1.5, pt: 2, pb: 0.5 }}>
        <Box sx={{
          height: 1,
          bgcolor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.1)',
        }} />
      </Box>
    )
  }

  return (
    <Box sx={{ px: 2.5, pt: 2.25, pb: 0.75, display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Typography sx={{
        fontSize: 10.5, fontWeight: 800,
        color: isDark ? 'rgba(155,125,196,0.5)' : 'rgba(123,91,164,0.55)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        flexShrink: 0,
        lineHeight: 1,
      }}>
        {label}
      </Typography>
      <Box sx={{
        height: 1, flex: 1,
        bgcolor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.09)',
      }} />
    </Box>
  )
}
