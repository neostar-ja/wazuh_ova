import { useQuery, useMutation } from '@tanstack/react-query'
import { Box, Typography, Stack, Skeleton, Button, Link, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import WorkspacesRoundedIcon from '@mui/icons-material/WorkspacesRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import WebhookRoundedIcon from '@mui/icons-material/WebhookRounded'
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import EscalatorWarningRoundedIcon from '@mui/icons-material/EscalatorWarningRounded'
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecord'
import { useSnackbar } from 'notistack'
import { ShuffleWorkflow, soarApi } from '../../../services/soarApi'
import { hexRgb } from '../soarUtils'
import { BRAND, SEV_COLOR } from '../../ui/tokens'

interface Props {
  shuffleUrl?: string
}

function getWfMeta(wf: ShuffleWorkflow) {
  const isBlock    = wf.tags?.includes('block')    || wf.name.toLowerCase().includes('block')
  const isEscalate = wf.tags?.includes('escalate') || wf.name.toLowerCase().includes('escalat')
  const isWebhook  = wf.tags?.includes('webhook')  || wf.name.toLowerCase().includes('wazuh') ||
    wf.name.toLowerCase().includes('siem') || wf.name.toLowerCase().includes('triage')
  const color = isBlock ? SEV_COLOR.critical : isEscalate ? '#F59E0B' : isWebhook ? '#14B8A6' : BRAND.purple
  const triggerType = isWebhook ? 'Webhook' : 'Manual'
  return { color, triggerType, isBlock, isEscalate, isWebhook }
}

export default function ShuffleTab({ shuffleUrl }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'

  const { data: workflows = [], isLoading } = useQuery<ShuffleWorkflow[]>({
    queryKey: ['shuffle-workflows'],
    queryFn: () => soarApi.getShuffleWorkflows().then(r => r.data),
    refetchInterval: 120000,
  })

  const triggerMut = useMutation({
    mutationFn: ({ type, payload }: { type: string; payload: Record<string, unknown> }) =>
      soarApi.triggerTriage({ workflow_type: type, ...payload }),
    onSuccess: () => enqueueSnackbar('เริ่มต้น Workflow เรียบร้อยแล้ว', { variant: 'success' }),
    onError:   () => enqueueSnackbar('ไม่สามารถเริ่มต้น Workflow ได้', { variant: 'error' }),
  })

  return (
    <Stack spacing={2.5} className="animate-fade-in">
      {/* Header */}
      <Box className="flex items-center justify-between flex-wrap gap-2">
        <Box className="flex items-center gap-2.5">
          <WorkspacesRoundedIcon sx={{ fontSize: 18, color: '#14B8A6' }} />
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: isDark ? '#E2E8F0' : '#1A1033' }}>
              Workflow อัตโนมัติ
            </Typography>
            <Typography sx={{ fontSize: 10, color: textMuted }}>
              Shuffle SOAR automation workflows
            </Typography>
          </Box>
          <Box className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            sx={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }}>
            {workflows.length} workflows
          </Box>
        </Box>
        {shuffleUrl && (
          <Link href={shuffleUrl} target="_blank" rel="noopener" underline="none"
            className="flex items-center gap-1 text-xs font-semibold"
            sx={{ color: '#14B8A6', '&:hover': { color: '#2DD4BF' } }}>
            เปิด Shuffle SOAR <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
          </Link>
        )}
      </Box>

      {isLoading ? (
        <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} height={160} sx={{ borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.05)' }} />)}
        </Box>
      ) : workflows.length === 0 ? (
        <Box className="py-16 flex flex-col items-center gap-3">
          <WorkspacesRoundedIcon sx={{ fontSize: 40, color: textMuted, opacity: 0.4 }} />
          <Typography sx={{ fontSize: 13, color: textMuted }}>ไม่พบ Workflow</Typography>
        </Box>
      ) : (
        <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {workflows.map(wf => {
            const { color, triggerType, isBlock, isEscalate } = getWfMeta(wf)
            return (
              <Box key={wf.id} className="rounded-2xl overflow-hidden transition-all duration-200 group"
                sx={{
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'}`,
                  '&:hover': {
                    border: `1px solid rgba(${hexRgb(color)},0.35)`,
                    boxShadow: `0 4px 20px rgba(${hexRgb(color)},0.1)`,
                    transform: 'translateY(-1px)',
                  },
                }}>
                {/* Color strip */}
                <Box className="h-0.5" sx={{ background: `linear-gradient(90deg,${color}80,${color})` }} />

                <Box className="p-4">
                  {/* Header row */}
                  <Box className="flex items-start justify-between gap-2 mb-2.5">
                    <Box className="flex items-center gap-2.5">
                      <Box className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        sx={{ background: `rgba(${hexRgb(color)},0.12)` }}>
                        {isBlock ? <BlockRoundedIcon sx={{ fontSize: 18, color }} />
                          : isEscalate ? <EscalatorWarningRoundedIcon sx={{ fontSize: 18, color }} />
                          : <WorkspacesRoundedIcon sx={{ fontSize: 18, color }} />}
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033', lineHeight: 1.3 }}>
                          {wf.name}
                        </Typography>
                        <Typography className="font-mono text-[9px] mt-0.5" sx={{ color: textMuted }}>
                          {wf.id.slice(0, 8)}…
                        </Typography>
                      </Box>
                    </Box>
                    <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                      sx={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                      <FiberManualRecordRoundedIcon sx={{ fontSize: 6, color: '#22C55E' }} />
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#22C55E' }}>ACTIVE</Typography>
                    </Box>
                  </Box>

                  {/* Description */}
                  {wf.description && (
                    <Typography sx={{ fontSize: 11, color: textSec, lineHeight: 1.5, mb: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {wf.description}
                    </Typography>
                  )}

                  {/* Meta */}
                  <Box className="flex items-center gap-2 flex-wrap mb-3">
                    <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                      sx={{ background: `rgba(${hexRgb(color)},0.1)`, border: `1px solid rgba(${hexRgb(color)},0.25)` }}>
                      {triggerType === 'Webhook'
                        ? <WebhookRoundedIcon sx={{ fontSize: 11, color }} />
                        : <TouchAppRoundedIcon sx={{ fontSize: 11, color }} />
                      }
                      <Typography sx={{ fontSize: 9.5, fontWeight: 700, color }}>
                        {triggerType === 'Webhook' ? 'Webhook ทริกเกอร์' : 'Manual'}
                      </Typography>
                    </Box>
                    {wf.tags?.slice(0, 2).map(tag => (
                      <Box key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                        sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)', color: textMuted }}>
                        {tag}
                      </Box>
                    ))}
                  </Box>

                  {/* Trigger button */}
                  {triggerType === 'Webhook' ? (
                    <Tooltip title="เริ่มต้น Workflow นี้">
                      <Button size="small" variant="outlined"
                        startIcon={<PlayArrowRoundedIcon sx={{ fontSize: 14 }} />}
                        disabled={triggerMut.isPending}
                        onClick={() => triggerMut.mutate({ type: isBlock ? 'block' : isEscalate ? 'escalate' : 'triage', payload: { workflow_id: wf.id } })}
                        sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, py: 0.5, px: 2,
                          borderColor: `rgba(${hexRgb(color)},0.4)`, color,
                          '&:hover': { borderColor: color, background: `rgba(${hexRgb(color)},0.08)` } }}>
                        เริ่มต้น
                      </Button>
                    </Tooltip>
                  ) : (
                    <Box className="px-2.5 py-1 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1"
                      sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)',
                            color: textMuted, border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(123,91,164,0.12)' }}>
                      <TouchAppRoundedIcon sx={{ fontSize: 12 }} />
                      เริ่มต้นด้วยตนเองเท่านั้น
                    </Box>
                  )}
                </Box>
              </Box>
            )
          })}
        </Box>
      )}
    </Stack>
  )
}
