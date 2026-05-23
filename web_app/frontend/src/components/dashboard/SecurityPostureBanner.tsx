import React from 'react'
import { Box, Typography, Button, useTheme, Tooltip } from '@mui/material'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import { SecurityPosture } from '../../types/dashboard'
import { useNavigate } from 'react-router-dom'

interface SecurityPostureBannerProps {
  posture: SecurityPosture | null
  isLoading: boolean
}

export function SecurityPostureBanner({ posture, isLoading }: SecurityPostureBannerProps) {
  const navigate = useNavigate()
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  if (isLoading || !posture) {
    return null
  }

  const riskConfig = {
    critical: {
      icon: ErrorRoundedIcon,
      color: '#EF4444',
      bgColor: '#EF444420',
      borderColor: '#EF444430',
      titleTh: 'สถานการณ์วิกฤต',
      descTh: 'พบการโจมตีระดับวิกฤตหลายรายการ ต้องดำเนินการอย่างเร่งด่วน',
    },
    elevated: {
      icon: WarningRoundedIcon,
      color: '#F17422',
      bgColor: '#F1742220',
      borderColor: '#F1742230',
      titleTh: 'สถานการณ์สูง',
      descTh: 'พบการโจมตีหลายรายการที่ต้องตรวจสอบเพิ่มเติม',
    },
    normal: {
      icon: CheckCircleRoundedIcon,
      color: '#22C55E',
      bgColor: '#22C55E20',
      borderColor: '#22C55E30',
      titleTh: 'ระบบปกติ',
      descTh: 'ระบบทำงานตามปกติ ไม่พบภัยคุกคามที่สำคัญ',
    },
  }

  const config = riskConfig[posture.riskLevel]
  const IconComponent = config.icon

  return (
    <Box
      sx={{
        borderRadius: '14px',
        p: '18px 20px',
        border: `1px solid ${config.borderColor}`,
        background: isDark
          ? `linear-gradient(135deg, ${config.bgColor} 0%, rgba(16,12,32,0.4) 100%)`
          : `linear-gradient(135deg, ${config.bgColor} 0%, rgba(255,255,255,0.5) 100%)`,
        backdropFilter: isDark ? 'blur(10px)' : 'none',
        boxShadow: isDark
          ? `0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 ${config.borderColor}`
          : `0 2px 8px rgba(0,0,0,0.06)`,
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '12px',
          bgcolor: `${config.color}15`,
          border: `1.5px solid ${config.color}35`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IconComponent sx={{ fontSize: 28, color: config.color }} />
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: config.color,
            }}
          >
            {config.titleTh}
          </Typography>
          {posture.riskLevel === 'critical' && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: config.color,
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
          )}
        </Box>

        <Typography
          sx={{
            fontSize: 12.5,
            color: 'text.secondary',
            lineHeight: 1.4,
          }}
        >
          {config.descTh}
        </Typography>

        {/* Quick stats */}
        <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
          {posture.criticalCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>วิกฤต:</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>
                {posture.criticalCount}
              </Typography>
            </Box>
          )}
          {posture.highCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>สูง:</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#F17422' }}>
                {posture.highCount}
              </Typography>
            </Box>
          )}
          {posture.topSourceIP && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>IP ชั้นนำ:</Typography>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#7B5BA4',
                  fontFamily: '"IBM Plex Mono",monospace',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
                onClick={() => navigate(`/alerts?srcip=${encodeURIComponent(posture.topSourceIP?.name || '')}`)}
              >
                {posture.topSourceIP.name}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
        <Tooltip title="ไปยังหน้า Alerts เพื่อตรวจสอบรายละเอียด">
          <Button
            size="small"
            variant="contained"
            onClick={() => navigate('/alerts')}
            sx={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'none',
              px: 1.5,
              py: 0.6,
              borderRadius: '8px',
              bgcolor: config.color,
              color: '#fff',
              '&:hover': { bgcolor: config.color, opacity: 0.9 },
            }}
          >
            ดูการแจ้งเตือน
          </Button>
        </Tooltip>
        {posture.topSourceIP && (
          <Tooltip title={`ตรวจสอบ IP ${posture.topSourceIP.name}`}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate(`/investigate?q=${encodeURIComponent(posture.topSourceIP?.name || '')}`)}
              sx={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'none',
                px: 1.5,
                py: 0.6,
                borderRadius: '8px',
                color: config.color,
                borderColor: `${config.color}40`,
                '&:hover': { bgcolor: `${config.color}08`, borderColor: `${config.color}60` },
              }}
            >
              ตรวจสอบ IP
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Box>
  )
}
