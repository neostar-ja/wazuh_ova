import { useState, useEffect, useRef } from 'react'
import {
  Box, IconButton, Typography, Badge, Avatar,
  Menu, MenuItem, Tooltip, Chip, Divider, useTheme, useMediaQuery,
} from '@mui/material'
import MenuRoundedIcon           from '@mui/icons-material/MenuRounded'
import DarkModeRoundedIcon       from '@mui/icons-material/DarkModeRounded'
import LightModeRoundedIcon      from '@mui/icons-material/LightModeRounded'
import NotificationsRoundedIcon  from '@mui/icons-material/NotificationsRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import LogoutRoundedIcon         from '@mui/icons-material/LogoutRounded'
import TuneRoundedIcon           from '@mui/icons-material/TuneRounded'
import FiberManualRecordIcon     from '@mui/icons-material/FiberManualRecord'
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded'
import HomeRoundedIcon           from '@mui/icons-material/HomeRounded'
import { useThemeMode } from '../../theme/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'

const ROLE_COLORS = { superadmin: '#EF4444', admin: '#F59E0B', analyst: '#3B82F6', viewer: '#9A90BF' }
const ROLE_LABELS = { superadmin: 'Super Admin', admin: 'ผู้ดูแลระบบ', analyst: 'นักวิเคราะห์', viewer: 'ผู้ชม' }

const PAGE_INFO = {
  '/':            { th: 'ภาพรวมระบบ',           en: 'Dashboard',          color: '#7B5BA4', bg: 'rgba(123,91,164,0.12)' },
  '/alerts':      { th: 'การแจ้งเตือน',          en: 'Threat Alerts',      color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  '/investigate': { th: 'วิเคราะห์เหตุการณ์',    en: 'Investigate',        color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
  '/ioc':         { th: 'ตรวจจับภัยคุกคาม',      en: 'IOC Lookup',         color: '#F17422', bg: 'rgba(241,116,34,0.1)'  },
  '/compliance':  { th: 'มาตรฐาน & Compliance',   en: 'Standards',          color: '#22C55E', bg: 'rgba(34,197,94,0.1)'   },
  '/assets':      { th: 'อุปกรณ์เครือข่าย',       en: 'Network Assets',     color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)'  },
  '/kpi':         { th: 'ตัวชี้วัดผลงาน',          en: 'KPI & Metrics',      color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  '/admin':       { th: 'ตั้งค่าระบบ',            en: 'Administration',      color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
}

// ── Live clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30000)
    return () => clearInterval(id)
  }, [])
  return (
    <Box sx={{ textAlign: 'right' }}>
      <Typography sx={{ fontSize: 12.5, fontFamily: '"IBM Plex Mono",monospace', fontWeight: 600, lineHeight: 1.2, color: 'text.primary' }}>
        {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
      </Typography>
      <Typography sx={{ fontSize: 9.5, color: 'text.disabled', lineHeight: 1.2 }}>
        {time.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
      </Typography>
    </Box>
  )
}

// ── Main Topbar ───────────────────────────────────────────────────────────────
export default function Topbar({ onMenuClick }) {
  const theme    = useTheme()
  const isDark   = theme.palette.mode === 'dark'
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { mode, toggleTheme } = useThemeMode()
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [anchorEl, setAnchorEl] = useState(null)
  const [newAlerts, setNewAlerts] = useState(0)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    let timer = null
    const connect = () => {
      try {
        const BASE = import.meta.env.VITE_BASE_PATH || '/wazuh'
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const ws = new WebSocket(`${proto}://${window.location.host}${BASE}/ws/alerts`)
        wsRef.current = ws
        ws.onopen  = () => setWsConnected(true)
        ws.onclose = () => { setWsConnected(false); timer = setTimeout(connect, 5000) }
        ws.onerror = () => ws.close()
        ws.onmessage = e => {
          try { const d = JSON.parse(e.data); if (d.count > 0) setNewAlerts(c => c + d.count) } catch {}
        }
      } catch {}
    }
    connect()
    return () => { clearTimeout(timer); wsRef.current?.close() }
  }, [])

  const matchedPath = Object.keys(PAGE_INFO)
    .sort((a, b) => b.length - a.length)
    .find(p => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p))
  const pageInfo = PAGE_INFO[matchedPath || '/'] || PAGE_INFO['/']

  const initials = (user?.full_name || user?.username || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const roleColor = ROLE_COLORS[user?.role] || '#9A90BF'

  const handleLogout = async () => { setAnchorEl(null); await logout(); navigate('/login') }

  // Common icon button style
  const iconBtnSx = {
    borderRadius: '10px', p: 1,
    bgcolor: isDark ? 'rgba(123,91,164,0.06)' : 'rgba(123,91,164,0.04)',
    color: 'text.secondary',
    border: '1px solid',
    borderColor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
    transition: 'all 0.2s ease',
    '&:hover': {
      bgcolor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
      borderColor: isDark ? 'rgba(123,91,164,0.25)' : 'rgba(123,91,164,0.15)',
      transform: 'scale(1.05)',
    }
  }

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky', top: 0, zIndex: 1099,
        bgcolor: isDark ? 'rgba(14,10,24,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid',
        borderColor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.1)',
        flexShrink: 0,
        boxShadow: isDark
          ? '0 1px 8px rgba(0,0,0,0.2)'
          : '0 1px 6px rgba(123,91,164,0.06)',
      }}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 },
        px: { xs: 1.5, sm: 2, md: 2.5 }, height: { xs: 56, sm: 60 },
      }}>

        {/* Mobile hamburger */}
        {isMobile && (
          <IconButton onClick={onMenuClick} size="small"
            sx={{
              ...iconBtnSx,
              color: '#7B5BA4',
            }}>
            <MenuRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        )}

        {/* ── Breadcrumb + Page title ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
            <HomeRoundedIcon
              sx={{
                fontSize: 13,
                color: 'text.disabled',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { color: '#7B5BA4', transform: 'scale(1.1)' }
              }}
              onClick={() => navigate('/')}
            />
            <KeyboardArrowRightRoundedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 500 }}>
              {pageInfo.en}
            </Typography>
          </Box>

          {/* Page title row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            {/* Color dot with animation */}
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%', bgcolor: pageInfo.color, flexShrink: 0,
              boxShadow: `0 0 10px ${pageInfo.color}`,
              animation: 'pulseGlow 3s ease-in-out infinite',
            }} />
            <Typography sx={{
              fontSize: { xs: 17, sm: 20 }, fontWeight: 800, lineHeight: 1.1,
              color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              letterSpacing: '-0.5px',
            }}>
              {pageInfo.th}
            </Typography>
          </Box>
        </Box>

        {/* ── Right side ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1, lg: 1.5 }, flexShrink: 0 }}>

          {/* WS + Clock (desktop only) */}
          {!isMobile && (
            <Box sx={{
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center', gap: 2,
              px: 2, py: 0.75, borderRadius: '12px',
              bgcolor: isDark ? 'rgba(123,91,164,0.06)' : 'rgba(123,91,164,0.04)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: isDark ? 'rgba(123,91,164,0.1)' : 'rgba(123,91,164,0.06)',
              }
            }}>
              {/* WS status */}
              <Tooltip title={wsConnected ? 'Real-time เชื่อมต่อแล้ว' : 'ออฟไลน์'}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <FiberManualRecordIcon sx={{
                    fontSize: 8,
                    color: wsConnected ? '#22C55E' : 'text.disabled',
                    animation: wsConnected ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
                  }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: wsConnected ? '#22C55E' : 'text.disabled' }}>
                    {wsConnected ? 'Live' : 'Offline'}
                  </Typography>
                </Box>
              </Tooltip>

              <Box sx={{ width: 1, height: 20, bgcolor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)' }} />
              <LiveClock />
            </Box>
          )}

          {/* Alert bell */}
          <Tooltip title={newAlerts > 0 ? `${newAlerts} การแจ้งเตือนใหม่` : 'การแจ้งเตือน'}>
            <IconButton onClick={() => { navigate('/alerts'); setNewAlerts(0) }}
              sx={{
                ...iconBtnSx,
                ...(newAlerts > 0 ? {
                  bgcolor: 'rgba(239,68,68,0.1)',
                  color: '#EF4444',
                  borderColor: 'rgba(239,68,68,0.25)',
                  '&:hover': {
                    bgcolor: 'rgba(239,68,68,0.18)',
                    transform: 'scale(1.08)',
                  },
                } : {}),
              }}>
              <Badge badgeContent={newAlerts > 0 ? Math.min(newAlerts, 99) : 0} color="error"
                sx={{ '& .MuiBadge-badge': { fontSize: 8, minWidth: 15, height: 15, fontWeight: 800 } }}>
                {newAlerts > 0
                  ? <NotificationsActiveRoundedIcon sx={{ fontSize: 20 }} />
                  : <NotificationsRoundedIcon sx={{ fontSize: 20 }} />}
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Dark mode toggle */}
          <Tooltip title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}>
            <IconButton onClick={toggleTheme}
              sx={{
                ...iconBtnSx,
                '&:hover': {
                  ...iconBtnSx['&:hover'],
                  color: '#9B7DC4',
                  transform: 'rotate(20deg) scale(1.05)',
                }
              }}>
              {isDark
                ? <LightModeRoundedIcon sx={{ fontSize: 19 }} />
                : <DarkModeRoundedIcon sx={{ fontSize: 19 }} />}
            </IconButton>
          </Tooltip>

          {/* User avatar button */}
          <Tooltip title="บัญชีผู้ใช้">
            <Box onClick={e => setAnchorEl(e.currentTarget)} sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: { xs: 0.5, sm: 1.25 }, py: 0.5, borderRadius: '10px', cursor: 'pointer',
              bgcolor: isDark ? 'rgba(123,91,164,0.06)' : 'rgba(123,91,164,0.04)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
                borderColor: isDark ? 'rgba(123,91,164,0.25)' : 'rgba(123,91,164,0.15)',
              },
            }}>
              <Avatar sx={{
                width: 32, height: 32, fontSize: 12, fontWeight: 800,
                background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
                boxShadow: `0 2px 8px ${roleColor}33`,
              }}>
                {initials}
              </Avatar>
              {!isMobile && (
                <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
                    {user?.full_name?.split(' ')[0] || user?.username}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: roleColor, fontWeight: 600, lineHeight: 1.2 }}>
                    {ROLE_LABELS[user?.role] || user?.role}
                  </Typography>
                </Box>
              )}
            </Box>
          </Tooltip>
        </Box>
      </Box>

      {/* ── User Dropdown Menu ── */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiPaper-root': {
            mt: 1, minWidth: 280, borderRadius: '14px',
            border: '1px solid',
            borderColor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.12)',
            backdropFilter: 'blur(20px)',
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.3)'
              : '0 8px 24px rgba(0,0,0,0.1)',
          }
        }}
      >
        <Box sx={{ px: 2.5, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
            <Avatar sx={{
              width: 46, height: 46, fontSize: 16, fontWeight: 800,
              background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
              boxShadow: `0 4px 12px ${roleColor}40`,
            }}>
              {initials}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px' }}>
                {user?.full_name || user?.username}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: roleColor }} />
                <Typography sx={{ fontSize: 11.5, color: roleColor, fontWeight: 600 }}>
                  {ROLE_LABELS[user?.role] || user?.role}
                </Typography>
              </Box>
              {user?.email && <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.2 }}>{user.email}</Typography>}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 0.75 }} />

        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <>
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/admin') }}
              sx={{
                gap: 1.75, py: 1.25, mx: 1, my: 0.4, borderRadius: '10px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
                  color: '#7B5BA4',
                  transform: 'translateX(3px)',
                }
              }}>
              <TuneRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 500 }}>ตั้งค่าระบบ</Typography>
            </MenuItem>
            <Divider sx={{ my: 0.75 }} />
          </>
        )}

        <MenuItem onClick={handleLogout}
          sx={{
            gap: 1.75, py: 1.25, mx: 1, my: 0.4, borderRadius: '10px',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(239,68,68,0.1)',
              color: '#EF4444',
              transform: 'translateX(3px)',
            }
          }}>
          <LogoutRoundedIcon sx={{ fontSize: 18, color: '#EF4444' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#EF4444' }}>ออกจากระบบ</Typography>
        </MenuItem>
      </Menu>
    </Box>
  )
}
