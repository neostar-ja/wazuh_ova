/**
 * Search Metrics Grid
 * Displays KPI metrics for search results
 * Uses shared MetricCard from ui/ for consistent Design System alignment
 */

import { Box } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import DesktopWindowsRoundedIcon from '@mui/icons-material/DesktopWindowsRounded'
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded'
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import { MetricCard } from '../ui/MetricCard'
import { BRAND, SEV_COLOR } from '../ui/tokens'

interface SearchMetricsGridProps {
  total: number
  matchedPort?: number | null
  uniqueSrcIp: number
  uniqueDstIp: number
  uniqueAgent: number
  inboundCount: number
  outboundCount: number
}

export function SearchMetricsGrid({
  total,
  matchedPort,
  uniqueSrcIp,
  uniqueDstIp,
  uniqueAgent,
  inboundCount,
  outboundCount,
}: SearchMetricsGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: matchedPort ? 'repeat(7, 1fr)' : 'repeat(6, 1fr)',
        },
        gap: 1.5,
      }}
    >
      <MetricCard
        title="Total Events"
        value={total}
        icon={<SearchRoundedIcon />}
        color={BRAND.purple}
        accent
      />
      {matchedPort != null && (
        <MetricCard
          title="Matched Port"
          value={String(matchedPort)}
          icon={<RouterRoundedIcon />}
          color={BRAND.orange}
          accent
        />
      )}
      <MetricCard
        title="Src IPs"
        value={uniqueSrcIp}
        icon={<PublicRoundedIcon />}
        color={SEV_COLOR.high}
        subtitle="unique sources"
      />
      <MetricCard
        title="Dst IPs"
        value={uniqueDstIp}
        icon={<DeviceHubRoundedIcon />}
        color={BRAND.purpleLight}
        subtitle="unique targets"
      />
      <MetricCard
        title="Agents"
        value={uniqueAgent}
        icon={<DesktopWindowsRoundedIcon />}
        color="#38BDF8"
        subtitle="unique agents"
      />
      <MetricCard
        title="Inbound"
        value={inboundCount}
        icon={<SouthWestRoundedIcon />}
        color={SEV_COLOR.critical}
        subtitle="traffic in"
      />
      <MetricCard
        title="Outbound"
        value={outboundCount}
        icon={<NorthEastRoundedIcon />}
        color={SEV_COLOR.low}
        subtitle="traffic out"
      />
    </Box>
  )
}
