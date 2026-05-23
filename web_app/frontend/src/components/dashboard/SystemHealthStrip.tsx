import React from 'react'
import { Box, Typography, useTheme, Tooltip, Chip } from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { format } from 'date-fns'

interface SystemHealthStripProps {
  clusterStatus?: 'active' | 'warning' | 'error'
  activeAgents?: number
  totalAgents?: number
  eps?: number
  isAutoRefresh?: boolean
  lastUpdated?: Date
}

export function SystemHealthStrip({
  clusterStatus = 'active',
  activeAgents = 0,
  totalAgents = 0,
  eps = 0,
  isAutoRefresh = true,
  lastUpdated = new Date(),
}: SystemHealthStripProps) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  const statusConfig = {
    active: { color: '#22C55E', label: 'Active', pulse: true },
    warning: { color: '#F17422', label: 'Warning', pulse: false },
    error: { color: '#EF4444', label: 'Error', pulse: false },
  }

  const status = statusConfig[clusterStatus]
  const agentHealthPercent = totalAgents > 0 ? (activeAgents / totalAgents) * 100 : 0

  const items = [
    {
      id: 'cluster',
      label: 'Wazuh Cluster',
      value: status.label,
      icon: StorageRoundedIcon,
      color: status.color,
      pulse: status.pulse,
    },
    {
      id: 'agents',
      label: 'Active Agents',
      value: `${activeAgents}/${totalAgents}`,
      icon: DevicesRoundedIcon,
      color: agentHealthPercent >= 80 ? '#22C55E' : agentHealthPercent >= 50 ? '#F17422' : '#EF4444',
    },
    {
      id: 'eps',
      label: 'EPS',
      value: `${eps}/s`,
      icon: BoltRoundedIcon,
      color: '#7B5BA4',
    },
    {
      id: 'refresh',
      label: 'Auto Refresh',
      value: isAutoRefresh ? 'Live' : 'Paused',
      icon: RefreshRoundedIcon,
      color: isAutoRefresh ? '#22C55E' : '#9A90BF',
    },
  ]

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        px: 2,
        py: 1.25,
        borderRadius: '10px',
        border: `1px solid ${isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)'}`,
        bgcolor: isDark ? 'rgba(123,91,164,0.04)' : 'rgba(123,91,164,0.02)',
        background: isDark
          ? 'linear-gradient(90deg, rgba(123,91,164,0.06) 0%, transparent 80%)'
          : 'linear-gradient(90deg, rgba(123,91,164,0.04) 0%, transparent 80%)',
      }}
    >
      {/* Status chips */}
      {items.map((item) => {
        const IconComponent = item.icon
        return (
          <Tooltip key={item.id} title={item.label}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.5,
                borderRadius: '8px',
                bgcolor: `${item.color}12`,
                border: `1px solid ${item.color}25`,
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <IconComponent sx={{ fontSize: 14, color: item.color }} />
                {item.pulse && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: item.color,
                      boxShadow: `0 0 8px ${item.color}`,
                      animation: 'pulse-anim 2s ease-in-out infinite',
                    }}
                  />
                )}
              </Box>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: item.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {item.value}
              </Typography>
            </Box>
          </Tooltip>
        )
      })}

      {/* Last updated */}
      <Box sx={{ flex: 1, minWidth: 'auto' }} />
      <Tooltip
        title={`อัปเดตล่าสุด: ${format(lastUpdated, 'HH:mm:ss')}`}
      >
        <Typography
          sx={{
            fontSize: 10,
            color: 'text.disabled',
            textAlign: 'right',
          }}
        >
          {format(lastUpdated, 'HH:mm:ss')}
        </Typography>
      </Tooltip>

      {/* Animation keyframes */}
      <style>{`
        @keyframes pulse-anim {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Box>
  )
}
