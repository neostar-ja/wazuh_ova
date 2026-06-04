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
  event_color: string
  event_in_summary: boolean
  event_tags?: string
}

export interface ShuffleWorkflow {
  id: string
  name: string
  description: string
  tags: string[]
  status: string
  execution_count?: number
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
  id: number
  iris_case_id: number
  title: string
  description?: string
  source: string
  ev_type: string
  sha256?: string
  content_preview?: string
  raw_json?: string
  linked_task_id?: number
  created_by?: string
  created_at?: string
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
  }) => api.post(`/soar/iris/cases/${caseId}/timeline`, data),

  // Shuffle
  getShuffleWorkflows: () => api.get('/soar/shuffle/workflows'),

  triggerBlock: (ip: string, caseId?: number, analyst?: string) =>
    api.post('/soar/shuffle/trigger', { type: 'block', ip, case_id: caseId, analyst }),

  triggerEscalate: (caseId: number, analyst?: string, title?: string) =>
    api.post('/soar/shuffle/trigger', { type: 'escalate', case_id: caseId, analyst, reason: title }),

  triggerTriage: (payload: object) =>
    api.post('/soar/shuffle/trigger', { type: 'triage', ...payload }),

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

  // Evidence (local)
  getCaseEvidence: (caseId: number) => api.get(`/soar/cases/${caseId}/evidence`),
  createCaseEvidence: (caseId: number, data: Partial<CaseEvidence>) => api.post(`/soar/cases/${caseId}/evidence`, data),
  deleteCaseEvidence: (caseId: number, evId: number) => api.delete(`/soar/cases/${caseId}/evidence/${evId}`),

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
