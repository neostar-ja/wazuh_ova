import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import {
  Box, FormControl, MenuItem, Paper, Select, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tooltip, Typography,
} from '@mui/material'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import { format } from 'date-fns'
import { adminApi } from '../../../services/api'
import { SectionHeader } from '../shared'

const ACCENT = '#64748B'

const ACTION_HEX: Record<string, string> = {
  login:            '#3B82F6',
  logout:           '#94A3B8',
  save_rule:        '#F59E0B',
  save_decoder:     '#06B6D4',
  save_list:        '#8B5CF6',
  save_wazuh_config:'#F59E0B',
  deploy_restart:   '#EF4444',
  create_user:      '#22C55E',
  update_user:      '#06B6D4',
  delete_tuning:    '#EF4444',
  add_tuning:       '#F59E0B',
  save_config:      '#8B5CF6',
}

function ActionChip({ action }: { action: string }) {
  const color = ACTION_HEX[action] || '#64748B'
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center',
      px: 0.875, py: 0.2, borderRadius: 1,
      bgcolor: alpha(color, 0.13),
      border: `1px solid ${alpha(color, 0.3)}`,
      color, fontSize: 10.5, fontWeight: 700,
      letterSpacing: '0.01em', whiteSpace: 'nowrap',
      lineHeight: 1.5,
    }}>
      {action}
    </Box>
  )
}

export function AuditTab() {
  const [limit, setLimit] = useState(100)
  const [actionFilter, setActionFilter] = useState('')
  const [countdown, setCountdown] = useState(30)

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-audit', limit],
    queryFn: () => adminApi.auditLog(limit).then(r => r.data),
    refetchInterval: 30000,
  })

  useEffect(() => {
    const id = setInterval(() => setCountdown(c => (c <= 1 ? 30 : c - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  const actions = [...new Set(logs.map(l => l.action))].sort()
  const filtered = actionFilter ? logs.filter(l => l.action === actionFilter) : logs

  return (
    <Box>
      <SectionHeader
        icon={<HistoryRoundedIcon fontSize="small" />}
        title="Audit Log"
        count={filtered.length}
        color={ACCENT}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTimeRoundedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
                รีเฟรชใน {countdown}s
              </Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 148 }}>
              <Select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                displayEmpty
                sx={{ fontSize: 12, height: 30, borderRadius: 1.75 }}>
                <MenuItem value="" sx={{ fontSize: 12 }}>ทุก action</MenuItem>
                {actions.map(a => (
                  <MenuItem key={a} value={a} sx={{ fontSize: 12, gap: 1 }}>
                    <ActionChip action={a} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Select
              size="small"
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              sx={{ fontSize: 12, height: 30, minWidth: 90, borderRadius: 1.75 }}>
              {[50, 100, 200].map(l => (
                <MenuItem key={l} value={l} sx={{ fontSize: 12 }}>{l} รายการ</MenuItem>
              ))}
            </Select>
          </Box>
        }
      />

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ mt: 2, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{
              '& th': {
                fontWeight: 700, fontSize: 10.5,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: 'text.secondary', py: 1.25,
                bgcolor: 'action.hover',
              },
            }}>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>เวลา</TableCell>
              <TableCell>ผู้ใช้</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Target</TableCell>
              <TableCell sx={{ minWidth: 160 }}>รายละเอียด</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton height={22} sx={{ borderRadius: 1 }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : filtered.map(l => (
                  <TableRow
                    key={l.id}
                    hover
                    sx={{ '&:last-child td': { border: 0 }, transition: 'background 0.1s' }}>
                    <TableCell sx={{
                      fontSize: 11, whiteSpace: 'nowrap',
                      fontFamily: '"IBM Plex Mono",monospace',
                      color: 'text.secondary',
                    }}>
                      {l.timestamp ? format(new Date(l.timestamp), 'dd/MM HH:mm:ss') : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2 }}>
                        {l.username}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ActionChip action={l.action} />
                    </TableCell>
                    <TableCell>
                      {l.target ? (
                        <Box sx={{
                          display: 'inline-block',
                          px: 0.75, py: 0.2, borderRadius: 0.875,
                          bgcolor: alpha('#64748B', 0.1),
                          fontFamily: '"IBM Plex Mono",monospace',
                          fontSize: 11, color: 'text.secondary',
                        }}>
                          {l.target}
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: 'text.secondary', maxWidth: 200 }}>
                      {l.detail ? (
                        <Tooltip title={l.detail} placement="top">
                          <Typography sx={{
                            fontSize: 11.5, color: 'text.secondary',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', maxWidth: 200, cursor: 'default',
                          }}>
                            {l.detail}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: 11, fontFamily: '"IBM Plex Mono",monospace',
                      color: 'text.disabled',
                    }}>
                      {l.ip_address || '—'}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>

        {!isLoading && filtered.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <HistoryRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body2" color="text.disabled" fontWeight={500}>
              ไม่มีบันทึกการใช้งาน
            </Typography>
          </Box>
        )}
      </TableContainer>
    </Box>
  )
}
