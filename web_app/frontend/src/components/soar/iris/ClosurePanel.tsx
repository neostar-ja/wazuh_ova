import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Checkbox, CircularProgress, FormControlLabel,
  Stack, TextField, Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { format } from 'date-fns'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { useSnackbar } from 'notistack'
import { soarApi, IrisCase, CaseTask } from '../../../services/soarApi'
import { browserTimezoneOffset, hexRgb } from '../soarUtils'

interface ChecklistItem {
  key: string
  label: string
  required: boolean
}

const CHECKLIST: ChecklistItem[] = [
  { key: 'alerts_reviewed',     label: 'ตรวจสอบ Alerts ที่เกี่ยวข้องแล้ว',           required: true  },
  { key: 'assets_identified',   label: 'ระบุ affected assets แล้ว',                   required: true  },
  { key: 'iocs_documented',     label: 'บันทึก IOC แล้ว',                             required: true  },
  { key: 'evidence_collected',  label: 'เก็บ evidence แล้ว',                          required: true  },
  { key: 'containment_done',    label: 'ดำเนินการ containment (หรือ simulation) แล้ว',required: true  },
  { key: 'tasks_completed',     label: 'Tasks สำคัญเสร็จสิ้นแล้ว',                   required: true  },
  { key: 'timeline_built',      label: 'สร้าง timeline แล้ว',                         required: false },
  { key: 'recommendations',     label: 'มี recommendations แล้ว',                     required: false },
  { key: 'lessons_learned',     label: 'บันทึก lessons learned แล้ว',                 required: false },
  { key: 'report_generated',    label: 'สร้าง report แล้ว',                           required: false },
  { key: 'stakeholders_notified','label': 'แจ้ง stakeholders แล้ว',                    required: false },
]

interface Props {
  caseId: number
  caseData: IrisCase | null
  onClosed?: () => void
}

export default function ClosurePanel({ caseId, caseData, onClosed }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)'

  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [finalNote, setFinalNote] = useState('')
  const [outcome, setOutcome] = useState('True Positive')

  const isOpen = !caseData?.case_close_date

  const { data: tasksData } = useQuery({
    queryKey: ['case-tasks', caseId],
    queryFn: () => soarApi.getCaseTasks(caseId).then(r => r.data),
    enabled: !!caseId,
  })

  const tasks: CaseTask[] = tasksData?.tasks ?? []
  const incompleteTasks = tasks.filter(t => t.status !== 'done' && t.priority !== 'low')

  const closeMut = useMutation({
    mutationFn: async () => {
      // Add final closure note
      if (finalNote.trim()) {
        await soarApi.addCaseNote(caseId, {
          title: `Closure Note — ${outcome}`,
          content: [
            `**Outcome:** ${outcome}`,
            `**Checklist completed:** ${Object.values(checked).filter(Boolean).length}/${CHECKLIST.length}`,
            '',
            finalNote,
          ].join('\n'),
          group_title: 'Case Closure',
        })
      }
      // Add final timeline event
      await soarApi.addCaseTimelineEvent(caseId, {
        title: 'Case Closed',
        content: `Case ปิดโดย SOC Analyst\nOutcome: ${outcome}\n${finalNote || ''}`,
        event_date: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
        event_tz: browserTimezoneOffset(),
      })
      return soarApi.closeIrisCase(caseId)
    },
    onSuccess: () => {
      enqueueSnackbar('ปิดเคสเรียบร้อยแล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['iris-cases'] })
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] })
      queryClient.invalidateQueries({ queryKey: ['soar-stats'] })
      onClosed?.()
    },
    onError: () => enqueueSnackbar('ปิดเคสล้มเหลว', { variant: 'error' }),
  })

  const reopenMut = useMutation({
    mutationFn: () => soarApi.reopenIrisCase(caseId),
    onSuccess: () => {
      enqueueSnackbar('เปิดเคสใหม่เรียบร้อยแล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['iris-cases'] })
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] })
      queryClient.invalidateQueries({ queryKey: ['soar-stats'] })
      onClosed?.()
    },
    onError: () => enqueueSnackbar('เปิดเคสใหม่ล้มเหลว', { variant: 'error' }),
  })

  const requiredItems = CHECKLIST.filter(c => c.required)
  const requiredChecked = requiredItems.every(c => checked[c.key])
  const checkedCount = Object.values(checked).filter(Boolean).length

  if (!isOpen) {
    return (
      <Box className="py-12 flex flex-col items-center gap-4">
        <Box className="w-16 h-16 rounded-3xl flex items-center justify-center"
          sx={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
          <LockRoundedIcon sx={{ fontSize: 30, color: '#64748B' }} />
        </Box>
        <Box className="text-center">
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033', mb: 1 }}>
            เคสนี้ปิดแล้ว
          </Typography>
          <Typography sx={{ fontSize: 12, color: textMuted }}>
            ปิดเมื่อ {caseData?.case_close_date}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<LockOpenRoundedIcon />}
          disabled={reopenMut.isPending}
          onClick={() => { if (window.confirm('ยืนยันการเปิดเคสนี้ใหม่?')) reopenMut.mutate() }}
          sx={{ borderRadius: 2, fontSize: 12, borderColor: 'rgba(34,197,94,0.4)', color: '#22C55E',
            '&:hover': { borderColor: '#22C55E', background: 'rgba(34,197,94,0.06)' } }}>
          {reopenMut.isPending ? <CircularProgress size={13} color="inherit" sx={{ mr: 0.5 }} /> : null}
          เปิดเคสใหม่
        </Button>
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      {/* Incomplete tasks warning */}
      {incompleteTasks.length > 0 && (
        <Box className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
          sx={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.25)' }}>
          <WarningAmberRoundedIcon sx={{ fontSize: 16, color: '#EAB308', mt: 0.1 }} />
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#EAB308', mb: 0.3 }}>
              ยังมี task ที่ยังไม่เสร็จ {incompleteTasks.length} รายการ
            </Typography>
            <Typography sx={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.65)' }}>
              {incompleteTasks.slice(0, 3).map(t => t.title).join(' · ')}
              {incompleteTasks.length > 3 ? ` และอีก ${incompleteTasks.length - 3} รายการ` : ''}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Checklist */}
      <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}` }}>
        <Box className="flex items-center justify-between mb-3">
          <Typography className="text-[9px] font-bold tracking-widest" sx={{ color: textMuted }}>
            CLOSURE CHECKLIST
          </Typography>
          <Box className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
            sx={{ background: requiredChecked ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)' }}>
            <Typography sx={{ fontSize: 9, fontWeight: 700, color: requiredChecked ? '#22C55E' : '#EAB308' }}>
              {checkedCount} / {CHECKLIST.length}
            </Typography>
          </Box>
        </Box>

        <Stack spacing={0.5}>
          {CHECKLIST.map(item => (
            <Box key={item.key} className="flex items-center gap-2 py-1 px-2 rounded-lg transition-colors"
              sx={{ '&:hover': { background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.04)' } }}>
              <Checkbox
                size="small"
                checked={!!checked[item.key]}
                onChange={e => setChecked(prev => ({ ...prev, [item.key]: e.target.checked }))}
                sx={{ p: 0.25, color: textMuted, '&.Mui-checked': { color: checked[item.key] ? '#22C55E' : '#6366F1' } }}
              />
              <Typography sx={{ fontSize: 11.5, flex: 1, color: checked[item.key] ? textMuted : textSec,
                textDecoration: checked[item.key] ? 'line-through' : 'none' }}>
                {item.label}
              </Typography>
              {item.required && !checked[item.key] && (
                <Box className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                  sx={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                  จำเป็น
                </Box>
              )}
              {checked[item.key] && <CheckCircleRoundedIcon sx={{ fontSize: 13, color: '#22C55E', shrink: 0 }} />}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Outcome + Final note */}
      <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}` }}>
        <Typography className="text-[9px] font-bold tracking-widest mb-3" sx={{ color: textMuted }}>
          FINAL CLOSURE NOTE
        </Typography>
        <Stack spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 11, color: textMuted, mb: 1 }}>Outcome:</Typography>
            <Box className="flex flex-wrap gap-2">
              {['True Positive', 'False Positive', 'Benign True Positive', 'Inconclusive'].map(opt => (
                <Box key={opt} onClick={() => setOutcome(opt)}
                  className="px-3 py-1.5 rounded-lg cursor-pointer text-[11px] font-semibold transition-all"
                  sx={{
                    background: outcome === opt ? 'rgba(99,102,241,0.15)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.04)',
                    border: `1px solid ${outcome === opt ? 'rgba(99,102,241,0.4)' : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}`,
                    color: outcome === opt ? '#6366F1' : textSec,
                  }}>
                  {opt}
                </Box>
              ))}
            </Box>
          </Box>
          <TextField
            size="small" multiline rows={3}
            label="Final Note (optional)" value={finalNote}
            onChange={e => setFinalNote(e.target.value)} fullWidth
            placeholder="บันทึกสรุปก่อนปิดเคส..."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 12 } }}
          />
        </Stack>
      </Box>

      {/* Close button */}
      {!requiredChecked && (
        <Box className="flex items-center gap-2 px-3 py-2 rounded-lg"
          sx={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <WarningAmberRoundedIcon sx={{ fontSize: 14, color: '#EAB308' }} />
          <Typography sx={{ fontSize: 10.5, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)' }}>
            กรุณาทำเครื่องหมาย checklist ที่จำเป็นให้ครบก่อนปิดเคส
          </Typography>
        </Box>
      )}

      <Button
        variant="contained" size="medium"
        startIcon={closeMut.isPending ? <CircularProgress size={16} color="inherit" /> : <LockRoundedIcon />}
        disabled={!requiredChecked || closeMut.isPending}
        onClick={() => { if (window.confirm(`ยืนยันการปิดเคส "${caseData?.case_name}" ?\n\nOutcome: ${outcome}`)) closeMut.mutate() }}
        sx={{
          borderRadius: 2, fontSize: 13, fontWeight: 700, alignSelf: 'flex-start',
          background: requiredChecked ? '#22C55E' : '#64748B',
          '&:hover': { background: requiredChecked ? '#16A34A' : '#64748B' },
          '&.Mui-disabled': { opacity: 0.5 },
        }}
      >
        {closeMut.isPending ? 'กำลังปิดเคส...' : 'ปิดเคส'}
      </Button>
    </Stack>
  )
}
