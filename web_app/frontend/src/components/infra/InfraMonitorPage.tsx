import { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Grid, Typography, LinearProgress, Stack, Divider, IconButton, useTheme, Tooltip, Skeleton,
} from '@mui/material'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded'
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import { infraApi } from '../../services/api'
import { DiskUsage, InfraNodeStatus } from '../../types/infra'
import { PageShell } from '../ui/layout'
import SectionCard from '../ui/SectionCard'
import { StatusPill } from '../ui/StatusPill'
import { EmptyState } from '../ui/EmptyState'
import { SEV_COLOR, getBorder, getSoftBg } from '../ui/tokens'

const REFRESH_MS = 15000

const NODE_SHORT_LABEL: Record<string, string> = {
  master: 'Master', worker: 'Worker', indexer: 'Indexer', dashboard: 'Dashboard', soar: 'SOAR',
}

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

/** Disk partitions for a node, falling back to the legacy single root-disk fields. */
function nodeDisks(node: InfraNodeStatus): DiskUsage[] {
  if (node.disks && node.disks.length) return node.disks
  if (node.disk_total != null) {
    return [{ mount: '/', total: node.disk_total, used: node.disk_used ?? 0, free: node.disk_free ?? 0, percent: node.disk_percent ?? 0 }]
  }
  return []
}

function GaugeRow({ icon, label, percent, detail }: {
  icon: ReactNode; label: string; percent?: number; detail?: string
}) {
  const color = usageColor(percent)
  return (
    <Box sx={{ mb: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Box sx={{ display: 'flex', color, fontSize: 16, flexShrink: 0 }}>{icon}</Box>
          <Typography sx={{
            fontSize: 12.5, fontWeight: 600, color: 'text.secondary',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {label}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color, fontFamily: '"IBM Plex Mono", monospace', flexShrink: 0 }}>
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

// ─── Cluster Health Hero ───────────────────────────────────────────────────

const CLUSTER_RISK_CONFIG = {
  critical: {
    icon: ErrorRoundedIcon, color: SEV_COLOR.critical,
    title: 'คลัสเตอร์มีปัญหา', desc: 'พบเครื่องที่ไม่ตอบสนองหรือมีข้อผิดพลาด ควรตรวจสอบโดยเร่งด่วน',
  },
  high: {
    icon: WarningRoundedIcon, color: SEV_COLOR.high,
    title: 'ต้องตรวจสอบทรัพยากร', desc: 'พบการใช้งาน CPU หรือพื้นที่ดิสก์สูงผิดปกติในบางเครื่อง',
  },
  watch: {
    icon: WarningAmberRoundedIcon, color: SEV_COLOR.medium,
    title: 'เฝ้าระวัง', desc: 'การใช้งานทรัพยากรเริ่มสูง ควรติดตามอย่างใกล้ชิด',
  },
  normal: {
    icon: CheckCircleRoundedIcon, color: SEV_COLOR.low,
    title: 'คลัสเตอร์ทำงานปกติ', desc: 'ทุกเครื่องออนไลน์ และทรัพยากรอยู่ในระดับปกติทั้งหมด',
  },
} as const

function HeroStat({ icon, label, value, percent, color, subtitle, isDark }: {
  icon: ReactNode; label: string; value: string; percent?: number; color: string; subtitle?: string; isDark: boolean
}) {
  return (
    <Box sx={{
      position: 'relative', overflow: 'hidden', borderRadius: '14px',
      p: '12px 14px', flex: '1 1 150px', minWidth: 0,
      border: `1px solid ${color}28`,
      background: isDark
        ? `linear-gradient(145deg, ${color}1A 0%, rgba(15,18,32,0.9) 60%)`
        : `linear-gradient(145deg, ${color}0E 0%, rgba(255,255,255,0.95) 60%)`,
      boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : `0 2px 10px ${color}12`,
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      '&:hover': { transform: 'translateY(-3px)', borderColor: `${color}50` },
    }}>
      <Box sx={{ position: 'absolute', bottom: -12, right: -8, opacity: 0.07, color, fontSize: 64, display: 'flex' }}>
        {icon}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', color, fontSize: 15 }}>{icon}</Box>
        <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>
          {label}
        </Typography>
      </Box>
      <Typography sx={{
        fontSize: '1.6rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.03em',
        fontFamily: '"IBM Plex Mono",monospace', position: 'relative', zIndex: 1,
      }}>
        {value}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={Math.min(percent ?? 0, 100)}
        sx={{
          mt: 1, height: 5, borderRadius: 3, bgcolor: getSoftBg(color, 14),
          opacity: percent != null ? 1 : 0,
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
          position: 'relative', zIndex: 1,
        }}
      />
      {subtitle && (
        <Typography sx={{
          fontSize: 10.5, color: 'text.disabled', mt: 0.6, position: 'relative', zIndex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  )
}

interface ClusterHealthHeroProps {
  nodes: InfraNodeStatus[]
  onlineCount: number
  avgCpu?: number
  avgMem?: number
  maxDisk?: number
  maxDiskLabel?: string
  alertCount: number
  isLoading: boolean
}

function ClusterHealthHero({ nodes, onlineCount, avgCpu, avgMem, maxDisk, maxDiskLabel, alertCount, isLoading }: ClusterHealthHeroProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const total = nodes.length || 5

  if (isLoading) {
    return (
      <Box sx={{
        borderRadius: '14px', p: '18px 20px',
        border: `1px solid ${getBorder(isDark, 'default')}`,
        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 2 }}>
          <Skeleton variant="rounded" width={52} height={52} sx={{ borderRadius: '12px' }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width={180} height={20} />
            <Skeleton width={320} height={16} sx={{ mt: 0.5 }} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" sx={{ flex: '1 1 150px', height: 92, borderRadius: '14px' }} />
          ))}
        </Box>
      </Box>
    )
  }

  const risk: keyof typeof CLUSTER_RISK_CONFIG =
    onlineCount < total
      ? 'critical'
      : alertCount > 0
        ? 'high'
        : (maxDisk ?? 0) >= 75 || (avgCpu ?? 0) >= 75
          ? 'watch'
          : 'normal'

  const cfg = CLUSTER_RISK_CONFIG[risk]
  const Icon = cfg.icon
  const bgSoft = getSoftBg(cfg.color, 12)
  const borderSoft = getSoftBg(cfg.color, 18)

  return (
    <Box sx={{
      borderRadius: '14px', p: '18px 20px',
      border: `1px solid ${borderSoft}`,
      background: isDark
        ? `linear-gradient(135deg, ${bgSoft} 0%, rgba(16,12,32,0.4) 100%)`
        : `linear-gradient(135deg, ${bgSoft} 0%, rgba(255,255,255,0.5) 100%)`,
      backdropFilter: isDark ? 'blur(10px)' : 'none',
      boxShadow: isDark
        ? `0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 ${borderSoft}`
        : '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, flexWrap: 'wrap', mb: 2 }}>
        <Box sx={{
          width: 52, height: 52, borderRadius: '12px', bgcolor: `${cfg.color}15`,
          border: `1.5px solid ${cfg.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon sx={{ fontSize: 28, color: cfg.color }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{cfg.title}</Typography>
            {risk === 'critical' && (
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color, animation: 'infra-pulse 2s ease-in-out infinite' }} />
            )}
          </Box>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.4 }}>{cfg.desc}</Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 1.25 }}>
            {nodes.map(n => {
              const color = n.status === 'online' ? SEV_COLOR.low : n.status === 'offline' ? SEV_COLOR.critical : SEV_COLOR.medium
              return (
                <Tooltip key={n.id} title={`${n.name} · ${n.ip} · ${n.status.toUpperCase()}`}>
                  <Box sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: '20px',
                    bgcolor: `${color}12`, border: `1px solid ${color}30`,
                  }}>
                    <Box sx={{
                      width: 7, height: 7, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 5px ${color}`,
                      animation: n.status === 'online' ? 'infra-pulse 2.5s ease-in-out infinite' : 'none',
                    }} />
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color }}>
                      {NODE_SHORT_LABEL[n.id] ?? n.id}
                    </Typography>
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <HeroStat
          icon={<DnsRoundedIcon />} label="เครื่อง Online" value={`${onlineCount}/${total}`}
          percent={total ? (onlineCount / total) * 100 : undefined}
          color={onlineCount === total ? SEV_COLOR.low : SEV_COLOR.critical}
          subtitle="servers" isDark={isDark}
        />
        <HeroStat
          icon={<SpeedRoundedIcon />} label="CPU เฉลี่ย" value={avgCpu != null ? `${avgCpu.toFixed(1)}%` : '—'}
          percent={avgCpu} color={usageColor(avgCpu)} subtitle="ทุกเครื่อง online" isDark={isDark}
        />
        <HeroStat
          icon={<MemoryRoundedIcon />} label="RAM เฉลี่ย" value={avgMem != null ? `${avgMem.toFixed(1)}%` : '—'}
          percent={avgMem} color={usageColor(avgMem)} subtitle="ทุกเครื่อง online" isDark={isDark}
        />
        <HeroStat
          icon={<StorageRoundedIcon />} label="Disk สูงสุด" value={maxDisk != null ? `${maxDisk.toFixed(1)}%` : '—'}
          percent={maxDisk} color={usageColor(maxDisk)} subtitle={maxDiskLabel || 'ไม่มีข้อมูล'} isDark={isDark}
        />
        <HeroStat
          icon={<ReportProblemRoundedIcon />} label="แจ้งเตือน" value={String(alertCount)}
          color={alertCount > 0 ? SEV_COLOR.critical : SEV_COLOR.low} subtitle="ต้องตรวจสอบ" isDark={isDark}
        />
      </Box>

      <style>{`@keyframes infra-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </Box>
  )
}

// ─── Node Card ───────────────────────────────────────────────────────────

function NodeCard({ node }: { node: InfraNodeStatus }) {
  const memPct = node.mem_total ? (node.mem_used! / node.mem_total) * 100 : undefined
  const disks = nodeDisks(node)
  const maxDiskPct = disks.length ? Math.max(...disks.map(d => d.percent)) : 0
  const worst = Math.max(node.cpu_percent ?? 0, maxDiskPct, memPct ?? 0)
  const accent = node.status === 'online' ? usageColor(worst) : SEV_COLOR.critical
  const minHeight = node.status === 'online' ? 340 + Math.max(disks.length - 1, 0) * 58 : 220

  return (
    <SectionCard
      title={node.name}
      subtitle={node.hostname ? `${node.ip} · ${node.role} · ${node.hostname}` : `${node.ip} · ${node.role}`}
      icon={<DnsRoundedIcon />}
      accent={accent}
      minHeight={minHeight}
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
          {disks.map(d => (
            <GaugeRow
              key={d.mount}
              icon={<StorageRoundedIcon fontSize="inherit" />}
              label={`Disk (${d.mount})`}
              percent={d.percent}
              detail={`${formatBytes(d.used)} / ${formatBytes(d.total)}`}
            />
          ))}
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

// ─── Page ────────────────────────────────────────────────────────────────

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
  const avgMem = onlineNodes.length
    ? onlineNodes.reduce((sum, n) => sum + (n.mem_total ? (n.mem_used! / n.mem_total) * 100 : 0), 0) / onlineNodes.length
    : undefined

  let maxDisk: number | undefined
  let maxDiskLabel: string | undefined
  onlineNodes.forEach(n => {
    nodeDisks(n).forEach(d => {
      if (maxDisk == null || d.percent > maxDisk) {
        maxDisk = d.percent
        maxDiskLabel = `${NODE_SHORT_LABEL[n.id] ?? n.id} · ${d.mount}`
      }
    })
  })

  const alertCount = nodes.filter(n => {
    if (n.status !== 'online') return true
    if ((n.cpu_percent ?? 0) >= 90) return true
    return nodeDisks(n).some(d => d.percent >= 85)
  }).length

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
      <Box sx={{ mb: 3 }}>
        <ClusterHealthHero
          nodes={nodes}
          onlineCount={onlineCount}
          avgCpu={avgCpu}
          avgMem={avgMem}
          maxDisk={maxDisk}
          maxDiskLabel={maxDiskLabel}
          alertCount={alertCount}
          isLoading={isLoading}
        />
      </Box>

      <Grid container spacing={2.5}>
        {nodes.map(node => (
          <Grid item xs={12} md={6} lg={4} key={node.id}>
            <NodeCard node={node} />
          </Grid>
        ))}
      </Grid>
    </PageShell>
  )
}
