import { BRAND, SEV_COLOR } from '../ui/tokens'

export const FRAMEWORK_LABELS: Record<string, string> = {
  cis: 'CIS Benchmark',
  pci_dss: 'PCI-DSS',
  gdpr: 'GDPR',
  hipaa: 'HIPAA',
  nist: 'NIST 800-53',
  tsc: 'TSC',
  iso27001: 'ISO 27001',
  mitre: 'MITRE ATT&CK',
}

export const FRAMEWORK_COLORS: Record<string, string> = {
  cis: BRAND.primary,
  pci_dss: '#0ea5e9',
  gdpr: '#8b5cf6',
  hipaa: SEV_COLOR.low,
  nist: SEV_COLOR.medium,
  tsc: '#ec4899',
  iso27001: '#A78BFA',
  mitre: SEV_COLOR.high,
}

export const SEVERITY_COLORS: Record<string, string> = {
  critical: SEV_COLOR.critical,
  high: SEV_COLOR.high,
  medium: SEV_COLOR.medium,
  low: SEV_COLOR.low,
  informational: SEV_COLOR.info,
  unknown: '#64748b',
}

// Connection-health status colors for DataSourceHealthPanel / ConnectionPill
export const CONNECTION_STATUS_COLORS: Record<string, string> = {
  connected: SEV_COLOR.low,
  cached: BRAND.primaryLight,
  degraded: SEV_COLOR.medium,
  error: SEV_COLOR.critical,
  unavailable: '#94a3b8',
}

export function connectionStatusColor(status?: string, isDark = false): string {
  if (status && CONNECTION_STATUS_COLORS[status]) return CONNECTION_STATUS_COLORS[status]
  return isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
}

export function formatDateTime(value?: string | Date | null, fallback = '-'): string {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCompactNumber(value?: string | number | null): string {
  if (value === null || value === undefined) return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return '-'
  return number.toLocaleString('en-US')
}

export function formatPercent(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return 'N/A'
  const number = Number(value)
  if (Number.isNaN(number)) return 'N/A'
  return `${number.toFixed(1)}%`
}

export function makeCsv(rows: Record<string, any>[]): string {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 'message\r\nNo data\r\n'
  }

  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))))
  const escapeCell = (value: any) => {
    if (value === null || value === undefined) return ''
    const cell = typeof value === 'object' ? JSON.stringify(value) : String(value)
    return `"${cell.replaceAll('"', '""')}"`
  }

  const lines = [
    columns.map(escapeCell).join(','),
    ...rows.map(row => columns.map(column => escapeCell(row[column])).join(',')),
  ]
  return `${lines.join('\r\n')}\r\n`
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function downloadApiBlob(filename: string, promise: Promise<any>): Promise<void> {
  const response = await promise
  const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
