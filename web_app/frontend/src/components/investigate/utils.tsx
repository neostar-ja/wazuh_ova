import { Chip, IconButton, Tooltip, Typography } from '@mui/material'
import type { ReactElement } from 'react'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import type {
  InvestigationDirection,
  InvestigationQueryType,
  InvestigationRange,
  InvestigationSeverity,
} from '../../types'
import { BRAND, SEV_COLOR } from '../ui/tokens'

export const rangeOptions: Array<{ value: InvestigationRange; label: string }> = [
  { value: '1h', label: '1 ชั่วโมง' },
  { value: '6h', label: '6 ชั่วโมง' },
  { value: '24h', label: '24 ชั่วโมง' },
  { value: '7d', label: '7 วัน' },
  { value: '30d', label: '30 วัน' },
  { value: '90d', label: '90 วัน' },
]

export const directionOptions: Array<{ value: InvestigationDirection; label: string }> = [
  { value: 'both', label: 'Both' },
  { value: 'source', label: 'Source' },
  { value: 'destination', label: 'Destination' },
]

export const severityOptions: Array<{ value: InvestigationSeverity; label: string }> = [
  { value: 'all', label: 'ทุกระดับ' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'info', label: 'Info' },
]

export const queryTypeLabels: Record<InvestigationQueryType, string> = {
  ip: 'IP Address',
  hostname: 'Hostname',
  agent: 'Agent',
  user: 'User',
  mac: 'MAC Address',
  domain: 'Domain',
  hash: 'Hash',
  rule: 'Rule ID',
  cve: 'CVE',
  unknown: 'Unknown',
}

export const queryExamples: Array<{ label: string; value: string }> = [
  { label: 'IP', value: '10.10.20.15' },
  { label: 'Hostname', value: 'lab-pacs-01' },
  { label: 'Rule', value: '5712' },
  { label: 'CVE', value: 'CVE-2024-3094' },
  { label: 'Hash', value: '44d88612fea8a8f36de82e1278abb02f' },
  { label: 'Domain', value: 'malicious-example.org' },
]

export const monoSx = {
  fontFamily: '"IBM Plex Mono", monospace',
}

export function severityColor(level: InvestigationSeverity | 'critical' | 'high' | 'medium' | 'low' | 'info'): string {
  if (level === 'critical') return SEV_COLOR.critical
  if (level === 'high') return SEV_COLOR.high
  if (level === 'medium') return SEV_COLOR.medium
  if (level === 'low') return SEV_COLOR.low
  return SEV_COLOR.info
}

export function riskColor(score?: number): string {
  if (score == null) return BRAND.purple
  if (score >= 8) return SEV_COLOR.critical
  if (score >= 6) return SEV_COLOR.high
  if (score >= 4) return SEV_COLOR.medium
  if (score >= 2) return SEV_COLOR.low
  return SEV_COLOR.info
}

export function formatTimestamp(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

export function formatCompactTimestamp(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('th-TH', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function SeverityChip({ severity, icon }: { severity: 'critical' | 'high' | 'medium' | 'low' | 'info'; icon?: ReactElement }) {
  const color = severityColor(severity)
  return (
    <Chip
      icon={icon}
      label={severity.toUpperCase()}
      size="small"
      sx={{
        height: 22,
        fontSize: 11,
        fontWeight: 800,
        bgcolor: `${color}18`,
        color,
        border: `1px solid ${color}35`,
        '& .MuiChip-label': { px: 0.85 },
        '& .MuiChip-icon': { color: `${color} !important`, fontSize: 15 },
      }}
    />
  )
}

export function MonoValue({ value, dimmed = false }: { value?: string | number | null; dimmed?: boolean }) {
  return (
    <Typography
      sx={{
        ...monoSx,
        fontSize: 12,
        color: dimmed ? 'text.secondary' : 'text.primary',
        wordBreak: 'break-all',
      }}
    >
      {value ?? '—'}
    </Typography>
  )
}

export function CopyValueButton({ value, label = 'คัดลอก' }: { value: string; label?: string }) {
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        onClick={() => navigator.clipboard.writeText(value)}
        sx={{ p: 0.4, opacity: 0.56, '&:hover': { opacity: 1 } }}
      >
        <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Tooltip>
  )
}

export function jsonToDisplay(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
