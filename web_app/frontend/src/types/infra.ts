export type InfraNodeStatusValue = 'online' | 'offline' | 'error'

export interface InfraNode {
  id: string
  name: string
  ip: string
  role: string
  services: string[]
}

export interface InfraNodeStatus extends InfraNode {
  status: InfraNodeStatusValue
  latency_ms?: number
  error?: string
  hostname?: string
  cpu_percent?: number
  cores?: number
  mem_total?: number
  mem_used?: number
  mem_avail?: number
  disk_total?: number
  disk_used?: number
  disk_free?: number
  disk_percent?: number
  load1?: number
  load5?: number
  load15?: number
  uptime_seconds?: number
  services_status?: Record<string, string>
}
