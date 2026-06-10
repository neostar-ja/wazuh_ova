/**
 * Search Results Grid - Grid of Top Lists
 * Theme-aware: uses SectionCard-compatible layout
 */

import { Box, Grid } from '@mui/material'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import { TopList } from './SearchResultsCards'
import { Bucket } from './searchTypes'
import { SectionCard } from '../ui/SectionCard'
import { BRAND, SEV_COLOR } from '../ui/tokens'

interface SearchResultsGridProps {
  topSrcIp: Bucket[]
  topDstIp: Bucket[]
  topAgents: Bucket[]
  topProtocols: Bucket[]
  topLogSources: Bucket[]
  topCountries: Bucket[]
  onSelect?: (patch: Record<string, string>) => void
}

export function SearchResultsGrid({
  topSrcIp,
  topDstIp,
  topAgents,
  topProtocols,
  topLogSources,
  topCountries,
  onSelect,
}: SearchResultsGridProps) {
  const hasData =
    topSrcIp.length > 0 ||
    topDstIp.length > 0 ||
    topAgents.length > 0 ||
    topProtocols.length > 0 ||
    topLogSources.length > 0 ||
    topCountries.length > 0

  if (!hasData) return null

  return (
    <SectionCard
      title="Top Analysis"
      subtitle="IPs, Agents, Protocols, Sources และ Countries ที่พบบ่อยที่สุด"
      icon={<BarChartRoundedIcon />}
      iconColor={BRAND.purple}
      accent={BRAND.purple}
      size="md"
    >
      <Grid container spacing={2} sx={{ mt: 0.25 }}>
        {topSrcIp.length > 0 && (
          <Grid item xs={12} sm={6} lg={4}>
            <TopList
              title="Top Source IPs"
              items={topSrcIp}
              accent={SEV_COLOR.critical}
              onSelect={(value) => onSelect?.({ srcip: value })}
            />
          </Grid>
        )}

        {topDstIp.length > 0 && (
          <Grid item xs={12} sm={6} lg={4}>
            <TopList
              title="Top Destination IPs"
              items={topDstIp}
              accent={BRAND.purple}
              onSelect={(value) => onSelect?.({ dstip: value })}
            />
          </Grid>
        )}

        {topAgents.length > 0 && (
          <Grid item xs={12} sm={6} lg={4}>
            <TopList
              title="Top Agents / Hosts"
              items={topAgents}
              accent={SEV_COLOR.low}
              onSelect={(value) => onSelect?.({ agent: value })}
            />
          </Grid>
        )}

        {topProtocols.length > 0 && (
          <Grid item xs={12} sm={6} lg={4}>
            <TopList
              title="Top Protocols"
              items={topProtocols}
              accent={SEV_COLOR.medium}
              onSelect={(value) => onSelect?.({ proto: value })}
            />
          </Grid>
        )}

        {topLogSources.length > 0 && (
          <Grid item xs={12} sm={6} lg={4}>
            <TopList
              title="Top Log Sources"
              items={topLogSources}
              accent={BRAND.orange}
              onSelect={(value) => onSelect?.({ group: value })}
            />
          </Grid>
        )}

        {topCountries.length > 0 && (
          <Grid item xs={12} sm={6} lg={4}>
            <TopList
              title="Top Countries"
              items={topCountries}
              accent="#38BDF8"
            />
          </Grid>
        )}
      </Grid>
    </SectionCard>
  )
}
