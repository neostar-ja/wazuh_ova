import { Box, Chip, Grid, Stack, Typography } from '@mui/material'
import ComputerRoundedIcon from '@mui/icons-material/ComputerRounded'
import SectionCard from '../ui/SectionCard'
import EmptyState from '../ui/EmptyState'
import MetricCard from '../ui/MetricCard'
import type { HostContext } from '../../types'
import { MonoValue, formatTimestamp } from './utils'

interface HostContextPanelProps {
  hostContext?: HostContext
}

export function HostContextPanel({ hostContext }: HostContextPanelProps) {
  return (
    <SectionCard
      title="Host Context"
      subtitle="บริบทของ agent/host ที่เชื่อมโยงได้จาก Wazuh API และ asset telemetry"
      icon={<ComputerRoundedIcon />}
      accent="#22C55E"
      empty={
        <EmptyState
          title="ยังไม่พบ host context"
          description="query นี้ยัง map ไปยัง Wazuh agent หรือ asset context ไม่ได้ หรือ backend ยังไม่มีข้อมูล host posture สำหรับ entity นี้"
        />
      }
    >
      {!hostContext ? null : (
        <Stack spacing={2}>
          <Grid container spacing={1.25}>
            <Grid item xs={6} md={3}>
              <MetricCard title="Vulnerabilities" value={hostContext.vulnerabilitiesCount} color="#EF4444" compact accent />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetricCard title="Critical CVEs" value={hostContext.criticalCves} color="#F17422" compact accent />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetricCard title="High CVEs" value={hostContext.highCves} color="#EAB308" compact accent />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetricCard title="SCA Failed" value={hostContext.scaFailed} color="#38BDF8" compact accent />
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
                  Agent
                </Typography>
                <Stack spacing={1}>
                  <MonoValue value={hostContext.agentName} />
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>ID: {hostContext.agentId ?? '—'}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Status: {hostContext.agentStatus ?? '—'}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>OS: {hostContext.os ?? '—'}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>IP: {hostContext.ipAddress ?? '—'}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Last seen: {formatTimestamp(hostContext.lastSeen)}</Typography>
                </Stack>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
                  Group / Source Status
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {hostContext.groups?.length ? hostContext.groups.map((group) => <Chip key={group} label={group} variant="outlined" />) : <Chip label="No group" />}
                  {hostContext.sourceStatus ? <Chip label={`Source: ${hostContext.sourceStatus}`} color="info" /> : null}
                  <Chip label={`Compliance Issues ${hostContext.complianceIssues}`} color={hostContext.complianceIssues > 0 ? 'warning' : 'success'} />
                </Stack>
              </Box>
            </Grid>
          </Grid>

          {hostContext.packages?.length ? (
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.9 }}>
                Packages Impacted
              </Typography>
              <Grid container spacing={1}>
                {hostContext.packages.slice(0, 8).map((pkg) => (
                  <Grid item xs={12} md={6} key={`${pkg.name}-${pkg.version ?? 'n/a'}`}>
                    <Box sx={{ p: 1.2, borderRadius: '14px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.12)' }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{pkg.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{pkg.version ?? 'Unknown version'}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : null}

          {hostContext.openPorts?.length ? (
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.9 }}>
                Observed Open Ports
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {hostContext.openPorts.slice(0, 12).map((port) => (
                  <Chip
                    key={`${port.port}-${port.protocol ?? 'tcp'}`}
                    label={`${port.port}/${port.protocol ?? 'tcp'}${port.process ? ` · ${port.process}` : ''}`}
                    sx={{ '& .MuiChip-label': { fontFamily: '"IBM Plex Mono", monospace' } }}
                  />
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      )}
    </SectionCard>
  )
}

export default HostContextPanel
