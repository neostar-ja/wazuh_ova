import { Box, LinearProgress, Stack, Typography } from '@mui/material'
import RadarRoundedIcon from '@mui/icons-material/RadarRounded'
import type { EntityProfile } from '../../types'
import SectionCard from '../ui/SectionCard'
import { riskColor } from './utils'

interface RiskScoreCardProps {
  profile: EntityProfile
  riskFactors: string[]
}

export function RiskScoreCard({ profile, riskFactors }: RiskScoreCardProps) {
  const score = profile.riskScore ?? 0
  const color = riskColor(score)
  const riskLevel = profile.riskLevel?.toUpperCase() ?? 'INFO'
  return (
    <SectionCard title="Risk Posture" subtitle="คะแนนความเสี่ยงเชิงสังเคราะห์จาก severity และสัมพันธ์ของเหตุการณ์" icon={<RadarRoundedIcon />} accent={color}>
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: 34, fontWeight: 900, lineHeight: 1, color, fontFamily: '"IBM Plex Mono", monospace' }}>
              {score.toFixed(1)}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.35 }}>
              ระดับความเสี่ยง {riskLevel}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 12, color, fontWeight: 800 }}>
            {score >= 8 ? 'Escalate' : score >= 6 ? 'Investigate' : score >= 4 ? 'Observe' : 'Baseline'}
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={Math.min(100, score * 10)}
          sx={{
            height: 12,
            borderRadius: 999,
            bgcolor: 'rgba(255,255,255,0.06)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.9))`,
            },
          }}
        />

        <Box>
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
            Risk Factors
          </Typography>
          <Stack spacing={1}>
            {riskFactors.length > 0 ? (
              riskFactors.map((factor) => (
                <Box key={factor} sx={{ p: 1.15, borderRadius: '12px', bgcolor: `${color}10`, border: `1px solid ${color}20` }}>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{factor}</Typography>
                </Box>
              ))
            ) : (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                ยังไม่พบปัจจัยเสี่ยงเด่นจากข้อมูลปัจจุบัน
              </Typography>
            )}
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  )
}

export default RiskScoreCard
