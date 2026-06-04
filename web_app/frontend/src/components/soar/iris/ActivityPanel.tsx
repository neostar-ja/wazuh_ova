import { useQuery } from '@tanstack/react-query'
import { Box, Skeleton, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { soarApi, CaseActivityEntry } from '../../../services/soarApi'
import { fmtTime } from '../soarUtils'

const ACTION_META: Record<string, { color: string; emoji: string }> = {
  task_created:    { color: '#6366F1', emoji: '✓' },
  task_updated:    { color: '#38BDF8', emoji: '↻' },
  task_deleted:    { color: '#EF4444', emoji: '✕' },
  template_applied:{ color: '#A855F7', emoji: '⊞' },
  evidence_added:  { color: '#22C55E', emoji: '⊕' },
  evidence_deleted:{ color: '#EF4444', emoji: '⊖' },
  shuffle_action:  { color: '#EAB308', emoji: '⚡' },
  note_added:      { color: '#14B8A6', emoji: '📝' },
  ioc_added:       { color: '#F17422', emoji: '🔴' },
  case_closed:     { color: '#64748B', emoji: '🔒' },
  case_reopened:   { color: '#22C55E', emoji: '🔓' },
}

interface Props { caseId: number }

export default function ActivityPanel({ caseId }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'

  const { data, isLoading } = useQuery({
    queryKey: ['case-activity', caseId],
    queryFn: () => soarApi.getCaseActivity(caseId).then(r => r.data),
    enabled: !!caseId,
    refetchInterval: 30000,
  })

  const logs: CaseActivityEntry[] = data?.activity ?? []

  if (isLoading) {
    return <Stack spacing={1}>{[1,2,3,4].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: 1.5 }} />)}</Stack>
  }

  if (logs.length === 0) {
    return (
      <Box className="py-12 flex flex-col items-center gap-2">
        <Typography sx={{ fontSize: 32 }}>📋</Typography>
        <Typography sx={{ fontSize: 12, color: textMuted }}>ยังไม่มี activity log ในเคสนี้</Typography>
        <Typography sx={{ fontSize: 10, color: textMuted }}>Activity จะถูกบันทึกเมื่อมีการเพิ่ม task, evidence หรือ Shuffle action</Typography>
      </Box>
    )
  }

  return (
    <Box className="relative pl-5">
      {/* Vertical line */}
      <Box className="absolute left-2 top-2 bottom-2 w-px"
        sx={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.15)' }} />

      <Stack spacing={2}>
        {logs.map((log) => {
          const meta = ACTION_META[log.action] ?? { color: '#64748B', emoji: '•' }
          return (
            <Box key={log.id} className="relative">
              {/* Dot */}
              <Box
                className="absolute -left-5 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px]"
                sx={{
                  background: `rgba(${parseInt(meta.color.slice(1,3),16)},${parseInt(meta.color.slice(3,5),16)},${parseInt(meta.color.slice(5,7),16)},0.15)`,
                  border: `1.5px solid ${meta.color}40`,
                  color: meta.color,
                  fontSize: 10,
                }}
              >
                {meta.emoji}
              </Box>

              <Box className="rounded-xl px-3 py-2"
                sx={{
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.08)'}`,
                }}
              >
                <Box className="flex items-start justify-between gap-2">
                  <Box className="flex-1 min-w-0">
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: meta.color }}>
                      {log.action.replace(/_/g, ' ')}
                    </Typography>
                    {log.detail && (
                      <Typography sx={{ fontSize: 10.5, color: textSec, mt: 0.2, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {log.detail}
                      </Typography>
                    )}
                    {log.username && (
                      <Typography sx={{ fontSize: 9, color: textMuted, mt: 0.5 }}>
                        โดย: {log.username}
                      </Typography>
                    )}
                  </Box>
                  <Typography className="font-mono text-[9px] shrink-0" sx={{ color: textMuted, mt: 0.3 }}>
                    {fmtTime(log.created_at)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
