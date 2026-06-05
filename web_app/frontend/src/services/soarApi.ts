import api from './api'

// ── IRIS Types ─────────────────────────────────────────────────────────────────

export interface IrisAlert {
  alert_id: number
  alert_title: string
  alert_description?: string
  alert_source: string
  alert_source_ref: string
  alert_source_event_time: string
  alert_creation_time: string
  alert_tags: string | null
  alert_severity_id: number
  alert_status_id: number
  alert_note: string | null
  alert_owner_id: number | null
  alert_customer_id: number
  severity: { severity_id: number; severity_name: string }
  status: { status_id: number; status_name: string }
  owner: { user_login: string } | null
  iocs: Array<{ ioc_value: string; ioc_type: { type_name: string } }>
  cases: unknown[]
}

export interface IrisCase {
  case_id: number
  case_name: string
  case_description: string
  case_open_date: string
  case_close_date: string | null
  opened_by: string
  owner: string
  state_name: string | null
  client_name: string
}

export interface IrisCaseDetail {
  case_id: number
  case_name: string
  case_description: string
  open_date: string
  close_date: string | null
  owner: string
  status_id: number
}

export interface CaseNoteGroup {
  group_id: number
  group_title: string
  group_uuid: string
  notes: CaseNote[]
}

export interface CaseNote {
  note_id: number
  note_title: string
  note_content: string
  note_creationdate: string
  note_lastupdate: string
  modification_history?: Record<string, unknown>
}

export interface CaseIoc {
  ioc_id: number
  ioc_value: string
  ioc_description: string
  ioc_type: { type_name: string }
  ioc_tlp: { tlp_name: string; tlp_bscolor: string }
  ioc_uuid: string
  ioc_misp_link?: string
}

export interface CaseTimelineEvent {
  event_id: number
  event_title: string
  event_content: string
  event_date: string
  event_date_wtz?: string
  event_tz?: string
  event_color: string
  event_in_summary: boolean
  event_tags?: string
}

export type ShuffleWorkflowType =
  | 'triage' | 'escalate' | 'block_ip' | 'block_port'
  | 'enrichment' | 'evidence' | 'notify' | 'misp_push'
  | 'timeline' | 'investigate' | 'manual' | 'unknown'

export interface ShuffleWorkflow {
  id: string
  name: string
  description: string
  tags: string[]
  status: string
  execution_count?: number
  updated_at?: string
}

export interface TriggerPayload {
  type: string
  workflow_id?: string
  workflow_name?: string
  workflow_type?: string
  ip?: string
  target_ip?: string
  port?: number
  protocol?: string
  target_value?: string
  target_type?: string
  case_id?: number
  analyst?: string
  reason?: string
  title?: string
  severity?: string
  source: string
  simulation?: boolean
  dry_run?: boolean
}

export interface TriggerResult {
  ok: boolean
  mode: string
  action: string
  target?: string
  ip?: string
  port?: number
  protocol?: string
  case_id?: number
  message?: string
  message_th?: string
  execution_id?: string
  action_id?: number
  iris_note_added?: boolean
}

export interface ShuffleActionHistoryItem {
  id: number
  iris_case_id?: number
  action_type: string
  workflow_type?: string
  workflow_name?: string
  target?: string
  port?: number
  protocol?: string
  analyst?: string
  reason?: string
  payload_summary?: string
  execution_id?: string
  response_mode: string
  response_ok: boolean
  response_detail?: string
  created_by?: string
  created_at?: string
}

export interface ApprovalRequest {
  request_id?: number
  case_id?: number
  action_type: string
  target?: string
  reason?: string
  requested_by?: string
  requested_at?: string
  approver?: string
  approval_status: 'pending' | 'approved' | 'rejected'
  approved_at?: string
  rollback_plan?: string
  business_impact?: string
}

export interface MispAttribute {
  id: string
  type: string
  category: string
  value: string
  event_id: string
  to_ids: boolean
  timestamp: string
  Event?: { info: string; threat_level_id: string }
}

// ── Local extension types ──────────────────────────────────────────────────────

export interface CaseTask {
  id: number
  iris_case_id: number
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: string
  tags?: string
  template_id?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface CaseEvidence {
  id: string
  iris_case_id: number
  title: string
  description?: string
  source: string
  ev_type: string
  severity?: number | null
  sha256?: string
  content_preview?: string
  raw_json?: unknown
  linked_task_id?: number
  created_by?: string
  created_at?: string
  ioc_value?: string
  ioc_type?: string
  source_ref?: string
  source_url?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  live?: boolean
}

export interface CaseEvidenceSource {
  id: string
  label: string
  status: 'connected' | 'not_configured' | 'error' | 'no_data'
  count: number
  note?: string
  error?: string
}

export interface CaseEvidenceSummary {
  live: boolean
  generated_at: string
  time_range: string
  total: number
  by_source: Record<string, number>
  by_type: Record<string, number>
  ioc_total: number
  ioc_queried: number
  ioc_limit_applied: boolean
  ioc_values: string[]
}

export interface CaseEvidenceResponse {
  evidence: CaseEvidence[]
  summary: CaseEvidenceSummary
  sources: CaseEvidenceSource[]
}

export interface CaseActivityEntry {
  id: number
  iris_case_id: number
  action: string
  detail?: string
  username?: string
  created_at?: string
}

export interface ShuffleAction {
  id: number
  iris_case_id?: number
  action_type: string
  payload_summary?: string
  execution_id?: string
  response_mode: string
  response_ok: boolean
  response_detail?: string
  created_by?: string
  created_at?: string
}

export interface PlaybookTemplate {
  id: string
  name: string
  description: string
  category: string
  tasks: { title: string; priority: string; status: string }[]
}

export interface IntegrationHealth {
  id: string
  name: string
  category: string
  icon: string
  configured: boolean
  connected: boolean
  status: 'connected' | 'not_configured' | 'error' | 'degraded' | 'simulation_only'
  label: string
  simulation_only?: boolean
  note?: string
  detail?: Record<string, unknown>
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' ? value as UnknownRecord : {}
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

export function extractCaseIocs(payload: unknown): CaseIoc[] {
  const root = asRecord(payload)
  const data = root.data

  if (Array.isArray(data)) {
    return data as CaseIoc[]
  }

  const dataRecord = asRecord(data)
  return asArray<CaseIoc>(dataRecord.ioc)
}

// ── IOC type options (IRIS standard) ──────────────────────────────────────────
export const IOC_TYPES = [
  { id: 76, name: 'ip-dst' },
  { id: 77, name: 'ip-src' },
  { id: 78, name: 'domain' },
  { id: 79, name: 'url' },
  { id: 80, name: 'md5' },
  { id: 81, name: 'sha256' },
  { id: 11, name: 'email-src' },
  { id: 17, name: 'filename' },
]

// ── API ────────────────────────────────────────────────────────────────────────

export const soarApi = {
  // Stats
  getStats: () => api.get('/soar/stats'),

  // Alerts
  getIrisAlerts: (params?: { page?: number; per_page?: number; status_id?: number }) =>
    api.get('/soar/iris/alerts', { params }),

  getIrisAlert: (alertId: number) =>
    api.get(`/soar/iris/alerts/${alertId}`),

  createIrisAlert: (data: {
    title: string
    description: string
    severity_id?: number
    tags?: string
    ioc_value?: string
  }) => api.post('/soar/iris/alerts', data),

  updateIrisAlert: (alertId: number, data: {
    alert_status_id?: number
    alert_severity_id?: number
    alert_note?: string
  }) => api.put(`/soar/iris/alerts/${alertId}`, data),

  escalateIrisAlerts: (data: {
    alert_ids: number[]
    case_title: string
    note?: string
  }) => api.post('/soar/iris/alerts/escalate', data),

  // Cases
  getIrisCases: (params?: { page?: number; per_page?: number }) =>
    api.get('/soar/iris/cases', { params }),

  getIrisCase: (caseId: number) =>
    api.get(`/soar/iris/cases/${caseId}`),

  createIrisCase: (data: {
    case_name: string
    case_description?: string
    customer_id?: number
  }) => api.post('/soar/iris/cases', data),

  updateIrisCase: (caseId: number, data: {
    case_name?: string
    case_description?: string
  }) => api.put(`/soar/iris/cases/${caseId}`, data),

  closeIrisCase: (caseId: number) =>
    api.post(`/soar/iris/cases/${caseId}/close`, {}),

  reopenIrisCase: (caseId: number) =>
    api.post(`/soar/iris/cases/${caseId}/reopen`, {}),

  // Notes
  getCaseNotes: (caseId: number) =>
    api.get(`/soar/iris/cases/${caseId}/notes`),

  addCaseNote: (caseId: number, data: {
    title: string
    content: string
    group_id?: number
    group_title?: string
  }) => api.post(`/soar/iris/cases/${caseId}/notes`, data),

  // IOCs
  getCaseIocs: (caseId: number) =>
    api.get(`/soar/iris/cases/${caseId}/iocs`),

  addCaseIoc: (caseId: number, data: {
    ioc_value: string
    ioc_type_id?: number
    ioc_tlp_id?: number
    ioc_description?: string
  }) => api.post(`/soar/iris/cases/${caseId}/iocs`, data),

  // Timeline
  getCaseTimeline: (caseId: number) =>
    api.get(`/soar/iris/cases/${caseId}/timeline`),

  addCaseTimelineEvent: (caseId: number, data: {
    title: string
    content: string
    event_date: string
    event_tz?: string
    color?: string
  }) => api.post(`/soar/iris/cases/${caseId}/timeline`, data),

  // Shuffle
  getShuffleWorkflows: () => api.get('/soar/shuffle/workflows'),

  triggerWorkflow: (payload: TriggerPayload) =>
    api.post<TriggerResult>('/soar/shuffle/trigger', payload),

  triggerBlock: (ip: string, caseId?: number, analyst?: string) =>
    api.post('/soar/shuffle/trigger', {
      type: 'block', ip, case_id: caseId, analyst, simulation: true, dry_run: true,
    }),

  triggerEscalate: (caseId: number, analyst?: string, title?: string) =>
    api.post('/soar/shuffle/trigger', { type: 'escalate', case_id: caseId, analyst, reason: title }),

  triggerTriage: (payload: object) =>
    api.post('/soar/shuffle/trigger', { type: 'triage', ...payload }),

  // Shuffle Action History — standalone (all actions, not per-case)
  getAllShuffleActions: (params?: { limit?: number; case_id?: number }) =>
    api.get<{ actions: ShuffleActionHistoryItem[] }>('/soar/shuffle/actions', { params }),

  // MISP
  getMispStats: () => api.get('/soar/misp/stats'),

  searchMisp: (q: string, type?: string) =>
    api.get('/soar/misp/search', { params: { q, ...(type ? { type } : {}) } }),

  // Health & Integrations
  getHealth: () => api.get('/soar/health'),
  getIntegrations: () => api.get('/soar/integrations'),

  // Case full detail (single-call summary+counts)
  getIrisCaseFull: (caseId: number) => api.get(`/soar/iris/cases/${caseId}/full`),

  // Tasks (local)
  getCaseTasks: (caseId: number) => api.get(`/soar/cases/${caseId}/tasks`),
  createCaseTask: (caseId: number, data: Partial<CaseTask>) => api.post(`/soar/cases/${caseId}/tasks`, data),
  updateCaseTask: (caseId: number, taskId: number, data: Partial<CaseTask>) => api.put(`/soar/cases/${caseId}/tasks/${taskId}`, data),
  deleteCaseTask: (caseId: number, taskId: number) => api.delete(`/soar/cases/${caseId}/tasks/${taskId}`),

  // Evidence (live aggregation)
  getCaseEvidence: (caseId: number) => api.get<CaseEvidenceResponse>(`/soar/cases/${caseId}/evidence`),

  // Activity Log (local)
  getCaseActivity: (caseId: number) => api.get(`/soar/cases/${caseId}/activity`),

  // Shuffle Action History (local)
  getShuffleActions: (caseId: number) => api.get(`/soar/cases/${caseId}/shuffle-actions`),
  recordShuffleAction: (caseId: number, data: Partial<ShuffleAction>) => api.post(`/soar/cases/${caseId}/shuffle-actions`, data),

  // Playbook Templates
  getPlaybookTemplates: () => api.get('/soar/playbook-templates'),
  applyTemplate: (caseId: number, templateId: string) =>
    api.post(`/soar/cases/${caseId}/apply-template`, null, { params: { template_id: templateId } }),
}
