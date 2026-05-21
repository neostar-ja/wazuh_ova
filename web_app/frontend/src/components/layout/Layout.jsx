/**
 * Enhanced Modern Layout Components
 * Professional SOC Center UI with Responsive Design & Dark/Light Mode Support
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const DRAWER_WIDTH = 220

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDrawerToggle = () => setMobileOpen(o => !o)

  return (
    <Box
      className="layout-container"
      sx={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'background.default',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 12% 18%, rgba(59,130,246,0.08) 0, transparent 28%),
            radial-gradient(circle at 84% 10%, rgba(99,102,241,0.06) 0, transparent 24%),
            linear-gradient(180deg, rgba(13,24,37,0.55) 0%, rgba(6,12,23,0) 24%)
          `,
          pointerEvents: 'none',
        },
      }}
    >
      {/* Sidebar */}
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onClose={handleDrawerToggle}
      />

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // Margin only on desktop
          ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
          transition: 'margin 300ms ease',
        }}
      >
        {/* Top navigation bar */}
        <Topbar
          onMenuClick={handleDrawerToggle}
          drawerWidth={DRAWER_WIDTH}
        />

        {/* Page content with scroll */}
        <Box
          className="layout-main"
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <Box className="layout-content content-width" sx={{ position: 'relative', zIndex: 1 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
