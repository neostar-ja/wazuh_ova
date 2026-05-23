export type IOCType = 'ip' | 'domain' | 'hash' | 'url';

export interface ThreatIntelSource {
  name: string;
  category?: string;
  trust_level?: 'high' | 'medium' | 'low';
}

export interface ThreatIntelResult {
  source: string;
  matched: boolean;
  malicious: boolean;
  threat_name?: string;
  details?: Record<string, any>;
}

export interface IOCSearchResult {
  query: string;
  type: IOCType;
  is_known_malicious: boolean;
  risk_score: number;
  sources: ThreatIntelResult[];
  first_seen?: string;
  last_seen?: string;
}

export interface CustomIOC {
  id: string;
  value: string;
  type: IOCType;
  description: string;
  severity: 'high' | 'medium' | 'low';
  created_by?: string;
  created_at: string;
}
