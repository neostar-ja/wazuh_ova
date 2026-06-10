/**
 * Pivot Actions - Quick action buttons for pivoting to investigate
 */

import { Box, Stack, Button, Typography, Chip, useTheme } from '@mui/material'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { Bucket } from './searchTypes'

interface PivotActionsProps {
  topSrcIp: Bucket[]
  topDstIp: Bucket[]
  matchedPort?: number | null
  onNavigate?: (value: string) => void
  onApplyPatch?: (patch: Record<string, string>) => void
}

export function PivotActions({
  topSrcIp,
  topDstIp,
  matchedPort,
  onNavigate,
  onApplyPatch,
}: PivotActionsProps) {
  const theme = useTheme()

  if (!topSrcIp.length && !topDstIp.length) return null

  const topSrc = topSrcIp[0]?.key
  const topDst = topDstIp[0]?.key

  return (
    <Box
      sx={{
        borderRadius: 5,
        p: 2.5,
        border: '1px solid rgba(15,196,255,0.12)',
        background: 'rgba(7,18,31,0.46)',
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 1 }}>
            Quick Pivots
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            คลิก Investigate เพื่อเปิดหน้า Investigate พร้อมตัวเลือก pivot
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {topSrc && (
            <Button
              variant="outlined"
              size="small"
              endIcon={<OpenInNewRoundedIcon />}
              onClick={() => onNavigate?.(topSrc)}
              sx={{
                borderColor: 'rgba(15,196,255,0.24)',
                color: '#0FC4FF',
                fontWeight: 700,
              }}
            >
              Investigate {topSrc}
            </Button>
          )}

          {topDst && (
            <Button
              variant="outlined"
              size="small"
              endIcon={<OpenInNewRoundedIcon />}
              onClick={() => onNavigate?.(topDst)}
              sx={{
                borderColor: 'rgba(56,189,248,0.24)',
                color: '#38BDF8',
                fontWeight: 700,
              }}
            >
              Investigate {topDst}
            </Button>
          )}

          {matchedPort && (
            <Chip
              label={`Port ${matchedPort} matched`}
              size="small"
              sx={{
                bgcolor: 'rgba(241,116,34,0.14)',
                color: '#F17422',
                fontWeight: 700,
              }}
            />
          )}
        </Stack>
      </Stack>
    </Box>
  )
}
