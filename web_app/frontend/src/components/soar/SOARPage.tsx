import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import WorkspacesRoundedIcon from '@mui/icons-material/WorkspacesRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecord'

import { PageShell } from '../ui/layout'
import { MetricCard } from '../ui/MetricCard'
import { soarApi, IrisAlert } from '../../services/soarApi'
import { BRAND, SEV_COLOR, getSoftBg } from '../ui/tokens'

import OverviewTab from './tabs/OverviewTab'
import IRISTab    from './tabs/IRISTab'
import ShuffleTab from './tabs/ShuffleTab'
import MISPTab    from './tabs/MISPTab'
import IntegrationHealthPanel from './IntegrationHealthPanel'

// ── Status Pill ────────────────────────────────────────────────────────────────

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Box className="flex items-center gap-1.5 px-3 py-1 rounded-full"
      sx={{
        background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${ok ? '#22C55E' : '#EF4444'}30`,
      }}>
      <FiberManualRecordRoundedIcon sx={{ fontSize: 7, color: ok ? '#22C55E' : '#EF4444',
        animation: ok ? 'pulseGlow 2.5s ease-in-out infinite' : 'none' }} />
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: ok ? '#22C55E' : '#EF4444', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
    </Box>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SOARPage() {
  const [activeTab, setActiveTab] = useState(0)
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['soar-stats'],
    queryFn: () => soarApi.getStats().then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: alertsResp } = useQuery({
    queryKey: ['iris-alerts'],
    queryFn: () => soarApi.getIrisAlerts({ per_page: 50 }).then(r => r.data),
    enabled: activeTab === 0,
    refetchInterval: 60000,
  })

  const iris    = stats?.iris    ?? {}
  const shuffle = stats?.shuffle ?? {}
  const alerts: IrisAlert[] = alertsResp?.data?.alerts ?? []

  const TABS = [
    { label: 'ภาพรวม',          icon: <BarChartRoundedIcon      sx={{ fontSize: 15 }} /> },
    { label: 'จัดการเคส (IRIS)',  icon: <NotificationsActiveRoundedIcon sx={{ fontSize: 15 }} />, badge: iris.open_alerts },
    { label: 'ระบบอัตโนมัติ',    icon: <WorkspacesRoundedIcon    sx={{ fontSize: 15 }} /> },
    { label: 'ข้อมูลภัยคุกคาม',  icon: <ShieldRoundedIcon        sx={{ fontSize: 15 }} /> },
  ]

  return (
    <PageShell
      title="SOC Incident Response Workbench"
      subtitle="Shuffle SOAR · DFIR-IRIS · MISP · Wazuh · Investigate V2"
      breadcrumbs={[{ label: 'ศูนย์ปฏิบัติการ' }, { label: 'SOAR & IR' }]}
      status={iris.connected && shuffle.connected ? 'live' : 'offline'}
      statusLabel={iris.connected && shuffle.connected ? 'CONNECTED' : 'PARTIAL'}
      actions={
        <Box className="flex items-center gap-2 flex-wrap">
          <StatusPill ok={!!iris.connected}    label={`IRIS${iris.connected ? '' : ' OFFLINE'}`} />
          <StatusPill ok={!!shuffle.connected} label={`SHUFFLE${shuffle.connected ? '' : ' OFFLINE'}`} />
        </Box>
      }
    >
      {/* Integration Health Panel */}
      <Box className="mb-4">
        <IntegrationHealthPanel />
      </Box>

      {/* Metric cards */}
      <Box className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricCard
          title="การแจ้งเตือน IRIS"
          value={statsLoading ? undefined : (iris.total_alerts ?? 0)}
          loading={statsLoading}
          color={BRAND.purple}
          icon={<NotificationsActiveRoundedIcon />}
          subtitle={`${iris.open_alerts ?? 0} รายการเปิด`}
          accent
        />
        <MetricCard
          title="เคสสอบสวน"
          value={statsLoading ? undefined : (iris.total_cases ?? 0)}
          loading={statsLoading}
          color="#6366F1"
          icon={<FolderOpenRoundedIcon />}
          subtitle="เคสทั้งหมด"
          accent
        />
        <MetricCard
          title="Workflow อัตโนมัติ"
          value={statsLoading ? undefined : (shuffle.total_workflows ?? 0)}
          loading={statsLoading}
          color="#14B8A6"
          icon={<WorkspacesRoundedIcon />}
          subtitle="Shuffle SOAR"
          accent
        />
        <MetricCard
          title="สถานะระบบ SOAR"
          value={iris.connected && shuffle.connected ? 'OK' : 'ERR'}
          loading={false}
          color={iris.connected && shuffle.connected ? '#22C55E' : SEV_COLOR.critical}
          icon={<SecurityRoundedIcon />}
          subtitle="integration health"
          accent
        />
      </Box>

      {/* Main panel */}
      <Box className="rounded-2xl overflow-hidden"
        sx={{
          background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.9)',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(123,91,164,0.12)',
          backdropFilter: 'blur(12px)',
        }}>

        {/* Tab bar */}
        <Box sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.1)'}` }}>
          <Box className="flex items-center gap-0 px-2 pt-1 overflow-x-auto scrollbar-hide">
            {TABS.map((tab, i) => (
              <Box key={tab.label}
                onClick={() => setActiveTab(i)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 cursor-pointer select-none transition-all duration-150 whitespace-nowrap relative shrink-0"
                sx={{
                  color: activeTab === i ? BRAND.purple : textMuted,
                  fontWeight: activeTab === i ? 700 : 500,
                  fontSize: 12.5,
                  '&::after': activeTab === i ? {
                    content: '""', position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                    background: BRAND.purple, borderRadius: '2px 2px 0 0',
                  } : {},
                  '&:hover': activeTab !== i ? { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)' } : {},
                }}>
                {tab.icon}
                {tab.label}
                {(tab.badge ?? 0) > 0 && (
                  <Box className="px-1.5 rounded-full text-[9px] font-bold"
                    sx={{ background: getSoftBg(SEV_COLOR.high, 20), color: SEV_COLOR.high }}>
                    {tab.badge}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Tab content */}
        <Box className="p-4 sm:p-5">
          {activeTab === 0 && <OverviewTab alerts={alerts} loading={!alertsResp && statsLoading} />}
          {activeTab === 1 && <IRISTab    irisUrl={iris.iris_url} />}
          {activeTab === 2 && <ShuffleTab shuffleUrl={shuffle.shuffle_url} />}
          {activeTab === 3 && <MISPTab    mispUrl={stats?.misp?.misp_url ?? 'https://10.251.151.15:4430'} />}
        </Box>
      </Box>
    </PageShell>
  )
}
