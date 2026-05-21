import { useState, useEffect, useRef } from 'react'
import {
  AppBar, Toolbar, IconButton, Typography, Badge, Box, Avatar,
  Menu, MenuItem, Tooltip, Chip, Divider, useTheme, useMediaQuery,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsIcon from '@mui/icons-material/Settings'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useThemeMode } from '../../theme/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'

const ROLE_COLORS = { superadmin: 'error', admin: 'warning', analyst: 'info', viewer: 'default' }
const ROLE_LABELS = { superadmin: 'ซูเปอร์แอดมิน', admin: 'ผู้ดูแลระบบ', analyst: 'นักวิเคราะห์', viewer: 'ผู้ชม' }
const PAGE_TITLES = {
  '/': 'SOC Dashboard',
  '/alerts': 'แจ้งเตือนภัยคุกคาม',
  '/investigate': 'สืบสวน',
  '/ioc': 'ศูนย์ IOC',
  '/compliance': 'ความสอดคล้อง',
  '/assets': 'สินทรัพย์เครือข่าย',
  '/kpi': 'KPI ประสิทธิภาพ SOC',
  '/admin': 'ผู้ดูแลระบบ',
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <AccessTimeIcon sx={{ fontSize: 16, opacity: 0.7 }} />
      <Typography variant="caption" sx={{ fontSize: '12px', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 500, opacity: 0.7 }}>
        {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
      </Typography>
    </Box>
  )
}

function WebSocketStatus({ connected }) {
  return (
    <Tooltip title={connected ? 'เชื่อมต่อ' : 'ตัดการเชื่อมต่อ'}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <FiberManualRecordIcon sx={{ fontSize: 10, color: connected ? '#10b981' : '#ef4444', animation: connected ? 'pulse-slow 2s ease-in-out infinite' : 'none' }} />
        <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500, opacity: 0.7 }}>{connected ? 'Live' : 'Offline'}</Typography>
      </Box>
    </Tooltip>
  )
}

function UserAvatar({ user, initials, onClick }) {
  return (
    <Tooltip title={user?.full_name || user?.username}>
      <Box onClick={onClick} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '14px', fontWeight: 600, '&:hover': { boxShadow: 2 } }}>{initials}</Avatar>
      </Box>
    </Tooltip>
  )
}

export default function Topbar({ onMenuClick }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { mode, toggleTheme } = useThemeMode()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [anchorEl, setAnchorEl] = useState(null)
  const [newAlerts, setNewAlerts] = useState(0)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    let reconnectTimer = null

    const connect = () => {
      try {
        const BASE = import.meta.env.VITE_BASE_PATH || '/wazuh'
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const wsUrl = `${protocol}://${window.location.host}${BASE}/ws/alerts`
        const ws = new WebSocket(wsUrl)

        wsRef.current = ws
        ws.onopen = () => setWsConnected(true)
        ws.onclose = () => {
          setWsConnected(false)
          reconnectTimer = setTimeout(connect, 5000)
        }
        ws.onerror = () => ws.close()
        ws.onmessage = e => {
          try {
            const d = JSON.parse(e.data)
            if (d.count && d.count > 0) setNewAlerts(c => c + d.count)
          } catch {}
        }
      } catch (err) {
        console.error('WebSocket error:', err)
      }
    }

    connect()
    return () => {
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  const handleMenuOpen = e => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const handleLogout = async () => {
    handleMenuClose()
    await logout()
    navigate('/login')
  }

  const initials = (user?.full_name || user?.username || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const matchedPath = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find(path => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path))
  const pageTitle = PAGE_TITLES[matchedPath || '/'] || 'SOC Center'
  const today = new Date().toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: '#0d1825',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: theme.zIndex.drawer - 1,
        transition: 'all 300ms ease',
        backgroundImage: 'none',
      }}
    >
      <Toolbar sx={{ minHeight: '52px !important', gap: 1.5, px: { xs: 1.5, sm: 3 } }}>
        {isMobile && (
          <IconButton edge="start" color="inherit" onClick={onMenuClick} sx={{ borderRadius: '8px', '&:hover': { bgcolor: 'action.hover' } }}>
            <MenuIcon />
          </IconButton>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexGrow: 1, minWidth: 0 }}>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 500,
                fontSize: { xs: '13px', sm: '14px' },
                letterSpacing: '-0.01em',
                color: 'text.primary',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {pageTitle} <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}>— {today}</Box>
            </Typography>
          </Box>
        </Box>

        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
            <WebSocketStatus connected={wsConnected} />
            <LiveClock />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={newAlerts > 0 ? `${newAlerts} ภัยคุกคามใหม่` : 'ไม่มีการแจ้งเตือน'}>
            <IconButton size="small" onClick={() => navigate('/alerts')} sx={{ borderRadius: '8px', '&:hover': { bgcolor: 'action.hover' } }}>
              <Badge badgeContent={newAlerts > 0 ? Math.min(newAlerts, 99) : 0} color="error" overlap="circular">
                {newAlerts > 0 ? <NotificationsActiveIcon sx={{ color: 'error.main' }} /> : <NotificationsIcon />}
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={mode === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}>
            <IconButton size="small" onClick={toggleTheme} sx={{ borderRadius: '7px', '&:hover': { bgcolor: 'action.hover' } }}>
              {mode === 'dark' ? <LightModeIcon sx={{ fontSize: 20 }} /> : <DarkModeIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>

          {!isMobile && (
            <Chip
              label={user?.full_name || user?.username || 'SOC Admin'}
              size="small"
              onClick={handleMenuOpen}
              sx={{
                ml: 0.5,
                height: 28,
                borderRadius: '7px',
                bgcolor: 'rgba(255,255,255,0.05)',
                color: 'text.secondary',
                border: '0.5px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            />
          )}

          <Tooltip title="เมนูผู้ใช้">
            <IconButton size="small" onClick={handleMenuOpen} sx={{ borderRadius: '8px', '&:hover': { bgcolor: 'action.hover' } }}>
              <UserAvatar user={user} initials={initials} />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* User Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ '& .MuiPaper-root': { mt: 1, minWidth: 280, bgcolor: '#132032', backgroundImage: 'none' } }}
      >
        {/* User Info */}
        <Box sx={{ px: 2, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontWeight: 600 }}>{initials}</Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{user?.full_name || user?.username}</Typography>
              <Chip label={ROLE_LABELS[user?.role] || user?.role} color={ROLE_COLORS[user?.role]} size="small" variant="outlined" sx={{ mt: 0.5 }} />
            </Box>
          </Box>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>{user?.email}</Typography>
        </Box>

        <Divider />

        {/* Admin Menu */}
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <>
            <MenuItem onClick={() => { handleMenuClose(); navigate('/admin') }} sx={{ gap: 1.5, display: 'flex' }}>
              <SettingsIcon fontSize="small" />
              <Typography variant="body2">ตั้งค่าระบบ</Typography>
            </MenuItem>
            <Divider />
          </>
        )}

        {/* Logout */}
        <MenuItem onClick={handleLogout} sx={{ gap: 1.5 }}>
          <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
          <Typography variant="body2" sx={{ color: 'error.main' }}>ออกจากระบบ</Typography>
        </MenuItem>
      </Menu>
    </AppBar>
  )
}
