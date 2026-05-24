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
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  const baseSx = {
    background: isDark
      ? 'linear-gradient(180deg,#1A1230 0%,#110D1E 55%,#0D0A1A 100%)'
      : 'linear-gradient(180deg,#F7F5FF 0%,#FDFCFF 100%)',
    borderRight: '1px solid',
    borderColor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)',
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
            bgcolor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
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
            boxShadow: mobileOpen ? '6px 0 32px rgba(0,0,0,0.4)' : 'none',
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
      }}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </Box>
  )
}
