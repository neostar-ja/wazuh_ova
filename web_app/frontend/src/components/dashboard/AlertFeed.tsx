import React from 'react'
import { Box, Typography, useTheme, Skeleton, IconButton, Tooltip } from '@mui/material'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { format } from 'date-fns'
import { RecentAlert } from '../../types/dashboard'
import { sevColor, sevLabel, sevLabelShort, fmtN } from '../ui/tokens'

interface AlertFeedProps {
  alerts?: RecentAlert[]
  isLoading?: boolean
  maxItems?: number
}

export function AlertFeed({ alerts = [], isLoading = false, maxItems = 12 }: AlertFeedProps) {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  const filtered = alerts
    .filter((a) => {
      const level = Number(a['rule.level'] || a?.rule?.level || 0)
      return level >= 12
    })
    .slice(0, maxItems)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="circular" width={8} height={8} />
            <Box sx={{ flex: 1 }}>
              <Skeleton height={16} sx={{ mb: 0.5 }} />
              <Skeleton height={14} width="60%" />
            </Box>
          </Box>
        ))}
      </Box>
    )
  }

  if (!filtered.length) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: '12px',
            bgcolor: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"
              fill="#22C55E"
            />
          </svg>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>
            ระบบปลอดภัย
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
            ไม่มีการแจ้งเตือนระดับสูงในช่วงนี้
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        maxHeight: 480,
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: isDark ? 'rgba(123,91,164,0.3)' : 'rgba(123,91,164,0.2)',
          borderRadius: '3px',
          '&:hover': {
            bgcolor: isDark ? 'rgba(123,91,164,0.5)' : 'rgba(123,91,164,0.4)',
          },
        },
      }}
    >
      {filtered.map((alert, idx) => {
        const level = Number(alert['rule.level'] || alert?.rule?.level || 0)
        const color = sevColor(level)
        const label = sevLabelShort(level)
        const timestamp = alert['@timestamp'] || alert.timestamp
        const desc = alert['rule.description'] || alert?.rule?.description || 'Unknown'
        const srcip = alert['data.srcip'] || alert?.data?.srcip
        const agentName = alert['agent.name'] || alert?.agent?.name
        const mitre = alert['rule.mitre'] || alert?.rule?.mitre || []

        return (
          <Box
            key={`${idx}-${timestamp}`}
            onClick={() => navigate('/alerts')}
            sx={{
              display: 'flex',
              gap: 2,
              p: 1.5,
              borderRadius: '10px',
              border: `1px solid ${isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)'}`,
              bgcolor: isDark
                ? `linear-gradient(90deg, ${color}08 0%, transparent 80%)`
                : `linear-gradient(90deg, ${color}04 0%, transparent 80%)`,
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: isDark
                  ? `linear-gradient(90deg, ${color}12 0%, transparent 80%)`
                  : `linear-gradient(90deg, ${color}08 0%, transparent 80%)`,
                border: `1px solid ${color}30`,
              },
            }}
          >
            {/* Severity dot */}
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: color,
                boxShadow: `0 0 8px ${color}80`,
                flexShrink: 0,
                mt: 0.75,
              }}
            />

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Header row: timestamp + severity + actions */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 0.75,
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 10,
                      fontFamily: '"IBM Plex Mono",monospace',
                      color: 'text.disabled',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {timestamp ? format(new Date(timestamp), 'HH:mm:ss') : '—'}
                  </Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '5px',
                      bgcolor: `${color}18`,
                      border: `1px solid ${color}35`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: color,
                        fontFamily: '"IBM Plex Mono",monospace',
                        textTransform: 'uppercase',
                      }}
                    >
                      {level} {label}
                    </Typography>
                  </Box>
                </Box>

                {/* Actions */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip title="ดูใน Alerts">
                    <IconButton
                      size="small"
                      onClick={() => navigate('/alerts')}
                      sx={{
                        width: 24,
                        height: 24,
                        opacity: 0.5,
                        '&:hover': { opacity: 1 },
                      }}
                    >
                      <OpenInNewRoundedIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Description */}
              <Typography
                sx={{
                  fontSize: 12,
                  color: 'text.primary',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mb: 0.75,
                }}
              >
                {desc}
              </Typography>

              {/* Details row: source IP, agent, MITRE */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  flexWrap: 'wrap',
                  fontSize: 10,
                  color: 'text.disabled',
                }}
              >
                {srcip && (
                  <Box
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/investigate?q=${encodeURIComponent(srcip)}`)
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      cursor: 'pointer',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '5px',
                      bgcolor: isDark ? 'rgba(123,91,164,0.1)' : 'rgba(123,91,164,0.05)',
                      '&:hover': {
                        bgcolor: isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.1)',
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 10,
                        fontFamily: '"IBM Plex Mono",monospace',
                        color: '#7B5BA4',
                      }}
                    >
                      {srcip}
                    </Typography>
                    <Tooltip title="คัดลอก IP">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(srcip)
                          enqueueSnackbar('คัดลอกแล้ว', { variant: 'success', autoHideDuration: 1500 })
                        }}
                        sx={{ width: 16, height: 16, opacity: 0.3, '&:hover': { opacity: 1 } }}
                      >
                        <ContentCopyRoundedIcon sx={{ fontSize: 10 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}

                {agentName && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '5px',
                      bgcolor: isDark ? 'rgba(123,91,164,0.1)' : 'rgba(123,91,164,0.05)',
                    }}
                  >
                    <Typography sx={{ fontSize: 10 }}>Agent:</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600 }}>{agentName}</Typography>
                  </Box>
                )}

                {mitre && mitre.length > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '5px',
                      bgcolor: '#A855F710',
                      color: '#A855F7',
                    }}
                  >
                    <Typography sx={{ fontSize: 9, fontWeight: 600 }}>MITRE:</Typography>
                    <Typography sx={{ fontSize: 9 }}>{mitre[0]}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
