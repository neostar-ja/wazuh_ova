import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Typography, Stack, Button, TextField, Chip, Skeleton,
  CircularProgress, Tooltip,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import { useSnackbar } from 'notistack'
import { soarApi, ShuffleAction } from '../../../services/soarApi'
import { hexRgb, fmtTime } from '../soarUtils'

const CASE_COLOR = '#6366F1'

interface Props {
  caseId: number
  caseName?: string
  irisConfigured: boolean
  shuffleConfigured: boolean
}

type ActionKey = 'block' | 'escalate' | 'triage' | 'notify'

interface ActionMeta {
  color: string
  icon: React.ReactNode
  label: string
  labelTh: string
  descTh: string
  simulation: boolean
}

const ACTIONS: Record<ActionKey, ActionMeta> = {
  block: {
    color: '#F97316', icon: <BlockRoundedIcon sx={{ fontSize: 14 }} />,
    label: 'Simulate Block IP', labelTh: 'จำลอง Block IP',
    descTh: 'SIMULATION ONLY — ส่ง simulation payload ไปยัง Shuffle ไม่มีการ block จริง',
    simulation: true,
  },
  escalate: {
    color: '#EAB308', icon: <SendRoundedIcon sx={{ fontSize: 14 }} />,
    label: 'Escalate', labelTh: 'Escalate Case',
    descTh: 'ส่ง escalation notification ผ่าน Shuffle',
    simulation: false,
  },
  triage: {
    color: '#22C55E', icon: <PlayArrowRoundedIcon sx={{ fontSize: 14 }} />,
    label: 'Run Triage Playbook', labelTh: 'รัน Triage Playbook',
    descTh: 'ส่ง case context ไปยัง Shuffle triage workflow',
    simulation: false,
  },
  notify: {
    color: '#38BDF8', icon: <AutoFixHighRoundedIcon sx={{ fontSize: 14 }} />,
    label: 'Notify IT Owner', labelTh: 'แจ้ง IT Owner',
    descTh: 'ส่ง notification ผ่าน Shuffle',
    simulation: false,
  },
}

export default function ShuffleActionsPanel({ caseId, caseName, irisConfigured, shuffleConfigured }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)'

  const [blockIp, setBlockIp] = useState('')
  const [reason, setReason] = useState('')
  const [runningAction, setRunningAction] = useState<ActionKey | null>(null)
  const [actionResults, setActionResults] = useState<Record<ActionKey, { ok?: boolean; mode?: string; message?: string }>>({} as Record<ActionKey, { ok?: boolean; mode?: string; message?: string }>)

  // Load real Shuffle workflows
  const { data: wfData } = useQuery({
    queryKey: ['shuffle-workflows'],
    queryFn: () => soarApi.getShuffleWorkflows().then(r => r.data),
    enabled: shuffleConfigured,
    staleTime: 5 * 60 * 1000,
  })
  const workflows = (Array.isArray(wfData) ? wfData : wfData?.workflows ?? []) as { id: string; name: string; description: string; status: string }[]

  const { data: histData, isLoading: histLoading } = useQuery({
    queryKey: ['shuffle-actions', caseId],
    queryFn: () => soarApi.getShuffleActions(caseId).then(r => r.data),
    enabled: !!caseId,
  })

  const triggerMut = useMutation({
    mutationFn: async ({ actionType, payload }: { actionType: ActionKey; payload: Record<string, unknown> }) => {
      const r = await soarApi.triggerTriage({
        ...payload,
        type: actionType,
        case_id: caseId,
        ...(actionType === 'block' ? { simulation: true, dry_run: true, source: 'case_workspace_shuffle_panel' } : {}),
      })
      return { response: r.data, actionType }
    },
    onSuccess: async ({ response, actionType }) => {
      const mode = response?.mode ?? (actionType === 'block' ? 'simulation' : 'live')
      const ok = response?.ok !== false
      setActionResults(prev => ({ ...prev, [actionType]: { ok, mode, message: response?.message_th ?? response?.message } }))

      // Record in local history
      await soarApi.recordShuffleAction(caseId, {
        iris_case_id: caseId,
        action_type: actionType,
        payload_summary: JSON.stringify({ case_id: caseId, case_name: caseName }),
        response_mode: mode,
        response_ok: ok,
        response_detail: response?.message ?? '',
      })

      // Add IRIS note if IRIS is configured
      if (irisConfigured) {
        try {
          const note = actionType === 'block'
            ? `[SIMULATION] Block IP requested\nIP: ${blockIp}\nMode: simulation only\nไม่มีการ block จริง`
            : `Shuffle action: ${actionType}\nCase: ${caseName}\nMode: ${mode}`
          await soarApi.addCaseNote(caseId, {
            title: `Shuffle ${ACTIONS[actionType].label}`,
            content: note,
            group_title: 'Shuffle Actions',
          })
        } catch { /* non-blocking */ }
      }

      queryClient.invalidateQueries({ queryKey: ['shuffle-actions', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case-activity', caseId] })
      const msg = mode === 'simulation'
        ? `Simulation completed — ไม่มีการดำเนินการจริง`
        : `ส่ง ${ACTIONS[actionType].labelTh} สำเร็จ`
      enqueueSnackbar(msg, { variant: 'success' })
      setRunningAction(null)
    },
    onError: () => {
      enqueueSnackbar('Shuffle action ล้มเหลว', { variant: 'error' })
      setRunningAction(null)
    },
  })

  const handleAction = (actionType: ActionKey) => {
    if (actionType === 'block') {
      if (!blockIp.trim()) { enqueueSnackbar('กรุณาระบุ IP', { variant: 'warning' }); return }
      if (!window.confirm(`ยืนยันการจำลอง Block IP: ${blockIp}\n\nSIMULATION ONLY — ไม่มีการ block จริง`)) return
    }
    setRunningAction(actionType)
    triggerMut.mutate({ actionType, payload: { ip: blockIp || undefined, reason: reason || undefined, title: caseName } })
  }

  const history: ShuffleAction[] = histData?.actions ?? []

  return (
    <Stack spacing={3}>
      {/* Simulation-only banner */}
      <Box className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
        sx={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.25)' }}>
        <ScienceRoundedIcon sx={{ fontSize: 16, color: '#EAB308', mt: 0.1 }} />
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#EAB308', mb: 0.3 }}>
            SIMULATION MODE — ทุก Block IP เป็นการจำลองเท่านั้น
          </Typography>
          <Typography sx={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.6)' }}>
            ไม่มีการเปลี่ยนแปลง firewall จริง ไม่มีการรัน Wazuh Active Response จริง
            จนกว่าจะมี approval workflow ที่ผ่านการตรวจสอบ
          </Typography>
        </Box>
      </Box>

      {/* Block IP input */}
      <Box className="rounded-xl p-3" sx={{ background: cardBg, border: '1px solid rgba(249,115,22,0.2)' }}>
        <Box className="flex items-center gap-2 mb-2">
          <BlockRoundedIcon sx={{ fontSize: 14, color: '#F97316' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#F97316' }}>Simulate Block IP</Typography>
          <Chip icon={<ScienceRoundedIcon sx={{ fontSize: 10 }} />} label="SIMULATION ONLY" size="small"
            sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: 'rgba(234,179,8,0.1)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)' }} />
        </Box>
        <Stack spacing={1.5}>
          <TextField size="small" label="IP Address" value={blockIp} onChange={e => setBlockIp(e.target.value)}
            placeholder="เช่น 80.82.77.139" fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12 } }} />
          <TextField size="small" label="เหตุผล (optional)" value={reason} onChange={e => setReason(e.target.value)} fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 12 } }} />
          <Button size="small" variant="outlined" startIcon={runningAction === 'block' ? <CircularProgress size={12} /> : <BlockRoundedIcon sx={{ fontSize: 14 }} />}
            disabled={!blockIp.trim() || !shuffleConfigured || runningAction !== null}
            onClick={() => handleAction('block')}
            sx={{ alignSelf: 'flex-start', borderRadius: 2, fontSize: 12, borderColor: 'rgba(249,115,22,0.4)', color: '#F97316',
              '&:hover': { borderColor: '#F97316', background: 'rgba(249,115,22,0.06)' } }}>
            {runningAction === 'block' ? 'กำลังจำลอง...' : 'จำลอง Block IP'}
          </Button>
          {actionResults.block && (
            <Box className="flex items-center gap-1.5">
              {actionResults.block.ok
                ? <CheckCircleRoundedIcon sx={{ fontSize: 13, color: '#22C55E' }} />
                : <ErrorRoundedIcon sx={{ fontSize: 13, color: '#EF4444' }} />}
              <Typography sx={{ fontSize: 10, color: actionResults.block.ok ? '#22C55E' : '#EF4444' }}>
                {actionResults.block.message || 'Simulation completed'}
              </Typography>
              {actionResults.block.mode === 'simulation' && (
                <Chip label="SIMULATION" size="small" sx={{ height: 14, fontSize: 8, fontWeight: 700, bgcolor: 'rgba(234,179,8,0.1)', color: '#EAB308', border: 'none' }} />
              )}
            </Box>
          )}
        </Stack>
      </Box>

      {/* Other actions */}
      <Stack spacing={1.5}>
        {(['escalate', 'triage', 'notify'] as ActionKey[]).map(key => {
          const action = ACTIONS[key]
          const result = actionResults[key]
          return (
            <Box key={key} className="rounded-xl p-3 flex items-center gap-3"
              sx={{ background: cardBg, border: `1px solid rgba(${hexRgb(action.color)},0.15)` }}>
              <Box className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                sx={{ background: `rgba(${hexRgb(action.color)},0.1)`, color: action.color }}>
                {action.icon}
              </Box>
              <Box className="flex-1 min-w-0">
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: isDark ? '#EDE9FA' : '#1A1033' }}>{action.labelTh}</Typography>
                <Typography sx={{ fontSize: 10, color: textMuted }}>{action.descTh}</Typography>
                {result && (
                  <Box className="flex items-center gap-1 mt-0.5">
                    {result.ok ? <CheckCircleRoundedIcon sx={{ fontSize: 11, color: '#22C55E' }} /> : <ErrorRoundedIcon sx={{ fontSize: 11, color: '#EF4444' }} />}
                    <Typography sx={{ fontSize: 9, color: result.ok ? '#22C55E' : '#EF4444' }}>{result.message || (result.ok ? 'สำเร็จ' : 'ล้มเหลว')}</Typography>
                  </Box>
                )}
              </Box>
              <Button size="small" variant="outlined"
                disabled={!shuffleConfigured || runningAction !== null}
                startIcon={runningAction === key ? <CircularProgress size={12} /> : undefined}
                onClick={() => handleAction(key)}
                sx={{ borderRadius: 2, fontSize: 11, shrink: 0, borderColor: `rgba(${hexRgb(action.color)},0.4)`, color: action.color,
                  '&:hover': { borderColor: action.color, background: `rgba(${hexRgb(action.color)},0.06)` } }}>
                {runningAction === key ? '...' : action.labelTh}
              </Button>
            </Box>
          )
        })}
      </Stack>

      {/* Live Shuffle Workflows */}
      {shuffleConfigured && workflows.length > 0 && (
        <Box>
          <Typography className="text-[9px] font-bold tracking-widest mb-2" sx={{ color: textMuted }}>
            SHUFFLE WORKFLOWS ({workflows.length})
          </Typography>
          <Box className="rounded-xl overflow-hidden"
            sx={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}` }}>
            {workflows.slice(0, 8).map((wf, i) => (
              <Box key={wf.id}
                className="flex items-center gap-3 px-3 py-2"
                sx={{
                  background: i % 2 === 0 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.7)') : 'transparent',
                  borderBottom: i < workflows.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.07)'}` : 'none',
                }}>
                <Box className="flex-1 min-w-0">
                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: isDark ? '#EDE9FA' : '#1A1033' }}>
                    {wf.name}
                  </Typography>
                  {wf.description && (
                    <Typography className="truncate" sx={{ fontSize: 9.5, color: textMuted }}>{wf.description}</Typography>
                  )}
                </Box>
                <Box className="flex items-center gap-1.5 shrink-0">
                  <Box className="px-2 py-0.5 rounded text-[9px] font-semibold"
                    sx={{
                      background: wf.status === 'running' ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.1)',
                      color: wf.status === 'running' ? '#22C55E' : '#64748B',
                    }}>
                    {wf.status ?? 'idle'}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Action history */}
      {history.length > 0 && (
        <Box>
          <Typography className="text-[9px] font-bold tracking-widest mb-2" sx={{ color: textMuted }}>
            HISTORY ({history.length})
          </Typography>
          <Stack spacing={0.75}>
            {history.slice(0, 10).map(h => (
              <Box key={h.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                sx={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.7)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.08)'}` }}>
                <Box className="w-1.5 h-1.5 rounded-full shrink-0"
                  sx={{ background: h.response_ok ? '#22C55E' : '#EF4444' }} />
                <Box className="flex-1 min-w-0">
                  <Box className="flex items-center gap-2">
                    <Typography className="font-mono text-[10px]" sx={{ color: textSec }}>{h.action_type}</Typography>
                    {h.response_mode === 'simulation' && (
                      <Chip label="SIM" size="small" sx={{ height: 13, fontSize: 8, fontWeight: 700, bgcolor: 'rgba(234,179,8,0.1)', color: '#EAB308', border: 'none' }} />
                    )}
                  </Box>
                  {h.response_detail && (
                    <Typography className="text-[9px] truncate" sx={{ color: textMuted }}>{h.response_detail}</Typography>
                  )}
                </Box>
                <Typography className="font-mono text-[9px] shrink-0" sx={{ color: textMuted }}>
                  {fmtTime(h.created_at)}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  )
}
