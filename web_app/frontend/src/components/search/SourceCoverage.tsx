/**
 * Source Coverage Section
 * Shows which log sources matched the query
 * Theme-aware: supports Dark and Light mode
 */

import { Box, Chip, Stack, Typography, useTheme } from '@mui/material'
import LayersRoundedIcon from '@mui/icons-material/LayersRounded'
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import { CoverageCard } from './SearchResultsCards'
import { Bucket } from './searchTypes'
import { SectionCard } from '../ui/SectionCard'
import { BRAND, fmtN } from '../ui/tokens'

interface SourceCoverageProps {
  sourceFamilies: Bucket[]
  matchedPort?: number | null
  listenersTotal: number
}

export function SourceCoverage({
  sourceFamilies,
  matchedPort,
  listenersTotal,
}: SourceCoverageProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <SectionCard
      title="Log Source Coverage"
      subtitle={`ข้อมูลมาจาก ${sourceFamilies.length} source family`}
      icon={<LayersRoundedIcon />}
      iconColor={BRAND.orange}
      accent={BRAND.orange}
      size="md"
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
            xl: 'repeat(5, 1fr)',
          },
          gap: 1.5,
        }}
      >
        {sourceFamilies.map((family) => (
          <CoverageCard
            key={family.key}
            family={family.key}
            count={family.count}
          />
        ))}

        {sourceFamilies.length === 0 && (
          <Box
            sx={{
              gridColumn: '1 / -1',
              p: 3,
              textAlign: 'center',
              borderRadius: '12px',
              border: `1px dashed ${isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.15)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <SearchOffRoundedIcon sx={{ fontSize: 26, color: 'text.disabled' }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
              ไม่พบ log จาก source family ใด ในช่วงเวลานี้
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
              ลองขยายช่วงเวลา หรือลบตัวกรองบางส่วนออก
            </Typography>
          </Box>
        )}
      </Box>

      {matchedPort != null && listenersTotal > 0 && (
        <Box
          sx={{
            mt: 2,
            borderRadius: '12px',
            px: 2,
            py: 1.5,
            background: isDark ? `${BRAND.orange}0F` : `${BRAND.orange}08`,
            border: `1px solid ${BRAND.orange}25`,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: `${BRAND.orange}20`,
                color: BRAND.orange,
                flexShrink: 0,
              }}
            >
              <StorageRoundedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.orange, mb: 0.2 }}>
                Port {matchedPort} — Active Listeners
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                พบ {listenersTotal} internal service(s) ที่ listen บน port {matchedPort} — ดูรายละเอียดด้านล่าง
              </Typography>
            </Box>
            <Chip
              label={fmtN(listenersTotal)}
              size="small"
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 800,
                bgcolor: `${BRAND.orange}18`,
                color: BRAND.orange,
                fontFamily: '"IBM Plex Mono", monospace',
                flexShrink: 0,
              }}
            />
          </Stack>
        </Box>
      )}
    </SectionCard>
  )
}
