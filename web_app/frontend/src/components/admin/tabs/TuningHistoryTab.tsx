import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { alpha } from '@mui/material/styles'
import {
  Box, Button, Chip, FormControl, MenuItem, Paper, Select, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { adminApi } from '../../../services/api'
import { getLevelColor, SectionHeader } from '../shared'

const ACCENT = '#F59E0B'

const ACTION_COLOR: Record<string, string> = {
  create: '#22C55E',
  update: '#3B82F6',
  status_change: '#94A3B8',
  revert: '#EF4444',
  delete: '#EF4444',
  deploy_wazuh: '#F59E0B',
}

const ACTIONS = ['', 'create', 'update', 'status_change', 'revert', 'delete', 'deploy_wazuh']
const SCOPES = ['', 'single', 'rule', 'deploy']

function formatBangkokDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(date)
}

function compactParams(filters: Record<string, any>) {
  return Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined))
}

function ActionChip({ action }: { action: string }) {
  const color = ACTION_COLOR[action] || '#64748B'
  return (
    <Chip
      size="small"
      label={action}
      sx={{
        height: 22,
        borderRadius: 1,
        bgcolor: alpha(color, 0.13),
        border: `1px solid ${alpha(color, 0.3)}`,
        color,
        fontSize: 10.5,
        fontWeight: 800,
      }}
    />
  )
}

function LevelChange({ from, to, previous }: { from?: number; to?: number; previous?: number }) {
  if (!from && !to) return <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
  const fromColor = getLevelColor(Number(from || previous || 0))
  const toColor = getLevelColor(Number(to || 0))
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625, flexWrap: 'wrap' }}>
      <Box sx={{ px: 0.75, py: 0.25, borderRadius: 1, bgcolor: alpha(fromColor, 0.15), color: fromColor, fontSize: 11, fontWeight: 800 }}>
        {previous ? `${from}/${previous}` : from || '—'}
      </Box>
      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>→</Typography>
      <Box sx={{ px: 0.75, py: 0.25, borderRadius: 1, bgcolor: alpha(toColor, 0.15), color: toColor, fontSize: 11, fontWeight: 800 }}>
        {to || '—'}
      </Box>
    </Box>
  )
}

function SnapshotSummary({ snapshot }: { snapshot: any }) {
  const rules = snapshot?.rules || []
  if (!snapshot) return <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      <Chip size="small" label={snapshot.filename || 'wazuh'} sx={{ height: 21, fontSize: 10.5, borderRadius: 1 }} />
      {rules.slice(0, 4).map((r: any) => (
        <Chip key={`${r.rule_id}-${r.tuned_level}`} size="small" label={`${r.rule_id}: ${r.original_level}→${r.tuned_level}`}
          sx={{ height: 21, fontSize: 10.5, borderRadius: 1, color: ACCENT, bgcolor: alpha(ACCENT, 0.1) }} />
      ))}
      {rules.length > 4 && <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>+{rules.length - 4}</Typography>}
    </Box>
  )
}

export function TuningHistoryTab() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    rule_id: '',
    alert_id: '',
    actor: '',
    scope: '',
    action: '',
    original_level: '',
    tuned_level: '',
    date_from: '',
    date_to: '',
    limit: 200,
  })

  const params = useMemo(() => compactParams(filters), [filters])
  const { data: history = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-tuning-history', params],
    queryFn: () => adminApi.listTuningHistory(params).then(r => r.data),
    refetchInterval: 30000,
  })

  const setFilter = (key: string, value: any) => setFilters(f => ({ ...f, [key]: value }))
  const openRule = (ruleId: string) => navigate(`/alerts?rule_id=${encodeURIComponent(ruleId)}&level=1&time_range=30d`)
  const openAlert = (entry: any) => {
    const params = new URLSearchParams()
    params.set('alert_id', entry.alert_id)
    params.set('level', '1')
    params.set('time_range', '30d')
    if (entry.rule_id) params.set('rule_id', entry.rule_id)
    navigate(`/alerts?${params.toString()}`)
  }

  return (
    <Box>
      <SectionHeader
        icon={<HistoryRoundedIcon fontSize="small" />}
        title="Tuning History"
        count={history.length}
        color={ACCENT}
      />

      <Paper variant="outlined" sx={{ mt: 2, mb: 2, p: 1.5, borderRadius: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(6, minmax(0, 1fr))' }, gap: 1 }}>
          <TextField size="small" label="Rule ID" value={filters.rule_id} onChange={e => setFilter('rule_id', e.target.value)}
            sx={{ '& input': { fontSize: 12 } }} />
          <TextField size="small" label="Alert ID" value={filters.alert_id} onChange={e => setFilter('alert_id', e.target.value)}
            sx={{ '& input': { fontSize: 12 } }} />
          <TextField size="small" label="ผู้ปรับ" value={filters.actor} onChange={e => setFilter('actor', e.target.value)}
            sx={{ '& input': { fontSize: 12 } }} />
          <FormControl size="small">
            <Select value={filters.scope} onChange={e => setFilter('scope', e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
              {SCOPES.map(s => <MenuItem key={s || 'all'} value={s} sx={{ fontSize: 12 }}>{s || 'ทุก scope'}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small">
            <Select value={filters.action} onChange={e => setFilter('action', e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
              {ACTIONS.map(a => <MenuItem key={a || 'all'} value={a} sx={{ fontSize: 12 }}>{a || 'ทุก action'}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small">
            <Select value={filters.limit} onChange={e => setFilter('limit', Number(e.target.value))} sx={{ fontSize: 12 }}>
              {[100, 200, 500, 1000].map(l => <MenuItem key={l} value={l} sx={{ fontSize: 12 }}>{l} รายการ</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Level เดิม" type="number" value={filters.original_level}
            onChange={e => setFilter('original_level', e.target.value)} inputProps={{ min: 1, max: 15 }} />
          <TextField size="small" label="Level ใหม่" type="number" value={filters.tuned_level}
            onChange={e => setFilter('tuned_level', e.target.value)} inputProps={{ min: 1, max: 15 }} />
          <TextField size="small" label="ตั้งแต่" type="datetime-local" value={filters.date_from}
            onChange={e => setFilter('date_from', e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="ถึง" type="datetime-local" value={filters.date_to}
            onChange={e => setFilter('date_to', e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="outlined" onClick={() => setFilters({
            rule_id: '', alert_id: '', actor: '', scope: '', action: '', original_level: '', tuned_level: '', date_from: '', date_to: '', limit: 200,
          })} sx={{ borderRadius: 2 }}>
            ล้าง filter
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', bgcolor: 'action.hover' } }}>
              <TableCell>เวลา</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Rule / Alert</TableCell>
              <TableCell>ระดับ</TableCell>
              <TableCell>ผู้ปรับ</TableCell>
              <TableCell sx={{ minWidth: 180 }}>เหตุผล / Snapshot</TableCell>
              <TableCell align="right">เปิดดู</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton height={24} /></TableCell>)}</TableRow>
            )) : history.map(entry => (
              <TableRow key={entry.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap', fontFamily: '"IBM Plex Mono",monospace', color: 'text.secondary' }}>
                  {formatBangkokDateTime(entry.created_at)}
                </TableCell>
                <TableCell><ActionChip action={entry.action} /></TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{entry.scope}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                    {entry.rule_id && <Typography sx={{ fontSize: 12, fontFamily: '"IBM Plex Mono",monospace', fontWeight: 800 }}>{entry.rule_id}</Typography>}
                    {entry.alert_id && (
                      <Tooltip title={entry.alert_id}>
                        <Typography sx={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono",monospace', color: 'text.disabled', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {entry.alert_id}
                        </Typography>
                      </Tooltip>
                    )}
                    {!entry.rule_id && !entry.alert_id && <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>}
                  </Box>
                </TableCell>
                <TableCell><LevelChange from={entry.original_level} to={entry.tuned_level} previous={entry.previous_tuned_level} /></TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{entry.actor}</TableCell>
                <TableCell sx={{ fontSize: 11.5, color: 'text.secondary', maxWidth: 300 }}>
                  {entry.deploy_snapshot ? <SnapshotSummary snapshot={entry.deploy_snapshot} /> : (entry.reason || '—')}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    {entry.rule_id && (
                      <Tooltip title="ค้น alert ย้อนหลังด้วย Rule ID">
                        <Button size="small" variant="outlined" onClick={() => openRule(entry.rule_id)}
                          startIcon={<ManageSearchRoundedIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: 11, borderRadius: 1.5 }}>
                          Rule
                        </Button>
                      </Tooltip>
                    )}
                    {entry.alert_id && (
                      <Tooltip title="เปิด alert detail ถ้ายังพบในช่วงเวลาที่โหลด">
                        <Button size="small" variant="outlined" onClick={() => openAlert(entry)}
                          startIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: 11, borderRadius: 1.5 }}>
                          Alert
                        </Button>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && history.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>ไม่พบประวัติการปรับจูนตาม filter ปัจจุบัน</Typography>
          </Box>
        )}
      </TableContainer>
    </Box>
  )
}
