import { Box, Typography, useTheme } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded'
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { RecommendedAction, RecommendedActionSeverity } from '../../types/dashboard'
import { SectionCard } from '../ui/SectionCard'
import { BRAND, SEV_COLOR } from '../ui/tokens'

const ICON_MAP: Record<string, typeof ErrorRoundedIcon> = {
  error: ErrorRoundedIcon,
  investigate: ManageSearchRoundedIcon,
  devices: DevicesRoundedIcon,
  rule: ShieldRoundedIcon,
  soar: BoltRoundedIcon,
  network: RouterRoundedIcon,
}

const SEVERITY_COLOR: Record<RecommendedActionSeverity, string> = {
  critical: SEV_COLOR.critical,
  high: SEV_COLOR.high,
  medium: SEV_COLOR.medium,
  info: BRAND.primary,
}

interface RecommendedActionsPanelProps {
  actions: RecommendedAction[]
}

export function RecommendedActionsPanel({ actions }: RecommendedActionsPanelProps) {
  const navigate = useNavigate()
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  return (
    <SectionCard
      title="แนะนำการดำเนินการ"
      icon={<AssignmentTurnedInRoundedIcon sx={{ fontSize: 16 }} />}
      accent={BRAND.primary}
      subtitle="เรียงตามความสำคัญ สูงสุด 5 รายการ"
      noPad
    >
      {actions.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 4 }}>
          <CheckCircleRoundedIcon sx={{ fontSize: 32, color: SEV_COLOR.low }} />
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
            ไม่มีการดำเนินการที่ต้องทำเพิ่มเติมในขณะนี้
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {actions.map((action, i) => {
            const color = SEVERITY_COLOR[action.severity]
            const Icon = ICON_MAP[action.icon] || ErrorRoundedIcon
            return (
              <Box
                key={action.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(action.route)}
                onKeyDown={e => { if (e.key === 'Enter') navigate(action.route) }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.5, cursor: 'pointer',
                  borderLeft: `3px solid ${color}`,
                  borderBottom: i < actions.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` : 'none',
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: `${color}0C` },
                  '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: '-2px' },
                }}
              >
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
                  bgcolor: `${color}15`, border: `1px solid ${color}30`,
                }}>
                  <Icon sx={{ fontSize: 16, color }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                    {action.title}
                  </Typography>
                  <Typography sx={{
                    fontSize: 11, color: 'text.secondary', lineHeight: 1.4, mt: 0.25,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {action.description}
                  </Typography>
                </Box>
                <ChevronRightRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />
              </Box>
            )
          })}
        </Box>
      )}
    </SectionCard>
  )
}
