import React from 'react'
import { Box, useTheme } from '@mui/material'
import { DRAWER_WIDTH, DRAWER_COLLAPSED, MOBILE_WIDTH } from './sidebar.types'
import SidebarContent from './SidebarContent'

export { DRAWER_WIDTH, DRAWER_COLLAPSED, MOBILE_WIDTH }

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
  isMobile: boolean
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({ mobileOpen, onClose, isMobile, collapsed, onToggleCollapse }: SidebarProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const baseSx = {
    position: 'relative',
    background: isDark
      ? 'linear-gradient(180deg, rgba(11,17,32,0.94) 0%, rgba(15,23,42,0.96) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)',
    borderRight: '1px solid',
    borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
  }

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <Box
          onClick={onClose}
          aria-hidden="true"
          sx={{
            position: 'fixed', inset: 0, zIndex: 1199,
            bgcolor: 'rgba(2,6,23,0.48)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? 'auto' : 'none',
            transition: 'opacity 0.25s ease',
          }}
        />
        {/* Slide-in panel */}
        <Box
          component="nav"
          aria-label="Mobile navigation"
          sx={{
            ...baseSx,
            position: 'fixed', top: 0, left: 0,
            width: MOBILE_WIDTH,
            height: '100dvh',
            zIndex: 1200,
            display: 'flex', flexDirection: 'column',
            overflowX: 'hidden',
            transform: mobileOpen ? 'translateX(0)' : `translateX(-${MOBILE_WIDTH}px)`,
            transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: mobileOpen ? '20px 0 60px rgba(2,6,23,0.3)' : 'none',
          }}
        >
          <SidebarContent collapsed={false} onClose={onClose} />
        </Box>
      </>
    )
  }

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        ...baseSx,
        width: collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH,
        flexShrink: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'hidden',
        transition: 'width 280ms cubic-bezier(0.4,0,0.2,1)',
        zIndex: 1100,
        boxShadow: isDark ? '8px 0 30px rgba(2,6,23,0.12)' : '10px 0 32px rgba(15,23,42,0.04)',
      }}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </Box>
  )
}
