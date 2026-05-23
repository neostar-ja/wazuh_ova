import { useDeferredValue, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import GppBadOutlinedIcon from '@mui/icons-material/GppBadOutlined'
import WifiTetheringErrorOutlinedIcon from '@mui/icons-material/WifiTetheringErrorOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import SearchIcon from '@mui/icons-material/Search'
import RefreshIcon from '@mui/icons-material/Refresh'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import RuleFolderOutlinedIcon from '@mui/icons-material/RuleFolderOutlined'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { complianceApi } from '../../services/api'
import { AlertMessage, DetailPanel, EmptyState, LoadingSpinner, StatusDot } from '../common/CommonComponents'
import {
  useComplianceAgents,
  useComplianceAlerts,
  useComplianceEvidence,
  useComplianceSca,
  useComplianceSummary,
  useComplianceVulnerabilities,
} from './useComplianceData'
import {
  downloadApiBlob,
  downloadTextFile,
  formatCompactNumber,
  formatDateTime,
  formatPercent,
  FRAMEWORK_COLORS,
  FRAMEWORK_LABELS,
  makeCsv,
  SEVERITY_COLORS,
} from './complianceUtils'

const CHART_TOOLTIP_STYLE = {
  background: 'rgba(13,24,37,0.94)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  fontSize: 12,
  color: '#f0f4ff',
}

const TAB_LABELS = ['Overview', 'Frameworks', 'SCA Checks', 'Agents', 'Vulnerabilities', 'Alerts', 'Evidence']

interface ConnectionChipProps {
  status: 'connected' | 'degraded' | 'error' | 'cached' | string
}

function ConnectionChip({ status }: ConnectionChipProps) {
  const config: Record<string, { label: string; color: string }> = {
    connected: { label: 'Connected', color: '#10b981' },
    degraded: { label: 'Degraded', color: '#f59e0b' },
    error: { label: 'Error', color: '#ef4444' },
    cached: { label: 'Using cached data', color: '#7B5BA4' },
  }
  const item = config[status] || { label: 'Unknown', color: '#64748b' }
  return (
    <Chip
      size="small"
      label={item.label}
      icon={<StatusDot color={item.color} pulse={status === 'connected'} />}
      sx={{
        pl: 0.5,
        borderRadius: '999px',
        bgcolor: `${item.color}18`,
        color: item.color,
        border: `1px solid ${item.color}33`,
        fontWeight: 600,
      }}
    />
  )
}

interface SeverityChipProps {
  severity: string
}

function SeverityChip({ severity }: SeverityChipProps) {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.unknown
  return (
    <Chip
      size="small"
      label={severity || 'unknown'}
      sx={{
        textTransform: 'capitalize',
        bgcolor: `${color}18`,
        color,
        border: `1px solid ${color}33`,
        fontWeight: 600,
      }}
    />
  )
}

interface StatusChipProps {
  status: string
}

function StatusChip({ status }: StatusChipProps) {
  const palette: Record<string, { label: string; color: string }> = {
    passed: { label: 'Passed', color: '#10b981' },
    failed: { label: 'Failed', color: '#ef4444' },
    not_applicable: { label: 'N/A', color: '#94a3b8' },
    invalid: { label: 'Invalid', color: '#f59e0b' },
    active: { label: 'Active', color: '#10b981' },
    disconnected: { label: 'Disconnected', color: '#ef4444' },
    warning: { label: 'Warning', color: '#f59e0b' },
    good: { label: 'Good', color: '#10b981' },
    critical: { label: 'Critical', color: '#ef4444' },
    unknown: { label: 'Unknown', color: '#64748b' },
  }
  const item = palette[status] || palette.unknown
  return (
    <Chip
      size="small"
      label={item.label}
      sx={{
        bgcolor: `${item.color}18`,
        color: item.color,
        border: `1px solid ${item.color}33`,
        fontWeight: 600,
      }}
    />
  )
}

interface MetricCardComponentProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ComponentType<any>
  accent?: string
}

function MetricCard({ title, value, subtitle, icon: Icon, accent = '#7B5BA4' }: MetricCardComponentProps) {
  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.08)',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: -28,
          right: -20,
          width: 96,
          height: 96,
          borderRadius: '50%',
          bgcolor: `${accent}16`,
          filter: 'blur(8px)',
        },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
          {Icon ? (
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: `${accent}20`,
                color: accent,
                flexShrink: 0,
              }}
            >
              <Icon fontSize="small" />
            </Box>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  )
}

interface FrameworkCardProps {
  framework: any
  onSelect: (id: string) => void
}

function FrameworkCard({ framework, onSelect }: FrameworkCardProps) {
  const color = FRAMEWORK_COLORS[framework.frameworkId] || '#7B5BA4'
  return (
    <Card
      onClick={() => onSelect(framework.frameworkId)}
      sx={{
        cursor: 'pointer',
        height: '100%',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderLeft: `4px solid ${color}`,
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
      }}
    >
      <CardContent sx={{ display: 'grid', gap: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              {framework.frameworkName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {framework.description}
            </Typography>
          </Box>
          <StatusChip status={framework.status} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography variant="h4" fontWeight={700} sx={{ color }}>
            {framework.score === null ? 'N/A' : formatPercent(framework.score)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatCompactNumber(framework.total)} controls
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={framework.score || 0}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: 'rgba(255,255,255,0.06)',
            '& .MuiLinearProgress-bar': { bgcolor: color },
          }}
        />
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Passed</Typography>
            <Typography variant="body2" fontWeight={600}>{formatCompactNumber(framework.passed)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Failed</Typography>
            <Typography variant="body2" fontWeight={600}>{formatCompactNumber(framework.failed)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Critical/High</Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatCompactNumber((framework.critical || 0) + (framework.high || 0))}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Mapped Alerts</Typography>
            <Typography variant="body2" fontWeight={600}>{formatCompactNumber(framework.alertCount)}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

interface RetryableErrorProps {
  error: any
  onRetry: () => void
}

function RetryableError({ error, onRetry }: RetryableErrorProps) {
  return (
    <AlertMessage
      type="error"
      title="โหลดข้อมูลไม่สำเร็จ"
      message={error?.response?.data?.detail || error?.message || 'Compliance API ไม่ตอบสนองหรือข้อมูลไม่สมบูรณ์'}
      action={
        <Button size="small" variant="outlined" onClick={onRetry}>
          Retry
        </Button>
      }
    />
  )
}

interface SectionTitleProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

function SectionTitle({ title, subtitle, action }: SectionTitleProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {subtitle ? <Typography variant="caption" color="text.secondary">{subtitle}</Typography> : null}
      </Box>
      {action}
    </Box>
  )
}

interface ScoreTableProps {
  frameworks: any[]
  onSelectFramework: (id: string) => void
}

function ScoreTable({ frameworks, onSelectFramework }: ScoreTableProps) {
  if (!frameworks.length) {
    return <EmptyState title="ยังไม่มี framework mapping" message="ระบบยังไม่พบข้อมูลควบคุมหรือ alert ที่ map กับ framework ที่เลือก" />
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Framework</TableCell>
            <TableCell>Score</TableCell>
            <TableCell align="right">Passed</TableCell>
            <TableCell align="right">Failed</TableCell>
            <TableCell align="right">Alerts</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {frameworks.map(item => (
            <TableRow key={item.frameworkId} hover onClick={() => onSelectFramework(item.frameworkId)} sx={{ cursor: 'pointer' }}>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>{item.frameworkName}</Typography>
                <Typography variant="caption" color="text.secondary">{item.frameworkId}</Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 140 }}>
                <Typography variant="body2" fontWeight={700}>{item.score === null ? 'N/A' : formatPercent(item.score)}</Typography>
                <LinearProgress
                  variant="determinate"
                  value={item.score || 0}
                  sx={{
                    mt: 0.75,
                    height: 6,
                    borderRadius: 999,
                    bgcolor: 'rgba(255,255,255,0.06)',
                    '& .MuiLinearProgress-bar': { bgcolor: FRAMEWORK_COLORS[item.frameworkId] || '#7B5BA4' },
                  }}
                />
              </TableCell>
              <TableCell align="right">{formatCompactNumber(item.passed)}</TableCell>
              <TableCell align="right">{formatCompactNumber(item.failed)}</TableCell>
              <TableCell align="right">{formatCompactNumber(item.alertCount)}</TableCell>
              <TableCell><StatusChip status={item.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

interface CopyButtonProps {
  value?: string
}

function CopyButton({ value }: CopyButtonProps) {
  return (
    <Tooltip title="Copy">
      <span>
        <IconButton
          size="small"
          disabled={!value}
          onClick={() => value && navigator.clipboard.writeText(value)}
        >
          <ContentCopyOutlinedIcon fontSize="inherit" />
        </IconButton>
      </span>
    </Tooltip>
  )
}

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState(0)
  const [timeRange, setTimeRange] = useState('7d')
  const [framework, setFramework] = useState('all')
  const [agentGroup, setAgentGroup] = useState('all')
  const [agentOs, setAgentOs] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [selectedCheck, setSelectedCheck] = useState<any>(null)
  const [agentDrawerTab, setAgentDrawerTab] = useState(0)
  const [exporting, setExporting] = useState(false)

  const deferredSearch = useDeferredValue(search)

  const baseFilters = useMemo(() => ({
    time_range: timeRange,
    framework,
    agent_group: agentGroup,
    agent_os: agentOs,
    severity,
    status,
    search: deferredSearch,
  }), [timeRange, framework, agentGroup, agentOs, severity, status, deferredSearch])

  const summaryQuery = useComplianceSummary(baseFilters)
  const agentsQuery = useComplianceAgents(baseFilters, activeTab === 3)
  const scaQuery = useComplianceSca({ ...baseFilters, status: status === 'all' ? 'failed' : status, limit: 250 }, activeTab === 2)
  const vulnerabilitiesQuery = useComplianceVulnerabilities(baseFilters, activeTab === 4)
  const alertsQuery = useComplianceAlerts(baseFilters, activeTab === 5)
  const evidenceQuery = useComplianceEvidence(baseFilters, activeTab === 6)

  const agentDetailFilters = useMemo(() => ({
    ...baseFilters,
    agent_id: selectedAgent?.agentId,
    status: 'all',
    limit: 200,
  }), [baseFilters, selectedAgent])

  const agentScaQuery = useComplianceSca(agentDetailFilters, Boolean(selectedAgent))
  const agentVulnerabilitiesQuery = useComplianceVulnerabilities(agentDetailFilters, Boolean(selectedAgent))
  const agentAlertsQuery = useComplianceAlerts(agentDetailFilters, Boolean(selectedAgent))

  const summaryData = summaryQuery.data as any
  const summary = useMemo(() => summaryData?.summary || {}, [summaryData])
  const meta = useMemo(() => summaryData?.meta || {}, [summaryData])
  const frameworks = useMemo(() => summaryData?.frameworks || [], [summaryData])
  const charts = useMemo(() => summaryData?.charts || {}, [summaryData])
  const frameworkOptions = meta.availableFrameworks || Object.entries(FRAMEWORK_LABELS).map(([frameworkId, frameworkName]) => ({ frameworkId, frameworkName }))
  const groupOptions = meta.agentGroups || []
  const osOptions = meta.agentOs || []

  const currentRows = useMemo(() => {
    if (activeTab === 1) return frameworks
    if (activeTab === 2) return scaQuery.data?.checks || []
    if (activeTab === 3) return agentsQuery.data?.items || []
    if (activeTab === 4) return vulnerabilitiesQuery.data?.items || []
    if (activeTab === 5) return alertsQuery.data?.items || []
    if (activeTab === 6) return evidenceQuery.data?.items || []
    return [
      summary,
      ...(frameworks || []),
    ]
  }, [activeTab, frameworks, scaQuery.data, agentsQuery.data, vulnerabilitiesQuery.data, alertsQuery.data, evidenceQuery.data, summary])

  const handleRefresh = async () => {
    await summaryQuery.refetch()
    if (activeTab === 2) await scaQuery.refetch()
    if (activeTab === 3) await agentsQuery.refetch()
    if (activeTab === 4) await vulnerabilitiesQuery.refetch()
    if (activeTab === 5) await alertsQuery.refetch()
    if (activeTab === 6) await evidenceQuery.refetch()
    if (selectedAgent) {
      await Promise.all([agentScaQuery.refetch(), agentVulnerabilitiesQuery.refetch(), agentAlertsQuery.refetch()])
    }
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      if (activeTab === 0 || activeTab === 1) {
        downloadTextFile(`compliance-${TAB_LABELS[activeTab].toLowerCase()}.csv`, makeCsv(currentRows), 'text/csv;charset=utf-8')
      } else {
        const datasetMap: Record<number, string> = { 2: 'sca', 3: 'agents', 4: 'vulnerabilities', 5: 'alerts', 6: 'evidence' }
        const dataset = datasetMap[activeTab] || 'evidence'
        await downloadApiBlob(
          `compliance-${dataset}-${timeRange}.csv`,
          complianceApi.export({ ...baseFilters, dataset, format: 'csv' }),
        )
      }
    } finally {
      setExporting(false)
    }
  }

  const handleExportJson = () => {
    downloadTextFile(
      `compliance-${TAB_LABELS[activeTab].toLowerCase()}.json`,
      JSON.stringify(currentRows, null, 2),
      'application/json;charset=utf-8',
    )
  }

  const summaryCards = [
    {
      title: 'Overall Score',
      value: summary.overallScore === null || summary.overallScore === undefined ? 'N/A' : formatPercent(summary.overallScore),
      subtitle: 'Average across frameworks with live control mappings',
      icon: ShieldOutlinedIcon,
      accent: '#7B5BA4',
    },
    {
      title: 'Total Agents',
      value: formatCompactNumber(summary.totalAgents || 0),
      subtitle: `${formatCompactNumber(summary.activeAgents || 0)} active / ${formatCompactNumber(summary.disconnectedAgents || 0)} disconnected`,
      icon: GroupsOutlinedIcon,
      accent: '#10b981',
    },
    {
      title: 'Failed Controls',
      value: formatCompactNumber(summary.failedControls || 0),
      subtitle: `${formatCompactNumber(summary.passedControls || 0)} passed / ${formatCompactNumber(summary.notApplicableControls || 0)} N/A`,
      icon: FactCheckOutlinedIcon,
      accent: '#ef4444',
    },
    {
      title: 'Critical Findings',
      value: formatCompactNumber(summary.criticalFindings || 0),
      subtitle: `${formatCompactNumber(summary.highFindings || 0)} high findings`,
      icon: WarningAmberOutlinedIcon,
      accent: '#ef4444',
    },
    {
      title: 'Open Vulnerabilities',
      value: formatCompactNumber(summary.vulnerabilities || 0),
      subtitle: 'From Wazuh vulnerability detector when available',
      icon: BugReportOutlinedIcon,
      accent: '#f97316',
    },
    {
      title: 'Compliance Alerts',
      value: formatCompactNumber(summary.relatedAlerts || 0),
      subtitle: `${formatCompactNumber(summary.scaFailedChecks || 0)} failed SCA checks correlated`,
      icon: RuleFolderOutlinedIcon,
      accent: '#7B5BA4',
    },
  ]

  const findingsBySeverity = charts.findingsBySeverity || []
  const findingsByFramework = (charts.findingsByFramework || []).map((item: any) => ({
    ...item,
    color: FRAMEWORK_COLORS[item.frameworkId] || '#7B5BA4',
  }))
  const timeline = charts.alertsTimeline || []
  const topFailedControls: any[] = charts.topFailedControls || []
  const topRiskyAgents: any[] = charts.topRiskyAgents || []

  const currentTabError =
    activeTab === 2 ? scaQuery.error :
      activeTab === 3 ? agentsQuery.error :
        activeTab === 4 ? vulnerabilitiesQuery.error :
          activeTab === 5 ? alertsQuery.error :
            activeTab === 6 ? evidenceQuery.error : null

  const currentTabRefetch =
    activeTab === 2 ? scaQuery.refetch :
      activeTab === 3 ? agentsQuery.refetch :
        activeTab === 4 ? vulnerabilitiesQuery.refetch :
          activeTab === 5 ? alertsQuery.refetch :
            activeTab === 6 ? evidenceQuery.refetch : summaryQuery.refetch

  return (
    <Box className="page-enter">
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Card>
          <CardContent sx={{ display: 'grid', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Box sx={{ maxWidth: 820 }}>
                <Typography variant="h5" fontWeight={700}>Wazuh Compliance Center</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  ภาพรวมสถานะการปฏิบัติตามมาตรฐานความมั่นคงปลอดภัยจาก Wazuh สำหรับทีม SOC, IT Security และ Auditor
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                  <ConnectionChip status={meta.dataSourceStatus} />
                  <Chip size="small" label={`Last sync: ${formatDateTime(meta.lastUpdated)}`} variant="outlined" />
                  {Object.entries(meta.sources || {}).map(([sourceName, sourceStatus]) => (
                    <Chip key={sourceName} size="small" label={`${sourceName}: ${sourceStatus as string}`} variant="outlined" />
                  ))}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={summaryQuery.isFetching}>
                  Refresh
                </Button>
                <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={handleExportCsv} disabled={exporting}>
                  Export CSV
                </Button>
                <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={handleExportJson}>
                  Export JSON
                </Button>
              </Stack>
            </Box>

            <Grid container spacing={1.25}>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <Select value={timeRange} onChange={event => setTimeRange(event.target.value)}>
                    {['24h', '7d', '30d', '90d'].map(item => (
                      <MenuItem key={item} value={item}>{item}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <Select value={framework} onChange={event => setFramework(event.target.value)}>
                    <MenuItem value="all">All frameworks</MenuItem>
                    {frameworkOptions.map((item: any) => (
                      <MenuItem key={item.frameworkId} value={item.frameworkId}>{item.frameworkName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <Select value={agentGroup} onChange={event => setAgentGroup(event.target.value)}>
                    <MenuItem value="all">All groups</MenuItem>
                    {groupOptions.map((item: any) => (
                      <MenuItem key={item} value={item}>{item}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <Select value={agentOs} onChange={event => setAgentOs(event.target.value)}>
                    <MenuItem value="all">All OS</MenuItem>
                    {osOptions.map((item: any) => (
                      <MenuItem key={item} value={item}>{item}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <Select value={severity} onChange={event => setSeverity(event.target.value)}>
                    <MenuItem value="all">All severity</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <Select value={status} onChange={event => setStatus(event.target.value)}>
                    <MenuItem value="all">All status</MenuItem>
                    <MenuItem value="passed">Passed</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                    <MenuItem value="not_applicable">Not applicable</MenuItem>
                    <MenuItem value="active">Active agents</MenuItem>
                    <MenuItem value="disconnected">Disconnected agents</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search agent, rule, control, CVE, policy"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {summaryQuery.isLoading ? (
          <LoadingSpinner message="กำลังโหลดภาพรวม compliance dashboard..." />
        ) : summaryQuery.error ? (
          <RetryableError error={summaryQuery.error} onRetry={summaryQuery.refetch} />
        ) : (
          <>
            <Grid container spacing={1.5}>
              {summaryCards.map(card => (
                <Grid item xs={12} sm={6} xl={2} key={card.title}>
                  <MetricCard {...card} />
                </Grid>
              ))}
            </Grid>

            <Card>
              <Tabs
                value={activeTab}
                onChange={(_, value) => setActiveTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  px: 1,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  '& .MuiTab-root': { minHeight: 46, textTransform: 'none', fontWeight: 600 },
                }}
              >
                {TAB_LABELS.map(label => <Tab key={label} label={label} />)}
              </Tabs>
              <CardContent sx={{ display: 'grid', gap: 2 }}>
                {currentTabError ? <RetryableError error={currentTabError} onRetry={currentTabRefetch} /> : null}

                {activeTab === 0 && (
                  <>
                    <Grid container spacing={2}>
                      <Grid item xs={12} lg={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <SectionTitle title="Findings By Severity" subtitle="Alerts and open vulnerabilities correlated by severity" />
                            {findingsBySeverity.length === 0 ? (
                              <EmptyState title="No severity data" message="ไม่พบข้อมูล alert หรือ vulnerability ในช่วงเวลาที่เลือก" />
                            ) : (
                              <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                  <Pie data={findingsBySeverity} dataKey="count" nameKey="severity" innerRadius={52} outerRadius={86}>
                                    {findingsBySeverity.map((item: any) => (
                                      <Cell key={item.severity} fill={SEVERITY_COLORS[item.severity] || '#64748b'} />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} lg={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <SectionTitle title="Compliance Score By Framework" subtitle="Only frameworks with live control mappings get a score" />
                            {findingsByFramework.length === 0 ? (
                              <EmptyState title="No framework score" message="ยังไม่มีข้อมูล controls ที่ map กับ framework ที่เลือก" />
                            ) : (
                              <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={findingsByFramework}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                  <XAxis dataKey="frameworkName" tick={{ fontSize: 11 }} stroke="#8899bb" />
                                  <YAxis tick={{ fontSize: 11 }} stroke="#8899bb" />
                                  <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                                    {findingsByFramework.map((item: any) => (
                                      <Cell key={item.frameworkId} fill={item.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} lg={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <SectionTitle title="Alerts Timeline" subtitle="Current snapshot only when historical correlation is limited" />
                            {timeline.length === 0 ? (
                              <EmptyState title="No timeline data" message="ยังไม่มีข้อมูลย้อนหลังสำหรับแสดงแนวโน้ม" />
                            ) : (
                              <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={timeline}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                  <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} stroke="#8899bb" hide />
                                  <YAxis tick={{ fontSize: 11 }} stroke="#8899bb" />
                                  <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.25} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                      <Grid item xs={12} lg={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <SectionTitle title="Top Failed Controls" subtitle="Highest recurring failed controls from Wazuh SCA evidence" />
                            {topFailedControls.length === 0 ? (
                              <EmptyState title="No failed controls" message="ยังไม่พบ failed controls ที่ตรงกับ filter ปัจจุบัน" />
                            ) : (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Framework</TableCell>
                                    <TableCell>Control</TableCell>
                                    <TableCell align="right">Count</TableCell>
                                    <TableCell />
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {topFailedControls.map((item: any) => (
                                    <TableRow key={`${item.framework}-${item.controlId}`} hover>
                                      <TableCell>{FRAMEWORK_LABELS[item.framework] || item.framework}</TableCell>
                                      <TableCell>
                                        <Typography variant="body2" fontWeight={600}>{item.controlId}</Typography>
                                        <Typography variant="caption" color="text.secondary">{item.title}</Typography>
                                      </TableCell>
                                      <TableCell align="right">{formatCompactNumber(item.count)}</TableCell>
                                      <TableCell align="right">
                                        <Button size="small" onClick={() => setSelectedCheck(item)}>Details</Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} lg={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <SectionTitle title="Top Risky Agents" subtitle="Agent posture sorted by alert pressure, score, failed checks and vulnerabilities" />
                            {topRiskyAgents.length === 0 ? (
                              <EmptyState title="No risky agents" message="ยังไม่มี agent posture ที่แสดงความเสี่ยงในช่วงเวลานี้" />
                            ) : (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Agent</TableCell>
                                    <TableCell>Score</TableCell>
                                    <TableCell align="right">Failed</TableCell>
                                    <TableCell align="right">CVEs</TableCell>
                                    <TableCell />
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {topRiskyAgents.slice(0, 10).map((agent: any) => (
                                    <TableRow key={agent.agentId} hover>
                                      <TableCell>
                                        <Typography variant="body2" fontWeight={600}>{agent.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{agent.os} · {agent.group}</Typography>
                                      </TableCell>
                                      <TableCell>{agent.score === null ? 'N/A' : formatPercent(agent.score)}</TableCell>
                                      <TableCell align="right">{formatCompactNumber(agent.failedChecks)}</TableCell>
                                      <TableCell align="right">{formatCompactNumber(agent.vulnerabilities)}</TableCell>
                                      <TableCell align="right">
                                        <Button size="small" onClick={() => setSelectedAgent(agent)}>View</Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </>
                )}

                {activeTab === 1 && (
                  <>
                    <Grid container spacing={1.5}>
                      {frameworks.map((item: any) => (
                        <Grid item xs={12} md={6} xl={4} key={item.frameworkId}>
                          <FrameworkCard framework={item} onSelect={setFramework} />
                        </Grid>
                      ))}
                    </Grid>
                    <Card variant="outlined">
                      <CardContent>
                        <SectionTitle title="Framework Compliance Overview" subtitle="Score, failed controls and mapped alerts grouped per framework" />
                        <ScoreTable frameworks={frameworks} onSelectFramework={setFramework} />
                      </CardContent>
                    </Card>
                  </>
                )}

                {activeTab === 2 && (
                  scaQuery.isLoading ? (
                    <LoadingSpinner message="กำลังโหลด SCA checks และ failed controls..." />
                  ) : scaQuery.data?.checks?.length ? (
                    <>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} md={3}>
                          <MetricCard title="Policies" value={formatCompactNumber(scaQuery.data.meta?.totalPolicies || 0)} subtitle="Policies returned from Wazuh SCA" icon={PolicyOutlinedIcon} accent="#3b82f6" />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <MetricCard title="Failed Checks" value={formatCompactNumber(scaQuery.data.summary?.failed || 0)} subtitle="Checks with result failed" icon={GppBadOutlinedIcon} accent="#ef4444" />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <MetricCard title="Passed Checks" value={formatCompactNumber(scaQuery.data.summary?.passed || 0)} subtitle="Checks with result passed" icon={CheckCircleOutlinedIcon} accent="#10b981" />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <MetricCard title="Not Applicable" value={formatCompactNumber(scaQuery.data.summary?.notApplicable || 0)} subtitle="Controls marked N/A or skipped" icon={VerifiedOutlinedIcon} accent="#94a3b8" />
                        </Grid>
                      </Grid>
                      <Card variant="outlined">
                        <CardContent>
                          <SectionTitle title="Failed Controls Table" subtitle="เปิดรายละเอียดเพื่อดู rationale, remediation, references และ command ที่เกี่ยวข้อง" />
                          <TableContainer sx={{ maxHeight: 560 }}>
                            <Table size="small" stickyHeader>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Agent</TableCell>
                                  <TableCell>Policy</TableCell>
                                  <TableCell>Control</TableCell>
                                  <TableCell>Status</TableCell>
                                  <TableCell>Framework</TableCell>
                                  <TableCell>Last Scan</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {scaQuery.data.checks.map((check: any) => (
                                  <TableRow key={check.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedCheck(check)}>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight={600}>{check.affectedAgents?.[0] || '-'}</Typography>
                                      <Typography variant="caption" color="text.secondary">{check.policyId}</Typography>
                                    </TableCell>
                                    <TableCell>{check.policyName}</TableCell>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight={600}>{check.controlId}</Typography>
                                      <Typography variant="caption" color="text.secondary">{check.title}</Typography>
                                    </TableCell>
                                    <TableCell><StatusChip status={check.status} /></TableCell>
                                    <TableCell>{(check.frameworks || []).map((name: string) => FRAMEWORK_LABELS[name] || name).join(', ') || '-'}</TableCell>
                                    <TableCell>{formatDateTime(check.lastSeen)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <EmptyState title="No SCA checks" message="ยังไม่พบ SCA checks หรือ failed controls ที่ตรงกับ filter ปัจจุบัน" />
                  )
                )}

                {activeTab === 3 && (
                  agentsQuery.isLoading ? (
                    <LoadingSpinner message="กำลังโหลด agent compliance posture..." />
                  ) : agentsQuery.data?.items?.length ? (
                    <Card variant="outlined">
                      <CardContent>
                        <SectionTitle title="Agent Compliance Posture" subtitle="คลิก agent เพื่อเปิด drawer รายละเอียด failed controls, vulnerabilities และ recent alerts" />
                        <TableContainer sx={{ maxHeight: 620 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>Agent</TableCell>
                                <TableCell>IP / OS</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Group</TableCell>
                                <TableCell>Score</TableCell>
                                <TableCell align="right">Failed</TableCell>
                                <TableCell align="right">Critical</TableCell>
                                <TableCell align="right">High</TableCell>
                                <TableCell align="right">CVEs</TableCell>
                                <TableCell>Last SCA</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {agentsQuery.data.items.map((agent: any) => (
                                <TableRow key={agent.agentId} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedAgent(agent)}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600}>{agent.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{agent.agentId}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">{agent.ip}</Typography>
                                    <Typography variant="caption" color="text.secondary">{agent.os} {agent.osVersion || ''}</Typography>
                                  </TableCell>
                                  <TableCell><StatusChip status={agent.status} /></TableCell>
                                  <TableCell>{agent.group}</TableCell>
                                  <TableCell>{agent.score === null ? 'N/A' : formatPercent(agent.score)}</TableCell>
                                  <TableCell align="right">{formatCompactNumber(agent.failedChecks)}</TableCell>
                                  <TableCell align="right">{formatCompactNumber(agent.criticalAlerts)}</TableCell>
                                  <TableCell align="right">{formatCompactNumber(agent.highAlerts)}</TableCell>
                                  <TableCell align="right">{formatCompactNumber(agent.vulnerabilities)}</TableCell>
                                  <TableCell>{formatDateTime(agent.lastScan)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  ) : (
                    <EmptyState title="No agents found" message="ไม่พบ agent posture ที่ตรงกับ filter ปัจจุบัน" />
                  )
                )}

                {activeTab === 4 && (
                  vulnerabilitiesQuery.isLoading ? (
                    <LoadingSpinner message="กำลังโหลด vulnerability compliance risk..." />
                  ) : vulnerabilitiesQuery.data?.items?.length ? (
                    <>
                      <Grid container spacing={1.5}>
                        {(vulnerabilitiesQuery.data.summary?.bySeverity || []).map((item: any) => (
                          <Grid item xs={6} md={3} key={item.severity}>
                            <MetricCard
                              title={`${item.severity} CVEs`}
                              value={formatCompactNumber(item.count)}
                              subtitle="Open vulnerabilities from Wazuh detector"
                              icon={BugReportOutlinedIcon}
                              accent={SEVERITY_COLORS[item.severity] || '#64748b'}
                            />
                          </Grid>
                        ))}
                      </Grid>
                      <Card variant="outlined">
                        <CardContent>
                          <SectionTitle title="CVE Compliance Risk" subtitle="เปิด links อ้างอิงเฉพาะที่ Wazuh ส่งมาโดยตรง ไม่มีการ render HTML จาก raw log" />
                          <TableContainer sx={{ maxHeight: 560 }}>
                            <Table stickyHeader size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>CVE</TableCell>
                                  <TableCell>Package</TableCell>
                                  <TableCell>Severity</TableCell>
                                  <TableCell>Agent</TableCell>
                                  <TableCell>Installed</TableCell>
                                  <TableCell>Fixed</TableCell>
                                  <TableCell>Detected</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {vulnerabilitiesQuery.data.items.map((item: any) => (
                                  <TableRow key={`${item.cve}-${item.agentId}`} hover>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight={600}>{item.cve}</Typography>
                                      {item.references?.[0] ? (
                                        <Button size="small" href={item.references[0]} target="_blank" rel="noreferrer" endIcon={<OpenInNewOutlinedIcon fontSize="inherit" />}>
                                          Reference
                                        </Button>
                                      ) : null}
                                    </TableCell>
                                    <TableCell>{item.packageName}</TableCell>
                                    <TableCell><SeverityChip severity={item.severity} /></TableCell>
                                    <TableCell>
                                      <Typography variant="body2">{item.agentName}</Typography>
                                      <Typography variant="caption" color="text.secondary">{item.os}</Typography>
                                    </TableCell>
                                    <TableCell>{item.installedVersion}</TableCell>
                                    <TableCell>{item.fixedVersion || '-'}</TableCell>
                                    <TableCell>{formatDateTime(item.detectedAt)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <EmptyState title="No vulnerability data" message="No live vulnerability data source configured หรือ Wazuh vulnerability detector ยังไม่มีข้อมูล" />
                  )
                )}

                {activeTab === 5 && (
                  alertsQuery.isLoading ? (
                    <LoadingSpinner message="กำลังโหลด compliance-related alerts..." />
                  ) : alertsQuery.data?.items?.length ? (
                    <Card variant="outlined">
                      <CardContent>
                        <SectionTitle title="Recent Alerts Related To Compliance" subtitle="Alerts from Wazuh/OpenSearch ที่มี compliance mapping หรือเกี่ยวข้องกับ SCA, vulnerability, syscheck, audit" />
                        <TableContainer sx={{ maxHeight: 560 }}>
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Time</TableCell>
                                <TableCell>Rule</TableCell>
                                <TableCell>Severity</TableCell>
                                <TableCell>Agent</TableCell>
                                <TableCell>Source / Destination</TableCell>
                                <TableCell>Groups</TableCell>
                                <TableCell>Compliance</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {alertsQuery.data.items.map((alert: any) => (
                                <TableRow key={alert.id} hover>
                                  <TableCell>{formatDateTime(alert.timestamp)}</TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600}>{alert.ruleId}</Typography>
                                    <Typography variant="caption" color="text.secondary">{alert.description}</Typography>
                                  </TableCell>
                                  <TableCell><SeverityChip severity={alert.severity} /></TableCell>
                                  <TableCell>{alert.agent}</TableCell>
                                  <TableCell>
                                    <Typography variant="body2">{alert.sourceIp || '-'}</Typography>
                                    <Typography variant="caption" color="text.secondary">{alert.destinationIp || '-'}</Typography>
                                  </TableCell>
                                  <TableCell>{(alert.groups || []).slice(0, 3).join(', ') || '-'}</TableCell>
                                  <TableCell>
                                    {Object.entries(alert.compliance || {}).slice(0, 2).map(([name, values]) => (
                                      <Chip
                                        key={`${alert.id}-${name}`}
                                        size="small"
                                        label={`${FRAMEWORK_LABELS[name] || name}: ${(values as string[] || []).slice(0, 2).join(', ')}`}
                                        sx={{ mr: 0.5, mb: 0.5 }}
                                      />
                                    ))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  ) : (
                    <EmptyState title="No compliance alerts" message="ไม่พบ alert ที่เกี่ยวข้องกับ compliance ภายใต้ filter ปัจจุบัน" />
                  )
                )}

                {activeTab === 6 && (
                  evidenceQuery.isLoading ? (
                    <LoadingSpinner message="กำลังโหลด audit evidence..." />
                  ) : evidenceQuery.data?.items?.length ? (
                    <Card variant="outlined">
                      <CardContent>
                        <SectionTitle title="Audit Evidence" subtitle="Evidence rows generated from Wazuh SCA และ compliance-mapped alerts; สามารถ export JSON/CSV ได้จาก toolbar ด้านบน" />
                        <TableContainer sx={{ maxHeight: 560 }}>
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Timestamp</TableCell>
                                <TableCell>Framework</TableCell>
                                <TableCell>Control</TableCell>
                                <TableCell>Requirement</TableCell>
                                <TableCell>Evidence Source</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Related Agent</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {evidenceQuery.data.items.map((item: any) => (
                                <TableRow key={item.id} hover>
                                  <TableCell>{formatDateTime(item.timestamp)}</TableCell>
                                  <TableCell>{FRAMEWORK_LABELS[item.framework] || item.framework}</TableCell>
                                  <TableCell>{item.controlId}</TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600}>{item.requirement}</Typography>
                                    <Typography variant="caption" color="text.secondary">{item.details}</Typography>
                                  </TableCell>
                                  <TableCell>{item.evidenceSource}</TableCell>
                                  <TableCell><StatusChip status={item.status} /></TableCell>
                                  <TableCell>{item.relatedAgents}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  ) : (
                    <EmptyState title="No evidence rows" message="ไม่พบ evidence ที่สามารถใช้สำหรับ audit ภายใต้ filter ปัจจุบัน" />
                  )
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Box>

      <DetailPanel
        open={Boolean(selectedCheck)}
        onClose={() => setSelectedCheck(null)}
        title={selectedCheck?.title || selectedCheck?.requirement || 'Control details'}
        subtitle={selectedCheck ? `${selectedCheck.framework || ''} · ${selectedCheck.controlId || ''}` : ''}
        width={640}
      >
        {selectedCheck ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Box sx={{ mt: 0.5 }}><StatusChip status={selectedCheck.status} /></Box>
            </Box>
            {'description' in selectedCheck ? (
              <Box>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>{selectedCheck.description || '-'}</Typography>
              </Box>
            ) : null}
            {selectedCheck.rationale ? (
              <Box>
                <Typography variant="caption" color="text.secondary">Rationale</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>{selectedCheck.rationale}</Typography>
              </Box>
            ) : null}
            {selectedCheck.remediation ? (
              <Box>
                <Typography variant="caption" color="text.secondary">Remediation</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{selectedCheck.remediation}</Typography>
              </Box>
            ) : null}
            {selectedCheck.evidence?.command ? (
              <Box>
                <Typography variant="caption" color="text.secondary">Command / Check Logic</Typography>
                <Box sx={{ mt: 0.75, p: 1.25, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, wordBreak: 'break-word' }}>
                  {selectedCheck.evidence.command}
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  <CopyButton value={selectedCheck.evidence.command} />
                </Box>
              </Box>
            ) : null}
            {selectedCheck.references?.length ? (
              <Box>
                <Typography variant="caption" color="text.secondary">References</Typography>
                <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                  {selectedCheck.references.map((reference: string) => (
                    <Typography key={reference} variant="body2">{reference}</Typography>
                  ))}
                </Stack>
              </Box>
            ) : null}
          </Stack>
        ) : null}
      </DetailPanel>

      <DetailPanel
        open={Boolean(selectedAgent)}
        onClose={() => {
          setSelectedAgent(null)
          setAgentDrawerTab(0)
        }}
        title={selectedAgent?.name || 'Agent details'}
        subtitle={selectedAgent ? `${selectedAgent.agentId} · ${selectedAgent.os}` : ''}
        width={760}
      >
        {selectedAgent ? (
          <Stack spacing={2}>
            <Grid container spacing={1.25}>
              <Grid item xs={6} md={3}>
                <MetricCard title="Compliance Score" value={selectedAgent.score === null ? 'N/A' : formatPercent(selectedAgent.score)} subtitle="Average policy score" icon={ShieldOutlinedIcon} accent="#3b82f6" />
              </Grid>
              <Grid item xs={6} md={3}>
                <MetricCard title="Failed Checks" value={formatCompactNumber(selectedAgent.failedChecks)} subtitle="SCA failed controls" icon={GppBadOutlinedIcon} accent="#ef4444" />
              </Grid>
              <Grid item xs={6} md={3}>
                <MetricCard title="High / Critical" value={formatCompactNumber((selectedAgent.highAlerts || 0) + (selectedAgent.criticalAlerts || 0))} subtitle="Related compliance alerts" icon={WifiTetheringErrorOutlinedIcon} accent="#f97316" />
              </Grid>
              <Grid item xs={6} md={3}>
                <MetricCard title="Open CVEs" value={formatCompactNumber(selectedAgent.vulnerabilities)} subtitle="Wazuh vulnerability detector" icon={BugReportOutlinedIcon} accent="#8b5cf6" />
              </Grid>
            </Grid>

            <Card variant="outlined">
              <Tabs value={agentDrawerTab} onChange={(_, value) => setAgentDrawerTab(value)} variant="scrollable" scrollButtons="auto">
                <Tab label="Overview" />
                <Tab label="Failed Controls" />
                <Tab label="Vulnerabilities" />
                <Tab label="Recent Alerts" />
              </Tabs>
              <CardContent>
                {agentDrawerTab === 0 && (
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Agent</Typography>
                      <Typography variant="body1" fontWeight={600}>{selectedAgent.name}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Box sx={{ mt: 0.5 }}><StatusChip status={selectedAgent.status} /></Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">IP / Group</Typography>
                      <Typography variant="body2">{selectedAgent.ip} · {selectedAgent.group}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">OS / Version</Typography>
                      <Typography variant="body2">{selectedAgent.os} {selectedAgent.osVersion || ''} · {selectedAgent.version}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Last Seen</Typography>
                      <Typography variant="body2">{formatDateTime(selectedAgent.lastSeen)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Last SCA Scan</Typography>
                      <Typography variant="body2">{formatDateTime(selectedAgent.lastScan)}</Typography>
                    </Grid>
                  </Grid>
                )}

                {agentDrawerTab === 1 && (
                  agentScaQuery.isLoading ? (
                    <LoadingSpinner message="Loading agent SCA details..." />
                  ) : agentScaQuery.data?.checks?.length ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Policy</TableCell>
                          <TableCell>Control</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Last Scan</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {agentScaQuery.data.checks.map((check: any) => (
                          <TableRow key={check.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedCheck(check)}>
                            <TableCell>{check.policyName}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{check.controlId}</Typography>
                              <Typography variant="caption" color="text.secondary">{check.title}</Typography>
                            </TableCell>
                            <TableCell><StatusChip status={check.status} /></TableCell>
                            <TableCell>{formatDateTime(check.lastSeen)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState title="No SCA details" message="ยังไม่มี SCA checks สำหรับ agent นี้" />
                  )
                )}

                {agentDrawerTab === 2 && (
                  agentVulnerabilitiesQuery.isLoading ? (
                    <LoadingSpinner message="Loading vulnerabilities..." />
                  ) : agentVulnerabilitiesQuery.data?.items?.length ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>CVE</TableCell>
                          <TableCell>Package</TableCell>
                          <TableCell>Severity</TableCell>
                          <TableCell>Detected</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {agentVulnerabilitiesQuery.data.items.map((item: any) => (
                          <TableRow key={`${item.cve}-${item.packageName}`} hover>
                            <TableCell>{item.cve}</TableCell>
                            <TableCell>{item.packageName}</TableCell>
                            <TableCell><SeverityChip severity={item.severity} /></TableCell>
                            <TableCell>{formatDateTime(item.detectedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState title="No vulnerabilities" message="No live vulnerability data source configured หรือ agent นี้ยังไม่มีข้อมูล CVE" />
                  )
                )}

                {agentDrawerTab === 3 && (
                  agentAlertsQuery.isLoading ? (
                    <LoadingSpinner message="Loading recent alerts..." />
                  ) : agentAlertsQuery.data?.items?.length ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Time</TableCell>
                          <TableCell>Rule</TableCell>
                          <TableCell>Severity</TableCell>
                          <TableCell>Groups</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {agentAlertsQuery.data.items.map((item: any) => (
                          <TableRow key={item.id} hover>
                            <TableCell>{formatDateTime(item.timestamp)}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{item.ruleId}</Typography>
                              <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                            </TableCell>
                            <TableCell><SeverityChip severity={item.severity} /></TableCell>
                            <TableCell>{(item.groups || []).slice(0, 4).join(', ') || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState title="No alerts" message="ไม่พบ alert compliance ที่เกี่ยวข้องกับ agent นี้" />
                  )
                )}
              </CardContent>
            </Card>
          </Stack>
        ) : null}
      </DetailPanel>
    </Box>
  )
}
