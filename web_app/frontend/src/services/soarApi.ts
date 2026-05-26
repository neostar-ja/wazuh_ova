import api from './api'

export interface IrisAlert {
  alert_id: number
  alert_title: string
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
  case_close_date: string
  opened_by: string
  owner: string
  state_name: string | null
  client_name: string
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

export const soarApi = {
  getStats: () => api.get('/soar/stats'),

  getIrisAlerts: (params?: { page?: number; per_page?: number; status_id?: number }) =>
    api.get('/soar/iris/alerts', { params }),

  getIrisCases: (params?: { page?: number; per_page?: number }) =>
    api.get('/soar/iris/cases', { params }),

  createIrisAlert: (data: {
    title: string
    description: string
    severity_id?: number
    tags?: string
    ioc_value?: string
  }) => api.post('/soar/iris/alerts', data),

  getShuffleWorkflows: () => api.get('/soar/shuffle/workflows'),

  triggerBlock: (ip: string, caseId?: number, analyst?: string) =>
    api.post('/soar/shuffle/trigger', { type: 'block', ip, case_id: caseId, analyst }),

  triggerEscalate: (caseId: number, analyst?: string, title?: string) =>
    api.post('/soar/shuffle/trigger', { type: 'escalate', case_id: caseId, analyst, reason: title }),

  triggerTriage: (payload: object) =>
    api.post('/soar/shuffle/trigger', { type: 'triage', ...payload }),

  getMispStats: () => api.get('/soar/misp/stats'),

  searchMisp: (q: string, type?: string) =>
    api.get('/soar/misp/search', { params: { q, ...(type ? { type } : {}) } }),
}
