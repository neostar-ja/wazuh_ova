export type SeverityName = 'critical' | 'high' | 'medium' | 'low' | 'info';

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
}

export interface AlertStats {
  total: number;
  by_level: Record<number, number>;
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
}
