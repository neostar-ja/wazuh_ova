import { useQuery } from '@tanstack/react-query'
import { complianceApi } from '../../services/api'

function buildKey(prefix: string, params: any) {
  return [prefix, JSON.stringify(params || {})]
}

export function useComplianceSummary(params: any) {
  return useQuery({
    queryKey: buildKey('compliance-summary', params),
    queryFn: () => complianceApi.summary(params).then(response => response.data),
    refetchInterval: 300000,
    staleTime: 60000,
  })
}

export function useComplianceFrameworks(params: any, enabled = true) {
  return useQuery({
    queryKey: buildKey('compliance-frameworks', params),
    queryFn: () => complianceApi.frameworks(params).then(response => response.data),
    enabled,
    staleTime: 60000,
  })
}

export function useComplianceAgents(params: any, enabled = true) {
  return useQuery({
    queryKey: buildKey('compliance-agents', params),
    queryFn: () => complianceApi.agents(params).then(response => response.data),
    enabled,
    staleTime: 60000,
  })
}

export function useComplianceSca(params: any, enabled = true) {
  return useQuery({
    queryKey: buildKey('compliance-sca', params),
    queryFn: () => complianceApi.sca(params).then(response => response.data),
    enabled,
    staleTime: 60000,
  })
}

export function useComplianceVulnerabilities(params: any, enabled = true) {
  return useQuery({
    queryKey: buildKey('compliance-vulnerabilities', params),
    queryFn: () => complianceApi.vulnerabilities(params).then(response => response.data),
    enabled,
    staleTime: 60000,
  })
}

export function useComplianceAlerts(params: any, enabled = true) {
  return useQuery({
    queryKey: buildKey('compliance-alerts', params),
    queryFn: () => complianceApi.alerts(params).then(response => response.data),
    enabled,
    staleTime: 30000,
  })
}

export function useComplianceEvidence(params: any, enabled = true) {
  return useQuery({
    queryKey: buildKey('compliance-evidence', params),
    queryFn: () => complianceApi.evidence(params).then(response => response.data),
    enabled,
    staleTime: 60000,
  })
}
