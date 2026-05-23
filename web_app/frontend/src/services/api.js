import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL || '/wazuh/api'
const APP_BASE = (import.meta.env.VITE_BASE_PATH || '/wazuh').replace(/\/+$/, '') || '/'
const LOGIN_PATH = `${APP_BASE}/login`
let isRedirectingToLogin = false

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!isRedirectingToLogin && window.location.pathname !== LOGIN_PATH) {
        isRedirectingToLogin = true
        window.location.replace(LOGIN_PATH)
      }
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (username, password) => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  },
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

export const dashboardApi = {
  stats:   (timeRange = '24h') => api.get('/dashboard/stats', { params: { time_range: timeRange } }),
  cluster: ()                  => api.get('/dashboard/cluster'),
  agents:  ()                  => api.get('/dashboard/agents'),
  sources: (timeRange = '24h') => api.get('/dashboard/sources', { params: { time_range: timeRange } }),
}

export const alertsApi = {
  list:   (params = {}) => api.get('/alerts', { params }),
  recent: (limit = 20, level = 7) => api.get('/alerts/recent', { params: { limit, level } }),
  stats:  (timeRange = '24h', level = 1) => api.get('/alerts/stats', { params: { time_range: timeRange, level } }),
  export: (params = {}) => api.get('/alerts/export', { params, responseType: 'blob' }),
}

export const investigateApi = {
  search: (q, type = 'auto', timeRange = '30d', size = 500) =>
    api.get('/investigate', { params: { q, type, time_range: timeRange, size } }),
  enrich: ip => api.get(`/investigate/enrich?ip=${encodeURIComponent(ip)}`),
}

export const iocApi = {
  search:      q          => api.get(`/ioc/search?q=${encodeURIComponent(q)}`),
  history:     (q, timeRange = '30d', limit = 100) =>
    api.get(`/ioc/history?q=${encodeURIComponent(q)}&time_range=${timeRange}&limit=${limit}`),
  listCustom:  (params={}) => api.get('/ioc/custom', { params }),
  addCustom:   data        => api.post('/ioc/custom', data),
  deleteCustom:id          => api.delete(`/ioc/custom/${id}`),
  stats:       ()          => api.get('/ioc/stats'),
}

function normalizeComplianceParams(input = {}) {
  if (typeof input === 'string') {
    return { time_range: input }
  }
  return input
}

export const complianceApi = {
  summary: (params = {}) => api.get('/compliance/summary', { params: normalizeComplianceParams(params) }),
  frameworks: (params = {}) => api.get('/compliance/frameworks', { params: normalizeComplianceParams(params) }),
  agents: (params = {}) => api.get('/compliance/agents', { params: normalizeComplianceParams(params) }),
  sca: (params = {}) => api.get('/compliance/sca', { params: normalizeComplianceParams(params) }),
  vulnerabilities: (params = {}) => api.get('/compliance/vulnerabilities', { params: normalizeComplianceParams(params) }),
  alerts: (params = {}) => api.get('/compliance/alerts', { params: normalizeComplianceParams(params) }),
  evidence: (params = {}) => api.get('/compliance/evidence', { params: normalizeComplianceParams(params) }),
  export: (params = {}) => api.get('/compliance/export', { params: normalizeComplianceParams(params), responseType: 'blob' }),
}

export const assetsApi = {
  devices: (timeRange = '7d') => api.get(`/assets/devices?time_range=${timeRange}`),
  detail: (identifier, timeRange = '30d') =>
    api.get(`/assets/devices/${encodeURIComponent(identifier)}?time_range=${timeRange}`),
  stats: (timeRange = '7d') => api.get(`/assets/stats?time_range=${timeRange}`),
  dhcp: (timeRange = '7d') => api.get(`/assets/dhcp?time_range=${timeRange}`),
  sessions: (timeRange = '7d') => api.get(`/assets/sessions?time_range=${timeRange}`),
}

export const kpiApi = {
  summary: () => api.get('/kpi/summary'),
  timeline: (days = 30) => api.get(`/kpi/timeline?days=${days}`),
}

export const adminApi = {
  // Rules
  listRules: () => api.get('/admin/rules'),
  getRule: filename => api.get(`/admin/rules/${filename}`),
  saveRule: (filename, content) =>
    api.put(`/admin/rules/${filename}`, content, { headers: { 'Content-Type': 'text/plain' } }),
  deploy: () => api.post('/admin/deploy'),
  // Decoders
  listDecoders: () => api.get('/admin/decoders'),
  getDecoder: filename => api.get(`/admin/decoders/${filename}`),
  saveDecoder: (filename, content) =>
    api.put(`/admin/decoders/${filename}`, content, { headers: { 'Content-Type': 'text/plain' } }),
  // CDB Lists
  listCdbLists: () => api.get('/admin/lists'),
  getCdbList: filename => api.get(`/admin/lists/${encodeURIComponent(filename)}`),
  saveCdbList: (filename, content) =>
    api.put(`/admin/lists/${encodeURIComponent(filename)}`, content, { headers: { 'Content-Type': 'text/plain' } }),
  // Wazuh Config (ossec.conf)
  getWazuhConfig: () => api.get('/admin/wazuh-config'),
  saveWazuhConfig: content =>
    api.put('/admin/wazuh-config', content, { headers: { 'Content-Type': 'text/plain' } }),
  // System Status
  getSystemStatus: () => api.get('/admin/system-status'),
  // Alert Tuning
  listTuning: () => api.get('/admin/tuning'),
  addTuning: data => api.post('/admin/tuning', data),
  updateTuningStatus: (id, status) => api.patch(`/admin/tuning/${id}`, { status }),
  deleteTuning: id => api.delete(`/admin/tuning/${id}`),
  // Users
  listUsers: () => api.get('/admin/users'),
  createUser: data => api.post('/admin/users', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  // Config
  getConfig: () => api.get('/admin/config'),
  saveConfig: data => api.put('/admin/config', data),
  // Audit
  auditLog: (limit = 100) => api.get(`/admin/audit?limit=${limit}`),
}

export default api
