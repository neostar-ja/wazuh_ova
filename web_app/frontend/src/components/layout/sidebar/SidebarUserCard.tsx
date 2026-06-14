import React from 'react'
import { Box, Avatar, Typography, IconButton, Tooltip, useTheme } from '@mui/material'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import { User } from '../../../types/auth'

const ROLE_COLOR: Record<string, string> = {
  superadmin: '#EF4444',
  admin:      '#F59E0B',
  analyst:    '#3B82F6',
  viewer:     '#9A90BF',
}
const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  admin:      'Administrator',
  analyst:    'Analyst',
  viewer:     'Viewer',
}

interface SidebarUserCardProps {
  user: User | null
  collapsed: boolean
  onLogout: () => void
}

export default function SidebarUserCard({ user, collapsed, onLogout }: SidebarUserCardProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const initials = (user?.name || user?.username || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const roleColor = ROLE_COLOR[user?.role || ''] || '#9A90BF'
  const roleLabel = ROLE_LABEL[user?.role || ''] || user?.role || ''

  return (
    <Box sx={{
      flexShrink: 0,
      p: collapsed ? 1 : 1.5,
      borderTop: '1px solid',
      borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)',
    }}>
      {collapsed ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Tooltip title={`${user?.name || user?.username} · ${roleLabel}`} placement="right">
            <Avatar sx={{
              width: 38, height: 38, fontSize: 13, fontWeight: 800,
              background: roleColor,
              boxShadow: `0 0 0 2px ${roleColor}22`,
              cursor: 'default',
            }}>
              {initials}
            </Avatar>
          </Tooltip>
          <Tooltip title="Log out" placement="right">
            <IconButton
              size="small"
              onClick={onLogout}
              aria-label="Log out"
              sx={{
                color: isDark ? 'rgba(226,232,240,0.42)' : 'rgba(15,23,42,0.42)',
                p: 0.6, borderRadius: '10px',
                '&:hover': { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.1)' },
                transition: 'all 0.15s',
              }}
            >
              <LogoutRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.25,
          px: 1.2, py: 1, borderRadius: '14px',
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.76)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
        }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar sx={{
              width: 36, height: 36, fontSize: 13, fontWeight: 800,
              background: roleColor,
              boxShadow: `0 0 0 2px ${roleColor}22`,
            }}>
              {initials}
            </Avatar>
            <Box sx={{
              position: 'absolute', bottom: -1, right: -1,
              width: 10, height: 10, borderRadius: '50%',
              bgcolor: '#22C55E',
              border: isDark ? '2px solid #0F172A' : '2px solid #FFFFFF',
              boxShadow: '0 0 6px rgba(34,197,94,0.45)',
            }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontSize: 13.5, fontWeight: 700,
              color: isDark ? '#EEF2FF' : '#0F172A',
              lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.name || user?.username}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <Box sx={{
                px: 0.7, py: 0.2, borderRadius: '999px',
                bgcolor: `${roleColor}22`,
                border: `1px solid ${roleColor}44`,
              }}>
                <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: roleColor, lineHeight: 1.4 }}>
                  {roleLabel}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Tooltip title="Log out" placement="top">
            <IconButton
              size="small"
              onClick={onLogout}
              aria-label="Log out"
              sx={{
                color: isDark ? 'rgba(226,232,240,0.38)' : 'rgba(15,23,42,0.38)',
                p: 0.55, borderRadius: '10px',
                '&:hover': { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.1)' },
                transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <LogoutRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  )
}
