import { Box, Button, Stack, Typography } from '@mui/material'
import GppMaybeRoundedIcon from '@mui/icons-material/GppMaybeRounded'
import type { InvestigationMitreSummary } from '../../types'
import EmptyState from '../ui/EmptyState'
import SectionCard from '../ui/SectionCard'

interface MitrePanelProps {
  summary?: InvestigationMitreSummary
  onFilterTechnique?: (technique: string) => void
}

export function MitrePanel({ summary, onFilterTechnique }: MitrePanelProps) {
  return (
    <SectionCard
      title="MITRE ATT&CK"
      subtitle="สรุป tactic และ technique ที่เกี่ยวข้องกับการค้นหานี้"
      icon={<GppMaybeRoundedIcon />}
      accent="#EF4444"
      empty={<EmptyState title="ยังไม่พบ MITRE mapping" description="alert ที่สัมพันธ์กับ query นี้ยังไม่มีข้อมูล MITRE tactic/technique" />}
    >
      {!summary ? null : (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
            <Box sx={{ flex: 1, p: 2, borderRadius: '18px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Tactics
              </Typography>
              <Typography sx={{ mt: 0.7, fontSize: 28, fontWeight: 900, color: '#EF4444', fontFamily: '"IBM Plex Mono", monospace' }}>
                {summary.totalTactics}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, p: 2, borderRadius: '18px', bgcolor: 'rgba(123,91,164,0.1)', border: '1px solid rgba(123,91,164,0.15)' }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Techniques
              </Typography>
              <Typography sx={{ mt: 0.7, fontSize: 28, fontWeight: 900, color: '#7B5BA4', fontFamily: '"IBM Plex Mono", monospace' }}>
                {summary.totalTechniques}
              </Typography>
            </Box>
          </Stack>

          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
              Top Tactics
            </Typography>
            <Stack spacing={1}>
              {summary.tactics.map((item) => (
                <Box key={item.name}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{item.name}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{item.count}</Typography>
                  </Stack>
                  <Box sx={{ height: 10, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <Box sx={{ width: `${Math.max(10, (item.count / Math.max(summary.tactics[0]?.count ?? 1, 1)) * 100)}%`, height: '100%', bgcolor: '#EF4444' }} />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
              Top Techniques
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {summary.techniques.map((item) => (
                <Button
                  key={item.name}
                  variant="outlined"
                  size="small"
                  onClick={() => onFilterTechnique?.(item.name)}
                  sx={{ borderRadius: '999px', textTransform: 'none' }}
                >
                  {item.name} · {item.count}
                </Button>
              ))}
            </Stack>
          </Box>
        </Stack>
      )}
    </SectionCard>
  )
}

export default MitrePanel
