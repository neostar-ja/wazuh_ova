import React from 'react'
import { Box, Typography, IconButton, Tooltip, useTheme } from '@mui/material'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'

interface SidebarBrandProps {
  collapsed: boolean
  onToggleCollapse?: () => void
}

export default function SidebarBrand({ collapsed, onToggleCollapse }: SidebarBrandProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box
      sx={{
        px: collapsed ? 1 : 2,
        pt: collapsed ? 1.75 : 2,
        pb: collapsed ? 1.5 : 1.75,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid',
        borderColor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)',
      }}
    >
      {/* Ambient orb */}
      <Box sx={{
        position: 'absolute', top: -40, right: -40, width: 140, height: 140,
        borderRadius: '50%',
        background: isDark
          ? 'radial-gradient(circle, rgba(123,91,164,0.18) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(123,91,164,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo + title row */}
      <Box sx={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 1.5,
        justifyContent: collapsed ? 'center' : 'flex-start',
        position: 'relative', zIndex: 1,
      }}>
        <Box sx={{
          width: collapsed ? 42 : 44, height: collapsed ? 42 : 44,
          borderRadius: '14px', flexShrink: 0,
          background: 'linear-gradient(135deg,#7B5BA4 0%,#4A2D7A 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(123,91,164,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
          transition: 'all 0.25s ease',
        }}>
          <SecurityRoundedIcon sx={{ color: '#fff', fontSize: collapsed ? 22 : 24 }} />
        </Box>

        {!collapsed && (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontSize: 17, fontWeight: 800, lineHeight: 1.1,
              letterSpacing: '-0.3px',
              background: isDark
                ? 'linear-gradient(135deg,#FFFFFF 0%,#C4A8E8 100%)'
                : 'linear-gradient(135deg,#3A1D6A 0%,#7B5BA4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              SOC Center
            </Typography>
            <Typography sx={{
              fontSize: 11,
              color: isDark ? 'rgba(237,233,250,0.45)' : 'rgba(26,16,51,0.5)',
              lineHeight: 1.3, mt: 0.25, fontWeight: 500,
              letterSpacing: '0.01em',
            }}>
              Wazuh Security Platform
            </Typography>
          </Box>
        )}
      </Box>

      {/* Live badge + collapse toggle */}
      <Box sx={{
        display: 'flex', alignItems: 'center', mt: 1.25,
        justifyContent: collapsed ? 'center' : 'space-between',
        position: 'relative', zIndex: 1,
      }}>
        {!collapsed && (
          <Box sx={{
            px: 1, py: 0.35, borderRadius: '8px',
            display: 'inline-flex', alignItems: 'center', gap: 0.6,
            background: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)',
            border: isDark ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(34,197,94,0.2)',
          }}>
            <Box sx={{
              width: 6, height: 6, borderRadius: '50%', bgcolor: '#22C55E',
              boxShadow: '0 0 7px rgba(34,197,94,0.9)',
              animation: 'pulseGlow 3s ease-in-out infinite',
            }} />
            <Typography sx={{
              fontSize: 10.5, fontWeight: 700, lineHeight: 1,
              color: isDark ? 'rgba(34,197,94,0.9)' : '#15803D',
              letterSpacing: '0.04em',
            }}>
              Live
            </Typography>
          </Box>
        )}

        {onToggleCollapse && (
          <Tooltip title={collapsed ? 'Expand menu' : 'Collapse menu'} placement="right">
            <IconButton
              size="small"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              sx={{
                color: isDark ? 'rgba(155,125,196,0.65)' : 'rgba(123,91,164,0.55)',
                p: 0.6, borderRadius: '9px',
                bgcolor: isDark ? 'rgba(123,91,164,0.08)' : 'rgba(123,91,164,0.07)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.12)',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.13)',
                  color: '#7B5BA4',
                },
              }}
            >
              {collapsed
                ? <ChevronRightRoundedIcon sx={{ fontSize: 17 }} />
                : <ChevronLeftRoundedIcon sx={{ fontSize: 17 }} />
              }
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  )
}
