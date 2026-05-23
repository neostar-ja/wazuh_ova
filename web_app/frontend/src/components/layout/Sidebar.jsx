import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Avatar, Tooltip, IconButton, Typography, useTheme } from '@mui/material'
import LogoutRoundedIcon     from '@mui/icons-material/LogoutRounded'
import SecurityRoundedIcon   from '@mui/icons-material/SecurityRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import MenuOpenRoundedIcon    from '@mui/icons-material/MenuOpenRounded'
import { useAuth } from '../../hooks/useAuth'

export const DRAWER_WIDTH = 240
export const DRAWER_COLLAPSED = 68

// ── Icon colors per menu item ────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    section: null,
    items: [
      {
        label: 'ภาพรวม', sub: 'Dashboard', path: '/', exact: true,
        bg: 'linear-gradient(135deg,#7B5BA4,#5A3E85)', glow: 'rgba(123,91,164,0.5)',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: 'ความปลอดภัย',
    items: [
      {
        label: 'การแจ้งเตือน', sub: 'Threat Alerts', path: '/alerts',
        bg: 'linear-gradient(135deg,#EF4444,#B91C1C)', glow: 'rgba(239,68,68,0.55)',
        badge: true,
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
        ),
      },
      {
        label: 'วิเคราะห์เหตุการณ์', sub: 'Investigate', path: '/investigate',
        bg: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', glow: 'rgba(59,130,246,0.5)',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        ),
      },
      {
        label: 'ตรวจจับภัยคุกคาม', sub: 'IOC Lookup', path: '/ioc',
        bg: 'linear-gradient(135deg,#F17422,#C05310)', glow: 'rgba(241,116,34,0.5)',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 6z"/>
          </svg>
        ),
      },
      {
        label: 'มาตรฐาน & Compliance', sub: 'Standards', path: '/compliance',
        bg: 'linear-gradient(135deg,#22C55E,#15803D)', glow: 'rgba(34,197,94,0.5)',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        ),
      },
      {
        label: 'อุปกรณ์เครือข่าย', sub: 'Network Assets', path: '/assets',
        bg: 'linear-gradient(135deg,#0EA5E9,#0284C7)', glow: 'rgba(14,165,233,0.5)',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M17 16l-4-4V8.82C14.16 8.4 15 7.3 15 6c0-1.66-1.34-3-3-3S9 4.34 9 6c0 1.3.84 2.4 2 2.82V12l-4 4H3v5h5v-3.05l4-4.2 4 4.2V21h5v-5h-4z"/>
          </svg>
        ),
      },
      {
        label: 'ตัวชี้วัดผลงาน', sub: 'KPI & Metrics', path: '/kpi',
        bg: 'linear-gradient(135deg,#F59E0B,#B45309)', glow: 'rgba(245,158,11,0.5)',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: 'การจัดการ',
    adminOnly: true,
    items: [
      {
        label: 'ตั้งค่าระบบ', sub: 'Administration', path: '/admin',
        bg: 'linear-gradient(135deg,#64748B,#334155)', glow: 'rgba(100,116,139,0.5)',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
        ),
      },
    ],
  },
]

const ROLE_COLOR = { superadmin: '#EF4444', admin: '#F59E0B', analyst: '#3B82F6', viewer: '#9A90BF' }
const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'ผู้ดูแลระบบ', analyst: 'นักวิเคราะห์', viewer: 'ผู้ชม' }

// ── Nav Item ──────────────────────────────────────────────────────────────────
function NavItem({ item, active, onClick, hasBadge, collapsed }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const content = (
    <Box
      onClick={onClick}
      sx={{
        mx: collapsed ? 0.75 : 1,
        mb: 0.5,
        borderRadius: collapsed ? '12px' : '11px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        overflow: 'hidden',
        background: active
          ? isDark
            ? 'linear-gradient(135deg, rgba(123,91,164,0.22) 0%, rgba(123,91,164,0.08) 100%)'
            : 'linear-gradient(135deg, rgba(123,91,164,0.12) 0%, rgba(123,91,164,0.05) 100%)'
          : 'transparent',
        border: active
          ? isDark
            ? '1px solid rgba(123,91,164,0.3)'
            : '1px solid rgba(123,91,164,0.2)'
          : '1px solid transparent',
        boxShadow: active
          ? isDark
            ? '0 2px 12px rgba(123,91,164,0.15)'
            : '0 2px 8px rgba(123,91,164,0.1)'
          : 'none',
        '&:hover': {
          background: active
            ? isDark
              ? 'linear-gradient(135deg, rgba(123,91,164,0.28) 0%, rgba(123,91,164,0.1) 100%)'
              : 'linear-gradient(135deg, rgba(123,91,164,0.15) 0%, rgba(123,91,164,0.08) 100%)'
            : isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(123,91,164,0.05)',
          border: active
            ? isDark
              ? '1px solid rgba(123,91,164,0.4)'
              : '1px solid rgba(123,91,164,0.25)'
            : isDark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(123,91,164,0.1)',
          transform: collapsed ? 'scale(1.05)' : 'translateX(2px)',
        },
        // Active indicator bar
        '&::before': active ? {
          content: '""',
          position: 'absolute',
          left: 0, top: '20%', bottom: '20%',
          width: '3px',
          borderRadius: '0 3px 3px 0',
          background: `linear-gradient(180deg, ${item.bg.includes('#') ? BRAND_PURPLE : '#7B5BA4'}, #5A3E85)`,
          boxShadow: '0 0 8px rgba(123,91,164,0.5)',
        } : {},
      }}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 1.25,
        px: collapsed ? 0 : 1.25,
        py: collapsed ? 1 : 0.85,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {/* Icon box */}
        <Box sx={{
          width: collapsed ? 36 : 32, height: collapsed ? 36 : 32,
          borderRadius: collapsed ? '10px' : '9px', flexShrink: 0,
          background: active ? item.bg : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)',
          boxShadow: active ? `0 4px 12px ${item.glow}` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: active ? '#fff' : isDark ? 'rgba(255,255,255,0.45)' : 'rgba(123,91,164,0.6)',
          transition: 'all 0.2s ease',
        }}>
          {item.icon}
        </Box>

        {/* Text — hidden when collapsed */}
        {!collapsed && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontSize: 13, fontWeight: active ? 700 : 400,
              color: active
                ? isDark ? '#EDE9FA' : '#1A1033'
                : isDark ? 'rgba(237,233,250,0.65)' : 'rgba(26,16,51,0.6)',
              lineHeight: 1.3, transition: 'all 0.18s',
            }}>
              {item.label}
            </Typography>
            <Typography sx={{
              fontSize: 10,
              color: active
                ? isDark ? 'rgba(155,125,196,0.9)' : 'rgba(123,91,164,0.8)'
                : isDark ? 'rgba(237,233,250,0.3)' : 'rgba(26,16,51,0.4)',
              lineHeight: 1.2, fontWeight: 400,
            }}>
              {item.sub}
            </Typography>
          </Box>
        )}

        {/* Arrow / badge */}
        {!collapsed && hasBadge ? (
          <Box sx={{
            minWidth: 20, height: 20, borderRadius: '10px', px: 0.75,
            background: 'linear-gradient(135deg,#EF4444,#B91C1C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
          }}>
            <Typography sx={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>NEW</Typography>
          </Box>
        ) : !collapsed && active ? (
          <ChevronRightRoundedIcon sx={{
            fontSize: 16,
            color: isDark ? 'rgba(155,125,196,0.7)' : 'rgba(123,91,164,0.7)',
            flexShrink: 0
          }} />
        ) : null}
      </Box>
    </Box>
  )

  // Tooltip only when collapsed
  if (collapsed) {
    return (
      <Tooltip title={item.label} placement="right" arrow>
        {content}
      </Tooltip>
    )
  }
  return content
}

const BRAND_PURPLE = '#7B5BA4'

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children, collapsed }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  if (collapsed) {
    return (
      <Box sx={{ px: 1, pt: 1.5, pb: 0.5 }}>
        <Box sx={{
          height: 1,
          bgcolor: isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.1)'
        }} />
      </Box>
    )
  }

  return (
    <Box sx={{ px: 2, pt: 1.75, pb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{
        height: 1, flex: 1,
        bgcolor: isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.1)'
      }} />
      <Typography sx={{
        fontSize: 9.5, fontWeight: 800,
        color: isDark ? 'rgba(155,125,196,0.55)' : 'rgba(123,91,164,0.6)',
        textTransform: 'uppercase', letterSpacing: '0.14em', flexShrink: 0,
      }}>
        {children}
      </Typography>
      <Box sx={{
        height: 1, flex: 1,
        bgcolor: isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.1)'
      }} />
    </Box>
  )
}

// ── Sidebar Content ───────────────────────────────────────────────────────────
function SidebarContent({ onClose, collapsed, onToggleCollapse }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const isActive = (path, exact = false) =>
    exact || path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`)

  const navTo = path => { navigate(path); onClose?.() }

  const handleLogout = async () => { await logout(); navigate('/login') }

  const initials = (user?.full_name || user?.username || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const roleColor = ROLE_COLOR[user?.role] || '#9A90BF'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Logo / Header ── */}
      <Box sx={{
        px: collapsed ? 1 : 2, pt: 2, pb: 1.5, flexShrink: 0, position: 'relative', overflow: 'hidden',
        bgcolor: isDark ? undefined : 'rgba(123,91,164,0.04)',
        borderBottom: isDark ? undefined : '1px solid rgba(123,91,164,0.1)',
      }}>
        {/* BG orb */}
        <Box sx={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(123,91,164,0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(123,91,164,0.1) 0%, transparent 70%)',
          pointerEvents: 'none' }} />

        <Box sx={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 1.5,
          justifyContent: collapsed ? 'center' : 'flex-start',
          position: 'relative', zIndex: 1,
        }}>
          {/* Logo shield */}
          <Box sx={{
            width: collapsed ? 38 : 40, height: collapsed ? 38 : 40,
            borderRadius: '12px', flexShrink: 0,
            background: 'linear-gradient(135deg, #7B5BA4 0%, #4A2D7A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(123,91,164,0.55), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}>
            <SecurityRoundedIcon sx={{ color: '#fff', fontSize: collapsed ? 20 : 22 }} />
          </Box>

          {!collapsed && (
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{
                fontSize: 16, fontWeight: 800, lineHeight: 1.1,
                background: isDark
                  ? 'linear-gradient(135deg, #FFFFFF 0%, #C4A8E8 100%)'
                  : 'linear-gradient(135deg, #4A2D7A 0%, #7B5BA4 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                SOC Center
              </Typography>
              <Typography sx={{
                fontSize: 10,
                color: isDark ? 'rgba(237,233,250,0.4)' : 'rgba(26,16,51,0.5)',
                lineHeight: 1.3, mt: 0.2
              }}>
                hospital.wu.ac.th
              </Typography>
            </Box>
          )}
        </Box>

        {/* Version badge + Collapse toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', mt: 1.25 }}>
          {!collapsed && (
            <Box sx={{
              px: 1, py: 0.4, borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: 0.5,
              background: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
              border: isDark ? '1px solid rgba(123,91,164,0.2)' : '1px solid rgba(123,91,164,0.15)',
            }}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
              <Typography sx={{
                fontSize: 9.5,
                color: isDark ? 'rgba(155,125,196,0.9)' : 'rgba(123,91,164,0.8)',
                fontWeight: 600
              }}>
                Wazuh · v2.0
              </Typography>
            </Box>
          )}

          {/* Collapse/expand toggle */}
          {onToggleCollapse && (
            <Tooltip title={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'} placement="right">
              <IconButton
                size="small"
                onClick={onToggleCollapse}
                sx={{
                  color: isDark ? 'rgba(155,125,196,0.6)' : 'rgba(123,91,164,0.5)',
                  p: 0.5, borderRadius: '8px',
                  bgcolor: isDark ? 'rgba(123,91,164,0.08)' : 'rgba(123,91,164,0.06)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)',
                  '&:hover': { bgcolor: isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.12)' },
                  transition: 'all 0.2s',
                }}
              >
                {collapsed
                  ? <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
                  : <ChevronLeftRoundedIcon sx={{ fontSize: 16 }} />
                }
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {!collapsed && (
          <Box sx={{
            mt: 1.25, height: 1,
            bgcolor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.08)'
          }} />
        )}
      </Box>

      {/* ── Navigation ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }} className="scrollbar-hide">
        {NAV_GROUPS.map((group, gi) => {
          if (group.adminOnly && !isAdmin) return null
          return (
            <Box key={gi}>
              {group.section && <SectionLabel collapsed={collapsed}>{group.section}</SectionLabel>}
              <Box sx={{ mt: group.section ? 0.25 : 0.5 }}>
                {group.items.map(item => (
                  <NavItem
                    key={item.path}
                    item={item}
                    active={isActive(item.path, item.exact)}
                    onClick={() => navTo(item.path)}
                    hasBadge={false}
                    collapsed={collapsed}
                  />
                ))}
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* ── User Section ── */}
      <Box sx={{
        flexShrink: 0, p: collapsed ? 0.75 : 1.25,
        borderTop: '1px solid',
        borderColor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)',
      }}>
        {collapsed ? (
          /* Collapsed: just avatar + logout */
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Tooltip title={user?.full_name || user?.username} placement="right">
              <Avatar sx={{
                width: 36, height: 36, fontSize: 13, fontWeight: 800,
                background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
                boxShadow: `0 0 0 2px ${roleColor}40`,
                cursor: 'default',
              }}>
                {initials}
              </Avatar>
            </Tooltip>
            <Tooltip title="ออกจากระบบ" placement="right">
              <IconButton
                size="small" onClick={handleLogout}
                sx={{
                  color: isDark ? 'rgba(237,233,250,0.35)' : 'rgba(26,16,51,0.35)',
                  p: 0.5, borderRadius: '8px',
                  '&:hover': { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.12)' },
                  transition: 'all 0.15s', flexShrink: 0 }}
              >
                <LogoutRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          /* Expanded: full user card */
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            p: 1, borderRadius: '11px',
            background: isDark ? 'rgba(123,91,164,0.06)' : 'rgba(123,91,164,0.04)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.1)',
          }}>
            {/* Avatar with colored ring */}
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar sx={{
                width: 34, height: 34, fontSize: 13, fontWeight: 800,
                background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
                boxShadow: `0 0 0 2px ${roleColor}40`,
              }}>
                {initials}
              </Avatar>
              <Box sx={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%',
                bgcolor: '#22C55E', border: isDark ? '2px solid #130F22' : '2px solid #F5F3FF', boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontSize: 12.5, fontWeight: 700,
                color: isDark ? '#EDE9FA' : '#1A1033',
                lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {user?.full_name || user?.username}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.2 }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: roleColor, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 10, color: roleColor, fontWeight: 600 }}>
                  {ROLE_LABEL[user?.role] || user?.role}
                </Typography>
              </Box>
            </Box>

            <Tooltip title="ออกจากระบบ" placement="top">
              <IconButton
                size="small" onClick={handleLogout}
                sx={{
                  color: isDark ? 'rgba(237,233,250,0.3)' : 'rgba(26,16,51,0.3)',
                  p: 0.5, borderRadius: '7px',
                  '&:hover': { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.1)' },
                  transition: 'all 0.15s', flexShrink: 0 }}
              >
                <LogoutRoundedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  )
}

// ── Sidebar wrapper ───────────────────────────────────────────────────────────
/**
 * DESKTOP: Pure flex child — NO position:sticky/fixed.
 *   width = DRAWER_WIDTH or DRAWER_COLLAPSED
 *   flexShrink = 0 → keeps its width, lets main take the rest
 *   height = 100vh → fills the flex row height
 *   overflow = hidden → internal scrolling handled by SidebarContent
 *
 * MOBILE: position:fixed overlay sliding in from left.
 *   Does NOT participate in flex layout (position:fixed removes it from flow).
 *   Main area takes full width on mobile.
 */
export default function Sidebar({ mobileOpen, onClose, isMobile, collapsed, onToggleCollapse }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  const currentWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH

  const baseSx = {
    background: isDark
      ? 'linear-gradient(180deg,#1A1230 0%,#110D1E 50%,#0E0A18 100%)'
      : 'linear-gradient(180deg,#F5F3FF 0%,#FDFCFF 100%)',
    borderRight: '1px solid',
    borderColor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)',
  }

  // ── Mobile overlay ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <Box onClick={onClose} sx={{
          position: 'fixed', inset: 0, zIndex: 1199,
          bgcolor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }} />
        {/* Panel */}
        <Box component="nav" sx={{
          ...baseSx,
          position: 'fixed', top: 0, left: 0,
          width: DRAWER_WIDTH,
          height: '100vh',
          zIndex: 1200,
          display: 'flex', flexDirection: 'column', overflowX: 'hidden',
          transform: mobileOpen ? 'translateX(0)' : `translateX(-${DRAWER_WIDTH}px)`,
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: mobileOpen ? '4px 0 24px rgba(0,0,0,0.35)' : 'none',
        }}>
          <SidebarContent onClose={onClose} collapsed={false} />
        </Box>
      </>
    )
  }

  // ── Desktop in-flow sidebar ─────────────────────────────────────────────────
  return (
    <Box
      component="nav"
      sx={{
        ...baseSx,
        /**
         * KEY: width + flexShrink:0 makes this a fixed-width flex child.
         * The parent (Layout root) is display:flex,row → this sidebar
         * occupies exactly `currentWidth` px; <main> gets the rest via flex:1.
         * NO position tricks — pure CSS flex.
         */
        width: currentWidth,
        flexShrink: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'hidden',
        // Smooth width transition when collapsing
        transition: 'width 280ms cubic-bezier(0.4,0,0.2,1)',
        zIndex: 1100,
      }}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </Box>
  )
}
