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
      minWidth: 22, height: 22, borderRadius: '999px', px: 0.8,
      background: `${c}18`,
      border: `1px solid ${c}28`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: c, lineHeight: 1 }}>
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
          ? `${item.color}18`
          : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
        border: '1px solid',
        borderColor: active
          ? `${item.color}26`
          : isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active
          ? item.color
          : isDark ? 'rgba(226,232,240,0.46)' : 'rgba(71,85,105,0.58)',
        transition: 'all 0.2s ease',
      }}>
        {item.icon}
      </Box>

      {/* Label + badge */}
      {!collapsed && (
        <>
          <Typography sx={{
            flex: 1, minWidth: 0,
            fontSize: 14, fontWeight: active ? 700 : 600,
            color: active
              ? isDark ? '#EEF2FF' : '#0F172A'
              : isDark ? 'rgba(226,232,240,0.72)' : 'rgba(15,23,42,0.7)',
            lineHeight: 1.3,
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
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: isDark ? '#EDE9FA' : '#0F172A', lineHeight: 1.3 }}>
        {item.label}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: isDark ? 'rgba(237,233,250,0.65)' : 'rgba(15,23,42,0.6)', mt: 0.3, lineHeight: 1.5 }}>
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
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(255,255,255,0.7)'
          : 'transparent',
        border: '1px solid',
        borderColor: active
          ? `${item.color}24`
          : 'transparent',
        boxShadow: active
          ? isDark ? '0 10px 24px rgba(2,6,23,0.12)' : '0 10px 22px rgba(15,23,42,0.05)'
          : 'none',
        '&:hover': {
          background: active
            ? isDark
              ? 'rgba(255,255,255,0.07)'
              : 'rgba(255,255,255,0.92)'
            : isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.85)',
          borderColor: active
            ? `${item.color}32`
            : isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
        },
        '&:focus-visible': {
          outline: `2px solid ${item.color}`,
          outlineOffset: 2,
        },
        '&::before': active ? {
          content: '""',
          position: 'absolute',
          left: 10, right: 10, top: 0,
          height: 2,
          borderRadius: '999px',
          background: item.color,
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
            bgcolor: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.98)',
            color: isDark ? '#EEF2FF' : '#0F172A',
            backdropFilter: 'blur(16px)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.08)',
            borderRadius: '10px',
            px: 1.5, py: 1,
            boxShadow: isDark
              ? '0 18px 40px rgba(2,6,23,0.28)'
              : '0 18px 36px rgba(15,23,42,0.12)',
          },
        },
        arrow: {
          sx: { color: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.98)' },
        },
      }}
    >
      {inner}
    </Tooltip>
  )
}
