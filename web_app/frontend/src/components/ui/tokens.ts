// ─── Shared Design Tokens ─────────────────────────────────────────────────────
// Single source of truth for brand colors and severity palette

export const BRAND = {
  purple:      '#7B5BA4',
  purpleLight: '#9B7DC4',
  purpleDark:  '#5A3E85',
  purpleFaint: 'rgba(123,91,164,0.12)',
  orange:      '#F17422',
  orangeLight: '#FF9642',
  orangeDark:  '#D05810',
  orangeFaint: 'rgba(241,116,34,0.12)',
} as const

export const SEV_COLOR = {
  critical: '#EF4444',
  high:     '#F17422',
  medium:   '#EAB308',
  low:      '#22C55E',
  info:     '#38BDF8',
} as const

export type SeverityLevel = keyof typeof SEV_COLOR

export function sevColor(level: number): string {
  if (level >= 15) return SEV_COLOR.critical
  if (level >= 12) return SEV_COLOR.high
  if (level >= 7)  return SEV_COLOR.medium
  return SEV_COLOR.low
}

export function sevLabel(level: number): string {
  if (level >= 15) return 'Critical'
  if (level >= 12) return 'High'
  if (level >= 7)  return 'Medium'
  return 'Low'
}

export function sevLabelShort(level: number): string {
  if (level >= 15) return 'CRIT'
  if (level >= 12) return 'HIGH'
  if (level >= 7)  return 'MED'
  return 'LOW'
}

export function sevFromName(name: string): string {
  return SEV_COLOR[name.toLowerCase() as SeverityLevel] ?? SEV_COLOR.info
}

// Chart tooltip style (recharts)
export const CHART_TIP_STYLE = {
  background:   'rgba(22,18,42,0.97)',
  border:       '1px solid rgba(123,91,164,0.35)',
  borderRadius: 8,
  fontSize:     12,
  color:        '#EDE9FA',
} as const

// Chart pie palette
export const PIE_COLORS = [
  BRAND.purple, BRAND.orange, '#38BDF8', '#22C55E',
  '#EAB308', '#EC4899', '#A855F7',
] as const

// Format large numbers
export function fmtN(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e4) return `${(n / 1e3).toFixed(0)}K`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}
