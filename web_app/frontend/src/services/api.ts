import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { LoginResponse, User } from '../types/auth'
import { DashboardStats, ClusterHealth } from '../types/dashboard'
import { AlertStats } from '../types/alert'
import { ComplianceSummary } from '../types/compliance'
import { KpiSummary, KpiTimelinePoint, KpiStorageForecast } from '../types/kpi'
import { InfraNode, InfraNodeStatus } from '../types/infra'
import { safeStorage } from '../utils/safeStorage'

const BASE = import.meta.env.VITE_API_BASE_URL || '/wazuh/api'
const APP_BASE = (import.meta.env.VITE_BASE_PATH || '/wazuh').replace(/\/+$/, '') || '/'
const LOGIN_PATH = `${APP_BASE}/login`
let isRedirectingToLogin = false

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = safeStorage.getItem('token')
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
})

api.interceptors.response.use(
  (r: AxiosResponse) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      safeStorage.removeItem('token')
      safeStorage.removeItem('user')
      if (!isRedirectingToLogin && window.location.pathname !== LOGIN_PATH) {
        isRedirectingToLogin = true
        window.location.replace(LOGIN_PATH)
      }
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (username: string, password: string): Promise<AxiosResponse<LoginResponse>> => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return api.post<LoginResponse>('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  },
  me: (): Promise<AxiosResponse<User>> => api.get<User>('/auth/me'),
  logout: (): Promise<AxiosResponse<void>> => api.post<void>('/auth/logout'),
}

export const dashboardApi = {
  stats:       (timeRange = '24h'): Promise<AxiosResponse<DashboardStats>> => api.get<DashboardStats>('/dashboard/stats', { params: { time_range: timeRange } }),
  threatStats: (timeRange = '24h'): Promise<AxiosResponse<any>>            => api.get<any>('/dashboard/threat_stats', { params: { time_range: timeRange } }),
  cluster:     (): Promise<AxiosResponse<ClusterHealth>>                   => api.get<ClusterHealth>('/dashboard/cluster'),
  agents:      (): Promise<AxiosResponse<any>>                             => api.get<any>('/dashboard/agents'),
  sources:     (timeRange = '24h'): Promise<AxiosResponse<any>>            => api.get<any>('/dashboard/sources', { params: { time_range: timeRange } }),
  attackMap:   (timeRange = '24h'): Promise<AxiosResponse<any>>            => api.get<any>('/dashboard/attack_map', { params: { time_range: timeRange } }),
}

export const alertsApi = {
  list:   (params: Record<string, any> = {}): Promise<AxiosResponse<any>> => api.get<any>('/alerts', { params }),
  recent: (limit = 20, level = 7): Promise<AxiosResponse<any>> => api.get<any>('/alerts/recent', { params: { limit, level } }),
  stats:  (timeRange = '24h', level = 12): Promise<AxiosResponse<AlertStats>> => api.get<AlertStats>('/alerts/stats', { params: { time_range: timeRange, level } }),
  facets: (timeRange = '24h', level = 12): Promise<AxiosResponse<any>> => api.get<any>('/alerts/facets', { params: { time_range: timeRange, level } }),
  setSeverityOverride: (data: {
    scope: 'single' | 'rule'
    alert_id?: string
    rule_id?: string
    original_level: number
    tuned_level: number
    reason: string
  }): Promise<AxiosResponse<any>> => api.post<any>('/alerts/severity-override', data),
  export: (params: Record<string, any> = {}): Promise<AxiosResponse<Blob>> => api.get<Blob>('/alerts/export', { params, responseType: 'blob' }),
}

export const investigateApi = {
  search: (q: string, type = 'auto', timeRange = '30d', size = 500): Promise<AxiosResponse<any>> =>
    api.get<any>('/investigate', { params: { q, type, time_range: timeRange, size } }),
  enrich: (ip: string): Promise<AxiosResponse<any>> => api.get<any>(`/investigate/enrich?ip=${encodeURIComponent(ip)}`),
}

export const iocApi = {
  search:       (q: string): Promise<AxiosResponse<any>> =>
    api.get<any>(`/ioc/search?q=${encodeURIComponent(q)}`),
  history:      (q: string, timeRange = '30d', limit = 100): Promise<AxiosResponse<any>> =>
    api.get<any>(`/ioc/history?q=${encodeURIComponent(q)}&time_range=${timeRange}&limit=${limit}`),
  listCustom:   (params: Record<string, any> = {}): Promise<AxiosResponse<any>> =>
    api.get<any>('/ioc/custom', { params }),
  addCustom:    (data: any): Promise<AxiosResponse<any>> =>
    api.post<any>('/ioc/custom', data),
  deleteCustom: (id: string | number): Promise<AxiosResponse<any>> =>
    api.delete<any>(`/ioc/custom/${id}`),
  stats:        (): Promise<AxiosResponse<any>> =>
    api.get<any>('/ioc/stats'),
  // Wazuh CDB sync
  cdbSync:      (): Promise<AxiosResponse<any>> =>
    api.post<any>('/ioc/cdb-sync'),
  cdbStatus:    (): Promise<AxiosResponse<any>> =>
    api.get<any>('/ioc/cdb-status'),
}

export const searchApi = {
  flow: (params: {
    q?: string; port?: number; srcport?: number; dstport?: number;
    srcip?: string; dstip?: string; proto?: string;
    direction?: string; action?: string; agent?: string; source_family?: string;
    time_range?: string; size?: number;
    rule_id?: string; group?: string;
  }): Promise<AxiosResponse<any>> =>
    api.get<any>('/search/flow', { params }),

  portListeners: (params: { port?: number; proto?: string }): Promise<AxiosResponse<any>> =>
    api.get<any>('/search/port-listeners', { params }),

  suggest: (q: string): Promise<AxiosResponse<any>> =>
    api.get<any>('/search/suggest', { params: { q } }),
}

function normalizeComplianceParams(input: any = {}): Record<string, any> {
  if (typeof input === 'string') {
    return { time_range: input }
  }
  return input
}

export const complianceApi = {
  summary: (params: any = {}): Promise<AxiosResponse<ComplianceSummary>> => api.get<ComplianceSummary>('/compliance/summary', { params: normalizeComplianceParams(params) }),
  frameworks: (params: any = {}): Promise<AxiosResponse<any>> => api.get<any>('/compliance/frameworks', { params: normalizeComplianceParams(params) }),
  agents: (params: any = {}): Promise<AxiosResponse<any>> => api.get<any>('/compliance/agents', { params: normalizeComplianceParams(params) }),
  sca: (params: any = {}): Promise<AxiosResponse<any>> => api.get<any>('/compliance/sca', { params: normalizeComplianceParams(params) }),
  vulnerabilities: (params: any = {}): Promise<AxiosResponse<any>> => api.get<any>('/compliance/vulnerabilities', { params: normalizeComplianceParams(params) }),
  alerts: (params: any = {}): Promise<AxiosResponse<any>> => api.get<any>('/compliance/alerts', { params: normalizeComplianceParams(params) }),
  evidence: (params: any = {}): Promise<AxiosResponse<any>> => api.get<any>('/compliance/evidence', { params: normalizeComplianceParams(params) }),
  export: (params: any = {}): Promise<AxiosResponse<Blob>> => api.get<Blob>('/compliance/export', { params: normalizeComplianceParams(params), responseType: 'blob' }),
}

export const assetsApi = {
  devices: (timeRange = '7d'): Promise<AxiosResponse<any>> => api.get<any>(`/assets/devices?time_range=${timeRange}`),
  detail: (identifier: string, timeRange = '30d'): Promise<AxiosResponse<any>> =>
    api.get<any>(`/assets/devices/${encodeURIComponent(identifier)}?time_range=${timeRange}`),
  stats: (timeRange = '7d'): Promise<AxiosResponse<any>> => api.get<any>(`/assets/stats?time_range=${timeRange}`),
  dhcp: (timeRange = '7d'): Promise<AxiosResponse<any>> => api.get<any>(`/assets/dhcp?time_range=${timeRange}`),
  sessions: (timeRange = '7d'): Promise<AxiosResponse<any>> => api.get<any>(`/assets/sessions?time_range=${timeRange}`),
}

export const kpiApi = {
  summary: (): Promise<AxiosResponse<KpiSummary>> => api.get<KpiSummary>('/kpi/summary'),
  timeline: (days = 30): Promise<AxiosResponse<KpiTimelinePoint[]>> => api.get<KpiTimelinePoint[]>(`/kpi/timeline?days=${days}`),
  storageForecast: (): Promise<AxiosResponse<KpiStorageForecast>> => api.get<KpiStorageForecast>('/kpi/storage-forecast'),
}

export const infraApi = {
  status: (): Promise<AxiosResponse<InfraNodeStatus[]>> => api.get<InfraNodeStatus[]>('/infra/status'),
  nodes: (): Promise<AxiosResponse<InfraNode[]>> => api.get<InfraNode[]>('/infra/nodes'),
}

export const adminApi = {
  // Rules
  listRules: (): Promise<AxiosResponse<any>> => api.get<any>('/admin/rules'),
  getRule: (filename: string): Promise<AxiosResponse<any>> => api.get<any>(`/admin/rules/${filename}`),
  saveRule: (filename: string, content: string): Promise<AxiosResponse<any>> =>
    api.put<any>(`/admin/rules/${filename}`, content, { headers: { 'Content-Type': 'text/plain' } }),
  deploy: (): Promise<AxiosResponse<any>> => api.post<any>('/admin/deploy'),
  // Decoders
  listDecoders: (): Promise<AxiosResponse<any>> => api.get<any>('/admin/decoders'),
  getDecoder: (filename: string): Promise<AxiosResponse<any>> => api.get<any>(`/admin/decoders/${filename}`),
  saveDecoder: (filename: string, content: string): Promise<AxiosResponse<any>> =>
    api.put<any>(`/admin/decoders/${filename}`, content, { headers: { 'Content-Type': 'text/plain' } }),
  // CDB Lists
  listCdbLists: (): Promise<AxiosResponse<any>> => api.get<any>('/admin/lists'),
  getCdbList: (filename: string): Promise<AxiosResponse<any>> => api.get<any>(`/admin/lists/${encodeURIComponent(filename)}`),
  saveCdbList: (filename: string, content: string): Promise<AxiosResponse<any>> =>
    api.put<any>(`/admin/lists/${encodeURIComponent(filename)}`, content, { headers: { 'Content-Type': 'text/plain' } }),
  // Wazuh Config (ossec.conf)
  getWazuhConfig: (): Promise<AxiosResponse<any>> => api.get<any>('/admin/wazuh-config'),
  saveWazuhConfig: (content: string): Promise<AxiosResponse<any>> =>
    api.put<any>('/admin/wazuh-config', content, { headers: { 'Content-Type': 'text/plain' } }),
  // System Status
  getSystemStatus: (): Promise<AxiosResponse<any>> => api.get<any>('/admin/system-status'),
  // Alert Tuning
  listTuning: (): Promise<AxiosResponse<any>> => api.get<any>('/admin/tuning'),
  listTuningHistory: (params: Record<string, any> = {}): Promise<AxiosResponse<any>> =>
    api.get<any>('/admin/tuning/history', { params }),
  addTuning: (data: any): Promise<AxiosResponse<any>> => api.post<any>('/admin/tuning', data),
  deployTuningToWazuh: (): Promise<AxiosResponse<any>> => api.post<any>('/admin/tuning/deploy-wazuh'),
  updateTuningStatus: (id: string | number, status: string): Promise<AxiosResponse<any>> => api.patch<any>(`/admin/tuning/${id}`, { status }),
  deleteTuning: (id: string | number): Promise<AxiosResponse<any>> => api.delete<any>(`/admin/tuning/${id}`),
  // Users
  listUsers: (): Promise<AxiosResponse<any>> => api.get<any>('/admin/users'),
  createUser: (data: any): Promise<AxiosResponse<any>> => api.post<any>('/admin/users', data),
  updateUser: (id: string | number, data: any): Promise<AxiosResponse<any>> => api.patch<any>(`/admin/users/${id}`, data),
  // Config
  getConfig: (): Promise<AxiosResponse<any>> => api.get<any>('/admin/config'),
  saveConfig: (data: any): Promise<AxiosResponse<any>> => api.put<any>('/admin/config', data),
  // ISM Retention
  listIsmPolicies: (): Promise<AxiosResponse<any>> => api.get<any>('/admin/ism/policies'),
  getIsmPolicy: (policyId: string): Promise<AxiosResponse<any>> => api.get<any>(`/admin/ism/policies/${encodeURIComponent(policyId)}`),
  saveIsmPolicy: (policyId: string, data: any): Promise<AxiosResponse<any>> => api.put<any>(`/admin/ism/policies/${encodeURIComponent(policyId)}`, data),
  deleteIsmPolicy: (policyId: string): Promise<AxiosResponse<any>> => api.delete<any>(`/admin/ism/policies/${encodeURIComponent(policyId)}`),
  explainIsmIndex: (indexName: string): Promise<AxiosResponse<any>> => api.get<any>(`/admin/ism/explain/${encodeURIComponent(indexName)}`),
  // Audit
  auditLog: (limit = 100): Promise<AxiosResponse<any>> => api.get<any>(`/admin/audit?limit=${limit}`),
  // Log Source Control
  listLogSources: (): Promise<AxiosResponse<any>> => api.get<any>('/admin/log-sources'),
  disableLogSource: (key: string, reason: string): Promise<AxiosResponse<any>> =>
    api.post<any>(`/admin/log-sources/${key}/disable`, { reason }),
  enableLogSource: (key: string): Promise<AxiosResponse<any>> =>
    api.post<any>(`/admin/log-sources/${key}/enable`),
}

export const pushApi = {
  getVapidKey: (): Promise<AxiosResponse<{ publicKey: string }>> => api.get('/push/vapid-key'),
  subscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<AxiosResponse<any>> =>
    api.post('/push/subscribe', sub),
  unsubscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<AxiosResponse<any>> =>
    api.delete('/push/subscribe', { data: sub }),
}

export const reportsApi = {
  getIncidentCases: (timeRange = '7d', limit = 500): Promise<AxiosResponse<any>> =>
    api.get<any>('/reports/incident-cases', { params: { time_range: timeRange, limit } }),
  exportIncidentCases: (fmt = 'excel', timeRange = '7d', limit = 5000): Promise<AxiosResponse<Blob>> =>
    api.get<Blob>('/reports/incident-cases/export', { params: { fmt, time_range: timeRange, limit }, responseType: 'blob' }),
}

export default api
