import React from 'react'
import { Box, useTheme } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { NAV_GROUPS } from './navItems'
import { UserRole } from '../../../types/auth'
import SidebarBrand from './SidebarBrand'
import SidebarSection from './SidebarSection'
import SidebarNavItem from './SidebarNavItem'
import SidebarUserCard from './SidebarUserCard'

interface SidebarContentProps {
  collapsed: boolean
  onClose?: () => void
  onToggleCollapse?: () => void
}

function isActive(pathname: string, path: string, exact?: boolean): boolean {
  if (exact || path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(`${path}/`)
}

function hasRole(groupRoles: UserRole[] | undefined, userRole: string | undefined): boolean {
  if (!groupRoles || groupRoles.length === 0) return true
  if (!userRole) return false
  return groupRoles.includes(userRole as UserRole)
}

export default function SidebarContent({ collapsed, onClose, onToggleCollapse }: SidebarContentProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const navTo = (path: string) => {
    navigate(path)
    onClose?.()
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Brand header */}
      <SidebarBrand collapsed={collapsed} onToggleCollapse={onToggleCollapse} />

      {/* Navigation */}
      <Box
        component="nav"
        aria-label="Main navigation"
        sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 0.75 }}
        className="scrollbar-hide"
      >
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {NAV_GROUPS.map(group => {
            if (!hasRole(group.roles, user?.role)) return null

            return (
              <Box component="li" key={group.id} sx={{ listStyle: 'none' }}>
                <SidebarSection label={group.section} collapsed={collapsed} />
                <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', mt: 0.25 }}>
                  {group.items.map(item => {
                    if (!hasRole(item.roles, user?.role)) return null
                    return (
                      <SidebarNavItem
                        key={item.id}
                        item={item}
                        active={isActive(location.pathname, item.path, item.exact)}
                        collapsed={collapsed}
                        onClick={() => navTo(item.path)}
                      />
                    )
                  })}
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>

      {/* System status placeholder */}
      {!collapsed && (
        <Box sx={{
          mx: 1.5, mb: 1, px: 1.25, py: 1,
          borderRadius: '10px',
          background: isDark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.05)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)',
          display: 'flex', alignItems: 'center', gap: 1,
        }}>
          {/* placeholder status — not real-time data */}
          <Box sx={{
            width: 7, height: 7, borderRadius: '50%', bgcolor: '#22C55E', flexShrink: 0,
            boxShadow: '0 0 6px rgba(34,197,94,0.8)',
          }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <span style={{
                fontSize: 11.5, fontWeight: 700,
                color: isDark ? 'rgba(34,197,94,0.9)' : '#15803D',
              }}>Monitoring Active</span>
            </Box>
          </Box>
        </Box>
      )}

      {/* User card */}
      <SidebarUserCard user={user} collapsed={collapsed} onLogout={handleLogout} />
    </Box>
  )
}
