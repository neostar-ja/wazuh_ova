export type SeverityName = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'unknown';

export interface AgentInfo {
  id: string;
  name: string;
  ip?: string;
}

export interface MitreAttackInfo {
  id?: string[];
  tactic?: string[];
  technique?: string[];
}

export interface RuleInfo {
  id: string;
  level: number;
  description: string;
  groups?: string[];
  mitre?: MitreAttackInfo;
  firedtimes?: number;
  mail?: boolean;
  pci_dss?: string[];
  hipaa?: string[];
  nist_800_53?: string[];
  gdpr?: string[];
}

export interface AlertItem {
  id: string;
  timestamp: string;
  agent: AgentInfo;
  rule: RuleInfo;
  location?: string;
  full_log?: string;
  decoder?: {
    name: string;
  };
  data?: Record<string, any>;
  manager?: {
    name: string;
  };
  cluster?: {
    name: string;
    node: string;
  };
}

export interface AlertDetail extends AlertItem {
  [key: string]: any;
}

export interface AlertFilters {
  timeRange?: string;
  level?: number;
  agentId?: string;
  ruleId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  q?: string;
  severity?: AlertSeverity | 'all';
  sourceIp?: string;
  destinationIp?: string;
  decoder?: string;
  group?: string;
  framework?: 'pci_dss' | 'gdpr' | 'hipaa' | 'nist_800_53' | 'cis' | 'all';
  dateFrom?: string;
  dateTo?: string;
}

export interface AlertStats {
  total: number;
  by_level: Record<string, number>;
  by_severity: Record<SeverityName, number>;
  timeline: {
    timestamp: string;
    count: number;
    severity_breakdown?: Record<string, number>;
  }[];
  by_agent?: { name: string; count: number }[];
  by_mitre?: { name: string; count: number }[];
  by_srcip?: { name: string; count: number }[];
  by_source?: { name: string; count: number }[];
  by_group?: { name: string; count: number }[];
  by_rule?: { name: string; count: number }[];
  by_country?: { name: string; count: number }[];
  by_decoder?: { name: string; count: number }[];
}

export interface AlertFacets {
  sources: { key: string; label: string; count: number }[];
  groups: { name: string; count: number }[];
  agents: { name: string; count: number }[];
  countries: { name: string; count: number }[];
  decoders: { name: string; count: number }[];
  mitre: { name: string; count: number }[];
  srcips: { name: string; count: number }[];
  rules: { name: string; count: number }[];
}

export interface WazuhAlertItem {
  id: string;
  timestamp: string;
  ruleId?: string;
  ruleLevel: number;
  severity: AlertSeverity;
  description: string;
  agentId?: string;
  agentName?: string;
  agentIp?: string;
  managerName?: string;
  decoderName?: string;
  programName?: string;
  location?: string;
  sourceIp?: string;
  sourcePort?: string | number;
  destinationIp?: string;
  destinationPort?: string | number;
  protocol?: string;
  mitreTactics?: string[];
  mitreTechniques?: string[];
  groups?: string[];
  pciDss?: string[];
  gdpr?: string[];
  hipaa?: string[];
  nist80053?: string[];
  cis?: string[];
  fullLog?: string;
  countryName?: string;
  raw?: unknown;
}

export interface PaginatedAlertsResponse {
  items: WazuhAlertItem[];
  total: number;
  page: number;
  pageSize: number;
  stats?: AlertStats;
}
