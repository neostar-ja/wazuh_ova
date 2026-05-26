import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Typography, Grid, Chip, Table, TableBody, TableCell,
  TableHead, TableRow, Tabs, Tab, TextField, Button, Select,
  MenuItem, FormControl, InputLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Alert,
  IconButton, Tooltip, Skeleton, InputAdornment, ToggleButton,
  ToggleButtonGroup, Link, Paper,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import WorkspacesRoundedIcon from '@mui/icons-material/WorkspacesRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import EscalatorWarningRoundedIcon from '@mui/icons-material/EscalatorWarningRounded'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useSnackbar } from 'notistack'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { PageShell } from '../ui/layout'
import { MetricCard } from '../ui/MetricCard'
import { SectionCard } from '../ui/SectionCard'
import { soarApi, IrisAlert, IrisCase, ShuffleWorkflow, MispAttribute } from '../../services/soarApi'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  violet:  '#8B5CF6',
  indigo:  '#6366F1',
  rose:    '#F43F5E',
  amber:   '#F59E0B',
  teal:    '#14B8A6',
  sky:     '#0EA5E9',
  purple:  '#7B5BA4',
  green:   '#22C55E',
} as const

// ── Severity helpers ──────────────────────────────────────────────────────────
const IRIS_SEV: Record<number, { label: string; color: string }> = {
  1: { label: 'Unspecified', color: '#64748B' },
  2: { label: 'Unspecified', color: '#64748B' },
  3: { label: 'Low',         color: '#22C55E' },
  4: { label: 'Low',         color: '#22C55E' },
  5: { label: 'Medium',      color: '#F59E0B' },
  6: { label: 'Medium',      color: '#F59E0B' },
  7: { label: 'High',        color: '#F17422' },
  8: { label: 'High',        color: '#F17422' },
  9: { label: 'Critical',    color: '#EF4444' },
}

const IRIS_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Unspecified', color: '#64748B' },
  2: { label: 'New',         color: '#3B82F6' },
  3: { label: 'Assigned',    color: '#8B5CF6' },
  4: { label: 'In Progress', color: '#F59E0B' },
  5: { label: 'Pending',     color: '#F17422' },
  6: { label: 'Closed',      color: '#64748B' },
}

function getSev(id: number) { return IRIS_SEV[id] ?? { label: 'Unknown', color: '#64748B' } }
function getStat(id: number) { return IRIS_STATUS[id] ?? { label: 'Unknown', color: '#64748B' } }

function fmtTime(s: string | null | undefined): string {
  if (!s) return '—'
  try { return format(new Date(s), 'dd MMM yy HH:mm', { locale: th }) }
  catch { return s }
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: '20px',
      bgcolor: ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      border: `1px solid ${ok ? '#22C55E' : '#EF4444'}30`,
    }}>
      <FiberManualRecordIcon sx={{ fontSize: 7, color: ok ? '#22C55E' : '#EF4444',
        animation: ok ? 'pulseGlow 2.5s ease-in-out infinite' : 'none' }} />
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: ok ? '#22C55E' : '#EF4444', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
    </Box>
  )
}

// ── IRIS Tab ──────────────────────────────────────────────────────────────────
function IRISTab({ irisUrl }: { irisUrl?: string }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const [view, setView] = useState<'alerts' | 'cases'>('alerts')
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; ip?: string; alertId?: number }>({ open: false })
  const { enqueueSnackbar } = useSnackbar()

  const { data: alertsResp, isLoading: alertsLoading } = useQuery({
    queryKey: ['iris-alerts'],
    queryFn: () => soarApi.getIrisAlerts({ per_page: 50 }).then(r => r.data),
    refetchInterval: 60000,
  })
  const { data: casesResp, isLoading: casesLoading } = useQuery({
    queryKey: ['iris-cases'],
    queryFn: () => soarApi.getIrisCases({ per_page: 50 }).then(r => r.data),
    refetchInterval: 60000,
  })

  const blockMut = useMutation({
    mutationFn: ({ ip }: { ip: string }) => soarApi.triggerBlock(ip, undefined, 'SOC Analyst'),
    onSuccess: () => {
      enqueueSnackbar('ส่งคำสั่ง Block IP ไปยัง Shuffle แล้ว', { variant: 'success' })
      setBlockDialog({ open: false })
    },
    onError: () => enqueueSnackbar('เกิดข้อผิดพลาดในการส่งคำสั่ง', { variant: 'error' }),
  })

  const alerts: IrisAlert[] = alertsResp?.data?.alerts ?? []
  const cases: IrisCase[] = casesResp?.data ?? []

  const rowBg = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)'
  const borderColor = isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.08)'

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, v) => v && setView(v)}
          size="small"
          sx={{ '& .MuiToggleButton-root': { px: 2, py: 0.75, fontSize: 12, fontWeight: 600, borderColor: `${C.violet}30` } }}
        >
          <ToggleButton value="alerts">
            <NotificationsActiveRoundedIcon sx={{ fontSize: 14, mr: 0.75 }} /> Alerts ({alertsResp?.data?.total ?? 0})
          </ToggleButton>
          <ToggleButton value="cases">
            <FolderOpenRoundedIcon sx={{ fontSize: 14, mr: 0.75 }} /> Cases ({cases.length})
          </ToggleButton>
        </ToggleButtonGroup>
        {irisUrl && (
          <Link href={`${irisUrl}/alerts`} target="_blank" rel="noopener"
            sx={{ fontSize: 11.5, color: C.violet, display: 'flex', alignItems: 'center', gap: 0.5, '&:hover': { color: '#A78BFA' } }}>
            เปิด DFIR-IRIS <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
          </Link>
        )}
      </Box>

      {view === 'alerts' && (
        <Box sx={{ overflowX: 'auto' }}>
          {alertsLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[1,2,3,4,5].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: '8px' }} />)}
            </Box>
          ) : alerts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
              <NotificationsActiveRoundedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
              <Typography sx={{ fontSize: 13 }}>ยังไม่มี Alerts</Typography>
            </Box>
          ) : (
            <Table size="small" sx={{ '& td,& th': { borderColor } }}>
              <TableHead>
                <TableRow sx={{ '& th': { fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.disabled', py: 0.75 } }}>
                  <TableCell>เวลา</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Title</TableCell>
                  <TableCell>ความรุนแรง</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell>แหล่งที่มา</TableCell>
                  <TableCell>IOC</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map((a, idx) => {
                  const sev = getSev(a.alert_severity_id)
                  const stat = getStat(a.alert_status_id)
                  const iocVal = a.iocs?.[0]?.ioc_value
                  return (
                    <TableRow key={a.alert_id} sx={{ bgcolor: idx % 2 === 0 ? rowBg : 'transparent',
                      '&:hover': { bgcolor: `${C.violet}08` } }}>
                      <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {fmtTime(a.alert_source_event_time)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, maxWidth: 260 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {a.alert_title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={sev.label}
                          sx={{ fontSize: 10, fontWeight: 700, height: 20, bgcolor: `${sev.color}18`, color: sev.color, border: `1px solid ${sev.color}30` }} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={stat.label}
                          sx={{ fontSize: 10, fontWeight: 700, height: 20, bgcolor: `${stat.color}18`, color: stat.color, border: `1px solid ${stat.color}30` }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{a.alert_source}</TableCell>
                      <TableCell>
                        {iocVal && (
                          <Typography sx={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', color: C.rose }}>
                            {iocVal}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          {iocVal && (
                            <Tooltip title={`Block IP: ${iocVal}`}>
                              <IconButton size="small"
                                onClick={() => setBlockDialog({ open: true, ip: iocVal, alertId: a.alert_id })}
                                sx={{ color: C.rose, '&:hover': { bgcolor: `${C.rose}15` } }}>
                                <BlockRoundedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {irisUrl && (
                            <Tooltip title="เปิดใน IRIS">
                              <IconButton size="small" component="a"
                                href={`${irisUrl}/alerts?alert_id=${a.alert_id}`} target="_blank" rel="noopener"
                                sx={{ color: C.violet, '&:hover': { bgcolor: `${C.violet}15` } }}>
                                <OpenInNewRoundedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Box>
      )}

      {view === 'cases' && (
        <Box sx={{ overflowX: 'auto' }}>
          {casesLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[1,2,3].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: '8px' }} />)}
            </Box>
          ) : cases.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
              <FolderOpenRoundedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
              <Typography sx={{ fontSize: 13 }}>ยังไม่มี Cases</Typography>
            </Box>
          ) : (
            <Table size="small" sx={{ '& td,& th': { borderColor } }}>
              <TableHead>
                <TableRow sx={{ '& th': { fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.disabled', py: 0.75 } }}>
                  <TableCell>#</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Case Name</TableCell>
                  <TableCell>วันที่เปิด</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell>ผู้รับผิดชอบ</TableCell>
                  <TableCell>ลูกค้า</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.map((c, idx) => (
                  <TableRow key={c.case_id} sx={{ bgcolor: idx % 2 === 0 ? rowBg : 'transparent',
                    '&:hover': { bgcolor: `${C.violet}08` } }}>
                    <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', color: C.violet }}>
                      #{c.case_id}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600, maxWidth: 240 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.case_name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {c.case_open_date}
                    </TableCell>
                    <TableCell>
                      <Chip size="small"
                        label={c.case_close_date ? 'Closed' : 'Open'}
                        sx={{ fontSize: 10, fontWeight: 700, height: 20,
                          bgcolor: c.case_close_date ? 'rgba(100,116,139,0.15)' : 'rgba(34,197,94,0.15)',
                          color: c.case_close_date ? '#64748B' : '#22C55E',
                          border: `1px solid ${c.case_close_date ? '#64748B' : '#22C55E'}30` }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{c.owner}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{c.client_name}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="Escalate via Shuffle">
                          <IconButton size="small"
                            sx={{ color: C.amber, '&:hover': { bgcolor: `${C.amber}15` } }}>
                            <EscalatorWarningRoundedIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                        {irisUrl && (
                          <Tooltip title="เปิดใน IRIS">
                            <IconButton size="small" component="a"
                              href={`${irisUrl}/case?cid=${c.case_id}`} target="_blank" rel="noopener"
                              sx={{ color: C.violet, '&:hover': { bgcolor: `${C.violet}15` } }}>
                              <OpenInNewRoundedIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      )}

      {/* Block IP Dialog */}
      <Dialog open={blockDialog.open} onClose={() => setBlockDialog({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, color: C.rose }}>
          <BlockRoundedIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
          Block IP Address
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, fontSize: 12 }}>
            คำเตือน: คำสั่งนี้จะส่ง IP ไปยัง Shuffle เพื่อบล็อกบน Firewall
          </Alert>
          <Typography sx={{ fontSize: 13, mb: 1 }}>ต้องการบล็อก IP นี้หรือไม่?</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', color: C.rose }}>
            {blockDialog.ip}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialog({ open: false })} size="small">ยกเลิก</Button>
          <Button
            variant="contained"
            size="small"
            color="error"
            disabled={blockMut.isPending}
            onClick={() => blockDialog.ip && blockMut.mutate({ ip: blockDialog.ip })}
          >
            {blockMut.isPending ? <CircularProgress size={14} color="inherit" sx={{ mr: 1 }} /> : null}
            Block IP
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ── Shuffle Tab ───────────────────────────────────────────────────────────────
function ShuffleTab({ shuffleUrl }: { shuffleUrl?: string }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  const { data: workflows = [], isLoading } = useQuery<ShuffleWorkflow[]>({
    queryKey: ['shuffle-workflows'],
    queryFn: () => soarApi.getShuffleWorkflows().then(r => r.data),
    refetchInterval: 120000,
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        {shuffleUrl && (
          <Link href={shuffleUrl} target="_blank" rel="noopener"
            sx={{ fontSize: 11.5, color: C.teal, display: 'flex', alignItems: 'center', gap: 0.5, '&:hover': { color: '#2DD4BF' } }}>
            เปิด Shuffle SOAR <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
          </Link>
        )}
      </Box>
      {isLoading ? (
        <Grid container spacing={2}>
          {[1,2,3,4].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton height={120} sx={{ borderRadius: '14px' }} />
            </Grid>
          ))}
        </Grid>
      ) : workflows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
          <WorkspacesRoundedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
          <Typography sx={{ fontSize: 13 }}>ยังไม่มี Workflows</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {workflows.map((wf) => (
            <Grid item xs={12} sm={6} md={4} key={wf.id}>
              <Paper sx={{
                p: 2, borderRadius: '14px',
                border: `1px solid ${C.teal}20`,
                bgcolor: isDark ? `${C.teal}08` : `${C.teal}05`,
                '&:hover': { borderColor: `${C.teal}40`, bgcolor: isDark ? `${C.teal}12` : `${C.teal}08` },
                transition: 'all 0.2s ease',
                height: '100%',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <WorkspacesRoundedIcon sx={{ fontSize: 20, color: C.teal, mt: 0.25 }} />
                  <Chip size="small" label={wf.status || 'unknown'}
                    sx={{ fontSize: 9.5, height: 18, fontWeight: 700,
                      bgcolor: wf.status === 'running' ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
                      color: wf.status === 'running' ? '#22C55E' : '#64748B' }} />
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, mb: 0.5 }}>
                  {wf.name}
                </Typography>
                {wf.description && (
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1, lineHeight: 1.5,
                    overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {wf.description}
                  </Typography>
                )}
                <Typography sx={{ fontSize: 9.5, fontFamily: '"IBM Plex Mono", monospace', color: 'text.disabled' }}>
                  {wf.id.slice(0, 8)}…
                </Typography>
                {wf.tags?.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {wf.tags.slice(0, 3).map(t => (
                      <Chip key={t} size="small" label={t}
                        sx={{ fontSize: 9.5, height: 18, bgcolor: `${C.teal}15`, color: C.teal }} />
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

// ── MISP Tab ──────────────────────────────────────────────────────────────────
function MISPTab({ mispUrl }: { mispUrl?: string }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const [query, setQuery] = useState('')
  const [iocType, setIocType] = useState('')
  const [searched, setSearched] = useState(false)

  const { data: mispStats, isLoading: statsLoading } = useQuery({
    queryKey: ['misp-stats'],
    queryFn: () => soarApi.getMispStats().then(r => r.data),
    staleTime: 300000,
    refetchInterval: 300000,
  })

  const { data: searchResp, isLoading: searchLoading, refetch: doSearch } = useQuery({
    queryKey: ['misp-search', query, iocType],
    queryFn: () => soarApi.searchMisp(query, iocType || undefined).then(r => r.data),
    enabled: false,
  })

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    setSearched(true)
    doSearch()
  }, [query, doSearch])

  const attrs: MispAttribute[] = searchResp?.response?.Attribute ?? []
  const byType: Record<string, string> = mispStats?.by_type ?? {}
  const borderColor = isDark ? 'rgba(20,184,166,0.1)' : 'rgba(20,184,166,0.08)'
  const rowBg = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)'

  return (
    <Box>
      {/* MISP Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total IOCs"
            value={mispStats?.total_iocs}
            loading={statsLoading}
            color={C.teal}
            icon={<ShieldRoundedIcon />}
            subtitle="รวมทุกประเภท"
          />
        </Grid>
        {Object.entries(byType).slice(0, 3).map(([type, count]) => (
          <Grid item xs={12} sm={6} md={3} key={type}>
            <MetricCard
              title={type}
              value={parseInt(count as string)}
              loading={statsLoading}
              color={C.sky}
              icon={<BugReportRoundedIcon />}
              compact
            />
          </Grid>
        ))}
      </Grid>

      {/* Search */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField
          size="small"
          placeholder="ค้นหา IOC: IP, Domain, Hash, URL…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          sx={{ flex: 1, minWidth: 220,
            '& .MuiOutlinedInput-root': { fontSize: 13, borderRadius: '10px' } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment>,
          }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel sx={{ fontSize: 12 }}>ประเภท IOC</InputLabel>
          <Select value={iocType} onChange={e => setIocType(e.target.value)} label="ประเภท IOC"
            sx={{ fontSize: 12, borderRadius: '10px' }}>
            <MenuItem value="">ทุกประเภท</MenuItem>
            <MenuItem value="ip-dst">IP (Destination)</MenuItem>
            <MenuItem value="ip-src">IP (Source)</MenuItem>
            <MenuItem value="domain">Domain</MenuItem>
            <MenuItem value="url">URL</MenuItem>
            <MenuItem value="md5">MD5 Hash</MenuItem>
            <MenuItem value="sha256">SHA-256</MenuItem>
            <MenuItem value="email-src">Email</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" size="small"
          onClick={handleSearch}
          disabled={!query.trim() || searchLoading}
          sx={{ bgcolor: C.teal, '&:hover': { bgcolor: '#0D9488' }, borderRadius: '10px',
            height: 40, px: 2.5, fontWeight: 700, fontSize: 12 }}>
          {searchLoading ? <CircularProgress size={14} color="inherit" /> : 'ค้นหา'}
        </Button>
        {mispUrl && (
          <Link href={mispUrl} target="_blank" rel="noopener"
            sx={{ fontSize: 11.5, color: C.teal, display: 'flex', alignItems: 'center', gap: 0.5, alignSelf: 'center', '&:hover': { color: '#2DD4BF' } }}>
            เปิด MISP <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
          </Link>
        )}
      </Box>

      {/* Results */}
      {searched && (
        <Box sx={{ overflowX: 'auto' }}>
          {searchLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[1,2,3].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: '8px' }} />)}
            </Box>
          ) : attrs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
              <BugReportRoundedIcon sx={{ fontSize: 36, mb: 1, opacity: 0.4 }} />
              <Typography sx={{ fontSize: 13 }}>ไม่พบ IOC ที่ตรงกัน</Typography>
            </Box>
          ) : (
            <>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>
                พบ <strong style={{ color: C.teal }}>{attrs.length}</strong> รายการ
              </Typography>
              <Table size="small" sx={{ '& td,& th': { borderColor } }}>
                <TableHead>
                  <TableRow sx={{ '& th': { fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.disabled', py: 0.75 } }}>
                    <TableCell sx={{ minWidth: 200 }}>Value</TableCell>
                    <TableCell>ประเภท</TableCell>
                    <TableCell>หมวดหมู่</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>IDS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attrs.map((a, idx) => (
                    <TableRow key={a.id} sx={{ bgcolor: idx % 2 === 0 ? rowBg : 'transparent',
                      '&:hover': { bgcolor: `${C.teal}06` } }}>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, fontFamily: '"IBM Plex Mono", monospace', color: C.rose,
                          wordBreak: 'break-all', maxWidth: 280 }}>
                          {a.value}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={a.type}
                          sx={{ fontSize: 10, height: 20, bgcolor: `${C.teal}15`, color: C.teal, fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{a.category}</TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', color: 'text.disabled' }}>
                        #{a.event_id}
                        {a.Event?.info && (
                          <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.25, maxWidth: 180,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.Event.info}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={a.to_ids ? 'IDS' : 'Info'}
                          sx={{ fontSize: 10, height: 18, fontWeight: 700,
                            bgcolor: a.to_ids ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.12)',
                            color: a.to_ids ? '#EF4444' : '#64748B' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Box>
      )}
    </Box>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SOARPage() {
  const [activeTab, setActiveTab] = useState(0)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['soar-stats'],
    queryFn: () => soarApi.getStats().then(r => r.data),
    refetchInterval: 60000,
  })

  const iris = stats?.iris ?? {}
  const shuffle = stats?.shuffle ?? {}

  return (
    <PageShell
      title="SOAR & Incident Response"
      subtitle="Shuffle SOAR • DFIR-IRIS • MISP Threat Intelligence"
      breadcrumbs={[{ label: 'SECURITY OPERATIONS' }, { label: 'SOAR & IR' }]}
      status={iris.connected && shuffle.connected ? 'live' : 'offline'}
      statusLabel={iris.connected && shuffle.connected ? 'CONNECTED' : 'PARTIAL'}
      actions={
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <StatusDot ok={iris.connected} label={`IRIS${iris.connected ? '' : ' OFF'}`} />
          <StatusDot ok={shuffle.connected} label={`SHUFFLE${shuffle.connected ? '' : ' OFF'}`} />
        </Box>
      }
    >
      {/* Summary Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="IRIS Alerts"
            value={statsLoading ? undefined : (iris.total_alerts ?? 0)}
            loading={statsLoading}
            color={C.violet}
            icon={<NotificationsActiveRoundedIcon />}
            subtitle={`${iris.open_alerts ?? 0} open`}
            accent
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="IRIS Cases"
            value={statsLoading ? undefined : (iris.total_cases ?? 0)}
            loading={statsLoading}
            color={C.indigo}
            icon={<FolderOpenRoundedIcon />}
            subtitle="active cases"
            accent
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="Shuffle Workflows"
            value={statsLoading ? undefined : (shuffle.total_workflows ?? 0)}
            loading={statsLoading}
            color={C.teal}
            icon={<WorkspacesRoundedIcon />}
            subtitle="automated"
            accent
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="SOAR Status"
            value={iris.connected && shuffle.connected ? 'OK' : 'ERR'}
            loading={false}
            color={iris.connected && shuffle.connected ? C.green : C.rose}
            icon={<SecurityRoundedIcon />}
            subtitle="integration health"
            accent
          />
        </Grid>
      </Grid>

      {/* Main Tab Panel */}
      <SectionCard
        title="Security Operations"
        subtitle="จัดการ Alerts, Cases, Workflows และ Threat Intelligence"
        accent={C.violet}
        icon={<SecurityRoundedIcon />}
        noPad
      >
        <Box>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              px: 2,
              borderBottom: '1px solid',
              borderColor: `${C.violet}20`,
              '& .MuiTab-root': { fontSize: 12, fontWeight: 600, textTransform: 'none', minHeight: 44, py: 1 },
              '& .Mui-selected': { color: C.violet },
              '& .MuiTabs-indicator': { bgcolor: C.violet },
            }}
          >
            <Tab label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <NotificationsActiveRoundedIcon sx={{ fontSize: 15 }} />
                DFIR-IRIS
                {iris.open_alerts > 0 && (
                  <Chip size="small" label={iris.open_alerts}
                    sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: `${C.rose}20`, color: C.rose, ml: 0.25 }} />
                )}
              </Box>
            } />
            <Tab label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <WorkspacesRoundedIcon sx={{ fontSize: 15 }} />
                Shuffle SOAR
              </Box>
            } />
            <Tab label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <ShieldRoundedIcon sx={{ fontSize: 15 }} />
                MISP IOC Search
              </Box>
            } />
          </Tabs>

          <Box sx={{ p: 2.5 }}>
            {activeTab === 0 && <IRISTab irisUrl={iris.iris_url} />}
            {activeTab === 1 && <ShuffleTab shuffleUrl={shuffle.shuffle_url} />}
            {activeTab === 2 && <MISPTab mispUrl="https://10.251.151.15:4430" />}
          </Box>
        </Box>
      </SectionCard>
    </PageShell>
  )
}
