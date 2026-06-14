import React from 'react'
import { Box } from '@mui/material'
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

      <Box
        component="nav"
        aria-label="Main navigation"
        sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 0.8 }}
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

      <SidebarUserCard user={user} collapsed={collapsed} onLogout={handleLogout} />
    </Box>
  )
}
