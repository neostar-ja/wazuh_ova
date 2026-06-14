import { Box, Typography } from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

interface StatusPillProps {
  status?: 'active' | 'inactive' | 'warning' | 'error' | 'unknown'
  label?: string
  animated?: boolean
  size?: 'small' | 'medium'
}

const STATUS_CONFIG = {
  active:   { color: '#22C55E', defaultLabel: 'Active' },
  inactive: { color: '#8B95B3', defaultLabel: 'Inactive' },
  warning:  { color: '#F59E0B', defaultLabel: 'Warning' },
  error:    { color: '#EF4444', defaultLabel: 'Error' },
  unknown:  { color: '#8B95B3', defaultLabel: 'Unknown' },
}

export function StatusPill({
  status = 'unknown',
  label,
  animated = false,
  size = 'small',
}: StatusPillProps) {
  const cfg = STATUS_CONFIG[status]
  const fontSize = size === 'small' ? 10 : 12
  const dotSize = size === 'small' ? 7 : 9

  return (
    <Box sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.7,
      px: size === 'small' ? 1 : 1.5,
      py: size === 'small' ? 0.3 : 0.5,
      borderRadius: '20px',
      bgcolor: `${cfg.color}12`,
      border: `1px solid ${cfg.color}30`,
    }}>
      <FiberManualRecordIcon sx={{
        fontSize: dotSize,
        color: cfg.color,
        boxShadow: `0 0 5px ${cfg.color}`,
        borderRadius: '50%',
        animation: animated && status === 'active'
          ? 'pulseGlow 2.5s ease-in-out infinite'
          : 'none',
      }} />
      <Typography sx={{ fontSize, fontWeight: 700, color: cfg.color }}>
        {label ?? cfg.defaultLabel}
      </Typography>
    </Box>
  )
}

export default StatusPill
