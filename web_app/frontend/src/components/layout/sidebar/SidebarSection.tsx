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
      <Box sx={{ px: 1.25, pt: 1.8, pb: 0.4 }}>
        <Box sx={{
          height: 1,
          bgcolor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
        }} />
      </Box>
    )
  }

  return (
    <Box sx={{ px: 2.25, pt: 1.9, pb: 0.55, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{
        fontSize: 10.5, fontWeight: 800,
        color: isDark ? 'rgba(148,163,184,0.72)' : 'rgba(71,85,105,0.72)',
        letterSpacing: '0.08em',
        flexShrink: 0,
        lineHeight: 1,
        textTransform: 'uppercase',
      }}>
        {label}
      </Typography>
      <Box sx={{
        height: 1, flex: 1,
        bgcolor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)',
      }} />
    </Box>
  )
}
