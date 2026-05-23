import api from './api'
import type {
  EntityProfile,
  HostContext,
  HostContextPort,
  InvestigationAlert,
  InvestigationComplianceSummary,
  InvestigationMitreSummary,
  InvestigationQueryType,
  InvestigationRange,
  InvestigationRequest,
  InvestigationResult,
  InvestigationSeverity,
  RelatedEntity,
  ThreatIntelResult,
  TimelineEvent,
} from '../types'

type JsonObject = Record<string, unknown>

interface BackendInvestigateResponse {
  query?: string
  type?: string
  time_range?: string
  events?: unknown[]
  count?: number
  identity?: unknown
  dhcp?: unknown[]
  wifi?: unknown[]
  mitre?: unknown
  level_dist?: unknown
  hourly?: unknown[]
  top_sources?: unknown[]
  correlation?: unknown
}

interface BackendThreatIntelResponse {
  value?: string
  ioc_type?: string
  is_private?: boolean
  risk_score?: number
  verdict?: string
  custom_match?: boolean
  custom_ioc?: unknown
  feeds?: unknown
}

interface BackendComplianceItemsResponse {
  meta?: unknown
  items?: unknown[]
  checks?: unknown[]
  policies?: unknown[]
  summary?: unknown
}

interface BackendAssetsDetailResponse {
  device?: unknown
  dhcp_history?: unknown[]
  wifi_sessions?: unknown[]
  recent_alerts?: unknown[]
  top_rules?: unknown[]
  timeline?: unknown[]
}

interface RelatedAlertsFilters {
  type?: InvestigationQueryType
  range?: InvestigationRange
  severity?: InvestigationSeverity
  direction?: InvestigationRequest['direction']
  limit?: number
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asObject(value: unknown): JsonObject {
  return isObject(value) ? value : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function asStringArray(value: unknown): string[] {
  return asArray(value)
    .map((entry) => asString(entry))
    .filter((entry): entry is string => Boolean(entry))
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function severityFromLevel(level: number): InvestigationAlert['severity'] {
  if (level >= 15) return 'critical'
  if (level >= 12) return 'high'
  if (level >= 7) return 'medium'
  if (level >= 1) return 'low'
  return 'info'
}

function severityWeight(severity: InvestigationAlert['severity']): number {
  switch (severity) {
    case 'critical':
      return 5
    case 'high':
      return 4
    case 'medium':
      return 3
    case 'low':
      return 2
    default:
      return 1
  }
}

function normalizeQuery(input: string): string {
  return input.trim()
}

function isValidIpv4(value: string): boolean {
  const octets = value.split('.')
  if (octets.length !== 4) return false
  return octets.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
}

function isLikelyIpv6(value: string): boolean {
  return /^[0-9a-fA-F:]+$/.test(value) && value.includes(':')
}

function isMacAddress(value: string): boolean {
  return /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/.test(value)
}

function isDomainLike(value: string): boolean {
  return /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/.test(value)
}

function escapeQueryString(value: string): string {
  return value.replace(/([+\-=&|><!(){}\[\]^"~*?:\\/])/g, '\\$1')
}

function quoteQuery(value: string): string {
  return `"${escapeQueryString(value)}"`
}

function buildAlertQuery(query: string, type: InvestigationQueryType): string {
  if (type === 'unknown') {
    return escapeQueryString(query)
  }
  return quoteQuery(query)
}

function toBackendInvestigateType(type: InvestigationQueryType): 'ip' | 'mac' | 'user' | 'host' | 'auto' {
  if (type === 'ip') return 'ip'
  if (type === 'mac') return 'mac'
  if (type === 'user') return 'user'
  if (type === 'hostname' || type === 'agent') return 'host'
  return 'auto'
}

function shouldUseInvestigateEndpoint(type: InvestigationQueryType): boolean {
  return type === 'ip' || type === 'mac' || type === 'user' || type === 'hostname' || type === 'agent' || type === 'unknown'
}

function shouldUseThreatIntel(type: InvestigationQueryType): boolean {
  return type === 'ip' || type === 'domain' || type === 'hash'
}

function formatRiskLevel(score?: number): EntityProfile['riskLevel'] {
  if (score == null) return 'info'
  if (score >= 8) return 'critical'
  if (score >= 6) return 'high'
  if (score >= 4) return 'medium'
  if (score >= 2) return 'low'
  return 'info'
}

export function detectInvestigationQueryType(value: string): InvestigationQueryType {
  const query = normalizeQuery(value)
  if (!query) return 'unknown'
  if (isValidIpv4(query) || isLikelyIpv6(query)) return 'ip'
  if (isMacAddress(query)) return 'mac'
  if (/^[0-9a-fA-F]{64}$/.test(query) || /^[0-9a-fA-F]{40}$/.test(query) || /^[0-9a-fA-F]{32}$/.test(query)) return 'hash'
  if (/^CVE-\d{4}-\d{4,}$/i.test(query)) return 'cve'
  if (/^\d{3,6}$/.test(query)) return 'rule'
  if (isDomainLike(query) && !isValidIpv4(query)) return 'domain'
  if (query.includes('@') || query.includes('\\')) return 'user'
  if (/^[a-zA-Z0-9._-]{2,}$/.test(query)) return 'hostname'
  return 'unknown'
}

function normalizeRawAlert(raw: unknown): InvestigationAlert | null {
  const source = asObject(raw)
  const rule = asObject(source.rule)
  const data = asObject(source.data)
  const agent = asObject(source.agent)
  const mitre = asObject(rule.mitre)
  const geo = asObject(source.GeoLocation)
  const predecoder = asObject(source.predecoder)
  const compliance = unique([
    ...asStringArray(rule.pci_dss),
    ...asStringArray(rule.hipaa),
    ...asStringArray(rule.gdpr),
    ...asStringArray(rule.nist_800_53),
    ...asStringArray(rule.tsc),
  ])

  const timestamp = asString(source['@timestamp']) ?? asString(source.timestamp)
  const ruleId = asString(rule.id) ?? asString(source.ruleId)
  const description = asString(rule.description) ?? asString(source.description) ?? asString(source.full_log)
  const ruleLevel = asNumber(rule.level) ?? asNumber(source.level) ?? 0

  if (!timestamp || !description) {
    return null
  }

  const id =
    asString(source.id) ??
    asString(source._id) ??
    `${timestamp}-${ruleId ?? 'rule'}-${asString(agent.id) ?? asString(agent.name) ?? 'agent'}`

  return {
    id,
    timestamp,
    severity: severityFromLevel(ruleLevel),
    ruleId: ruleId ?? '-',
    ruleLevel,
    description,
    agentId: asString(agent.id) ?? asString(source.agentId),
    agentName: asString(agent.name) ?? asString(source.agent),
    agentIp: asString(agent.ip),
    sourceIp: asString(data.srcip) ?? asString(source.sourceIp),
    destinationIp: asString(data.dstip) ?? asString(source.destinationIp),
    sourcePort: asString(data.srcport),
    destinationPort: asString(data.dstport),
    decoder: asString(predecoder.program_name) ?? asString(source.source),
    location: asString(source.location) ?? asString(geo.country_name),
    mitreTactics: asStringArray(mitre.tactic),
    mitreTechniques: asStringArray(mitre.technique).length
      ? asStringArray(mitre.technique)
      : asStringArray(asObject(source).mitre),
    compliance,
    fullLog: asString(source.full_log) ?? asString(source.fullLog),
    raw,
  }
}

function normalizeAlerts(rawAlerts: unknown[]): InvestigationAlert[] {
  return rawAlerts
    .map((item) => normalizeRawAlert(item))
    .filter((item): item is InvestigationAlert => Boolean(item))
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
}

function applySeverityFilter(
  alerts: InvestigationAlert[],
  severity: InvestigationSeverity = 'all',
): InvestigationAlert[] {
  if (severity === 'all') return alerts
  return alerts.filter((alert) => alert.severity === severity)
}

function applyDirectionFilter(
  alerts: InvestigationAlert[],
  direction: InvestigationRequest['direction'] = 'both',
  query: string,
): InvestigationAlert[] {
  if (direction === 'both') return alerts
  return alerts.filter((alert) => {
    if (direction === 'source') return alert.sourceIp === query
    if (direction === 'destination') return alert.destinationIp === query
    return true
  })
}

function normalizeTimelineEvent(alert: InvestigationAlert): TimelineEvent {
  return {
    id: alert.id,
    timestamp: alert.timestamp,
    title: alert.description,
    description: `${alert.ruleId} · ${alert.agentName ?? alert.decoder ?? 'Wazuh event'}`,
    severity: alert.severity,
    category: alert.decoder ?? 'security-event',
    ruleId: alert.ruleId,
    agentName: alert.agentName,
    sourceIp: alert.sourceIp,
    destinationIp: alert.destinationIp,
    mitre: unique([...(alert.mitreTactics ?? []), ...(alert.mitreTechniques ?? [])]),
    raw: alert.raw,
  }
}

function aggregateMitre(alerts: InvestigationAlert[]): InvestigationMitreSummary | undefined {
  const tactics = new Map<string, number>()
  const techniques = new Map<string, number>()

  alerts.forEach((alert) => {
    ;(alert.mitreTactics ?? []).forEach((value) => tactics.set(value, (tactics.get(value) ?? 0) + 1))
    ;(alert.mitreTechniques ?? []).forEach((value) => techniques.set(value, (techniques.get(value) ?? 0) + 1))
  })

  if (tactics.size === 0 && techniques.size === 0) {
    return undefined
  }

  const sortEntries = (entryMap: Map<string, number>) =>
    Array.from(entryMap.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([name, count]) => ({ name, count }))

  return {
    tactics: sortEntries(tactics).slice(0, 12),
    techniques: sortEntries(techniques).slice(0, 12),
    totalTactics: tactics.size,
    totalTechniques: techniques.size,
  }
}

function aggregateRelatedEntities(
  alerts: InvestigationAlert[],
  investigateRaw: BackendInvestigateResponse | null,
): RelatedEntity[] {
  const counts = new Map<string, RelatedEntity>()

  const addEntity = (
    type: RelatedEntity['type'],
    value: string | undefined,
    severity?: RelatedEntity['severity'],
    lastSeen?: string,
  ) => {
    if (!value) return
    const key = `${type}:${value}`
    const current = counts.get(key)
    if (current) {
      current.count += 1
      if (severity && severityWeight(severity) > severityWeight(current.severity ?? 'info')) {
        current.severity = severity
      }
      if (lastSeen && (!current.lastSeen || lastSeen > current.lastSeen)) {
        current.lastSeen = lastSeen
      }
      return
    }
    counts.set(key, { type, value, count: 1, severity, lastSeen })
  }

  alerts.forEach((alert) => {
    addEntity('agent', alert.agentName, alert.severity, alert.timestamp)
    addEntity('ip', alert.sourceIp, alert.severity, alert.timestamp)
    addEntity('destination', alert.destinationIp, alert.severity, alert.timestamp)
    addEntity('rule', alert.ruleId, alert.severity, alert.timestamp)
    ;(alert.mitreTechniques ?? []).forEach((value) => addEntity('mitre', value, alert.severity, alert.timestamp))
  })

  const identity = asObject(investigateRaw?.identity)
  ;(identity.ips ? asArray(identity.ips) : []).forEach((entry) => addEntity('ip', asString(asObject(entry).value)))
  ;(identity.macs ? asArray(identity.macs) : []).forEach((entry) => addEntity('mac', asString(asObject(entry).value)))
  ;(identity.hostnames ? asArray(identity.hostnames) : []).forEach((entry) => addEntity('hostname', asString(asObject(entry).value)))
  ;(identity.users ? asArray(identity.users) : []).forEach((entry) => addEntity('user', asString(asObject(entry).value)))
  ;(identity.agents ? asArray(identity.agents) : []).forEach((entry) => addEntity('agent', asString(asObject(entry).value)))

  return Array.from(counts.values()).sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count
    return (right.lastSeen ?? '').localeCompare(left.lastSeen ?? '')
  })
}

function mapThreatIntelFeed(source: string, rawFeed: unknown, overall: BackendThreatIntelResponse): ThreatIntelResult {
  const feed = asObject(rawFeed)
  const available = feed.available
  const isPrivate = overall.is_private === true
  if (isPrivate) {
    return { source, status: 'private', verdict: 'private-space', raw: rawFeed }
  }
  if (available === false && asString(feed.error) === 'no_key') {
    return { source, status: 'not_configured', raw: rawFeed }
  }
  if (available === false) {
    return { source, status: 'error', verdict: asString(feed.error), raw: rawFeed }
  }

  switch (source) {
    case 'abuseipdb':
      return {
        source,
        status: 'available',
        score: asNumber(feed.abuseConfidenceScore),
        verdict: asNumber(feed.abuseConfidenceScore) && (asNumber(feed.abuseConfidenceScore) ?? 0) >= 30 ? 'suspicious' : 'clean',
        country: asString(feed.countryName) ?? asString(feed.countryCode),
        organization: asString(feed.isp),
        tags: asStringArray(feed.hostnames),
        lastSeen: asString(feed.lastReportedAt),
        raw: rawFeed,
      }
    case 'otx':
      return {
        source,
        status: 'available',
        score: Math.min(100, (asNumber(feed.pulse_count) ?? 0) * 10),
        verdict: (asNumber(feed.pulse_count) ?? 0) > 0 ? 'matches-pulses' : 'no-pulses',
        country: asString(feed.country_name) ?? asString(feed.country_code),
        asn: asString(feed.asn),
        tags: unique([
          ...asStringArray(feed.validation),
          ...asArray(feed.pulse_refs).flatMap((entry) => asStringArray(asObject(entry).tags)),
        ]),
        references: asArray(feed.pulse_refs).map((entry) => asString(asObject(entry).name)).filter((entry): entry is string => Boolean(entry)),
        raw: rawFeed,
      }
    case 'shodan':
      return {
        source,
        status: 'available',
        verdict: asArray(feed.ports).length > 0 ? 'exposed-services' : 'no-open-ports',
        country: asString(feed.country_name) ?? asString(feed.country_code),
        asn: asString(feed.asn),
        organization: asString(feed.org) ?? asString(feed.isp),
        tags: unique([
          ...asStringArray(feed.tags),
          ...asStringArray(feed.vulns),
          ...asArray(feed.ports).map((entry) => asString(entry)).filter((entry): entry is string => Boolean(entry)),
        ]),
        lastSeen: asString(feed.last_update),
        raw: rawFeed,
      }
    case 'virustotal':
      return {
        source,
        status: feed.found === false ? 'not_found' : 'available',
        score: asNumber(feed.total) ? Math.round(((asNumber(feed.malicious) ?? 0) / Math.max(asNumber(feed.total) ?? 1, 1)) * 100) : undefined,
        verdict: (asNumber(feed.malicious) ?? 0) > 0 ? 'malicious-detections' : 'clean',
        country: asString(feed.country),
        asn: asString(feed.asn),
        organization: asString(feed.as_owner),
        tags: asStringArray(feed.tags),
        references: asArray(feed.malicious_engines).map((entry) => {
          const item = asObject(entry)
          return [asString(item.engine), asString(item.result)].filter(Boolean).join(': ')
        }).filter(Boolean),
        lastSeen: asString(feed.last_analysis_date),
        raw: rawFeed,
      }
    default:
      return {
        source,
        status: 'available',
        raw: rawFeed,
      }
  }
}

function normalizeThreatIntel(raw: BackendThreatIntelResponse | null): ThreatIntelResult[] | undefined {
  if (!raw) return undefined
  const feeds = asObject(raw.feeds)
  const entries = Object.entries(feeds)
  if (entries.length === 0 && raw.is_private !== true) {
    return undefined
  }
  if (raw.is_private === true) {
    return [{ source: 'internal', status: 'private', verdict: 'private-space', raw }]
  }
  return entries.map(([source, feed]) => mapThreatIntelFeed(source, feed, raw))
}

function normalizeComplianceSummary(
  complianceAlerts: BackendComplianceItemsResponse | null,
  sca: BackendComplianceItemsResponse | null,
  vulnerabilities: BackendComplianceItemsResponse | null,
  evidence: BackendComplianceItemsResponse | null,
): InvestigationComplianceSummary | undefined {
  const frameworkCounts = new Map<string, number>()

  asArray(complianceAlerts?.items).forEach((item) => {
    const compliance = asObject(asObject(item).compliance)
    Object.entries(compliance).forEach(([framework, controls]) => {
      frameworkCounts.set(framework.toUpperCase(), (frameworkCounts.get(framework.toUpperCase()) ?? 0) + asArray(controls).length)
    })
  })

  asArray(sca?.checks).forEach((item) => {
    asStringArray(asObject(item).frameworks).forEach((framework) => {
      frameworkCounts.set(framework.toUpperCase(), (frameworkCounts.get(framework.toUpperCase()) ?? 0) + 1)
    })
  })

  const frameworks = Array.from(frameworkCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => ({ name, count }))

  const failedScaChecks = asArray(sca?.checks).filter((item) => asString(asObject(item).status) === 'failed').length
  const openVulnerabilities = asArray(vulnerabilities?.items).length
  const evidenceItems = asArray(evidence?.items).length

  if (frameworks.length === 0 && failedScaChecks === 0 && openVulnerabilities === 0 && evidenceItems === 0) {
    return undefined
  }

  return {
    frameworks,
    evidenceItems,
    failedScaChecks,
    openVulnerabilities,
  }
}

function deriveProfile(
  query: string,
  type: InvestigationQueryType,
  alerts: InvestigationAlert[],
  investigateRaw: BackendInvestigateResponse | null,
  hostContext?: HostContext,
): EntityProfile {
  const identity = asObject(investigateRaw?.identity)
  const topAlert = alerts[0]
  const riskScore =
    asNumber(identity.risk_score) ??
    (alerts.length > 0
      ? Math.min(
          10,
          Number(
            (
              alerts.reduce((sum, alert) => sum + alert.ruleLevel, 0) /
              Math.max(alerts.length, 1) /
              1.6
            ).toFixed(1),
          ),
        )
      : undefined)

  return {
    query,
    type,
    displayName: query,
    ipAddress: asString(identity.ip) ?? topAlert?.sourceIp ?? topAlert?.destinationIp ?? hostContext?.ipAddress,
    hostname: asString(identity.hostname),
    agentId: hostContext?.agentId,
    agentName: asString(identity.agent) ?? hostContext?.agentName ?? topAlert?.agentName,
    agentStatus: asString(identity.status) ?? hostContext?.agentStatus,
    os: hostContext?.os,
    user: asString(identity.user),
    macAddress: asString(identity.mac),
    firstSeen: asString(identity.first_seen) ?? (alerts.length > 0 ? alerts[alerts.length - 1]?.timestamp : undefined),
    lastSeen: asString(identity.last_seen) ?? topAlert?.timestamp ?? hostContext?.lastSeen,
    groups: hostContext?.groups,
    labels: unique([
      ...(topAlert?.mitreTactics ?? []),
      ...(topAlert?.mitreTechniques ?? []),
      ...(hostContext?.sourceStatus ? [hostContext.sourceStatus] : []),
    ]),
    riskScore,
    riskLevel: formatRiskLevel(riskScore),
  }
}

function buildHostContext(
  agentRecord: unknown,
  vulnerabilities: BackendComplianceItemsResponse | null,
  sca: BackendComplianceItemsResponse | null,
  complianceAlerts: BackendComplianceItemsResponse | null,
  assetsDetail: BackendAssetsDetailResponse | null,
): HostContext | undefined {
  const agent = asObject(agentRecord)
  const agentId = asString(agent.agentId)
  const groups = asString(agent.group)
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const vulnerabilityItems = asArray(vulnerabilities?.items)
  const criticalCves = vulnerabilityItems.filter((item) => asString(asObject(item).severity) === 'critical').length
  const highCves = vulnerabilityItems.filter((item) => asString(asObject(item).severity) === 'high').length
  const failedScaChecks = asArray(sca?.checks).filter((item) => asString(asObject(item).status) === 'failed').length
  const complianceIssues = asArray(complianceAlerts?.items).length

  const device = asObject(assetsDetail?.device)
  const timeline = asArray(assetsDetail?.timeline)
  const recentAlerts = asArray(assetsDetail?.recent_alerts)

  if (!agentId && Object.keys(device).length === 0 && vulnerabilityItems.length === 0 && failedScaChecks === 0 && complianceIssues === 0) {
    return undefined
  }

  return {
    vulnerabilitiesCount: vulnerabilityItems.length,
    criticalCves,
    highCves,
    scaFailed: failedScaChecks,
    complianceIssues,
    os: asString(agent.os),
    agentId,
    agentName: asString(agent.name),
    agentStatus: asString(agent.status),
    ipAddress: asString(agent.ip) ?? asString(device.ip),
    groups,
    lastSeen: asString(agent.lastSeen) ?? asString(device.last_seen),
    sourceStatus: asString(asObject(vulnerabilities?.meta).sourceStatus) ?? asString(asObject(sca?.meta).sourceStatus),
    packages: vulnerabilityItems
      .slice(0, 12)
      .map((item) => ({
        name: asString(asObject(item).packageName) ?? '-',
        version: asString(asObject(item).installedVersion),
      })),
    openPorts: recentAlerts
      .map((item): HostContextPort | null => {
        const event = asObject(item)
        const port = asNumber(event.dstport) ?? asNumber(event.srcport)
        return port
          ? {
              port,
              protocol: asString(event.protocol),
              state: 'observed',
              process: asString(event.source),
          }
          : null
      })
      .filter((item): item is HostContextPort => item !== null)
      .slice(0, 12),
    processes: timeline.length > 0
      ? []
      : undefined,
  }
}

function buildInvestigationSummary(profile: EntityProfile, alerts: InvestigationAlert[], relatedEntities: RelatedEntity[]) {
  const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical').length
  const highAlerts = alerts.filter((alert) => alert.severity === 'high').length
  const relatedAgents = relatedEntities.filter((entity) => entity.type === 'agent').length
  const relatedRules = relatedEntities.filter((entity) => entity.type === 'rule').length
  return {
    overview:
      alerts.length > 0
        ? `${profile.displayName} มีเหตุการณ์ที่เกี่ยวข้อง ${alerts.length.toLocaleString()} รายการในช่วงเวลาที่เลือก`
        : `ไม่พบเหตุการณ์ที่เกี่ยวข้องกับ ${profile.displayName} ในช่วงเวลาที่เลือก`,
    totalAlerts: alerts.length,
    criticalAlerts,
    highAlerts,
    relatedAgents,
    relatedRules,
  }
}

async function fetchInvestigateSummary(query: string, type: InvestigationQueryType, range: InvestigationRange) {
  if (!shouldUseInvestigateEndpoint(type)) {
    return null
  }

  const response = await api.get<BackendInvestigateResponse>('/investigate', {
    params: {
      q: query,
      type: toBackendInvestigateType(type),
      time_range: range,
      size: 250,
    },
  })

  return response.data
}

async function fetchThreatIntel(query: string, type: InvestigationQueryType) {
  if (!shouldUseThreatIntel(type)) {
    return null
  }

  const response = await api.get<BackendThreatIntelResponse>('/ioc/search', {
    params: { q: query },
  })
  return response.data
}

async function fetchAssetsDetailIfApplicable(query: string, type: InvestigationQueryType, range: InvestigationRange) {
  if (type !== 'ip' && type !== 'mac') {
    return null
  }

  try {
    const response = await api.get<BackendAssetsDetailResponse>(`/assets/devices/${encodeURIComponent(query)}`, {
      params: { time_range: range },
    })
    return response.data
  } catch {
    return null
  }
}

async function fetchMatchingAgent(
  query: string,
  type: InvestigationQueryType,
  range: InvestigationRange,
  hints: Array<string | undefined>,
): Promise<unknown | null> {
  const searchTerms = unique(
    [query, ...hints]
      .map((value) => normalizeQuery(value ?? ''))
      .filter((value) => value.length > 0),
  ).slice(0, 3)

  if (searchTerms.length === 0 || (type === 'hash' || type === 'domain' || type === 'rule' || type === 'cve')) {
    return null
  }

  for (const search of searchTerms) {
    const response = await api.get<BackendComplianceItemsResponse>('/compliance/agents', {
      params: {
        time_range: range,
        search,
      },
    })
    const items = asArray(response.data.items)
    const exact = items.find((item) => {
      const entry = asObject(item)
      return [entry.agentId, entry.name, entry.ip]
        .map((value) => asString(value)?.toLowerCase())
        .includes(search.toLowerCase())
    })
    if (exact) {
      return exact
    }
    if (items.length > 0) {
      return items[0]
    }
  }

  return null
}

async function fetchAgentContext(agentId: string | undefined, range: InvestigationRange, search: string) {
  if (!agentId) {
    return {
      vulnerabilities: null,
      sca: null,
      complianceAlerts: null,
      evidence: null,
    }
  }

  const [vulnerabilities, sca, complianceAlerts, evidence] = await Promise.all([
    api.get<BackendComplianceItemsResponse>('/compliance/vulnerabilities', {
      params: { time_range: range, agent_id: agentId, limit: 100, search },
    }),
    api.get<BackendComplianceItemsResponse>('/compliance/sca', {
      params: { time_range: range, agent_id: agentId, limit: 100, search },
    }),
    api.get<BackendComplianceItemsResponse>('/compliance/alerts', {
      params: { time_range: range, agent_id: agentId, limit: 100, search },
    }),
    api.get<BackendComplianceItemsResponse>('/compliance/evidence', {
      params: { time_range: range, limit: 100, search },
    }),
  ])

  return {
    vulnerabilities: vulnerabilities.data,
    sca: sca.data,
    complianceAlerts: complianceAlerts.data,
    evidence: evidence.data,
  }
}

export async function getRelatedAlerts(
  query: string,
  filters: RelatedAlertsFilters = {},
): Promise<InvestigationAlert[]> {
  const normalizedQuery = normalizeQuery(query)
  const type = filters.type ?? detectInvestigationQueryType(normalizedQuery)
  const range = filters.range ?? '30d'

  const severityMin =
    filters.severity === 'critical'
      ? 15
      : filters.severity === 'high'
        ? 12
        : filters.severity === 'medium'
          ? 7
          : filters.severity === 'low'
            ? 1
            : 1

  const severityMax =
    filters.severity === 'high'
      ? 14
      : filters.severity === 'medium'
        ? 11
        : filters.severity === 'low'
          ? 6
          : undefined

  const params: Record<string, string | number | undefined> = {
    time_range: range,
    limit: filters.limit ?? 250,
    level: severityMin,
    level_max: severityMax,
  }

  if (type === 'rule') {
    params.rule_id = normalizedQuery
  } else {
    params.q = buildAlertQuery(normalizedQuery, type)
  }

  const response = await api.get<unknown[]>('/alerts', { params })
  const alerts = normalizeAlerts(asArray(response.data))
  return applyDirectionFilter(
    applySeverityFilter(alerts, filters.severity ?? 'all'),
    filters.direction ?? 'both',
    normalizedQuery,
  )
}

export async function getEntityProfile(query: string, type?: InvestigationQueryType): Promise<EntityProfile> {
  const request: InvestigationRequest = {
    query,
    type,
    range: '30d',
    direction: 'both',
    severity: 'all',
  }
  const result = await investigate(request)
  return result.profile
}

export async function investigate(request: InvestigationRequest): Promise<InvestigationResult> {
  const query = normalizeQuery(request.query)
  const type = request.type ?? detectInvestigationQueryType(query)
  const range = request.range
  const direction = request.direction ?? 'both'
  const severity = request.severity ?? 'all'

  const [alerts, investigateRaw, threatIntelRaw, assetsDetail] = await Promise.all([
    getRelatedAlerts(query, { type, range, severity, direction, limit: 250 }),
    fetchInvestigateSummary(query, type, range),
    fetchThreatIntel(query, type),
    fetchAssetsDetailIfApplicable(query, type, range),
  ])

  const matchingAgent = await fetchMatchingAgent(query, type, range, [
    asString(asObject(investigateRaw?.identity).agent),
    asString(asObject(investigateRaw?.identity).hostname),
    alerts.find((alert) => Boolean(alert.agentName))?.agentName,
  ])

  const agentId = asString(asObject(matchingAgent).agentId)
  const { vulnerabilities, sca, complianceAlerts, evidence } = await fetchAgentContext(agentId, range, query)

  const hostContext = buildHostContext(matchingAgent, vulnerabilities, sca, complianceAlerts, assetsDetail)
  const profile = deriveProfile(query, type, alerts, investigateRaw, hostContext)
  const relatedEntities = aggregateRelatedEntities(alerts, investigateRaw)
  const summary = buildInvestigationSummary(profile, alerts, relatedEntities)
  const mitreSummary = aggregateMitre(alerts)
  const complianceSummary = normalizeComplianceSummary(complianceAlerts, sca, vulnerabilities, evidence)
  const threatIntel = normalizeThreatIntel(threatIntelRaw)
  const timeline = alerts.slice(0, 100).map((alert) => normalizeTimelineEvent(alert)).sort((left, right) => left.timestamp.localeCompare(right.timestamp))

  return {
    profile,
    summary,
    timeline,
    alerts,
    threatIntel,
    hostContext,
    mitreSummary,
    complianceSummary,
    relatedEntities,
    raw: {
      request: { ...request, normalizedType: type },
      investigate: investigateRaw,
      threatIntel: threatIntelRaw,
      assets: assetsDetail,
      compliance: {
        agent: matchingAgent,
        vulnerabilities,
        sca,
        alerts: complianceAlerts,
        evidence,
      },
      alerts: alerts.map((alert) => alert.raw),
    },
  }
}

export async function exportInvestigationEvidence(
  query: string,
  range: InvestigationRange,
  type?: InvestigationQueryType,
): Promise<Blob> {
  const result = await investigate({
    query,
    type,
    range,
    direction: 'both',
    severity: 'all',
  })

  return new Blob([JSON.stringify(result, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
}

export const investigationApi = {
  detectInvestigationQueryType,
  investigate,
  getRelatedAlerts,
  getEntityProfile,
  exportInvestigationEvidence,
}

export default investigationApi
