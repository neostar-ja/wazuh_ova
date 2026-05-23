import React, { ReactNode, ComponentType } from 'react'
import { Box, Card, Typography, Chip, Button, CircularProgress, Paper, Drawer } from '@mui/material'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

interface SeverityBadgeProps {
  level: 'critical' | 'high' | 'medium' | 'low' | 'info' | string
  size?: 'small' | 'medium'
}

export function SeverityBadge({ level, size = 'small' }: SeverityBadgeProps) {
  const config: Record<string, { label: string; color: 'error' | 'warning' | 'success' | 'info'; icon: React.ReactElement }> = {
    critical: { label: 'Critical', color: 'error', icon: <ErrorIcon /> },
    high: { label: 'High', color: 'warning', icon: <WarningIcon /> },
    medium: { label: 'Medium', color: 'warning', icon: <InfoIcon /> },
    low: { label: 'Low', color: 'success', icon: <CheckCircleIcon /> },
    info: { label: 'Info', color: 'info', icon: <InfoIcon /> },
  }

  const c = config[level] || config.info

  return (
    <Chip
      icon={c.icon}
      label={c.label}
      color={c.color}
      size={size}
      variant="filled"
      sx={{ fontWeight: 600 }}
    />
  )
}

interface StatusCardProps {
  title: string
  value: string | number
  status?: 'critical' | 'high' | 'medium' | 'low' | 'success' | 'warning' | 'error' | 'neutral' | 'info'
  icon?: ComponentType<any>
  onClick?: () => void
}

export function StatusCard({ title, value, status = 'neutral', icon: Icon, onClick }: StatusCardProps) {
  const statusColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#eab308',
    low: '#10b981',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    neutral: '#6b7280',
    info: '#3b82f6',
  }

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `4px solid ${statusColors[status] || statusColors.neutral}`,
        transition: 'all 200ms ease',
        '&:hover': onClick ? { boxShadow: 3, transform: 'translateY(-2px)' } : {},
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {Icon && (
          <Box sx={{ color: statusColors[status], display: 'flex', fontSize: '32px' }}>
            <Icon fontSize="large" />
          </Box>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block' }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
        </Box>
      </Box>
    </Card>
  )
}

interface StatusDotProps {
  color?: string
  label?: string
  pulse?: boolean
}

export function StatusDot({ color = 'success.main', label, pulse = false }: StatusDotProps) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <FiberManualRecordIcon
        sx={{
          fontSize: 10,
          color,
          animation: pulse ? 'pulse-slow 2s ease-in-out infinite' : 'none',
        }}
      />
      {label ? <Typography variant="caption" color="text.secondary">{label}</Typography> : null}
    </Box>
  )
}

interface AlertMessageProps {
  type?: 'success' | 'warning' | 'error' | 'info'
  title?: string
  message?: string
  action?: ReactNode
  onClose?: () => void
}

export function AlertMessage({ type = 'info', title, message, action, onClose }: AlertMessageProps) {
  const config = {
    success: { color: '#10b981', bgcolor: 'rgba(16, 185, 129, 0.1)', Icon: CheckCircleIcon },
    warning: { color: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)', Icon: WarningIcon },
    error: { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)', Icon: ErrorIcon },
    info: { color: '#7B5BA4', bgcolor: 'rgba(59, 130, 246, 0.1)', Icon: InfoIcon },
  }

  const c = config[type] || config.info

  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: c.bgcolor,
        borderLeft: `4px solid ${c.color}`,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 1,
      }}
    >
      <c.Icon sx={{ color: c.color, flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        {title && <Typography variant="subtitle2">{title}</Typography>}
        {message && (
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {message}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
      {onClose && (
        <Button size="small" onClick={onClose}>
          ปิด
        </Button>
      )}
    </Paper>
  )
}

interface LoadingSpinnerProps {
  size?: number
  message?: string
}

export function LoadingSpinner({ size = 40, message }: LoadingSpinnerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        gap: 2,
      }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="textSecondary">
          {message}
        </Typography>
      )}
    </Box>
  )
}

interface EmptyStateProps {
  icon?: ComponentType<any>
  title: string
  message?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        gap: 2,
      }}
    >
      {Icon && <Icon sx={{ fontSize: 64, opacity: 0.3 }} />}
      <Typography variant="h6">{title}</Typography>
      {message && (
        <Typography variant="body2" color="textSecondary">
          {message}
        </Typography>
      )}
      {action && <Box>{action}</Box>}
    </Box>
  )
}

interface DetailPanelProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  width?: number
}

export function DetailPanel({ open, title, subtitle, onClose, children, width = 480 }: DetailPanelProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: width },
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
        {subtitle ? <Typography variant="caption" color="text.secondary">{subtitle}</Typography> : null}
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {children}
      </Box>
    </Drawer>
  )
}

interface DataGridFooterProps {
  rowCount: number
  pageSize: number
  page: number
  onPageChange: (newPage: number) => void
}

export function DataGridFooter({ rowCount, pageSize, page, onPageChange }: DataGridFooterProps) {
  const totalPages = Math.ceil(rowCount / pageSize)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" color="textSecondary">
        {rowCount === 0 ? 'ไม่มีข้อมูล' : `แสดง ${page * pageSize + 1} ถึง ${Math.min((page + 1) * pageSize, rowCount)} จาก ${rowCount} รายการ`}
      </Typography>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            ก่อนหน้า
          </Button>
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
            หน้า {page + 1} จาก {totalPages}
          </Typography>
          <Button
            size="small"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            ถัดไป
          </Button>
        </Box>
      )}
    </Box>
  )
}

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

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SOC Center ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <AlertMessage
          type="error"
          title="เกิดข้อผิดพลาดในการแสดงผล"
          message="ลองรีเฟรชหน้าอีกครั้งหรือตรวจสอบข้อมูลจาก API"
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
