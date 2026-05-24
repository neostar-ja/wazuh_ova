import React from 'react'
import { Box, Typography, Tooltip, useTheme } from '@mui/material'
import { NavItemData } from './sidebar.types'

interface SidebarNavItemProps {
  item: NavItemData
  active: boolean
  collapsed: boolean
  onClick: () => void
}

function BadgeChip({ count, label, variant }: { count?: number; label?: string; variant?: string }) {
  const colorMap: Record<string, string> = {
    danger:  '#EF4444',
    warning: '#F59E0B',
    info:    '#38BDF8',
    success: '#22C55E',
  }
  const c = colorMap[variant || 'danger'] || '#EF4444'
  const text = count != null ? String(Math.min(count, 99)) : (label ?? '')
  if (!text) return null
  return (
    <Box sx={{
      minWidth: 20, height: 20, borderRadius: '10px', px: 0.7,
      background: `linear-gradient(135deg,${c},${c}CC)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 2px 8px ${c}55`,
      flexShrink: 0,
    }}>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
        {text}
      </Typography>
    </Box>
  )
}

function ItemContent({ item, active, collapsed, isDark }: {
  item: NavItemData; active: boolean; collapsed: boolean; isDark: boolean
}) {
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 1.5,
        px: collapsed ? 0 : 1.5,
        py: 0,
        justifyContent: collapsed ? 'center' : 'flex-start',
        height: collapsed ? 52 : 54,
      }}
    >
      {/* Icon box */}
      <Box sx={{
        width: collapsed ? 40 : 38,
        height: collapsed ? 40 : 38,
        borderRadius: '12px',
        flexShrink: 0,
        background: active
          ? item.gradient
          : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)',
        boxShadow: active ? `0 4px 16px ${item.glow}` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active
          ? '#fff'
          : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(90,62,133,0.5)',
        transition: 'all 0.2s ease',
      }}>
        {item.icon}
      </Box>

      {/* Label + badge */}
      {!collapsed && (
        <>
          <Typography sx={{
            flex: 1, minWidth: 0,
            fontSize: 15, fontWeight: active ? 700 : 500,
            color: active
              ? isDark ? '#EDE9FA' : '#1A1033'
              : isDark ? 'rgba(237,233,250,0.6)' : 'rgba(26,16,51,0.6)',
            lineHeight: 1.3,
            letterSpacing: '-0.1px',
            transition: 'all 0.18s',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.label}
          </Typography>
          {item.badge && (
            <BadgeChip
              count={item.badge.count}
              label={item.badge.label}
              variant={item.badge.variant}
            />
          )}
        </>
      )}
    </Box>
  )
}

export default function SidebarNavItem({ item, active, collapsed, onClick }: SidebarNavItemProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const tooltipTitle = collapsed ? (
    <Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#EDE9FA', lineHeight: 1.3 }}>
        {item.label}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: 'rgba(237,233,250,0.65)', mt: 0.3, lineHeight: 1.5 }}>
        {item.descriptionTh}
      </Typography>
    </Box>
  ) : item.descriptionTh

  const inner = (
    <Box
      component="li"
      role="none"
      onClick={onClick}
      sx={{
        mx: collapsed ? 1 : 1.25,
        mb: 0.5,
        borderRadius: '14px',
        cursor: 'pointer',
        listStyle: 'none',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        background: active
          ? isDark
            ? 'linear-gradient(135deg,rgba(123,91,164,0.2) 0%,rgba(123,91,164,0.07) 100%)'
            : 'linear-gradient(135deg,rgba(123,91,164,0.1) 0%,rgba(123,91,164,0.04) 100%)'
          : 'transparent',
        border: '1px solid',
        borderColor: active
          ? isDark ? 'rgba(123,91,164,0.28)' : 'rgba(123,91,164,0.18)'
          : 'transparent',
        boxShadow: active
          ? isDark ? '0 2px 16px rgba(123,91,164,0.12)' : '0 2px 10px rgba(123,91,164,0.08)'
          : 'none',
        '&:hover': {
          background: active
            ? isDark
              ? 'linear-gradient(135deg,rgba(123,91,164,0.26) 0%,rgba(123,91,164,0.1) 100%)'
              : 'linear-gradient(135deg,rgba(123,91,164,0.14) 0%,rgba(123,91,164,0.06) 100%)'
            : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)',
          borderColor: active
            ? isDark ? 'rgba(123,91,164,0.38)' : 'rgba(123,91,164,0.25)'
            : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.1)',
          transform: collapsed ? 'scale(1.06)' : 'translateX(3px)',
        },
        '&:focus-visible': {
          outline: `2px solid ${item.color}`,
          outlineOffset: 2,
        },
        // Left accent bar for active item
        '&::before': active ? {
          content: '""',
          position: 'absolute',
          left: 0, top: '18%', bottom: '18%',
          width: '3px',
          borderRadius: '0 3px 3px 0',
          background: `linear-gradient(180deg, ${item.color}, ${item.color}88)`,
          boxShadow: `0 0 10px ${item.glow}`,
        } : {},
      }}
      aria-label={`${item.label} — ${item.descriptionTh}`}
      aria-current={active ? 'page' : undefined}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      <ItemContent item={item} active={active} collapsed={collapsed} isDark={isDark} />
    </Box>
  )

  return (
    <Tooltip
      title={tooltipTitle}
      placement="right"
      arrow
      disableHoverListener={!collapsed && !item.descriptionTh}
      slotProps={{
        tooltip: {
          sx: {
            maxWidth: 240,
            bgcolor: isDark ? 'rgba(22,16,44,0.97)' : 'rgba(26,16,51,0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(123,91,164,0.3)' : 'rgba(123,91,164,0.25)',
            borderRadius: '10px',
            px: 1.5, py: 1,
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.5)'
              : '0 8px 24px rgba(0,0,0,0.15)',
          },
        },
        arrow: {
          sx: { color: isDark ? 'rgba(22,16,44,0.97)' : 'rgba(26,16,51,0.96)' },
        },
      }}
    >
      {inner}
    </Tooltip>
  )
}
