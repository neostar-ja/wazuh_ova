export interface TimelinePoint {
  timestamp: string;
  count: number;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

export interface SourceDistribution {
  source: string;
  count: number;
  percentage?: number;
}

export interface DashboardStats {
  totalAlerts: number;
  criticalAlerts: number;
  activeAgents: number;
  disconnectedAgents: number;
  kpis?: {
    sla_compliance: number;
    avg_resolution_time: number;
  };
  timeline: TimelinePoint[];
  topSources: SourceDistribution[];
  severityDistribution: {
    name: string;
    value: number;
    color?: string;
  }[];
  // API properties used in DashboardPage
  eps?: number;
  by_country?: { name: string; count: number }[];
  by_source?: { name: string; count: number }[];
  by_rule?: { name: string; count: number }[];
  by_mitre?: { name: string; count: number }[];
  by_srcip?: { name: string; count: number }[];
  by_agent?: { name: string; count: number }[];
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

export interface ClusterNode {
  name: string;
  ip: string;
  role: 'master' | 'worker';
  status: 'active' | 'disconnected' | 'unknown';
  cpu?: number;
  ram?: number;
  disk?: number;
}

export interface ClusterHealth {
  status: 'green' | 'yellow' | 'red';
  nodesCount: number;
  activeNodes: number;
  totalShards?: number;
  unassignedShards?: number;
  nodes: ClusterNode[];
}
