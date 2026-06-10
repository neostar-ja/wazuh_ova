/**
 * Active Filters Display - Shows currently applied filters as chips
 */

import { Box, Chip, Stack, Typography } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { SearchFormState } from './searchTypes'

interface ActiveFiltersDisplayProps {
  activeChips: Array<{ key: keyof SearchFormState; label: string }>
  onClearField: (key: keyof SearchFormState) => void
}

export function ActiveFiltersDisplay({
  activeChips,
  onClearField,
}: ActiveFiltersDisplayProps) {
  if (!activeChips.length) return null

  return (
    <Box
      sx={{
        borderRadius: 4,
        p: 2,
        border: '1px solid rgba(15,196,255,0.12)',
        background: 'rgba(7,18,31,0.4)',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: '#0FC4FF' }} />
        <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary' }}>
          ACTIVE FILTERS
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {activeChips.map((chip) => (
          <Chip
            key={`${chip.key}-${chip.label}`}
            label={chip.label}
            onDelete={() => onClearField(chip.key)}
            sx={{
              bgcolor: 'rgba(15,196,255,0.1)',
              border: '1px solid rgba(15,196,255,0.14)',
            }}
          />
        ))}
      </Stack>
    </Box>
  )
}
