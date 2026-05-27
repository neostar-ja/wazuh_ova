import { useDeferredValue, useMemo, useState } from 'react'
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  FormControl, Grid, IconButton, InputAdornment, LinearProgress,
  MenuItem, Select, Stack, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip,
  Typography, useTheme,
} from '@mui/material'
import ShieldOutlinedIcon         from '@mui/icons-material/ShieldOutlined'
import VerifiedOutlinedIcon       from '@mui/icons-material/VerifiedOutlined'
import GppBadOutlinedIcon         from '@mui/icons-material/GppBadOutlined'
import WifiTetheringErrorOutlinedIcon from '@mui/icons-material/WifiTetheringErrorOutlined'
import FactCheckOutlinedIcon      from '@mui/icons-material/FactCheckOutlined'
import SearchIcon                 from '@mui/icons-material/Search'
import RefreshRoundedIcon         from '@mui/icons-material/RefreshRounded'
import DownloadRoundedIcon        from '@mui/icons-material/DownloadRounded'
import BugReportOutlinedIcon      from '@mui/icons-material/BugReportOutlined'
import WarningAmberOutlinedIcon   from '@mui/icons-material/WarningAmberOutlined'
import GroupsOutlinedIcon         from '@mui/icons-material/GroupsOutlined'
import PolicyOutlinedIcon         from '@mui/icons-material/PolicyOutlined'
import OpenInNewOutlinedIcon      from '@mui/icons-material/OpenInNewOutlined'
import ContentCopyOutlinedIcon    from '@mui/icons-material/ContentCopyOutlined'
import CheckCircleOutlinedIcon    from '@mui/icons-material/CheckCircleOutlined'
import RuleFolderOutlinedIcon     from '@mui/icons-material/RuleFolderOutlined'
import SecurityRoundedIcon        from '@mui/icons-material/SecurityRounded'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  Line, LineChart, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis, Area, AreaChart,
} from 'recharts'
import { complianceApi } from '../../services/api'
import { PageShell } from '../ui/layout'
import { AlertMessage, DetailPanel, EmptyState, LoadingSpinner, StatusDot } from '../common/CommonComponents'
import { CHART_TIP_STYLE } from '../ui/tokens'
import {
  useComplianceAgents, useComplianceAlerts, useComplianceEvidence,
  useComplianceSca, useComplianceSummary, useComplianceVulnerabilities,
} from './useComplianceData'
import {
  downloadApiBlob, downloadTextFile, formatCompactNumber, formatDateTime,
  formatPercent, FRAMEWORK_COLORS, FRAMEWORK_LABELS, makeCsv, SEVERITY_COLORS,
} from './complianceUtils'

// ── Design tokens ──────────────────────────────────────────────────────────────
const P  = '#7B5BA4'  // purple
const PL = '#A78BCD'  // purple light
const ChartTip = CHART_TIP_STYLE

const TAB_ICONS: React.ReactNode[] = [
  <SecurityRoundedIcon fontSize="small" />,
  <PolicyOutlinedIcon fontSize="small" />,
  <FactCheckOutlinedIcon fontSize="small" />,
  <GroupsOutlinedIcon fontSize="small" />,
  <BugReportOutlinedIcon fontSize="small" />,
  <WarningAmberOutlinedIcon fontSize="small" />,
  <RuleFolderOutlinedIcon fontSize="small" />,
]

const TAB_LABELS_TH = ['ภาพรวม', 'มาตรฐาน', 'ตรวจสอบ SCA', 'อุปกรณ์', 'ช่องโหว่', 'การแจ้งเตือน', 'หลักฐาน']

const FRAMEWORK_TH: Record<string, string> = {
  cis: 'CIS', pci_dss: 'PCI-DSS', gdpr: 'GDPR', hipaa: 'HIPAA',
  nist: 'NIST 800-53', tsc: 'TSC', iso27001: 'ISO 27001', mitre: 'MITRE ATT&CK',
}

// ── Score Gauge (SVG circle) ──────────────────────────────────────────────────
function ScoreGauge({ score, size = 80, color = P }: { score: number | null; size?: number; color?: string }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const pct  = score === null ? 0 : Math.max(0, Math.min(score, 100))
  const dash = (pct / 100) * circ
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Typography sx={{ fontSize: size * 0.18, fontWeight: 900, color, lineHeight: 1, fontFamily: '"IBM Plex Mono"' }}>
          {score === null ? 'N/A' : `${Math.round(score)}`}
        </Typography>
        {score !== null && <Typography sx={{ fontSize: size * 0.1, color: 'text.disabled', lineHeight: 1 }}>%</Typography>}
      </Box>
    </Box>
  )
}

// ── Connection status pill ────────────────────────────────────────────────────
function ConnectionPill({ status }: { status: string }) {
  const MAP: Record<string, { label: string; color: string }> = {
    connected:  { label: 'เชื่อมต่อแล้ว', color: '#10b981' },
    degraded:   { label: 'ลดประสิทธิภาพ',  color: '#f59e0b' },
    error:      { label: 'ขัดข้อง',         color: '#ef4444' },
    cached:     { label: 'ข้อมูลแคช',       color: P },
  }
  const item = MAP[status] || { label: status || 'ไม่ทราบ', color: '#64748b' }
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.6,
      px: 1.1, py: 0.35, borderRadius: '20px',
      bgcolor: `${item.color}15`, border: `1.5px solid ${item.color}35`,
    }}>
      <Box sx={{
        width: 7, height: 7, borderRadius: '50%', bgcolor: item.color,
        animation: status === 'connected' ? 'pulseGlow 2s ease-in-out infinite' : 'none',
      }} />
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: item.color, letterSpacing: '0.04em' }}>
        {item.label.toUpperCase()}
      </Typography>
    </Box>
  )
}

// ── Severity chip (Thai) ──────────────────────────────────────────────────────
function SevChip({ severity }: { severity: string }) {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.unknown
  const TH: Record<string, string> = { critical: 'วิกฤต', high: 'สูง', medium: 'กลาง', low: 'ต่ำ', informational: 'ข้อมูล', unknown: 'ไม่ทราบ' }
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 0.85, py: 0.2, borderRadius: '6px', fontSize: 10.5, fontWeight: 700,
      bgcolor: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
      {TH[severity] || severity}
    </Box>
  )
}

// ── Status chip (Thai) ────────────────────────────────────────────────────────
function StatChip({ status }: { status: string }) {
  const PAL: Record<string, { label: string; color: string }> = {
    passed:          { label: 'ผ่าน',       color: '#10b981' },
    failed:          { label: 'ไม่ผ่าน',    color: '#ef4444' },
    not_applicable:  { label: 'N/A',         color: '#94a3b8' },
    invalid:         { label: 'ไม่ถูกต้อง', color: '#f59e0b' },
    active:          { label: 'ออนไลน์',    color: '#10b981' },
    disconnected:    { label: 'ออฟไลน์',    color: '#ef4444' },
    warning:         { label: 'เตือน',      color: '#f59e0b' },
    good:            { label: 'ดี',          color: '#10b981' },
    critical:        { label: 'วิกฤต',      color: '#ef4444' },
    unknown:         { label: 'ไม่ทราบ',    color: '#64748b' },
  }
  const item = PAL[status] || { label: status, color: '#64748b' }
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 0.85, py: 0.2, borderRadius: '6px', fontSize: 10.5, fontWeight: 700,
      bgcolor: `${item.color}18`, color: item.color, border: `1px solid ${item.color}30`,
    }}>
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
      {item.label}
    </Box>
  )
}

// ── Framework badge pill ──────────────────────────────────────────────────────
function FrameBadge({ id }: { id: string }) {
  const color = FRAMEWORK_COLORS[id] || P
  return (
    <Box sx={{
      display: 'inline-block', px: 0.9, py: 0.15, borderRadius: '5px',
      fontSize: 9.5, fontWeight: 800, bgcolor: `${color}20`, color, border: `1px solid ${color}35`,
      letterSpacing: '0.04em',
    }}>
      {FRAMEWORK_TH[id] || id.toUpperCase()}
    </Box>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  title: string; value: string | number; subtitle?: string
  icon?: React.ComponentType<any>; accent?: string; loading?: boolean
}
function MetricCard({ title, value, subtitle, icon: Icon, accent = P, loading }: MetricCardProps) {
  return (
    <Card sx={{
      height: '100%', position: 'relative', overflow: 'hidden',
      border: '1px solid', borderColor: 'divider',
      transition: 'all 0.2s ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${accent}18` },
    }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${accent} 0%, ${accent}60 100%)` }} />
      <Box sx={{ position: 'absolute', top: -16, right: -16, width: 80, height: 80,
        borderRadius: '50%', bgcolor: `${accent}12`, filter: 'blur(12px)', pointerEvents: 'none' }} />
      <CardContent sx={{ pt: 2.5, pb: '16px !important', position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'text.disabled', mb: 0.5 }}>
              {title}
            </Typography>
            {loading ? (
              <Box sx={{ height: 36, display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} sx={{ color: accent }} />
              </Box>
            ) : (
              <Typography sx={{ fontSize: 28, fontWeight: 900, color: accent, lineHeight: 1, letterSpacing: '-0.03em', mb: 0.4 }}>
                {value}
              </Typography>
            )}
            {subtitle && (
              <Typography sx={{ fontSize: 10, color: 'text.disabled', lineHeight: 1.3 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {Icon && (
            <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center',
              bgcolor: `${accent}18`, color: accent, flexShrink: 0 }}>
              <Icon sx={{ fontSize: 20 }} />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 3, height: 14, borderRadius: 2, bgcolor: P }} />
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary' }}>{title}</Typography>
        </Box>
        {subtitle && <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25, pl: 1.25 }}>{subtitle}</Typography>}
      </Box>
      {action}
    </Box>
  )
}

// ── Chart container card ──────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, height = 200, accent = P }: {
  title: string; subtitle?: string; children: React.ReactNode; height?: number; accent?: string
}) {
  return (
    <Card sx={{
      height: '100%', border: '1px solid', borderColor: 'divider', overflow: 'hidden',
      background: `linear-gradient(135deg, ${accent}04 0%, transparent 60%)`,
    }}>
      <CardContent sx={{ p: '14px 18px !important' }}>
        <SectionHeader title={title} subtitle={subtitle} />
        {children}
      </CardContent>
    </Card>
  )
}

// ── Framework score card ──────────────────────────────────────────────────────
function FrameworkCard({ framework, onSelect }: { framework: any; onSelect: (id: string) => void }) {
  const color = FRAMEWORK_COLORS[framework.frameworkId] || P
  const score = framework.score === null ? null : Number(framework.score)
  return (
    <Card
      onClick={() => onSelect(framework.frameworkId)}
      sx={{
        cursor: 'pointer', height: '100%', overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        transition: 'all 0.22s ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 10px 28px ${color}22`, borderColor: `${color}60` },
      }}
    >
      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${color} 0%, ${color}70 100%)` }} />
      <CardContent sx={{ p: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary', mb: 0.25 }}>
              {FRAMEWORK_TH[framework.frameworkId] || framework.frameworkName}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', lineHeight: 1.4 }}>
              {framework.description}
            </Typography>
          </Box>
          <StatChip status={framework.status} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <ScoreGauge score={score} size={68} color={color} />
          <Box sx={{ flex: 1 }}>
            <Grid container spacing={1}>
              {[
                { label: 'ผ่าน', val: framework.passed, c: '#10b981' },
                { label: 'ไม่ผ่าน', val: framework.failed, c: '#ef4444' },
                { label: 'Critical/High', val: (framework.critical || 0) + (framework.high || 0), c: '#f97316' },
                { label: 'Alerts', val: framework.alertCount, c: P },
              ].map(item => (
                <Grid item xs={6} key={item.label}>
                  <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>{item.label}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: item.c }}>
                    {formatCompactNumber(item.val)}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>

        <LinearProgress
          variant="determinate"
          value={score || 0}
          sx={{
            height: 6, borderRadius: 999,
            bgcolor: `${color}18`,
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>0%</Typography>
          <Typography sx={{ fontSize: 9, color: color, fontWeight: 700 }}>
            {score === null ? 'N/A' : formatPercent(score)}
          </Typography>
          <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>100%</Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Error box ─────────────────────────────────────────────────────────────────
function ErrorBox({ error, onRetry }: { error: any; onRetry: () => void }) {
  return (
    <AlertMessage
      type="error"
      title="โหลดข้อมูลไม่สำเร็จ"
      message={error?.response?.data?.detail || error?.message || 'Compliance API ไม่ตอบสนองหรือข้อมูลไม่สมบูรณ์'}
      action={<Button size="small" variant="outlined" onClick={onRetry} sx={{ fontSize: 11 }}>ลองอีกครั้ง</Button>}
    />
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ value }: { value?: string }) {
  return (
    <Tooltip title="คัดลอก">
      <span>
        <IconButton size="small" disabled={!value}
          onClick={() => value && navigator.clipboard.writeText(value)}
          sx={{ opacity: 0.45, '&:hover': { opacity: 1 }, p: 0.4 }}>
          <ContentCopyOutlinedIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </span>
    </Tooltip>
  )
}

// ── Styled table header cell ──────────────────────────────────────────────────
const THCell = ({ children, align }: { children: React.ReactNode; align?: 'right' | 'left' }) => (
  <TableCell align={align} sx={{
    fontSize: 10, fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase',
    letterSpacing: '0.07em', py: 1.25, whiteSpace: 'nowrap',
    bgcolor: 'background.paper', borderBottom: '2px solid', borderBottomColor: 'divider',
  }}>
    {children}
  </TableCell>
)

// ── Score table row ───────────────────────────────────────────────────────────
function ScoreTableSection({ frameworks, onSelectFramework }: { frameworks: any[]; onSelectFramework: (id: string) => void }) {
  if (!frameworks.length) return <EmptyState title="ยังไม่มีข้อมูล Framework" message="ระบบยังไม่พบข้อมูลควบคุมหรือ alert ที่ map กับ framework ที่เลือก" />
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <THCell>มาตรฐาน</THCell>
            <THCell>คะแนน</THCell>
            <THCell align="right">ผ่าน</THCell>
            <THCell align="right">ไม่ผ่าน</THCell>
            <THCell align="right">Alerts</THCell>
            <THCell>สถานะ</THCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {frameworks.map(item => {
            const color = FRAMEWORK_COLORS[item.frameworkId] || P
            return (
              <TableRow key={item.frameworkId} hover onClick={() => onSelectFramework(item.frameworkId)}
                sx={{ cursor: 'pointer', borderLeft: `3px solid ${color}`, '&:hover': { bgcolor: `${color}06` } }}>
                <TableCell sx={{ py: 1.25 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary' }}>
                    {FRAMEWORK_TH[item.frameworkId] || item.frameworkName}
                  </Typography>
                  <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>
                    {item.frameworkId}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.25, minWidth: 150 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color, mb: 0.3 }}>
                    {item.score === null ? 'N/A' : formatPercent(item.score)}
                  </Typography>
                  <LinearProgress variant="determinate" value={item.score || 0}
                    sx={{ height: 5, borderRadius: 999, bgcolor: `${color}18`,
                      '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 } }} />
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{formatCompactNumber(item.passed)}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{formatCompactNumber(item.failed)}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: PL }}>{formatCompactNumber(item.alertCount)}</Typography>
                </TableCell>
                <TableCell sx={{ py: 1.25 }}><StatChip status={item.status} /></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CompliancePage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [activeTab,       setActiveTab]       = useState(0)
  const [timeRange,       setTimeRange]       = useState('7d')
  const [framework,       setFramework]       = useState('all')
  const [agentGroup,      setAgentGroup]      = useState('all')
  const [agentOs,         setAgentOs]         = useState('all')
  const [severity,        setSeverity]        = useState('all')
  const [status,          setStatus]          = useState('all')
  const [search,          setSearch]          = useState('')
  const [selectedAgent,   setSelectedAgent]   = useState<any>(null)
  const [selectedCheck,   setSelectedCheck]   = useState<any>(null)
  const [agentDrawerTab,  setAgentDrawerTab]  = useState(0)
  const [exporting,       setExporting]       = useState(false)

  const deferredSearch = useDeferredValue(search)

  const baseFilters = useMemo(() => ({
    time_range: timeRange, framework,
    agent_group: agentGroup, agent_os: agentOs,
    severity, status, search: deferredSearch,
  }), [timeRange, framework, agentGroup, agentOs, severity, status, deferredSearch])

  const summaryQuery         = useComplianceSummary(baseFilters)
  const agentsQuery          = useComplianceAgents(baseFilters, activeTab === 3)
  const scaQuery             = useComplianceSca({ ...baseFilters, status: status === 'all' ? 'failed' : status, limit: 250 }, activeTab === 2)
  const vulnerabilitiesQuery = useComplianceVulnerabilities(baseFilters, activeTab === 4)
  const alertsQuery          = useComplianceAlerts(baseFilters, activeTab === 5)
  const evidenceQuery        = useComplianceEvidence(baseFilters, activeTab === 6)

  const agentDetailFilters = useMemo(() => ({ ...baseFilters, agent_id: selectedAgent?.agentId, status: 'all', limit: 200 }), [baseFilters, selectedAgent])
  const agentScaQuery            = useComplianceSca(agentDetailFilters, Boolean(selectedAgent))
  const agentVulnerabilitiesQuery = useComplianceVulnerabilities(agentDetailFilters, Boolean(selectedAgent))
  const agentAlertsQuery         = useComplianceAlerts(agentDetailFilters, Boolean(selectedAgent))

  const summaryData   = summaryQuery.data as any
  const summary       = useMemo(() => summaryData?.summary   || {}, [summaryData])
  const meta          = useMemo(() => summaryData?.meta      || {}, [summaryData])
  const frameworks    = useMemo(() => summaryData?.frameworks || [], [summaryData])
  const charts        = useMemo(() => summaryData?.charts    || {}, [summaryData])
  const frameworkOptions = meta.availableFrameworks || Object.entries(FRAMEWORK_LABELS).map(([fid, fname]) => ({ frameworkId: fid, frameworkName: fname }))
  const groupOptions  = meta.agentGroups || []
  const osOptions     = meta.agentOs || []

  const currentRows = useMemo(() => {
    if (activeTab === 1) return frameworks
    if (activeTab === 2) return scaQuery.data?.checks || []
    if (activeTab === 3) return agentsQuery.data?.items || []
    if (activeTab === 4) return vulnerabilitiesQuery.data?.items || []
    if (activeTab === 5) return alertsQuery.data?.items || []
    if (activeTab === 6) return evidenceQuery.data?.items || []
    return [summary, ...(frameworks || [])]
  }, [activeTab, frameworks, scaQuery.data, agentsQuery.data, vulnerabilitiesQuery.data, alertsQuery.data, evidenceQuery.data, summary])

  const handleRefresh = async () => {
    await summaryQuery.refetch()
    if (activeTab === 2) await scaQuery.refetch()
    if (activeTab === 3) await agentsQuery.refetch()
    if (activeTab === 4) await vulnerabilitiesQuery.refetch()
    if (activeTab === 5) await alertsQuery.refetch()
    if (activeTab === 6) await evidenceQuery.refetch()
    if (selectedAgent) await Promise.all([agentScaQuery.refetch(), agentVulnerabilitiesQuery.refetch(), agentAlertsQuery.refetch()])
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      if (activeTab === 0 || activeTab === 1) {
        downloadTextFile(`compliance-${TAB_LABELS_TH[activeTab]}.csv`, makeCsv(currentRows), 'text/csv;charset=utf-8')
      } else {
        const dsMap: Record<number, string> = { 2: 'sca', 3: 'agents', 4: 'vulnerabilities', 5: 'alerts', 6: 'evidence' }
        await downloadApiBlob(`compliance-${dsMap[activeTab] || 'evidence'}-${timeRange}.csv`,
          complianceApi.export({ ...baseFilters, dataset: dsMap[activeTab] || 'evidence', format: 'csv' }))
      }
    } finally { setExporting(false) }
  }

  const handleExportJson = () => {
    downloadTextFile(`compliance-${TAB_LABELS_TH[activeTab]}.json`, JSON.stringify(currentRows, null, 2), 'application/json;charset=utf-8')
  }

  // Chart data
  const findingsBySeverity  = charts.findingsBySeverity || []
  const findingsByFramework = (charts.findingsByFramework || []).map((item: any) => ({ ...item, color: FRAMEWORK_COLORS[item.frameworkId] || P }))
  const timeline            = charts.alertsTimeline || []
  const topFailedControls: any[] = charts.topFailedControls || []
  const topRiskyAgents: any[]    = charts.topRiskyAgents    || []

  const currentTabError = activeTab === 2 ? scaQuery.error : activeTab === 3 ? agentsQuery.error :
    activeTab === 4 ? vulnerabilitiesQuery.error : activeTab === 5 ? alertsQuery.error :
    activeTab === 6 ? evidenceQuery.error : null
  const currentTabRefetch = activeTab === 2 ? scaQuery.refetch : activeTab === 3 ? agentsQuery.refetch :
    activeTab === 4 ? vulnerabilitiesQuery.refetch : activeTab === 5 ? alertsQuery.refetch :
    activeTab === 6 ? evidenceQuery.refetch : summaryQuery.refetch

  const isLoading = summaryQuery.isLoading

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageShell variant="report">
      <Box sx={{ display: 'grid', gap: 2 }}>

        {/* ── Header card ── */}
        <Card sx={{
          border: '1px solid', borderColor: 'divider', overflow: 'hidden',
          background: `linear-gradient(135deg, ${P}08 0%, transparent 60%)`,
          position: 'relative',
        }}>
          <Box sx={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%',
            background: `radial-gradient(circle, ${P}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <CardContent sx={{ p: '20px 24px !important', position: 'relative' }}>
            {/* Title row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${P}20`, color: P }}>
                    <SecurityRoundedIcon sx={{ fontSize: 22, display: 'block' }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                      ศูนย์ Compliance
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
                      ภาพรวมสถานะการปฏิบัติตามมาตรฐาน CIS, PCI-DSS, NIST, GDPR, HIPAA และอื่นๆ
                    </Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <ConnectionPill status={meta.dataSourceStatus} />
                  {meta.lastUpdated && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: '20px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>อัปเดต: {formatDateTime(meta.lastUpdated)}</Typography>
                    </Box>
                  )}
                  {Object.entries(meta.sources || {}).map(([name, stat]) => (
                    <Box key={name} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: '20px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{name}: {stat as string}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="outlined" size="small" startIcon={<RefreshRoundedIcon sx={{ fontSize: 15 }} />}
                  onClick={handleRefresh} disabled={summaryQuery.isFetching}
                  sx={{ borderRadius: '9px', fontSize: 11, borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: P, color: P } }}>
                  รีเฟรช
                </Button>
                <Button variant="outlined" size="small" startIcon={<DownloadRoundedIcon sx={{ fontSize: 15 }} />}
                  onClick={handleExportCsv} disabled={exporting}
                  sx={{ borderRadius: '9px', fontSize: 11, borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: P, color: P } }}>
                  CSV
                </Button>
                <Button variant="outlined" size="small" startIcon={<DownloadRoundedIcon sx={{ fontSize: 15 }} />}
                  onClick={handleExportJson}
                  sx={{ borderRadius: '9px', fontSize: 11, borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: P, color: P } }}>
                  JSON
                </Button>
              </Stack>
            </Box>

            {/* Filter bar */}
            <Grid container spacing={1.25} alignItems="center">
              {[
                {
                  val: timeRange, set: setTimeRange,
                  items: [{ v: '24h', l: '24 ชั่วโมง' }, { v: '7d', l: '7 วัน' }, { v: '30d', l: '30 วัน' }, { v: '90d', l: '90 วัน' }],
                },
                {
                  val: framework, set: setFramework,
                  items: [{ v: 'all', l: 'ทุกมาตรฐาน' }, ...frameworkOptions.map((item: any) => ({ v: item.frameworkId, l: FRAMEWORK_TH[item.frameworkId] || item.frameworkName }))],
                },
                {
                  val: agentGroup, set: setAgentGroup,
                  items: [{ v: 'all', l: 'ทุกกลุ่ม' }, ...groupOptions.map((g: string) => ({ v: g, l: g }))],
                },
                {
                  val: agentOs, set: setAgentOs,
                  items: [{ v: 'all', l: 'ทุก OS' }, ...osOptions.map((o: string) => ({ v: o, l: o }))],
                },
                {
                  val: severity, set: setSeverity,
                  items: [
                    { v: 'all', l: 'ทุกระดับ' }, { v: 'critical', l: 'วิกฤต' },
                    { v: 'high', l: 'สูง' }, { v: 'medium', l: 'กลาง' }, { v: 'low', l: 'ต่ำ' },
                  ],
                },
                {
                  val: status, set: setStatus,
                  items: [
                    { v: 'all', l: 'ทุกสถานะ' }, { v: 'passed', l: 'ผ่าน' }, { v: 'failed', l: 'ไม่ผ่าน' },
                    { v: 'not_applicable', l: 'ไม่เกี่ยวข้อง' }, { v: 'active', l: 'ออนไลน์' }, { v: 'disconnected', l: 'ออฟไลน์' },
                  ],
                },
              ].map((f, idx) => (
                <Grid item xs={6} sm={4} md={2} key={idx}>
                  <FormControl fullWidth size="small">
                    <Select value={f.val} onChange={e => f.set(e.target.value)} sx={{ fontSize: 12 }}>
                      {f.items.map(item => <MenuItem key={item.v} value={item.v} sx={{ fontSize: 12 }}>{item.l}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              ))}
              <Grid item xs={12}>
                <TextField fullWidth size="small"
                  placeholder="ค้นหา agent, rule, CVE, policy, control..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
                  sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* ── Loading / Error ── */}
        {isLoading ? (
          <LoadingSpinner message="กำลังโหลดภาพรวม Compliance Dashboard..." />
        ) : summaryQuery.error ? (
          <ErrorBox error={summaryQuery.error} onRetry={summaryQuery.refetch} />
        ) : (
          <>
            {/* ── Metric Cards ── */}
            <Grid container spacing={1.5}>
              {/* Overall Score — special card */}
              <Grid item xs={12} sm={6} xl={2}>
                <Card sx={{
                  height: '100%', border: '1px solid', borderColor: 'divider', overflow: 'hidden',
                  background: `linear-gradient(135deg, ${P}10 0%, ${P}04 100%)`,
                  transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${P}22` },
                }}>
                  <Box sx={{ height: 3, background: `linear-gradient(90deg, ${P} 0%, ${PL} 100%)` }} />
                  <CardContent sx={{ pt: 2 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'text.disabled', mb: 1 }}>
                      คะแนนรวม
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ScoreGauge score={summary.overallScore === null || summary.overallScore === undefined ? null : Number(summary.overallScore)} size={72} color={P} />
                      <Box>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.25 }}>เฉลี่ยทุกมาตรฐาน</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                          {formatCompactNumber(summary.activeAgents || 0)} อุปกรณ์ออนไลน์
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {[
                { title: 'จำนวนอุปกรณ์', value: formatCompactNumber(summary.totalAgents || 0),
                  subtitle: `${formatCompactNumber(summary.activeAgents || 0)} ออนไลน์ · ${formatCompactNumber(summary.disconnectedAgents || 0)} ออฟไลน์`,
                  icon: GroupsOutlinedIcon, accent: '#10b981' },
                { title: 'การตรวจสอบที่ล้มเหลว', value: formatCompactNumber(summary.failedControls || 0),
                  subtitle: `${formatCompactNumber(summary.passedControls || 0)} ผ่าน · ${formatCompactNumber(summary.notApplicableControls || 0)} N/A`,
                  icon: FactCheckOutlinedIcon, accent: '#ef4444' },
                { title: 'พบวิกฤต', value: formatCompactNumber(summary.criticalFindings || 0),
                  subtitle: `${formatCompactNumber(summary.highFindings || 0)} พบสูง`,
                  icon: WarningAmberOutlinedIcon, accent: '#ef4444' },
                { title: 'ช่องโหว่ที่เปิดอยู่', value: formatCompactNumber(summary.vulnerabilities || 0),
                  subtitle: 'Wazuh vulnerability detector',
                  icon: BugReportOutlinedIcon, accent: '#f97316' },
                { title: 'Alerts Compliance', value: formatCompactNumber(summary.relatedAlerts || 0),
                  subtitle: `${formatCompactNumber(summary.scaFailedChecks || 0)} SCA checks เชื่อมโยงแล้ว`,
                  icon: RuleFolderOutlinedIcon, accent: P },
              ].map(card => (
                <Grid item xs={6} sm={4} xl={2} key={card.title}>
                  <MetricCard {...card} />
                </Grid>
              ))}
            </Grid>

            {/* ── Tabs ── */}
            <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', background: `linear-gradient(90deg, ${P}06 0%, transparent 100%)` }}>
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                  variant="scrollable" scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 700, fontSize: 12.5, gap: 0.75 },
                    '& .Mui-selected': { color: P },
                    '& .MuiTabs-indicator': { bgcolor: P, height: 3, borderRadius: '3px 3px 0 0' },
                  }}
                >
                  {TAB_LABELS_TH.map((label, idx) => (
                    <Tab key={label} label={label} icon={TAB_ICONS[idx] as any} iconPosition="start" />
                  ))}
                </Tabs>
              </Box>

              <CardContent sx={{ display: 'grid', gap: 2, p: { xs: '16px !important', sm: '20px !important' } }}>
                {currentTabError && <ErrorBox error={currentTabError} onRetry={currentTabRefetch} />}

                {/* ── Tab 0: Overview ── */}
                {activeTab === 0 && (
                  <>
                    {/* Framework score pills row */}
                    {frameworks.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                        {frameworks.map((fw: any) => {
                          const color = FRAMEWORK_COLORS[fw.frameworkId] || P
                          const score = fw.score === null ? null : Number(fw.score)
                          return (
                            <Box key={fw.frameworkId}
                              onClick={() => setFramework(fw.frameworkId)}
                              sx={{
                                cursor: 'pointer', px: 1.5, py: 0.75, borderRadius: 2,
                                border: `1.5px solid ${color}40`,
                                bgcolor: `${color}10`,
                                transition: 'all 0.15s',
                                '&:hover': { bgcolor: `${color}20`, borderColor: color },
                              }}>
                              <Typography sx={{ fontSize: 10, fontWeight: 800, color: color, letterSpacing: '0.05em', mb: 0.25 }}>
                                {FRAMEWORK_TH[fw.frameworkId] || fw.frameworkName}
                              </Typography>
                              <Typography sx={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1, fontFamily: '"IBM Plex Mono"' }}>
                                {score === null ? 'N/A' : `${Math.round(score)}%`}
                              </Typography>
                            </Box>
                          )
                        })}
                      </Box>
                    )}

                    <Grid container spacing={2}>
                      {/* Severity donut */}
                      <Grid item xs={12} lg={4}>
                        <ChartCard title="การค้นพบตามระดับความรุนแรง" subtitle="Alerts และ vulnerabilities ในช่วงเวลาที่เลือก" accent="#ef4444">
                          {findingsBySeverity.length === 0 ? (
                            <EmptyState title="ยังไม่มีข้อมูล" message="ไม่พบข้อมูล alert หรือ vulnerability" />
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <ResponsiveContainer width={120} height={120}>
                                <PieChart>
                                  <Pie data={findingsBySeverity} dataKey="count" nameKey="severity"
                                    innerRadius={30} outerRadius={52} paddingAngle={2} startAngle={90} endAngle={-270}>
                                    {findingsBySeverity.map((item: any) => (
                                      <Cell key={item.severity} fill={SEVERITY_COLORS[item.severity] || '#64748b'} stroke="none" />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip contentStyle={ChartTip} />
                                </PieChart>
                              </ResponsiveContainer>
                              <Box sx={{ flex: 1 }}>
                                {findingsBySeverity.map((item: any) => {
                                  const color = SEVERITY_COLORS[item.severity] || '#64748b'
                                  const TH: Record<string, string> = { critical: 'วิกฤต', high: 'สูง', medium: 'กลาง', low: 'ต่ำ', informational: 'ข้อมูล' }
                                  return (
                                    <Box key={item.severity} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{TH[item.severity] || item.severity}</Typography>
                                      </Box>
                                      <Typography sx={{ fontSize: 11, fontWeight: 700, color, fontFamily: '"IBM Plex Mono"' }}>
                                        {formatCompactNumber(item.count)}
                                      </Typography>
                                    </Box>
                                  )
                                })}
                              </Box>
                            </Box>
                          )}
                        </ChartCard>
                      </Grid>

                      {/* Framework score bar */}
                      <Grid item xs={12} lg={4}>
                        <ChartCard title="คะแนนตามมาตรฐาน" subtitle="เฉพาะ framework ที่มีข้อมูล control mapping" accent={P}>
                          {findingsByFramework.length === 0 ? (
                            <EmptyState title="ยังไม่มีข้อมูล" message="ยังไม่มีข้อมูล controls ที่ map กับ framework" />
                          ) : (
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart data={findingsByFramework} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,91,164,0.07)" vertical={false} />
                                <XAxis dataKey="frameworkName" tick={{ fontSize: 9, fill: '#9A90BF' }} axisLine={false} tickLine={false}
                                  tickFormatter={(v: string) => v.replace('NIST 800-53', 'NIST').replace('ISO 27001', 'ISO').replace('MITRE ATT&CK', 'MITRE')} />
                                <YAxis tick={{ fontSize: 9, fill: '#9A90BF' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                <RechartsTooltip contentStyle={ChartTip} formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'คะแนน']} />
                                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                  {findingsByFramework.map((item: any) => <Cell key={item.frameworkId} fill={item.color} />)}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </ChartCard>
                      </Grid>

                      {/* Timeline */}
                      <Grid item xs={12} lg={4}>
                        <ChartCard title="แนวโน้ม Alerts" subtitle="ช่วงเวลาที่เลือก" accent="#3b82f6">
                          {timeline.length === 0 ? (
                            <EmptyState title="ยังไม่มีข้อมูล" message="ไม่มีข้อมูลย้อนหลังสำหรับแสดงแนวโน้ม" />
                          ) : (
                            <ResponsiveContainer width="100%" height={180}>
                              <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="gbl" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,91,164,0.07)" vertical={false} />
                                <XAxis dataKey="timestamp" tick={{ fontSize: 8, fill: '#9A90BF' }} axisLine={false} tickLine={false} hide />
                                <YAxis tick={{ fontSize: 9, fill: '#9A90BF' }} axisLine={false} tickLine={false} />
                                <RechartsTooltip contentStyle={ChartTip} formatter={(v: any) => [formatCompactNumber(Number(v)), 'Alerts']} />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2}
                                  fill="url(#gbl)" dot={false} name="Alerts" />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </ChartCard>
                      </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                      {/* Top failed controls */}
                      <Grid item xs={12} lg={6}>
                        <Card sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
                          <CardContent>
                            <SectionHeader title="การตรวจสอบที่ล้มเหลวบ่อย" subtitle="SCA controls ที่พบปัญหาสูงสุดจาก Wazuh" />
                            {topFailedControls.length === 0 ? (
                              <EmptyState title="ยังไม่พบ" message="ไม่มี failed controls ที่ตรงกับ filter ปัจจุบัน" />
                            ) : (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <THCell>มาตรฐาน</THCell>
                                    <THCell>Control</THCell>
                                    <THCell align="right">จำนวน</THCell>
                                    <THCell />
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {topFailedControls.map((item: any) => {
                                    const color = FRAMEWORK_COLORS[item.framework] || P
                                    return (
                                      <TableRow key={`${item.framework}-${item.controlId}`} hover
                                        sx={{ borderLeft: `3px solid ${color}`, '&:hover': { bgcolor: `${color}06` } }}>
                                        <TableCell sx={{ py: 1 }}><FrameBadge id={item.framework} /></TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.primary' }}>{item.controlId}</Typography>
                                          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{item.title}</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 1 }}>
                                          <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#ef4444', fontFamily: '"IBM Plex Mono"' }}>
                                            {formatCompactNumber(item.count)}
                                          </Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                          <Button size="small" onClick={() => setSelectedCheck(item)}
                                            sx={{ fontSize: 10, color: PL, '&:hover': { color: P } }}>
                                            รายละเอียด
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Top risky agents */}
                      <Grid item xs={12} lg={6}>
                        <Card sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
                          <CardContent>
                            <SectionHeader title="อุปกรณ์ที่มีความเสี่ยงสูง" subtitle="เรียงตามคะแนน, failed checks, alerts และ CVE" />
                            {topRiskyAgents.length === 0 ? (
                              <EmptyState title="ยังไม่พบ" message="ไม่มี agent ที่แสดงความเสี่ยงในช่วงเวลานี้" />
                            ) : (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <THCell>อุปกรณ์</THCell>
                                    <THCell>คะแนน</THCell>
                                    <THCell align="right">ล้มเหลว</THCell>
                                    <THCell align="right">CVEs</THCell>
                                    <THCell />
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {topRiskyAgents.slice(0, 10).map((agent: any) => {
                                    const score = agent.score === null ? null : Number(agent.score)
                                    const scoreColor = score === null ? '#64748b' : score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
                                    return (
                                      <TableRow key={agent.agentId} hover
                                        sx={{ borderLeft: `3px solid ${scoreColor}50`, '&:hover': { bgcolor: `${scoreColor}06` } }}>
                                        <TableCell sx={{ py: 1 }}>
                                          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{agent.name}</Typography>
                                          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{agent.os} · {agent.group}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                          <Typography sx={{ fontSize: 12, fontWeight: 800, color: scoreColor, fontFamily: '"IBM Plex Mono"' }}>
                                            {score === null ? 'N/A' : formatPercent(score)}
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 1 }}>
                                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
                                            {formatCompactNumber(agent.failedChecks)}
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 1 }}>
                                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#f97316' }}>
                                            {formatCompactNumber(agent.vulnerabilities)}
                                          </Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                          <Button size="small" onClick={() => setSelectedAgent(agent)}
                                            sx={{ fontSize: 10, color: PL, '&:hover': { color: P } }}>
                                            ดูรายละเอียด
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </>
                )}

                {/* ── Tab 1: Frameworks ── */}
                {activeTab === 1 && (
                  <>
                    <Grid container spacing={1.5}>
                      {frameworks.map((item: any) => (
                        <Grid item xs={12} md={6} xl={4} key={item.frameworkId}>
                          <FrameworkCard framework={item} onSelect={setFramework} />
                        </Grid>
                      ))}
                    </Grid>
                    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                      <CardContent>
                        <SectionHeader title="ตารางสรุปมาตรฐาน" subtitle="คะแนน, failed controls และ alerts แต่ละมาตรฐาน" />
                        <ScoreTableSection frameworks={frameworks} onSelectFramework={setFramework} />
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* ── Tab 2: SCA Checks ── */}
                {activeTab === 2 && (
                  scaQuery.isLoading ? (
                    <LoadingSpinner message="กำลังโหลด SCA checks และ failed controls..." />
                  ) : scaQuery.data?.checks?.length ? (
                    <>
                      <Grid container spacing={1.5}>
                        {[
                          { title: 'นโยบาย SCA', val: scaQuery.data.meta?.totalPolicies || 0, icon: PolicyOutlinedIcon, accent: '#3b82f6' },
                          { title: 'ไม่ผ่าน', val: scaQuery.data.summary?.failed || 0, icon: GppBadOutlinedIcon, accent: '#ef4444' },
                          { title: 'ผ่าน', val: scaQuery.data.summary?.passed || 0, icon: CheckCircleOutlinedIcon, accent: '#10b981' },
                          { title: 'ไม่เกี่ยวข้อง', val: scaQuery.data.summary?.notApplicable || 0, icon: VerifiedOutlinedIcon, accent: '#94a3b8' },
                        ].map(c => (
                          <Grid item xs={6} md={3} key={c.title}>
                            <MetricCard title={c.title} value={formatCompactNumber(c.val)}
                              subtitle="จาก Wazuh SCA" icon={c.icon} accent={c.accent} />
                          </Grid>
                        ))}
                      </Grid>
                      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                          <SectionHeader title="ตาราง Failed Controls" subtitle="คลิกเพื่อดู rationale, remediation และคำสั่งที่เกี่ยวข้อง" />
                          <TableContainer sx={{ maxHeight: 520 }}>
                            <Table size="small" stickyHeader>
                              <TableHead>
                                <TableRow>
                                  <THCell>Agent</THCell>
                                  <THCell>Policy</THCell>
                                  <THCell>Control</THCell>
                                  <THCell>สถานะ</THCell>
                                  <THCell>มาตรฐาน</THCell>
                                  <THCell>สแกนล่าสุด</THCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {scaQuery.data.checks.map((check: any) => (
                                  <TableRow key={check.id} hover sx={{ cursor: 'pointer', borderLeft: '3px solid #ef444460',
                                    '&:hover': { bgcolor: 'rgba(239,68,68,0.04)' } }}
                                    onClick={() => setSelectedCheck(check)}>
                                    <TableCell sx={{ py: 1.25 }}>
                                      <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{check.affectedAgents?.[0] || '-'}</Typography>
                                      <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>{check.policyId}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25, maxWidth: 160 }}>
                                      <Typography sx={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {check.policyName}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25, maxWidth: 260 }}>
                                      <Typography sx={{ fontSize: 11.5, fontWeight: 700, fontFamily: '"IBM Plex Mono"' }}>{check.controlId}</Typography>
                                      <Typography sx={{ fontSize: 10, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>
                                        {check.title}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25 }}><StatChip status={check.status} /></TableCell>
                                    <TableCell sx={{ py: 1.25 }}>
                                      <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                                        {(check.frameworks || []).map((f: string) => <FrameBadge key={f} id={f} />)}
                                      </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25, fontSize: 10.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                      {formatDateTime(check.lastSeen)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <EmptyState title="ไม่พบ SCA Checks" message="ยังไม่พบ SCA checks หรือ failed controls ที่ตรงกับ filter ปัจจุบัน" />
                  )
                )}

                {/* ── Tab 3: Agents ── */}
                {activeTab === 3 && (
                  agentsQuery.isLoading ? (
                    <LoadingSpinner message="กำลังโหลด agent compliance posture..." />
                  ) : agentsQuery.data?.items?.length ? (
                    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                      <CardContent>
                        <SectionHeader title="สถานะ Compliance ของอุปกรณ์" subtitle="คลิก agent เพื่อเปิดดูรายละเอียด failed controls, CVE และ alerts" />
                        <TableContainer sx={{ maxHeight: 580 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <THCell>ชื่ออุปกรณ์</THCell>
                                <THCell>IP / OS</THCell>
                                <THCell>สถานะ</THCell>
                                <THCell>กลุ่ม</THCell>
                                <THCell>คะแนน</THCell>
                                <THCell align="right">ล้มเหลว</THCell>
                                <THCell align="right">วิกฤต</THCell>
                                <THCell align="right">สูง</THCell>
                                <THCell align="right">CVEs</THCell>
                                <THCell>สแกนล่าสุด</THCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {agentsQuery.data.items.map((agent: any) => {
                                const score = agent.score === null ? null : Number(agent.score)
                                const sc = score === null ? '#64748b' : score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
                                return (
                                  <TableRow key={agent.agentId} hover sx={{ cursor: 'pointer',
                                    borderLeft: `3px solid ${agent.status === 'disconnected' ? '#ef444440' : `${sc}50`}`,
                                    '&:hover': { bgcolor: `${sc}06` } }}
                                    onClick={() => setSelectedAgent(agent)}>
                                    <TableCell sx={{ py: 1.25 }}>
                                      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{agent.name}</Typography>
                                      <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>{agent.agentId}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25 }}>
                                      <Typography sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono"' }}>{agent.ip}</Typography>
                                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{agent.os} {agent.osVersion || ''}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25 }}><StatChip status={agent.status} /></TableCell>
                                    <TableCell sx={{ py: 1.25 }}>
                                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{agent.group}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25 }}>
                                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: sc, fontFamily: '"IBM Plex Mono"' }}>
                                        {score === null ? 'N/A' : formatPercent(score)}
                                      </Typography>
                                      <LinearProgress variant="determinate" value={score || 0}
                                        sx={{ mt: 0.25, height: 3, borderRadius: 99, bgcolor: `${sc}20`,
                                          '& .MuiLinearProgress-bar': { bgcolor: sc } }} />
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 1.25 }}>
                                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{formatCompactNumber(agent.failedChecks)}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 1.25 }}>
                                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{formatCompactNumber(agent.criticalAlerts)}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 1.25 }}>
                                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#f97316' }}>{formatCompactNumber(agent.highAlerts)}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 1.25 }}>
                                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6' }}>{formatCompactNumber(agent.vulnerabilities)}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25, fontSize: 10.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                      {formatDateTime(agent.lastScan)}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  ) : (
                    <EmptyState title="ไม่พบอุปกรณ์" message="ไม่พบ agent posture ที่ตรงกับ filter ปัจจุบัน" />
                  )
                )}

                {/* ── Tab 4: Vulnerabilities ── */}
                {activeTab === 4 && (
                  vulnerabilitiesQuery.isLoading ? (
                    <LoadingSpinner message="กำลังโหลด vulnerability compliance risk..." />
                  ) : vulnerabilitiesQuery.data?.items?.length ? (
                    <>
                      <Grid container spacing={1.5}>
                        {(vulnerabilitiesQuery.data.summary?.bySeverity || []).map((item: any) => {
                          const color = SEVERITY_COLORS[item.severity] || '#64748b'
                          const TH: Record<string, string> = { critical: 'วิกฤต', high: 'สูง', medium: 'กลาง', low: 'ต่ำ' }
                          return (
                            <Grid item xs={6} md={3} key={item.severity}>
                              <MetricCard title={`CVE ${TH[item.severity] || item.severity}`}
                                value={formatCompactNumber(item.count)}
                                subtitle="จาก Wazuh vulnerability detector"
                                icon={BugReportOutlinedIcon} accent={color} />
                            </Grid>
                          )
                        })}
                      </Grid>
                      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                          <SectionHeader title="ช่องโหว่ที่ต้องแก้ไข" subtitle="CVE จาก Wazuh vulnerability module" />
                          <TableContainer sx={{ maxHeight: 520 }}>
                            <Table stickyHeader size="small">
                              <TableHead>
                                <TableRow>
                                  <THCell>CVE</THCell>
                                  <THCell>แพ็กเกจ</THCell>
                                  <THCell>ความรุนแรง</THCell>
                                  <THCell>อุปกรณ์</THCell>
                                  <THCell>เวอร์ชันที่ติดตั้ง</THCell>
                                  <THCell>เวอร์ชันแก้ไข</THCell>
                                  <THCell>ตรวจพบ</THCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {vulnerabilitiesQuery.data.items.map((item: any) => {
                                  const color = SEVERITY_COLORS[item.severity] || '#64748b'
                                  return (
                                    <TableRow key={`${item.cve}-${item.agentId}`} hover
                                      sx={{ borderLeft: `3px solid ${color}60`, '&:hover': { bgcolor: `${color}04` } }}>
                                      <TableCell sx={{ py: 1.25 }}>
                                        <Typography sx={{ fontSize: 11.5, fontWeight: 800, fontFamily: '"IBM Plex Mono"', color: 'text.primary' }}>
                                          {item.cve}
                                        </Typography>
                                        {item.references?.[0] && (
                                          <Button size="small" href={item.references[0]} target="_blank" rel="noreferrer"
                                            endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 11 }} />}
                                            sx={{ fontSize: 9.5, color: '#3b82f6', p: 0, minWidth: 0, textTransform: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                            อ้างอิง
                                          </Button>
                                        )}
                                      </TableCell>
                                      <TableCell sx={{ py: 1.25 }}>
                                        <Typography sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono"' }}>{item.packageName}</Typography>
                                      </TableCell>
                                      <TableCell sx={{ py: 1.25 }}><SevChip severity={item.severity} /></TableCell>
                                      <TableCell sx={{ py: 1.25 }}>
                                        <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{item.agentName}</Typography>
                                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{item.os}</Typography>
                                      </TableCell>
                                      <TableCell sx={{ py: 1.25, fontSize: 10.5, fontFamily: '"IBM Plex Mono"', color: 'text.secondary' }}>
                                        {item.installedVersion}
                                      </TableCell>
                                      <TableCell sx={{ py: 1.25, fontSize: 10.5, fontFamily: '"IBM Plex Mono"', color: '#10b981' }}>
                                        {item.fixedVersion || '—'}
                                      </TableCell>
                                      <TableCell sx={{ py: 1.25, fontSize: 10.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                        {formatDateTime(item.detectedAt)}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <EmptyState title="ไม่พบข้อมูลช่องโหว่" message="Wazuh vulnerability detector ยังไม่มีข้อมูล หรือยังไม่ได้ตั้งค่า" />
                  )
                )}

                {/* ── Tab 5: Alerts ── */}
                {activeTab === 5 && (
                  alertsQuery.isLoading ? (
                    <LoadingSpinner message="กำลังโหลด compliance-related alerts..." />
                  ) : alertsQuery.data?.items?.length ? (
                    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                      <CardContent>
                        <SectionHeader title="การแจ้งเตือนที่เกี่ยวข้องกับ Compliance" subtitle="Alerts จาก Wazuh/OpenSearch ที่มี compliance mapping" />
                        <TableContainer sx={{ maxHeight: 520 }}>
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <THCell>เวลา</THCell>
                                <THCell>Rule</THCell>
                                <THCell>ระดับ</THCell>
                                <THCell>Agent</THCell>
                                <THCell>IP</THCell>
                                <THCell>Groups</THCell>
                                <THCell>Compliance</THCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {alertsQuery.data.items.map((alert: any) => {
                                const color = SEVERITY_COLORS[alert.severity] || '#64748b'
                                return (
                                  <TableRow key={alert.id} hover
                                    sx={{ borderLeft: `3px solid ${color}60`, '&:hover': { bgcolor: `${color}04` } }}>
                                    <TableCell sx={{ py: 1.25, whiteSpace: 'nowrap', fontSize: 10.5, color: 'text.secondary' }}>
                                      {formatDateTime(alert.timestamp)}
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25, maxWidth: 240 }}>
                                      <Typography sx={{ fontSize: 11.5, fontWeight: 700, fontFamily: '"IBM Plex Mono"' }}>{alert.ruleId}</Typography>
                                      <Typography sx={{ fontSize: 10, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 230 }}>
                                        {alert.description}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25 }}><SevChip severity={alert.severity} /></TableCell>
                                    <TableCell sx={{ py: 1.25, fontSize: 11.5, fontWeight: 600 }}>{alert.agent}</TableCell>
                                    <TableCell sx={{ py: 1.25 }}>
                                      <Typography sx={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono"', color: PL }}>{alert.sourceIp || '—'}</Typography>
                                      <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>{alert.destinationIp || ''}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25, maxWidth: 140 }}>
                                      <Typography sx={{ fontSize: 10, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {(alert.groups || []).slice(0, 3).join(', ') || '—'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25 }}>
                                      <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                                        {Object.entries(alert.compliance || {}).slice(0, 2).map(([name]) => (
                                          <FrameBadge key={`${alert.id}-${name}`} id={name} />
                                        ))}
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  ) : (
                    <EmptyState title="ไม่พบ Compliance Alerts" message="ไม่พบ alert ที่เกี่ยวข้องกับ compliance ภายใต้ filter ปัจจุบัน" />
                  )
                )}

                {/* ── Tab 6: Evidence ── */}
                {activeTab === 6 && (
                  evidenceQuery.isLoading ? (
                    <LoadingSpinner message="กำลังโหลด audit evidence..." />
                  ) : evidenceQuery.data?.items?.length ? (
                    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                      <CardContent>
                        <SectionHeader title="หลักฐาน Audit" subtitle="Evidence จาก SCA และ compliance-mapped alerts สำหรับ Auditor" />
                        <TableContainer sx={{ maxHeight: 520 }}>
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <THCell>เวลา</THCell>
                                <THCell>มาตรฐาน</THCell>
                                <THCell>Control</THCell>
                                <THCell>รายละเอียด</THCell>
                                <THCell>แหล่งข้อมูล</THCell>
                                <THCell>สถานะ</THCell>
                                <THCell>อุปกรณ์</THCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {evidenceQuery.data.items.map((item: any) => {
                                const color = item.status === 'passed' ? '#10b981' : item.status === 'failed' ? '#ef4444' : '#94a3b8'
                                return (
                                  <TableRow key={item.id} hover
                                    sx={{ borderLeft: `3px solid ${color}60`, '&:hover': { bgcolor: `${color}04` } }}>
                                    <TableCell sx={{ py: 1.25, whiteSpace: 'nowrap', fontSize: 10.5, color: 'text.secondary' }}>
                                      {formatDateTime(item.timestamp)}
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25 }}><FrameBadge id={item.framework} /></TableCell>
                                    <TableCell sx={{ py: 1.25 }}>
                                      <Typography sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono"', fontWeight: 700 }}>{item.controlId}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25, maxWidth: 260 }}>
                                      <Typography sx={{ fontSize: 11.5, fontWeight: 600, mb: 0.1 }}>{item.requirement}</Typography>
                                      <Typography sx={{ fontSize: 10, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>
                                        {item.details}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.25, fontSize: 11, color: 'text.secondary' }}>{item.evidenceSource}</TableCell>
                                    <TableCell sx={{ py: 1.25 }}><StatChip status={item.status} /></TableCell>
                                    <TableCell sx={{ py: 1.25, fontSize: 11, color: 'text.secondary' }}>{item.relatedAgents}</TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  ) : (
                    <EmptyState title="ไม่พบหลักฐาน Audit" message="ไม่พบ evidence ที่สามารถใช้สำหรับ audit ภายใต้ filter ปัจจุบัน" />
                  )
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Box>

      {/* ── Check Detail Drawer ── */}
      <DetailPanel
        open={Boolean(selectedCheck)}
        onClose={() => setSelectedCheck(null)}
        title={selectedCheck?.title || selectedCheck?.requirement || 'รายละเอียด Control'}
        subtitle={selectedCheck ? `${FRAMEWORK_TH[selectedCheck.framework] || selectedCheck.framework || ''} · ${selectedCheck.controlId || ''}` : ''}
        width={640}
      >
        {selectedCheck && (
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.75 }}>สถานะ</Typography>
              <StatChip status={selectedCheck.status} />
            </Box>
            {selectedCheck.description && (
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.5 }}>คำอธิบาย</Typography>
                <Typography sx={{ fontSize: 12.5, lineHeight: 1.6 }}>{selectedCheck.description}</Typography>
              </Box>
            )}
            {selectedCheck.rationale && (
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.5 }}>เหตุผล</Typography>
                <Typography sx={{ fontSize: 12.5, lineHeight: 1.6 }}>{selectedCheck.rationale}</Typography>
              </Box>
            )}
            {selectedCheck.remediation && (
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.5 }}>วิธีแก้ไข</Typography>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Typography sx={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedCheck.remediation}</Typography>
                </Box>
              </Box>
            )}
            {selectedCheck.evidence?.command && (
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.5 }}>คำสั่งตรวจสอบ</Typography>
                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.04)',
                  border: '1px solid', borderColor: 'divider', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5, wordBreak: 'break-word', lineHeight: 1.6 }}>
                  {selectedCheck.evidence.command}
                </Box>
                <Box sx={{ mt: 0.5 }}><CopyBtn value={selectedCheck.evidence.command} /></Box>
              </Box>
            )}
            {selectedCheck.references?.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.5 }}>อ้างอิง</Typography>
                <Stack spacing={0.5}>
                  {selectedCheck.references.map((ref: string) => (
                    <Typography key={ref} sx={{ fontSize: 11.5, color: '#3b82f6', wordBreak: 'break-all' }}>{ref}</Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </DetailPanel>

      {/* ── Agent Detail Drawer ── */}
      <DetailPanel
        open={Boolean(selectedAgent)}
        onClose={() => { setSelectedAgent(null); setAgentDrawerTab(0) }}
        title={selectedAgent?.name || 'รายละเอียดอุปกรณ์'}
        subtitle={selectedAgent ? `${selectedAgent.agentId} · ${selectedAgent.os}` : ''}
        width={760}
      >
        {selectedAgent && (
          <Stack spacing={2}>
            <Grid container spacing={1.25}>
              {[
                { title: 'คะแนน Compliance', value: selectedAgent.score === null ? 'N/A' : formatPercent(selectedAgent.score), icon: ShieldOutlinedIcon, accent: '#3b82f6' },
                { title: 'ไม่ผ่าน SCA', value: formatCompactNumber(selectedAgent.failedChecks), icon: GppBadOutlinedIcon, accent: '#ef4444' },
                { title: 'High/Critical', value: formatCompactNumber((selectedAgent.highAlerts || 0) + (selectedAgent.criticalAlerts || 0)), icon: WifiTetheringErrorOutlinedIcon, accent: '#f97316' },
                { title: 'CVEs ที่เปิดอยู่', value: formatCompactNumber(selectedAgent.vulnerabilities), icon: BugReportOutlinedIcon, accent: '#8b5cf6' },
              ].map(c => (
                <Grid item xs={6} md={3} key={c.title}>
                  <MetricCard title={c.title} value={c.value} icon={c.icon} accent={c.accent} />
                </Grid>
              ))}
            </Grid>

            <Card variant="outlined">
              <Tabs value={agentDrawerTab} onChange={(_, v) => setAgentDrawerTab(v)} variant="scrollable" scrollButtons="auto"
                sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 12 }, '& .Mui-selected': { color: P }, '& .MuiTabs-indicator': { bgcolor: P } }}>
                {['ข้อมูลทั่วไป', 'Failed Controls', 'ช่องโหว่', 'Alerts ล่าสุด'].map(l => <Tab key={l} label={l} />)}
              </Tabs>
              <CardContent>
                {agentDrawerTab === 0 && (
                  <Grid container spacing={2}>
                    {[
                      { label: 'ชื่ออุปกรณ์', val: selectedAgent.name },
                      { label: 'สถานะ', val: <StatChip status={selectedAgent.status} /> },
                      { label: 'IP / กลุ่ม', val: `${selectedAgent.ip} · ${selectedAgent.group}` },
                      { label: 'OS / เวอร์ชัน', val: `${selectedAgent.os} ${selectedAgent.osVersion || ''} · ${selectedAgent.version}` },
                      { label: 'พบออนไลน์ล่าสุด', val: formatDateTime(selectedAgent.lastSeen) },
                      { label: 'สแกน SCA ล่าสุด', val: formatDateTime(selectedAgent.lastScan) },
                    ].map(({ label, val }) => (
                      <Grid item xs={12} md={6} key={label}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.25 }}>{label}</Typography>
                        {typeof val === 'string' ? (
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{val}</Typography>
                        ) : val}
                      </Grid>
                    ))}
                  </Grid>
                )}
                {agentDrawerTab === 1 && (
                  agentScaQuery.isLoading ? <LoadingSpinner message="กำลังโหลด..." /> :
                  agentScaQuery.data?.checks?.length ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <THCell>Policy</THCell>
                          <THCell>Control</THCell>
                          <THCell>สถานะ</THCell>
                          <THCell>สแกนล่าสุด</THCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {agentScaQuery.data.checks.map((check: any) => (
                          <TableRow key={check.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedCheck(check)}>
                            <TableCell sx={{ py: 1, fontSize: 11 }}>{check.policyName}</TableCell>
                            <TableCell sx={{ py: 1 }}>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, fontFamily: '"IBM Plex Mono"' }}>{check.controlId}</Typography>
                              <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{check.title}</Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}><StatChip status={check.status} /></TableCell>
                            <TableCell sx={{ py: 1, fontSize: 10.5, color: 'text.secondary' }}>{formatDateTime(check.lastSeen)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : <EmptyState title="ไม่มี SCA" message="ยังไม่มี SCA checks สำหรับอุปกรณ์นี้" />
                )}
                {agentDrawerTab === 2 && (
                  agentVulnerabilitiesQuery.isLoading ? <LoadingSpinner message="กำลังโหลด..." /> :
                  agentVulnerabilitiesQuery.data?.items?.length ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <THCell>CVE</THCell>
                          <THCell>แพ็กเกจ</THCell>
                          <THCell>ระดับ</THCell>
                          <THCell>ตรวจพบ</THCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {agentVulnerabilitiesQuery.data.items.map((item: any) => (
                          <TableRow key={`${item.cve}-${item.packageName}`} hover>
                            <TableCell sx={{ py: 1, fontFamily: '"IBM Plex Mono"', fontSize: 11, fontWeight: 700 }}>{item.cve}</TableCell>
                            <TableCell sx={{ py: 1, fontSize: 11 }}>{item.packageName}</TableCell>
                            <TableCell sx={{ py: 1 }}><SevChip severity={item.severity} /></TableCell>
                            <TableCell sx={{ py: 1, fontSize: 10.5, color: 'text.secondary' }}>{formatDateTime(item.detectedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : <EmptyState title="ไม่มีช่องโหว่" message="ไม่พบข้อมูล CVE สำหรับอุปกรณ์นี้" />
                )}
                {agentDrawerTab === 3 && (
                  agentAlertsQuery.isLoading ? <LoadingSpinner message="กำลังโหลด..." /> :
                  agentAlertsQuery.data?.items?.length ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <THCell>เวลา</THCell>
                          <THCell>Rule</THCell>
                          <THCell>ระดับ</THCell>
                          <THCell>Groups</THCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {agentAlertsQuery.data.items.map((item: any) => (
                          <TableRow key={item.id} hover>
                            <TableCell sx={{ py: 1, fontSize: 10.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDateTime(item.timestamp)}</TableCell>
                            <TableCell sx={{ py: 1 }}>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, fontFamily: '"IBM Plex Mono"' }}>{item.ruleId}</Typography>
                              <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{item.description}</Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}><SevChip severity={item.severity} /></TableCell>
                            <TableCell sx={{ py: 1, fontSize: 10, color: 'text.secondary' }}>
                              {(item.groups || []).slice(0, 4).join(', ') || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : <EmptyState title="ไม่มี Alerts" message="ไม่พบ compliance alerts ที่เกี่ยวข้องกับอุปกรณ์นี้" />
                )}
              </CardContent>
            </Card>
          </Stack>
        )}
      </DetailPanel>
    </PageShell>
  )
}
