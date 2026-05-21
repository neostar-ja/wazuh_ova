import { useState, useEffect } from 'react'
import {
  AppBar, Toolbar, IconButton, Typography, Badge, Box, Avatar,
  Menu, MenuItem, Tooltip, Chip,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import NotificationsIcon from '@mui/icons-material/Notifications'
import LogoutIcon from '@mui/icons-material/Logout'
import { useThemeMode } from '../../theme/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ onMenuClick, drawerWidth, isMobile }) {
  const { mode, toggleTheme } = useThemeMode()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const [newAlerts, setNewAlerts] = useState(0)

  useEffect(() => {
    const BASE = import.meta.env.VITE_BASE_PATH || '/wazuh'
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${BASE}/ws/alerts`
    const ws = new WebSocket(wsUrl)
    ws.onmessage = e => {
      try {
        const d = JSON.parse(e.data)
        if (d.count) setNewAlerts(c => c + d.count)
      } catch {}
    }
    return () => ws.close()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        zIndex: t => t.zIndex.drawer - 1,
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 56 }}>
        {isMobile && (
          <IconButton edge="start" onClick={onMenuClick} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
        )}
        <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ flexGrow: 1 }}>
          {isMobile ? 'SOC Center' : 'Security Operations Center'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={`ภัยคุกคามใหม่: ${newAlerts}`}>
            <IconButton size="small" onClick={() => { navigate('/alerts'); setNewAlerts(0) }}>
              <Badge badgeContent={newAlerts || null} color="error" max={99}>
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={`สลับธีม (${mode === 'dark' ? 'สว่าง' : 'มืด'})`}>
            <IconButton size="small" onClick={toggleTheme}>
              {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title={user?.full_name || user?.username}>
            <IconButton size="small" onClick={e => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>
                {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem disabled>
            <Box>
              <Typography variant="body2" fontWeight={600}>{user?.full_name}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.role}</Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> ออกจากระบบ
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
