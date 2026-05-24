import React from 'react'
import { Box, Typography, Button, Skeleton, useTheme } from '@mui/material'
import InboxRoundedIcon         from '@mui/icons-material/InboxRounded'
import ErrorOutlineRoundedIcon  from '@mui/icons-material/ErrorOutlineRounded'
import WifiOffRoundedIcon       from '@mui/icons-material/WifiOffRounded'
import BuildRoundedIcon         from '@mui/icons-material/BuildRounded'
import LockRoundedIcon          from '@mui/icons-material/LockRounded'
import RefreshRoundedIcon       from '@mui/icons-material/RefreshRounded'
import OpenInNewRoundedIcon     from '@mui/icons-material/OpenInNewRounded'
import { LoadingStateProps } from './layout.types'

// ─── LoadingState ─────────────────────────────────────────────────────────────

/**
 * LoadingState — context-aware skeleton placeholder.
 *
 * Types:
 *   page   — full page multi-row skeleton
 *   card   — small list-of-lines skeleton
 *   table  — table-rows skeleton
 *   chart  — rectangular block skeleton
 *   list   — vertical list of items
 */
export function LoadingState({
  type = 'card',
  rows = 4,
  height = 200,
  className = '',
}: LoadingStateProps) {
  if (type === 'chart') {
    return (
      <Box className={className} sx={{ width: '100%' }}>
        <Skeleton variant="rectangular" width="100%" height={height} sx={{ borderRadius: '10px' }} />
      </Box>
    )
  }

  if (type === 'table') {
    return (
      <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {/* header */}
        <Skeleton height={32} sx={{ borderRadius: '8px', opacity: 0.7 }} />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} height={44} sx={{ borderRadius: '8px' }} />
        ))}
      </Box>
    )
  }

  if (type === 'list') {
    return (
      <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Skeleton variant="circular" width={32} height={32} sx={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton height={14} width="70%" sx={{ borderRadius: '6px', mb: 0.5 }} />
              <Skeleton height={11} width="45%" sx={{ borderRadius: '6px' }} />
            </Box>
          </Box>
        ))}
      </Box>
    )
  }

  if (type === 'page') {
    return (
      <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton height={14} width="30%" sx={{ borderRadius: '6px', mb: 0.75 }} />
            <Skeleton height={28} width="55%" sx={{ borderRadius: '8px', mb: 0.5 }} />
            <Skeleton height={13} width="40%" sx={{ borderRadius: '6px' }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton width={80} height={32} sx={{ borderRadius: '9px' }} />
            <Skeleton width={110} height={32} sx={{ borderRadius: '9px' }} />
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={88} sx={{ borderRadius: '14px' }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
          <Skeleton height={220} sx={{ borderRadius: '14px' }} />
          <Skeleton height={220} sx={{ borderRadius: '14px' }} />
        </Box>
      </Box>
    )
  }

  // card (default): list of lines
  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {[80, 60, 75, 45, 65].slice(0, rows).map((w, i) => (
        <Skeleton key={i} height={18} width={`${w}%`} sx={{ borderRadius: '6px' }} />
      ))}
    </Box>
  )
}

// ─── Shared base ──────────────────────────────────────────────────────────────

interface StateBaseProps {
  icon?: React.ReactNode
  iconColor?: string
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

function StateBase({ icon, iconColor = '#5A5278', title, description, action, compact = false }: StateBaseProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center',
      py: compact ? 3 : 6,
      px: 2,
      gap: compact ? 1 : 1.5,
    }}>
      {icon && (
        <Box sx={{
          width: compact ? 44 : 56,
          height: compact ? 44 : 56,
          borderRadius: '16px',
          bgcolor: `${iconColor}12`,
          border: `1px solid ${iconColor}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: isDark ? `0 4px 16px ${iconColor}18` : 'none',
        }}>
          {icon}
        </Box>
      )}
      <Box>
        <Typography sx={{
          fontSize: compact ? 13 : 14,
          fontWeight: 700,
          lineHeight: 1.3,
          color: isDark ? 'rgba(237,233,250,0.75)' : 'rgba(26,16,51,0.7)',
          mb: description ? 0.35 : 0,
        }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{
            fontSize: compact ? 11.5 : 12.5,
            color: isDark ? 'rgba(237,233,250,0.38)' : 'rgba(26,16,51,0.45)',
            lineHeight: 1.6,
            maxWidth: 320,
            mt: 0.35,
          }}>
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ mt: 0.5 }}>{action}</Box>}
    </Box>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateNewProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  compact?: boolean
}

/**
 * EmptyState — shown when a query returns no results.
 *
 * Title defaults to "ไม่พบข้อมูล" with a helpful description
 * to guide the user on what to do next.
 */
export function EmptyStateNew({
  title = 'ไม่พบข้อมูล',
  description = 'ลองเปลี่ยนช่วงเวลาหรือตัวกรอง แล้วกด Refresh เพื่อตรวจสอบข้อมูลล่าสุด',
  icon,
  action,
  compact = false,
}: EmptyStateNewProps) {
  return (
    <StateBase
      icon={icon ?? <InboxRoundedIcon sx={{ fontSize: compact ? 22 : 26, color: '#5A5278', opacity: 0.6 }} />}
      iconColor="#7B5BA4"
      title={title}
      description={description}
      action={action}
      compact={compact}
    />
  )
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

interface ErrorStateNewProps {
  title?: string
  description?: string
  errorCode?: string | number
  retry?: () => void
  compact?: boolean
}

/**
 * ErrorState — shown when a data fetch fails.
 */
export function ErrorStateNew({
  title = 'เกิดข้อผิดพลาด',
  description = 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
  errorCode,
  retry,
  compact = false,
}: ErrorStateNewProps) {
  return (
    <StateBase
      icon={<ErrorOutlineRoundedIcon sx={{ fontSize: compact ? 22 : 26, color: '#EF4444' }} />}
      iconColor="#EF4444"
      title={title}
      description={description}
      action={
        <>
          {errorCode && (
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontFamily: '"IBM Plex Mono",monospace', mb: 0.5 }}>
              Error {errorCode}
            </Typography>
          )}
          {retry && (
            <Button
              size="small"
              startIcon={<RefreshRoundedIcon />}
              onClick={retry}
              sx={{
                fontSize: 12, fontWeight: 600, borderRadius: '9px',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#EF4444',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' },
              }}
            >
              ลองใหม่
            </Button>
          )}
        </>
      }
      compact={compact}
    />
  )
}

// ─── NotConfiguredState ───────────────────────────────────────────────────────

interface NotConfiguredStateProps {
  title?: string
  description?: string
  action?: React.ReactNode
  docsLink?: string
  compact?: boolean
}

/**
 * NotConfiguredState — shown when a feature is not yet set up.
 */
export function NotConfiguredState({
  title = 'ยังไม่ได้ตั้งค่า',
  description = 'ฟีเจอร์นี้ยังไม่ได้รับการตั้งค่า กรุณาติดต่อผู้ดูแลระบบหรือดูเอกสารประกอบการใช้งาน',
  action,
  docsLink,
  compact = false,
}: NotConfiguredStateProps) {
  return (
    <StateBase
      icon={<BuildRoundedIcon sx={{ fontSize: compact ? 22 : 26, color: '#F59E0B' }} />}
      iconColor="#F59E0B"
      title={title}
      description={description}
      action={
        action ?? (docsLink ? (
          <Button
            size="small"
            endIcon={<OpenInNewRoundedIcon />}
            href={docsLink}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontSize: 12, fontWeight: 600, borderRadius: '9px' }}
          >
            ดูเอกสาร
          </Button>
        ) : undefined)
      }
      compact={compact}
    />
  )
}

// ─── PermissionState ─────────────────────────────────────────────────────────

interface PermissionStateProps {
  title?: string
  description?: string
  compact?: boolean
}

/**
 * PermissionState — shown when a user lacks access to a resource.
 */
export function PermissionState({
  title = 'ไม่มีสิทธิ์เข้าถึง',
  description = 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้ หากคิดว่าเกิดข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ',
  compact = false,
}: PermissionStateProps) {
  return (
    <StateBase
      icon={<LockRoundedIcon sx={{ fontSize: compact ? 22 : 26, color: '#64748B' }} />}
      iconColor="#64748B"
      title={title}
      description={description}
      compact={compact}
    />
  )
}

// ─── OfflineState ─────────────────────────────────────────────────────────────

interface OfflineStateProps {
  retry?: () => void
  compact?: boolean
}

/**
 * OfflineState — shown when the API is unreachable.
 */
export function OfflineState({ retry, compact = false }: OfflineStateProps) {
  return (
    <StateBase
      icon={<WifiOffRoundedIcon sx={{ fontSize: compact ? 22 : 26, color: '#EAB308' }} />}
      iconColor="#EAB308"
      title="ขาดการเชื่อมต่อ"
      description="ไม่สามารถเชื่อมต่อกับ API ได้ กรุณาตรวจสอบการเชื่อมต่อเครือข่ายและลองใหม่"
      action={
        retry ? (
          <Button
            size="small"
            startIcon={<RefreshRoundedIcon />}
            onClick={retry}
            sx={{ fontSize: 12, fontWeight: 600, borderRadius: '9px' }}
          >
            ลองเชื่อมต่อใหม่
          </Button>
        ) : undefined
      }
      compact={compact}
    />
  )
}
