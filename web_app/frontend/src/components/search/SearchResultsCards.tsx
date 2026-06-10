/**
 * Search Results Components
 * MetricCard (local, for search-specific use), CoverageCard, DirectionPill, TopList
 * Theme-aware: supports both Dark and Light mode
 */

import { Box, Chip, Stack, Typography, Tooltip, Button, useTheme } from '@mui/material'
import { BRAND, fmtN, SEV_COLOR } from '../ui/tokens'
import { familyLabel, familyColor, SOURCE_FAMILY_META, Bucket } from './searchTypes'
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded'
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded'
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded'
import { SectionCard } from '../ui/SectionCard'

/**
 * CoverageCard - สำหรับแสดง Log Source Coverage
 */
export function CoverageCard({ family, count }: { family: string; count: number }) {
  const meta = SOURCE_FAMILY_META[family]
  const Icon = meta?.icon
  const accent = meta?.color ?? '#64748B'
  return (
    <Box
      sx={{
        borderRadius: '12px',
        p: 2,
        background: `${accent}12`,
        border: `1px solid ${accent}28`,
        transition: 'all 0.2s ease',
        '&:hover': {
          background: `${accent}1E`,
          borderColor: `${accent}45`,
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 16px ${accent}18`,
        },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: `${accent}20`,
            color: accent,
            flexShrink: 0,
          }}
        >
          {Icon && <Icon sx={{ fontSize: 18 }} />}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 700,
              color: 'text.primary',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {familyLabel(family)}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: '"IBM Plex Mono", monospace' }}>
            {fmtN(count)} events
          </Typography>
        </Box>
        <Chip
          label={fmtN(count)}
          size="small"
          sx={{
            height: 20,
            fontSize: 10,
            fontWeight: 800,
            bgcolor: `${accent}18`,
            color: accent,
            flexShrink: 0,
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      </Stack>
    </Box>
  )
}

/**
 * DirectionPill - สำหรับแสดง Inbound/Outbound/Lateral
 */
export function DirectionPill({ direction }: { direction: string }) {
  const color =
    direction === 'inbound'
      ? SEV_COLOR.critical
      : direction === 'outbound'
      ? SEV_COLOR.low
      : SEV_COLOR.medium
  const icon =
    direction === 'inbound' ? (
      <SouthWestRoundedIcon sx={{ fontSize: 11 }} />
    ) : direction === 'outbound' ? (
      <NorthEastRoundedIcon sx={{ fontSize: 11 }} />
    ) : (
      <SwapHorizRoundedIcon sx={{ fontSize: 11 }} />
    )
  const label =
    direction === 'inbound'
      ? 'Inbound'
      : direction === 'outbound'
      ? 'Outbound'
      : 'Lateral'
  return (
    <Chip
      icon={icon}
      label={label}
      size="small"
      sx={{
        height: 20,
        fontSize: 10,
        fontWeight: 700,
        bgcolor: `${color}16`,
        color,
        border: 'none',
        '& .MuiChip-label': { pl: 0.5, pr: 0.75 },
      }}
    />
  )
}

/**
 * TopList - สำหรับแสดง Top N items พร้อม bar visualization
 * Theme-aware: ใช้ SectionCard wrapper
 */
export function TopList({
  title,
  items,
  accent,
  onSelect,
}: {
  title: string
  items: Bucket[]
  accent: string
  onSelect?: (value: string) => void
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  if (!items.length) return null
  const maxCount = items[0]?.count ?? 1
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: accent,
          mb: 1.25,
        }}
      >
        {title}
      </Typography>
      <Stack spacing={0.75}>
        {items.slice(0, 8).map((item) => {
          const pct = maxCount ? Math.max((item.count / maxCount) * 100, 4) : 0
          return (
            <Box key={item.key}>
              <Stack
                direction="row"
                justifyContent="space-between"
                spacing={1}
                alignItems="center"
              >
                <Button
                  variant="text"
                  onClick={() => onSelect?.(item.key)}
                  sx={{
                    minWidth: 0,
                    px: 0,
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    color: 'text.primary',
                    fontSize: 11,
                    fontFamily: '"IBM Plex Mono", monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    '&:hover': { bgcolor: 'transparent', color: accent },
                  }}
                >
                  {item.key}
                </Button>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: accent,
                    flexShrink: 0,
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                >
                  {fmtN(item.count)}
                </Typography>
              </Stack>
              <Box
                sx={{
                  mt: 0.4,
                  height: 3,
                  borderRadius: 99,
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                }}
              >
                <Box
                  sx={{
                    width: `${pct}%`,
                    height: 3,
                    borderRadius: 99,
                    bgcolor: accent,
                    transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
              </Box>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
