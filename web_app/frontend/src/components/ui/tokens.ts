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

// ─── Layout / Surface tokens ──────────────────────────────────────────────────
// SSOT for spacing, radius, surfaces and borders so pages stop redefining
// their own copies of these values (see SOC_CENTER_UI_CLEAN_REDESIGN_AUDIT.md)

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
  default:  { dark: 'rgba(22,17,42,0.85)',  light: 'rgba(255,255,255,0.95)' },
  glass:    { dark: 'rgba(18,14,34,0.78)',  light: 'rgba(255,255,255,0.82)' },
  flat:     { dark: 'rgba(22,17,40,0.6)',   light: 'rgba(255,255,255,0.8)'  },
  elevated: { dark: 'rgba(30,23,52,0.95)',  light: '#FFFFFF'                },
} as const

export const BORDER = {
  default: { dark: 'rgba(123,91,164,0.22)', light: 'rgba(123,91,164,0.14)' },
  subtle:  { dark: 'rgba(123,91,164,0.14)', light: 'rgba(123,91,164,0.1)'  },
  divider: { dark: 'rgba(123,91,164,0.15)', light: 'rgba(123,91,164,0.1)'  },
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
 * Soft tinted background for chips/badges/icon-wells, e.g. getSoftBg(BRAND.orange, 12)
 * → '#F17422' + ~12% alpha as a 2-digit hex suffix (matches the `${color}18`-style
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
    border: '1px solid rgba(123,91,164,0.2)',
    color: '#1A1033',
  }
}

// ─── Typography scale ──────────────────────────────────────────────────────────
// Reference sizes (px) per SOC_CENTER_UI_CLEAN_REDESIGN_AGENT_PROMPT.md —
// anything below `metadata` should not be used for primary/important content.
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
