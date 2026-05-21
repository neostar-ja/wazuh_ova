import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, useTheme, useMediaQuery } from '@mui/material'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const DRAWER_WIDTH = 240

export default function Layout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDrawerToggle = () => setMobileOpen(o => !o)

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onClose={handleDrawerToggle}
        isMobile={isMobile}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ml: isMobile ? 0 : `${DRAWER_WIDTH}px`,
        }}
      >
        <Topbar onMenuClick={handleDrawerToggle} drawerWidth={DRAWER_WIDTH} isMobile={isMobile} />
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: { xs: 1.5, sm: 2.5 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
