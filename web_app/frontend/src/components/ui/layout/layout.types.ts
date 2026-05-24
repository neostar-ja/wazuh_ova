import { ReactNode } from 'react'

// ─── Page-level types ─────────────────────────────────────────────────────────

export type PageStatus = 'live' | 'paused' | 'offline' | 'ready' | 'warning' | 'error'
export type PageVariant = 'default' | 'dashboard' | 'workbench' | 'report' | 'console' | 'management'
export type PageDensity = 'comfortable' | 'compact'
export type PageMaxWidth = 'full' | 'content' | 'wide' | number

export interface PageBreadcrumb {
  label: string
  href?: string
}

export interface PageShellProps {
  /** Page title shown in the header */
  title?: string
  /** Subtitle / description line */
  subtitle?: string
  /** Breadcrumb trail */
  breadcrumbs?: PageBreadcrumb[]
  /** Action buttons / controls in the header right */
  actions?: ReactNode
  /** Status indicator beside the title */
  status?: PageStatus
  /** Override the default status label text */
  statusLabel?: string
  /** "Updated X ago" text shown near the title */
  lastUpdated?: string
  /** Page children */
  children: ReactNode
  /**
   * Max width of the content column.
   * 'full' = no max-width (fills screen)
   * 'wide' = 1600px
   * 'content' = 1280px
   * number = exact px value
   */
  maxWidth?: PageMaxWidth
  /** Spacing / padding density */
  density?: PageDensity
  /**
   * Page layout variant.
   * - default: generic page
   * - dashboard: overview/summary with metric strip
   * - workbench: split-pane investigation/search
   * - report: compliance/audit output
   * - console: alert/event list with toolbar
   * - management: settings / admin tables
   */
  variant?: PageVariant
  /** Show full-page loading skeleton */
  loading?: boolean
  /** Replace content area with an error panel */
  error?: ReactNode
  /** Replace content area with an empty state */
  empty?: ReactNode
  className?: string
}

// ─── Section ──────────────────────────────────────────────────────────────────

export type SectionSpacing = 'sm' | 'md' | 'lg'

export interface PageSectionProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  spacing?: SectionSpacing
  divider?: boolean
  className?: string
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export type GridColumns = 1 | 2 | 3 | 4 | 6 | 12
export type GridGap = 'xs' | 'sm' | 'md' | 'lg'
export type GridVariant = 'fixed' | 'auto-fit' | 'dashboard'

export interface ContentGridProps {
  children: ReactNode
  /** Fixed column count (applies at every breakpoint unless overridden by variant) */
  columns?: GridColumns
  gap?: GridGap
  /** Min card width for auto-fit variant */
  minCardWidth?: number
  variant?: GridVariant
  align?: 'stretch' | 'start' | 'center'
  className?: string
}

// ─── Metric grid ──────────────────────────────────────────────────────────────

export interface MetricGridProps {
  children: ReactNode
  /** Number of cards per row on desktop (2–6) */
  cols?: 2 | 3 | 4 | 5 | 6
  gap?: GridGap
  className?: string
}

// ─── State components ─────────────────────────────────────────────────────────

export type LoadingStateType = 'page' | 'card' | 'table' | 'chart' | 'list'

export interface LoadingStateProps {
  type?: LoadingStateType
  rows?: number
  height?: number | string
  className?: string
}
