import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Typography, Button, Chip, Skeleton, Stack, Tabs, Tab,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
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
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import { useSnackbar } from 'notistack'
import { PageShell } from '../ui/layout'
import { soarApi, IrisCase } from '../../services/soarApi'
import { hexRgb } from './soarUtils'
import { BRAND } from '../ui/tokens'
import NotesPanel from './iris/NotesPanel'
import IocPanel from './iris/IocPanel'
import TimelinePanel from './iris/TimelinePanel'
import TasksPanel from './iris/TasksPanel'
import EvidencePanel from './iris/EvidencePanel'
import ShuffleActionsPanel from './iris/ShuffleActionsPanel'
import ActivityPanel from './iris/ActivityPanel'
import ReportPanel from './iris/ReportPanel'
import ClosurePanel from './iris/ClosurePanel'

const CASE_COLOR = '#6366F1'

// ── Tab definitions ────────────────────────────────────────────────────────────

const WORKSPACE_TABS = [
  { key: 'notes',    label: 'บันทึก',     icon: <NotesRoundedIcon       sx={{ fontSize: 14 }} /> },
  { key: 'iocs',     label: 'IOC',         icon: <BugReportRoundedIcon   sx={{ fontSize: 14 }} /> },
  { key: 'timeline', label: 'Timeline',    icon: <TimelineRoundedIcon    sx={{ fontSize: 14 }} /> },
  { key: 'tasks',    label: 'Tasks',       icon: <ChecklistRoundedIcon   sx={{ fontSize: 14 }} /> },
  { key: 'evidence', label: 'Evidence',    icon: <AttachFileRoundedIcon  sx={{ fontSize: 14 }} /> },
  { key: 'shuffle',  label: 'Shuffle',     icon: <AutoFixHighRoundedIcon sx={{ fontSize: 14 }} /> },
  { key: 'activity', label: 'Activity',    icon: <HistoryRoundedIcon     sx={{ fontSize: 14 }} /> },
  { key: 'report',   label: 'Report',      icon: <AssessmentRoundedIcon  sx={{ fontSize: 14 }} /> },
  { key: 'closure',  label: 'Closure',     icon: <LockRoundedIcon        sx={{ fontSize: 14 }} /> },
]

// ── Case Summary Header ────────────────────────────────────────────────────────

function CaseSummaryHeader({ caseData, irisUrl, loading }: { caseData: IrisCase | null; irisUrl?: string; loading: boolean }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const navigate = useNavigate()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'

  const isOpen = !caseData?.case_close_date

  if (loading) {
    return (
      <Box className="rounded-2xl p-5 mb-4" sx={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.9)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.12)'}` }}>
        <Stack spacing={1.5}>
          <Skeleton variant="text" width="60%" height={28} />
          <Skeleton variant="text" width="40%" height={18} />
          <Box className="flex gap-2"><Skeleton variant="rounded" width={80} height={22} sx={{ borderRadius: 10 }} /></Box>
        </Stack>
      </Box>
    )
  }

  if (!caseData) return null

  return (
    <Box className="rounded-2xl p-5 mb-4"
      sx={{
        background: isDark
          ? `linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(0,0,0,0) 100%)`
          : `linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(248,246,255,0.9) 100%)`,
        border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}`,
      }}
    >
      <Box className="flex items-start justify-between gap-3 flex-wrap">
        <Box>
          <Box className="flex items-center gap-2.5 mb-2">
            <Box className="w-10 h-10 rounded-xl flex items-center justify-center"
              sx={{ background: `rgba(${hexRgb(CASE_COLOR)},0.12)` }}>
              <FolderOpenRoundedIcon sx={{ fontSize: 20, color: CASE_COLOR }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: isDark ? '#EDE9FA' : '#1A1033', lineHeight: 1.2 }}>
                {caseData.case_name}
              </Typography>
              <Typography className="font-mono" sx={{ fontSize: 11, color: textMuted }}>
                Case #{caseData.case_id}
              </Typography>
            </Box>
          </Box>

          <Box className="flex flex-wrap items-center gap-2 mb-3">
            <Chip size="small"
              label={isOpen ? 'กำลังดำเนินการ' : 'ปิดแล้ว'}
              sx={{
                height: 22, fontSize: 10, fontWeight: 700,
                bgcolor: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
                color: isOpen ? '#22C55E' : '#64748B',
                border: isOpen ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(100,116,139,0.3)',
              }}
            />
            {caseData.owner && (
              <Typography sx={{ fontSize: 11, color: textMuted }}>
                ผู้รับผิดชอบ:{' '}
                <Box component="span" sx={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,40,100,0.75)', fontWeight: 600 }}>
                  {caseData.owner}
                </Box>
              </Typography>
            )}
            {caseData.client_name && (
              <Typography sx={{ fontSize: 11, color: textMuted }}>
                ลูกค้า:{' '}
                <Box component="span" sx={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,40,100,0.75)', fontWeight: 600 }}>
                  {caseData.client_name}
                </Box>
              </Typography>
            )}
          </Box>

          {caseData.case_description && (
            <Typography sx={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.65)', lineHeight: 1.6, maxWidth: 600, whiteSpace: 'pre-wrap' }}>
              {caseData.case_description.slice(0, 200)}{caseData.case_description.length > 200 ? '…' : ''}
            </Typography>
          )}

          <Box className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-[10px]" sx={{ color: textMuted }}>
            <span>เปิด: {caseData.case_open_date}</span>
            {caseData.case_close_date && <span>ปิด: {caseData.case_close_date}</span>}
          </Box>
        </Box>

        {/* Action buttons */}
        <Box className="flex flex-wrap gap-2">
          {irisUrl && (
            <Button size="small" variant="outlined" endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 12 }} />}
              component="a" href={`${irisUrl}/case?cid=${caseData.case_id}`} target="_blank" rel="noopener"
              sx={{ borderRadius: 2, fontSize: 12, borderColor: `rgba(${hexRgb(CASE_COLOR)},0.4)`, color: CASE_COLOR,
                '&:hover': { borderColor: CASE_COLOR, background: `rgba(${hexRgb(CASE_COLOR)},0.06)` } }}>
              เปิด IRIS
            </Button>
          )}
          <Button size="small" variant="outlined" startIcon={<TravelExploreRoundedIcon sx={{ fontSize: 13 }} />}
            onClick={() => navigate(`/investigate?q=${encodeURIComponent(caseData.case_name)}&range=30d`)}
            sx={{ borderRadius: 2, fontSize: 12, borderColor: 'rgba(56,189,248,0.4)', color: '#38BDF8',
              '&:hover': { borderColor: '#38BDF8', background: 'rgba(56,189,248,0.06)' } }}>
            Investigate V2
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CaseWorkspacePage() {
  const { caseId: caseIdStr } = useParams<{ caseId: string }>()
  const caseId = Number(caseIdStr)
  const navigate = useNavigate()
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState(0)

  const { data: statsData } = useQuery({
    queryKey: ['soar-health'],
    queryFn: () => soarApi.getHealth().then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const irisUrl = statsData?.integrations?.find((i: { id: string; detail?: { iris_url?: string } }) => i.id === 'dfir_iris')?.detail?.iris_url
  const irisConfigured    = !!statsData?.integrations?.find((i: { id: string; configured: boolean }) => i.id === 'dfir_iris')?.configured
  const shuffleConfigured = !!statsData?.integrations?.find((i: { id: string; configured: boolean }) => i.id === 'shuffle')?.configured

  const { data: casesResp, isLoading } = useQuery({
    queryKey: ['iris-cases'],
    queryFn: () => soarApi.getIrisCases({ per_page: 100 }).then(r => r.data),
  })

  const cases: IrisCase[] = casesResp?.data ?? []
  const caseData = cases.find(c => c.case_id === caseId) ?? null

  // Tab counts
  const { data: tasksData } = useQuery({ queryKey: ['case-tasks', caseId],    queryFn: () => soarApi.getCaseTasks(caseId).then(r => r.data),    enabled: !!caseId })
  const { data: iocsData }  = useQuery({ queryKey: ['case-iocs', caseId],     queryFn: () => soarApi.getCaseIocs(caseId).then(r => r.data),     enabled: !!caseId })
  const { data: evData }    = useQuery({ queryKey: ['case-evidence', caseId], queryFn: () => soarApi.getCaseEvidence(caseId).then(r => r.data), enabled: !!caseId })

  const taskCount = tasksData?.tasks?.length ?? 0
  const iocCount  = (iocsData?.data ?? []).length
  const evCount   = evData?.evidence?.length ?? 0

  const tabCounts: Record<string, number | undefined> = {
    tasks: taskCount, iocs: iocCount, evidence: evCount,
  }

  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.1)'
  const tabBg   = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.9)'

  return (
    <PageShell
      title={caseData?.case_name ?? `Case #${caseId}`}
      subtitle={`Case Workspace — DFIR-IRIS #${caseId}`}
      breadcrumbs={[
        { label: 'SOC', href: '/' },
        { label: 'SOAR', href: '/soar' },
        { label: `Case #${caseId}` },
      ]}
    >
      {/* Back button */}
      <Box className="mb-3">
        <Button size="small" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/soar')}
          sx={{ borderRadius: 2, fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.55)',
            '&:hover': { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.06)' } }}>
          กลับ SOAR
        </Button>
      </Box>

      {/* Case summary header */}
      <CaseSummaryHeader caseData={caseData} irisUrl={irisUrl} loading={isLoading} />

      {/* Workspace tabs */}
      <Box className="rounded-2xl overflow-hidden"
        sx={{ background: tabBg, border: `1px solid ${divider}`, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 20px rgba(99,102,241,0.08)' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: `1px solid ${divider}`,
            background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(99,102,241,0.03)',
            '& .MuiTab-root': {
              minHeight: 46, fontSize: 12, gap: 0.5, px: 2,
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,100,0.5)',
              '&:hover': { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(60,40,100,0.8)', background: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)' },
            },
            '& .Mui-selected': { color: `${CASE_COLOR} !important`, fontWeight: 700 },
            '& .MuiTabs-indicator': { backgroundColor: CASE_COLOR, height: 2, borderRadius: '2px 2px 0 0' },
            '& .MuiTabScrollButton-root': { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)' },
          }}
        >
          {WORKSPACE_TABS.map((t, i) => {
            const count = tabCounts[t.key]
            return (
              <Tab
                key={t.key}
                icon={t.icon}
                iconPosition="start"
                label={
                  count != null && count > 0 ? (
                    <Box className="flex items-center gap-1">
                      {t.label}
                      <Box className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                        sx={{ background: activeTab === i ? `rgba(${hexRgb(CASE_COLOR)},0.15)` : 'rgba(99,102,241,0.1)', color: CASE_COLOR }}>
                        {count}
                      </Box>
                    </Box>
                  ) : t.label
                }
              />
            )
          })}
        </Tabs>

        <Box className="p-5">
          {!caseId ? (
            <Typography sx={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,100,0.5)' }}>
              ไม่พบ Case ID ที่ถูกต้อง
            </Typography>
          ) : (
            <>
              {activeTab === 0 && <NotesPanel    caseId={caseId} />}
              {activeTab === 1 && <IocPanel      caseId={caseId} />}
              {activeTab === 2 && <TimelinePanel caseId={caseId} />}
              {activeTab === 3 && <TasksPanel    caseId={caseId} />}
              {activeTab === 4 && <EvidencePanel caseId={caseId} />}
              {activeTab === 5 && (
                <ShuffleActionsPanel
                  caseId={caseId}
                  caseName={caseData?.case_name}
                  irisConfigured={irisConfigured}
                  shuffleConfigured={shuffleConfigured}
                />
              )}
              {activeTab === 6 && <ActivityPanel caseId={caseId} />}
              {activeTab === 7 && <ReportPanel   caseId={caseId} caseData={caseData} />}
              {activeTab === 8 && (
                <ClosurePanel
                  caseId={caseId}
                  caseData={caseData}
                  onClosed={() => {
                    queryClient.invalidateQueries({ queryKey: ['iris-cases'] })
                    navigate('/soar')
                  }}
                />
              )}
            </>
          )}
        </Box>
      </Box>
    </PageShell>
  )
}
