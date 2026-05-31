import React, { useState, useEffect, useRef } from 'react'
import {
  Box, IconButton, Typography, Badge, Avatar,
  Menu, MenuItem, Divider, Tooltip, useTheme, useMediaQuery, InputBase,
} from '@mui/material'
import MenuRoundedIcon               from '@mui/icons-material/MenuRounded'
import DarkModeRoundedIcon           from '@mui/icons-material/DarkModeRounded'
import LightModeRoundedIcon          from '@mui/icons-material/LightModeRounded'
import NotificationsRoundedIcon      from '@mui/icons-material/NotificationsRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import NotificationsOffRoundedIcon   from '@mui/icons-material/NotificationsOffRounded'
import LogoutRoundedIcon             from '@mui/icons-material/LogoutRounded'
import TuneRoundedIcon               from '@mui/icons-material/TuneRounded'
import FiberManualRecordIcon         from '@mui/icons-material/FiberManualRecord'
import ChevronRightRoundedIcon       from '@mui/icons-material/ChevronRightRounded'
import GridViewRoundedIcon           from '@mui/icons-material/GridViewRounded'
import SearchRoundedIcon             from '@mui/icons-material/SearchRounded'
import { pushApi } from '../../services/api'
import { useThemeMode } from '../../theme/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'

const ROLE_COLORS: Record<string, string> = {
  superadmin: '#EF4444',
  admin:      '#F59E0B',
  analyst:    '#3B82F6',
  viewer:     '#9A90BF',
}
const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin:      'Administrator',
  analyst:    'Analyst',
  viewer:     'Viewer',
}

interface PageMeta {
  titleTh: string
  titleEn: string
  color: string
}

const PAGE_META: Record<string, PageMeta> = {
  '/':            { titleTh: 'ภาพรวมระบบ',        titleEn: 'Dashboard',               color: '#7B5BA4' },
  '/alerts':      { titleTh: 'การแจ้งเตือนภัย',   titleEn: 'Threat Alerts',           color: '#EF4444' },
  '/investigate': { titleTh: 'วิเคราะห์เหตุการณ์', titleEn: 'Investigation',           color: '#3B82F6' },
  '/ioc':         { titleTh: 'ตรวจสอบ IOC',        titleEn: 'IOC Lookup',              color: '#F17422' },
  '/compliance':  { titleTh: 'Compliance',          titleEn: 'Compliance',              color: '#22C55E' },
  '/assets':      { titleTh: 'อุปกรณ์เครือข่าย',  titleEn: 'Network Assets',          color: '#0EA5E9' },
  '/kpi':         { titleTh: 'KPI & เมตริก',       titleEn: 'KPI & Metrics',           color: '#F59E0B' },
  '/soar':        { titleTh: 'SOAR & ตอบสนองภัย',  titleEn: 'SOAR & Incident Response', color: '#8B5CF6' },
  '/admin':       { titleTh: 'การจัดการระบบ',      titleEn: 'Administration',          color: '#64748B' },
}

// ── Live clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30000)
    return () => clearInterval(id)
  }, [])
  const isDark = useTheme().palette.mode === 'dark'
  return (
    <Box sx={{ textAlign: 'right' }}>
      <Typography sx={{
        fontSize: 13, fontFamily: '"IBM Plex Mono",monospace',
        fontWeight: 600, lineHeight: 1.15,
        color: isDark ? '#EDE9FA' : '#1A1033',
      }}>
        {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
      </Typography>
      <Typography sx={{
        fontSize: 9.5, lineHeight: 1.15, mt: 0.15,
        color: isDark ? 'rgba(237,233,250,0.38)' : 'rgba(26,16,51,0.45)',
        fontWeight: 500,
      }}>
        {time.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
      </Typography>
    </Box>
  )
}

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const theme    = useTheme()
  const isDark   = theme.palette.mode === 'dark'
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { mode, toggleTheme } = useThemeMode()
  const { user, logout }  = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [anchorEl, setAnchorEl]   = useState<null | HTMLElement>(null)
  const [newAlerts, setNewAlerts] = useState<number>(0)
  const [wsConnected, setWsConnected] = useState<boolean>(false)
  const wsRef = useRef<WebSocket | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('soc-push-enabled') === '1')

  const handleTogglePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Browser ของคุณไม่รองรับ Push Notification')
      return
    }
    if (pushEnabled) {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          const keys = sub.toJSON().keys as { p256dh: string; auth: string }
          await pushApi.unsubscribe({ endpoint: sub.endpoint, keys })
          await sub.unsubscribe()
        }
        setPushEnabled(false)
        localStorage.setItem('soc-push-enabled', '0')
      } catch { /* ignore */ }
    } else {
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        const { data } = await pushApi.getVapidKey()
        const vapidKey = data.publicKey
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        })
        const json = sub.toJSON()
        await pushApi.subscribe({ endpoint: sub.endpoint, keys: json.keys as { p256dh: string; auth: string } })
        setPushEnabled(true)
        localStorage.setItem('soc-push-enabled', '1')
      } catch { /* ignore */ }
    }
  }

  const handleSearch = () => {
    const q = searchQ.trim()
    if (!q) return
    navigate(`/investigate?q=${encodeURIComponent(q)}`)
    setSearchQ('')
  }

  // WebSocket for live alert count
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const connect = () => {
      try {
        const BASE  = import.meta.env.VITE_BASE_PATH || '/wazuh'
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const ws    = new WebSocket(`${proto}://${window.location.host}${BASE}/ws/alerts`)
        wsRef.current = ws
        ws.onopen    = () => setWsConnected(true)
        ws.onclose   = () => { setWsConnected(false); timer = setTimeout(connect, 5000) }
        ws.onerror   = () => ws.close()
        ws.onmessage = e => {
          try {
            const d = JSON.parse(e.data)
            setNewAlerts(d.count ?? 0)
          } catch { /* ignore parse errors */ }
        }
      } catch { /* ignore connection errors */ }
    }
    connect()
    return () => {
      if (timer) clearTimeout(timer)
      wsRef.current?.close()
    }
  }, [])

  // Resolve current page metadata
  const matchedPath = Object.keys(PAGE_META)
    .sort((a, b) => b.length - a.length)
    .find(p => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p))
  const page = PAGE_META[matchedPath || '/'] ?? PAGE_META['/']

  const initials   = (user?.name || user?.username || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const roleColor  = ROLE_COLORS[user?.role || ''] || '#9A90BF'
  const roleLabel  = ROLE_LABELS[user?.role || '']  || user?.role || ''

  const handleLogout = async () => { setAnchorEl(null); await logout(); navigate('/login') }

  // Shared icon-button style
  const iconBtnSx = {
    borderRadius: '10px', p: 0.9,
    bgcolor: isDark ? 'rgba(123,91,164,0.07)' : 'rgba(123,91,164,0.05)',
    color: isDark ? 'rgba(237,233,250,0.55)' : 'rgba(26,16,51,0.5)',
    border: '1px solid',
    borderColor: isDark ? 'rgba(123,91,164,0.13)' : 'rgba(123,91,164,0.1)',
    transition: 'all 0.18s ease',
    '&:hover': {
      bgcolor: isDark ? 'rgba(123,91,164,0.14)' : 'rgba(123,91,164,0.09)',
      borderColor: isDark ? 'rgba(123,91,164,0.28)' : 'rgba(123,91,164,0.18)',
      color: isDark ? '#C4A8E8' : '#5A3E85',
      transform: 'translateY(-1px)',
    },
  } as const

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky', top: 0, zIndex: 1099, flexShrink: 0,
        bgcolor: isDark ? 'rgba(12,8,22,0.93)' : 'rgba(255,255,255,0.93)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        borderBottom: '1px solid',
        borderColor: isDark ? 'rgba(123,91,164,0.16)' : 'rgba(123,91,164,0.09)',
        boxShadow: isDark
          ? '0 1px 0 rgba(123,91,164,0.08), 0 4px 24px rgba(0,0,0,0.25)'
          : '0 1px 0 rgba(123,91,164,0.06), 0 4px 16px rgba(123,91,164,0.05)',
      }}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center',
        px: { xs: 1.5, sm: 2, md: 2.5 },
        height: { xs: 56, sm: 62 },
        gap: { xs: 1, sm: 1.5 },
      }}>

        {/* Mobile hamburger */}
        {isMobile && (
          <IconButton
            onClick={onMenuClick}
            size="small"
            aria-label="Open navigation"
            sx={{ ...iconBtnSx, color: '#7B5BA4', borderColor: 'rgba(123,91,164,0.25)' }}
          >
            <MenuRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        )}

        {/* ── Page identity ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
            <GridViewRoundedIcon
              onClick={() => navigate('/')}
              sx={{
                fontSize: 12,
                color: isDark ? 'rgba(237,233,250,0.3)' : 'rgba(26,16,51,0.3)',
                cursor: 'pointer',
                transition: 'all 0.18s',
                '&:hover': { color: '#7B5BA4' },
              }}
            />
            <ChevronRightRoundedIcon sx={{ fontSize: 11, color: isDark ? 'rgba(237,233,250,0.2)' : 'rgba(26,16,51,0.2)' }} />
            <Typography sx={{
              fontSize: 11, fontWeight: 500,
              color: isDark ? 'rgba(237,233,250,0.38)' : 'rgba(26,16,51,0.42)',
              letterSpacing: '0.01em',
            }}>
              {page.titleEn}
            </Typography>
          </Box>

          {/* Page title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              bgcolor: page.color,
              boxShadow: `0 0 8px ${page.color}BB`,
              animation: 'pulseGlow 3s ease-in-out infinite',
            }} />
            <Typography sx={{
              fontSize: { xs: 16, sm: 19 }, fontWeight: 800, lineHeight: 1.1,
              letterSpacing: '-0.4px',
              color: isDark ? '#EDE9FA' : '#1A1033',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {page.titleTh}
            </Typography>
          </Box>
        </Box>

        {/* ── Global search bar (sm+) ── */}
        <Box sx={{
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          width: { sm: 170, md: 220, lg: 260 },
          flexShrink: 0,
          borderRadius: '10px',
          border: '1px solid',
          borderColor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.14)',
          bgcolor: isDark ? 'rgba(123,91,164,0.06)' : 'rgba(123,91,164,0.04)',
          px: 1, py: 0.55,
          gap: 0.75,
          transition: 'border-color 0.18s',
          '&:focus-within': {
            borderColor: isDark ? 'rgba(123,91,164,0.5)' : 'rgba(123,91,164,0.38)',
            bgcolor: isDark ? 'rgba(123,91,164,0.1)' : 'rgba(123,91,164,0.07)',
          },
        }}>
          <SearchRoundedIcon
            onClick={handleSearch}
            sx={{
              fontSize: 16, flexShrink: 0, cursor: 'pointer',
              color: isDark ? 'rgba(237,233,250,0.35)' : 'rgba(26,16,51,0.35)',
              '&:hover': { color: '#7B5BA4' },
              transition: 'color 0.15s',
            }}
          />
          <InputBase
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            placeholder="IP / MAC / Hostname..."
            inputProps={{ 'aria-label': 'ค้นหา IP, MAC หรือ Hostname' }}
            sx={{
              flex: 1,
              '& input': {
                fontSize: 12.5, fontWeight: 500, p: 0,
                color: isDark ? 'rgba(237,233,250,0.85)' : 'rgba(26,16,51,0.85)',
                '&::placeholder': {
                  color: isDark ? 'rgba(237,233,250,0.28)' : 'rgba(26,16,51,0.3)',
                  opacity: 1,
                  fontSize: 12,
                },
              },
            }}
          />
        </Box>

        {/* ── Right controls ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 0.75 }, flexShrink: 0 }}>

          {/* WS status + clock (lg only) */}
          <Box sx={{
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center', gap: 1.75,
            px: 1.75, py: 0.85,
            borderRadius: '11px',
            bgcolor: isDark ? 'rgba(123,91,164,0.07)' : 'rgba(123,91,164,0.05)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(123,91,164,0.13)' : 'rgba(123,91,164,0.1)',
          }}>
            <Tooltip title={wsConnected ? 'Real-time connected' : 'Offline'} placement="bottom">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, cursor: 'default' }}>
                <FiberManualRecordIcon sx={{
                  fontSize: 7.5,
                  color: wsConnected ? '#22C55E' : isDark ? 'rgba(237,233,250,0.2)' : 'rgba(26,16,51,0.2)',
                  animation: wsConnected ? 'pulseGlow 2.5s ease-in-out infinite' : 'none',
                }} />
                <Typography sx={{
                  fontSize: 11.5, fontWeight: 700, lineHeight: 1,
                  color: wsConnected ? '#22C55E' : isDark ? 'rgba(237,233,250,0.3)' : 'rgba(26,16,51,0.3)',
                }}>
                  {wsConnected ? 'Live' : 'Offline'}
                </Typography>
              </Box>
            </Tooltip>

            <Box sx={{
              width: 1, height: 18,
              bgcolor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)',
            }} />
            <LiveClock />
          </Box>

          {/* Alert bell */}
          <Tooltip title={newAlerts > 0 ? `${newAlerts} new alert${newAlerts > 1 ? 's' : ''}` : 'Alerts'} placement="bottom">
            <IconButton
              onClick={() => { navigate('/alerts'); setNewAlerts(0) }}
              size="small"
              aria-label={newAlerts > 0 ? `${newAlerts} new alerts` : 'View alerts'}
              sx={{
                ...iconBtnSx,
                ...(newAlerts > 0 ? {
                  bgcolor: 'rgba(239,68,68,0.09)',
                  color: '#EF4444',
                  borderColor: 'rgba(239,68,68,0.22)',
                  '&:hover': {
                    bgcolor: 'rgba(239,68,68,0.16)',
                    borderColor: 'rgba(239,68,68,0.35)',
                    color: '#EF4444',
                    transform: 'translateY(-1px)',
                  },
                } : {}),
              }}
            >
              <Badge
                badgeContent={newAlerts > 0 ? Math.min(newAlerts, 99) : 0}
                color="error"
                sx={{ '& .MuiBadge-badge': { fontSize: 8, minWidth: 15, height: 15, fontWeight: 800, p: 0 } }}
              >
                {newAlerts > 0
                  ? <NotificationsActiveRoundedIcon sx={{ fontSize: 19 }} />
                  : <NotificationsRoundedIcon sx={{ fontSize: 19 }} />
                }
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Dark/light toggle */}
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'} placement="bottom">
            <IconButton
              onClick={toggleTheme}
              size="small"
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              sx={{
                ...iconBtnSx,
                '&:hover': {
                  ...iconBtnSx['&:hover'],
                  transform: 'rotate(18deg) translateY(-1px)',
                },
              }}
            >
              {mode === 'dark'
                ? <LightModeRoundedIcon sx={{ fontSize: 18 }} />
                : <DarkModeRoundedIcon  sx={{ fontSize: 18 }} />
              }
            </IconButton>
          </Tooltip>

          {/* Divider */}
          <Box sx={{
            width: 1, height: 24, mx: 0.25,
            bgcolor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.12)',
            display: { xs: 'none', sm: 'block' },
          }} />

          {/* User pill */}
          <Tooltip title="Account" placement="bottom">
            <Box
              onClick={e => setAnchorEl(e.currentTarget)}
              role="button"
              tabIndex={0}
              aria-label="Open account menu"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setAnchorEl(e.currentTarget as HTMLElement) }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                pl: 0.75, pr: { xs: 0.75, sm: 1.25 }, py: 0.6,
                borderRadius: '10px', cursor: 'pointer',
                bgcolor: isDark ? 'rgba(123,91,164,0.07)' : 'rgba(123,91,164,0.05)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(123,91,164,0.13)' : 'rgba(123,91,164,0.1)',
                transition: 'all 0.18s ease',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(123,91,164,0.14)' : 'rgba(123,91,164,0.09)',
                  borderColor: isDark ? 'rgba(123,91,164,0.28)' : 'rgba(123,91,164,0.18)',
                },
              }}
            >
              <Avatar sx={{
                width: 30, height: 30, fontSize: 11, fontWeight: 800,
                background: `linear-gradient(135deg,${roleColor},${roleColor}BB)`,
                boxShadow: `0 2px 8px ${roleColor}44`,
              }}>
                {initials}
              </Avatar>
              <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                <Typography sx={{
                  fontSize: 12.5, fontWeight: 700, lineHeight: 1.2,
                  color: isDark ? '#EDE9FA' : '#1A1033',
                  letterSpacing: '-0.1px',
                }}>
                  {user?.name?.split(' ')[0] || user?.username}
                </Typography>
                <Typography sx={{
                  fontSize: 10, fontWeight: 600, lineHeight: 1.2,
                  color: roleColor,
                  letterSpacing: '0.01em',
                }}>
                  {roleLabel}
                </Typography>
              </Box>
            </Box>
          </Tooltip>
        </Box>
      </Box>

      {/* ── User dropdown ── */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiPaper-root': {
            mt: 1, minWidth: 260, borderRadius: '14px',
            border: '1px solid',
            borderColor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.12)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: isDark
              ? '0 12px 40px rgba(0,0,0,0.4)'
              : '0 12px 32px rgba(123,91,164,0.12)',
          },
        }}
      >
        {/* User info header */}
        <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{
              width: 44, height: 44, fontSize: 15, fontWeight: 800,
              background: `linear-gradient(135deg,${roleColor},${roleColor}BB)`,
              boxShadow: `0 4px 14px ${roleColor}44`,
            }}>
              {initials}
            </Avatar>
            <Box>
              <Typography sx={{
                fontSize: 13.5, fontWeight: 700, lineHeight: 1.2,
                color: isDark ? '#EDE9FA' : '#1A1033',
                letterSpacing: '-0.2px',
              }}>
                {user?.name || user?.username}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                <Box sx={{
                  px: 0.7, py: 0.1, borderRadius: '5px',
                  bgcolor: `${roleColor}22`,
                  border: `1px solid ${roleColor}44`,
                }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: roleColor, lineHeight: 1.4 }}>
                    {roleLabel}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mx: 1 }} />

        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <>
            <MenuItem
              onClick={() => { setAnchorEl(null); navigate('/admin') }}
              sx={{
                gap: 1.5, py: 1.1, mx: 1, my: 0.4, borderRadius: '10px',
                fontSize: 13, fontWeight: 500,
                transition: 'all 0.18s',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
                  color: '#7B5BA4',
                  transform: 'translateX(3px)',
                },
              }}
            >
              <TuneRoundedIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 500 }}>Administration</Typography>
            </MenuItem>
            <Divider sx={{ mx: 1 }} />
          </>
        )}

        {/* Push notification toggle */}
        <MenuItem
          onClick={() => { setAnchorEl(null); handleTogglePush() }}
          sx={{
            gap: 1.5, py: 1.1, mx: 1, my: 0.4, borderRadius: '10px',
            fontSize: 13, fontWeight: 500,
            transition: 'all 0.18s',
            '&:hover': {
              bgcolor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
              color: '#7B5BA4',
              transform: 'translateX(3px)',
            },
          }}
        >
          {pushEnabled
            ? <NotificationsOffRoundedIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
            : <NotificationsActiveRoundedIcon sx={{ fontSize: 17, color: '#22C55E' }} />
          }
          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
            {pushEnabled ? 'ปิดการแจ้งเตือน Browser' : 'เปิดการแจ้งเตือน Browser'}
          </Typography>
        </MenuItem>

        <Divider sx={{ mx: 1 }} />

        <MenuItem
          onClick={handleLogout}
          sx={{
            gap: 1.5, py: 1.1, mx: 1, my: 0.4, borderRadius: '10px',
            transition: 'all 0.18s',
            '&:hover': {
              bgcolor: 'rgba(239,68,68,0.08)',
              transform: 'translateX(3px)',
            },
          }}
        >
          <LogoutRoundedIcon sx={{ fontSize: 17, color: '#EF4444' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#EF4444' }}>Log out</Typography>
        </MenuItem>
      </Menu>
    </Box>
  )
}
