/**
 * Search Results Table
 * Displays matched events in a responsive table format
 * Supports click-to-detail via onRowClick prop
 */

import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Button,
  Typography,
  Collapse,
  useTheme,
  Chip,
  IconButton,
  Stack,
} from '@mui/material'
import {
  deriveSourceFamily,
  deriveDirection,
  normalizeGroups,
  familyLabel,
  familyColor,
  protoLabel,
} from './searchTypes'
import { DirectionPill } from './SearchResultsCards'
import { fmtIrisUtcToBangkok } from '../soar/soarUtils'
import { fmtN } from '../ui/tokens'
import { BRAND } from '../ui/tokens'
import { SectionCard } from '../ui/SectionCard'

interface SearchResultsTableProps {
  events: any[]
  total: number
  matchedPort?: number | null
  showEvents: boolean
  onToggle: () => void
  onInvestigate: (value: string) => void
  onRowClick?: (event: any) => void
}

export function SearchResultsTable({
  events,
  total,
  matchedPort,
  showEvents,
  onToggle,
  onInvestigate,
  onRowClick,
}: SearchResultsTableProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const tableHeaderBg = isDark ? 'rgba(22,17,42,0.98)' : 'rgba(245,243,255,0.98)'
  const rowHoverBg = isDark ? 'rgba(123,91,164,0.08)' : 'rgba(123,91,164,0.04)'
  const zebraRowBg = isDark ? 'rgba(123,91,164,0.03)' : 'rgba(123,91,164,0.015)'

  const headerAction = (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        label={`${events.length} / ${fmtN(total)}`}
        size="small"
        sx={{
          bgcolor: `${BRAND.purple}18`,
          color: BRAND.purple,
          fontWeight: 700,
          fontSize: 11,
          fontFamily: '"IBM Plex Mono", monospace',
        }}
      />
      <Tooltip title={showEvents ? 'ซ่อนตาราง' : 'แสดงตาราง'}>
        <IconButton
          size="small"
          onClick={onToggle}
          sx={{ color: 'text.secondary' }}
          aria-label={showEvents ? 'ซ่อนตาราง' : 'แสดงตาราง'}
        >
          {showEvents ? (
            <ExpandLessRoundedIcon fontSize="small" />
          ) : (
            <ExpandMoreRoundedIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </Stack>
  )

  return (
    <SectionCard
      title="Matched Events"
      subtitle={`traffic events จาก log sources ทั้งหมดที่ match query นี้`}
      icon={<TableRowsRoundedIcon />}
      iconColor={BRAND.purple}
      accent={BRAND.purple}
      action={headerAction}
      noPad
    >
      <Collapse in={showEvents}>
        {!events.length ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              ไม่พบ event ที่ตรงกับ query ในช่วงเวลานี้
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflow: 'auto', maxHeight: 700 }} className="scrollbar-thin">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {[
                    'เวลา',
                    'Direction',
                    'Agent',
                    'Src',
                    'Dst',
                    'Proto',
                    'Action',
                    'Family',
                    'Log Source',
                    '',
                  ].map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        bgcolor: tableHeaderBg,
                        color: 'text.secondary',
                        whiteSpace: 'nowrap',
                        borderBottom: `1px solid ${isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.12)'}`,
                        py: 1,
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event: any, index: number) => {
                  const data = event?.data ?? {}
                  const agent = event?.agent ?? {}
                  const family = deriveSourceFamily(event)
                  const direction = deriveDirection(event, matchedPort)
                  const logSources = normalizeGroups(event?.rule?.groups)
                    .slice(0, 2)
                    .join(', ')
                  const srcValue = `${data.srcip ?? '—'}${
                    data.srcport ? `:${data.srcport}` : ''
                  }`
                  const dstValue = `${data.dstip ?? '—'}${
                    data.dstport ? `:${data.dstport}` : ''
                  }`
                  const accent = familyColor(family)
                  const pivotTarget = data.srcip || data.dstip || agent.name

                  return (
                    <TableRow
                      key={`${event['@timestamp']}-${index}`}
                      hover
                      onClick={() => onRowClick?.(event)}
                      sx={{
                        cursor: onRowClick ? 'pointer' : 'default',
                        bgcolor: index % 2 === 1 ? zebraRowBg : 'transparent',
                        '&:hover': {
                          bgcolor: rowHoverBg,
                        },
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <TableCell
                        sx={{
                          fontSize: 11,
                          fontFamily: '"IBM Plex Mono", monospace',
                          whiteSpace: 'nowrap',
                          color: 'text.secondary',
                          py: 1,
                        }}
                      >
                        {event['@timestamp']
                          ? fmtIrisUtcToBangkok(event['@timestamp'])
                          : '—'}
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <DirectionPill direction={direction} />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          py: 1,
                          maxWidth: 140,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Tooltip title={agent.name || ''} disableHoverListener={!agent.name}>
                          <span>{agent.name || '—'}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: 11,
                          fontFamily: '"IBM Plex Mono", monospace',
                          whiteSpace: 'nowrap',
                          py: 1,
                        }}
                      >
                        {srcValue}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: 11,
                          fontFamily: '"IBM Plex Mono", monospace',
                          whiteSpace: 'nowrap',
                          py: 1,
                        }}
                      >
                        {dstValue}
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        {data.proto || data.transport ? (
                          <Chip
                            label={protoLabel(data.proto || data.transport)}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              bgcolor: `${BRAND.purple}14`,
                              color: BRAND.purpleLight,
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        {data.action ? (
                          <Chip
                            label={String(data.action).toUpperCase()}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              bgcolor: ['deny', 'drop', 'block'].includes(
                                String(data.action).toLowerCase()
                              )
                                ? 'rgba(239,68,68,0.14)'
                                : 'rgba(34,197,94,0.14)',
                              color: ['deny', 'drop', 'block'].includes(
                                String(data.action).toLowerCase()
                              )
                                ? '#EF4444'
                                : '#22C55E',
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          label={familyLabel(family)}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: `${accent}18`,
                            color: accent,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: 10,
                          color: 'text.secondary',
                          maxWidth: 200,
                          py: 1,
                        }}
                      >
                        <Tooltip
                          title={logSources || event?.rule?.description || ''}
                          disableHoverListener={!(logSources || event?.rule?.description)}
                        >
                          <Typography
                            sx={{
                              fontSize: 10,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 200,
                            }}
                          >
                            {logSources || event?.rule?.description || '—'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Tooltip title="Investigate">
                          <span>
                            <IconButton
                              size="small"
                              disabled={!pivotTarget}
                              onClick={(e) => {
                                e.stopPropagation()
                                pivotTarget && onInvestigate(String(pivotTarget))
                              }}
                              aria-label="Investigate"
                              sx={{
                                color: BRAND.purple,
                                opacity: pivotTarget ? 0.7 : 0.3,
                                '&:hover': { opacity: 1 },
                              }}
                            >
                              <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Collapse>
    </SectionCard>
  )
}
