import { Box } from '@mui/material'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import GppBadRoundedIcon from '@mui/icons-material/GppBadRounded'
import { SEV_COLOR, BRAND } from '../../ui/tokens'
import { AlertStats } from '../../../types/alert'
import { AlertMetricCard } from './shared'
import { ThreatDistributionPanel } from './ThreatDistributionPanel'
import { TopRulesPanel } from './TopRulesPanel'
import { AttackSurfacePanel } from './AttackSurfacePanel'

// ── Dashboard Section ─────────────────────────────────────────────────────────
interface DashboardSectionProps {
  stats?: AlertStats
  loading: boolean
  activeLevel: number
  onLevelClick: (level: number) => void
  onGroupClick: (group: string) => void
  onRuleClick: (id: string) => void
  onSrcIpClick: (ip: string) => void
  onSourceClick: (label: string) => void
  onCountryClick: (country: string) => void
  onAgentClick: (agent: string) => void
  navigate: (path: string) => void
}

export function DashboardSection({ stats, loading, activeLevel, onLevelClick, onRuleClick, onSrcIpClick, onSourceClick, onCountryClick, onAgentClick, navigate }: DashboardSectionProps) {
  const timeline = stats?.timeline || []
  const critical = stats?.by_severity?.critical || 0
  const high      = stats?.by_severity?.high || 0
  const highPlus  = critical + high
  const topSource   = (stats?.by_source || [])[0]
  const topAttacker = (stats?.by_srcip || [])[0]

  const ICON_CRITICAL  = <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19H3.5L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
  const ICON_HIGH      = <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12V11c0 4.52-3.02 8.79-7 10.07C8.02 19.79 5 15.52 5 11V6.3l7-3.12z"/><path d="M11 7h2v6h-2zM11 15h2v2h-2z"/></svg>
  const ICON_HIGHPLUS  = <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
  const ICON_SOURCE    = <RouterRoundedIcon />
  const ICON_ATTACKER  = <GppBadRoundedIcon />

  const critSparkline  = timeline.map(t => ({ timestamp: t.timestamp, count: t.severity_breakdown?.critical ?? 0 }))
  const highSparkline  = timeline.map(t => ({ timestamp: t.timestamp, count: t.severity_breakdown?.high ?? 0 }))
  const hpSparkline    = timeline.map(t => ({ timestamp: t.timestamp, count: (t.severity_breakdown?.critical ?? 0) + (t.severity_breakdown?.high ?? 0) }))

  return (
    <Box sx={{ mb: 1.5 }}>
      {/* ── 5 MetricHero cards — CSS grid เต็ม container ── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          lg: 'repeat(5, minmax(0, 1fr))',
        },
        gap: '14px',
        mb: 1.5,
        width: '100%',
      }}>
        <AlertMetricCard
          title="Critical" count={critical} color="#EF4444" icon={ICON_CRITICAL}
          sparklineData={critSparkline} isActive={activeLevel === 15} loading={loading}
          onClick={() => onLevelClick(activeLevel === 15 ? 12 : 15)}
          badge={critical > 0 ? 'LIVE' : undefined}
          accentLabel="≥15"
        />
        <AlertMetricCard
          title="High" count={high} color={SEV_COLOR.high} icon={ICON_HIGH}
          sparklineData={highSparkline} isActive={activeLevel === 12 && highPlus !== critical} loading={loading}
          onClick={() => onLevelClick(12)}
          accentLabel="12–14"
        />
        <AlertMetricCard
          title="High+ Total" count={highPlus} color={BRAND.primary} icon={ICON_HIGHPLUS}
          sparklineData={hpSparkline} isActive={activeLevel === 12} loading={loading}
          onClick={() => onLevelClick(12)}
          accentLabel="Crit+High"
        />
        <AlertMetricCard
          title="Top Source" count={topSource?.count} subtitle={topSource?.name}
          subtitleLabel="แหล่งข้อมูลสูงสุด"
          color="#3B82F6" icon={ICON_SOURCE} loading={loading}
          onClick={topSource ? () => onSourceClick(topSource.name) : undefined}
        />
        <AlertMetricCard
          title="Top Attacker" count={topAttacker?.count} subtitle={topAttacker?.name}
          subtitleLabel="IP โจมตีสูงสุด"
          color="#EC4899" icon={ICON_ATTACKER} loading={loading}
          onClick={topAttacker ? () => onSrcIpClick(topAttacker.name) : undefined}
        />
      </Box>

      {/* ── Actionable Insight Panel: 3 equal columns CSS grid ── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
        gap: '14px',
        width: '100%',
      }}>
        <ThreatDistributionPanel stats={stats} onSourceClick={onSourceClick} />
        <TopRulesPanel stats={stats} onRuleClick={onRuleClick} />
        <AttackSurfacePanel
          stats={stats}
          onSrcIpClick={onSrcIpClick}
          onCountryClick={onCountryClick}
          onAgentClick={onAgentClick}
          navigate={navigate}
        />
      </Box>
    </Box>
  )
}
