import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import Sidebar, { DRAWER_WIDTH, DRAWER_COLLAPSED } from './Sidebar'
import Topbar from './Topbar'

// ─── Footer ───────────────────────────────────────────────────────────────────
function AppFooter() {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const year = new Date().getFullYear()

  return (
    <Box
      component="footer"
      sx={{
        flexShrink: 0,
        position: 'relative',
        borderTop: '1px solid',
        borderColor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)',
        bgcolor: isDark
          ? 'rgba(11,8,22,0.92)'
          : 'rgba(252,250,255,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflow: 'hidden',
      }}
    >
      {/* Subtle top accent line */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: isDark
          ? 'linear-gradient(90deg,transparent,rgba(123,91,164,0.4) 30%,rgba(123,91,164,0.4) 70%,transparent)'
          : 'linear-gradient(90deg,transparent,rgba(123,91,164,0.25) 30%,rgba(123,91,164,0.25) 70%,transparent)',
        pointerEvents: 'none',
      }} />

      <Box sx={{
        position: 'relative',
        px: { xs: 2.5, sm: 3.5, md: 4 },
        py: { xs: 1.5, md: 1.75 },
        maxWidth: 1600, mx: 'auto',
      }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 1.5, sm: 0 },
        }}>

          {/* Left — brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg,#7B5BA4,#4A2D7A)',
              boxShadow: '0 4px 14px rgba(123,91,164,0.35)',
            }}>
              <SecurityRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{
                fontSize: 13, fontWeight: 800, lineHeight: 1.1,
                letterSpacing: '-0.2px',
                color: isDark ? '#EDE9FA' : '#2B1D52',
              }}>
                SOC Center
              </Typography>
              <Typography sx={{
                fontSize: 10.5, mt: 0.2, lineHeight: 1.4,
                color: isDark ? 'rgba(237,233,250,0.42)' : 'rgba(26,16,51,0.45)',
                fontWeight: 400,
              }}>
                Wazuh Security Platform
              </Typography>
            </Box>
          </Box>

          {/* Right — university credit */}
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            alignItems: { xs: 'flex-start', sm: 'flex-end' },
            gap: 0.3,
          }}>
            <Typography sx={{
              fontSize: 11, fontWeight: 600,
              color: isDark ? 'rgba(237,233,250,0.55)' : 'rgba(26,16,51,0.55)',
              lineHeight: 1.5,
              textAlign: { xs: 'left', sm: 'right' },
            }}>
              พัฒนาโดย กลุ่มงานโครงสร้างพื้นฐานดิจิทัลทางการแพทย์
            </Typography>
            <Typography sx={{
              fontSize: 11, fontWeight: 600,
              color: isDark ? 'rgba(237,233,250,0.55)' : 'rgba(26,16,51,0.55)',
              lineHeight: 1.5,
              textAlign: { xs: 'left', sm: 'right' },
            }}>
              โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์
            </Typography>
            <Typography sx={{
              fontSize: 10, mt: 0.15,
              color: isDark ? 'rgba(237,233,250,0.28)' : 'rgba(26,16,51,0.32)',
              fontWeight: 500,
              textAlign: { xs: 'left', sm: 'right' },
            }}>
              © {year} Walailak University · All rights reserved
            </Typography>
          </Box>

        </Box>
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
