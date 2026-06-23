import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import type { IrisCaseState } from '../../services/soarApi'

// ── Color helpers ──────────────────────────────────────────────────────────────

export function hexRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`
}

// ── Severity maps ──────────────────────────────────────────────────────────────

export const IRIS_SEV: Record<number, { label: string; labelTh: string; color: string }> = {
  1: { label: 'Medium',        labelTh: 'ปานกลาง',      color: '#F59E0B' },
  2: { label: 'Unspecified',   labelTh: 'ไม่ระบุ',       color: '#64748B' },
  3: { label: 'Informational', labelTh: 'ข้อมูล',         color: '#38BDF8' },
  4: { label: 'Low',           labelTh: 'ต่ำ',           color: '#22C55E' },
  5: { label: 'High',          labelTh: 'สูง',           color: '#F17422' },
  6: { label: 'Critical',      labelTh: 'วิกฤต',         color: '#EF4444' },
}

// Alert statuses from IRIS alerts API.
export const IRIS_STATUS: Record<number, { label: string; labelTh: string; color: string }> = {
  1: { label: 'Unspecified', labelTh: 'ไม่ระบุ',          color: '#64748B' },
  2: { label: 'New',         labelTh: 'ใหม่',              color: '#3B82F6' },
  3: { label: 'Assigned',    labelTh: 'มอบหมายแล้ว',       color: '#8B5CF6' },
  4: { label: 'In Progress', labelTh: 'กำลังดำเนินการ',    color: '#F59E0B' },
  5: { label: 'Pending',     labelTh: 'รอดำเนินการ',        color: '#F17422' },
  6: { label: 'Closed',      labelTh: 'ปิดแล้ว',            color: '#64748B' },
  7: { label: 'Merged',      labelTh: 'ถูกรวมเคสแล้ว',      color: '#0EA5E9' },
  8: { label: 'Escalated',   labelTh: 'ยกระดับเป็นเคส',    color: '#EAB308' },
}

export function getSev(id: number) {
  return IRIS_SEV[id] ?? { label: 'Unknown', labelTh: 'ไม่ทราบ', color: '#64748B' }
}
export function getStat(id: number) {
  return IRIS_STATUS[id] ?? { label: 'Unknown', labelTh: 'ไม่ทราบ', color: '#64748B' }
}

// ── Severity options for form selects ─────────────────────────────────────────

export const SEV_OPTIONS = [
  { id: 1, label: 'ปานกลาง (Medium)',     color: '#F59E0B' },
  { id: 2, label: 'ไม่ระบุ (Unspecified)', color: '#64748B' },
  { id: 3, label: 'ข้อมูล (Informational)', color: '#38BDF8' },
  { id: 4, label: 'ต่ำ (Low)',             color: '#22C55E' },
  { id: 5, label: 'สูง (High)',            color: '#F17422' },
  { id: 6, label: 'วิกฤต (Critical)',      color: '#EF4444' },
]

export const STATUS_OPTIONS = [
  { id: 1, label: 'ไม่ระบุ (Unspecified)',    color: '#64748B' },
  { id: 2, label: 'ใหม่ (New)',              color: '#3B82F6' },
  { id: 3, label: 'มอบหมายแล้ว (Assigned)', color: '#8B5CF6' },
  { id: 4, label: 'กำลังดำเนินการ',         color: '#F59E0B' },
  { id: 5, label: 'รอดำเนินการ (Pending)',   color: '#F17422' },
  { id: 6, label: 'ปิดแล้ว (Closed)',        color: '#64748B' },
  { id: 7, label: 'รวมเข้ากับเคส (Merged)',  color: '#0EA5E9' },
  { id: 8, label: 'ยกระดับเป็นเคส',          color: '#EAB308' },
]

export function caseStatusIdFromStateName(stateName?: string | null): number | null {
  const normalized = String(stateName || '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('new') || normalized.includes('ใหม่')) return 2
  if (normalized.includes('assigned') || normalized.includes('มอบหมาย')) return 3
  if (normalized.includes('progress') || normalized.includes('กำลังดำเนินการ')) return 4
  if (normalized.includes('pending') || normalized.includes('รอดำเนินการ')) return 5
  if (normalized.includes('closed') || normalized.includes('ปิด')) return 6
  return null
}

export function resolveCaseStatusId(input: {
  statusId?: number | null
  stateName?: string | null
  closeDate?: string | null
}): number {
  if (input.closeDate) return 6
  if (typeof input.statusId === 'number' && IRIS_STATUS[input.statusId]) return input.statusId
  return caseStatusIdFromStateName(input.stateName) ?? 4
}

const FALLBACK_CASE_STATES: IrisCaseState[] = [
  { state_id: 1, state_name: 'Unspecified', protected: true },
  { state_id: 2, state_name: 'In progress', protected: false },
  { state_id: 3, state_name: 'Open', protected: true },
  { state_id: 4, state_name: 'Containment', protected: false },
  { state_id: 5, state_name: 'Eradication', protected: false },
  { state_id: 6, state_name: 'Recovery', protected: false },
  { state_id: 7, state_name: 'Post-Incident', protected: false },
  { state_id: 8, state_name: 'Reporting', protected: false },
  { state_id: 9, state_name: 'Closed', protected: true },
]

const CASE_STATE_META: Record<string, { labelTh: string; color: string }> = {
  unspecified: { labelTh: 'ไม่ระบุ', color: '#64748B' },
  'in progress': { labelTh: 'กำลังดำเนินการ', color: '#F59E0B' },
  open: { labelTh: 'เปิดเคส', color: '#22C55E' },
  containment: { labelTh: 'กำลังกักกัน', color: '#F97316' },
  eradication: { labelTh: 'กำลังกำจัดสาเหตุ', color: '#EF4444' },
  recovery: { labelTh: 'กำลังกู้คืนระบบ', color: '#38BDF8' },
  'post-incident': { labelTh: 'หลังเหตุการณ์', color: '#8B5CF6' },
  reporting: { labelTh: 'กำลังสรุปรายงาน', color: '#6366F1' },
  closed: { labelTh: 'ปิดเคส', color: '#64748B' },
}

function normalizeCaseStateName(name?: string | null): string {
  return String(name || '').trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ')
}

export function fallbackCaseStates(): IrisCaseState[] {
  return FALLBACK_CASE_STATES
}

export function getCaseStates(states?: IrisCaseState[] | null): IrisCaseState[] {
  return states?.length ? states : FALLBACK_CASE_STATES
}

export function resolveCaseStateId(input: {
  stateId?: number | null
  stateName?: string | null
  closeDate?: string | null
  states?: IrisCaseState[] | null
}): number {
  const states = getCaseStates(input.states)
  if (typeof input.stateId === 'number') return input.stateId
  if (input.closeDate) {
    return states.find((state) => normalizeCaseStateName(state.state_name) === 'closed')?.state_id ?? 9
  }
  const matched = states.find((state) => normalizeCaseStateName(state.state_name) === normalizeCaseStateName(input.stateName))
  return matched?.state_id ?? 3
}

export function formatCaseStateLabel(stateName?: string | null): string {
  const normalized = normalizeCaseStateName(stateName)
  const meta = CASE_STATE_META[normalized]
  if (!normalized) return 'ไม่ทราบ'
  if (meta) return `${meta.labelTh} (${stateName})`
  return String(stateName)
}

export function getCaseStateMeta(input: {
  stateId?: number | null
  stateName?: string | null
  closeDate?: string | null
  states?: IrisCaseState[] | null
}): { stateId: number; stateName: string; label: string; color: string } {
  const states = getCaseStates(input.states)
  const resolvedStateId = resolveCaseStateId(input)
  const matched =
    states.find((state) => state.state_id === resolvedStateId) ??
    states.find((state) => normalizeCaseStateName(state.state_name) === normalizeCaseStateName(input.stateName))

  const stateName = matched?.state_name ?? input.stateName ?? 'Unknown'
  const meta = CASE_STATE_META[normalizeCaseStateName(stateName)] ?? { labelTh: stateName, color: '#64748B' }
  return {
    stateId: matched?.state_id ?? resolvedStateId,
    stateName,
    label: `${meta.labelTh}${stateName && meta.labelTh !== stateName ? ` (${stateName})` : ''}`,
    color: meta.color,
  }
}

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
