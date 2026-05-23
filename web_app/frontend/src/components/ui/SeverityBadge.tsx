import { Chip, Box, Tooltip } from '@mui/material'
import { sevColor, sevLabel, sevLabelShort, sevFromName, SeverityLevel } from './tokens'

interface SeverityBadgeProps {
  /** Pass a number (rule level) or severity name string */
  level?: number
  severity?: SeverityLevel | string
  /** 'chip' renders an MUI chip; 'dot' renders a colored dot + label */
  variant?: 'chip' | 'dot' | 'pill'
  size?: 'small' | 'medium'
  animate?: boolean
  showLabel?: boolean
}

export function SeverityBadge({
  level,
  severity,
  variant = 'chip',
  size = 'small',
  animate = false,
  showLabel = true,
}: SeverityBadgeProps) {
  const lv  = level ?? 0
  const col = severity ? sevFromName(severity) : sevColor(lv)
  const lbl = severity ? (severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase()) : sevLabel(lv)
  const short = severity ? lbl.slice(0, 4).toUpperCase() : sevLabelShort(lv)

  if (variant === 'dot') {
    return (
      <Tooltip title={lbl} arrow>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{
            width: 8, height: 8, borderRadius: '50%', bgcolor: col, flexShrink: 0,
            boxShadow: `0 0 6px ${col}90`,
            animation: animate ? 'criticalPulse 2s ease-in-out infinite' : 'none',
          }} />
          {showLabel && (
            <Box component="span" sx={{ fontSize: 11, fontWeight: 700, color: col }}>
              {lbl}
            </Box>
          )}
        </Box>
      </Tooltip>
    )
  }

  if (variant === 'pill') {
    return (
      <Box component="span" sx={{
        display: 'inline-flex', alignItems: 'center',
        px: size === 'small' ? 1 : 1.5,
        py: size === 'small' ? 0.25 : 0.5,
        borderRadius: '6px',
        fontSize: size === 'small' ? 10 : 12,
        fontWeight: 800,
        bgcolor: `${col}18`,
        color: col,
        border: `1px solid ${col}35`,
        fontFamily: '"IBM Plex Mono", monospace',
        letterSpacing: '0.05em',
        animation: animate && lv >= 15 ? 'pulse-critical 2.5s ease-in-out infinite' : 'none',
      }}>
        {lv > 0 ? `${lv} ${short}` : lbl}
      </Box>
    )
  }

  return (
    <Chip
      label={lv > 0 ? `${lv} ${short}` : lbl}
      size={size}
      sx={{
        height: size === 'small' ? 20 : 24,
        fontSize: size === 'small' ? 10 : 11,
        fontWeight: 800,
        fontFamily: '"IBM Plex Mono", monospace',
        bgcolor: `${col}20`,
        color: col,
        border: `1px solid ${col}35`,
        '& .MuiChip-label': { px: size === 'small' ? 0.75 : 1 },
        animation: animate && lv >= 15 ? 'pulse-critical 2.5s ease-in-out infinite' : 'none',
      }}
    />
  )
}

export default SeverityBadge
