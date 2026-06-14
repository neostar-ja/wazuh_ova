import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { GRADIENT } from '../ui/tokens'

function AppFooter() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const year = new Date().getFullYear()

  return (
    <Box
      component="footer"
      sx={{
        flexShrink: 0,
        position: 'relative',
        borderTop: '1px solid',
        borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)',
        backgroundColor: isDark ? 'rgba(11,17,32,0.72)' : 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -1, left: 0, right: 0, height: '1px',
          background: GRADIENT.aurora,
          opacity: isDark ? 0.45 : 0.3,
        },
      }}
    >
      <Box
        sx={{
          maxWidth: 1680,
          mx: 'auto',
          px: { xs: 2, sm: 3, lg: 4 },
          py: 1.5,
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 0.75,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 6, height: 6, borderRadius: '50%',
            bgcolor: '#22C55E',
            boxShadow: '0 0 6px rgba(34,197,94,0.55)',
            animation: 'pulseGlow 3s ease-in-out infinite',
          }} />
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
            SOC Center · Wazuh Security Platform
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 11.5, color: 'text.disabled', textAlign: { xs: 'left', md: 'right' } }}>
          พัฒนาโดย กลุ่มงานโครงสร้างพื้นฐานดิจิทัลทางการแพทย์ · © {year} Walailak University
        </Typography>
      </Box>
    </Box>
  )
}

export default function Layout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100dvh',
        width: '100%',
        bgcolor: 'background.default',
      }}
    >
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isMobile={isMobile}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />

      <Box
        component="main"
        sx={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: 'background.default',
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
                radial-gradient(circle at top right, rgba(79,110,247,0.12), transparent 30%),
                radial-gradient(circle at 15% 18%, rgba(34,211,238,0.08), transparent 24%),
                linear-gradient(180deg, rgba(255,255,255,0.015), transparent 28%)
              `
              : `
                radial-gradient(circle at top right, rgba(79,110,247,0.08), transparent 30%),
                radial-gradient(circle at 15% 18%, rgba(34,211,238,0.05), transparent 24%),
                linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0))
              `,
          }}
        />

        <Topbar onMenuClick={() => setMobileOpen((value) => !value)} />

        <Box
          className="scrollbar-thin"
          sx={{
            position: 'relative',
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              flex: 1,
              width: '100%',
              px: { xs: 1, sm: 1.5, md: 2 },
              py: { xs: 1, sm: 1.5, md: 2 },
              boxSizing: 'border-box',
            }}
          >
            <Outlet />
          </Box>

          <AppFooter />
        </Box>
      </Box>
    </Box>
  )
}
