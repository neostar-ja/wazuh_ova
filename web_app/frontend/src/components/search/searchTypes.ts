/**
 * Log Search Page - Shared Types & Utilities
 * Centralized definitions for the entire search module
 */

export type Direction = 'both' | 'src' | 'dst'
export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | '90d'

export interface SearchFormState {
  query: string
  timeRange: TimeRange
  port: string
  srcport: string
  dstport: string
  srcip: string
  dstip: string
  proto: string
  direction: Direction
  action: string
  agent: string
  source_family: string
  group: string
  size: string
}

export interface Bucket {
  key: string
  count: number
}

export interface SearchResponse {
  total: number
  events: any[]
  matched_port?: number | null
  unique_srcip: number
  unique_dstip: number
  unique_agent: number
  inbound_count: number
  outbound_count: number
  source_families: Bucket[]
  by_log_source: Bucket[]
  by_action: Bucket[]
  top_proto: Bucket[]
  top_country: Bucket[]
  top_srcip: Bucket[]
  top_dstip: Bucket[]
  top_agent: Bucket[]
  timeline: Array<{ time: string; count: number }>
  parsed_query?: Record<string, any>
}

export interface PortListener {
  agent: string
  agent_id?: string
  local_ip: string
  local_port: number
  remote_ip?: string
  remote_port?: number
  protocol?: string
  state?: string
  process?: string
  pid?: number
  updated_at?: string
}

export interface PortListenersResponse {
  total: number
  listeners: PortListener[]
}

export interface SearchSuggestion {
  label: string
  query: string
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  filters: Partial<SearchFormState>
  timeRange: TimeRange
  createdAt: string
  description?: string
  pinned?: boolean
}

// Export defaults
export const DEFAULT_SEARCH_FORM: SearchFormState = {
  query: '',
  timeRange: '24h',
  port: '',
  srcport: '',
  dstport: '',
  srcip: '',
  dstip: '',
  proto: '',
  direction: 'both',
  action: '',
  agent: '',
  source_family: '',
  group: '',
  size: '200',
}

export const TIME_RANGES: TimeRange[] = ['1h', '6h', '24h', '7d', '30d', '90d']

export const PROTOCOL_OPTIONS = ['', 'tcp', 'udp', 'icmp']
export const ACTION_OPTIONS = ['', 'allow', 'accept', 'deny', 'drop', 'block']

export const DIRECTION_OPTIONS = [
  { value: 'both', label: 'ทั้งสองทิศทาง' },
  { value: 'dst', label: 'Inbound / ไปยังปลายทาง' },
  { value: 'src', label: 'Outbound / ออกจากต้นทาง' },
]

export const SOURCE_FAMILY_OPTIONS = [
  { value: '', label: 'ทุก source family' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'ids', label: 'IDS / Suricata' },
  { value: 'ssh', label: 'SSH' },
  { value: 'dns', label: 'DNS' },
  { value: 'dhcp', label: 'DHCP' },
  { value: 'nac', label: 'NAC / RADIUS' },
  { value: 'windows', label: 'Windows / Sysmon' },
  { value: 'linux', label: 'Linux / Syslog' },
  { value: 'web', label: 'Web / Reverse Proxy' },
]

export const QUICK_FILTERS = [
  { label: 'SSH Inbound', patch: { query: 'dstport:22', proto: 'tcp', direction: 'dst' as Direction } },
  { label: 'SSH All', patch: { query: 'port 22', proto: 'tcp' } },
  { label: 'RDP', patch: { query: 'port 3389', proto: 'tcp' } },
  { label: 'SMB', patch: { query: 'port 445', proto: 'tcp' } },
  { label: 'DNS', patch: { query: 'port 53' } },
  { label: 'Denied Traffic', patch: { query: '', action: 'deny' } },
  { label: 'Firewall Logs', patch: { query: '', source_family: 'firewall' } },
  { label: 'IDS / Suricata', patch: { query: '', source_family: 'ids' } },
]

// Source family metadata
import LanRoundedIcon from '@mui/icons-material/LanRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import HubRoundedIcon from '@mui/icons-material/HubRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded'

export const SOURCE_FAMILY_META: Record<string, { label: string; color: string; icon: any }> = {
  firewall: { label: 'Firewall', color: '#F97316', icon: ShieldRoundedIcon },
  ids: { label: 'IDS / Suricata', color: '#EF4444', icon: RouterRoundedIcon },
  ssh: { label: 'SSH', color: '#06B6D4', icon: LanRoundedIcon },
  dns: { label: 'DNS', color: '#8B5CF6', icon: DnsRoundedIcon },
  dhcp: { label: 'DHCP', color: '#0EA5E9', icon: PublicRoundedIcon },
  nac: { label: 'NAC / RADIUS', color: '#22C55E', icon: HubRoundedIcon },
  windows: { label: 'Windows / Sysmon', color: '#EAB308', icon: StorageRoundedIcon },
  linux: { label: 'Linux / Syslog', color: '#14B8A6', icon: Inventory2RoundedIcon },
  web: { label: 'Web / Proxy', color: '#EC4899', icon: TravelExploreRoundedIcon },
}

// Utility functions

export function safeNumber(value?: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n
}

export function hasSearchCriteria(form: SearchFormState): boolean {
  return Boolean(
    form.query.trim() ||
    form.port ||
    form.srcport ||
    form.dstport ||
    form.srcip ||
    form.dstip ||
    form.proto ||
    form.action ||
    form.agent ||
    form.source_family ||
    form.group
  )
}

export function buildRequestParams(form: SearchFormState): Record<string, any> {
  return {
    q: form.query.trim() || undefined,
    port: safeNumber(form.port),
    srcport: safeNumber(form.srcport),
    dstport: safeNumber(form.dstport),
    srcip: form.srcip.trim() || undefined,
    dstip: form.dstip.trim() || undefined,
    proto: form.proto || undefined,
    direction: form.direction,
    action: form.action || undefined,
    agent: form.agent.trim() || undefined,
    source_family: form.source_family || undefined,
    group: form.group.trim() || undefined,
    time_range: form.timeRange,
    size: safeNumber(form.size) ?? 200,
  }
}

export function serializeParams(form: SearchFormState): URLSearchParams {
  const next = new URLSearchParams()
  if (form.query.trim()) next.set('q', form.query.trim())
  if (form.timeRange) next.set('range', form.timeRange)
  if (form.port) next.set('port', form.port)
  if (form.srcport) next.set('srcport', form.srcport)
  if (form.dstport) next.set('dstport', form.dstport)
  if (form.srcip.trim()) next.set('srcip', form.srcip.trim())
  if (form.dstip.trim()) next.set('dstip', form.dstip.trim())
  if (form.proto) next.set('proto', form.proto)
  if (form.direction !== 'both') next.set('direction', form.direction)
  if (form.action) next.set('action', form.action)
  if (form.agent.trim()) next.set('agent', form.agent.trim())
  if (form.source_family) next.set('source_family', form.source_family)
  if (form.group.trim()) next.set('group', form.group.trim())
  if (form.size && form.size !== '200') next.set('size', form.size)
  return next
}

export function readFormFromParams(searchParams: URLSearchParams): SearchFormState {
  return {
    query: searchParams.get('q') ?? '',
    timeRange: (searchParams.get('range') as TimeRange) || '24h',
    port: searchParams.get('port') ?? '',
    srcport: searchParams.get('srcport') ?? '',
    dstport: searchParams.get('dstport') ?? '',
    srcip: searchParams.get('srcip') ?? '',
    dstip: searchParams.get('dstip') ?? '',
    proto: searchParams.get('proto') ?? '',
    direction: (searchParams.get('direction') as Direction) || 'both',
    action: searchParams.get('action') ?? '',
    agent: searchParams.get('agent') ?? '',
    source_family: searchParams.get('source_family') ?? '',
    group: searchParams.get('group') ?? '',
    size: searchParams.get('size') ?? '200',
  }
}

export function makeActiveChips(form: SearchFormState): Array<{ key: keyof SearchFormState; label: string }> {
  const chips: Array<{ key: keyof SearchFormState; label: string }> = []
  if (form.query.trim()) chips.push({ key: 'query', label: `Query: ${form.query.trim()}` })
  if (form.port) chips.push({ key: 'port', label: `Port = ${form.port}` })
  if (form.srcport) chips.push({ key: 'srcport', label: `Src Port = ${form.srcport}` })
  if (form.dstport) chips.push({ key: 'dstport', label: `Dst Port = ${form.dstport}` })
  if (form.srcip.trim()) chips.push({ key: 'srcip', label: `Src IP = ${form.srcip.trim()}` })
  if (form.dstip.trim()) chips.push({ key: 'dstip', label: `Dst IP = ${form.dstip.trim()}` })
  if (form.proto) chips.push({ key: 'proto', label: `Proto = ${form.proto.toUpperCase()}` })
  if (form.direction !== 'both') chips.push({ key: 'direction', label: `Direction = ${form.direction}` })
  if (form.action) chips.push({ key: 'action', label: `Action = ${form.action.toUpperCase()}` })
  if (form.agent.trim()) chips.push({ key: 'agent', label: `Agent = ${form.agent.trim()}` })
  if (form.source_family) chips.push({ key: 'source_family', label: `Source = ${familyLabel(form.source_family)}` })
  if (form.group.trim()) chips.push({ key: 'group', label: `Group = ${form.group.trim()}` })
  return chips
}

export function familyLabel(family: string): string {
  return SOURCE_FAMILY_META[family]?.label ?? family
}

export function familyColor(family: string): string {
  return SOURCE_FAMILY_META[family]?.color ?? '#64748B'
}

export function normalizeGroups(groups: unknown): string[] {
  if (Array.isArray(groups)) return groups.map(String)
  if (typeof groups === 'string') return [groups]
  return []
}

export function deriveSourceFamily(event: any): string {
  const groups = normalizeGroups(event?.rule?.groups)
  const decoder = String(event?.decoder?.name ?? '').toLowerCase()
  const program = String(event?.predecoder?.program_name ?? '').toLowerCase()
  const joined = `${groups.join(' ')} ${decoder} ${program}`.toLowerCase()

  if (joined.includes('firewall') || joined.includes('forti') || joined.includes('pfsense') || joined.includes('iptables')) return 'firewall'
  if (joined.includes('suricata') || joined.includes('snort') || joined.includes(' ids')) return 'ids'
  if (joined.includes('ssh')) return 'ssh'
  if (joined.includes('dns') || joined.includes('named') || joined.includes('bind')) return 'dns'
  if (joined.includes('dhcp')) return 'dhcp'
  if (joined.includes('nac') || joined.includes('radius')) return 'nac'
  if (joined.includes('sysmon') || joined.includes('windows')) return 'windows'
  if (joined.includes('linux') || joined.includes('syslog')) return 'linux'
  if (joined.includes('apache') || joined.includes('nginx') || joined.includes('web')) return 'web'
  return 'unknown'
}

export function deriveDirection(event: any, matchedPort?: number | null): string {
  const data = event?.data ?? {}
  const srcPort = String(data.srcport ?? '')
  const dstPort = String(data.dstport ?? '')
  const rawDirection = String(data.direction ?? '').toLowerCase()
  if (matchedPort != null) {
    if (dstPort === String(matchedPort)) return 'inbound'
    if (srcPort === String(matchedPort)) return 'outbound'
  }
  if (rawDirection.includes('in')) return 'inbound'
  if (rawDirection.includes('out')) return 'outbound'
  return 'lateral'
}

export function getBucketMax(items: Bucket[]): number {
  return items[0]?.count ?? 1
}

// Some log sources (e.g. FortiGate WUH) store data.proto as the raw IANA
// protocol number instead of its name — show a friendly label either way.
export const PROTO_LABELS: Record<string, string> = {
  '1': 'ICMP',
  '6': 'TCP',
  '17': 'UDP',
  '47': 'GRE',
  '58': 'ICMPv6',
}

export function protoLabel(value?: string | number | null): string {
  if (value == null || value === '') return ''
  const key = String(value).toLowerCase()
  return PROTO_LABELS[key] ?? key.toUpperCase()
}
