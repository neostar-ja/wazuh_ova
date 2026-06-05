import {
  Box, Button, Chip, CircularProgress, Divider, Stack, TextField,
  Typography, Alert, Autocomplete, Link,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import CasesRoundedIcon from '@mui/icons-material/CasesRounded'
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import api from '../../../services/api'
import { soarApi } from '../../../services/soarApi'

interface Props {
  query: string
  entityType: string
  irisConfigured: boolean
  shuffleConfigured: boolean
  events?: unknown[]
  mitre?: { tactics: string[]; techniques: string[] }
}

type ActionStatus = 'idle' | 'running' | 'success' | 'error' | 'partial'

interface ActionResult {
  status: ActionStatus
  message?: string
  link?: string
  mode?: string
  caseId?: number
  alertId?: number
  executionId?: string
}

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`
}

// ── Action Card ────────────────────────────────────────────────────────────────

function ActionCard({
  icon, title, description, available, actionLabel, result, onAction, children, color, warningBadge,
}: {
  icon: React.ReactNode
  title: string
  description: string
  available: boolean
  actionLabel: string
  result: ActionResult
  onAction: () => void
  children?: React.ReactNode
  color: string
  warningBadge?: React.ReactNode
}) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'
  const textSec = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'

  return (
    <Box
      className="p-4 rounded-xl transition-all duration-200"
      sx={{
        background: available
          ? isDark ? `rgba(${hexRgb(color)},0.05)` : `rgba(${hexRgb(color)},0.03)`
          : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.5)',
        border: `1px solid ${available ? `rgba(${hexRgb(color)},0.2)` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}`,
        opacity: available ? 1 : 0.5,
      }}
    >
      <Box className="flex items-start gap-3">
        <Box className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          sx={{ background: available ? `rgba(${hexRgb(color)},0.1)` : 'rgba(255,255,255,0.04)', color: available ? color : '#64748B' }}>
          {icon}
        </Box>
        <Box className="flex-1 min-w-0">
          <Box className="flex items-center flex-wrap gap-2 mb-1">
            <Typography className="font-semibold text-[12px]"
              sx={{ color: available ? (isDark ? '#EDE9FA' : '#1A1033') : textMuted }}>
              {title}
            </Typography>
            {!available && (
              <Chip label="ยังไม่ได้ตั้งค่า" size="small"
                sx={{ height: 16, fontSize: 9, bgcolor: 'rgba(100,116,139,0.12)', color: '#64748B', border: 'none' }} />
            )}
            {warningBadge}
          </Box>
          <Typography sx={{ fontSize: 11, color: textSec, lineHeight: 1.5, mb: children ? 1.5 : 0 }}>
            {description}
          </Typography>

          {children}

          {/* Result display */}
          {result.status !== 'idle' && (
            <Box className="mt-2 flex flex-wrap items-center gap-2">
              {result.status === 'running' && (
                <Box className="flex items-center gap-1.5">
                  <CircularProgress size={12} sx={{ color }} />
                  <Typography sx={{ fontSize: 10, color }}>กำลังดำเนินการ…</Typography>
                </Box>
              )}
              {result.status === 'success' && (
                <Box className="flex flex-wrap items-center gap-1.5">
                  <CheckCircleRoundedIcon sx={{ fontSize: 13, color: '#22C55E' }} />
                  <Typography sx={{ fontSize: 10, color: '#22C55E' }}>{result.message || 'สำเร็จ'}</Typography>
                  {result.mode === 'simulation' && (
                    <Chip label="SIMULATION" size="small"
                      sx={{ height: 14, fontSize: 8, fontWeight: 700, bgcolor: 'rgba(234,179,8,0.15)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)' }} />
                  )}
                  {result.caseId && (
                    <Chip label={`Case #${result.caseId}`} size="small" icon={<FolderOpenRoundedIcon sx={{ fontSize: 10 }} />}
                      sx={{ height: 14, fontSize: 9, bgcolor: 'rgba(168,85,247,0.1)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.3)' }} />
                  )}
                  {result.executionId && (
                    <Chip label={`exec: ${result.executionId.slice(0, 8)}`} size="small"
                      sx={{ height: 14, fontSize: 9, fontFamily: 'monospace', bgcolor: 'rgba(34,197,94,0.1)', color: '#22C55E', border: 'none' }} />
                  )}
                </Box>
              )}
              {result.status === 'partial' && (
                <Box className="flex flex-wrap items-center gap-1.5">
                  <WarningAmberRoundedIcon sx={{ fontSize: 13, color: '#EAB308' }} />
                  <Typography sx={{ fontSize: 10, color: '#EAB308' }}>{result.message}</Typography>
                  {result.alertId && (
                    <Chip label={`Alert #${result.alertId}`} size="small"
                      sx={{ height: 14, fontSize: 9, bgcolor: 'rgba(234,179,8,0.1)', color: '#EAB308', border: 'none' }} />
                  )}
                </Box>
              )}
              {result.status === 'error' && (
                <Box className="flex flex-wrap items-center gap-1.5">
                  <ErrorRoundedIcon sx={{ fontSize: 13, color: '#EF4444' }} />
                  <Typography sx={{ fontSize: 10, color: '#EF4444' }}>{result.message || 'เกิดข้อผิดพลาด'}</Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Action button */}
          <Box className="mt-2.5">
            <Button
              size="small" variant="outlined"
              disabled={!available || result.status === 'running'}
              onClick={onAction}
              startIcon={result.status === 'running' ? <CircularProgress size={12} /> : undefined}
              sx={{
                fontSize: 11, px: 2, py: 0.5, borderRadius: 1.5, textTransform: 'none',
                borderColor: available ? `rgba(${hexRgb(color)},0.4)` : 'rgba(255,255,255,0.1)',
                color: available ? color : '#64748B',
                '&:hover': { borderColor: color, background: `rgba(${hexRgb(color)},0.06)` },
                '&.Mui-disabled': { opacity: 0.4 },
              }}
            >
              {result.status === 'running' ? 'กำลังดำเนินการ…' : actionLabel}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ActionsTab({
  query, entityType, irisConfigured, shuffleConfigured, events = [], mitre,
}: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'
  const textSec = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'

  const [caseTitle, setCaseTitle] = useState(`[INVESTIGATE] ${query}`)
  const [analyst, setAnalyst] = useState('')
  const [manualCaseId, setManualCaseId] = useState<number | null>(null)
  const [results, setResults] = useState<Record<string, ActionResult>>({})

  const setResult = (key: string, res: ActionResult) =>
    setResults(prev => ({ ...prev, [key]: res }))
  const getResult = (key: string): ActionResult =>
    results[key] ?? { status: 'idle' }

  // Effective case ID = newly created OR manually selected
  const createdCaseId = getResult('create_case').caseId ?? null
  const effectiveCaseId = createdCaseId ?? manualCaseId

  // Load existing IRIS cases for dropdown selector
  const { data: casesData } = useQuery({
    queryKey: ['iris-cases-for-select'],
    queryFn: () => soarApi.getIrisCases({ per_page: 20 }).then(r => r.data),
    enabled: irisConfigured,
    staleTime: 5 * 60_000,
  })
  const existingCases: { case_id: number; case_name: string }[] =
    (casesData?.data as { case_id: number; case_name: string }[] | undefined) ?? []

  const IRIS_URL = 'https://10.251.151.15:443'

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateIrisCase = async () => {
    setResult('create_case', { status: 'running' })
    try {
      const r = await api.post('/soar/iris/cases', {
        case_name: caseTitle,
        case_description: [
          `Investigation Workbench case for entity: ${query}`,
          `Type: ${entityType}`,
          `MITRE Tactics: ${(mitre?.tactics ?? []).join(', ') || 'N/A'}`,
          `Total Events: ${events.length}`,
          `Generated by SOC Center`,
        ].join('\n'),
        customer_id: 1,
      })

      const caseId: number | null = r.data?.case_id ?? r.data?.data?.case_id ?? null
      const alertId: number | null = r.data?.alert_id ?? r.data?.data?.alert_id ?? null
      const isPartial = r.data?.status === 'partial' || r.data?._soc_fallback

      if (caseId) {
        setResult('create_case', {
          status: 'success',
          message: `Case #${caseId} สร้างแล้ว`,
          caseId,
          link: `${IRIS_URL}/#/case/${caseId}`,
        })
      } else if (isPartial && alertId) {
        setResult('create_case', {
          status: 'partial',
          message: `IRIS ไม่สามารถสร้าง Case ได้ สร้าง Alert #${alertId} แทน — กรุณา escalate ใน IRIS`,
          alertId,
        })
      } else {
        // Total failure — show error with instructions
        const errMsg = r.data?.error ?? r.data?.message ?? ''
        setResult('create_case', {
          status: 'error',
          message: `IRIS ไม่สามารถสร้าง Case ได้ (${errMsg.slice(0, 60)}) — ระบุ Case ID ที่มีอยู่ด้านล่าง`,
        })
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'ไม่สามารถสร้าง case ได้'
      setResult('create_case', { status: 'error', message: msg })
    }
  }

  const handleAttachEvidence = async () => {
    if (!effectiveCaseId) {
      setResult('attach_evidence', { status: 'error', message: 'กรุณาสร้าง Case หรือระบุ Case ID ก่อน' })
      return
    }
    setResult('attach_evidence', { status: 'running' })
    try {
      const content = [
        `## Investigation Evidence: ${query}`,
        ``,
        `**Entity:** \`${query}\` (${entityType})`,
        `**Time Range:** 30 days`,
        `**Total Events:** ${events.length}`,
        `**MITRE Tactics:** ${(mitre?.tactics ?? []).join(', ') || 'N/A'}`,
        `**MITRE Techniques:** ${(mitre?.techniques ?? []).slice(0, 5).join(', ') || 'N/A'}`,
        ``,
        `### Sample Events (first 3)`,
        `\`\`\`json`,
        JSON.stringify((events as Record<string, unknown>[]).slice(0, 3), null, 2),
        `\`\`\``,
        ``,
        `_Attached from SOC Center Investigation Workbench_`,
      ].join('\n')

      await api.post(`/soar/iris/cases/${effectiveCaseId}/notes`, {
        title: `[INVESTIGATE] Evidence: ${query}`,
        content,
        group_title: 'Investigation Evidence',
      })
      setResult('attach_evidence', {
        status: 'success',
        message: `แนบ evidence ${events.length} events ใน Case #${effectiveCaseId} แล้ว`,
        caseId: effectiveCaseId,
      })
    } catch {
      setResult('attach_evidence', { status: 'error', message: 'ไม่สามารถแนบ evidence ได้' })
    }
  }

  const handleAddIOC = async () => {
    if (!effectiveCaseId) {
      setResult('add_ioc', { status: 'error', message: 'กรุณาสร้าง Case หรือระบุ Case ID ก่อน' })
      return
    }
    setResult('add_ioc', { status: 'running' })
    try {
      const typeId = entityType === 'ip' ? 76 : entityType === 'domain' ? 78 : entityType === 'hash' ? 81 : 76
      await api.post(`/soar/iris/cases/${effectiveCaseId}/iocs`, {
        ioc_value: query,
        ioc_type_id: typeId,
        ioc_tlp_id: 2,
        ioc_description: `IOC from SOC Investigation Workbench: ${query} (${entityType})`,
      })
      setResult('add_ioc', {
        status: 'success',
        message: `เพิ่ม IOC ${query} ใน Case #${effectiveCaseId} แล้ว`,
        caseId: effectiveCaseId,
      })
    } catch {
      setResult('add_ioc', { status: 'error', message: 'ไม่สามารถเพิ่ม IOC ได้' })
    }
  }

  const handleRunPlaybook = async () => {
    setResult('run_playbook', { status: 'running' })
    try {
      const r = await api.post('/soar/shuffle/trigger', {
        type: 'triage',
        workflow_type: 'triage',
        ip: entityType === 'ip' ? query : undefined,
        target_value: query,
        target_type: entityType,
        reason: `Investigation: ${query} (${entityType}) — MITRE: ${(mitre?.tactics ?? []).join(', ') || 'N/A'}`,
        analyst: analyst || undefined,
        case_id: effectiveCaseId ?? undefined,
        source: 'investigate_v2_actions',
      })
      setResult('run_playbook', {
        status: 'success',
        message: r.data?.ok ? 'ส่ง playbook trigger ไปยัง Shuffle แล้ว' : (r.data?.message ?? 'ส่งแล้ว'),
        executionId: r.data?.execution_id,
        caseId: effectiveCaseId ?? undefined,
      })
    } catch {
      setResult('run_playbook', { status: 'error', message: 'ไม่สามารถรัน playbook ได้' })
    }
  }

  const handleEscalate = async () => {
    setResult('escalate', { status: 'running' })
    try {
      const r = await api.post('/soar/shuffle/trigger', {
        type: 'escalate',
        workflow_type: 'escalate',
        ip: entityType === 'ip' ? query : undefined,
        target_value: query,
        target_type: entityType,
        reason: `Escalation from Investigation Workbench: ${query} (${entityType})`,
        analyst: analyst || undefined,
        case_id: effectiveCaseId ?? undefined,
        source: 'investigate_v2_actions',
      })
      setResult('escalate', {
        status: 'success',
        message: r.data?.ok ? 'ส่ง escalation ไปยัง Shuffle แล้ว' : (r.data?.message ?? 'ส่งแล้ว'),
        executionId: r.data?.execution_id,
      })
    } catch {
      setResult('escalate', { status: 'error', message: 'ไม่สามารถ escalate ได้' })
    }
  }

  const handleSimulateBlockIP = async () => {
    if (!window.confirm(
      `ยืนยันการจำลอง Block IP: ${query}\n\nSIMULATION ONLY — ไม่มีการ block จริง\nไม่มีการเปลี่ยนแปลง firewall หรือ Wazuh Active Response`
    )) return

    setResult('block_ip', { status: 'running' })
    try {
      const r = await api.post('/soar/shuffle/trigger', {
        type: 'block',
        workflow_type: 'block_ip',
        ip: query,
        target_value: query,
        target_type: 'ip',
        reason: `Simulation Block request from Investigation Workbench`,
        analyst: analyst || undefined,
        simulation: true,
        dry_run: true,
        source: 'investigate_v2_actions',
        case_id: effectiveCaseId ?? undefined,
      })
      setResult('block_ip', {
        status: 'success',
        message: r.data?.message_th ?? 'Simulation completed — ไม่มีการ block จริง',
        mode: r.data?.mode ?? 'simulation',
        caseId: effectiveCaseId ?? undefined,
      })
    } catch {
      setResult('block_ip', { status: 'error', message: 'ไม่สามารถส่ง simulation request ได้' })
    }
  }

  const SimOnlyBadge = () => (
    <Chip
      icon={<ScienceRoundedIcon sx={{ fontSize: 10, color: '#EAB308 !important' }} />}
      label="SIMULATION ONLY" size="small"
      sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: 'rgba(234,179,8,0.1)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)' }}
    />
  )

  const inputSx = { '& .MuiInputBase-root': { fontSize: 11, borderRadius: 1.5 }, '& .MuiInputLabel-root': { fontSize: 11 } }

  return (
    <Stack spacing={2.5} className="animate-fade-in">

      {/* ── Analyst + Case Linking ── */}
      <Box className="rounded-xl p-3" sx={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.7)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.1)'}` }}>
        <Typography className="text-[9px] font-bold tracking-widest mb-2" sx={{ color: textMuted }}>
          CONTEXT — ใช้ร่วมกับทุก Action
        </Typography>
        <Stack spacing={1.5}>
          <TextField size="small" label="Analyst" value={analyst} onChange={e => setAnalyst(e.target.value)}
            placeholder="ชื่อ Analyst (optional)" fullWidth sx={inputSx} />

          {/* Case ID selector: autocomplete from existing cases + manual */}
          <Autocomplete
            size="small"
            freeSolo
            options={existingCases.map(c => ({ id: c.case_id, label: `#${c.case_id} — ${c.case_name.slice(0, 40)}` }))}
            getOptionLabel={opt => typeof opt === 'string' ? opt : opt.label}
            onChange={(_, v) => {
              if (v && typeof v === 'object' && 'id' in v) setManualCaseId(v.id)
              else if (typeof v === 'string') {
                const n = parseInt(v.replace(/\D/g, ''))
                setManualCaseId(isNaN(n) ? null : n)
              } else {
                setManualCaseId(null)
              }
            }}
            renderInput={params => (
              <TextField {...params} label="เชื่อมกับ IRIS Case (optional)" placeholder="เลือก หรือพิมพ์ Case ID"
                sx={inputSx} />
            )}
          />

          {effectiveCaseId && (
            <Box className="flex items-center gap-2">
              <LinkRoundedIcon sx={{ fontSize: 13, color: '#A855F7' }} />
              <Typography sx={{ fontSize: 11, color: '#A855F7' }}>
                Actions จะถูกเชื่อมกับ IRIS Case #{effectiveCaseId}
              </Typography>
              <Link href={`${IRIS_URL}/#/case/${effectiveCaseId}`} target="_blank" rel="noopener"
                underline="none" className="flex items-center gap-0.5 ml-auto shrink-0"
                sx={{ fontSize: 10, color: '#38BDF8', '&:hover': { opacity: 0.8 } }}>
                เปิด <OpenInNewRoundedIcon sx={{ fontSize: 11 }} />
              </Link>
            </Box>
          )}
        </Stack>
      </Box>

      {/* ── IRIS Section ── */}
      <Box>
        <Typography className="text-[9px] font-bold tracking-widest mb-2" sx={{ color: textMuted }}>
          DFIR-IRIS — CASE MANAGEMENT
        </Typography>
        <Stack spacing={1.5}>

          {/* Create Case */}
          <ActionCard
            icon={<CasesRoundedIcon sx={{ fontSize: 18 }} />}
            title="สร้าง IRIS Case"
            description="สร้าง investigation case ใน DFIR-IRIS พร้อม context ของ entity นี้"
            available={irisConfigured}
            actionLabel="สร้าง Case"
            result={getResult('create_case')}
            onAction={handleCreateIrisCase}
            color="#A855F7"
          >
            <TextField size="small" value={caseTitle} onChange={e => setCaseTitle(e.target.value)}
              placeholder="ชื่อ Case" fullWidth
              sx={{ '& .MuiOutlinedInput-root': { fontSize: 11, '& fieldset': { borderColor: 'rgba(168,85,247,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(168,85,247,0.4)' } } }}
            />
            {getResult('create_case').status === 'error' && (
              <Alert severity="warning" sx={{ mt: 1, py: 0.5, fontSize: 10, '& .MuiAlert-message': { fontSize: 10 } }}>
                IRIS ไม่สามารถสร้าง Case ใหม่ได้ — ใช้ field "เชื่อมกับ IRIS Case" ด้านบนเพื่อระบุ Case ที่มีอยู่
                {existingCases.length > 0 && ` (มี ${existingCases.length} cases: ${existingCases.map(c => `#${c.case_id}`).join(', ')})`}
              </Alert>
            )}
            {getResult('create_case').status === 'partial' && (
              <Alert severity="warning" sx={{ mt: 1, py: 0.5, fontSize: 10, '& .MuiAlert-message': { fontSize: 10 } }}>
                สร้าง IRIS Alert แทน Case — เปิด IRIS และ escalate Alert เป็น Case ด้วยตนเอง
                {' '}<Link href={IRIS_URL} target="_blank" rel="noopener" underline="always" sx={{ fontSize: 10 }}>เปิด IRIS</Link>
              </Alert>
            )}
          </ActionCard>

          {/* Attach Evidence */}
          <ActionCard
            icon={<AttachFileRoundedIcon sx={{ fontSize: 18 }} />}
            title="แนบ Raw Evidence"
            description={`แนบ ${events.length} events จากการ investigate เป็น note ใน Case${effectiveCaseId ? ` #${effectiveCaseId}` : ' (ต้องเลือก Case ก่อน)'}`}
            available={irisConfigured && events.length > 0 && effectiveCaseId !== null}
            actionLabel="แนบ Evidence"
            result={getResult('attach_evidence')}
            onAction={handleAttachEvidence}
            color="#38BDF8"
          />

          {/* Add IOC */}
          <ActionCard
            icon={<BugReportRoundedIcon sx={{ fontSize: 18 }} />}
            title="เพิ่ม IOC"
            description={`เพิ่ม ${query} เป็น IOC ใน Case${effectiveCaseId ? ` #${effectiveCaseId}` : ' (ต้องเลือก Case ก่อน)'}`}
            available={irisConfigured && (['ip', 'domain', 'hash'].includes(entityType)) && effectiveCaseId !== null}
            actionLabel="เพิ่ม IOC"
            result={getResult('add_ioc')}
            onAction={handleAddIOC}
            color="#EF4444"
          />
        </Stack>
      </Box>

      <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)' }} />

      {/* ── Shuffle Section ── */}
      <Box>
        <Typography className="text-[9px] font-bold tracking-widest mb-2" sx={{ color: textMuted }}>
          SHUFFLE SOAR — AUTOMATION
        </Typography>
        <Stack spacing={1.5}>

          {/* Run Playbook */}
          <ActionCard
            icon={<AutoFixHighRoundedIcon sx={{ fontSize: 18 }} />}
            title="รัน Triage Playbook"
            description={`ส่ง trigger ไปยัง Shuffle เพื่อรัน investigation playbook สำหรับ ${query}${effectiveCaseId ? ` + บันทึกใน Case #${effectiveCaseId}` : ''}`}
            available={shuffleConfigured}
            actionLabel="Run Playbook"
            result={getResult('run_playbook')}
            onAction={handleRunPlaybook}
            color="#22C55E"
          />

          {/* Escalate */}
          <ActionCard
            icon={<SendRoundedIcon sx={{ fontSize: 18 }} />}
            title="Escalate"
            description={`ส่ง escalation notification ผ่าน Shuffle (LINE / Telegram / email ตาม playbook)${effectiveCaseId ? ` + บันทึกใน Case #${effectiveCaseId}` : ''}`}
            available={shuffleConfigured}
            actionLabel="Escalate"
            result={getResult('escalate')}
            onAction={handleEscalate}
            color="#EAB308"
          />

          {/* Simulate Block IP — IP only */}
          {entityType === 'ip' && (
            <ActionCard
              icon={<BlockRoundedIcon sx={{ fontSize: 18 }} />}
              title="Simulate Block IP"
              description={`จำลองคำขอ Block IP สำหรับ ${query} ผ่าน Shuffle — ไม่มีการ block จริง ไม่เปลี่ยนแปลง firewall หรือ Wazuh Active Response`}
              available={shuffleConfigured}
              actionLabel="จำลอง Block IP"
              result={getResult('block_ip')}
              onAction={handleSimulateBlockIP}
              color="#F97316"
              warningBadge={<SimOnlyBadge />}
            >
              <Box className="flex items-start gap-2 px-2.5 py-2 rounded-lg mt-1"
                sx={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)' }}>
                <WarningAmberRoundedIcon sx={{ fontSize: 13, color: '#EAB308', mt: 0.1 }} />
                <Typography sx={{ fontSize: 10, color: textSec, lineHeight: 1.5 }}>
                  ยังไม่ดำเนินการ block จริง — ระบบจะส่ง simulation payload ไปยัง Shuffle
                  {effectiveCaseId ? ` และบันทึก audit trail ใน Case #${effectiveCaseId}` : ''}
                </Typography>
              </Box>
            </ActionCard>
          )}
        </Stack>
      </Box>

      {/* Not configured notice */}
      {!irisConfigured && !shuffleConfigured && (
        <Box className="flex flex-col items-center py-6 gap-2">
          <Typography sx={{ fontSize: 12, color: textMuted, textAlign: 'center' }}>
            ยังไม่ได้เชื่อมต่อ DFIR-IRIS หรือ Shuffle SOAR
            <br />
            กรุณาตั้งค่า <code style={{ fontSize: 11 }}>IRIS_URL</code> และ <code style={{ fontSize: 11 }}>SHUFFLE_URL</code> ใน .env
          </Typography>
        </Box>
      )}

      {/* Quick links */}
      {(irisConfigured || shuffleConfigured) && (
        <Box className="flex flex-wrap gap-2 pt-1" sx={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.08)'}` }}>
          <Typography sx={{ fontSize: 9, color: textMuted, alignSelf: 'center', mr: 1 }}>QUICK LINKS</Typography>
          {irisConfigured && (
            <Link href={IRIS_URL} target="_blank" rel="noopener" underline="none"
              className="flex items-center gap-1 text-[10px]"
              sx={{ color: '#A855F7', '&:hover': { opacity: 0.8 } }}>
              <OpenInNewRoundedIcon sx={{ fontSize: 11 }} /> เปิด DFIR-IRIS
            </Link>
          )}
          <Link href={`/wazuh/investigate?q=${encodeURIComponent(query)}&range=30d`} underline="none"
            className="flex items-center gap-1 text-[10px]"
            sx={{ color: '#06B6D4', '&:hover': { opacity: 0.8 } }}>
            <OpenInNewRoundedIcon sx={{ fontSize: 11 }} /> Investigate
          </Link>
          <Link href={`/wazuh/ioc?q=${encodeURIComponent(query)}`} underline="none"
            className="flex items-center gap-1 text-[10px]"
            sx={{ color: '#8B5CF6', '&:hover': { opacity: 0.8 } }}>
            <OpenInNewRoundedIcon sx={{ fontSize: 11 }} /> IOC Check
          </Link>
        </Box>
      )}
    </Stack>
  )
}
