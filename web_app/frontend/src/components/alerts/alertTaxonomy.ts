import { CATEGORY_COLOR, SEV_COLOR, BRAND } from '../ui/tokens'

export interface AlertGroupMeta {
  key: string
  label: string
  color: string
  priority: number
}

const GROUP_ALIAS_MAP: Record<string, AlertGroupMeta> = {
  fortigate:            { key: 'fortigate', label: 'FortiGate', color: CATEGORY_COLOR.fortigate, priority: 20 },
  fortigate_wuh:        { key: 'fortigate_wuh', label: 'FortiGate WUH', color: CATEGORY_COLOR.fortigate, priority: 90 },
  huawei:               { key: 'huawei', label: 'Huawei', color: CATEGORY_COLOR.huaweiUsg, priority: 20 },
  'huawei-usg':         { key: 'huawei_usg', label: 'Huawei USG/FW', color: CATEGORY_COLOR.huaweiUsg, priority: 95 },
  huawei_usg:           { key: 'huawei_usg', label: 'Huawei USG/FW', color: CATEGORY_COLOR.huaweiUsg, priority: 95 },
  'huawei-ac':          { key: 'huawei_ac', label: 'Huawei Agile Controller', color: CATEGORY_COLOR.huaweiAc, priority: 95 },
  huawei_ac:            { key: 'huawei_ac', label: 'Huawei Agile Controller', color: CATEGORY_COLOR.huaweiAc, priority: 95 },
  network_policy:       { key: 'network_policy', label: 'Network Policy', color: CATEGORY_COLOR.huaweiUsg, priority: 70 },
  firewall_drop:        { key: 'firewall_drop', label: 'Firewall Drop', color: SEV_COLOR.high, priority: 88 },
  access_denied:        { key: 'access_denied', label: 'Access Denied', color: SEV_COLOR.high, priority: 86 },
  policy_permit:        { key: 'policy_permit', label: 'Policy Permit', color: CATEGORY_COLOR.huaweiUsg, priority: 82 },
  application_control:  { key: 'application_control', label: 'Application Control', color: CATEGORY_COLOR.huaweiUsg, priority: 76 },
  quic:                 { key: 'quic', label: 'QUIC Traffic', color: CATEGORY_COLOR.huaweiUsg, priority: 76 },
  network_access:       { key: 'network_access', label: 'Network Access', color: CATEGORY_COLOR.huaweiAc, priority: 45 },
  wireless:             { key: 'wireless', label: 'Wireless', color: CATEGORY_COLOR.huaweiAc, priority: 42 },
  session:              { key: 'session', label: 'Session', color: CATEGORY_COLOR.huaweiAc, priority: 38 },
  user_online:          { key: 'user_online', label: 'User Online', color: CATEGORY_COLOR.huaweiAc, priority: 86 },
  user_offline:         { key: 'user_offline', label: 'User Offline', color: CATEGORY_COLOR.huaweiAc, priority: 84 },
  user_roaming:         { key: 'user_roaming', label: 'User Roaming', color: CATEGORY_COLOR.huaweiAc, priority: 84 },
  portal_logon:         { key: 'portal_logon', label: 'Portal Logon', color: CATEGORY_COLOR.huaweiAc, priority: 75 },
  portal_logoff:        { key: 'portal_logoff', label: 'Portal Logoff', color: CATEGORY_COLOR.huaweiAc, priority: 75 },
  portal_logon_failed:  { key: 'portal_logon_failed', label: 'Portal Logon Failed', color: SEV_COLOR.high, priority: 90 },
  mac_auth:             { key: 'mac_auth', label: 'MAC Authentication', color: CATEGORY_COLOR.huaweiAc, priority: 78 },
  authentication:       { key: 'authentication', label: 'Authentication', color: SEV_COLOR.medium, priority: 34 },
  authentication_failed:{ key: 'authentication_failed', label: 'Authentication Failed', color: SEV_COLOR.high, priority: 92 },
  authentication_failure:{ key: 'authentication_failed', label: 'Authentication Failed', color: SEV_COLOR.high, priority: 92 },
  authentication_success:{ key: 'authentication_success', label: 'Authentication Succeeded', color: SEV_COLOR.low, priority: 88 },
  credential_failure:   { key: 'credential_failure', label: 'Credential Failure', color: SEV_COLOR.high, priority: 93 },
  brute_force:          { key: 'brute_force', label: 'Brute Force', color: SEV_COLOR.critical, priority: 96 },
  mikrotik:             { key: 'mikrotik', label: 'MikroTik', color: CATEGORY_COLOR.mikrotik, priority: 88 },
  routeros:             { key: 'routeros', label: 'RouterOS', color: CATEGORY_COLOR.mikrotik, priority: 84 },
  infoblox:             { key: 'infoblox', label: 'Infoblox', color: CATEGORY_COLOR.infobloxDns, priority: 40 },
  infoblox_dns:         { key: 'infoblox_dns', label: 'Infoblox DNS', color: CATEGORY_COLOR.infobloxDns, priority: 88 },
  infoblox_dhcp:        { key: 'infoblox_dhcp', label: 'Infoblox DHCP', color: CATEGORY_COLOR.infobloxDhcp, priority: 88 },
  dns_query:            { key: 'dns_query', label: 'DNS Query', color: CATEGORY_COLOR.infobloxDns, priority: 82 },
  ids:                  { key: 'suricata', label: 'Suricata IDS', color: CATEGORY_COLOR.suricata, priority: 82 },
  suricata:             { key: 'suricata', label: 'Suricata IDS', color: CATEGORY_COLOR.suricata, priority: 90 },
  'linux/system':       { key: 'systemd', label: 'Linux/System', color: CATEGORY_COLOR.linuxSystem, priority: 84 },
  linux_system:         { key: 'systemd', label: 'Linux/System', color: CATEGORY_COLOR.linuxSystem, priority: 84 },
  systemd:              { key: 'systemd', label: 'Linux/System', color: CATEGORY_COLOR.linuxSystem, priority: 84 },
  sudo:                 { key: 'systemd', label: 'Linux/System', color: CATEGORY_COLOR.linuxSystem, priority: 82 },
  kernel:               { key: 'systemd', label: 'Linux/System', color: CATEGORY_COLOR.linuxSystem, priority: 82 },
  syslog:               { key: 'systemd', label: 'Linux/System', color: CATEGORY_COLOR.linuxSystem, priority: 80 },
  compliance:           { key: 'compliance', label: 'Compliance', color: CATEGORY_COLOR.compliance, priority: 82 },
  sca:                  { key: 'sca', label: 'SCA', color: CATEGORY_COLOR.compliance, priority: 84 },
  audit:                { key: 'audit', label: 'Audit', color: CATEGORY_COLOR.compliance, priority: 78 },
  policy_monitoring:    { key: 'policy_monitoring', label: 'Policy Monitoring', color: CATEGORY_COLOR.compliance, priority: 80 },
  rootcheck:            { key: 'rootcheck', label: 'Rootcheck', color: CATEGORY_COLOR.compliance, priority: 82 },
  vulnerability_detector:{ key: 'vulnerability_detector', label: 'Vulnerability Detector', color: CATEGORY_COLOR.compliance, priority: 84 },
  'vulnerability-detector': { key: 'vulnerability_detector', label: 'Vulnerability Detector', color: CATEGORY_COLOR.compliance, priority: 84 },
  malware:              { key: 'malware', label: 'Malware', color: SEV_COLOR.high, priority: 86 },
  windows:              { key: 'windows', label: 'Windows', color: CATEGORY_COLOR.windows, priority: 84 },
  syscheck:             { key: 'syscheck', label: 'FIM / Syscheck', color: CATEGORY_COLOR.linuxSystem, priority: 88 },
  fim:                  { key: 'syscheck', label: 'FIM / Syscheck', color: CATEGORY_COLOR.linuxSystem, priority: 88 },
  file_integrity_monitoring: { key: 'syscheck', label: 'FIM / Syscheck', color: CATEGORY_COLOR.linuxSystem, priority: 88 },
  firewall:             { key: 'firewall', label: 'Firewall', color: CATEGORY_COLOR.linuxSystem, priority: 72 },
  ossec:                { key: 'ossec', label: 'OSSEC', color: CATEGORY_COLOR.ossec, priority: 82 },
  wazuh:                { key: 'ossec', label: 'OSSEC', color: CATEGORY_COLOR.ossec, priority: 80 },
  threat_intel:         { key: 'threat_intel', label: 'Threat Intel', color: SEV_COLOR.critical, priority: 92 },
  threat_intelligence:  { key: 'threat_intel', label: 'Threat Intel', color: SEV_COLOR.critical, priority: 92 },
  threatintel:          { key: 'threat_intel', label: 'Threat Intel', color: SEV_COLOR.critical, priority: 92 },
  cdb_intel:            { key: 'cdb_intel', label: 'CDB Blocklist', color: SEV_COLOR.critical, priority: 90 },
  soc_blocklist:        { key: 'cdb_intel', label: 'CDB Blocklist', color: SEV_COLOR.critical, priority: 90 },
  web:                  { key: 'web', label: 'Web Attacks', color: SEV_COLOR.info, priority: 84 },
  pam:                  { key: 'pam', label: 'PAM Authentication', color: CATEGORY_COLOR.compliance, priority: 82 },
  sshd:                 { key: 'sshd', label: 'SSH Authentication', color: SEV_COLOR.medium, priority: 84 },
}

const GENERIC_GROUP_KEYS = new Set([
  'huawei',
  'fortigate',
  'session',
  'wireless',
  'network_access',
  'authentication',
  'infoblox',
  'ossec',
  'compliance',
])

function humanizeGroup(group: string): string {
  return group
    .replace(/^attack\./i, '')
    .replace(/^mitre[:._-]?/i, 'MITRE ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

export function resolveAlertGroup(group: string): AlertGroupMeta {
  const normalized = String(group || '').trim().toLowerCase()
  if (!normalized) {
    return { key: 'unknown', label: 'Unknown', color: BRAND.primaryLight, priority: 0 }
  }
  return GROUP_ALIAS_MAP[normalized] || {
    key: normalized,
    label: humanizeGroup(normalized),
    color: CATEGORY_COLOR.linuxSystem,
    priority: 10,
  }
}

export interface AlertGroupBucket extends AlertGroupMeta {
  count: number
  filterKey: string
}

export function summarizeAlertGroupBuckets(groups: Array<{ name: string; count: number }>, max: number = 14): AlertGroupBucket[] {
  const grouped = new Map<string, AlertGroupBucket>()

  for (const group of groups) {
    const rawKey = String(group?.name || '').trim()
    if (!rawKey) continue

    const meta = resolveAlertGroup(rawKey)
    const existing = grouped.get(meta.key)
    if (existing) {
      existing.count += Number(group?.count || 0)
      continue
    }

    grouped.set(meta.key, {
      ...meta,
      count: Number(group?.count || 0),
      filterKey: meta.key,
    })
  }

  return [...grouped.values()]
    .sort((a, b) => (b.count - a.count) || (b.priority - a.priority))
    .slice(0, max)
}

export function getVisibleAlertGroups(groups: string[], max: number = 3): AlertGroupMeta[] {
  const resolved = groups
    .map(resolveAlertGroup)
    .filter((meta, index, list) => list.findIndex((item) => item.key === meta.key) === index)
    .sort((a, b) => b.priority - a.priority)

  const hasSpecific = resolved.some((meta) => !GENERIC_GROUP_KEYS.has(meta.key))
  const filtered = hasSpecific
    ? resolved.filter((meta) => !GENERIC_GROUP_KEYS.has(meta.key))
    : resolved

  return filtered.slice(0, max)
}
