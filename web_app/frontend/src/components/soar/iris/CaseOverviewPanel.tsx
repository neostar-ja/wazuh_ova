/**
 * CaseOverviewPanel — NIST SP 800-61r3 Incident Response Dashboard
 * Shows lifecycle progress, key metrics, integration status, recent activity.
 */
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, CircularProgress, Chip, LinearProgress, Skeleton,
  Stack, Tooltip, Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts'
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import { soarApi, IrisCase, CaseTask, extractCaseIocs } from '../../../services/soarApi'
import { hexRgb, fmtTime } from '../soarUtils'
import { CHART_TIP_STYLE } from '../../ui/tokens'

const CASE_COLOR = '#6366F1'

// NIST SP 800-61r3 Incident Response phases
const NIST_PHASES = [
  { id: 'detect',    label: 'Detection &\nAnalysis',  color: '#38BDF8', icon: '🔍' },
  { id: 'contain',   label: 'Containment',             color: '#F17422', icon: '🛡️' },
  { id: 'eradicate', label: 'Eradication',             color: '#EAB308', icon: '🧹' },
  { id: 'recover',   label: 'Recovery',                color: '#22C55E', icon: '🔄' },
  { id: 'post',      label: 'Post-Incident\nActivity', color: '#A855F7', icon: '📋' },
]

function deriveNistPhase(tasks: CaseTask[], isOpen: boolean): number {
  if (!isOpen) return 4
  const done  = tasks.filter(t => t.status === 'done').length
  const total = tasks.length
  if (total === 0) return 0
  const ratio = done / total
  if (ratio >= 0.9) return 4
  if (ratio >= 0.7) return 3
  if (ratio >= 0.4) return 2
  if (ratio >= 0.1) return 1
  return 0
}

function NistLifecycle({ phase }: { phase: number }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'

  return (
    <Box>
      <Typography className="text-[9px] font-bold tracking-widest mb-3" sx={{ color: textMuted }}>
        NIST IR LIFECYCLE — SP 800-61r3
      </Typography>
      <Box className="flex items-center gap-0 overflow-x-auto">
        {NIST_PHASES.map((p, i) => {
          const active   = i === phase
          const done     = i < phase
          const futureOp = i > phase

          return (
            <Box key={p.id} className="flex items-center">
              <Tooltip title={p.label.replace('\n', ' ')} arrow placement="top">
                <Box
                  className="flex flex-col items-center px-3 py-2 rounded-xl cursor-default transition-all"
                  sx={{
                    background: active  ? `rgba(${hexRgb(p.color)},0.15)` :
                                done    ? `rgba(${hexRgb(p.color)},0.07)` :
                                          isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.5)',
                    border: `1.5px solid ${active ? p.color : done ? `rgba(${hexRgb(p.color)},0.35)` : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}`,
                    minWidth: 70,
                    opacity: futureOp ? 0.45 : 1,
                  }}
                >
                  <Typography sx={{ fontSize: 18, lineHeight: 1 }}>{p.icon}</Typography>
                  <Typography
                    sx={{ fontSize: 9, fontWeight: active ? 800 : 600, mt: 0.5, color: active ? p.color : done ? p.color : textMuted, textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3 }}
                  >
                    {p.label}
                  </Typography>
                  {done && (
                    <CheckCircleOutlineRoundedIcon sx={{ fontSize: 11, color: p.color, mt: 0.3 }} />
                  )}
                  {active && (
                    <Box className="w-1.5 h-1.5 rounded-full mt-0.5 animate-pulse" sx={{ background: p.color }} />
                  )}
                </Box>
              </Tooltip>
              {i < NIST_PHASES.length - 1 && (
                <Box className="w-6 h-0.5 shrink-0"
                  sx={{ background: i < phase ? '#22C55E' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.12)' }} />
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

function MetricCard({
  icon, label, value, sub, color, loading,
}: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; loading?: boolean }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'

  return (
    <Box
      className="flex items-center gap-3 p-3 rounded-xl"
      sx={{
        background: isDark ? `rgba(${hexRgb(color)},0.07)` : `rgba(${hexRgb(color)},0.05)`,
        border: `1px solid rgba(${hexRgb(color)},0.2)`,
      }}
    >
      <Box className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        sx={{ background: `rgba(${hexRgb(color)},0.12)`, color }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', color: textMuted, mb: 0.2 }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={40} sx={{ bgcolor: `rgba(${hexRgb(color)},0.15)` }} />
        ) : (
          <Typography className="font-mono font-bold" sx={{ fontSize: 20, color, lineHeight: 1 }}>
            {value}
          </Typography>
        )}
        {sub && <Typography sx={{ fontSize: 9, color: textMuted, mt: 0.2 }}>{sub}</Typography>}
      </Box>
    </Box>
  )
}

interface Props {
  caseId: number
  caseData: IrisCase | null
  irisUrl?: string
  onTabChange?: (tab: number) => void
}

export default function CaseOverviewPanel({ caseId, caseData, irisUrl, onTabChange }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const navigate = useNavigate()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(248,246,255,0.8)'
  const divider   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.08)'

  // Parallel data fetch
  const { data: tasksData }    = useQuery({ queryKey: ['case-tasks', caseId],    queryFn: () => soarApi.getCaseTasks(caseId).then(r => r.data),    enabled: !!caseId })
  const { data: iocsData }     = useQuery({ queryKey: ['case-iocs', caseId],     queryFn: () => soarApi.getCaseIocs(caseId).then(r => r.data),     enabled: !!caseId })
  const { data: notesData }    = useQuery({ queryKey: ['case-notes', caseId],    queryFn: () => soarApi.getCaseNotes(caseId).then(r => r.data),    enabled: !!caseId })
  const { data: timelineData } = useQuery({ queryKey: ['case-timeline', caseId], queryFn: () => soarApi.getCaseTimeline(caseId).then(r => r.data), enabled: !!caseId })
  const { data: evData }       = useQuery({ queryKey: ['case-evidence', caseId], queryFn: () => soarApi.getCaseEvidence(caseId).then(r => r.data), enabled: !!caseId })
  const { data: actData }      = useQuery({ queryKey: ['case-activity', caseId], queryFn: () => soarApi.getCaseActivity(caseId).then(r => r.data), enabled: !!caseId })
  const { data: shaData }      = useQuery({ queryKey: ['shuffle-actions', caseId], queryFn: () => soarApi.getShuffleActions(caseId).then(r => r.data), enabled: !!caseId })

  const tasks: CaseTask[] = tasksData?.tasks ?? []
  const iocs = extractCaseIocs(iocsData)
  const notes  = (notesData?.data ?? []).flatMap((g: { notes?: unknown[] }) => g.notes ?? [])
  const tlEvents = (timelineData?.data?.timeline ?? []) as unknown[]
  const evidence = evData?.evidence ?? []
  const activity = (actData?.activity ?? []) as { action: string; detail?: string; username?: string; created_at?: string }[]
  const shuffleActions = (shaData?.actions ?? []) as { action_type: string; response_mode: string; created_at?: string }[]

  const isOpen = !caseData?.case_close_date
  const tasksDone    = tasks.filter(t => t.status === 'done').length
  const tasksTotal   = tasks.length
  const tasksPct     = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0
  const nistPhase    = deriveNistPhase(tasks, isOpen)

  // Days open
  const daysOpen = caseData?.case_open_date
    ? Math.floor((Date.now() - new Date(caseData.case_open_date).getTime()) / 86400000)
    : null

  // SLA warning (>7 days open without closure)
  const slaWarning = isOpen && daysOpen !== null && daysOpen > 7

  // Task priority chart data
  const priorityData = [
    { name: 'Critical', value: tasks.filter(t => t.priority === 'critical').length, color: '#EF4444' },
    { name: 'High',     value: tasks.filter(t => t.priority === 'high').length,     color: '#F17422' },
    { name: 'Medium',   value: tasks.filter(t => t.priority === 'medium').length,   color: '#EAB308' },
    { name: 'Low',      value: tasks.filter(t => t.priority === 'low').length,      color: '#22C55E' },
  ].filter(d => d.value > 0)

  // Task status chart data
  const statusData = [
    { name: 'รอ',      value: tasks.filter(t => t.status === 'todo').length,        fill: '#64748B' },
    { name: 'กำลังทำ', value: tasks.filter(t => t.status === 'in_progress').length, fill: '#38BDF8' },
    { name: 'เสร็จ',   value: tasks.filter(t => t.status === 'done').length,        fill: '#22C55E' },
    { name: 'ติด',     value: tasks.filter(t => t.status === 'blocked').length,     fill: '#EF4444' },
  ].filter(d => d.value > 0)

  const tipStyle = isDark ? CHART_TIP_STYLE : {
    background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 8, fontSize: 11, color: '#1A1033',
  }

  const loading = !tasksData || !iocsData

  return (
    <Stack spacing={3} className="animate-fade-in">
      {/* SLA Warning */}
      {slaWarning && (
        <Box className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
          sx={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.25)' }}>
          <WarningAmberRoundedIcon sx={{ fontSize: 18, color: '#EAB308' }} />
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#EAB308' }}>
              SLA Warning — เคสเปิดมา {daysOpen} วัน
            </Typography>
            <Typography sx={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.6)' }}>
              เคสที่เปิดเกิน 7 วันควรได้รับการตรวจสอบและปิดหรืออัปเดตสถานะ
            </Typography>
          </Box>
        </Box>
      )}

      {/* NIST Lifecycle */}
      <Box className="p-4 rounded-xl" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
        <NistLifecycle phase={nistPhase} />
        <Box className="mt-3">
          <Box className="flex items-center justify-between mb-1">
            <Typography sx={{ fontSize: 10, color: textMuted }}>
              ความคืบหน้า Tasks: {tasksDone}/{tasksTotal}
            </Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: tasksPct >= 100 ? '#22C55E' : CASE_COLOR }}>
              {tasksPct}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={tasksPct}
            sx={{
              height: 6, borderRadius: 3,
              bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: tasksPct >= 100
                  ? 'linear-gradient(90deg,#22C55E,#16A34A)'
                  : `linear-gradient(90deg,${CASE_COLOR},#818CF8)`,
              },
            }}
          />
        </Box>
      </Box>

      {/* Metric cards */}
      <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        <MetricCard icon={<AccessTimeRoundedIcon sx={{ fontSize: 18 }} />}
          label="วันที่เปิดเคส" value={daysOpen ?? '—'} sub="วัน" color="#F59E0B" loading={loading && daysOpen === null} />
        <MetricCard icon={<ChecklistRoundedIcon sx={{ fontSize: 18 }} />}
          label="Tasks" value={loading ? '…' : `${tasksDone}/${tasksTotal}`} sub={`${tasksPct}% เสร็จ`} color={CASE_COLOR} loading={loading} />
        <MetricCard icon={<BugReportRoundedIcon sx={{ fontSize: 18 }} />}
          label="IOC" value={loading ? '…' : iocs.length} sub="indicators" color="#F17422" loading={loading} />
        <MetricCard icon={<TimelineRoundedIcon sx={{ fontSize: 18 }} />}
          label="Timeline Events" value={loading ? '…' : tlEvents.length} sub="เหตุการณ์" color="#14B8A6" loading={loading} />
        <MetricCard icon={<NotesRoundedIcon sx={{ fontSize: 18 }} />}
          label="Notes" value={loading ? '…' : notes.length} sub="บันทึก" color="#8B5CF6" loading={loading} />
        <MetricCard icon={<AutoFixHighRoundedIcon sx={{ fontSize: 18 }} />}
          label="Shuffle Actions" value={loading ? '…' : shuffleActions.length} sub="ดำเนินการแล้ว" color="#22C55E" loading={loading} />
      </Box>

      {/* Charts row */}
      {tasks.length > 0 && (
        <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Task status bar chart */}
          {statusData.length > 0 && (
            <Box className="p-4 rounded-xl" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
              <Typography className="text-[9px] font-bold tracking-widest mb-3" sx={{ color: textMuted }}>
                TASK STATUS
              </Typography>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={statusData} layout="vertical" margin={{ left: -10, right: 8 }}>
                  <XAxis type="number" tick={{ fill: textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.6)', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                  <RTooltip contentStyle={tipStyle} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}

          {/* Priority pie chart */}
          {priorityData.length > 0 && (
            <Box className="p-4 rounded-xl" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
              <Typography className="text-[9px] font-bold tracking-widest mb-1" sx={{ color: textMuted }}>
                TASK PRIORITY
              </Typography>
              <Box className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" paddingAngle={3}>
                      {priorityData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                    </Pie>
                    <RTooltip contentStyle={tipStyle} formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <Stack spacing={0.75}>
                  {priorityData.map(d => (
                    <Box key={d.name} className="flex items-center gap-1.5">
                      <Box className="w-2 h-2 rounded-sm shrink-0" sx={{ background: d.color }} />
                      <Typography sx={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,40,100,0.7)' }}>
                        {d.name}
                      </Typography>
                      <Typography className="font-mono font-bold ml-auto text-[10px]" sx={{ color: d.color }}>
                        {d.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Recent activity */}
      <Box className="p-4 rounded-xl" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
        <Box className="flex items-center justify-between mb-3">
          <Typography className="text-[9px] font-bold tracking-widest" sx={{ color: textMuted }}>
            RECENT ACTIVITY
          </Typography>
          {onTabChange && (
            <Button size="small" sx={{ fontSize: 9, color: CASE_COLOR, p: 0.5, minWidth: 0 }}
              onClick={() => onTabChange(7)}>
              ดูทั้งหมด →
            </Button>
          )}
        </Box>
        {activity.length === 0 ? (
          <Typography sx={{ fontSize: 11, color: textMuted }}>ยังไม่มี activity</Typography>
        ) : (
          <Stack spacing={1}>
            {activity.slice(0, 5).map((a, i) => {
              const ACTION_EMOJI: Record<string, string> = {
                task_created: '✓', task_updated: '↻', evidence_added: '📎',
                shuffle_action: '⚡', template_applied: '📋', task_deleted: '✕',
              }
              return (
                <Box key={i} className="flex items-start gap-2.5">
                  <Box className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] mt-0.5"
                    sx={{ background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)' }}>
                    {ACTION_EMOJI[a.action] ?? '•'}
                  </Box>
                  <Box className="flex-1 min-w-0">
                    <Typography sx={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,40,100,0.75)', lineHeight: 1.4 }}>
                      {a.detail ?? a.action.replace(/_/g, ' ')}
                    </Typography>
                    <Typography sx={{ fontSize: 9, color: textMuted }}>
                      {a.username ? `${a.username} · ` : ''}{fmtTime(a.created_at)}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Stack>
        )}
      </Box>

      {/* Quick actions */}
      <Box className="p-4 rounded-xl" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
        <Typography className="text-[9px] font-bold tracking-widest mb-3" sx={{ color: textMuted }}>
          QUICK ACTIONS
        </Typography>
        <Box className="flex flex-wrap gap-2">
          {onTabChange && (
            <>
              <Button size="small" variant="outlined" startIcon={<ChecklistRoundedIcon sx={{ fontSize: 13 }} />}
                onClick={() => onTabChange(3)}
                sx={{ borderRadius: 2, fontSize: 11, borderColor: `rgba(${hexRgb(CASE_COLOR)},0.4)`, color: CASE_COLOR,
                  '&:hover': { borderColor: CASE_COLOR, background: `rgba(${hexRgb(CASE_COLOR)},0.06)` } }}>
                จัดการ Tasks
              </Button>
              <Button size="small" variant="outlined" startIcon={<BugReportRoundedIcon sx={{ fontSize: 13 }} />}
                onClick={() => onTabChange(4)}
                sx={{ borderRadius: 2, fontSize: 11, borderColor: 'rgba(241,116,34,0.4)', color: '#F17422',
                  '&:hover': { borderColor: '#F17422', background: 'rgba(241,116,34,0.06)' } }}>
                เพิ่ม IOC
              </Button>
              <Button size="small" variant="outlined" startIcon={<AutoFixHighRoundedIcon sx={{ fontSize: 13 }} />}
                onClick={() => onTabChange(6)}
                sx={{ borderRadius: 2, fontSize: 11, borderColor: 'rgba(34,197,94,0.4)', color: '#22C55E',
                  '&:hover': { borderColor: '#22C55E', background: 'rgba(34,197,94,0.06)' } }}>
                Shuffle Actions
              </Button>
            </>
          )}
          <Button size="small" variant="outlined" startIcon={<TravelExploreRoundedIcon sx={{ fontSize: 13 }} />}
            onClick={() => navigate(`/investigate?q=${encodeURIComponent(caseData?.case_name ?? '')}&range=30d`)}
            sx={{ borderRadius: 2, fontSize: 11, borderColor: 'rgba(56,189,248,0.4)', color: '#38BDF8',
              '&:hover': { borderColor: '#38BDF8', background: 'rgba(56,189,248,0.06)' } }}>
            Investigate V2
          </Button>
          {irisUrl && caseData && (
            <Button size="small" variant="text"
              component="a" href={`${irisUrl}/case?cid=${caseData.case_id}`} target="_blank" rel="noopener"
              sx={{ borderRadius: 2, fontSize: 11, color: textMuted,
                '&:hover': { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.05)' } }}>
              เปิดใน IRIS →
            </Button>
          )}
        </Box>
      </Box>
    </Stack>
  )
}
