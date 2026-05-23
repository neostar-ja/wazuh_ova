import { Box, Chip, Divider, Stack, Typography } from '@mui/material'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded'
import LanRoundedIcon from '@mui/icons-material/LanRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import type { EntityProfile } from '../../types'
import SectionCard from '../ui/SectionCard'
import { CopyValueButton, MonoValue, formatTimestamp, queryTypeLabels } from './utils'

interface EntityProfileCardProps {
  profile: EntityProfile
}

function ProfileField({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  if (!value) return null
  return (
    <Box>
      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.3 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }}>
        <MonoValue value={value} />
        <CopyValueButton value={value} />
      </Stack>
    </Box>
  )
}

export function EntityProfileCard({ profile }: EntityProfileCardProps) {
  return (
    <SectionCard title="Entity Profile" subtitle="ข้อมูลตัวตนหลักที่เชื่อมโยงได้จาก investigation" icon={<BadgeRoundedIcon />} accent="#7B5BA4">
      <Stack spacing={2}>
        <Box>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 20, fontWeight: 900 }}>{profile.displayName}</Typography>
            <Chip label={queryTypeLabels[profile.type]} size="small" sx={{ fontWeight: 800 }} />
            {profile.agentStatus && <Chip label={profile.agentStatus} size="small" color={profile.agentStatus === 'active' ? 'success' : 'default'} />}
          </Stack>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
            ใช้เป็นแกนกลางในการเชื่อมโยง alert, host context, MITRE และ compliance evidence
          </Typography>
        </Box>

        <Divider />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} divider={<Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />}>
          <Stack spacing={1.5} sx={{ flex: 1 }}>
            <ProfileField label="IP Address" value={profile.ipAddress} />
            <ProfileField label="Hostname" value={profile.hostname} />
            <ProfileField label="MAC Address" value={profile.macAddress} />
          </Stack>
          <Stack spacing={1.5} sx={{ flex: 1 }}>
            <ProfileField label="Agent ID" value={profile.agentId} />
            <ProfileField label="Agent Name" value={profile.agentName} />
            <ProfileField label="User" value={profile.user} />
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {profile.os && <Chip icon={<MemoryRoundedIcon />} label={profile.os} />}
          {profile.hostname && <Chip icon={<DnsRoundedIcon />} label={profile.hostname} />}
          {profile.user && <Chip icon={<PersonRoundedIcon />} label={profile.user} />}
          {profile.ipAddress && <Chip icon={<LanRoundedIcon />} label={profile.ipAddress} sx={{ '& .MuiChip-label': { fontFamily: '"IBM Plex Mono", monospace' } }} />}
        </Stack>

        <Divider />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.3 }}>
              First Seen
            </Typography>
            <MonoValue value={formatTimestamp(profile.firstSeen)} dimmed />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.3 }}>
              Last Seen
            </Typography>
            <MonoValue value={formatTimestamp(profile.lastSeen)} dimmed />
          </Box>
        </Stack>

        {(profile.groups?.length || profile.labels?.length) && (
          <>
            <Divider />
            <Stack spacing={1.1}>
              {profile.groups?.length ? (
                <Box>
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.8 }}>
                    Groups
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {profile.groups.map((group) => (
                      <Chip key={group} label={group} variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              ) : null}
              {profile.labels?.length ? (
                <Box>
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.8 }}>
                    Labels
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {profile.labels.map((label) => (
                      <Chip key={label} label={label} sx={{ bgcolor: 'rgba(123,91,164,0.12)' }} />
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          </>
        )}
      </Stack>
    </SectionCard>
  )
}

export default EntityProfileCard
