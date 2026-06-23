import { useDeferredValue, useMemo, useState } from 'react'
import { Box, Button, Stack, Tab, Tabs, Typography, useTheme } from '@mui/material'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import RuleFolderOutlinedIcon from '@mui/icons-material/RuleFolderOutlined'
import { complianceApi } from '../../services/api'
import { PageShell, ContentGrid } from '../ui/layout'
import { SectionCard } from '../ui/SectionCard'
import MetricCard from '../ui/MetricCard'
import { LoadingSpinner } from '../common/CommonComponents'
import { BRAND, SEV_COLOR } from '../ui/tokens'
import {
  useComplianceAgents, useComplianceAlerts, useComplianceEvidence,
  useComplianceSca, useComplianceSummary, useComplianceVulnerabilities,
} from './useComplianceData'
import {
  downloadApiBlob, downloadTextFile, formatCompactNumber, formatDateTime,
  FRAMEWORK_COLORS, FRAMEWORK_LABELS, makeCsv,
} from './complianceUtils'
import { ErrorBox, ScoreGauge, TAB_ICONS, TAB_LABELS_TH } from './compliancePrimitives'
import { DataSourceHealthPanel } from './DataSourceHealthPanel'
import { ComplianceFilterBar } from './ComplianceFilterBar'
import { CheckDetailDrawer } from './CheckDetailDrawer'
import { AgentDetailDrawer } from './AgentDetailDrawer'
import { OverviewTab } from './tabs/OverviewTab'
import { FrameworksTab } from './tabs/FrameworksTab'
import { ScaTab } from './tabs/ScaTab'
import { AgentsTab } from './tabs/AgentsTab'
import { VulnerabilitiesTab } from './tabs/VulnerabilitiesTab'
import { AlertsTab } from './tabs/AlertsTab'
import { EvidenceTab } from './tabs/EvidenceTab'

// ── Overall compliance score card ───────────────────────────────────────────
function OverallScoreCard({ score, activeAgents }: { score: number | null; activeAgents: number }) {
  return (
    <SectionCard title="คะแนนรวม" accent={BRAND.primary} density="compact">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <ScoreGauge score={score} size={72} color={BRAND.primary} />
        <Box>
          <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.25 }}>เฉลี่ยทุกมาตรฐาน</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            {formatCompactNumber(activeAgents || 0)} อุปกรณ์ออนไลน์
          </Typography>
        </Box>
      </Box>
    </SectionCard>
  )
}

const STATUS_LABEL_TH: Record<string, string> = {
  connected: 'เชื่อมต่อแล้ว', degraded: 'ลดประสิทธิภาพ', error: 'ขัดข้อง',
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
  const findingsByFramework = (charts.findingsByFramework || []).map((item: any) => ({ ...item, color: FRAMEWORK_COLORS[item.frameworkId] || BRAND.primary }))
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

  const pageStatus = meta.dataSourceStatus === 'connected' ? 'live'
    : meta.dataSourceStatus === 'degraded' ? 'warning'
    : meta.dataSourceStatus === 'error' ? 'error'
    : undefined

  const overallScore = summary.overallScore === null || summary.overallScore === undefined ? null : Number(summary.overallScore)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageShell
      variant="report"
      title="ศูนย์ Compliance"
      subtitle="ภาพรวมสถานะการปฏิบัติตามมาตรฐาน CIS, PCI-DSS, NIST, GDPR, HIPAA และอื่นๆ"
      status={pageStatus}
      statusLabel={meta.dataSourceStatus ? STATUS_LABEL_TH[meta.dataSourceStatus] : undefined}
      lastUpdated={meta.lastUpdated ? formatDateTime(meta.lastUpdated) : undefined}
      actions={
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" size="small" startIcon={<RefreshRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={handleRefresh} disabled={summaryQuery.isFetching}
            sx={{ borderRadius: '9px', fontSize: 11, borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: BRAND.primary, color: BRAND.primary } }}>
            รีเฟรช
          </Button>
          <Button variant="outlined" size="small" startIcon={<DownloadRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={handleExportCsv} disabled={exporting}
            sx={{ borderRadius: '9px', fontSize: 11, borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: BRAND.primary, color: BRAND.primary } }}>
            CSV
          </Button>
          <Button variant="outlined" size="small" startIcon={<DownloadRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={handleExportJson}
            sx={{ borderRadius: '9px', fontSize: 11, borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: BRAND.primary, color: BRAND.primary } }}>
            JSON
          </Button>
        </Stack>
      }
    >
      <Box sx={{ display: 'grid', gap: 2 }}>
        <ComplianceFilterBar
          timeRange={timeRange} setTimeRange={setTimeRange}
          framework={framework} setFramework={setFramework}
          agentGroup={agentGroup} setAgentGroup={setAgentGroup}
          agentOs={agentOs} setAgentOs={setAgentOs}
          severity={severity} setSeverity={setSeverity}
          status={status} setStatus={setStatus}
          search={search} setSearch={setSearch}
          frameworkOptions={frameworkOptions} groupOptions={groupOptions} osOptions={osOptions}
        />

        <DataSourceHealthPanel
          dataSourceStatus={meta.dataSourceStatus}
          sources={meta.sources}
          lastUpdated={meta.lastUpdated}
          loading={isLoading}
        />

        {isLoading ? (
          <LoadingSpinner message="กำลังโหลดภาพรวม Compliance Dashboard..." />
        ) : summaryQuery.error ? (
          <ErrorBox error={summaryQuery.error} onRetry={summaryQuery.refetch} />
        ) : (
          <>
            <ContentGrid variant="auto-fit" minCardWidth={180} gap="md">
              <OverallScoreCard score={overallScore} activeAgents={summary.activeAgents} />
              <MetricCard title="จำนวนอุปกรณ์" value={formatCompactNumber(summary.totalAgents || 0)}
                subtitle={`${formatCompactNumber(summary.activeAgents || 0)} ออนไลน์ · ${formatCompactNumber(summary.disconnectedAgents || 0)} ออฟไลน์`}
                icon={<GroupsOutlinedIcon />} color={SEV_COLOR.low} accent />
              <MetricCard title="การตรวจสอบที่ล้มเหลว" value={formatCompactNumber(summary.failedControls || 0)}
                subtitle={`${formatCompactNumber(summary.passedControls || 0)} ผ่าน · ${formatCompactNumber(summary.notApplicableControls || 0)} N/A`}
                icon={<FactCheckOutlinedIcon />} color={SEV_COLOR.critical} accent />
              <MetricCard title="พบวิกฤต" value={formatCompactNumber(summary.criticalFindings || 0)}
                subtitle={`${formatCompactNumber(summary.highFindings || 0)} พบสูง`}
                icon={<WarningAmberOutlinedIcon />} color={SEV_COLOR.critical} accent />
              <MetricCard title="ช่องโหว่ที่เปิดอยู่" value={formatCompactNumber(summary.vulnerabilities || 0)}
                subtitle="Wazuh vulnerability detector"
                icon={<BugReportOutlinedIcon />} color={SEV_COLOR.high} accent />
              <MetricCard title="Alerts Compliance" value={formatCompactNumber(summary.relatedAlerts || 0)}
                subtitle={`${formatCompactNumber(summary.scaFailedChecks || 0)} SCA checks เชื่อมโยงแล้ว`}
                icon={<RuleFolderOutlinedIcon />} color={BRAND.primary} accent />
            </ContentGrid>

            <SectionCard
              title="รายละเอียดเชิงลึก"
              subtitle="ข้อมูลเชิงลึกจาก Wazuh SCA, vulnerability detector และ alerts"
              icon={<SecurityRoundedIcon fontSize="small" />}
              iconColor={BRAND.primary}
              noPad
              toolbar={
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                  variant="scrollable" scrollButtons="auto"
                  sx={{
                    minHeight: 40,
                    '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 700, fontSize: 12.5, gap: 0.75 },
                    '& .Mui-selected': { color: BRAND.primary },
                    '& .MuiTabs-indicator': { bgcolor: BRAND.primary, height: 3, borderRadius: '3px 3px 0 0' },
                  }}
                >
                  {TAB_LABELS_TH.map((label, idx) => (
                    <Tab key={label} label={label} icon={TAB_ICONS[idx] as any} iconPosition="start" />
                  ))}
                </Tabs>
              }
            >
              <Box sx={{ display: 'grid', gap: 2, p: { xs: 2, sm: 2.5 } }}>
                {currentTabError && <ErrorBox error={currentTabError} onRetry={currentTabRefetch} />}

                {activeTab === 0 && (
                  <OverviewTab
                    frameworks={frameworks}
                    findingsBySeverity={findingsBySeverity}
                    findingsByFramework={findingsByFramework}
                    timeline={timeline}
                    topFailedControls={topFailedControls}
                    topRiskyAgents={topRiskyAgents}
                    isDark={isDark}
                    onSelectFramework={setFramework}
                    onSelectCheck={setSelectedCheck}
                    onSelectAgent={setSelectedAgent}
                  />
                )}
                {activeTab === 1 && (
                  <FrameworksTab frameworks={frameworks} onSelectFramework={setFramework} />
                )}
                {activeTab === 2 && (
                  <ScaTab scaQuery={scaQuery} onSelectCheck={setSelectedCheck} />
                )}
                {activeTab === 3 && (
                  <AgentsTab agentsQuery={agentsQuery} onSelectAgent={setSelectedAgent} />
                )}
                {activeTab === 4 && (
                  <VulnerabilitiesTab vulnerabilitiesQuery={vulnerabilitiesQuery} />
                )}
                {activeTab === 5 && (
                  <AlertsTab alertsQuery={alertsQuery} />
                )}
                {activeTab === 6 && (
                  <EvidenceTab evidenceQuery={evidenceQuery} />
                )}
              </Box>
            </SectionCard>
          </>
        )}
      </Box>

      <CheckDetailDrawer check={selectedCheck} onClose={() => setSelectedCheck(null)} isDark={isDark} />

      <AgentDetailDrawer
        agent={selectedAgent}
        onClose={() => { setSelectedAgent(null); setAgentDrawerTab(0) }}
        drawerTab={agentDrawerTab}
        setDrawerTab={setAgentDrawerTab}
        scaQuery={agentScaQuery}
        vulnerabilitiesQuery={agentVulnerabilitiesQuery}
        alertsQuery={agentAlertsQuery}
        onSelectCheck={setSelectedCheck}
        isDark={isDark}
      />
    </PageShell>
  )
}
