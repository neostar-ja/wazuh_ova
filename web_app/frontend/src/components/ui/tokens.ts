// ─── Shared Design Tokens (v3 — Indigo / Cyan) ────────────────────────────────
// Single source of truth for brand colors and severity palette

export const BRAND = {
  // Primary — Electric Indigo/Blue (actions, active nav, focus rings)
  primary:      '#4F6EF7',
  primaryLight: '#7C93FF',
  primaryDark:  '#2F47C9',
  primaryFaint: 'rgba(79,110,247,0.12)',
  // Accent — Cyan/Teal (live indicators, glow, highlights)
  accent:       '#22D3EE',
  accentLight:  '#67E8F9',
  accentDark:   '#0EA5C4',
  accentFaint:  'rgba(34,211,238,0.12)',

  // Legacy aliases (purple/orange) — kept so pages not yet migrated to v3
  // automatically pick up the new brand colors (purple → primary, orange → accent)
  purple:      '#4F6EF7',
  purpleLight: '#7C93FF',
  purpleDark:  '#2F47C9',
  purpleFaint: 'rgba(79,110,247,0.12)',
  orange:      '#22D3EE',
  orangeLight: '#67E8F9',
  orangeDark:  '#0EA5C4',
  orangeFaint: 'rgba(34,211,238,0.12)',
} as const

export const SEV_COLOR = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#F59E0B',
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
  background:   'rgba(19,24,41,0.97)',
  border:       '1px solid rgba(124,147,255,0.22)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#E7EBF7',
} as const

// Chart pie palette
export const PIE_COLORS = [
  BRAND.primary, BRAND.accent, '#F59E0B', '#22C55E',
  '#EC4899', '#A855F7', '#38BDF8',
] as const

// Categorical colors for data sources / rule groups — distinct hues that stay
// legible alongside SEV_COLOR and BRAND. Reuse SEV_COLOR/BRAND directly where
// a category IS a severity signal (e.g. SSH auth failures -> SEV_COLOR.medium).
export const CATEGORY_COLOR = {
  mikrotik:     '#3B82F6',          // blue
  fortigate:    BRAND.accent,       // '#22D3EE'
  huaweiUsg:    SEV_COLOR.low,      // '#22C55E'
  huaweiAc:     '#10B981',          // emerald
  infobloxDns:  BRAND.primaryLight, // '#7C93FF'
  infobloxDhcp: '#A78BFA',          // violet
  suricata:     '#EC4899',          // pink
  linuxSystem:  '#64748B',          // slate
  windows:      '#0EA5E9',          // sky
  ossec:        '#94A3B8',          // light slate
  compliance:   '#A78BFA',          // violet
} as const

// Threat-intel feed brand colors (AlertDrawer "Threat Intel" tab FeedMiniCards)
export const FEED_COLOR = {
  abuseipdb:  SEV_COLOR.critical, // '#EF4444'
  otx:        SEV_COLOR.high,     // '#F97316'
  shodan:     BRAND.accentDark,   // '#0EA5C4'
  virustotal: BRAND.primaryLight, // '#7C93FF'
} as const

// Display-label -> color, used by AlertsPage source rail + ThreatDistributionPanel
export const SOURCE_COLOR_MAP: Record<string, string> = {
  'MikroTik Router': CATEGORY_COLOR.mikrotik,
  'FortiGate WUH':   CATEGORY_COLOR.fortigate,
  'Huawei USG/FW':   CATEGORY_COLOR.huaweiUsg,
  'Huawei AC WiFi':  CATEGORY_COLOR.huaweiAc,
  'Huawei Agile Controller': CATEGORY_COLOR.huaweiAc,
  'Infoblox DNS':    CATEGORY_COLOR.infobloxDns,
  'Infoblox DHCP':   CATEGORY_COLOR.infobloxDhcp,
  'Suricata IDS':    CATEGORY_COLOR.suricata,
  'Linux/SSH':       SEV_COLOR.medium,
  'Linux/System':    CATEGORY_COLOR.linuxSystem,
}

// Format large numbers
export function fmtN(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e4) return `${(n / 1e3).toFixed(0)}K`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

// ─── Layout / Surface tokens ──────────────────────────────────────────────────
// SSOT for spacing, radius, surfaces and borders so pages stop redefining
// their own copies of these values.

export const RADIUS = {
  card:    16, // major panels (SectionCard)
  control: 12, // inputs, buttons, toolbars
  chip:    8,  // chips / small badges
} as const

// MUI spacing units (×8px) for consistent gaps between/within sections
export const LAYOUT_GAP = {
  section: 2.5, // between major page sections
  card:    1.5, // between cards within a section grid
  inline:  1,   // inline element gaps (icon+label, chip rows)
} as const

// Mirrors SectionCard's variant backgrounds so non-card surfaces (e.g. inline
// panels inside tabs) can match the same look without re-deriving values.
export const SURFACE = {
  default:  { dark: 'rgba(19,24,41,0.88)', light: 'rgba(255,255,255,0.96)' },
  glass:    { dark: 'rgba(16,21,36,0.72)', light: 'rgba(255,255,255,0.80)' },
  flat:     { dark: 'rgba(14,18,30,0.58)', light: 'rgba(247,249,252,0.86)' },
  elevated: { dark: 'rgba(27,34,54,0.97)', light: '#FFFFFF' },
} as const

export const BORDER = {
  default: { dark: 'rgba(124,147,255,0.14)', light: 'rgba(79,110,247,0.10)' },
  subtle:  { dark: 'rgba(124,147,255,0.08)', light: 'rgba(79,110,247,0.06)' },
  divider: { dark: 'rgba(124,147,255,0.10)', light: 'rgba(79,110,247,0.08)' },
} as const

export type SurfaceLevel = keyof typeof SURFACE
export type BorderEmphasis = keyof typeof BORDER

/** Theme-aware surface background — mirrors SectionCard variant backgrounds. */
export function getSurface(isDark: boolean, level: SurfaceLevel = 'default'): string {
  return isDark ? SURFACE[level].dark : SURFACE[level].light
}

/** Theme-aware border color — mirrors SectionCard border emphasis levels. */
export function getBorder(isDark: boolean, emphasis: BorderEmphasis = 'default'): string {
  return isDark ? BORDER[emphasis].dark : BORDER[emphasis].light
}

/**
 * Soft tinted background for chips/badges/icon-wells, e.g. getSoftBg(BRAND.accent, 12)
 * → '#22D3EE' + ~12% alpha as a 2-digit hex suffix (matches the `${color}18`-style
 * literals scattered across pages, but computed instead of guessed).
 */
export function getSoftBg(color: string, alphaPercent: number = 12): string {
  const hex = Math.round((alphaPercent / 100) * 255).toString(16).padStart(2, '0')
  return `${color}${hex}`
}

/**
 * Theme-aware recharts tooltip style. Dark mode matches the existing
 * CHART_TIP_STYLE; light mode mirrors the pattern already used ad-hoc in
 * BreakdownCharts.tsx so all charts share one tooltip look in both themes.
 */
export function getChartTipStyle(isDark: boolean) {
  if (isDark) return CHART_TIP_STYLE
  return {
    ...CHART_TIP_STYLE,
    background: 'rgba(255,255,255,0.97)',
    border: '1px solid rgba(79,110,247,0.16)',
    color: '#161B2E',
  }
}

// ─── Effects (gradients / glow) ───────────────────────────────────────────────

export const GRADIENT = {
  primary:    'linear-gradient(135deg,#4F6EF7 0%,#2F47C9 100%)',
  accent:     'linear-gradient(135deg,#22D3EE 0%,#0EA5C4 100%)',
  aurora:     'linear-gradient(135deg,#4F6EF7 0%,#22D3EE 100%)',
  auroraSoft: 'linear-gradient(135deg,rgba(79,110,247,0.16) 0%,rgba(34,211,238,0.12) 100%)',
} as const

/** Soft glow box-shadow for live/critical indicators and hover states. */
export function getGlow(color: string, intensityPercent: number = 45): string {
  return `0 0 18px ${getSoftBg(color, intensityPercent)}`
}

export const TRANSITION = {
  base:   '200ms cubic-bezier(0.4,0,0.2,1)',
  smooth: '320ms cubic-bezier(0.16,1,0.3,1)',
} as const

// ─── Typography scale ──────────────────────────────────────────────────────────
// Reference sizes (px) — anything below `metadata` should not be used for
// primary/important content.
export const TYPOGRAPHY_SCALE = {
  pageTitle:    24,   // 22-26px / weight 800-900
  sectionTitle: 16,   // 15-18px / weight 700-800
  body:         14,   // 13-15px
  table:        13,   // 12.5-14px
  metadata:     12,   // 11.5-12.5px
} as const

// Row density presets for data tables
export const TABLE_DENSITY = {
  comfortable: { rowPy: 1,    fontSize: 13   },
  compact:     { rowPy: 0.5,  fontSize: 12.5 },
} as const
