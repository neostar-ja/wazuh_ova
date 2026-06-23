import { Box, Chip, Skeleton, Tooltip, Typography, useTheme } from '@mui/material'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import { SectionCard } from '../ui/SectionCard'
import { BRAND } from '../ui/tokens'
import { CONNECTION_STATUS_COLORS, formatDateTime } from './complianceUtils'
import { ConnectionPill, CONNECTION_STATUS_LABELS_TH, grayChipTones } from './compliancePrimitives'

interface DataSourceHealthPanelProps {
  dataSourceStatus?: string
  sources?: Record<string, string>
  lastUpdated?: string
  loading?: boolean
}

const SOURCE_DISPLAY: { id: string; label: string }[] = [
  { id: 'wazuhApi', label: 'Wazuh API' },
  { id: 'sca', label: 'SCA' },
  { id: 'vulnerabilities', label: 'Vulnerability' },
  { id: 'opensearch', label: 'OpenSearch' },
]

export function DataSourceHealthPanel({ dataSourceStatus, sources, lastUpdated, loading }: DataSourceHealthPanelProps) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const gray = grayChipTones(isDark)

  if (!loading && !sources) return null

  return (
    <SectionCard
      title="สถานะการเชื่อมต่อข้อมูล"
      subtitle="Wazuh API, SCA, Vulnerability detector และ OpenSearch"
      icon={<StorageRoundedIcon fontSize="small" />}
      iconColor={BRAND.primary}
      variant="flat"
      density="compact"
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {dataSourceStatus && <ConnectionPill status={dataSourceStatus} />}
          {lastUpdated && (
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono", monospace' }}>
              อัปเดต: {formatDateTime(lastUpdated)}
            </Typography>
          )}
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={110} height={24} sx={{ borderRadius: '20px' }} />
          ))
        ) : (
          SOURCE_DISPLAY.map(({ id, label }) => {
            const status = sources?.[id] || 'unavailable'
            const color = CONNECTION_STATUS_COLORS[status] || gray.color
            const statusLabel = CONNECTION_STATUS_LABELS_TH[status] || status
            return (
              <Tooltip key={id} title={statusLabel}>
                <Chip
                  label={`${label}: ${statusLabel}`}
                  size="small"
                  sx={{
                    height: 24, fontSize: 11, fontWeight: 700,
                    bgcolor: `${color}14`, color,
                    border: `1px solid ${color}30`,
                    '& .MuiChip-label': { px: 1.1 },
                  }}
                />
              </Tooltip>
            )
          })
        )}
      </Box>
    </SectionCard>
  )
}

export default DataSourceHealthPanel
