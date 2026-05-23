// ─── Timeline Data ────────────────────────────────────────────────────────────
export interface TimelinePoint {
  time?: string;
  timestamp?: string;
  count?: number;
  total?: number;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

// ─── Severity Metrics ─────────────────────────────────────────────────────────
export interface SeverityMetric {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface SeverityTrend {
  change: number; // percentage change
  direction: 'up' | 'down' | 'stable';
}

// ─── Count-based Items ────────────────────────────────────────────────────────
export interface CountByNameItem {
  name: string;
  count: number;
  percentage?: number;
}

export interface CountryItem extends CountByNameItem {
  code?: string;
}

export interface MitreTacticItem extends CountByNameItem {
  // MITRE tactic name like 'initial-access', 'execution', etc.
}

export interface SourceItem extends CountByNameItem {
  source?: string;
}

export interface RuleItem extends CountByNameItem {
  rule_id?: string;
}

export interface AgentItem extends CountByNameItem {
  agent_id?: string;
  status?: 'active' | 'disconnected' | 'never_connected';
}

export interface IPAddressItem extends CountByNameItem {
  ip?: string;
  country?: string;
}

// ─── Alert & Event Data ───────────────────────────────────────────────────────
export interface RecentAlert {
  '@timestamp'?: string;
  timestamp?: string;
  'rule.id'?: string;
  'rule.level'?: number | string;
  'rule.description'?: string;
  'rule.groups'?: string[];
  'rule.mitre'?: string[];
  'data.srcip'?: string;
  'agent.id'?: string;
  'agent.name'?: string;
  'data.win.eventdata.commandLine'?: string;
  risk_score?: number;
  status?: string;
  rule?: {
    id?: string;
    level?: number;
    description?: string;
    groups?: string[];
    mitre?: string[];
  };
  data?: {
    srcip?: string;
  };
  agent?: {
    id?: string;
    name?: string;
  };
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  // Summary metrics
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  total?: number;
  eps?: number; // events per second
  
  // Timeline data
  timeline?: TimelinePoint[];
  
  // Top items by category
  by_country?: CountryItem[];
  by_source?: SourceItem[];
  by_rule?: RuleItem[];
  by_mitre?: MitreTacticItem[];
  by_srcip?: IPAddressItem[];
  by_agent?: AgentItem[];
  
  // Legacy properties for backward compatibility
  totalAlerts?: number;
  criticalAlerts?: number;
  activeAgents?: number;
  disconnectedAgents?: number;
  kpis?: {
    sla_compliance?: number;
    avg_resolution_time?: number;
  };
  topSources?: CountByNameItem[];
  severityDistribution?: {
    name: string;
    value: number;
    color?: string;
  }[];
}

// ─── Cluster & Infrastructure ─────────────────────────────────────────────────
export interface ClusterNode {
  name?: string;
  node?: string;
  ip?: string;
  type?: 'master' | 'worker';
  role?: 'master' | 'worker';
  status?: 'active' | 'disconnected' | 'unknown';
  cpu?: number;
  ram?: number;
  disk?: number;
}

export interface ClusterData {
  data?: {
    affected_items?: ClusterNode[];
  };
  affected_items?: ClusterNode[];
  error?: boolean | string;
  node?: string;
  status?: string;
}

export interface ClusterHealth {
  status?: 'green' | 'yellow' | 'red';
  nodesCount?: number;
  activeNodes?: number;
  totalShards?: number;
  unassignedShards?: number;
  nodes?: ClusterNode[];
  // Legacy or error states
  data?: {
    affected_items?: ClusterNode[];
  };
  affected_items?: ClusterNode[];
  error?: boolean | string;
}

// ─── Agent Data ───────────────────────────────────────────────────────────────
export interface AgentSummary {
  total?: number;
  active?: number;
  disconnected?: number;
  never_connected?: number;
  by_os?: Array<{ name: string; count: number }>;
  error?: boolean;
}

// ─── Risk Assessment ──────────────────────────────────────────────────────────
export type RiskLevel = 'normal' | 'elevated' | 'critical';

export interface SecurityPosture {
  riskLevel: RiskLevel;
  criticalCount: number;
  highCount: number;
  topSourceIP?: IPAddressItem;
  topRule?: RuleItem;
  suggestedAction: string;
}
