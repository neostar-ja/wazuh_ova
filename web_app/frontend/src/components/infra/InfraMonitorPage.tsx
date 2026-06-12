import { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Grid, Typography, LinearProgress, Stack, Divider, IconButton, useTheme,
} from '@mui/material'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded'
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded'
import { infraApi } from '../../services/api'
import { InfraNodeStatus } from '../../types/infra'
import { PageShell } from '../ui/layout'
import { MetricCard } from '../ui/MetricCard'
import SectionCard from '../ui/SectionCard'
import { StatusPill } from '../ui/StatusPill'
import { EmptyState } from '../ui/EmptyState'
import { SEV_COLOR, getSoftBg } from '../ui/tokens'

const REFRESH_MS = 15000

function formatBytes(bytes?: number): string {
  if (bytes == null) return '—'
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`
}

function formatUptime(seconds?: number): string {
  if (seconds == null) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function usageColor(pct?: number): string {
  if (pct == null) return SEV_COLOR.info
  if (pct >= 90) return SEV_COLOR.critical
  if (pct >= 75) return SEV_COLOR.high
  if (pct >= 50) return SEV_COLOR.medium
  return SEV_COLOR.low
}

function GaugeRow({ icon, label, percent, detail }: {
  icon: ReactNode; label: string; percent?: number; detail?: string
}) {
  const color = usageColor(percent)
  return (
    <Box sx={{ mb: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ display: 'flex', color, fontSize: 16 }}>{icon}</Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color, fontFamily: '"IBM Plex Mono", monospace' }}>
          {percent != null ? `${percent.toFixed(1)}%` : '—'}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(percent ?? 0, 100)}
        sx={{
          height: 6, borderRadius: 3,
          bgcolor: getSoftBg(color, 12),
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
      {detail && (
        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.4 }}>{detail}</Typography>
      )}
    </Box>
  )
}

function ServiceChip({ name, status }: { name: string; status: string }) {
  const pillStatus = status === 'active' ? 'active' : status === 'failed' ? 'error' : status === 'inactive' ? 'inactive' : 'unknown'
  return <StatusPill status={pillStatus} label={name} size="small" />
}

function NodeCard({ node }: { node: InfraNodeStatus }) {
  const memPct = node.mem_total ? (node.mem_used! / node.mem_total) * 100 : undefined
  const worst = Math.max(node.cpu_percent ?? 0, node.disk_percent ?? 0, memPct ?? 0)
  const accent = node.status === 'online' ? usageColor(worst) : SEV_COLOR.critical

  return (
    <SectionCard
      title={node.name}
      subtitle={`${node.ip} · ${node.role}`}
      icon={<DnsRoundedIcon />}
      accent={accent}
      minHeight={node.status === 'online' ? 340 : 220}
      action={
        <StatusPill
          status={node.status === 'online' ? 'active' : node.status === 'offline' ? 'error' : 'warning'}
          label={node.status === 'online' ? `${node.latency_ms} ms` : node.status.toUpperCase()}
          animated={node.status === 'online'}
        />
      }
    >
      {node.status === 'online' ? (
        <>
          <GaugeRow
            icon={<SpeedRoundedIcon fontSize="inherit" />}
            label={`CPU (${node.cores ?? '-'} cores)`}
            percent={node.cpu_percent}
          />
          <GaugeRow
            icon={<MemoryRoundedIcon fontSize="inherit" />}
            label="RAM"
            percent={memPct}
            detail={`${formatBytes(node.mem_used)} / ${formatBytes(node.mem_total)}`}
          />
          <GaugeRow
            icon={<StorageRoundedIcon fontSize="inherit" />}
            label="Disk (/)"
            percent={node.disk_percent}
            detail={`${formatBytes(node.disk_used)} / ${formatBytes(node.disk_total)}`}
          />
          <Divider sx={{ my: 1.5, opacity: 0.4 }} />
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.25 }}>
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
              Load avg: {node.load1?.toFixed(2)} / {node.load5?.toFixed(2)} / {node.load15?.toFixed(2)}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
              Uptime: {formatUptime(node.uptime_seconds)}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
            {Object.entries(node.services_status ?? {}).map(([svc, st]) => (
              <ServiceChip key={svc} name={svc} status={st} />
            ))}
          </Stack>
        </>
      ) : (
        <EmptyState
          type="offline"
          title={node.status === 'offline' ? 'เครื่องไม่ตอบสนอง (Offline)' : 'เกิดข้อผิดพลาด'}
          description={node.error || 'ไม่สามารถเชื่อมต่อ SSH เพื่อดึงข้อมูลได้'}
          compact
        />
      )}
    </SectionCard>
  )
}

export default function InfraMonitorPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { data: nodes = [], isLoading, isFetching, dataUpdatedAt, refetch } = useQuery<InfraNodeStatus[]>({
    queryKey: ['infra-status'],
    queryFn: () => infraApi.status().then(r => r.data),
    refetchInterval: REFRESH_MS,
  })

  const onlineNodes = nodes.filter(n => n.status === 'online')
  const onlineCount = onlineNodes.length
  const avgCpu = onlineNodes.length
    ? onlineNodes.reduce((sum, n) => sum + (n.cpu_percent ?? 0), 0) / onlineNodes.length
    : undefined
  const maxDisk = onlineNodes.length
    ? Math.max(...onlineNodes.map(n => n.disk_percent ?? 0))
    : undefined
  const alertCount = nodes.filter(n =>
    n.status !== 'online' || (n.disk_percent ?? 0) >= 85 || (n.cpu_percent ?? 0) >= 90
  ).length

  return (
    <PageShell
      variant="dashboard"
      title="ตรวจสอบเซิร์ฟเวอร์ระบบ"
      subtitle="สถานะ CPU, RAM, Disk และบริการของเครื่อง Wazuh Cluster (10.251.151.11 - 15)"
      status={isLoading ? undefined : (onlineCount === nodes.length ? 'live' : 'warning')}
      lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('th-TH') : undefined}
      actions={
        <IconButton
          onClick={() => refetch()}
          disabled={isFetching}
          sx={{
            color: isDark ? '#EDE9FA' : '#1A1033',
            border: `1px solid ${isDark ? 'rgba(123,91,164,0.3)' : 'rgba(123,91,164,0.2)'}`,
            borderRadius: '10px',
          }}
        >
          <RefreshRoundedIcon sx={{
            fontSize: 20,
            animation: isFetching ? 'spin 1s linear infinite' : 'none',
            '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
          }} />
        </IconButton>
      }
    >
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="เครื่อง Online"
            value={`${onlineCount}/${nodes.length || 5}`}
            subtitle="servers"
            icon={<DnsRoundedIcon />}
            color={onlineCount === nodes.length && nodes.length > 0 ? SEV_COLOR.low : SEV_COLOR.critical}
            loading={isLoading}
            accent
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="CPU เฉลี่ย"
            value={avgCpu != null ? `${avgCpu.toFixed(1)}%` : '—'}
            subtitle="ทุกเครื่อง online"
            icon={<SpeedRoundedIcon />}
            color={usageColor(avgCpu)}
            loading={isLoading}
            accent
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="Disk สูงสุด"
            value={maxDisk != null ? `${maxDisk.toFixed(1)}%` : '—'}
            subtitle="เครื่องที่ใช้พื้นที่มากสุด"
            icon={<StorageRoundedIcon />}
            color={usageColor(maxDisk)}
            loading={isLoading}
            accent
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="แจ้งเตือน"
            value={alertCount}
            subtitle="ต้องตรวจสอบ"
            icon={<ReportProblemRoundedIcon />}
            color={alertCount > 0 ? SEV_COLOR.critical : SEV_COLOR.low}
            loading={isLoading}
            accent
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {nodes.map(node => (
          <Grid item xs={12} md={6} lg={4} key={node.id}>
            <NodeCard node={node} />
          </Grid>
        ))}
      </Grid>
    </PageShell>
  )
}
