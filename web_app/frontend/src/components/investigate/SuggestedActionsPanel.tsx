import { Box, Button, Stack, Tooltip, Typography } from '@mui/material'
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import SaveAsRoundedIcon from '@mui/icons-material/SaveAsRounded'
import FileCopyRoundedIcon from '@mui/icons-material/FileCopyRounded'
import type { EntityProfile } from '../../types'
import SectionCard from '../ui/SectionCard'

interface SuggestedActionsPanelProps {
  profile: EntityProfile
  sourceIp?: string
  destinationIp?: string
  onInvestigate: (value: string, label?: string) => void
  onExport: () => void
  onCopySummary: () => void
  onOpenAlerts: () => void
}

function DisabledAction({ label }: { label: string }) {
  return (
    <Tooltip title="ยังไม่รองรับ">
      <span>
        <Button fullWidth variant="outlined" disabled>
          {label}
        </Button>
      </span>
    </Tooltip>
  )
}

export function SuggestedActionsPanel({
  profile,
  sourceIp,
  destinationIp,
  onInvestigate,
  onExport,
  onCopySummary,
  onOpenAlerts,
}: SuggestedActionsPanelProps) {
  return (
    <SectionCard title="Suggested Actions" subtitle="ขั้นตอนถัดไปที่ analyst ทำต่อได้ทันทีจากผลลัพธ์นี้" icon={<PlayCircleOutlineRoundedIcon />} accent="#F17422">
      <Stack spacing={1.25}>
        <Button fullWidth variant="contained" startIcon={<OpenInNewRoundedIcon />} onClick={onOpenAlerts}>
          View Related Alerts
        </Button>
        {sourceIp ? (
          <Button fullWidth variant="outlined" onClick={() => onInvestigate(sourceIp, 'Investigate Source IP')}>
            Investigate Source IP
          </Button>
        ) : null}
        {destinationIp ? (
          <Button fullWidth variant="outlined" onClick={() => onInvestigate(destinationIp, 'Investigate Destination IP')}>
            Investigate Destination IP
          </Button>
        ) : null}
        {profile.agentName ? (
          <Button fullWidth variant="outlined" onClick={() => onInvestigate(profile.agentName ?? profile.query, 'Open Agent Profile')}>
            Open Agent Profile
          </Button>
        ) : null}
        <Button fullWidth variant="outlined" startIcon={<SaveAsRoundedIcon />} onClick={onExport}>
          Export Evidence
        </Button>
        <Button fullWidth variant="outlined" startIcon={<FileCopyRoundedIcon />} onClick={onCopySummary}>
          Copy Investigation Summary
        </Button>
        <DisabledAction label="Create Case" />
        <DisabledAction label="Add IOC" />
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.8 }}>
          Current Focus
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.7 }}>
          เหมาะสำหรับการ pivot ต่อไปยัง alert set, source/destination IP, agent หรือสรุป evidence เพื่อส่งต่อ incident response และ audit trail
        </Typography>
      </Box>
    </SectionCard>
  )
}

export default SuggestedActionsPanel
