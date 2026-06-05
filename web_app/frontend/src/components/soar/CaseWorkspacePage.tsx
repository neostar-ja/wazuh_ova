/**
 * CaseWorkspacePage — SOC Incident Response Case Workspace
 * Standard: NIST SP 800-61r3 · DFIR-IRIS · Shuffle SOAR integration
 * Responsive: mobile-first → desktop sidebar layout
 */
import { useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box, Button, Chip, CircularProgress, Divider, IconButton,
  Skeleton, Stack, Tab, Tabs, Tooltip, Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackRoundedIcon      from '@mui/icons-material/ArrowBackRounded'
import FolderOpenRoundedIcon     from '@mui/icons-material/FolderOpenRounded'
import BarChartRoundedIcon       from '@mui/icons-material/BarChartRounded'
import TimelineRoundedIcon       from '@mui/icons-material/TimelineRounded'
import ChecklistRoundedIcon      from '@mui/icons-material/ChecklistRounded'
import BugReportRoundedIcon      from '@mui/icons-material/BugReportRounded'
import NotesRoundedIcon          from '@mui/icons-material/NotesRounded'
import AttachFileRoundedIcon     from '@mui/icons-material/AttachFileRounded'
import AutoFixHighRoundedIcon    from '@mui/icons-material/AutoFixHighRounded'
import HistoryRoundedIcon        from '@mui/icons-material/HistoryRounded'
import AssessmentRoundedIcon     from '@mui/icons-material/AssessmentRounded'
import LockRoundedIcon           from '@mui/icons-material/LockRounded'
import OpenInNewRoundedIcon      from '@mui/icons-material/OpenInNewRounded'
import TravelExploreRoundedIcon  from '@mui/icons-material/TravelExploreRounded'
import RefreshRoundedIcon        from '@mui/icons-material/RefreshRounded'
import ContentCopyRoundedIcon    from '@mui/icons-material/ContentCopyRounded'
import AccessTimeRoundedIcon     from '@mui/icons-material/AccessTimeRounded'
import PersonRoundedIcon         from '@mui/icons-material/PersonRounded'
import BusinessRoundedIcon       from '@mui/icons-material/BusinessRounded'
import ErrorOutlineRoundedIcon   from '@mui/icons-material/ErrorOutlineRounded'
import { useSnackbar } from 'notistack'
import { PageShell }     from '../ui/layout'
import { soarApi, extractCaseIocs } from '../../services/soarApi'
import { hexRgb, fmtTime } from './soarUtils'
import CaseOverviewPanel from './iris/CaseOverviewPanel'
import TimelinePanel     from './iris/TimelinePanel'
import TasksPanel        from './iris/TasksPanel'
import IocPanel          from './iris/IocPanel'
import NotesPanel        from './iris/NotesPanel'
import EvidencePanel     from './iris/EvidencePanel'
import ShuffleActionsPanel from './iris/ShuffleActionsPanel'
import ActivityPanel     from './iris/ActivityPanel'
import ReportPanel       from './iris/ReportPanel'
import ClosurePanel      from './iris/ClosurePanel'

const CASE_COLOR = '#6366F1'

// Tab order follows NIST SP 800-61r3 IR lifecycle
const TABS = [
  { key: 'overview',  label: 'Overview',   icon: <BarChartRoundedIcon      sx={{ fontSize: 13 }} /> },
  { key: 'timeline',  label: 'Timeline',   icon: <TimelineRoundedIcon      sx={{ fontSize: 13 }} /> },
  { key: 'tasks',     label: 'Tasks',      icon: <ChecklistRoundedIcon     sx={{ fontSize: 13 }} /> },
  { key: 'iocs',      label: 'IOC',        icon: <BugReportRoundedIcon     sx={{ fontSize: 13 }} /> },
  { key: 'notes',     label: 'Notes',      icon: <NotesRoundedIcon         sx={{ fontSize: 13 }} /> },
  { key: 'evidence',  label: 'Evidence',   icon: <AttachFileRoundedIcon    sx={{ fontSize: 13 }} /> },
  { key: 'shuffle',   label: 'Shuffle',    icon: <AutoFixHighRoundedIcon   sx={{ fontSize: 13 }} /> },
  { key: 'activity',  label: 'Activity',   icon: <HistoryRoundedIcon       sx={{ fontSize: 13 }} /> },
  { key: 'report',    label: 'Report',     icon: <AssessmentRoundedIcon    sx={{ fontSize: 13 }} /> },
  { key: 'closure',   label: 'Closure',    icon: <LockRoundedIcon          sx={{ fontSize: 13 }} /> },
]

// ── Case Header ─────────────────────────────────────────────────────────────

interface CaseHeaderProps {
  caseInfo: Record<string, unknown> | null
  irisUrl?: string
  loading: boolean
  onRefresh: () => void
  irisOnline: boolean
}

function CaseHeader({ caseInfo, irisUrl, loading, onRefresh, irisOnline }: CaseHeaderProps) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const navigate = useNavigate()

  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'
  const textSec   = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,40,100,0.75)'

  const caseName  = caseInfo?.case_name  as string | undefined
  const caseId    = caseInfo?.case_id    as number | undefined
  const isOpen    = !(caseInfo?.close_date ?? caseInfo?.case_close_date)
  const owner     = caseInfo?.owner      as string | undefined
  const client    = caseInfo?.customer_name ?? caseInfo?.client_name as string | undefined
  const openDate  = caseInfo?.open_date  ?? caseInfo?.case_open_date as string | undefined
  const closeDate = caseInfo?.close_date ?? caseInfo?.case_close_date as string | undefined
  const tags      = (caseInfo?.case_tags as string | undefined)?.split(',').map(t => t.trim()).filter(Boolean) ?? []
  const severity  = caseInfo?.severity_name ?? caseInfo?.case_severity as string | undefined
  const desc      = caseInfo?.case_description as string | undefined

  const daysOpen = openDate
    ? Math.floor((Date.now() - new Date(openDate).getTime()) / 86400000)
    : null

  const handleCopyId = () => {
    navigator.clipboard.writeText(String(caseId)).then(
      () => enqueueSnackbar(`Copied Case #${caseId}`, { variant: 'success', autoHideDuration: 1500 })
    )
  }

  const SEV_COLOR_MAP: Record<string, string> = {
    critical: '#EF4444', high: '#F17422', medium: '#EAB308', low: '#22C55E',
  }
  const sevKey = String(severity ?? '').toLowerCase()
  const sevColor = SEV_COLOR_MAP[sevKey] ?? '#64748B'

  if (loading) {
    return (
      <Box className="rounded-2xl p-5 mb-4"
        sx={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.9)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}` }}>
        <Stack spacing={1.5}>
          <Box className="flex items-center gap-3">
            <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 2 }} />
            <Box className="flex-1">
              <Skeleton variant="text" width="55%" height={26} />
              <Skeleton variant="text" width="25%" height={14} />
            </Box>
          </Box>
          <Box className="flex gap-2">
            {[80, 100, 70].map(w => <Skeleton key={w} variant="rounded" width={w} height={22} sx={{ borderRadius: 10 }} />)}
          </Box>
        </Stack>
      </Box>
    )
  }

  return (
    <Box
      className="rounded-2xl mb-4 overflow-hidden"
      sx={{
        background: isDark
          ? 'linear-gradient(135deg,rgba(99,102,241,0.12) 0%,rgba(18,14,33,0.9) 100%)'
          : 'linear-gradient(135deg,rgba(99,102,241,0.08) 0%,rgba(248,246,255,0.95) 100%)',
        border: `1px solid ${isDark ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.18)'}`,
      }}
    >
      {/* Top bar: case name + actions */}
      <Box className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 sm:p-5">
        <Box className="flex items-start gap-3 flex-1 min-w-0">
          <Box className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            sx={{ background: `rgba(${hexRgb(CASE_COLOR)},0.14)` }}>
            <FolderOpenRoundedIcon sx={{ fontSize: 22, color: CASE_COLOR }} />
          </Box>
          <Box className="flex-1 min-w-0">
            <Box className="flex items-center gap-2 flex-wrap">
              <Typography
                sx={{ fontSize: 18, fontWeight: 800, color: isDark ? '#EDE9FA' : '#1A1033', lineHeight: 1.2 }}
                className="break-words"
              >
                {caseName ?? '—'}
              </Typography>
              {!irisOnline && (
                <Tooltip title="IRIS ออฟไลน์ — แสดงข้อมูล cached">
                  <ErrorOutlineRoundedIcon sx={{ fontSize: 14, color: '#F59E0B' }} />
                </Tooltip>
              )}
            </Box>
            <Box className="flex items-center gap-1.5 mt-0.5">
              <Typography className="font-mono text-[10px]" sx={{ color: textMuted }}>
                Case #{caseId}
              </Typography>
              <Tooltip title="Copy Case ID">
                <IconButton size="small" onClick={handleCopyId}
                  sx={{ p: 0.25, color: textMuted, '&:hover': { color: CASE_COLOR } }}>
                  <ContentCopyRoundedIcon sx={{ fontSize: 10 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box className="flex flex-wrap gap-1.5 shrink-0">
          <Tooltip title="Refresh data">
            <IconButton size="small" onClick={onRefresh}
              sx={{ color: textMuted, '&:hover': { color: CASE_COLOR, background: `rgba(${hexRgb(CASE_COLOR)},0.08)` } }}>
              <RefreshRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          {irisUrl && caseId && (
            <Button size="small" variant="outlined" endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 11 }} />}
              component="a" href={`${irisUrl}/case?cid=${caseId}`} target="_blank" rel="noopener"
              sx={{ borderRadius: 2, fontSize: 11, px: 1.5, borderColor: `rgba(${hexRgb(CASE_COLOR)},0.4)`, color: CASE_COLOR,
                '&:hover': { borderColor: CASE_COLOR, background: `rgba(${hexRgb(CASE_COLOR)},0.06)` } }}>
              DFIR-IRIS
            </Button>
          )}
          <Button size="small" variant="outlined" startIcon={<TravelExploreRoundedIcon sx={{ fontSize: 12 }} />}
            onClick={() => navigate(`/investigate?q=${encodeURIComponent(caseName ?? '')}&range=30d`)}
            sx={{ borderRadius: 2, fontSize: 11, px: 1.5, borderColor: 'rgba(56,189,248,0.4)', color: '#38BDF8',
              '&:hover': { borderColor: '#38BDF8', background: 'rgba(56,189,248,0.06)' } }}>
            Investigate
          </Button>
        </Box>
      </Box>

      {/* Metadata bar */}
      <Box
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 pb-4"
      >
        {/* Status */}
        <Chip size="small"
          label={isOpen ? '● กำลังดำเนินการ' : '✓ ปิดแล้ว'}
          sx={{
            height: 22, fontSize: 10, fontWeight: 700,
            bgcolor: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
            color: isOpen ? '#22C55E' : '#64748B',
            border: isOpen ? '1px solid rgba(34,197,94,0.28)' : '1px solid rgba(100,116,139,0.28)',
          }}
        />

        {/* Severity */}
        {severity && (
          <Chip size="small" label={severity}
            sx={{ height: 22, fontSize: 10, fontWeight: 700,
              bgcolor: `rgba(${hexRgb(sevColor)},0.12)`, color: sevColor,
              border: `1px solid rgba(${hexRgb(sevColor)},0.28)` }} />
        )}

        {/* Owner */}
        {owner && (
          <Box className="flex items-center gap-1">
            <PersonRoundedIcon sx={{ fontSize: 12, color: textMuted }} />
            <Typography sx={{ fontSize: 10.5, color: textSec }}>{owner}</Typography>
          </Box>
        )}

        {/* Client */}
        {client && (
          <Box className="flex items-center gap-1">
            <BusinessRoundedIcon sx={{ fontSize: 12, color: textMuted }} />
            <Typography sx={{ fontSize: 10.5, color: textSec }}>{client}</Typography>
          </Box>
        )}

        {/* Days open */}
        {daysOpen !== null && (
          <Box className="flex items-center gap-1">
            <AccessTimeRoundedIcon sx={{ fontSize: 12, color: textMuted }} />
            <Typography sx={{ fontSize: 10, color: textMuted }}>
              เปิด {fmtTime(openDate as string)} ({daysOpen} วัน)
            </Typography>
          </Box>
        )}

        {/* Close date */}
        {closeDate && (
          <Typography sx={{ fontSize: 10, color: textMuted }}>
            ปิด: {fmtTime(closeDate as string)}
          </Typography>
        )}

        {/* Tags */}
        {tags.map(tag => (
          <Box key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
            sx={{ background: `rgba(${hexRgb(CASE_COLOR)},0.1)`, color: isDark ? '#A5B4FC' : CASE_COLOR }}>
            {tag}
          </Box>
        ))}
      </Box>

      {/* Description */}
      {desc && (
        <Box className="px-5 pb-4">
          <Typography
            sx={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.65)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
          >
            {desc.slice(0, 300)}{desc.length > 300 ? '…' : ''}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

// ── Integration Status Bar ───────────────────────────────────────────────────

function IntegStatusBar({ irisOk, shuffleOk }: { irisOk: boolean; shuffleOk: boolean }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  const pill = (label: string, ok: boolean) => (
    <Box key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      sx={{
        background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${ok ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`,
      }}>
      <Box className="w-1.5 h-1.5 rounded-full"
        sx={{ background: ok ? '#22C55E' : '#EF4444', animation: ok ? 'pulseGlow 2.5s ease-in-out infinite' : 'none' }} />
      <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: ok ? '#22C55E' : '#EF4444' }}>
        {label}
      </Typography>
    </Box>
  )

  return (
    <Box className="flex items-center gap-2 mb-3 flex-wrap">
      <Typography sx={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(60,40,100,0.35)', fontWeight: 600, letterSpacing: '0.06em' }}>
        INTEGRATIONS:
      </Typography>
      {pill('DFIR-IRIS', irisOk)}
      {pill('SHUFFLE SOAR', shuffleOk)}
    </Box>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CaseWorkspacePage() {
  const { caseId: caseIdStr } = useParams<{ caseId: string }>()
  const caseId = Number(caseIdStr)
  const navigate = useNavigate()
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState(0)

  const handleTabChange = useCallback((tab: number) => setActiveTab(tab), [])

  // Integration health (shared query)
  const { data: healthData } = useQuery({
    queryKey: ['soar-health'],
    queryFn: () => soarApi.getHealth().then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const integrations = (healthData?.integrations ?? []) as { id: string; configured: boolean; connected: boolean; detail?: { iris_url?: string } }[]
  const irisEntry    = integrations.find(i => i.id === 'dfir_iris')
  const shuffleEntry = integrations.find(i => i.id === 'shuffle')
  const irisOk       = !!irisEntry?.connected
  const shuffleOk    = !!shuffleEntry?.connected
  const irisUrl      = irisEntry?.detail?.iris_url ?? ''

  // Load case detail DIRECTLY by ID (not all cases)
  const {
    data: caseFull,
    isLoading,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['case-full', caseId],
    queryFn: () => soarApi.getIrisCaseFull(caseId).then(r => r.data),
    enabled: !!caseId,
    retry: 1,
  })

  const caseInfo = caseFull?.case ?? null

  // Build IrisCase-compatible object for child components
  const caseDataCompat = caseInfo ? {
    case_id:          (caseInfo.case_id ?? caseId) as number,
    case_name:        (caseInfo.case_name ?? '') as string,
    case_description: (caseInfo.case_description ?? '') as string,
    case_open_date:   (caseInfo.open_date ?? caseInfo.case_open_date ?? '') as string,
    case_close_date:  (caseInfo.close_date ?? caseInfo.case_close_date ?? null) as string | null,
    opened_by:        (caseInfo.opened_by ?? '') as string,
    owner:            (caseInfo.owner ?? '') as string,
    state_name:       (caseInfo.state_name ?? null) as string | null,
    client_name:      (caseInfo.customer_name ?? caseInfo.client_name ?? '') as string,
  } : null

  // Tab counts from parallel queries (already cached in panels)
  const { data: tasksData } = useQuery({ queryKey: ['case-tasks', caseId], queryFn: () => soarApi.getCaseTasks(caseId).then(r => r.data), enabled: !!caseId })
  const { data: iocsData }  = useQuery({ queryKey: ['case-iocs', caseId],  queryFn: () => soarApi.getCaseIocs(caseId).then(r => r.data),  enabled: !!caseId })
  const { data: evData }    = useQuery({ queryKey: ['case-evidence', caseId], queryFn: () => soarApi.getCaseEvidence(caseId).then(r => r.data), enabled: !!caseId })

  const tabBadge = (key: string) => {
    if (key === 'tasks')    return (tasksData?.tasks?.length ?? 0) || undefined
    if (key === 'iocs')     return extractCaseIocs(iocsData).length || undefined
    if (key === 'evidence') return (evData?.evidence?.length ?? 0) || undefined
    return undefined
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['case-full', caseId] })
    queryClient.invalidateQueries({ queryKey: ['case-tasks', caseId] })
    queryClient.invalidateQueries({ queryKey: ['case-iocs', caseId] })
    queryClient.invalidateQueries({ queryKey: ['case-notes', caseId] })
    queryClient.invalidateQueries({ queryKey: ['case-timeline', caseId] })
    queryClient.invalidateQueries({ queryKey: ['case-evidence', caseId] })
    queryClient.invalidateQueries({ queryKey: ['case-activity', caseId] })
    queryClient.invalidateQueries({ queryKey: ['shuffle-actions', caseId] })
    refetch()
  }

  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.1)'
  const tabBg   = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.92)'

  // ── Error state ──────────────────────────────────────────────────────────
  if (isError && !isLoading) {
    return (
      <PageShell title={`Case #${caseId}`} subtitle="DFIR-IRIS Case Workspace">
        <Box className="mb-3">
          <Button size="small" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/soar')}
            sx={{ borderRadius: 2, fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.5)' }}>
            กลับ SOAR
          </Button>
        </Box>
        <Box className="flex flex-col items-center justify-center py-20 gap-4">
          <ErrorOutlineRoundedIcon sx={{ fontSize: 48, color: '#EF4444', opacity: 0.6 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033' }}>
            ไม่สามารถโหลด Case #{caseId} ได้
          </Typography>
          <Typography sx={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,100,0.5)', textAlign: 'center', maxWidth: 380 }}>
            {irisOk ? 'Case ID อาจไม่ถูกต้อง หรือ IRIS ไม่มีข้อมูลนี้' : 'DFIR-IRIS ไม่ตอบสนอง — ตรวจสอบการเชื่อมต่อก่อน'}
          </Typography>
          <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={handleRefresh}
            sx={{ borderRadius: 2, fontSize: 12, borderColor: `rgba(${hexRgb(CASE_COLOR)},0.4)`, color: CASE_COLOR }}>
            ลองใหม่
          </Button>
        </Box>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={caseInfo?.case_name as string ?? `Case #${caseId}`}
      subtitle={`DFIR-IRIS Case Workspace — #${caseId}`}
      breadcrumbs={[
        { label: 'SOAR', href: '/soar' },
        { label: `Case #${caseId}` },
      ]}
    >
      {/* Back + integration status */}
      <Box className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <Button size="small" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/soar')}
          sx={{ borderRadius: 2, fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.5)',
            '&:hover': { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.06)' } }}>
          กลับ SOAR
        </Button>
        <IntegStatusBar irisOk={irisOk} shuffleOk={shuffleOk} />
      </Box>

      {/* Case header */}
      <CaseHeader
        caseInfo={caseInfo as Record<string, unknown> | null}
        irisUrl={irisUrl}
        loading={isLoading}
        onRefresh={handleRefresh}
        irisOnline={irisOk}
      />

      {/* Main workspace */}
      <Box className="rounded-2xl overflow-hidden"
        sx={{ background: tabBg, border: `1px solid ${divider}`, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.28)' : '0 4px 24px rgba(99,102,241,0.07)' }}>

        {/* Tabs — scrollable on all screen sizes */}
        <Box
          sx={{
            borderBottom: `1px solid ${divider}`,
            background: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(99,102,241,0.025)',
            overflowX: 'auto',
          }}
          className="scrollbar-hide"
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                minHeight: 44, fontSize: 11.5, gap: 0.5, px: { xs: 1.5, sm: 2 },
                color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,40,100,0.45)',
                transition: 'color 0.15s,background 0.15s',
                '&:hover': { color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(60,40,100,0.8)', background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)' },
              },
              '& .Mui-selected': { color: `${CASE_COLOR} !important`, fontWeight: 700 },
              '& .MuiTabs-indicator': { backgroundColor: CASE_COLOR, height: 2.5, borderRadius: '2px 2px 0 0' },
              '& .MuiTabScrollButton-root': { color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(60,40,100,0.35)' },
            }}
          >
            {TABS.map((t, i) => {
              const badge = tabBadge(t.key)
              return (
                <Tab
                  key={t.key}
                  icon={t.icon}
                  iconPosition="start"
                  label={
                    badge ? (
                      <Box className="flex items-center gap-1">
                        {t.label}
                        <Box
                          className="px-1.5 rounded-full font-bold"
                          sx={{
                            fontSize: 9, lineHeight: 1.6,
                            background: activeTab === i ? `rgba(${hexRgb(CASE_COLOR)},0.18)` : 'rgba(99,102,241,0.1)',
                            color: CASE_COLOR,
                          }}
                        >
                          {badge}
                        </Box>
                      </Box>
                    ) : t.label
                  }
                />
              )
            })}
          </Tabs>
        </Box>

        {/* Tab content */}
        <Box className="p-4 sm:p-5 md:p-6" sx={{ minHeight: 400 }}>
          {!caseId ? (
            <Typography sx={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,100,0.5)' }}>
              ไม่พบ Case ID ที่ถูกต้อง
            </Typography>
          ) : (
            <>
              {activeTab === 0 && (
                <CaseOverviewPanel
                  caseId={caseId}
                  caseData={caseDataCompat}
                  irisUrl={irisUrl}
                  onTabChange={handleTabChange}
                />
              )}
              {activeTab === 1 && <TimelinePanel  caseId={caseId} />}
              {activeTab === 2 && <TasksPanel     caseId={caseId} />}
              {activeTab === 3 && <IocPanel       caseId={caseId} />}
              {activeTab === 4 && <NotesPanel     caseId={caseId} />}
              {activeTab === 5 && <EvidencePanel  caseId={caseId} />}
              {activeTab === 6 && (
                <ShuffleActionsPanel
                  caseId={caseId}
                  caseName={caseInfo?.case_name as string | undefined}
                  irisConfigured={!!irisEntry?.configured}
                  shuffleConfigured={!!shuffleEntry?.configured}
                />
              )}
              {activeTab === 7 && <ActivityPanel  caseId={caseId} />}
              {activeTab === 8 && <ReportPanel    caseId={caseId} caseData={caseDataCompat} />}
              {activeTab === 9 && (
                <ClosurePanel
                  caseId={caseId}
                  caseData={caseDataCompat}
                  onClosed={() => {
                    queryClient.invalidateQueries({ queryKey: ['iris-cases'] })
                    queryClient.invalidateQueries({ queryKey: ['case-full', caseId] })
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
