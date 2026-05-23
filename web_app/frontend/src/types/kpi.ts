export type SLAStatus = 'compliant' | 'warning' | 'breached';

export interface KpiSummary {
  sla_compliance_percentage: number;
  sla_status: SLAStatus;
  total_incidents: number;
  resolved_incidents: number;
  mttr_hours: number;
  mttd_minutes: number;
  total_30d?: number;
  avg_daily?: number;
  critical_30d?: number;
  high_30d?: number;
}

export interface KpiTimelinePoint {
  timestamp: string;
  mttr: number;
  mttd: number;
  sla_compliance: number;
  incidents_count: number;
  date?: string;
  total?: number;
  critical?: number;
  high?: number;
  medium?: number;
}

export interface KpiStorageForecast {
  index_pattern: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  usage_percent?: number | null;
  estimated_daily_bytes?: number | null;
  estimated_daily_gb?: number | null;
  days_to_full?: number | null;
  full_date?: string | null;
  sample_days: number;
  sample_points: Array<{
    date: string;
    size_bytes: number;
  }>;
}

export interface KpiSourceMetric {
  source_name: string;
  incidents_count: number;
  mttr: number;
  mttd: number;
}

