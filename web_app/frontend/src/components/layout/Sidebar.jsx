import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, Box, Divider, Chip,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import SearchIcon from '@mui/icons-material/Search'
import LanguageIcon from '@mui/icons-material/Language'
import AssignmentIcon from '@mui/icons-material/Assignment'
import DevicesIcon from '@mui/icons-material/Devices'
import BarChartIcon from '@mui/icons-material/BarChart'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { label: 'แดชบอร์ด', path: '/', icon: <DashboardIcon /> },
  { label: 'แจ้งเตือนภัยคุกคาม', path: '/alerts', icon: <NotificationsActiveIcon /> },
  { label: 'สืบสวน', path: '/investigate', icon: <SearchIcon /> },
  { label: 'ศูนย์ IOC', path: '/ioc', icon: <LanguageIcon /> },
  { label: 'ความสอดคล้อง', path: '/compliance', icon: <AssignmentIcon /> },
  { label: 'สินทรัพย์เครือข่าย', path: '/assets', icon: <DevicesIcon /> },
  { label: 'KPI ประสิทธิภาพ', path: '/kpi', icon: <BarChartIcon /> },
]

const ADMIN_NAV = { label: 'ผู้ดูแลระบบ', path: '/admin', icon: <AdminPanelSettingsIcon /> }

function SidebarContent({ onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const navTo = path => {
    navigate(path)
    if (onClose) onClose()
  }

  return (
    <>
      <Toolbar sx={{ px: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} color="primary">SOC Center</Typography>
          <Typography variant="caption" color="text.secondary">Walailak University Hospital</Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List dense>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
          return (
            <ListItemButton
              key={item.path}
              onClick={() => navTo(item.path)}
              selected={active}
              sx={{ borderRadius: 1, mx: 1, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 600 : 400 }}
              />
            </ListItemButton>
          )
        })}
        {isAdmin && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItemButton
              onClick={() => navTo(ADMIN_NAV.path)}
              selected={location.pathname.startsWith(ADMIN_NAV.path)}
              sx={{ borderRadius: 1, mx: 1, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: location.pathname.startsWith('/admin') ? 'primary.main' : 'text.secondary' }}>
                {ADMIN_NAV.icon}
              </ListItemIcon>
              <ListItemText
                primary={ADMIN_NAV.label}
                primaryTypographyProps={{ fontSize: 13, fontWeight: location.pathname.startsWith('/admin') ? 600 : 400 }}
              />
            </ListItemButton>
          </>
        )}
      </List>
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Chip
          size="small"
          label={`v1.0.0 | ${user?.role || 'viewer'}`}
          color="default"
          sx={{ fontSize: 11 }}
        />
      </Box>
    </>
  )
}

export default function Sidebar({ drawerWidth, mobileOpen, onClose, isMobile }) {
  const paperSx = { width: drawerWidth, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': paperSx }}
      >
        <SidebarContent onClose={onClose} />
      </Drawer>
    )
  }

  return (
    <Drawer
      variant="permanent"
      sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': paperSx, position: 'fixed', height: '100vh' }}
    >
      <SidebarContent />
    </Drawer>
  )
}
