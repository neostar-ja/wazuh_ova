import { useState } from 'react'
import { Box, FormControl, MenuItem, Select, Skeleton, Typography } from '@mui/material'
import { format } from 'date-fns'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import GppBadRoundedIcon from '@mui/icons-material/GppBadRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import FlagRoundedIcon from '@mui/icons-material/FlagRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import { PageShell, ContentGrid } from '../ui/layout'
import { SectionCard } from '../ui/SectionCard'
import MetricCard from '../ui/MetricCard'
import { SEV_COLOR, BRAND, fmtN } from '../ui/tokens'
import { useAttackMapData } from './useAttackMapData'
import AttackWorldMap from './AttackWorldMap'
import TopCountriesPanel from './TopCountriesPanel'
import TopSourceIPsPanel from './TopSourceIPsPanel'
import LiveAttackFeed from './LiveAttackFeed'
import AttackTimelineChart from './AttackTimelineChart'

const TIME_OPTS = [
  { v: '24h', l: '24 ชั่วโมง' },
  { v: '7d', l: '7 วัน' },
  { v: '30d', l: '30 วัน' },
]

const TACTIC_COLOR: Record<string, string> = {
  'initial-access': SEV_COLOR.critical, 'execution': SEV_COLOR.critical, 'persistence': SEV_COLOR.high,
  'privilege-escalation': SEV_COLOR.high, 'defense-evasion': SEV_COLOR.medium, 'credential-access': SEV_COLOR.medium,
  'discovery': SEV_COLOR.low, 'lateral-movement': SEV_COLOR.info, 'collection': SEV_COLOR.info,
  'command-and-control': '#A855F7', 'exfiltration': '#A855F7', 'impact': '#EC4899',
}

interface MitreBreakdownProps {
  data?: { name: string; count: number }[]
  loading?: boolean
}

function MitreBreakdown({ data = [], loading = false }: MitreBreakdownProps) {
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <SectionCard
      title="MITRE ATT&CK Tactics"
      subtitle="เทคนิคการโจมตีที่พบบ่อย (Level 12+)"
      icon={<SecurityRoundedIcon sx={{ fontSize: 16 }} />}
      iconColor="#A855F7"
      size="sm"
      density="compact"
      loading={loading}
      empty={!data.length ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1 }}>
          <SecurityRoundedIcon sx={{ fontSize: 26, color: 'text.disabled', opacity: 0.35 }} />
          <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 500 }}>ไม่พบ MITRE ATT&amp;CK mapping</Typography>
        </Box>
      ) : undefined}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {data.slice(0, 8).map((item) => {
          const color = TACTIC_COLOR[item.name.toLowerCase()] || BRAND.primary
          const pct = Math.round((item.count / max) * 100)
          return (
            <Box key={item.name} sx={{
              p: '6px 10px', borderRadius: '9px', bgcolor: `${color}08`, border: `1px solid ${color}18`,
              transition: 'all 0.18s ease', '&:hover': { bgcolor: `${color}12` },
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '3px', bgcolor: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'capitalize', fontWeight: 500 }}>
                    {item.name.replace(/-/g, ' ')}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 800, color, fontFamily: '"IBM Plex Mono",monospace' }}>
                  {fmtN(item.count)}
                </Typography>
              </Box>
              <Box sx={{ height: 5, borderRadius: '4px', bgcolor: `${color}18`, overflow: 'hidden' }}>
                <Box sx={{
                  height: '100%', width: `${pct}%`, borderRadius: '4px', bgcolor: color,
                  transition: 'width 0.7s ease', boxShadow: `0 0 8px ${color}60`,
                }} />
              </Box>
            </Box>
          )
        })}
        {loading && !data.length && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={26} />)}
      </Box>
    </SectionCard>
  )
}

function AttackMapPage() {
  const [timeRange, setTimeRange] = useState('24h')
  const { data, isLoading, isFetching, dataUpdatedAt } = useAttackMapData(timeRange)

  const total = data?.total ?? 0
  const critical = data?.critical ?? 0
  const high = data?.high ?? 0
  const uniqueCountries = data?.unique_countries ?? 0
  const uniqueIps = data?.unique_ips ?? 0
  const byCountry = data?.by_country ?? []
  const bySrcip = data?.by_srcip ?? []
  const liveFeed = data?.live_feed ?? []
  const timeline = data?.timeline ?? []
  const byMitre = data?.by_mitre ?? []

  const actions = (
    <FormControl size="small" sx={{ minWidth: 130 }}>
      <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} sx={{ fontSize: 13, borderRadius: '10px' }}>
        {TIME_OPTS.map((t) => <MenuItem key={t.v} value={t.v}>{t.l}</MenuItem>)}
      </Select>
    </FormControl>
  )

  return (
    <PageShell
      title="แผนที่การโจมตี"
      subtitle="Real-time Cyber Attack Map · แหล่งที่มาของภัยคุกคามทั่วโลกที่มุ่งสู่ WUH"
      variant="console"
      status={isFetching ? 'live' : 'ready'}
      statusLabel={isFetching ? 'LIVE · UPDATING' : 'LIVE'}
      lastUpdated={dataUpdatedAt ? format(new Date(dataUpdatedAt), 'dd/MM/yyyy HH:mm:ss') : undefined}
      actions={actions}
      maxWidth="full"
    >
      {/* KPI strip */}
      <ContentGrid variant="auto-fit" minCardWidth={170} gap="md">
        <MetricCard
          title="เหตุการณ์ทั้งหมด" value={total} subtitle="Level 12+"
          icon={<PublicRoundedIcon sx={{ fontSize: 40 }} />} color={BRAND.primary} loading={isLoading}
        />
        <MetricCard
          title="Critical" value={critical} subtitle="ระดับวิกฤต" accent
          icon={<GppBadRoundedIcon sx={{ fontSize: 40 }} />} color={SEV_COLOR.critical} loading={isLoading}
        />
        <MetricCard
          title="High" value={high} subtitle="ระดับสูง"
          icon={<WarningAmberRoundedIcon sx={{ fontSize: 40 }} />} color={SEV_COLOR.high} loading={isLoading}
        />
        <MetricCard
          title="ประเทศต้นทาง" value={uniqueCountries} subtitle="Unique Countries"
          icon={<FlagRoundedIcon sx={{ fontSize: 40 }} />} color={SEV_COLOR.medium} loading={isLoading}
        />
        <MetricCard
          title="IP โจมตี" value={uniqueIps} subtitle="Unique Source IPs"
          icon={<RouterRoundedIcon sx={{ fontSize: 40 }} />} color="#A855F7" loading={isLoading}
        />
      </ContentGrid>

      {/* Map + side panels */}
      <ContentGrid variant="dashboard" gap="md">
        <Box className="col-span-12 lg:col-span-8" sx={{ height: { xs: 460, md: 600, lg: 720 } }}>
          <AttackWorldMap countries={byCountry} loading={isLoading} />
        </Box>
        <Box className="col-span-12 lg:col-span-4" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TopCountriesPanel countries={byCountry} loading={isLoading} />
          <TopSourceIPsPanel srcips={bySrcip} loading={isLoading} />
          <LiveAttackFeed feed={liveFeed} loading={isLoading} />
        </Box>
      </ContentGrid>

      {/* Timeline + MITRE breakdown */}
      <ContentGrid variant="dashboard" gap="md">
        <Box className="col-span-12 lg:col-span-8">
          <AttackTimelineChart timeline={timeline} loading={isLoading} />
        </Box>
        <Box className="col-span-12 lg:col-span-4">
          <MitreBreakdown data={byMitre} loading={isLoading} />
        </Box>
      </ContentGrid>
    </PageShell>
  )
}

export default AttackMapPage
