import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Drawer, Box, Typography, Stack, CircularProgress, Skeleton,
  Button, IconButton, Chip, Tooltip,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded'
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded'
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded'
import { useSnackbar } from 'notistack'
import { soarApi, IrisCase } from '../../../services/soarApi'
import { hexRgb, fmtTime } from '../soarUtils'
import NotesPanel from './NotesPanel'
import IocPanel from './IocPanel'
import TimelinePanel from './TimelinePanel'
import TasksPanel from './TasksPanel'
import EvidencePanel from './EvidencePanel'
import ShuffleActionsPanel from './ShuffleActionsPanel'
import ActivityPanel from './ActivityPanel'
import ReportPanel from './ReportPanel'
import ClosurePanel from './ClosurePanel'

const CASE_COLOR = '#6366F1'

// ── Sub-tab nav ────────────────────────────────────────────────────────────────

function SubTabBar({ active, onChange, tabs }: {
  active: string
  onChange: (t: string) => void
  tabs: { key: string; label: string; icon: React.ReactNode; count?: number }[]
}) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'

  return (
    <Box className="flex overflow-x-auto scrollbar-hide gap-0.5 p-1 rounded-xl"
      sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.06)', flexShrink: 0 }}>
      {tabs.map(t => (
        <Box key={t.key}
          onClick={() => onChange(t.key)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 text-[11px] font-semibold select-none whitespace-nowrap shrink-0"
          sx={{
            background: active === t.key ? CASE_COLOR : 'transparent',
            color: active === t.key ? '#fff' : textMuted,
            '&:hover': active !== t.key ? {
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.08)',
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)',
            } : {},
          }}>
          {t.icon}
          <span className="ml-1">{t.label}</span>
          {t.count !== undefined && t.count > 0 && (
            <Box className="px-1 rounded-full text-[9px] font-bold ml-0.5"
              sx={{ background: active === t.key ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.12)'), color: active === t.key ? '#fff' : textMuted }}>
              {t.count}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  )
}

// ── Main Drawer ────────────────────────────────────────────────────────────────

interface Props {
  caseData: IrisCase | null
  irisUrl?: string
  irisConfigured?: boolean
  shuffleConfigured?: boolean
  open: boolean
  onClose: () => void
}

export default function CaseDetailDrawer({
  caseData, irisUrl, irisConfigured = false, shuffleConfigured = false, open, onClose,
}: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('notes')

  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const divider   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'

  const caseId = caseData?.case_id
  const isOpen = !caseData?.case_close_date

  // Tab counts from queries
  const { data: tasksData }  = useQuery({ queryKey: ['case-tasks', caseId],    queryFn: () => soarApi.getCaseTasks(caseId!).then(r => r.data),    enabled: open && !!caseId })
  const { data: iocsData }   = useQuery({ queryKey: ['case-iocs', caseId],     queryFn: () => soarApi.getCaseIocs(caseId!).then(r => r.data),     enabled: open && !!caseId })
  const { data: evData }     = useQuery({ queryKey: ['case-evidence', caseId], queryFn: () => soarApi.getCaseEvidence(caseId!).then(r => r.data), enabled: open && !!caseId })
  const { data: notesData }  = useQuery({ queryKey: ['case-notes', caseId],    queryFn: () => soarApi.getCaseNotes(caseId!).then(r => r.data),    enabled: open && !!caseId })

  const taskCount  = tasksData?.tasks?.length ?? 0
  const iocCount   = (iocsData?.data ?? []).length
  const evCount    = evData?.evidence?.length ?? 0
  const noteCount  = (notesData?.data ?? []).flatMap((g: { notes?: unknown[] }) => g.notes ?? []).length

  const tabs = [
    { key: 'notes',    label: 'บันทึก',     icon: <NotesRoundedIcon       sx={{ fontSize: 12 }} />, count: noteCount },
    { key: 'iocs',     label: 'IOC',         icon: <BugReportRoundedIcon   sx={{ fontSize: 12 }} />, count: iocCount },
    { key: 'timeline', label: 'Timeline',    icon: <TimelineRoundedIcon    sx={{ fontSize: 12 }} /> },
    { key: 'tasks',    label: 'Tasks',       icon: <ChecklistRoundedIcon   sx={{ fontSize: 12 }} />, count: taskCount },
    { key: 'evidence', label: 'Evidence',    icon: <AttachFileRoundedIcon  sx={{ fontSize: 12 }} />, count: evCount },
    { key: 'shuffle',  label: 'Shuffle',     icon: <AutoFixHighRoundedIcon sx={{ fontSize: 12 }} /> },
    { key: 'activity', label: 'Activity',    icon: <HistoryRoundedIcon     sx={{ fontSize: 12 }} /> },
    { key: 'report',   label: 'Report',      icon: <AssessmentRoundedIcon  sx={{ fontSize: 12 }} /> },
    { key: 'closure',  label: 'Closure',     icon: <LockRoundedIcon        sx={{ fontSize: 12 }} /> },
  ]

  const handleOpenFullPage = () => {
    onClose()
    navigate(`/soar/cases/${caseId}`)
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 580 },
          background: isDark ? '#16112A' : '#F8F6FF',
          borderLeft: `1px solid ${divider}`,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* ── Header ── */}
      <Box
        className="shrink-0 px-5 py-4"
        sx={{ background: isDark ? 'rgba(22,17,42,0.95)' : 'rgba(248,246,255,0.95)', borderBottom: `1px solid ${divider}`, backdropFilter: 'blur(10px)' }}
      >
        <Box className="flex items-center justify-between mb-3">
          <Box className="flex items-center gap-2.5">
            <Box className="w-8 h-8 rounded-xl flex items-center justify-center"
              sx={{ background: `rgba(${hexRgb(CASE_COLOR)},0.12)` }}>
              <FolderOpenRoundedIcon sx={{ fontSize: 16, color: CASE_COLOR }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033', lineHeight: 1.2 }}>
                {caseData?.case_name ?? '—'}
              </Typography>
              <Typography className="font-mono" sx={{ fontSize: 10, color: textMuted }}>
                Case #{caseId}
              </Typography>
            </Box>
          </Box>
          <Box className="flex items-center gap-1">
            <Tooltip title="เปิดหน้าเต็ม Case">
              <IconButton size="small" onClick={handleOpenFullPage}
                sx={{ color: CASE_COLOR, '&:hover': { background: `rgba(${hexRgb(CASE_COLOR)},0.1)` } }}>
                <OpenInFullRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} sx={{ color: textMuted }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Meta row */}
        <Box className="flex flex-wrap gap-2 items-center mb-2">
          <Chip size="small"
            label={isOpen ? 'กำลังดำเนินการ' : 'ปิดแล้ว'}
            sx={{
              height: 20, fontSize: 9, fontWeight: 700,
              bgcolor: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
              color: isOpen ? '#22C55E' : '#64748B',
              border: isOpen ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(100,116,139,0.3)',
            }}
          />
          {caseData?.owner && (
            <Typography sx={{ fontSize: 10, color: textMuted }}>
              ผู้รับผิดชอบ:{' '}
              <Box component="span" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,40,100,0.65)', fontWeight: 600 }}>
                {caseData.owner}
              </Box>
            </Typography>
          )}
        </Box>

        <Box className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px]" sx={{ color: textMuted }}>
          <span>เปิด: {caseData?.case_open_date ?? '—'}</span>
          {caseData?.case_close_date && <span>· ปิด: {caseData.case_close_date}</span>}
          {caseData?.client_name && <span>· ลูกค้า: {caseData.client_name}</span>}
        </Box>

        {/* Quick action buttons */}
        <Box className="flex flex-wrap gap-1.5 mt-2.5">
          {irisUrl && (
            <Button size="small" variant="text" endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 11 }} />}
              component="a" href={`${irisUrl}/case?cid=${caseId}`} target="_blank" rel="noopener"
              sx={{ borderRadius: 1.5, fontSize: 10, color: CASE_COLOR, py: 0.5, '&:hover': { background: `rgba(${hexRgb(CASE_COLOR)},0.08)` } }}>
              IRIS
            </Button>
          )}
          <Button size="small" variant="text" startIcon={<TravelExploreRoundedIcon sx={{ fontSize: 11 }} />}
            onClick={() => { onClose(); navigate(`/investigate?q=${encodeURIComponent(caseData?.case_name ?? '')}&range=30d`) }}
            sx={{ borderRadius: 1.5, fontSize: 10, color: '#38BDF8', py: 0.5, '&:hover': { background: 'rgba(56,189,248,0.08)' } }}>
            Investigate
          </Button>
          <Button size="small" variant="text" startIcon={<OpenInFullRoundedIcon sx={{ fontSize: 11 }} />}
            onClick={handleOpenFullPage}
            sx={{ borderRadius: 1.5, fontSize: 10, color: '#A855F7', py: 0.5, '&:hover': { background: 'rgba(168,85,247,0.08)' } }}>
            Full Workspace
          </Button>
        </Box>
      </Box>

      {/* ── Tab bar ── */}
      <Box className="shrink-0 px-4 py-2.5"
        sx={{ borderBottom: `1px solid ${divider}`, background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(248,246,255,0.7)' }}>
        <SubTabBar active={activeTab} onChange={setActiveTab} tabs={tabs} />
      </Box>

      {/* ── Tab content ── */}
      <Box className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {/* Case description (always shown on notes tab) */}
        {activeTab === 'notes' && caseData?.case_description && (
          <Box className="rounded-xl p-3 mb-3"
            sx={{
              background: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)',
              border: `1px solid rgba(${hexRgb(CASE_COLOR)},0.15)`,
            }}>
            <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: CASE_COLOR, mb: 1, textTransform: 'uppercase' }}>
              รายละเอียดเคส
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {caseData.case_description}
            </Typography>
          </Box>
        )}

        {activeTab === 'notes'    && caseId && <NotesPanel    caseId={caseId} />}
        {activeTab === 'iocs'     && caseId && <IocPanel      caseId={caseId} />}
        {activeTab === 'timeline' && caseId && <TimelinePanel caseId={caseId} />}
        {activeTab === 'tasks'    && caseId && <TasksPanel    caseId={caseId} />}
        {activeTab === 'evidence' && caseId && <EvidencePanel caseId={caseId} />}
        {activeTab === 'shuffle'  && caseId && (
          <ShuffleActionsPanel
            caseId={caseId}
            caseName={caseData?.case_name}
            irisConfigured={irisConfigured}
            shuffleConfigured={shuffleConfigured}
          />
        )}
        {activeTab === 'activity' && caseId && <ActivityPanel caseId={caseId} />}
        {activeTab === 'report'   && caseId && <ReportPanel   caseId={caseId} caseData={caseData} />}
        {activeTab === 'closure'  && caseId && (
          <ClosurePanel
            caseId={caseId}
            caseData={caseData}
            onClosed={() => { queryClient.invalidateQueries({ queryKey: ['iris-cases'] }); onClose() }}
          />
        )}
      </Box>
    </Drawer>
  )
}
