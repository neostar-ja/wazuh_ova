import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded'
import HistoryEduRoundedIcon from '@mui/icons-material/HistoryEduRounded'
import { useSnackbar } from 'notistack'
import PageHeader from '../ui/PageHeader'
import SectionCard from '../ui/SectionCard'
import MetricCard from '../ui/MetricCard'
import EmptyState, { ErrorState } from '../ui/EmptyState'
import { DetailPanel } from '../common/CommonComponents'
import {
  detectInvestigationQueryType,
  exportInvestigationEvidence,
  investigate,
} from '../../services/investigateApi'
import type {
  InvestigationDirection,
  InvestigationQueryType,
  InvestigationRange,
  InvestigationRequest,
  InvestigationSeverity,
  TimelineEvent,
  InvestigationAlert,
} from '../../types'
import InvestigationSearchHero from './InvestigationSearchHero'
import EntityProfileCard from './EntityProfileCard'
import RiskScoreCard from './RiskScoreCard'
import InvestigationTimeline from './InvestigationTimeline'
import RelatedAlertsTable from './RelatedAlertsTable'
import ThreatIntelPanel from './ThreatIntelPanel'
import HostContextPanel from './HostContextPanel'
import MitrePanel from './MitrePanel'
import CompliancePanel from './CompliancePanel'
import RelatedEntitiesPanel from './RelatedEntitiesPanel'
import RawEvidencePanel from './RawEvidencePanel'
import SuggestedActionsPanel from './SuggestedActionsPanel'
import { MonoValue, formatTimestamp, jsonToDisplay } from './utils'

type InvestigationTab =
  | 'timeline'
  | 'alerts'
  | 'threat-intel'
  | 'host-context'
  | 'mitre'
  | 'compliance'
  | 'related-entities'
  | 'raw-evidence'

const RECENT_KEY = 'wazuh-investigation-recent'

function getRecentSearches(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  const next = [query, ...getRecentSearches().filter((entry) => entry !== query)].slice(0, 8)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  return next
}

function parseRange(value: string | null): InvestigationRange {
  return value === '1h' || value === '6h' || value === '24h' || value === '7d' || value === '30d' || value === '90d' ? value : '30d'
}

function parseDirection(value: string | null): InvestigationDirection {
  return value === 'source' || value === 'destination' || value === 'both' ? value : 'both'
}

function parseSeverity(value: string | null): InvestigationSeverity {
  return value === 'critical' || value === 'high' || value === 'medium' || value === 'low' || value === 'info' || value === 'all' ? value : 'all'
}

function parseQueryType(value: string | null): InvestigationQueryType | 'auto' {
  return value === 'ip' ||
    value === 'hostname' ||
    value === 'agent' ||
    value === 'user' ||
    value === 'mac' ||
    value === 'domain' ||
    value === 'hash' ||
    value === 'rule' ||
    value === 'cve' ||
    value === 'unknown'
    ? value
    : 'auto'
}

function validateQuery(query: string, type: InvestigationQueryType | 'auto'): string | null {
  const trimmed = query.trim()
  if (!trimmed) return 'กรุณาระบุคำค้นหาก่อนเริ่ม investigation'
  if (type === 'ip' && detectInvestigationQueryType(trimmed) !== 'ip') return 'รูปแบบ IP ไม่ถูกต้อง'
  if (type === 'mac' && detectInvestigationQueryType(trimmed) !== 'mac') return 'รูปแบบ MAC Address ไม่ถูกต้อง'
  if (type === 'hash' && detectInvestigationQueryType(trimmed) !== 'hash') return 'รูปแบบ hash ไม่ถูกต้อง'
  if (type === 'cve' && detectInvestigationQueryType(trimmed) !== 'cve') return 'รูปแบบ CVE ไม่ถูกต้อง'
  if (type === 'rule' && detectInvestigationQueryType(trimmed) !== 'rule') return 'Rule ID ต้องเป็นตัวเลข 3-6 หลัก'
  return null
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export default function InvestigatePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { enqueueSnackbar } = useSnackbar()

  const initialQuery = searchParams.get('q')?.trim() ?? ''
  const initialRange = parseRange(searchParams.get('range'))
  const initialDirection = parseDirection(searchParams.get('direction'))
  const initialSeverity = parseSeverity(searchParams.get('severity'))
  const initialType = parseQueryType(searchParams.get('type'))

  const [query, setQuery] = useState(initialQuery)
  const [selectedType, setSelectedType] = useState<InvestigationQueryType | 'auto'>(initialType)
  const [range, setRange] = useState<InvestigationRange>(initialRange)
  const [direction, setDirection] = useState<InvestigationDirection>(initialDirection)
  const [severity, setSeverity] = useState<InvestigationSeverity>(initialSeverity)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches())
  const [activeTab, setActiveTab] = useState<InvestigationTab>('timeline')
  const [techniqueFilter, setTechniqueFilter] = useState<string | null>(null)
  const [selectedEvidence, setSelectedEvidence] = useState<{
    title: string
    subtitle?: string
    raw?: unknown
    notes?: string[]
  } | null>(null)

  const initialSubmittedRequest = initialQuery
    ? {
        query: initialQuery,
        type: initialType === 'auto' ? detectInvestigationQueryType(initialQuery) : initialType,
        range: initialRange,
        direction: initialDirection,
        severity: initialSeverity,
      }
    : null

  const [submittedRequest, setSubmittedRequest] = useState<InvestigationRequest | null>(initialSubmittedRequest)

  const detectedType = detectInvestigationQueryType(query)
  const effectiveType = selectedType === 'auto' ? detectedType : selectedType

  const investigationQuery = useQuery({
    queryKey: [
      'investigate',
      submittedRequest?.query ?? '',
      submittedRequest?.type ?? 'unknown',
      submittedRequest?.range ?? '30d',
      submittedRequest?.direction ?? 'both',
      submittedRequest?.severity ?? 'all',
    ],
    queryFn: () => investigate(submittedRequest as InvestigationRequest),
    enabled: Boolean(submittedRequest?.query),
    retry: 1,
    staleTime: 20000,
  })

  const result = investigationQuery.data

  const metrics = useMemo(() => {
    if (!result) return []
    return [
      { title: 'Total Related Alerts', value: result.summary.totalAlerts, color: '#7B5BA4', subtitle: 'ในช่วงเวลาที่เลือก' },
      { title: 'Critical / High', value: `${result.summary.criticalAlerts}/${result.summary.highAlerts}`, color: '#EF4444', subtitle: 'priority queue' },
      { title: 'First Seen', value: formatTimestamp(result.profile.firstSeen), color: '#38BDF8', subtitle: 'first telemetry' },
      { title: 'Last Seen', value: formatTimestamp(result.profile.lastSeen), color: '#22C55E', subtitle: 'latest telemetry' },
      { title: 'Related Agents', value: result.summary.relatedAgents, color: '#F17422', subtitle: 'linked agents' },
      { title: 'Related Rules', value: result.summary.relatedRules, color: '#EAB308', subtitle: 'linked rule ids' },
    ]
  }, [result])

  const riskFactors = useMemo(() => {
    if (!result) return []
    const factors: string[] = []
    if ((result.profile.riskScore ?? 0) >= 8) factors.push('risk score สูงกว่า 8/10')
    if (result.summary.criticalAlerts > 0) factors.push(`มี critical alerts ${result.summary.criticalAlerts} รายการ`)
    if ((result.hostContext?.criticalCves ?? 0) > 0) factors.push(`มี critical CVEs ${result.hostContext?.criticalCves}`)
    if ((result.hostContext?.scaFailed ?? 0) > 0) factors.push(`มี failed SCA checks ${result.hostContext?.scaFailed}`)
    if ((result.threatIntel ?? []).some((item) => item.status === 'available' && (item.score ?? 0) >= 70)) {
      factors.push('Threat intelligence ให้คะแนนเสี่ยงสูงจาก external feed')
    }
    return factors.slice(0, 5)
  }, [result])

  const topRelatedAgent = useMemo(
    () => result?.relatedEntities?.find((entity) => entity.type === 'agent'),
    [result],
  )
  const topRelatedRule = useMemo(
    () => result?.relatedEntities?.find((entity) => entity.type === 'rule'),
    [result],
  )
  const topRelatedSource = useMemo(
    () => result?.relatedEntities?.find((entity) => entity.type === 'ip' || entity.type === 'source'),
    [result],
  )
  const topRelatedDestination = useMemo(
    () => result?.relatedEntities?.find((entity) => entity.type === 'destination'),
    [result],
  )

  const handleSearch = (overrideQuery?: string, overrideType?: InvestigationQueryType | 'auto') => {
    const nextQuery = (overrideQuery ?? query).trim()
    const nextTypeMode = overrideType ?? selectedType
    const error = validateQuery(nextQuery, nextTypeMode)

    setQuery(nextQuery)
    setSelectedType(nextTypeMode)

    if (error) {
      setQueryError(error)
      return
    }

    const request: InvestigationRequest = {
      query: nextQuery,
      type: nextTypeMode === 'auto' ? detectInvestigationQueryType(nextQuery) : nextTypeMode,
      range,
      direction,
      severity,
    }

    setQueryError(null)
    setTechniqueFilter(null)
    setActiveTab('timeline')
    setSubmittedRequest(request)
    setRecentSearches(saveRecentSearch(nextQuery))

    const nextParams = new URLSearchParams()
    nextParams.set('q', request.query)
    nextParams.set('type', nextTypeMode)
    nextParams.set('range', request.range)
    nextParams.set('direction', request.direction ?? 'both')
    nextParams.set('severity', request.severity ?? 'all')
    setSearchParams(nextParams, { replace: false })
  }

  const handleInvestigateEntity = (value: string, type?: InvestigationQueryType) => {
    setQuery(value)
    handleSearch(value, type ?? 'auto')
  }

  const handleCopySummary = () => {
    if (!result) return
    const summaryLines = [
      `Investigation: ${result.profile.displayName}`,
      `Type: ${result.profile.type}`,
      `Total alerts: ${result.summary.totalAlerts}`,
      `Critical: ${result.summary.criticalAlerts}`,
      `High: ${result.summary.highAlerts}`,
      `First seen: ${formatTimestamp(result.profile.firstSeen)}`,
      `Last seen: ${formatTimestamp(result.profile.lastSeen)}`,
      `Top related rule: ${topRelatedRule?.value ?? '—'}`,
      `Top related agent: ${topRelatedAgent?.value ?? '—'}`,
    ]
    navigator.clipboard.writeText(summaryLines.join('\n'))
    enqueueSnackbar('คัดลอก investigation summary แล้ว', { variant: 'info', autoHideDuration: 1600 })
  }

  const handleExport = async () => {
    if (!submittedRequest) return
    const blob = await exportInvestigationEvidence(submittedRequest.query, submittedRequest.range, submittedRequest.type)
    downloadBlob(blob, `investigation-${submittedRequest.query.replace(/\s+/g, '_')}-${submittedRequest.range}.json`)
  }

  const openEvidence = (item: TimelineEvent | InvestigationAlert) => {
    if ('ruleLevel' in item) {
      setSelectedEvidence({
        title: item.description,
        subtitle: `${item.ruleId} · ${item.agentName ?? item.decoder ?? 'Wazuh alert'}`,
        raw: item.raw,
        notes: [
          `Timestamp: ${formatTimestamp(item.timestamp)}`,
          `Severity: ${item.severity}`,
          `Source: ${item.sourceIp ?? '—'}`,
          `Destination: ${item.destinationIp ?? '—'}`,
        ],
      })
      return
    }

    setSelectedEvidence({
      title: item.title,
      subtitle: item.description,
      raw: item.raw,
      notes: [
        `Timestamp: ${formatTimestamp(item.timestamp)}`,
        `Severity: ${item.severity}`,
        `Rule ID: ${item.ruleId ?? '—'}`,
        `Agent: ${item.agentName ?? '—'}`,
      ],
    })
  }

  return (
    <Box className="space-y-6">
      <PageHeader
        title="วิเคราะห์เหตุการณ์"
        subtitle="ค้นหาและเชื่อมโยง IP, Host, User, IOC และ Alert จาก Wazuh / OpenSearch เพื่อทำ investigation แบบ end-to-end"
        status="live"
        statusLabel="INVESTIGATION READY"
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => investigationQuery.refetch()}
              disabled={!submittedRequest || investigationQuery.isFetching}
            >
              Refresh
            </Button>
            <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={handleExport} disabled={!submittedRequest}>
              Export Evidence
            </Button>
            <Button
              variant="contained"
              startIcon={<NotificationsActiveRoundedIcon />}
              onClick={() => setActiveTab('alerts')}
              disabled={!submittedRequest}
            >
              Open Alerts
            </Button>
          </>
        }
      />

      <InvestigationSearchHero
        query={query}
        detectedType={detectedType}
        selectedType={selectedType}
        range={range}
        direction={direction}
        severity={severity}
        advancedOpen={advancedOpen}
        error={queryError}
        recentSearches={recentSearches}
        searching={investigationQuery.isFetching}
        onQueryChange={setQuery}
        onSelectedTypeChange={setSelectedType}
        onRangeChange={setRange}
        onDirectionChange={setDirection}
        onSeverityChange={setSeverity}
        onToggleAdvanced={() => setAdvancedOpen((current) => !current)}
        onSearch={() => handleSearch()}
        onUseQuery={(value) => handleInvestigateEntity(value)}
      />

      {!submittedRequest ? (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <SectionCard title="Entity Correlation" subtitle="เชื่อมโยง alert, asset, IOC และ host posture" icon={<InsightsRoundedIcon />} accent="#7B5BA4">
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.8 }}>
                หน้าใหม่นี้ออกแบบให้ analyst เริ่มจาก query เดียว แล้วเห็น profile, timeline, alerts, MITRE และ compliance ในบริบทเดียวกัน
              </Typography>
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <SectionCard title="Threat Intel" subtitle="รองรับ external intelligence แบบ multi-source" icon={<HistoryEduRoundedIcon />} accent="#38BDF8">
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.8 }}>
                ถ้า backend ยังไม่มี API key ระบบจะระบุชัดว่า not configured แทนการแสดงคะแนนปลอม
              </Typography>
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <SectionCard title="Raw Evidence Safe View" subtitle="เปิด JSON ได้แบบปลอดภัย" icon={<DataObjectRoundedIcon />} accent="#22C55E">
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.8 }}>
                raw evidence จะถูกแสดงเป็น text/json เท่านั้น ไม่มีการ render HTML จาก backend และสามารถ copy/download ต่อได้
              </Typography>
            </SectionCard>
          </Grid>
        </Grid>
      ) : investigationQuery.isLoading ? (
        <SectionCard title="Loading Investigation" subtitle="กำลังรวบรวมข้อมูลจาก Wazuh / OpenSearch / Compliance / IOC" icon={<InsightsRoundedIcon />} accent="#7B5BA4" loading>
          <Box />
        </SectionCard>
      ) : investigationQuery.isError ? (
        <SectionCard
          title="Investigation Error"
          subtitle="ไม่สามารถโหลด investigation result ได้"
          icon={<InsightsRoundedIcon />}
          accent="#EF4444"
          error={<ErrorState message="เกิดข้อผิดพลาดระหว่างโหลด investigation data กรุณาตรวจสอบ backend และลองใหม่อีกครั้ง" onRetry={() => investigationQuery.refetch()} />}
        >
          <Box />
        </SectionCard>
      ) : result ? (
        <>
          <Grid container spacing={1.5}>
            {metrics.map((metric) => (
              <Grid key={metric.title} item xs={12} sm={6} md={4} xl={2}>
                <MetricCard
                  title={metric.title}
                  value={metric.value}
                  subtitle={metric.subtitle}
                  color={metric.color}
                  accent
                  compact={metric.title !== 'First Seen' && metric.title !== 'Last Seen'}
                />
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} xl={8.5}>
              <Stack spacing={2}>
                <EntityProfileCard profile={result.profile} />

                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs
                    value={activeTab}
                    onChange={(_, value: InvestigationTab) => setActiveTab(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    <Tab value="timeline" label={`Timeline (${result.timeline.length})`} />
                    <Tab value="alerts" label={`Alerts (${result.alerts.length})`} />
                    <Tab value="threat-intel" label="Threat Intel" />
                    <Tab value="host-context" label="Host Context" />
                    <Tab value="mitre" label="MITRE" />
                    <Tab value="compliance" label="Compliance" />
                    <Tab value="related-entities" label="Related Entities" />
                    <Tab value="raw-evidence" label="Raw Evidence" />
                  </Tabs>
                </Box>

                {activeTab === 'timeline' && (
                  <InvestigationTimeline timeline={result.timeline} onSelectEvent={openEvidence} />
                )}

                {activeTab === 'alerts' && (
                  <RelatedAlertsTable
                    alerts={result.alerts}
                    onSelectAlert={openEvidence}
                    techniqueFilter={techniqueFilter}
                    onClearTechniqueFilter={() => setTechniqueFilter(null)}
                  />
                )}

                {activeTab === 'threat-intel' && <ThreatIntelPanel results={result.threatIntel} />}
                {activeTab === 'host-context' && <HostContextPanel hostContext={result.hostContext} />}
                {activeTab === 'mitre' && (
                  <MitrePanel
                    summary={result.mitreSummary}
                    onFilterTechnique={(technique) => {
                      setTechniqueFilter(technique)
                      setActiveTab('alerts')
                    }}
                  />
                )}
                {activeTab === 'compliance' && <CompliancePanel summary={result.complianceSummary} />}
                {activeTab === 'related-entities' && (
                  <RelatedEntitiesPanel
                    entities={result.relatedEntities}
                    history={recentSearches}
                    onSelectEntity={(value, type) => handleInvestigateEntity(value, type)}
                  />
                )}
                {activeTab === 'raw-evidence' && (
                  <RawEvidencePanel
                    raw={result.raw}
                    filename={`investigation-${result.profile.displayName.replace(/\s+/g, '_')}.json`}
                  />
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} xl={3.5}>
              <Stack spacing={2}>
                <RiskScoreCard profile={result.profile} riskFactors={riskFactors} />

                <SectionCard title="Insight Rail" subtitle="บริบทสรุปที่ analyst ใช้ตัดสินใจต่อได้เร็ว" icon={<InsightsRoundedIcon />} accent="#38BDF8">
                  <Stack spacing={1.5}>
                    <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        Overview
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.8, lineHeight: 1.75 }}>
                        {result.summary.overview}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      {result.threatIntel?.some((item) => item.status === 'not_configured') ? (
                        <Chip label="Threat Intel feed ยังไม่ครบ" color="warning" />
                      ) : null}
                      {!result.hostContext ? <Chip label="Host context จำกัด" color="default" /> : null}
                      {!result.complianceSummary ? <Chip label="Compliance context จำกัด" color="default" /> : null}
                    </Stack>

                    <Box>
                      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.6 }}>
                        Top Related Rule
                      </Typography>
                      <MonoValue value={topRelatedRule?.value ?? '—'} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.6 }}>
                        Top Related Agent
                      </Typography>
                      <MonoValue value={topRelatedAgent?.value ?? '—'} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.6 }}>
                        Top Source / Destination
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        SRC: {topRelatedSource?.value ?? '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.4 }}>
                        DST: {topRelatedDestination?.value ?? '—'}
                      </Typography>
                    </Box>
                  </Stack>
                </SectionCard>

                <SuggestedActionsPanel
                  profile={result.profile}
                  sourceIp={topRelatedSource?.value}
                  destinationIp={topRelatedDestination?.value}
                  onInvestigate={(value) => handleInvestigateEntity(value)}
                  onExport={handleExport}
                  onCopySummary={handleCopySummary}
                  onOpenAlerts={() => setActiveTab('alerts')}
                />
              </Stack>
            </Grid>
          </Grid>
        </>
      ) : (
        <EmptyState title="พร้อมเริ่ม investigation" description="กรอก entity ด้านบนเพื่อเริ่มค้นหาและเชื่อมโยงข้อมูลจาก Wazuh/OpenSearch" />
      )}

      <DetailPanel
        open={Boolean(selectedEvidence)}
        onClose={() => setSelectedEvidence(null)}
        title={selectedEvidence?.title ?? 'Evidence'}
        subtitle={selectedEvidence?.subtitle}
        width={620}
      >
        <Stack spacing={1.5}>
          {selectedEvidence?.notes?.map((note) => (
            <Box key={note} sx={{ p: 1.2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.04)' }}>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{note}</Typography>
            </Box>
          ))}

          <Box sx={{ p: 2, borderRadius: '18px', bgcolor: 'rgba(10,16,28,0.72)', border: '1px solid rgba(56,189,248,0.16)' }}>
            <Typography
              component="pre"
              sx={{
                m: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
                lineHeight: 1.7,
                color: '#d8e4ff',
              }}
            >
              {jsonToDisplay(selectedEvidence?.raw ?? {})}
            </Typography>
          </Box>
        </Stack>
      </DetailPanel>
    </Box>
  )
}
