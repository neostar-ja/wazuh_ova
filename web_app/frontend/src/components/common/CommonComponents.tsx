import React, { ReactNode, ComponentType, ElementType } from 'react'
import { Box, Card, Typography, Chip, Button, CircularProgress, Paper, Drawer, Skeleton } from '@mui/material'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import InboxRoundedIcon from '@mui/icons-material/InboxRounded'
import { BRAND, sevColor, sevLabelShort } from '../ui/tokens'

// ─── SeverityBadge ─────────────────────────────────────────────────────────────
interface SeverityBadgeProps {
  level: 'critical' | 'high' | 'medium' | 'low' | 'info' | string
  size?: 'small' | 'medium'
  showIcon?: boolean
}

export function SeverityBadge({ level, size = 'small', showIcon = false }: SeverityBadgeProps) {
  const icons: Record<string, React.ReactElement> = {
    critical: <ErrorOutlineRoundedIcon />,
    high:     <WarningAmberRoundedIcon />,
    medium:   <InfoOutlinedIcon />,
    low:      <CheckCircleOutlineRoundedIcon />,
    info:     <InfoOutlinedIcon />,
  }

  const key = level.toLowerCase()
  const col = sevColor(
    key === 'critical' ? 15 : key === 'high' ? 12 : key === 'medium' ? 7 : key === 'low' ? 1 : 0
  )
  const lbl = key.charAt(0).toUpperCase() + key.slice(1)

  return (
    <Chip
      icon={showIcon ? icons[key] : undefined}
      label={lbl}
      size={size}
      sx={{
        height: size === 'small' ? 22 : 26,
        fontSize: size === 'small' ? 11 : 12,
        fontWeight: 700,
        bgcolor: `${col}18`,
        color: col,
        border: `1px solid ${col}30`,
        '& .MuiChip-icon': { color: `${col} !important`, fontSize: 14 },
        '& .MuiChip-label': { px: 1 },
      }}
    />
  )
}

// ─── StatusCard ─────────────────────────────────────────────────────────────────
interface StatusCardProps {
  title: string
  value: string | number
  status?: 'critical' | 'high' | 'medium' | 'low' | 'success' | 'warning' | 'error' | 'neutral' | 'info'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: ElementType<any>
  onClick?: () => void
  loading?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  critical: '#EF4444', high: '#F17422', medium: '#EAB308',
  low: '#22C55E', success: '#22C55E', warning: '#EAB308',
  error: '#EF4444', neutral: BRAND.purple, info: '#38BDF8',
}

export function StatusCard({ title, value, status = 'neutral', icon: Icon, onClick, loading }: StatusCardProps) {
  const col = STATUS_COLORS[status] || STATUS_COLORS.neutral

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `3px solid ${col}`,
        borderRadius: '12px',
        transition: 'all 200ms ease',
        '&:hover': onClick ? {
          boxShadow: `0 8px 24px ${col}20`,
          transform: 'translateY(-2px)',
        } : {},
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {Icon && (
          <Box sx={{ color: col, display: 'flex' }}>
            <Icon fontSize="large" sx={{ fontSize: 32 }} />
          </Box>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={80} height={32} />
          ) : (
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: col, lineHeight: 1.2, fontFamily: '"IBM Plex Mono", monospace' }}>
              {value}
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  )
}

// ─── StatusDot ─────────────────────────────────────────────────────────────────
interface StatusDotProps {
  color?: string
  label?: string
  pulse?: boolean
}

export function StatusDot({ color = '#22C55E', label, pulse = false }: StatusDotProps) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <FiberManualRecordIcon
        sx={{
          fontSize: 9,
          color,
          animation: pulse ? 'pulseGlow 2.5s ease-in-out infinite' : 'none',
        }}
      />
      {label && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 500 }}>
          {label}
        </Typography>
      )}
    </Box>
  )
}

// ─── AlertMessage ──────────────────────────────────────────────────────────────
interface AlertMessageProps {
  type?: 'success' | 'warning' | 'error' | 'info'
  title?: string
  message?: string
  action?: ReactNode
  onClose?: () => void
}

const ALERT_CONFIG = {
  success: { color: '#22C55E', bgcolor: 'rgba(34,197,94,0.08)',  Icon: CheckCircleOutlineRoundedIcon },
  warning: { color: '#EAB308', bgcolor: 'rgba(234,179,8,0.08)',  Icon: WarningAmberRoundedIcon },
  error:   { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.08)',  Icon: ErrorOutlineRoundedIcon },
  info:    { color: BRAND.purple, bgcolor: 'rgba(123,91,164,0.08)', Icon: InfoOutlinedIcon },
}

export function AlertMessage({ type = 'info', title, message, action, onClose }: AlertMessageProps) {
  const c = ALERT_CONFIG[type]

  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: c.bgcolor,
        borderLeft: `3px solid ${c.color}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        borderRadius: '10px',
        border: `1px solid ${c.color}25`,
      }}
    >
      <c.Icon sx={{ color: c.color, flexShrink: 0, fontSize: 20, mt: 0.2 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title && (
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: c.color, mb: message ? 0.5 : 0 }}>
            {title}
          </Typography>
        )}
        {message && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
            {message}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      {onClose && (
        <Button size="small" onClick={onClose} sx={{ flexShrink: 0, fontSize: 11, color: 'text.disabled', minWidth: 0 }}>
          ปิด
        </Button>
      )}
    </Paper>
  )
}

// ─── LoadingSpinner ─────────────────────────────────────────────────────────────
interface LoadingSpinnerProps {
  size?: number
  message?: string
}

export function LoadingSpinner({ size = 36, message }: LoadingSpinnerProps) {
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      py: 6, gap: 2,
    }}>
      <CircularProgress size={size} sx={{ color: BRAND.purple }} />
      {message && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{message}</Typography>
      )}
    </Box>
  )
}

// ─── EmptyState ─────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: ElementType<any>
  title: string
  message?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      py: 6, gap: 1.5, textAlign: 'center',
    }}>
      {Icon
        ? <Icon sx={{ fontSize: 52, color: 'text.disabled', opacity: 0.4 }} />
        : <InboxRoundedIcon sx={{ fontSize: 52, color: 'text.disabled', opacity: 0.4 }} />
      }
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}>{title}</Typography>
      {message && (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', maxWidth: 300, lineHeight: 1.6 }}>
          {message}
        </Typography>
      )}
      {action && <Box sx={{ mt: 0.5 }}>{action}</Box>}
    </Box>
  )
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────────
interface DetailPanelProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  width?: number
}

export function DetailPanel({ open, title, subtitle, onClose, children, width = 520 }: DetailPanelProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: width },
            maxWidth: '100vw',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box sx={{
        px: 2.5, py: 2,
        borderBottom: '1px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1,
      }}>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{title}</Typography>
          {subtitle && <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.25 }}>{subtitle}</Typography>}
        </Box>
        <Button size="small" onClick={onClose} sx={{ minWidth: 0, p: 0.5, color: 'text.disabled' }}>✕</Button>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
        {children}
      </Box>
    </Drawer>
  )
}

// ─── DataGridFooter ─────────────────────────────────────────────────────────────
interface DataGridFooterProps {
  rowCount: number
  pageSize: number
  page: number
  onPageChange: (newPage: number) => void
}

export function DataGridFooter({ rowCount, pageSize, page, onPageChange }: DataGridFooterProps) {
  const totalPages = Math.ceil(rowCount / pageSize)
  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, rowCount)

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider',
    }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
        {rowCount === 0
          ? 'ไม่มีข้อมูล'
          : `แสดง ${start.toLocaleString()}–${end.toLocaleString()} จาก ${rowCount.toLocaleString()} รายการ`}
      </Typography>
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button size="small" disabled={page === 0} onClick={() => onPageChange(page - 1)}
            sx={{ fontSize: 11, borderRadius: '8px' }}>
            ← ก่อนหน้า
          </Button>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {page + 1} / {totalPages}
          </Typography>
          <Button size="small" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}
            sx={{ fontSize: 11, borderRadius: '8px' }}>
            ถัดไป →
          </Button>
        </Box>
      )}
    </Box>
  )
}

// ─── ErrorBoundary ─────────────────────────────────────────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode
}
interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('SOC Center ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <AlertMessage
          type="error"
          title="เกิดข้อผิดพลาดในการแสดงผล"
          message="ลองรีเฟรชหน้าหรือตรวจสอบ API"
          action={
            <Button size="small" startIcon={<RefreshRoundedIcon />}
              onClick={() => this.setState({ hasError: false })}
              sx={{ fontSize: 11 }}>
              ลองใหม่
            </Button>
          }
        />
      )
    }
    return this.props.children
  }
}

const CommonComponents = {
  SeverityBadge,
  StatusCard,
  StatusDot,
  AlertMessage,
  LoadingSpinner,
  EmptyState,
  DetailPanel,
  DataGridFooter,
  ErrorBoundary,
}

export default CommonComponents
