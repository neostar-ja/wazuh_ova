import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Typography, Stack, Skeleton, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Alert, Collapse, Table, TableBody, TableCell,
  TableHead, TableRow, Tooltip, Link, CircularProgress, Divider,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import WorkspacesRoundedIcon from '@mui/icons-material/WorkspacesRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import EscalatorWarningRoundedIcon from '@mui/icons-material/EscalatorWarningRounded'
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecord'
import ScienceRoundedIcon from '@mui/icons-material/Science'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import { useSnackbar } from 'notistack'
import {
  soarApi,
  ShuffleWorkflow,
  ShuffleWorkflowType,
  TriggerPayload,
  TriggerResult,
  ShuffleActionHistoryItem,
} from '../../../services/soarApi'
import { hexRgb } from '../soarUtils'
import { BRAND, SEV_COLOR } from '../../ui/tokens'

// ── Workflow type classification ───────────────────────────────────────────────

function classifyWorkflow(wf: ShuffleWorkflow): ShuffleWorkflowType {
  const name = wf.name.toLowerCase()
  const tags = (wf.tags || []).map((t) => t.toLowerCase())
  const all = [...tags, name]
  if (all.some((t) => t.includes('block_port') || t.includes('blockport') || (t.includes('block') && t.includes('port')))) return 'block_port'
  if (all.some((t) => t.includes('block'))) return 'block_ip'
  if (all.some((t) => t.includes('escalat'))) return 'escalate'
  if (all.some((t) => t.includes('triage') || t.includes('wazuh') || t.includes('siem') || t.includes('alert_triage'))) return 'triage'
  if (all.some((t) => t.includes('enrich') || (t.includes('ioc') && t.includes('check')))) return 'enrichment'
  if (all.some((t) => t.includes('evidence') || t.includes('collect'))) return 'evidence'
  if (all.some((t) => t.includes('notify') || t.includes('notification') || t.includes('alert_owner'))) return 'notify'
  if (all.some((t) => t.includes('misp') && (t.includes('push') || t.includes('add') || t.includes('ioc')))) return 'misp_push'
  if (all.some((t) => t.includes('timeline'))) return 'timeline'
  if (all.some((t) => t.includes('investigate') || t.includes('playbook'))) return 'investigate'
  return 'unknown'
}

interface WfTypeMeta {
  color: string
  labelTh: string
  icon: React.ReactNode
  isBlock: boolean
  requiredFields: string[]
}

const WF_META: Record<ShuffleWorkflowType, WfTypeMeta> = {
  triage:      { color: '#14B8A6', labelTh: 'จัดประเภทแจ้งเตือน',   icon: <BugReportRoundedIcon />,         isBlock: false, requiredFields: ['reason'] },
  escalate:    { color: '#F59E0B', labelTh: 'ยกระดับเคส',            icon: <EscalatorWarningRoundedIcon />,  isBlock: false, requiredFields: ['reason'] },
  block_ip:    { color: '#EF4444', labelTh: 'จำลอง Block IP',        icon: <BlockRoundedIcon />,             isBlock: true,  requiredFields: ['target_value', 'reason'] },
  block_port:  { color: '#EF4444', labelTh: 'จำลอง Block Port',      icon: <BlockRoundedIcon />,             isBlock: true,  requiredFields: ['target_value', 'port', 'protocol', 'reason'] },
  enrichment:  { color: '#8B5CF6', labelTh: 'ตรวจสอบ IOC',           icon: <SearchRoundedIcon />,            isBlock: false, requiredFields: ['target_value'] },
  evidence:    { color: '#06B6D4', labelTh: 'เก็บ Evidence',         icon: <AssignmentRoundedIcon />,        isBlock: false, requiredFields: [] },
  notify:      { color: '#6366F1', labelTh: 'แจ้งเตือน',             icon: <NotificationsRoundedIcon />,     isBlock: false, requiredFields: ['reason'] },
  misp_push:   { color: '#EC4899', labelTh: 'Push IOC ไป MISP',      icon: <SecurityRoundedIcon />,          isBlock: false, requiredFields: ['target_value', 'target_type'] },
  timeline:    { color: '#10B981', labelTh: 'เพิ่ม Timeline',        icon: <AccountTreeRoundedIcon />,       isBlock: false, requiredFields: ['title', 'reason'] },
  investigate: { color: '#7C3AED', labelTh: 'สืบสวน',               icon: <SearchRoundedIcon />,            isBlock: false, requiredFields: ['target_value'] },
  manual:      { color: '#64748B', labelTh: 'Manual',                icon: <WorkspacesRoundedIcon />,        isBlock: false, requiredFields: [] },
  unknown:     { color: '#64748B', labelTh: 'ไม่ระบุ',               icon: <WorkspacesRoundedIcon />,        isBlock: false, requiredFields: [] },
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SimulationBanner({ isDark }: { isDark: boolean }) {
  return (
    <Box
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
      sx={{
        background: isDark ? 'rgba(234,179,8,0.08)' : 'rgba(234,179,8,0.06)',
        border: '1px solid rgba(234,179,8,0.3)',
      }}
    >
      <ScienceRoundedIcon sx={{ fontSize: 16, color: '#EAB308', flexShrink: 0 }} />
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#EAB308', letterSpacing: '0.05em' }}>
          SIMULATION ONLY — ระบบอยู่ในโหมดจำลองเท่านั้น
        </Typography>
        <Typography sx={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.6)' }}>
          Block IP / Block Port ทุก action จะไม่กระทบ Firewall หรือ Wazuh Active Response จริง
        </Typography>
      </Box>
    </Box>
  )
}

function ShuffleHealthBanner({
  shuffleHealth,
  shuffleUrl,
  workflowCount,
  isDark,
}: {
  shuffleHealth?: { status?: string; label?: string; connected?: boolean; configured?: boolean; detail?: Record<string, unknown> }
  shuffleUrl?: string
  workflowCount: number
  isDark: boolean
}) {
  const textMuted = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(60,40,100,0.45)'

  const status = shuffleHealth?.status ?? 'not_configured'
  const isConnected = shuffleHealth?.connected ?? false
  const isConfigured = shuffleHealth?.configured ?? false

  const dotColor =
    status === 'connected' ? '#22C55E'
    : status === 'error' ? '#EF4444'
    : status === 'degraded' ? '#EAB308'
    : '#64748B'

  if (!isConfigured) {
    return (
      <Box
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        sx={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.6)', border: '1px solid rgba(100,116,139,0.2)' }}
      >
        <SettingsRoundedIcon sx={{ fontSize: 20, color: '#64748B', opacity: 0.6 }} />
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033' }}>
            ยังไม่ได้ตั้งค่า Shuffle SOAR
          </Typography>
          <Typography sx={{ fontSize: 10, color: textMuted }}>
            กรุณาตั้งค่า <code style={{ fontSize: 9 }}>SHUFFLE_URL</code> และ{' '}
            <code style={{ fontSize: 9 }}>SHUFFLE_TOKEN</code> ใน .env แล้ว restart backend
          </Typography>
        </Box>
      </Box>
    )
  }

  if (!isConnected) {
    return (
      <Box
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        sx={{ background: isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <WifiOffRoundedIcon sx={{ fontSize: 20, color: '#EF4444', opacity: 0.7 }} />
        <Box className="flex-1 min-w-0">
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>
            Shuffle SOAR — ไม่สามารถเชื่อมต่อได้
          </Typography>
          {shuffleHealth?.detail?.error && (
            <Typography sx={{ fontSize: 10, color: textMuted }} className="truncate">
              {String(shuffleHealth.detail.error)}
            </Typography>
          )}
        </Box>
        {shuffleUrl && (
          <Link href={shuffleUrl} target="_blank" rel="noopener" underline="none"
            className="flex items-center gap-1 text-xs font-semibold shrink-0"
            sx={{ color: '#EF4444', '&:hover': { color: '#F87171' } }}>
            เปิด <OpenInNewRoundedIcon sx={{ fontSize: 12 }} />
          </Link>
        )}
      </Box>
    )
  }

  return (
    <Box
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
      sx={{ background: isDark ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)' }}
    >
      <Box className="flex items-center gap-1.5">
        <FiberManualRecordRoundedIcon sx={{ fontSize: 8, color: dotColor, animation: 'pulseGlow 2.5s ease-in-out infinite' }} />
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: dotColor }}>
          SHUFFLE CONNECTED
        </Typography>
      </Box>
      <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      {shuffleUrl && (
        <Typography sx={{ fontSize: 10, color: textMuted }} className="truncate flex-1">
          {shuffleUrl}
        </Typography>
      )}
      <Box className="flex items-center gap-1.5 px-2 py-0.5 rounded-full shrink-0"
        sx={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.25)' }}>
        <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#14B8A6' }}>
          {workflowCount} workflows
        </Typography>
      </Box>
      {shuffleUrl && (
        <Link href={shuffleUrl} target="_blank" rel="noopener" underline="none"
          className="flex items-center gap-1 shrink-0"
          sx={{ fontSize: 10, fontWeight: 600, color: '#22C55E', '&:hover': { color: '#4ADE80' } }}>
          เปิด Shuffle <OpenInNewRoundedIcon sx={{ fontSize: 11 }} />
        </Link>
      )}
    </Box>
  )
}

// ── Workflow Card ──────────────────────────────────────────────────────────────

function WorkflowCard({
  wf,
  onTrigger,
  isDark,
}: {
  wf: ShuffleWorkflow
  onTrigger: (wf: ShuffleWorkflow) => void
  isDark: boolean
}) {
  const wfType = classifyWorkflow(wf)
  const meta = WF_META[wfType]
  const color = meta.color
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'

  return (
    <Box
      className="rounded-2xl overflow-hidden transition-all duration-200 group"
      sx={{
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'}`,
        '&:hover': {
          border: `1px solid rgba(${hexRgb(color)},0.35)`,
          boxShadow: `0 4px 20px rgba(${hexRgb(color)},0.1)`,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box className="h-0.5" sx={{ background: `linear-gradient(90deg,${color}80,${color})` }} />
      <Box className="p-4">
        {/* Header */}
        <Box className="flex items-start justify-between gap-2 mb-2.5">
          <Box className="flex items-center gap-2.5">
            <Box className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              sx={{ background: `rgba(${hexRgb(color)},0.12)`, color }}>
              {meta.icon}
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
          <Box className="flex flex-col items-end gap-1 shrink-0">
            <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              sx={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <FiberManualRecordRoundedIcon sx={{ fontSize: 6, color: '#22C55E' }} />
              <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#22C55E' }}>ACTIVE</Typography>
            </Box>
            {meta.isBlock && (
              <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                sx={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}>
                <ScienceRoundedIcon sx={{ fontSize: 9, color: '#EAB308' }} />
                <Typography sx={{ fontSize: 8, fontWeight: 800, color: '#EAB308', letterSpacing: '0.04em' }}>
                  SIMULATION ONLY
                </Typography>
              </Box>
            )}
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

        {/* Tags + type badge */}
        <Box className="flex items-center gap-1.5 flex-wrap mb-3">
          <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            sx={{ background: `rgba(${hexRgb(color)},0.1)`, border: `1px solid rgba(${hexRgb(color)},0.25)` }}>
            <Box sx={{ color, fontSize: 11, display: 'flex' }}>{meta.icon}</Box>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color }}>{meta.labelTh}</Typography>
          </Box>
          {wf.tags?.slice(0, 2).map((tag) => (
            <Box key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
              sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)', color: textMuted }}>
              {tag}
            </Box>
          ))}
        </Box>

        {/* Trigger button */}
        <Button
          size="small"
          variant={meta.isBlock ? 'contained' : 'outlined'}
          startIcon={meta.isBlock ? <ScienceRoundedIcon sx={{ fontSize: 13 }} /> : <PlayArrowRoundedIcon sx={{ fontSize: 13 }} />}
          onClick={() => onTrigger(wf)}
          sx={{
            borderRadius: 2, fontSize: 11, fontWeight: 700, py: 0.5, px: 2,
            ...(meta.isBlock
              ? {
                  background: `rgba(${hexRgb(color)},0.15)`,
                  color,
                  border: `1px solid rgba(${hexRgb(color)},0.4)`,
                  boxShadow: 'none',
                  '&:hover': { background: `rgba(${hexRgb(color)},0.22)`, boxShadow: 'none' },
                }
              : {
                  borderColor: `rgba(${hexRgb(color)},0.4)`,
                  color,
                  '&:hover': { borderColor: color, background: `rgba(${hexRgb(color)},0.08)` },
                }),
          }}
        >
          {meta.isBlock
            ? wfType === 'block_port' ? 'จำลอง Block Port' : 'จำลอง Block IP'
            : 'เรียก Workflow'}
        </Button>
      </Box>
    </Box>
  )
}

// ── Trigger Dialog ─────────────────────────────────────────────────────────────

interface FormState {
  target_value: string
  target_type: string
  case_id: string
  analyst: string
  reason: string
  title: string
  severity: string
  port: string
  protocol: string
}

function WorkflowTriggerDialog({
  workflow,
  open,
  onClose,
  onSubmit,
  isDark,
}: {
  workflow: ShuffleWorkflow
  open: boolean
  onClose: () => void
  onSubmit: (payload: TriggerPayload) => Promise<TriggerResult>
  isDark: boolean
}) {
  const wfType = classifyWorkflow(workflow)
  const meta = WF_META[wfType]
  const color = meta.color
  const textMuted = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(60,40,100,0.45)'

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<TriggerResult | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const EMPTY_FORM: FormState = {
    target_value: '', target_type: 'ip', case_id: '', analyst: '',
    reason: '', title: '', severity: 'medium', port: '', protocol: 'tcp',
  }
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const update = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    for (const f of meta.requiredFields) {
      if (!form[f as keyof FormState]) errs[f] = 'จำเป็นต้องกรอก'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleClickTrigger = () => {
    if (!validate()) return
    if (meta.isBlock) { setConfirmOpen(true); return }
    doSubmit()
  }

  const doSubmit = async () => {
    setConfirmOpen(false)
    setSubmitting(true)
    try {
      const payload: TriggerPayload = {
        type: wfType === 'block_ip' ? 'block' : wfType,
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        workflow_type: wfType,
        target_value: form.target_value || undefined,
        target_type: form.target_type || undefined,
        case_id: form.case_id ? parseInt(form.case_id, 10) : undefined,
        analyst: form.analyst || undefined,
        reason: form.reason || undefined,
        title: form.title || undefined,
        severity: form.severity || undefined,
        source: 'soar_shuffle_tab',
        ...(meta.isBlock && {
          ip: form.target_value,
          target_ip: form.target_value,
          simulation: true,
          dry_run: true,
        }),
        ...(wfType === 'block_port' && {
          port: form.port ? parseInt(form.port, 10) : undefined,
          protocol: form.protocol || undefined,
        }),
      }
      const res = await onSubmit(payload)
      setResult(res)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setResult(null)
    setConfirmOpen(false)
    setForm(EMPTY_FORM)
    setErrors({})
    onClose()
  }

  // ── Confirmation dialog for block types ─────────────────────────────────────
  if (confirmOpen) {
    return (
      <Dialog open maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, background: isDark ? '#1A1033' : '#FAF8FF', border: '1px solid rgba(239,68,68,0.3)' } }}>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 800, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <WarningAmberRoundedIcon sx={{ fontSize: 20 }} />
          ยืนยันการจำลอง {wfType === 'block_port' ? 'Block Port' : 'Block IP'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, fontSize: 12, '& .MuiAlert-icon': { fontSize: 18 } }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700 }}>ยืนยันการจำลองเท่านั้น</Typography>
            <Typography sx={{ fontSize: 11 }}>
              ระบบจะ<strong>ไม่</strong>เปลี่ยนแปลง Firewall หรือ Wazuh Active Response จริง
            </Typography>
          </Alert>
          <Box sx={{ p: 1.5, borderRadius: 1.5, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.6)', border: '1px solid rgba(100,116,139,0.15)' }}>
            {form.target_value && (
              <Typography sx={{ fontSize: 11, mb: 0.5 }}>
                <strong>Target:</strong> {form.target_value}
                {wfType === 'block_port' && ` port ${form.port}/${form.protocol}`}
              </Typography>
            )}
            {form.reason && <Typography sx={{ fontSize: 11, mb: 0.5 }}><strong>Reason:</strong> {form.reason}</Typography>}
            {form.case_id && <Typography sx={{ fontSize: 11 }}><strong>Case ID:</strong> {form.case_id}</Typography>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} size="small" sx={{ borderRadius: 2 }}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color="warning"
            size="small"
            startIcon={<ScienceRoundedIcon sx={{ fontSize: 14 }} />}
            onClick={doSubmit}
            sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, boxShadow: 'none' }}
          >
            ยืนยัน จำลองเท่านั้น
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  // ── Result view ──────────────────────────────────────────────────────────────
  if (result) {
    const ok = result.ok
    const isSimulation = result.mode === 'simulation'
    return (
      <Dialog open maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, background: isDark ? '#1A1033' : '#FAF8FF' } }}>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 800, color: isDark ? '#EDE9FA' : '#1A1033', display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          {ok ? <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#22C55E' }} /> : <ErrorRoundedIcon sx={{ fontSize: 20, color: '#EF4444' }} />}
          {ok ? 'สำเร็จ' : 'เกิดข้อผิดพลาด'}
        </DialogTitle>
        <DialogContent>
          {isSimulation && (
            <Alert severity="warning" sx={{ mb: 2, fontSize: 11 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700 }}>จำลองการ {wfType === 'block_port' ? 'Block Port' : 'Block IP'} แล้ว</Typography>
              <Typography sx={{ fontSize: 11 }}>
                {result.message_th || result.message}
              </Typography>
            </Alert>
          )}
          {!isSimulation && ok && (
            <Alert severity="success" sx={{ mb: 2, fontSize: 11 }}>
              <Typography sx={{ fontSize: 11 }}>ส่ง trigger ไปยัง Shuffle เรียบร้อยแล้ว</Typography>
            </Alert>
          )}
          {!ok && (
            <Alert severity="error" sx={{ mb: 2, fontSize: 11 }}>
              <Typography sx={{ fontSize: 11 }}>{result.message}</Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: 11 }}>
            {result.target && (
              <Typography sx={{ fontSize: 11 }}><strong>Target:</strong> {result.target}</Typography>
            )}
            {result.execution_id && (
              <Typography sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                <strong>Execution ID:</strong> {result.execution_id}
              </Typography>
            )}
            {result.action_id && (
              <Typography sx={{ fontSize: 11 }}>
                <strong>Action ID:</strong> #{result.action_id} (บันทึกใน history แล้ว)
              </Typography>
            )}
            {result.iris_note_added !== undefined && (
              <Typography sx={{ fontSize: 11, color: result.iris_note_added ? '#22C55E' : '#64748B' }}>
                <strong>IRIS Note:</strong> {result.iris_note_added ? 'เพิ่ม note ใน Case แล้ว' : 'ไม่ได้ผูกกับ Case'}
              </Typography>
            )}
          </Box>

          {/* Quick links */}
          <Box className="flex items-center gap-2 mt-3 flex-wrap">
            {result.case_id && (
              <Link
                href={`#/soar/case/${result.case_id}`}
                underline="none"
                className="flex items-center gap-1 text-xs font-semibold"
                sx={{ color: BRAND.purple, '&:hover': { opacity: 0.8 } }}
              >
                <LinkRoundedIcon sx={{ fontSize: 13 }} /> เปิด IRIS Case #{result.case_id}
              </Link>
            )}
            {result.target && (
              <Link
                href={`#/investigate?q=${encodeURIComponent(result.target)}`}
                underline="none"
                className="flex items-center gap-1 text-xs font-semibold"
                sx={{ color: '#06B6D4', '&:hover': { opacity: 0.8 } }}
              >
                <SearchRoundedIcon sx={{ fontSize: 13 }} /> Investigate
              </Link>
            )}
            {result.target && (
              <Link
                href={`#/ioc?q=${encodeURIComponent(result.target)}`}
                underline="none"
                className="flex items-center gap-1 text-xs font-semibold"
                sx={{ color: '#8B5CF6', '&:hover': { opacity: 0.8 } }}
              >
                <SecurityRoundedIcon sx={{ fontSize: 13 }} /> IOC Check
              </Link>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} size="small" variant="contained" sx={{ borderRadius: 2, fontSize: 11, boxShadow: 'none' }}>
            ปิด
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  // ── Form view ────────────────────────────────────────────────────────────────
  const inputSx = {
    '& .MuiInputBase-root': { fontSize: 12, borderRadius: 1.5 },
    '& .MuiInputLabel-root': { fontSize: 12 },
  }

  const targetLabel = wfType === 'block_ip' ? 'IP Address (เป้าหมาย)' :
    wfType === 'block_port' ? 'IP Address (เป้าหมาย)' :
    wfType === 'enrichment' ? 'IOC Value (IP/Domain/Hash)' :
    wfType === 'misp_push' ? 'IOC Value' :
    wfType === 'investigate' ? 'Entity (IP/Domain/Host)' : 'Target Value'

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: isDark ? '#1A1033' : '#FAF8FF',
          border: `1px solid rgba(${hexRgb(color)},0.2)`,
        },
      }}
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        <Box className="flex items-center gap-2">
          <Box sx={{ color, display: 'flex' }}>{meta.icon}</Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: isDark ? '#EDE9FA' : '#1A1033' }}>
              {workflow.name}
            </Typography>
            <Typography sx={{ fontSize: 10, color: meta.color, fontWeight: 600 }}>
              {meta.labelTh}
            </Typography>
          </Box>
        </Box>
        {meta.isBlock && (
          <Alert severity="warning" icon={<ScienceRoundedIcon fontSize="small" />} sx={{ mt: 1.5, py: 0.5, fontSize: 11, '& .MuiAlert-message': { fontSize: 11 } }}>
            <strong>SIMULATION ONLY</strong> — ไม่มีการ Block จริง ไม่เปลี่ยนแปลง Firewall หรือ Wazuh Active Response
          </Alert>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Workflow ID */}
        <Typography sx={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(60,40,100,0.3)', fontFamily: 'monospace' }}>
          ID: {workflow.id}
        </Typography>

        {/* Target value */}
        {(wfType !== 'escalate' && wfType !== 'timeline') && (
          <TextField
            label={targetLabel}
            value={form.target_value}
            onChange={(e) => update('target_value', e.target.value)}
            size="small"
            fullWidth
            required={meta.requiredFields.includes('target_value')}
            error={!!errors.target_value}
            helperText={errors.target_value}
            placeholder={wfType === 'block_ip' || wfType === 'block_port' ? 'เช่น 80.82.77.139' : ''}
            sx={inputSx}
          />
        )}

        {/* Target type */}
        {(wfType === 'enrichment' || wfType === 'misp_push' || wfType === 'investigate') && (
          <FormControl size="small" fullWidth sx={inputSx}>
            <InputLabel>Target Type</InputLabel>
            <Select value={form.target_type} onChange={(e) => update('target_type', e.target.value as string)} label="Target Type">
              <MenuItem value="ip">IP Address</MenuItem>
              <MenuItem value="domain">Domain</MenuItem>
              <MenuItem value="hash">Hash (MD5/SHA256)</MenuItem>
              <MenuItem value="url">URL</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Port + Protocol for block_port */}
        {wfType === 'block_port' && (
          <Box className="flex gap-2">
            <TextField
              label="Port"
              value={form.port}
              onChange={(e) => update('port', e.target.value)}
              size="small"
              type="number"
              required
              error={!!errors.port}
              helperText={errors.port}
              placeholder="เช่น 445"
              sx={{ ...inputSx, flex: 1 }}
              inputProps={{ min: 1, max: 65535 }}
            />
            <FormControl size="small" sx={{ ...inputSx, flex: 1 }}>
              <InputLabel>Protocol</InputLabel>
              <Select value={form.protocol} onChange={(e) => update('protocol', e.target.value as string)} label="Protocol">
                <MenuItem value="tcp">TCP</MenuItem>
                <MenuItem value="udp">UDP</MenuItem>
                <MenuItem value="any">Any</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Title (for timeline type) */}
        {wfType === 'timeline' && (
          <TextField
            label="Event Title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            size="small"
            fullWidth
            required
            error={!!errors.title}
            helperText={errors.title}
            sx={inputSx}
          />
        )}

        {/* Case ID */}
        <TextField
          label="Case ID (DFIR-IRIS)"
          value={form.case_id}
          onChange={(e) => update('case_id', e.target.value)}
          size="small"
          type="number"
          fullWidth
          placeholder="เช่น 42 (ถ้าไม่ระบุจะไม่ผูก Case)"
          sx={inputSx}
        />

        {/* Analyst */}
        <TextField
          label="Analyst"
          value={form.analyst}
          onChange={(e) => update('analyst', e.target.value)}
          size="small"
          fullWidth
          placeholder="ชื่อ analyst"
          sx={inputSx}
        />

        {/* Reason */}
        <TextField
          label="Reason / หมายเหตุ"
          value={form.reason}
          onChange={(e) => update('reason', e.target.value)}
          size="small"
          fullWidth
          multiline
          rows={2}
          required={meta.requiredFields.includes('reason')}
          error={!!errors.reason}
          helperText={errors.reason}
          placeholder="อธิบายเหตุผลที่ trigger workflow นี้"
          sx={inputSx}
        />

        {/* Severity */}
        {(wfType === 'triage' || wfType === 'escalate') && (
          <FormControl size="small" fullWidth sx={inputSx}>
            <InputLabel>Severity</InputLabel>
            <Select value={form.severity} onChange={(e) => update('severity', e.target.value as string)} label="Severity">
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={handleClose} size="small" disabled={submitting} sx={{ borderRadius: 2 }}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          size="small"
          disabled={submitting}
          startIcon={
            submitting
              ? <CircularProgress size={12} color="inherit" />
              : meta.isBlock
              ? <ScienceRoundedIcon sx={{ fontSize: 13 }} />
              : <PlayArrowRoundedIcon sx={{ fontSize: 13 }} />
          }
          onClick={handleClickTrigger}
          sx={{
            borderRadius: 2, fontSize: 11, fontWeight: 700, boxShadow: 'none',
            background: meta.isBlock ? `rgba(${hexRgb(color)},0.8)` : color,
            '&:hover': { background: color, boxShadow: 'none' },
          }}
        >
          {meta.isBlock
            ? wfType === 'block_port' ? 'จำลอง Block Port' : 'จำลอง Block IP'
            : 'เรียก Workflow'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Action History Table ───────────────────────────────────────────────────────

function ActionHistorySection({
  actions,
  isLoading,
  onRefresh,
  isDark,
}: {
  actions: ShuffleActionHistoryItem[]
  isLoading: boolean
  onRefresh: () => void
  isDark: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'

  return (
    <Box
      className="rounded-2xl overflow-hidden"
      sx={{
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.7)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'}`,
      }}
    >
      {/* Header */}
      <Box
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
        sx={{ borderBottom: expanded ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}` : 'none' }}
      >
        <Box className="flex items-center gap-2">
          <HistoryRoundedIcon sx={{ fontSize: 14, color: '#8B5CF6' }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033' }}>
            Action History
          </Typography>
          <Box className="px-2 py-0.5 rounded-full"
            sx={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
            <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#8B5CF6' }}>{actions.length}</Typography>
          </Box>
        </Box>
        <Box className="flex items-center gap-1">
          <Tooltip title="รีเฟรช">
            <Box
              component="span"
              onClick={(e) => { e.stopPropagation(); onRefresh() }}
              className="flex items-center justify-center w-6 h-6 rounded-lg cursor-pointer"
              sx={{ '&:hover': { background: 'rgba(255,255,255,0.05)' } }}
            >
              <RefreshRoundedIcon sx={{ fontSize: 13, color: textMuted }} />
            </Box>
          </Tooltip>
          {expanded ? <ExpandLessRoundedIcon sx={{ fontSize: 16, color: textMuted }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: textMuted }} />}
        </Box>
      </Box>

      <Collapse in={expanded}>
        {isLoading ? (
          <Box className="px-4 py-3 flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={32} sx={{ borderRadius: 1, bgcolor: 'rgba(255,255,255,0.04)' }} />
            ))}
          </Box>
        ) : actions.length === 0 ? (
          <Box className="py-8 flex flex-col items-center gap-2">
            <HourglassEmptyRoundedIcon sx={{ fontSize: 32, color: textMuted, opacity: 0.4 }} />
            <Typography sx={{ fontSize: 12, color: textMuted }}>ยังไม่มี action history</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  {['เวลา', 'Workflow', 'Target', 'Case', 'Mode', 'Status', 'Analyst'].map((h) => (
                    <TableCell key={h} sx={{ fontSize: 10, fontWeight: 700, color: textMuted, py: 1, px: 2, whiteSpace: 'nowrap', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.08)' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {actions.map((action) => {
                  const isSimulation = action.response_mode === 'simulation'
                  const ok = action.response_ok
                  const wfType = (action.workflow_type || action.action_type) as ShuffleWorkflowType
                  const typeMeta = WF_META[wfType] ?? WF_META.unknown
                  const ts = action.created_at
                    ? new Date(action.created_at + 'Z').toLocaleString('th-TH', {
                        dateStyle: 'short', timeStyle: 'short',
                      })
                    : '—'

                  return (
                    <TableRow key={action.id} hover sx={{ '& td': { borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.07)', py: 0.75, px: 2 } }}>
                      <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: textMuted, whiteSpace: 'nowrap' }}>
                        {ts}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Box className="flex items-center gap-1">
                          <Box sx={{ color: typeMeta.color, fontSize: 13, display: 'flex' }}>{typeMeta.icon}</Box>
                          <Typography sx={{ fontSize: 10, fontWeight: 600, color: isDark ? '#EDE9FA' : '#1A1033' }}>
                            {action.workflow_name || action.action_type}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: isDark ? '#CBD5E1' : '#334155', maxWidth: 120 }}>
                        <Typography sx={{ fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                          {action.target || '—'}
                          {action.port ? `:${action.port}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 10, color: textMuted }}>
                        {action.iris_case_id ? `#${action.iris_case_id}` : '—'}
                      </TableCell>
                      <TableCell>
                        {isSimulation ? (
                          <Box className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                            sx={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}>
                            <ScienceRoundedIcon sx={{ fontSize: 9, color: '#EAB308' }} />
                            <Typography sx={{ fontSize: 8, fontWeight: 800, color: '#EAB308' }}>SIM</Typography>
                          </Box>
                        ) : (
                          <Box className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                            sx={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                            <Typography sx={{ fontSize: 8, fontWeight: 800, color: '#EF4444' }}>PROD</Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box className="inline-flex items-center gap-0.5">
                          {ok
                            ? <CheckCircleRoundedIcon sx={{ fontSize: 13, color: isSimulation ? '#EAB308' : '#22C55E' }} />
                            : <ErrorRoundedIcon sx={{ fontSize: 13, color: '#EF4444' }} />}
                          <Typography sx={{ fontSize: 9, color: ok ? (isSimulation ? '#EAB308' : '#22C55E') : '#EF4444', fontWeight: 700 }}>
                            {ok ? (isSimulation ? 'SIMULATED' : 'SUCCESS') : 'FAILED'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 10, color: textMuted }}>
                        {action.analyst || action.created_by || '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Collapse>
    </Box>
  )
}

// ── Approval Workflow Section ──────────────────────────────────────────────────

function ApprovalSection({ isDark }: { isDark: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'

  return (
    <Box
      className="rounded-2xl overflow-hidden"
      sx={{
        background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(248,246,255,0.5)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.08)'}`,
      }}
    >
      <Box
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <Box className="flex items-center gap-2">
          <LockRoundedIcon sx={{ fontSize: 14, color: '#64748B' }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: textMuted }}>
            Production Response Approval
          </Typography>
          <Box className="px-2 py-0.5 rounded-full"
            sx={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }}>
            <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#64748B' }}>DISABLED</Typography>
          </Box>
        </Box>
        {expanded ? <ExpandLessRoundedIcon sx={{ fontSize: 16, color: textMuted }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: textMuted }} />}
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.07)'}`, px: 4, py: 3 }}>
          <Alert severity="info" sx={{ mb: 2, fontSize: 11, '& .MuiAlert-message': { fontSize: 11 } }}>
            <strong>Production response ยังไม่เปิดใช้งาน</strong>
            <br />
            ต้องผ่าน approval และ verification ก่อนจึงจะสามารถดำเนินการ production block ได้
          </Alert>

          <Typography sx={{ fontSize: 11, color: textMuted, mb: 2 }}>
            โครงสร้างสำหรับ production approval workflow (พร้อมใช้งานในอนาคต):
          </Typography>

          <Box className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: 'Request Approval', desc: 'ส่งคำขออนุมัติสำหรับ production action', enabled: false },
              { label: 'View Approval Status', desc: 'ตรวจสอบสถานะคำขออนุมัติ', enabled: false },
              { label: 'Execute Production Block', desc: 'ดำเนินการ block จริง (ต้องได้รับอนุมัติก่อน)', enabled: false },
              { label: 'Rollback Plan', desc: 'แผนการ rollback กรณีจำเป็น', enabled: false },
            ].map(({ label, desc, enabled }) => (
              <Box key={label} className="flex items-start gap-2 p-2.5 rounded-lg"
                sx={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.5)', border: '1px solid rgba(100,116,139,0.15)', opacity: 0.7 }}>
                <LockRoundedIcon sx={{ fontSize: 13, color: '#64748B', mt: 0.25 }} />
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: textMuted }}>{label}</Typography>
                  <Typography sx={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(60,40,100,0.35)' }}>{desc}</Typography>
                </Box>
                {!enabled && (
                  <Box className="ml-auto shrink-0 px-1.5 py-0.5 rounded-full"
                    sx={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
                    <Typography sx={{ fontSize: 8, color: '#64748B', fontWeight: 700 }}>DISABLED</Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  shuffleUrl?: string
}

export default function ShuffleTab({ shuffleUrl }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()

  const [dialogWorkflow, setDialogWorkflow] = useState<ShuffleWorkflow | null>(null)

  // Health data (includes Shuffle integration status)
  const { data: healthData } = useQuery({
    queryKey: ['soar-health'],
    queryFn: () => soarApi.getHealth().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  // Workflows
  const { data: workflows = [], isLoading: wfLoading } = useQuery<ShuffleWorkflow[]>({
    queryKey: ['shuffle-workflows'],
    queryFn: () => soarApi.getShuffleWorkflows().then((r) => r.data),
    refetchInterval: 120_000,
  })

  // Action history
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['shuffle-action-history'],
    queryFn: () => soarApi.getAllShuffleActions({ limit: 100 }).then((r) => r.data),
    refetchInterval: 30_000,
  })

  const shuffleHealth = healthData?.integrations?.find((i: { id: string }) => i.id === 'shuffle')

  const triggerMut = useMutation({
    mutationFn: (payload: TriggerPayload) =>
      soarApi.triggerWorkflow(payload).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shuffle-action-history'] })
      if (data.mode === 'simulation') {
        enqueueSnackbar(
          data.message_th || 'จำลองการ Block เรียบร้อยแล้ว — ไม่มีการเปลี่ยนแปลง Firewall หรือ Wazuh Active Response จริง',
          { variant: 'warning', persist: false }
        )
      } else if (data.ok) {
        enqueueSnackbar('ส่ง trigger ไปยัง Shuffle เรียบร้อยแล้ว', { variant: 'success' })
      }
    },
    onError: () => {
      enqueueSnackbar('ไม่สามารถ trigger workflow ได้', { variant: 'error' })
    },
  })

  const handleTrigger = async (payload: TriggerPayload): Promise<TriggerResult> => {
    return await triggerMut.mutateAsync(payload)
  }

  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'

  return (
    <Stack spacing={2.5} className="animate-fade-in">
      {/* Shuffle health banner */}
      <ShuffleHealthBanner
        shuffleHealth={shuffleHealth}
        shuffleUrl={shuffleUrl}
        workflowCount={workflows.length}
        isDark={isDark}
      />

      {/* Simulation-only permanent banner */}
      <SimulationBanner isDark={isDark} />

      {/* Section header */}
      <Box className="flex items-center justify-between flex-wrap gap-2">
        <Box className="flex items-center gap-2.5">
          <WorkspacesRoundedIcon sx={{ fontSize: 16, color: '#14B8A6' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: isDark ? '#E2E8F0' : '#1A1033' }}>
            Workflow Inventory
          </Typography>
          {!wfLoading && (
            <Box className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              sx={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }}>
              {workflows.length} workflows
            </Box>
          )}
        </Box>
      </Box>

      {/* Workflow grid */}
      {wfLoading ? (
        <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={160} sx={{ borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.04)' }} />
          ))}
        </Box>
      ) : workflows.length === 0 ? (
        <Box className="py-12 flex flex-col items-center gap-3">
          <WorkspacesRoundedIcon sx={{ fontSize: 36, color: textMuted, opacity: 0.35 }} />
          <Typography sx={{ fontSize: 13, color: textMuted }}>
            {shuffleHealth?.configured ? 'ไม่พบ Workflow ใน Shuffle' : 'ยังไม่ได้ตั้งค่า Shuffle SOAR'}
          </Typography>
          {!shuffleHealth?.configured && (
            <Typography sx={{ fontSize: 11, color: textMuted, textAlign: 'center', maxWidth: 340 }}>
              กรุณาตั้งค่า SHUFFLE_URL และ SHUFFLE_TOKEN ใน .env
            </Typography>
          )}
        </Box>
      ) : (
        <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {workflows.map((wf) => (
            <WorkflowCard
              key={wf.id}
              wf={wf}
              onTrigger={(w) => setDialogWorkflow(w)}
              isDark={isDark}
            />
          ))}
        </Box>
      )}

      {/* Standard workflow types reference */}
      <Box
        className="rounded-xl px-4 py-3"
        sx={{
          background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(248,246,255,0.5)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.08)'}`,
        }}
      >
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: textMuted, mb: 1.5, letterSpacing: '0.06em' }}>
          STANDARD WORKFLOW TYPES (จำแนกจากชื่อและ tags อัตโนมัติ)
        </Typography>
        <Box className="flex flex-wrap gap-1.5">
          {(Object.entries(WF_META) as [ShuffleWorkflowType, WfTypeMeta][])
            .filter(([k]) => k !== 'unknown' && k !== 'manual')
            .map(([key, m]) => (
              <Box key={key} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                sx={{ background: `rgba(${hexRgb(m.color)},0.1)`, border: `1px solid rgba(${hexRgb(m.color)},0.2)` }}>
                <Box sx={{ color: m.color, fontSize: 11, display: 'flex' }}>{m.icon}</Box>
                <Typography sx={{ fontSize: 9.5, fontWeight: 600, color: m.color }}>
                  {m.labelTh}
                  {m.isBlock && ' ⚗'}
                </Typography>
              </Box>
            ))}
        </Box>
      </Box>

      {/* Action History */}
      <ActionHistorySection
        actions={historyData?.actions ?? []}
        isLoading={historyLoading}
        onRefresh={() => refetchHistory()}
        isDark={isDark}
      />

      {/* Approval section */}
      <ApprovalSection isDark={isDark} />

      {/* Trigger Dialog */}
      {dialogWorkflow && (
        <WorkflowTriggerDialog
          workflow={dialogWorkflow}
          open={!!dialogWorkflow}
          onClose={() => setDialogWorkflow(null)}
          onSubmit={handleTrigger}
          isDark={isDark}
        />
      )}
    </Stack>
  )
}
