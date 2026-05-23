import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, Typography, Chip, useTheme, useMediaQuery } from '@mui/material'
import ApiRoundedIcon from '@mui/icons-material/ApiRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import ShieldRoundedIcon   from '@mui/icons-material/ShieldRounded'
import Sidebar, { DRAWER_WIDTH, DRAWER_COLLAPSED } from './Sidebar'
import Topbar from './Topbar'

// ─── Footer ───────────────────────────────────────────────────────────────────
function AppFooter() {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const year = new Date().getFullYear()
  const services = [
    { label: 'Wazuh Manager', icon: <SecurityRoundedIcon sx={{ fontSize: '14px !important' }} /> },
    { label: 'OpenSearch', icon: <SearchRoundedIcon sx={{ fontSize: '14px !important' }} /> },
    { label: 'API', icon: <ApiRoundedIcon sx={{ fontSize: '14px !important' }} /> },
  ]

  return (
    <Box
      component="footer"
      sx={{
        flexShrink: 0,
        position: 'relative',
        borderTop: '1px solid',
        borderColor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.12)',
        bgcolor: isDark ? 'rgba(10, 12, 24, 0.9)' : 'rgba(251, 249, 255, 0.95)',
        backdropFilter: 'blur(18px)',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: isDark
            ? 'radial-gradient(circle at top left, rgba(123,91,164,0.22), transparent 42%), radial-gradient(circle at top right, rgba(34,197,94,0.12), transparent 34%), linear-gradient(90deg, rgba(18,14,36,0.75), rgba(12,18,36,0.58) 52%, rgba(10,28,44,0.66))'
            : 'radial-gradient(circle at top left, rgba(123,91,164,0.12), transparent 42%), radial-gradient(circle at top right, rgba(34,197,94,0.08), transparent 34%), linear-gradient(90deg, rgba(255,255,255,0.88), rgba(249,247,255,0.8) 52%, rgba(239,248,255,0.88))',
          pointerEvents: 'none',
        },
      }}
    >
      <Box sx={{ position: 'relative', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 1.5, md: 1.75 }, maxWidth: 1600, mx: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.2fr) minmax(0,1fr) auto' },
            alignItems: { xs: 'flex-start', lg: 'center' },
            gap: { xs: 1.25, lg: 2 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '12px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg,#7B5BA4 0%, #5A3E85 55%, #2F7CF6 100%)',
                boxShadow: '0 12px 28px rgba(90,62,133,0.28)',
              }}
            >
              <SecurityRoundedIcon sx={{ fontSize: 20, color: '#fff' }} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.2, color: isDark ? '#F2ECFF' : '#2B2046' }}>
                SOC Center
              </Typography>
              <Typography
                sx={{
                  mt: 0.25,
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: isDark ? 'rgba(237,233,250,0.6)' : 'rgba(26,16,51,0.58)',
                }}
              >
                ศูนย์ปฏิบัติการเฝ้าระวังความมั่นคงปลอดภัยไซเบอร์
                สำหรับการติดตามเหตุการณ์และสนับสนุนการตอบสนองเชิงปฏิบัติการ
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: { xs: 'flex-start', lg: 'center' },
              gap: 1,
            }}
          >
            {services.map((service) => (
              <Chip
                key={service.label}
                size="small"
                icon={service.icon}
                label={service.label}
                sx={{
                  height: 28,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.2,
                  bgcolor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
                  color: isDark ? '#D8C8F2' : '#5A3E85',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.14)',
                  '& .MuiChip-label': { px: 1.1 },
                  '& .MuiChip-icon': {
                    color: isDark ? '#CDB8F0' : '#6A4E95',
                    ml: 0.8,
                  },
                }}
              />
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, ml: { lg: 0.5 } }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#22C55E',
                  boxShadow: '0 0 10px rgba(34,197,94,0.85)',
                  animation: 'pulseGlow 3s ease-in-out infinite',
                }}
              />
              <Typography sx={{ fontSize: 11, color: isDark ? 'rgba(237,233,250,0.52)' : 'rgba(26,16,51,0.5)' }}>
                Core services online
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', lg: 'flex-end' } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', lg: 'flex-end' }, gap: 0.55 }}>
              <Chip
                size="small"
                label={`© ${year} มหาวิทยาลัยวลัยลักษณ์`}
                icon={<ShieldRoundedIcon sx={{ fontSize: '13px !important' }} />}
                sx={{
                  height: 28,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: isDark ? 'rgba(47,124,246,0.12)' : 'rgba(47,124,246,0.08)',
                  color: isDark ? '#A7C7FF' : '#1F4F9A',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(47,124,246,0.2)' : 'rgba(47,124,246,0.14)',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
              <Typography
                sx={{
                  fontSize: 10.5,
                  lineHeight: 1.45,
                  textAlign: { xs: 'left', lg: 'right' },
                  color: isDark ? 'rgba(237,233,250,0.52)' : 'rgba(26,16,51,0.5)',
                  maxWidth: 420,
                }}
              >
                พัฒนาโดย กลุ่มงานโครงสร้างพื้นฐานดิจิทัลทางการแพทย์
                โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์
              </Typography>
            </Box>
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
