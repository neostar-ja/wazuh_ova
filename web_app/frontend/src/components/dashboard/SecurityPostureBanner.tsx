import React from 'react'
import { Box, Typography, Button, Chip, useTheme, Tooltip } from '@mui/material'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { SecurityPosture } from '../../types/dashboard'
import { IntegrationHealth } from '../../services/soarApi'
import { useNavigate } from 'react-router-dom'
import { BRAND, SEV_COLOR, getSoftBg } from '../ui/tokens'

interface SecurityPostureBannerProps {
  posture: SecurityPosture | null
  isLoading: boolean
  integrations?: IntegrationHealth[]
  integrationsLoading?: boolean
}

// Fixed display order + short Thai/EN labels for the integration health strip
const INTEGRATION_DISPLAY: { id: string; label: string }[] = [
  { id: 'wazuh', label: 'Wazuh' },
  { id: 'opensearch', label: 'OpenSearch' },
  { id: 'dfir_iris', label: 'IRIS' },
  { id: 'shuffle', label: 'Shuffle' },
  { id: 'misp', label: 'MISP' },
  { id: 'infoblox', label: 'Infoblox' },
  { id: 'huawei_nac', label: 'NAC' },
]

export function SecurityPostureBanner({ posture, isLoading, integrations, integrationsLoading }: SecurityPostureBannerProps) {
  const navigate = useNavigate()
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  if (isLoading || !posture) {
    return null
  }

  const riskConfig = {
    critical: {
      icon: ErrorRoundedIcon,
      color: SEV_COLOR.critical,
      bgColor: getSoftBg(SEV_COLOR.critical, 12),
      borderColor: getSoftBg(SEV_COLOR.critical, 18),
      titleTh: 'สถานการณ์วิกฤต',
      descTh: 'พบการโจมตีระดับวิกฤตหลายรายการ ต้องดำเนินการอย่างเร่งด่วน',
    },
    elevated: {
      icon: WarningRoundedIcon,
      color: SEV_COLOR.high,
      bgColor: getSoftBg(SEV_COLOR.high, 12),
      borderColor: getSoftBg(SEV_COLOR.high, 18),
      titleTh: 'สถานการณ์สูง',
      descTh: 'พบการโจมตีหลายรายการที่ต้องตรวจสอบเพิ่มเติม',
    },
    watch: {
      icon: WarningAmberRoundedIcon,
      color: SEV_COLOR.medium,
      bgColor: getSoftBg(SEV_COLOR.medium, 12),
      borderColor: getSoftBg(SEV_COLOR.medium, 18),
      titleTh: 'ต้องเฝ้าระวัง',
      descTh: 'พบ Alert ระดับ High ที่ควรเฝ้าติดตามอย่างใกล้ชิด',
    },
    normal: {
      icon: CheckCircleRoundedIcon,
      color: SEV_COLOR.low,
      bgColor: getSoftBg(SEV_COLOR.low, 12),
      borderColor: getSoftBg(SEV_COLOR.low, 18),
      titleTh: 'ระบบปกติ',
      descTh: 'ระบบทำงานตามปกติ ไม่พบภัยคุกคามที่สำคัญ',
    },
  }

  const config = riskConfig[posture.riskLevel]
  const IconComponent = config.icon

  const grayChip = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const grayChipBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
  const grayChipBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'

  const integrationColor = (status: string) => {
    if (status === 'connected') return SEV_COLOR.low
    if (status === 'error' || status === 'degraded') return SEV_COLOR.high
    return grayChip
  }

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
      <Box sx={{ flex: 1, minWidth: 0 }}>
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

        {/* Reason chips */}
        {posture.reasons.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 1 }}>
            {posture.reasons.map((reason, i) => (
              <Chip
                key={i}
                label={reason}
                size="small"
                sx={{
                  height: 20, fontSize: 10.5, fontWeight: 600,
                  bgcolor: grayChipBg, color: 'text.secondary',
                  border: `1px solid ${grayChipBorder}`,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            ))}
          </Box>
        )}

        {/* Integration health mini chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.6, mt: 1 }}>
          <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, letterSpacing: '0.04em', mr: 0.25 }}>
            INTEGRATIONS:
          </Typography>
          {integrationsLoading || !integrations ? (
            <Chip
              label="ข้อมูล Integration ไม่ครบ"
              size="small"
              sx={{
                height: 20, fontSize: 10.5, fontWeight: 600,
                bgcolor: grayChipBg, color: 'text.disabled',
                border: `1px solid ${grayChipBorder}`,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          ) : (
            INTEGRATION_DISPLAY.map(({ id, label }) => {
              const integ = integrations.find(i => i.id === id)
              const status = integ?.status || 'not_configured'
              const color = integrationColor(status)
              return (
                <Tooltip key={id} title={integ?.label || 'ไม่มีข้อมูล'}>
                  <Chip
                    label={label}
                    size="small"
                    sx={{
                      height: 20, fontSize: 10.5, fontWeight: 700,
                      bgcolor: `${color}14`, color,
                      border: `1px solid ${color}30`,
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                </Tooltip>
              )
            })
          )}
        </Box>

        {/* Quick stats */}
        <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
          {posture.criticalCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>วิกฤต:</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR.critical }}>
                {posture.criticalCount}
              </Typography>
            </Box>
          )}
          {posture.highCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>สูง:</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR.high }}>
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
                  color: isDark ? BRAND.primaryLight : BRAND.primary,
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

        {/* Suggested action */}
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: config.color, mt: 1 }}>
          {posture.suggestedAction}
        </Typography>
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
