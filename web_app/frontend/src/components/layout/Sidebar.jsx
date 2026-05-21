import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, Box, Chip, Avatar, Tooltip, IconButton,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import SearchIcon from '@mui/icons-material/Search'
import LanguageIcon from '@mui/icons-material/Language'
import AssignmentIcon from '@mui/icons-material/Assignment'
import DevicesIcon from '@mui/icons-material/Devices'
import BarChartIcon from '@mui/icons-material/BarChart'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import SecurityIcon from '@mui/icons-material/Security'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../../hooks/useAuth'

const SECURITY_ITEMS = [
  { label: 'แจ้งเตือนภัยคุกคาม', path: '/alerts',     icon: <NotificationsActiveIcon fontSize="small" />, badge: '47', badgeColor: 'error' },
  { label: 'สืบสวน',              path: '/investigate', icon: <SearchIcon fontSize="small" /> },
  { label: 'ศูนย์ IOC',           path: '/ioc',         icon: <LanguageIcon fontSize="small" /> },
  { label: 'ความสอดคล้อง',        path: '/compliance',  icon: <AssignmentIcon fontSize="small" /> },
  { label: 'สินทรัพย์เครือข่าย', path: '/assets',      icon: <DevicesIcon fontSize="small" /> },
  { label: 'KPI ประสิทธิภาพ',     path: '/kpi',         icon: <BarChartIcon fontSize="small" /> },
]

const CLUSTER_STATUS = [
  { label: 'Master', host: '10.251.151.11', color: '#10b981' },
  { label: 'Worker', host: '10.251.151.12', color: '#10b981' },
  { label: 'Indexer', host: '10.251.151.13', color: '#10b981' },
  { label: 'Dashboard', host: '10.251.151.14', color: '#f59e0b' },
]

const ROLE_COLOR = {
  superadmin: 'error',
  admin: 'warning',
  analyst: 'info',
  viewer: 'default',
}

const ROLE_TH = {
  superadmin: 'ซูเปอร์แอดมิน',
  admin: 'ผู้ดูแลระบบ',
  analyst: 'นักวิเคราะห์',
  viewer: 'ผู้ชม',
}

function NavItem({ item, active, onClick }) {
  return (
    <ListItemButton
      onClick={onClick}
      selected={false}
      sx={{
        borderRadius: '0 8px 8px 0',
        mx: 0,
        mr: 1.25,
        mb: 0.35,
        pl: 1.75,
        pr: 1.5,
        py: 0.95,
        minHeight: 34,
        borderLeft: active ? '2px solid' : '2px solid transparent',
        borderColor: active ? 'primary.main' : 'transparent',
        background: active
          ? 'linear-gradient(90deg, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0.04) 58%, transparent 100%)'
          : 'transparent',
        transition: 'all 0.15s ease',
        '&:hover': {
          background: active
            ? 'linear-gradient(90deg, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.06) 58%, transparent 100%)'
            : 'action.hover',
          borderColor: active ? 'primary.main' : 'rgba(255,255,255,0.06)',
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 34,
          color: active ? 'primary.main' : 'text.secondary',
          transition: 'color 0.15s',
        }}
      >
        {item.icon}
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{
          fontSize: 12,
          fontWeight: active ? 600 : 400,
          color: active ? 'text.primary' : 'text.secondary',
          letterSpacing: 0,
        }}
      />
      {item.badge ? (
        <Chip
          size="small"
          label={item.badge}
          color={item.badgeColor || 'default'}
          sx={{
            ml: 0.75,
            height: 18,
            minWidth: 24,
            fontSize: 10,
            fontWeight: 700,
            borderRadius: '999px',
            '& .MuiChip-label': { px: 0.9 },
          }}
        />
      ) : null}
    </ListItemButton>
  )
}

function SectionLabel({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{
        px: 2.5, py: 0.5, mt: 1,
        display: 'block',
        color: 'text.disabled',
        fontWeight: 600,
        fontSize: 9,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Typography>
  )
}

function SidebarContent({ onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const isActive = path => {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const navTo = path => {
    navigate(path)
    if (onClose) onClose()
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = (user?.full_name || user?.username || 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header / Logo */}
      <Toolbar
        disableGutters
        sx={{
          px: 2.5,
          minHeight: '64px !important',
          borderBottom: 1,
          borderColor: 'divider',
          background: 'linear-gradient(135deg, rgba(13,24,37,1) 0%, rgba(19,32,50,1) 100%)',
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            mr: 1.25,
            flexShrink: 0,
          }}
        >
          S
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            lineHeight={1.1}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.01em',
              fontSize: 13,
            }}
          >
            SOC Center
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, letterSpacing: 0 }}>
            hospital.wu.ac.th
          </Typography>
        </Box>
      </Toolbar>

      {/* Dashboard (standalone) */}
      <Box sx={{ pt: 1.5 }}>
        <NavItem
          item={{ label: 'แดชบอร์ด', path: '/', icon: <DashboardIcon fontSize="small" />, badge: '3', badgeColor: 'error' }}
          active={isActive('/')}
          onClick={() => navTo('/')}
        />
      </Box>

      {/* Security section */}
      <SectionLabel>ความปลอดภัย</SectionLabel>
      <List dense disablePadding sx={{ px: 0 }}>
        {SECURITY_ITEMS.map(item => (
          <NavItem
            key={item.path}
            item={item}
            active={isActive(item.path)}
            onClick={() => navTo(item.path)}
          />
        ))}
      </List>

      {/* Administration section */}
      {isAdmin && (
        <>
          <SectionLabel>การจัดการ</SectionLabel>
          <List dense disablePadding sx={{ px: 0 }}>
            <NavItem
              item={{ label: 'ผู้ดูแลระบบ', path: '/admin', icon: <AdminPanelSettingsIcon fontSize="small" /> }}
              active={isActive('/admin')}
              onClick={() => navTo('/admin')}
            />
          </List>
        </>
      )}

      {/* Spacer */}
      <Box sx={{ flexGrow: 1 }} />

      {/* User section */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          background: 'linear-gradient(180deg, rgba(13,24,37,0.66) 0%, rgba(13,24,37,0.95) 100%)',
        }}
      >
        <Box sx={{ mb: 1.25 }}>
          {CLUSTER_STATUS.map(node => (
            <Box key={node.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: node.color,
                  boxShadow: `0 0 6px ${node.color}`,
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: 10, color: 'text.secondary', minWidth: 48 }}>
                {node.label}
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontFamily: '"IBM Plex Mono", monospace' }}>
                {node.host}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              fontSize: 13,
              fontWeight: 700,
              bgcolor: 'primary.main',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ fontSize: 13, lineHeight: 1.3 }}
            >
              {user?.full_name || user?.username}
            </Typography>
            <Chip
              size="small"
              label={ROLE_TH[user?.role] || user?.role}
              color={ROLE_COLOR[user?.role] || 'default'}
              sx={{ height: 16, fontSize: 10, mt: 0.3 }}
            />
          </Box>
          <Tooltip title="ออกจากระบบ">
            <IconButton
              size="small"
              onClick={handleLogout}
              sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
          SOC Center v1.0.0
        </Typography>
      </Box>
    </Box>
  )
}

export default function Sidebar({ drawerWidth, mobileOpen, onClose, isMobile }) {
  const paperSx = {
    width: drawerWidth,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
    bgcolor: '#0d1825',
    backgroundImage: 'none',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  }

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
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': { ...paperSx, position: 'fixed', height: '100vh' },
      }}
    >
      <SidebarContent />
    </Drawer>
  )
}
