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
  ruleId?: string
  agentName?: string
  sourceIp?: string
  destinationIp?: string
  mitre?: string[]
  raw?: unknown
}

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
