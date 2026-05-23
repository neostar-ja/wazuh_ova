export type ComplianceFramework = 'pci-dss' | 'hipaa' | 'nist-800-53' | 'cis';

export type ComplianceStatus = 'pass' | 'fail' | 'warning' | 'unknown';

export interface ComplianceSummary {
  score: number;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warning_checks: number;
  framework_scores?: Record<ComplianceFramework, number>;
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  framework: ComplianceFramework;
  status: ComplianceStatus;
  score: number;
  controls_count?: number;
  passed_controls?: number;
}

export interface ScaCheck {
  id: string;
  title: string;
  description?: string;
  rationale?: string;
  remediation?: string;
  status: 'passed' | 'failed' | 'unknown';
  file?: string;
  directory?: string;
  references?: string;
  framework_mappings?: Record<string, string>;
}

export interface VulnerabilityItem {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: string;
  package_name: string;
  package_version: string;
  cve_id?: string;
  cvss_score?: number;
  description?: string;
  published_date?: string;
  remediation?: string;
}

export interface RemediationItem {
  id: string;
  title: string;
  description: string;
  target_device: string;
  steps: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
}
