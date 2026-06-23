import type { ReactNode } from 'react'
import { Box, Button, IconButton, TableCell, Tooltip, Typography } from '@mui/material'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import RuleFolderOutlinedIcon from '@mui/icons-material/RuleFolderOutlined'
import { AlertMessage } from '../common/CommonComponents'
import { BRAND, SEV_COLOR } from '../ui/tokens'
import { CONNECTION_STATUS_COLORS, FRAMEWORK_COLORS, SEVERITY_COLORS } from './complianceUtils'

// ── Tab metadata ───────────────────────────────────────────────────────────────
export const TAB_ICONS: ReactNode[] = [
  <SecurityRoundedIcon fontSize="small" />,
  <PolicyOutlinedIcon fontSize="small" />,
  <FactCheckOutlinedIcon fontSize="small" />,
  <GroupsOutlinedIcon fontSize="small" />,
  <BugReportOutlinedIcon fontSize="small" />,
  <WarningAmberOutlinedIcon fontSize="small" />,
  <RuleFolderOutlinedIcon fontSize="small" />,
]

export const TAB_LABELS_TH = ['ภาพรวม', 'มาตรฐาน', 'ตรวจสอบ SCA', 'อุปกรณ์', 'ช่องโหว่', 'การแจ้งเตือน', 'หลักฐาน']

export const FRAMEWORK_TH: Record<string, string> = {
  cis: 'CIS', pci_dss: 'PCI-DSS', gdpr: 'GDPR', hipaa: 'HIPAA',
  nist: 'NIST 800-53', tsc: 'TSC', iso27001: 'ISO 27001', mitre: 'MITRE ATT&CK',
}

// ── Connection-status display (Thai labels, shared by ConnectionPill & DataSourceHealthPanel) ──
export const CONNECTION_STATUS_LABELS_TH: Record<string, string> = {
  connected: 'เชื่อมต่อแล้ว',
  cached: 'ข้อมูลแคช',
  degraded: 'ลดประสิทธิภาพ',
  error: 'ขัดข้อง',
  unavailable: 'ไม่พร้อมใช้งาน',
}

/** Theme-aware neutral-gray tones for "unknown"/loading chips, matching SecurityPostureBanner. */
export function grayChipTones(isDark: boolean) {
  return {
    color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    bg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
  }
}

// ── Score color scale ────────────────────────────────────────────────────────
export function scoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return '#94a3b8'
  if (score >= 70) return SEV_COLOR.low
  if (score >= 40) return SEV_COLOR.medium
  return SEV_COLOR.critical
}

// ── Score Gauge (SVG circle) ──────────────────────────────────────────────────
export function ScoreGauge({ score, size = 80, color = BRAND.primary }: { score: number | null; size?: number; color?: string }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const pct  = score === null ? 0 : Math.max(0, Math.min(score, 100))
  const dash = (pct / 100) * circ
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Typography sx={{ fontSize: size * 0.18, fontWeight: 900, color, lineHeight: 1, fontFamily: '"IBM Plex Mono"' }}>
          {score === null ? 'N/A' : `${Math.round(score)}`}
        </Typography>
        {score !== null && <Typography sx={{ fontSize: Math.max(size * 0.12, 11), color: 'text.disabled', lineHeight: 1 }}>%</Typography>}
      </Box>
    </Box>
  )
}

// ── Connection status pill ────────────────────────────────────────────────────
export function ConnectionPill({ status }: { status?: string }) {
  const color = (status && CONNECTION_STATUS_COLORS[status]) || '#64748b'
  const label = (status && CONNECTION_STATUS_LABELS_TH[status]) || status || 'ไม่ทราบ'
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.6,
      px: 1.1, py: 0.35, borderRadius: '20px',
      bgcolor: `${color}15`, border: `1.5px solid ${color}35`,
    }}>
      <Box sx={{
        width: 7, height: 7, borderRadius: '50%', bgcolor: color,
        animation: status === 'connected' ? 'pulseGlow 2s ease-in-out infinite' : 'none',
      }} />
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color, letterSpacing: '0.04em' }}>
        {label.toUpperCase()}
      </Typography>
    </Box>
  )
}

// ── Severity chip (Thai) ──────────────────────────────────────────────────────
export function SevChip({ severity }: { severity: string }) {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.unknown
  const TH: Record<string, string> = { critical: 'วิกฤต', high: 'สูง', medium: 'กลาง', low: 'ต่ำ', informational: 'ข้อมูล', unknown: 'ไม่ทราบ' }
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 0.85, py: 0.2, borderRadius: '6px', fontSize: 10.5, fontWeight: 700,
      bgcolor: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
      {TH[severity] || severity}
    </Box>
  )
}

// ── Status chip (Thai) ────────────────────────────────────────────────────────
export function StatChip({ status }: { status: string }) {
  const PAL: Record<string, { label: string; color: string }> = {
    passed:          { label: 'ผ่าน',       color: SEV_COLOR.low },
    failed:          { label: 'ไม่ผ่าน',    color: SEV_COLOR.critical },
    not_applicable:  { label: 'N/A',         color: '#94a3b8' },
    invalid:         { label: 'ไม่ถูกต้อง', color: SEV_COLOR.medium },
    active:          { label: 'ออนไลน์',    color: SEV_COLOR.low },
    disconnected:    { label: 'ออฟไลน์',    color: SEV_COLOR.critical },
    warning:         { label: 'เตือน',      color: SEV_COLOR.medium },
    good:            { label: 'ดี',          color: SEV_COLOR.low },
    critical:        { label: 'วิกฤต',      color: SEV_COLOR.critical },
    unknown:         { label: 'ไม่ทราบ',    color: '#64748b' },
  }
  const item = PAL[status] || { label: status, color: '#64748b' }
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 0.85, py: 0.2, borderRadius: '6px', fontSize: 10.5, fontWeight: 700,
      bgcolor: `${item.color}18`, color: item.color, border: `1px solid ${item.color}30`,
    }}>
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
      {item.label}
    </Box>
  )
}

// ── Framework badge pill ──────────────────────────────────────────────────────
export function FrameBadge({ id }: { id: string }) {
  const color = FRAMEWORK_COLORS[id] || BRAND.primary
  return (
    <Box sx={{
      display: 'inline-block', px: 0.9, py: 0.15, borderRadius: '5px',
      fontSize: 9.5, fontWeight: 800, bgcolor: `${color}20`, color, border: `1px solid ${color}35`,
      letterSpacing: '0.04em',
    }}>
      {FRAMEWORK_TH[id] || id.toUpperCase()}
    </Box>
  )
}

// ── Error box ─────────────────────────────────────────────────────────────────
export function ErrorBox({ error, onRetry }: { error: any; onRetry: () => void }) {
  return (
    <AlertMessage
      type="error"
      title="โหลดข้อมูลไม่สำเร็จ"
      message={error?.response?.data?.detail || error?.message || 'Compliance API ไม่ตอบสนองหรือข้อมูลไม่สมบูรณ์'}
      action={<Button size="small" variant="outlined" onClick={onRetry} sx={{ fontSize: 11 }}>ลองอีกครั้ง</Button>}
    />
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────
export function CopyBtn({ value }: { value?: string }) {
  return (
    <Tooltip title="คัดลอก">
      <span>
        <IconButton size="small" disabled={!value}
          onClick={() => value && navigator.clipboard.writeText(value)}
          sx={{ opacity: 0.45, '&:hover': { opacity: 1 }, p: 0.4 }}>
          <ContentCopyOutlinedIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </span>
    </Tooltip>
  )
}

// ── Styled table header cell ──────────────────────────────────────────────────
export const THCell = ({ children, align }: { children?: ReactNode; align?: 'right' | 'left' }) => (
  <TableCell align={align} sx={{
    fontSize: 10, fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase',
    letterSpacing: '0.07em', py: 1.25, whiteSpace: 'nowrap',
    bgcolor: 'background.paper', borderBottom: '2px solid', borderBottomColor: 'divider',
  }}>
    {children}
  </TableCell>
)
