export type InvestigationQueryType =
  | 'ip'
  | 'hostname'
  | 'agent'
  | 'user'
  | 'mac'
  | 'domain'
  | 'hash'
  | 'rule'
  | 'cve'
  | 'unknown'

export type InvestigationSearchMode = InvestigationQueryType | 'auto'

export type InvestigationRange = '1h' | '6h' | '24h' | '7d' | '30d' | '90d'

export type InvestigationDirection = 'source' | 'destination' | 'both'

export type InvestigationSeverity = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface InvestigationRequest {
  query: string
  type?: InvestigationQueryType
  range: InvestigationRange
  direction?: InvestigationDirection
  severity?: InvestigationSeverity
}

export interface EntityProfile {
  query: string
  type: InvestigationQueryType
  displayName: string
  ipAddress?: string
  hostname?: string
  agentId?: string
  agentName?: string
  agentStatus?: string
  os?: string
  user?: string
  macAddress?: string
  firstSeen?: string
  lastSeen?: string
  groups?: string[]
  labels?: string[]
  riskScore?: number
  riskLevel?: 'critical' | 'high' | 'medium' | 'low' | 'info'
}

export interface InvestigationAlert {
  id: string
  timestamp: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  ruleId: string
  ruleLevel: number
  description: string
  agentId?: string
  agentName?: string
  agentIp?: string
  sourceIp?: string
  destinationIp?: string
  sourcePort?: string
  destinationPort?: string
  decoder?: string
  location?: string
  mitreTactics?: string[]
  mitreTechniques?: string[]
  compliance?: string[]
  fullLog?: string
  raw?: unknown
}

export interface TimelineEvent {
  id: string
  timestamp: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  source?: TimelineEventSource
  ruleId?: string
  agentName?: string
  sourceIp?: string
  destinationIp?: string
  mitre?: string[]
  raw?: unknown
}

export type TimelineEventSource =
  | 'wazuh'
  | 'dns'
  | 'dhcp'
  | 'nac'
  | 'firewall'
  | 'iris'
  | 'shuffle'
  | 'ioc'

export interface ThreatIntelResult {
  source: string
  status: 'available' | 'not_configured' | 'not_found' | 'private' | 'error'
  score?: number
  verdict?: string
  country?: string
  asn?: string
  organization?: string
  tags?: string[]
  references?: string[]
  lastSeen?: string
  raw?: unknown
}

export interface HostContextPackage {
  name: string
  version?: string
}

export interface HostContextPort {
  port: number
  protocol?: string
  state?: string
  process?: string
}

export interface HostContextProcess {
  name: string
  pid?: number
  user?: string
}

export interface HostContext {
  vulnerabilitiesCount: number
  criticalCves: number
  highCves: number
  scaFailed: number
  complianceIssues: number
  os?: string
  packages?: HostContextPackage[]
  openPorts?: HostContextPort[]
  processes?: HostContextProcess[]
  agentId?: string
  agentName?: string
  agentStatus?: string
  ipAddress?: string
  groups?: string[]
  lastSeen?: string
  sourceStatus?: string
}

export interface RelatedEntity {
  type: InvestigationQueryType | 'country' | 'mitre' | 'source' | 'destination'
  value: string
  count: number
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info'
  lastSeen?: string
}

export interface InvestigationSummary {
  overview: string
  totalAlerts: number
  criticalAlerts: number
  highAlerts: number
  relatedAgents: number
  relatedRules: number
}

export interface InvestigationMitreSummary {
  tactics: { name: string; count: number }[]
  techniques: { name: string; count: number }[]
  totalTactics: number
  totalTechniques: number
}

export interface InvestigationComplianceSummary {
  frameworks: { name: string; count: number }[]
  evidenceItems: number
  failedScaChecks: number
  openVulnerabilities: number
}

export interface InvestigationResult {
  profile: EntityProfile
  summary: InvestigationSummary
  timeline: TimelineEvent[]
  alerts: InvestigationAlert[]
  threatIntel?: ThreatIntelResult[]
  hostContext?: HostContext
  mitreSummary?: InvestigationMitreSummary
  complianceSummary?: InvestigationComplianceSummary
  relatedEntities?: RelatedEntity[]
  raw?: unknown
}

// ─── Network Identity Schema ────────────────────────────────────────────────

export interface NetworkIdentity {
  'dns.question.name'?: string
  'dns.response_code'?: string
  'dhcp.lease_ip'?: string
  'client.ip'?: string
  'client.mac'?: string
  'client.hostname'?: string
  'user.name'?: string
  'network.vlan.id'?: string
  'network.device.name'?: string
  'network.interface.name'?: string
  'event.dataset'?: string
  'observer.vendor'?: string
  'observer.product'?: string
}

// ─── Data Source Health ─────────────────────────────────────────────────────

export type SourceStatusType = 'online' | 'configured' | 'not_configured' | 'no_data' | 'error'

export interface DataSource {
  id: string
  name: string
  vendor: string
  icon: string
  configured: boolean
  status: SourceStatusType
  label: string
  event_count_24h?: number
  event_count_7d?: number
}

export interface SourcesHealthResult {
  sources: DataSource[]
  total: number
  configured: number
  not_configured: number
  checked_at: string
}

export interface SourceCoverageItem {
  has_data: boolean
  count: number
  label: string
  first_seen?: string
  last_seen?: string
}

export interface SourceCoverageResult {
  query: string
  type: string
  range: string
  coverage: {
    wazuh: SourceCoverageItem
    infoblox_dns: SourceCoverageItem
    infoblox_dhcp: SourceCoverageItem
    huawei_nac: SourceCoverageItem
  }
}

// ─── DNS Events ─────────────────────────────────────────────────────────────

export interface DNSEvent {
  timestamp: string
  query_name?: string
  query_type?: string
  response_code?: string
  client_ip?: string
  action?: string
  policy?: string
  reason?: string
  category?: string
  rule_level?: number
  full_log?: string
}

export interface DNSResult {
  query: string
  range: string
  count: number
  events: unknown[]
  top_query_names: { name: string; count: number }[]
  response_codes: { code: string; count: number }[]
  rpz_blocks: {
    timestamp: string
    query_name?: string
    action: string
    policy?: string
    reason?: string
    rule_level?: number
  }[]
  categories: { name: string; count: number }[]
  has_malicious: boolean
}

// ─── DHCP Events ─────────────────────────────────────────────────────────────

export interface DHCPLease {
  timestamp: string
  action?: string
  ip?: string
  mac?: string
  hostname?: string
  lease_time?: string
  server?: string
  rule_level?: number
}

export interface DHCPResult {
  query: string
  range: string
  count: number
  leases: DHCPLease[]
  actions: { action: string; count: number }[]
  ip_history: { ip: string; count: number }[]
  mac_history: { mac: string; count: number }[]
  hostname_history: { hostname: string; count: number }[]
}

// ─── NAC / Huawei Events ─────────────────────────────────────────────────────

export interface NACSession {
  timestamp: string
  action?: string
  auth_result?: string
  auth_type?: string
  ip?: string
  mac?: string
  user?: string
  vlan?: string
  switch?: string
  ap?: string
  interface?: string
  policy?: string
  posture?: string
  rule_level?: number
}

export interface NACResult {
  query: string
  range: string
  count: number
  sessions: NACSession[]
  auth_results: { result: string; count: number }[]
  actions: { action: string; count: number }[]
  vlans: { vlan: string; count: number }[]
  switches: { switch: string; count: number }[]
  policies: { policy: string; count: number }[]
  posture_results: { result: string; count: number }[]
  auth_types: { type: string; count: number }[]
  quarantine_events: {
    timestamp: string
    action: string
    ip?: string
    mac?: string
    user?: string
    policy?: string
    reason?: string
    rule_level?: number
  }[]
  has_posture_fail: boolean
}

// ─── Risk Scoring ─────────────────────────────────────────────────────────────

export interface RiskFactor {
  key: string
  label: string
  description: string
  score: number
  max: number
  color: string
}

export interface RiskScoreResult {
  query: string
  entity_type: string
  score: number
  raw_score: number
  max_raw: number
  level: 'critical' | 'high' | 'medium' | 'low'
  factors: RiskFactor[]
  computed_at: string
}

// ─── Entity Graph ─────────────────────────────────────────────────────────────

export type EntityNodeType =
  | 'entity'  // central node
  | 'ip'
  | 'mac'
  | 'user'
  | 'agent'
  | 'vlan'
  | 'switch'
  | 'domain'
  | 'ioc'
  | 'alert'
  | 'case'

export interface EntityNode {
  id: string
  type: EntityNodeType
  label: string
  count?: number
  severity?: string
  isCenter?: boolean
}

export interface EntityEdge {
  source: string
  target: string
  label?: string
  count?: number
}

export interface EntityGraph {
  nodes: EntityNode[]
  edges: EntityEdge[]
}

// ─── SOAR Actions ─────────────────────────────────────────────────────────────

export type SOARActionType =
  | 'create_iris_case'
  | 'attach_evidence'
  | 'add_ioc'
  | 'run_playbook'
  | 'escalate'
  | 'block_ip'

export interface SOARAction {
  type: SOARActionType
  label: string
  description: string
  icon: string
  requires?: string[]
  available: boolean
}

// ─── Enrichment Cache ─────────────────────────────────────────────────────────

export interface EnrichmentCacheEntry {
  ioc_value: string
  ioc_type: string
  abuseipdb_score?: number
  otx_pulse_count?: number
  virustotal_detections?: number
  misp_matched: boolean
  source_statuses: Record<string, 'ok' | 'error' | 'not_configured'>
  cached: boolean
  cached_at: string
  expires_at: string
}
