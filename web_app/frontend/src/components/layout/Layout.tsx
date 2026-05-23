import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, Typography, Chip, useTheme, useMediaQuery } from '@mui/material'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import ShieldRoundedIcon   from '@mui/icons-material/ShieldRounded'
import Sidebar, { DRAWER_WIDTH, DRAWER_COLLAPSED } from './Sidebar'
import Topbar from './Topbar'

// ─── Footer ───────────────────────────────────────────────────────────────────
function AppFooter() {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const year = new Date().getFullYear()

  return (
    <Box component="footer" sx={{
      flexShrink: 0,
      borderTop: '1px solid',
      borderColor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.1)',
      bgcolor: isDark ? 'rgba(12,8,20,0.7)' : 'rgba(250,248,255,0.9)',
      backdropFilter: 'blur(12px)',
      px: { xs: 2, sm: 3 },
      py: 1.25,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>

        {/* Left */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 22, height: 22, borderRadius: '6px', flexShrink: 0,
            background: 'linear-gradient(135deg,#7B5BA4,#5A3E85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SecurityRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />
          </Box>
          <Typography sx={{ fontSize: 11.5, fontWeight: 500,
            color: isDark ? 'rgba(237,233,250,0.45)' : 'rgba(26,16,51,0.45)' }}>
            <Box component="span" sx={{ fontWeight: 700, color: isDark ? 'rgba(237,233,250,0.7)' : '#5A3E85' }}>
              SOC Center
            </Box>{' '}v2.0 · Powered by{' '}
            <Box component="span" sx={{ fontWeight: 600, color: '#7B5BA4' }}>Wazuh SIEM</Box>
          </Typography>
          <Box sx={{ width: 1, height: 12, bgcolor: 'rgba(123,91,164,0.2)', display: { xs: 'none', sm: 'block' } }} />
          <Typography sx={{ fontSize: 11, display: { xs: 'none', sm: 'block' },
            color: isDark ? 'rgba(237,233,250,0.3)' : 'rgba(26,16,51,0.35)' }}>
            © {year} มหาวิทยาลัยวลัยลักษณ์
          </Typography>
        </Box>

        {/* Center — system status */}
        <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 2 }}>
          {['Wazuh Manager', 'OpenSearch', 'API'].map(s => (
            <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%', bgcolor: '#22C55E',
                boxShadow: '0 0 6px rgba(34,197,94,0.8)',
                animation: 'pulseGlow 3s ease-in-out infinite',
              }} />
              <Typography sx={{ fontSize: 11, color: isDark ? 'rgba(237,233,250,0.4)' : 'rgba(26,16,51,0.4)' }}>{s}</Typography>
            </Box>
          ))}
        </Box>

        {/* Right */}
        <Chip
          size="small"
          label="hospital.wu.ac.th"
          icon={<ShieldRoundedIcon sx={{ fontSize: '13px !important' }} />}
          sx={{
            display: { xs: 'none', md: 'flex' },
            height: 24, fontSize: 11, fontWeight: 600,
            bgcolor: isDark ? 'rgba(123,91,164,0.1)' : 'rgba(123,91,164,0.07)',
            color: isDark ? '#9B7DC4' : '#7B5BA4',
            border: '1px solid', borderColor: isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.12)',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Box>
    </Box>
  )
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function Layout() {
  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen]           = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      bgcolor: 'background.default',
    }}>

      {/* ── Sidebar ── */}
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isMobile={isMobile}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      {/* ── Main area (fills remaining width exactly) ── */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Topbar */}
        <Topbar onMenuClick={() => setMobileOpen(o => !o)} />

        {/* Scrollable content area */}
        <Box
          className="scrollbar-thin"
          sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
        >
          <Box sx={{
            flex: 1,
            px: { xs: 2, sm: 2.5, md: 3, xl: 4 },
            py: { xs: 2, sm: 2.5, md: 3 },
            width: '100%',
            boxSizing: 'border-box',
          }}>
            <Outlet />
          </Box>

          <AppFooter />
        </Box>
      </Box>
    </Box>
  )
}
