/**
 * Port Listeners Section
 * Shows internal services/processes (from Wazuh syscollector inventory)
 * that are currently listening on the matched port
 */

import { useState } from 'react'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Tooltip,
  useTheme,
} from '@mui/material'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import DesktopWindowsRoundedIcon from '@mui/icons-material/DesktopWindowsRounded'
import { PortListener, protoLabel } from './searchTypes'
import { SectionCard } from '../ui/SectionCard'
import { BRAND, fmtN } from '../ui/tokens'

interface PortListenersSectionProps {
  matchedPort?: number | null
  listeners: PortListener[]
  total?: number
  isLoading: boolean
}

function formatAddress(ip?: string, port?: number): string {
  if (!ip || ip === '0.0.0.0' || ip === '::') return port ? `*:${port}` : '—'
  return port ? `${ip}:${port}` : ip
}

export function PortListenersSection({
  matchedPort,
  listeners,
  total,
  isLoading,
}: PortListenersSectionProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [expanded, setExpanded] = useState(true)

  if (!matchedPort || !listeners.length) return null

  const tableHeaderBg = isDark ? 'rgba(22,17,42,0.98)' : 'rgba(245,243,255,0.98)'
  const rowHoverBg = isDark ? 'rgba(241,116,34,0.06)' : 'rgba(241,116,34,0.04)'

  const headerAction = (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        label={fmtN(total ?? listeners.length)}
        size="small"
        sx={{
          bgcolor: `${BRAND.orange}18`,
          color: BRAND.orange,
          fontWeight: 700,
          fontSize: 11,
          fontFamily: '"IBM Plex Mono", monospace',
        }}
      />
      <Tooltip title={expanded ? 'ซ่อนรายการ' : 'แสดงรายการ'}>
        <IconButton
          size="small"
          onClick={() => setExpanded((v) => !v)}
          sx={{ color: 'text.secondary' }}
          aria-label={expanded ? 'ซ่อนรายการ' : 'แสดงรายการ'}
        >
          {expanded ? (
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
      title={`Port ${matchedPort} Listeners`}
      subtitle="Internal services และ processes ที่ฟัง port นี้ (จาก Wazuh inventory)"
      icon={<StorageRoundedIcon />}
      iconColor={BRAND.orange}
      accent={BRAND.orange}
      action={headerAction}
      loading={isLoading}
      noPad
    >
      <Collapse in={expanded}>
        <Box sx={{ overflow: 'auto', maxHeight: 360 }} className="scrollbar-thin">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['Agent / Host', 'Local Address', 'Remote Address', 'Protocol', 'Process', 'PID'].map(
                  (header) => (
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
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {listeners.map((listener, index) => (
                <TableRow
                  key={`${listener.agent}-${listener.local_ip}-${listener.local_port}-${listener.pid}-${index}`}
                  hover
                  sx={{ '&:hover': { bgcolor: rowHoverBg }, transition: 'background-color 0.15s ease' }}
                >
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 1, whiteSpace: 'nowrap' }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <DesktopWindowsRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      {listener.agent || '—'}
                    </Stack>
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'nowrap', py: 1 }}
                  >
                    {formatAddress(listener.local_ip, listener.local_port)}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: 11,
                      fontFamily: '"IBM Plex Mono", monospace',
                      whiteSpace: 'nowrap',
                      py: 1,
                      color: 'text.secondary',
                    }}
                  >
                    {formatAddress(listener.remote_ip, listener.remote_port)}
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Chip
                      label={protoLabel(listener.protocol) || '—'}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: `${BRAND.orange}14`,
                        color: BRAND.orange,
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 600, py: 1 }}>
                    {listener.process || '—'}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', color: 'text.secondary', py: 1 }}
                  >
                    {listener.pid ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Collapse>
    </SectionCard>
  )
}
