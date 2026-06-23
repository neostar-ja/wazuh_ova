import {
  AgentSummary, ClusterHealth, DashboardStats, RecommendedAction,
  RecommendedActionSeverity, RiskLevel, SecurityPosture, SeverityTrend,
} from '../../types/dashboard'
import { IntegrationHealth } from '../../services/soarApi'

const CRITICAL_THRESHOLD = 5

function getClusterNodes(cluster?: ClusterHealth): { status?: string }[] {
  const items = cluster?.data?.affected_items || cluster?.affected_items
  return Array.isArray(items) ? items : []
}

const SUGGESTED_ACTION: Record<RiskLevel, string> = {
  critical: 'ดำเนินการตรวจสอบและตอบสนองทันที เริ่มจาก Alert ระดับ Critical และ IP ที่พบบ่อยที่สุด',
  elevated: 'ตรวจสอบ Alert ระดับ Critical/High โดยเร็ว และพิจารณา Investigate IP ที่เกี่ยวข้อง',
  watch: 'เฝ้าติดตาม Alert ระดับ High และตรวจสอบแหล่งที่มาเป็นระยะ',
  normal: 'ระบบทำงานปกติ ตรวจสอบ Dashboard เป็นระยะตามรอบปฏิบัติงาน',
}

// ─── Security Posture ─────────────────────────────────────────────────────────
export function computePosture(
  stats: DashboardStats | undefined,
  threatStats: DashboardStats | undefined,
  agentData: AgentSummary | undefined,
  cluster: ClusterHealth | undefined,
  trend: SeverityTrend | null,
): SecurityPosture {
  const critical = threatStats?.critical ?? stats?.critical ?? 0
  const high = threatStats?.high ?? stats?.high ?? 0
  const disconnected = agentData?.disconnected ?? 0
  const topSourceIP = threatStats?.by_srcip?.[0] ?? stats?.by_srcip?.[0]
  const topRule = threatStats?.by_rule?.[0] ?? stats?.by_rule?.[0]

  const nodes = getClusterNodes(cluster)
  const downNodes = nodes.filter(n => (n.status || 'active') !== 'active').length
  const clusterDegraded = nodes.length > 0 && downNodes > 0

  let riskLevel: RiskLevel
  if (critical >= CRITICAL_THRESHOLD || (clusterDegraded && downNodes >= 2)) {
    riskLevel = 'critical'
  } else if (critical > 0 || (trend?.direction === 'up' && high >= CRITICAL_THRESHOLD)) {
    riskLevel = 'elevated'
  } else if (high > 0 || clusterDegraded) {
    riskLevel = 'watch'
  } else {
    riskLevel = 'normal'
  }

  const reasons: string[] = []
  if (critical > 0) reasons.push(`พบ Critical ${critical} รายการ`)
  if (high > 0) reasons.push(`พบ High ${high} รายการ`)
  if (topSourceIP) reasons.push(`IP ที่พบมากที่สุด: ${topSourceIP.name} (${topSourceIP.count} ครั้ง)`)
  if (disconnected > 0) reasons.push(`Agent ขาดการเชื่อมต่อ ${disconnected} เครื่อง`)
  if (clusterDegraded) reasons.push(`Wazuh Cluster มีโหนดผิดปกติ ${downNodes} โหนด`)
  if (trend && trend.direction === 'up') reasons.push(`แนวโน้มภัยคุกคามเพิ่มขึ้น ${trend.change}%`)
  if (reasons.length === 0) reasons.push('ไม่พบสิ่งผิดปกติในช่วงเวลานี้')

  return {
    riskLevel,
    criticalCount: critical,
    highCount: high,
    topSourceIP,
    topRule,
    reasons: reasons.slice(0, 5),
    disconnectedAgents: disconnected,
    clusterDegraded,
    suggestedAction: SUGGESTED_ACTION[riskLevel],
  }
}

// ─── Recommended Actions ──────────────────────────────────────────────────────
export function computeRecommendedActions(
  posture: SecurityPosture,
  integrations: IntegrationHealth[] | undefined,
): RecommendedAction[] {
  const actions: RecommendedAction[] = []

  if (posture.criticalCount > 0) {
    actions.push({
      id: 'critical-alerts',
      title: 'ตรวจสอบ Alerts ระดับ Critical',
      description: `พบ Critical ${posture.criticalCount} รายการที่ต้องตรวจสอบโดยเร่งด่วน`,
      severity: 'critical',
      icon: 'error',
      route: '/alerts?level=15',
    })
  }

  if (posture.topSourceIP) {
    actions.push({
      id: 'investigate-top-ip',
      title: `Investigate IP ${posture.topSourceIP.name}`,
      description: `IP นี้ก่อ Alert มากที่สุด ${posture.topSourceIP.count} ครั้ง — ตรวจสอบ context เพิ่มเติม`,
      severity: posture.criticalCount > 0 ? 'high' : 'medium',
      icon: 'investigate',
      route: `/investigate?q=${encodeURIComponent(posture.topSourceIP.name)}`,
    })
  }

  if ((posture.disconnectedAgents ?? 0) > 0) {
    actions.push({
      id: 'disconnected-agents',
      title: 'ตรวจสอบ Agent ที่ขาดการเชื่อมต่อ',
      description: `มี Agent ขาดการเชื่อมต่อ ${posture.disconnectedAgents} เครื่อง อาจทำให้ขาดการมองเห็น (visibility)`,
      severity: 'high',
      icon: 'devices',
      route: '/assets',
    })
  }

  if (posture.topRule) {
    actions.push({
      id: 'review-top-rule',
      title: 'ตรวจสอบ Rule ที่พบบ่อยที่สุด',
      description: posture.topRule.description || `Rule ${posture.topRule.name} พบ ${posture.topRule.count} ครั้ง`,
      severity: 'medium',
      icon: 'rule',
      route: `/alerts?rule_id=${encodeURIComponent(posture.topRule.name)}`,
    })
  }

  const shuffle = integrations?.find(i => i.id === 'shuffle')
  if (shuffle?.simulation_only) {
    actions.push({
      id: 'shuffle-simulation',
      title: 'ใช้ Simulate Block ก่อนดำเนินการจริง',
      description: 'Shuffle SOAR อยู่ในโหมด Simulation — ตรวจสอบ Playbook ก่อนเปิดใช้งานจริง',
      severity: 'info',
      icon: 'soar',
      route: '/soar',
    })
  }

  const notConfigured = (integrations || []).filter(
    i => (i.id === 'infoblox' || i.id === 'huawei_nac') && i.status === 'not_configured',
  )
  if (notConfigured.length > 0) {
    actions.push({
      id: 'connect-network-integrations',
      title: 'เชื่อมต่อ DNS/DHCP/NAC เพื่อเพิ่ม context',
      description: `${notConfigured.map(i => i.name).join(', ')} ยังไม่ได้เชื่อมต่อ — ข้อมูลเครือข่ายอาจไม่ครบถ้วน`,
      severity: 'info',
      icon: 'network',
      route: '/admin',
    })
  }

  const SEVERITY_ORDER: Record<RecommendedActionSeverity, number> = { critical: 0, high: 1, medium: 2, info: 3 }
  return actions.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]).slice(0, 5)
}
