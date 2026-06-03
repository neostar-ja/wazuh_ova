import { format } from 'date-fns'
import { th } from 'date-fns/locale'

// ── Color helpers ──────────────────────────────────────────────────────────────

export function hexRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`
}

// ── Severity maps ──────────────────────────────────────────────────────────────

export const IRIS_SEV: Record<number, { label: string; labelTh: string; color: string }> = {
  1: { label: 'Unspecified', labelTh: 'ไม่ระบุ',     color: '#64748B' },
  2: { label: 'Unspecified', labelTh: 'ไม่ระบุ',     color: '#64748B' },
  3: { label: 'Low',         labelTh: 'ต่ำ',          color: '#22C55E' },
  4: { label: 'Low',         labelTh: 'ต่ำ',          color: '#22C55E' },
  5: { label: 'Medium',      labelTh: 'ปานกลาง',      color: '#F59E0B' },
  6: { label: 'Medium',      labelTh: 'ปานกลาง',      color: '#F59E0B' },
  7: { label: 'High',        labelTh: 'สูง',           color: '#F17422' },
  8: { label: 'High',        labelTh: 'สูง',           color: '#F17422' },
  9: { label: 'Critical',    labelTh: 'วิกฤต',         color: '#EF4444' },
}

export const IRIS_STATUS: Record<number, { label: string; labelTh: string; color: string }> = {
  1: { label: 'Unspecified', labelTh: 'ไม่ระบุ',         color: '#64748B' },
  2: { label: 'New',         labelTh: 'ใหม่',             color: '#3B82F6' },
  3: { label: 'Assigned',    labelTh: 'มอบหมายแล้ว',      color: '#8B5CF6' },
  4: { label: 'In Progress', labelTh: 'กำลังดำเนินการ',   color: '#F59E0B' },
  5: { label: 'Pending',     labelTh: 'รอดำเนินการ',       color: '#F17422' },
  6: { label: 'Closed',      labelTh: 'ปิดแล้ว',           color: '#64748B' },
}

export function getSev(id: number) {
  return IRIS_SEV[id] ?? { label: 'Unknown', labelTh: 'ไม่ทราบ', color: '#64748B' }
}
export function getStat(id: number) {
  return IRIS_STATUS[id] ?? { label: 'Unknown', labelTh: 'ไม่ทราบ', color: '#64748B' }
}

// ── Severity options for form selects ─────────────────────────────────────────

export const SEV_OPTIONS = [
  { id: 3, label: 'ต่ำ (Low)',           color: '#22C55E' },
  { id: 5, label: 'ปานกลาง (Medium)',    color: '#F59E0B' },
  { id: 7, label: 'สูง (High)',          color: '#F17422' },
  { id: 9, label: 'วิกฤต (Critical)',    color: '#EF4444' },
]

export const STATUS_OPTIONS = [
  { id: 2, label: 'ใหม่ (New)',              color: '#3B82F6' },
  { id: 3, label: 'มอบหมายแล้ว (Assigned)', color: '#8B5CF6' },
  { id: 4, label: 'กำลังดำเนินการ',         color: '#F59E0B' },
  { id: 5, label: 'รอดำเนินการ (Pending)',   color: '#F17422' },
  { id: 6, label: 'ปิดแล้ว (Closed)',        color: '#64748B' },
]

// ── Date format helpers ────────────────────────────────────────────────────────

export function fmtTime(s: string | null | undefined): string {
  if (!s) return '—'
  try { return format(new Date(s), 'dd MMM yy HH:mm') }
  catch { return s }
}

export function fmtTimeTh(s: string | null | undefined): string {
  if (!s) return '—'
  try { return format(new Date(s), 'dd MMM yy HH:mm', { locale: th }) }
  catch { return s }
}

export function fmtDateInputNow(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
}

// ── TLP labels ─────────────────────────────────────────────────────────────────

export const TLP_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'TLP:WHITE',   color: '#F8FAFC' },
  2: { label: 'TLP:GREEN',   color: '#22C55E' },
  3: { label: 'TLP:AMBER',   color: '#F59E0B' },
  4: { label: 'TLP:RED',     color: '#EF4444' },
}
