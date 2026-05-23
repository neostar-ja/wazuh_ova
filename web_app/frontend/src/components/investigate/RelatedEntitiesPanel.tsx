import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import HubRoundedIcon from '@mui/icons-material/HubRounded'
import type { InvestigationQueryType, RelatedEntity } from '../../types'
import EmptyState from '../ui/EmptyState'
import SectionCard from '../ui/SectionCard'
import { queryTypeLabels, severityColor } from './utils'

interface RelatedEntitiesPanelProps {
  entities?: RelatedEntity[]
  onSelectEntity: (value: string, type?: InvestigationQueryType) => void
  history: string[]
}

export function RelatedEntitiesPanel({ entities, onSelectEntity, history }: RelatedEntitiesPanelProps) {
  return (
    <SectionCard
      title="Related Entities"
      subtitle="ความสัมพันธ์ของ agent, IP, user, rule, MITRE หรือ entity รอบข้าง"
      icon={<HubRoundedIcon />}
      accent="#7B5BA4"
      empty={<EmptyState title="ยังไม่พบ related entity" description="ไม่มี entity ที่เชื่อมโยงได้เพิ่มเติมจากผลการค้นหาชุดนี้" />}
    >
      {!entities?.length ? null : (
        <Stack spacing={2}>
          {history.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.8 }}>
                Investigation History
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {history.map((entry) => (
                  <Chip key={entry} label={entry} variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}

          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {entities.map((entity) => (
              <Button
                key={`${entity.type}:${entity.value}`}
                variant="outlined"
                size="small"
                onClick={() => onSelectEntity(entity.value, queryTypeLabels[entity.type as InvestigationQueryType] ? (entity.type as InvestigationQueryType) : undefined)}
                sx={{
                  justifyContent: 'flex-start',
                  borderRadius: '14px',
                  textTransform: 'none',
                  borderColor: entity.severity ? `${severityColor(entity.severity)}35` : 'rgba(123,91,164,0.22)',
                }}
              >
                <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>{entity.type}</Typography>
                  <Typography sx={{ fontSize: 12 }}>{entity.value}</Typography>
                  <Chip
                    label={entity.count}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: entity.severity ? `${severityColor(entity.severity)}18` : 'rgba(123,91,164,0.14)',
                    }}
                  />
                </Stack>
              </Button>
            ))}
          </Stack>
        </Stack>
      )}
    </SectionCard>
  )
}

export default RelatedEntitiesPanel
