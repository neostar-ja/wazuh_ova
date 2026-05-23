import { ReactNode } from 'react'
import { Box, Typography, Button } from '@mui/material'
import InboxRoundedIcon from '@mui/icons-material/InboxRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  action?: ReactNode
  compact?: boolean
  type?: 'empty' | 'error' | 'offline'
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  type = 'empty',
}: EmptyStateProps) {
  const defaults = {
    empty: {
      Icon: InboxRoundedIcon,
      color: '#5A5278',
      defaultTitle: 'ไม่พบข้อมูล',
      defaultDesc: 'ลองเปลี่ยนช่วงเวลา หรือกด Refresh เพื่อตรวจสอบข้อมูลล่าสุด',
    },
    error: {
      Icon: ErrorOutlineRoundedIcon,
      color: '#EF4444',
      defaultTitle: 'เกิดข้อผิดพลาด',
      defaultDesc: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
    },
    offline: {
      Icon: WifiOffRoundedIcon,
      color: '#EAB308',
      defaultTitle: 'ขาดการเชื่อมต่อ',
      defaultDesc: 'ไม่สามารถเชื่อมต่อกับ API กรุณาตรวจสอบการเชื่อมต่อเครือข่าย',
    },
  }

  const cfg = defaults[type]
  const DefaultIcon = cfg.Icon

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: compact ? 3 : 6,
      gap: compact ? 1 : 1.5,
      textAlign: 'center',
    }}>
      {icon ?? (
        <DefaultIcon sx={{
          fontSize: compact ? 32 : 44,
          color: cfg.color,
          opacity: 0.45,
        }} />
      )}
      <Typography sx={{
        fontSize: compact ? 12 : 13,
        fontWeight: 600,
        color: 'text.secondary',
      }}>
        {title || cfg.defaultTitle}
      </Typography>
      {(description || cfg.defaultDesc) && (
        <Typography sx={{
          fontSize: compact ? 11 : 12,
          color: 'text.disabled',
          maxWidth: 320,
          lineHeight: 1.6,
        }}>
          {description || cfg.defaultDesc}
        </Typography>
      )}
      {action && <Box sx={{ mt: 0.5 }}>{action}</Box>}
    </Box>
  )
}

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  compact?: boolean
}

export function ErrorState({ message, onRetry, compact = false }: ErrorStateProps) {
  return (
    <EmptyState
      type="error"
      description={message}
      compact={compact}
      action={
        onRetry && (
          <Button
            size="small"
            startIcon={<RefreshRoundedIcon />}
            onClick={onRetry}
            sx={{ fontSize: 12, color: 'text.secondary', borderRadius: '8px' }}
          >
            ลองใหม่
          </Button>
        )
      }
    />
  )
}

export default EmptyState
