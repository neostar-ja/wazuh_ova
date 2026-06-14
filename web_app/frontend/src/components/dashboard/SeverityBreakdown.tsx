import React from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { fmtN, SEV_COLOR } from '../ui/tokens'

interface SeverityBreakdownProps {
  critical: number
  high: number
  medium: number
  low: number
  isLoading?: boolean
}

export function SeverityBreakdown({
  critical,
  high,
  medium,
  low,
  isLoading = false,
}: SeverityBreakdownProps) {
  const navigate = useNavigate()
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  const total = critical + high + medium + low

  if (total === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 500 }}>
          ไม่มีการแจ้งเตือนในช่วงเวลานี้
        </Typography>
      </Box>
    )
  }

  const severities = [
    { level: 15, label: 'Critical', labelTh: 'วิกฤต', count: critical, color: SEV_COLOR.critical },
    { level: 12, label: 'High', labelTh: 'สูง', count: high, color: SEV_COLOR.high },
    { level: 7, label: 'Medium', labelTh: 'กลาง', count: medium, color: SEV_COLOR.medium },
    { level: 1, label: 'Low', labelTh: 'ต่ำ', count: low, color: SEV_COLOR.low },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Stacked bar */}
      <Box
        sx={{
          display: 'flex',
          height: 32,
          borderRadius: '8px',
          overflow: 'hidden',
          gap: 2,
          cursor: 'pointer',
          opacity: total > 0 ? 1 : 0.5,
        }}
      >
        {severities.map((sev) => {
          const pct = (sev.count / total) * 100
          if (pct === 0) return null
          return (
            <Box
              key={sev.level}
              onClick={() => navigate(`/alerts?level=${sev.level}`)}
              sx={{
                flex: pct,
                bgcolor: sev.color,
                borderRadius: sev === severities[0] ? '8px 0 0 8px' : sev === severities[severities.length - 1] ? '0 8px 8px 0' : 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                '&:hover': {
                  opacity: 0.8,
                  filter: 'brightness(1.1)',
                },
              }}
              title={`${sev.labelTh}: ${fmtN(sev.count)} (${pct.toFixed(1)}%)`}
            >
              {pct > 10 && (
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                >
                  {fmtN(sev.count)}
                </Typography>
              )}
            </Box>
          )
        })}
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {severities.map((sev) => (
          <Box
            key={sev.level}
            onClick={() => navigate(`/alerts?level=${sev.level}`)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              px: 1.5,
              py: 0.75,
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: isDark ? 'rgba(79,110,247,0.08)' : 'rgba(79,110,247,0.05)' },
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '3px',
                bgcolor: sev.color,
                boxShadow: `0 0 6px ${sev.color}60`,
                flexShrink: 0,
              }}
            />
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: sev.color }}>
                {sev.labelTh}
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                {fmtN(sev.count)} ({((sev.count / total) * 100).toFixed(1)}%)
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
