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
        px: collapsed ? 1 : 1.75,
        pt: 1.5,
        pb: 1.4,
        flexShrink: 0,
        borderBottom: '1px solid',
        borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)',
      }}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 1.5,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <Box sx={{
          width: collapsed ? 42 : 44, height: collapsed ? 42 : 44,
          borderRadius: '14px', flexShrink: 0,
          background: isDark ? 'rgba(79,110,247,0.14)' : 'rgba(79,110,247,0.1)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(79,110,247,0.26)' : 'rgba(79,110,247,0.16)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#4F6EF7',
        }}>
          <SecurityRoundedIcon sx={{ color: '#4F6EF7', fontSize: collapsed ? 22 : 24 }} />
        </Box>

        {!collapsed && (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontSize: 16, fontWeight: 800, lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'text.primary',
            }}>
              SOC Center
            </Typography>
            <Typography sx={{
              fontSize: 11,
              color: 'text.disabled',
              lineHeight: 1.3, mt: 0.3, fontWeight: 500,
            }}>
              Professional security operations
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{
        display: 'flex', alignItems: 'center', mt: 1.15,
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && (
          <Box sx={{
            px: 1, py: 0.45, borderRadius: '999px',
            display: 'inline-flex', alignItems: 'center', gap: 0.6,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(248,250,252,0.9)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
          }}>
            <Box sx={{
              width: 6, height: 6, borderRadius: '50%', bgcolor: '#22C55E',
              boxShadow: '0 0 6px rgba(34,197,94,0.55)',
              animation: 'pulseGlow 3s ease-in-out infinite',
            }} />
            <Typography sx={{
              fontSize: 10.5, fontWeight: 700, lineHeight: 1,
              color: 'text.secondary',
              letterSpacing: '0.04em',
            }}>
              Operations ready
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
                color: isDark ? 'rgba(226,232,240,0.68)' : 'rgba(71,85,105,0.78)',
                p: 0.6, borderRadius: '10px',
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.96)',
                  color: 'text.primary',
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
