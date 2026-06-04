import { Box, Button, Chip, CircularProgress, Divider, Stack, TextField, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'
import CasesRoundedIcon from '@mui/icons-material/CasesRounded'
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import api from '../../../services/api'

interface Props {
  query: string
  entityType: string
  irisConfigured: boolean
  shuffleConfigured: boolean
  events?: unknown[]
  mitre?: { tactics: string[]; techniques: string[] }
}

type ActionStatus = 'idle' | 'running' | 'success' | 'error'

interface ActionResult {
  status: ActionStatus
  message?: string
  link?: string
}

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function ActionCard({
  icon,
  title,
  description,
  available,
  actionLabel,
  result,
  onAction,
  children,
  color,
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
}) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'

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
        <Box
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          sx={{
            background: available ? `rgba(${hexRgb(color)},0.1)` : 'rgba(255,255,255,0.04)',
            color: available ? color : '#64748B',
          }}
        >
          {icon}
        </Box>
        <Box className="flex-1 min-w-0">
          <Box className="flex items-center gap-2 mb-1">
            <Typography className="font-semibold text-[12px]"
              sx={{ color: available ? (isDark ? '#EDE9FA' : '#1A1033') : textMuted }}>
              {title}
            </Typography>
            {!available && (
              <Chip label="ยังไม่ได้ตั้งค่า" size="small"
                sx={{ height: 16, fontSize: 9, bgcolor: 'rgba(100,116,139,0.12)', color: '#64748B', border: 'none' }} />
            )}
          </Box>
          <Typography sx={{ fontSize: 11, color: textSec, lineHeight: 1.5, mb: children ? 1.5 : 0 }}>
            {description}
          </Typography>

          {children}

          <Box className="flex items-center gap-2 mt-2.5">
            <Button
              size="small"
              variant="outlined"
              disabled={!available || result.status === 'running'}
              onClick={onAction}
              startIcon={result.status === 'running' ? <CircularProgress size={12} /> : undefined}
              sx={{
                fontSize: 11, px: 2, py: 0.5, borderRadius: 1.5, textTransform: 'none',
                borderColor: available ? `rgba(${hexRgb(color)},0.4)` : 'rgba(255,255,255,0.1)',
                color: available ? color : '#64748B',
                '&:hover': {
                  borderColor: color,
                  background: `rgba(${hexRgb(color)},0.06)`,
                },
                '&.Mui-disabled': { opacity: 0.4 },
              }}
            >
              {result.status === 'running' ? 'กำลังดำเนินการ…' : actionLabel}
            </Button>
            {result.status === 'success' && (
              <Box className="flex items-center gap-1">
                <CheckCircleRoundedIcon sx={{ fontSize: 13, color: '#22C55E' }} />
                <Typography sx={{ fontSize: 10, color: '#22C55E' }}>{result.message || 'สำเร็จ'}</Typography>
                {result.link && (
                  <Typography
                    component="a" href={result.link} target="_blank" rel="noopener"
                    sx={{ fontSize: 10, color: '#38BDF8', textDecoration: 'underline' }}>
                    เปิด
                  </Typography>
                )}
              </Box>
            )}
            {result.status === 'error' && (
              <Box className="flex items-center gap-1">
                <ErrorRoundedIcon sx={{ fontSize: 13, color: '#EF4444' }} />
                <Typography sx={{ fontSize: 10, color: '#EF4444' }}>{result.message || 'เกิดข้อผิดพลาด'}</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default function ActionsTab({
  query, entityType, irisConfigured, shuffleConfigured, events = [], mitre,
}: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'

  const [caseTitle, setCaseTitle] = useState(`Investigate: ${query}`)
  const [results, setResults] = useState<Record<string, ActionResult>>({})

  const setResult = (key: string, res: ActionResult) =>
    setResults(prev => ({ ...prev, [key]: res }))

  const getResult = (key: string): ActionResult =>
    results[key] ?? { status: 'idle' }

  const [createdCaseId, setCreatedCaseId] = useState<number | null>(null)

  const handleCreateIrisCase = async () => {
    setResult('create_case', { status: 'running' })
    try {
      const r = await api.post('/soar/iris/cases', {
        case_name: caseTitle,
        case_description: `Investigation Workbench case for entity: ${query}\nType: ${entityType}\nGenerated by SOC Center`,
        customer_id: 1,
      })
      const caseId = r.data?.data?.case_id ?? r.data?.case_id
      if (caseId) setCreatedCaseId(caseId)
      setResult('create_case', {
        status: 'success',
        message: `Case #${caseId} สร้างแล้ว`,
      })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'ไม่สามารถสร้าง case ได้'
      setResult('create_case', { status: 'error', message: msg })
    }
  }

  const handleAttachEvidence = async () => {
    const targetCaseId = createdCaseId
    if (!targetCaseId) {
      setResult('attach_evidence', { status: 'error', message: 'กรุณาสร้าง Case ก่อน' })
      return
    }
    setResult('attach_evidence', { status: 'running' })
    try {
      const content = [
        `**Entity:** ${query} (${entityType})`,
        `**Total Events:** ${events.length}`,
        `**Sample Events:**\n\`\`\`json\n${JSON.stringify((events as Record<string, unknown>[]).slice(0, 3), null, 2)}\n\`\`\``,
      ].join('\n\n')
      await api.post(`/soar/iris/cases/${targetCaseId}/notes`, {
        title: `Investigation Evidence: ${query}`,
        content,
        group_title: 'Investigation Evidence',
      })
      setResult('attach_evidence', { status: 'success', message: `แนบ evidence ${events.length} events แล้ว` })
    } catch {
      setResult('attach_evidence', { status: 'error', message: 'ไม่สามารถแนบ evidence ได้' })
    }
  }

  const handleAddIOC = async () => {
    const targetCaseId = createdCaseId
    if (!targetCaseId) {
      setResult('add_ioc', { status: 'error', message: 'กรุณาสร้าง Case ก่อน' })
      return
    }
    setResult('add_ioc', { status: 'running' })
    try {
      await api.post(`/soar/iris/cases/${targetCaseId}/iocs`, {
        ioc_value: query,
        ioc_type_id: entityType === 'ip' ? 76 : entityType === 'domain' ? 20 : 1,
        ioc_tlp_id: 2,
        ioc_description: `IOC from SOC Investigation Workbench: ${query}`,
      })
      setResult('add_ioc', { status: 'success', message: 'เพิ่ม IOC แล้ว' })
    } catch {
      setResult('add_ioc', { status: 'error', message: 'ไม่สามารถเพิ่ม IOC ได้' })
    }
  }

  const handleRunPlaybook = async () => {
    setResult('run_playbook', { status: 'running' })
    try {
      await api.post('/soar/shuffle/trigger', {
        type: 'triage',
        ip: entityType === 'ip' ? query : undefined,
        reason: `Investigation: ${query} (${entityType}) — MITRE: ${(mitre?.tactics ?? []).join(', ')}`,
      })
      setResult('run_playbook', { status: 'success', message: 'ส่ง playbook trigger แล้ว' })
    } catch {
      setResult('run_playbook', { status: 'error', message: 'ไม่สามารถรัน playbook ได้' })
    }
  }

  const handleEscalate = async () => {
    setResult('escalate', { status: 'running' })
    try {
      await api.post('/soar/shuffle/trigger', {
        type: 'escalate',
        ip: entityType === 'ip' ? query : undefined,
        reason: `Escalation from Investigation Workbench: ${query} (${entityType})`,
      })
      setResult('escalate', { status: 'success', message: 'ส่ง escalation แล้ว' })
    } catch {
      setResult('escalate', { status: 'error', message: 'ไม่สามารถ escalate ได้' })
    }
  }

  const handleBlockIP = async () => {
    if (!window.confirm(`ยืนยันการ block IP: ${query} ?`)) return
    setResult('block_ip', { status: 'running' })
    try {
      await api.post('/soar/shuffle/trigger', { type: 'block', ip: query, reason: `Block request from Investigation Workbench` })
      setResult('block_ip', { status: 'success', message: `ส่ง block request สำหรับ ${query} แล้ว` })
    } catch {
      setResult('block_ip', { status: 'error', message: 'ไม่สามารถส่ง block request ได้' })
    }
  }

  return (
    <Stack spacing={2.5} className="animate-fade-in">
      {/* Section: IRIS */}
      <Box>
        <Typography className="text-[9px] font-bold tracking-widest mb-2" sx={{ color: textMuted }}>
          DFIR-IRIS — CASE MANAGEMENT
        </Typography>
        <Stack spacing={1.5}>
          <ActionCard
            icon={<CasesRoundedIcon sx={{ fontSize: 18 }} />}
            title="สร้าง IRIS Case"
            description="สร้าง investigation case ใหม่ใน DFIR-IRIS พร้อม context ของ entity นี้"
            available={irisConfigured}
            actionLabel="สร้าง Case"
            result={getResult('create_case')}
            onAction={handleCreateIrisCase}
            color="#A855F7"
          >
            <TextField
              size="small"
              value={caseTitle}
              onChange={e => setCaseTitle(e.target.value)}
              placeholder="ชื่อ Case"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: 11,
                  '& fieldset': { borderColor: 'rgba(168,85,247,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(168,85,247,0.4)' },
                },
              }}
            />
          </ActionCard>

          <ActionCard
            icon={<AttachFileRoundedIcon sx={{ fontSize: 18 }} />}
            title="แนบ Raw Evidence"
            description={`แนบ ${events.length} events จากการ investigate เป็น evidence ใน case ที่มีอยู่`}
            available={irisConfigured && events.length > 0}
            actionLabel="แนบ Evidence"
            result={getResult('attach_evidence')}
            onAction={handleAttachEvidence}
            color="#38BDF8"
          />

          <ActionCard
            icon={<BugReportRoundedIcon sx={{ fontSize: 18 }} />}
            title="เพิ่ม IOC"
            description={`เพิ่ม ${query} เป็น IOC ใน IRIS database`}
            available={irisConfigured && (entityType === 'ip' || entityType === 'domain' || entityType === 'hash')}
            actionLabel="เพิ่ม IOC"
            result={getResult('add_ioc')}
            onAction={handleAddIOC}
            color="#EF4444"
          />
        </Stack>
      </Box>

      <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)' }} />

      {/* Section: Shuffle SOAR */}
      <Box>
        <Typography className="text-[9px] font-bold tracking-widest mb-2" sx={{ color: textMuted }}>
          SHUFFLE SOAR — AUTOMATION
        </Typography>
        <Stack spacing={1.5}>
          <ActionCard
            icon={<AutoFixHighRoundedIcon sx={{ fontSize: 18 }} />}
            title="รัน Playbook"
            description="ส่ง trigger ไปยัง Shuffle SOAR เพื่อรัน investigation playbook อัตโนมัติ"
            available={shuffleConfigured}
            actionLabel="Run Playbook"
            result={getResult('run_playbook')}
            onAction={handleRunPlaybook}
            color="#22C55E"
          />

          <ActionCard
            icon={<SendRoundedIcon sx={{ fontSize: 18 }} />}
            title="Escalate"
            description="ส่ง escalation notification ผ่าน Shuffle (LINE, Telegram, หรือ email ตาม playbook)"
            available={shuffleConfigured}
            actionLabel="Escalate"
            result={getResult('escalate')}
            onAction={handleEscalate}
            color="#EAB308"
          />

          {entityType === 'ip' && (
            <ActionCard
              icon={<BlockRoundedIcon sx={{ fontSize: 18 }} />}
              title="Block IP"
              description={`ส่ง block request สำหรับ ${query} ผ่าน Shuffle → Firewall`}
              available={shuffleConfigured}
              actionLabel="Block IP"
              result={getResult('block_ip')}
              onAction={handleBlockIP}
              color="#EF4444"
            />
          )}
        </Stack>
      </Box>

      {!irisConfigured && !shuffleConfigured && (
        <Box className="flex flex-col items-center py-6 gap-2">
          <Typography sx={{ fontSize: 12, color: textMuted, textAlign: 'center' }}>
            ยังไม่ได้เชื่อมต่อ DFIR-IRIS หรือ Shuffle SOAR
            <br />
            กรุณาตั้งค่า <code style={{ fontSize: 11 }}>iris_url</code> และ <code style={{ fontSize: 11 }}>shuffle_url</code> ใน .env
          </Typography>
        </Box>
      )}
    </Stack>
  )
}
