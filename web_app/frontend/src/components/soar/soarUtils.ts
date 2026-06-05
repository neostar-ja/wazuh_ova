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

// fmtTime: แปลง UTC string จาก backend → Bangkok time (UTC+7)
// Backend เก็บด้วย datetime.utcnow() ไม่มี 'Z' suffix → ต้อง parse ว่าเป็น UTC ก่อน
export function fmtTime(s: string | null | undefined): string {
  if (!s) return '—'
  const parsed = parseIrisDateAtOffset(s, '+00:00')
  return parsed ? formatInBangkok(parsed, 'en-GB') : s
}

export function fmtTimeTh(s: string | null | undefined): string {
  if (!s) return '—'
  const parsed = parseIrisDateAtOffset(s, '+00:00')
  return parsed ? formatInBangkok(parsed, 'th-TH') : s
}

export function fmtDateInputNow(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
}

function parseOffsetToMinutes(offset: string): number {
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(offset)
  if (!match) return 0
  const sign = match[1] === '-' ? -1 : 1
  const hours = Number.parseInt(match[2], 10)
  const minutes = Number.parseInt(match[3], 10)
  return sign * (hours * 60 + minutes)
}

function parseIrisDateAtOffset(value: string, sourceOffset = '+00:00'): Date | null {
  const normalized = value.trim()
  if (!normalized) return null

  // If the source already includes a timezone, let the runtime parse it directly.
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    const direct = new Date(normalized)
    return Number.isNaN(direct.getTime()) ? null : direct
  }

  const parts = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/,
  )
  if (!parts) return null

  const [
    ,
    year,
    month,
    day,
    hour,
    minute,
    second = '0',
    fractional = '0',
  ] = parts

  const milliseconds = Number.parseInt((fractional + '000').slice(0, 3), 10)
  const utcMs = Date.UTC(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
    Number.parseInt(hour, 10),
    Number.parseInt(minute, 10),
    Number.parseInt(second, 10),
    milliseconds,
  )

  return new Date(utcMs - parseOffsetToMinutes(sourceOffset) * 60_000)
}

function formatInBangkok(date: Date, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? ''

  return `${lookup('day')} ${lookup('month')} ${lookup('year')} ${lookup('hour')}:${lookup('minute')}`
}

export function fmtIrisUtcToBangkok(s: string | null | undefined): string {
  if (!s) return '—'
  const parsed = parseIrisDateAtOffset(s, '+00:00')
  return parsed ? formatInBangkok(parsed, 'en-GB') : s
}

export function fmtIrisTimeToBangkok(s: string | null | undefined, sourceOffset = '+00:00'): string {
  if (!s) return '—'
  const parsed = parseIrisDateAtOffset(s, sourceOffset)
  return parsed ? formatInBangkok(parsed, 'th-TH') : s
}

export function browserTimezoneOffset(): string {
  const minutes = -new Date().getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const mins = String(abs % 60).padStart(2, '0')
  return `${sign}${hours}:${mins}`
}

// ── TLP labels ─────────────────────────────────────────────────────────────────

export const TLP_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'TLP:WHITE',   color: '#F8FAFC' },
  2: { label: 'TLP:GREEN',   color: '#22C55E' },
  3: { label: 'TLP:AMBER',   color: '#F59E0B' },
  4: { label: 'TLP:RED',     color: '#EF4444' },
}
