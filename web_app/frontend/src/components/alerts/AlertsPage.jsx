import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, Typography, Chip, TextField, Select, MenuItem,
  FormControl, InputLabel, Button, Grid, Drawer, IconButton,
  Divider, CircularProgress, Tabs, Tab, Tooltip, Badge,
  Alert, Checkbox, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import FilterListIcon from '@mui/icons-material/FilterList'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SecurityIcon from '@mui/icons-material/Security'
import BugReportIcon from '@mui/icons-material/BugReport'
import GppBadIcon from '@mui/icons-material/GppBad'
import DataObjectIcon from '@mui/icons-material/DataObject'
import TimelineIcon from '@mui/icons-material/Timeline'
import TuneIcon from '@mui/icons-material/Tune'
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd'
import { format } from 'date-fns'
import { alertsApi, investigateApi } from '../../services/api'
import { useSnackbar } from 'notistack'

// ─── Level Badge ──────────────────────────────────────────────────────────────
function LevelBadge({ level }) {
  const l = Number(level)
  if (l >= 15) return <Chip label={`${l} CRIT`} size="small" sx={{ bgcolor: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, animation: 'pulse-critical 3s ease-in-out infinite' }} />
  if (l >= 12) return <Chip label={`${l} HIGH`} size="small" sx={{ bgcolor: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700 }} />
  if (l >= 7)  return <Chip label={`${l} MED`}  size="small" sx={{ bgcolor: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 600 }} />
  return <Chip label={`${l} LOW`} size="small" sx={{ bgcolor: '#10b981', color: '#fff', fontSize: 11 }} />
}

// ─── MITRE Tag ────────────────────────────────────────────────────────────────
function MitreTag({ groups = [] }) {
  const mitre = groups.filter(g => g.startsWith('mitre') || g.startsWith('attack'))
  if (mitre.length === 0) return null
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
      {mitre.map(m => (
        <Chip
          key={m}
          label={m.replace('mitre-', '').replace('attack.', '')}
          size="small"
          variant="outlined"
          sx={{ height: 18, fontSize: 9, borderColor: '#8b5cf6', color: '#8b5cf6' }}
        />
      ))}
    </Box>
  )
}

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DetailRow({ label, value, mono = false, copyable = false }) {
  const { enqueueSnackbar } = useSnackbar()
  if (!value || value === '-') return null
  return (
    <Box sx={{ mb: 0.8 }}>
      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontSize: 12, fontFamily: mono ? '"IBM Plex Mono", monospace' : 'inherit', wordBreak: 'break-all' }}>
          {value}
        </Typography>
        {copyable && (
          <Tooltip title="คัดลอก">
            <IconButton
              size="small"
              onClick={() => { navigator.clipboard.writeText(String(value)); enqueueSnackbar('คัดลอกแล้ว', { variant: 'info' }) }}
              sx={{ p: 0.3, opacity: 0.5, '&:hover': { opacity: 1 } }}
            >
              <ContentCopyIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  )
}

// ─── Alert Side Panel (Drawer) ────────────────────────────────────────────────
function AlertDrawer({ alert, open, onClose }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [enrichData, setEnrichData] = useState(null)
  const [enrichLoading, setEnrichLoading] = useState(false)

  const srcip = alert?.['data.srcip'] || alert?.data?.srcip
  const dstip = alert?.['data.dstip'] || alert?.data?.dstip
  const ruleLevel = Number(alert?.['rule.level'] || alert?.rule?.level || 0)
  const ruleGroups = alert?.['rule.groups'] || alert?.rule?.groups || []
  const ruleId = alert?.['rule.id'] || alert?.rule?.id
  const ruleDesc = alert?.['rule.description'] || alert?.rule?.description
  const agentName = alert?.['agent.name'] || alert?.agent?.name
  const timestamp = alert?.['@timestamp']
  const country = alert?.['GeoLocation.country_name'] || alert?.GeoLocation?.country_name
  const program = alert?.['predecoder.program_name'] || alert?.predecoder?.program_name

  const fetchEnrich = async () => {
    if (!srcip) return
    setEnrichLoading(true)
    try {
      const r = await investigateApi.enrich(srcip)
      setEnrichData(r.data)
    } catch {}
    setEnrichLoading(false)
  }

  useEffect(() => {
    if (open && srcip && !enrichData) fetchEnrich()
  }, [open, srcip, enrichData])

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, display: 'flex', flexDirection: 'column' } }}
    >
      {alert && (
        <>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: ruleLevel >= 15 ? 'rgba(239,68,68,0.06)' : ruleLevel >= 12 ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <LevelBadge level={ruleLevel} />
              <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
            </Box>
            <Typography variant="body1" fontWeight={700} sx={{ fontSize: 14, lineHeight: 1.3, mb: 0.5 }}>
              {ruleDesc}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label={`Rule #${ruleId}`} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
              {timestamp && (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                  {format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss')}
                </Typography>
              )}
            </Box>
            <MitreTag groups={ruleGroups} />
          </Box>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 36, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 36, fontSize: 12, py: 0 } }}
          >
            <Tab icon={<VisibilityIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="รายละเอียด" />
            <Tab icon={<SecurityIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="Threat Intel" />
            <Tab icon={<DataObjectIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="Raw JSON" />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {/* Tab 0: Details */}
            {tab === 0 && (
              <Box>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase' }}>
                  แหล่งที่มาและเป้าหมาย
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <DetailRow label="Source IP" value={srcip} mono copyable />
                  <DetailRow label="Destination IP" value={dstip} mono copyable />
                  <DetailRow label="ประเทศ" value={country} />
                  <DetailRow label="โปรแกรม" value={program} />
                  <DetailRow label="Agent" value={agentName} />
                  <DetailRow label="Rule ID" value={ruleId} mono />
                </Box>

                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase' }}>
                  Rule Groups
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {ruleGroups.length > 0 ? ruleGroups.map(g => (
                    <Chip key={g} label={g} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                  )) : (
                    <Typography variant="caption" color="text.disabled">ไม่มีข้อมูล groups</Typography>
                  )}
                </Box>

                {alert?.['data.win.eventdata.targetUserName'] && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase' }}>
                      Windows Event
                    </Typography>
                    <DetailRow label="Target User" value={alert['data.win.eventdata.targetUserName']} />
                    <DetailRow label="Logon Type" value={alert['data.win.eventdata.logonType']} />
                  </>
                )}

                {/* Full Alert Data — expandable */}
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase' }}>
                  ข้อมูลดิบ (ย่อ)
                </Typography>
                <Box sx={{ bgcolor: 'background.default', p: 1, borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                  <Typography variant="caption" component="pre" sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(alert, null, 2).slice(0, 2000)}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Tab 1: Threat Intel */}
            {tab === 1 && (
              <Box>
                {!srcip ? (
                  <Alert severity="info" sx={{ fontSize: 12 }}>ไม่มี Source IP สำหรับตรวจสอบ</Alert>
                ) : enrichLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
                    <CircularProgress size={32} />
                    <Typography variant="caption" color="text.secondary">กำลังตรวจสอบ {srcip}...</Typography>
                  </Box>
                ) : !enrichData ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Button variant="outlined" onClick={fetchEnrich} startIcon={<SecurityIcon />}>
                      ตรวจสอบ Threat Intel สำหรับ {srcip}
                    </Button>
                  </Box>
                ) : enrichData.is_private ? (
                  <Alert severity="info" sx={{ fontSize: 12 }}>
                    {srcip} เป็น Private IP — ไม่ตรวจสอบ Threat Intelligence
                  </Alert>
                ) : (
                  <Box>
                    {/* AbuseIPDB */}
                    <Card variant="outlined" sx={{ mb: 1.5 }}>
                      <Box sx={{ p: 1.5 }}>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, color: 'text.secondary' }}>
                          🛡️ AbuseIPDB
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 0.5 }}>
                          <Box>
                            <Typography variant="caption" color="text.disabled" display="block" fontSize={10}>Confidence Score</Typography>
                            <Typography variant="h5" fontWeight={700} color={
                              (enrichData.abuseipdb?.abuseConfidenceScore || 0) > 50 ? 'error.main' :
                              (enrichData.abuseipdb?.abuseConfidenceScore || 0) > 20 ? 'warning.main' : 'success.main'
                            }>
                              {enrichData.abuseipdb?.abuseConfidenceScore ?? 'N/A'}%
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.disabled" display="block" fontSize={10}>Reports</Typography>
                            <Typography variant="h5" fontWeight={700}>
                              {enrichData.abuseipdb?.totalReports ?? 'N/A'}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ mt: 0.5 }}>
                          <DetailRow label="ประเทศ" value={enrichData.abuseipdb?.countryCode} />
                          <DetailRow label="ISP" value={enrichData.abuseipdb?.isp} />
                          <DetailRow label="Domain" value={enrichData.abuseipdb?.domain} />
                          <DetailRow label="Usage Type" value={enrichData.abuseipdb?.usageType} />
                        </Box>
                      </Box>
                    </Card>

                    {/* OTX */}
                    <Card variant="outlined" sx={{ mb: 1.5 }}>
                      <Box sx={{ p: 1.5 }}>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, color: 'text.secondary' }}>
                          🌐 AlienVault OTX
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {enrichData.otx && Object.keys(enrichData.otx).length > 0 ? (
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              พบข้อมูล OTX — {JSON.stringify(enrichData.otx).length > 20 ? 'มี IOC ที่เกี่ยวข้อง' : 'ไม่พบภัยคุกคาม'}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.disabled">ไม่พบข้อมูล OTX</Typography>
                          )}
                        </Box>
                      </Box>
                    </Card>

                    {/* GeoIP */}
                    {country && (
                      <Card variant="outlined">
                        <Box sx={{ p: 1.5 }}>
                          <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, color: 'text.secondary' }}>
                            📍 GeoIP
                          </Typography>
                          <DetailRow label="Country" value={country} />
                        </Box>
                      </Card>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {/* Tab 2: Raw JSON */}
            {tab === 2 && (
              <Box sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 1, overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                <Typography variant="caption" component="pre" sx={{
                  fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {JSON.stringify(alert, null, 2)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Action Buttons Footer */}
          <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {srcip && (
              <Button
                size="small" variant="contained" color="primary"
                startIcon={<OpenInNewIcon />}
                onClick={() => { onClose(); navigate(`/investigate?q=${srcip}`) }}
                sx={{ borderRadius: 2, fontSize: 11 }}
              >
                สืบสวน IP
              </Button>
            )}
            {srcip && (
              <Button
                size="small" variant="outlined" color="warning"
                startIcon={<BookmarkAddIcon />}
                onClick={() => { onClose(); navigate(`/ioc?add=${srcip}`) }}
                sx={{ borderRadius: 2, fontSize: 11 }}
              >
                เพิ่ม IOC
              </Button>
            )}
            <Button
              size="small" variant="outlined"
              startIcon={<TuneIcon />}
              onClick={() => { onClose(); navigate(`/admin?tab=1&rule=${ruleId}`) }}
              sx={{ borderRadius: 2, fontSize: 11 }}
            >
              Tuning
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  )
}

// ─── Sources ──────────────────────────────────────────────────────────────────
const SOURCES = ['fortigate', 'mikrotik', 'infoblox', 'huawei-ac', 'suricata', 'syscheck', 'ossec']

// ─── Alerts Page ──────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const navigate = useNavigate()
  const [level, setLevel] = useState(1)
  const [source, setSource] = useState('')
  const [timeRange, setTimeRange] = useState('24h')
  const [search, setSearch] = useState('')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectionModel, setSelectionModel] = useState([])
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 })

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['alerts', level, source, timeRange, search],
    queryFn: () => alertsApi.list({
      level,
      source: source || undefined,
      time_range: timeRange,
      q: search || undefined,
      limit: 500,
    }).then(r => r.data),
    refetchInterval: 60000,
  })

  // Count by severity
  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 }
    alerts.forEach(a => {
      const l = Number(a['rule.level'] || a?.rule?.level || 0)
      if (l >= 15) c.critical++
      else if (l >= 12) c.high++
      else if (l >= 7) c.medium++
      else c.low++
    })
    return c
  }, [alerts])

  const columns = [
    {
      field: '@timestamp', headerName: 'เวลา', width: 140,
      renderCell: p => (
        <Typography variant="caption" sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace' }}>
          {p.value ? format(new Date(p.value), 'MM/dd HH:mm:ss') : '-'}
        </Typography>
      ),
    },
    {
      field: 'rule.level', headerName: 'ระดับ', width: 100,
      renderCell: p => <LevelBadge level={p.value || p.row?.rule?.level} />,
      sortable: true,
    },
    {
      field: 'rule.description', headerName: 'คำอธิบาย', flex: 1, minWidth: 220,
      renderCell: p => (
        <Box>
          <Typography variant="caption" sx={{ fontSize: 12, display: 'block', lineHeight: 1.3 }}>
            {p.value || p.row?.rule?.description || ''}
          </Typography>
          {(p.row?.['rule.groups'] || p.row?.rule?.groups || []).some(g => g.startsWith('mitre')) && (
            <MitreTag groups={p.row?.['rule.groups'] || p.row?.rule?.groups || []} />
          )}
        </Box>
      ),
    },
    {
      field: 'predecoder.program_name', headerName: 'แหล่งที่มา', width: 120,
      renderCell: p => (
        <Chip
          label={p.value || p.row?.predecoder?.program_name || '-'}
          size="small"
          variant="outlined"
          sx={{ height: 20, fontSize: 10 }}
        />
      ),
    },
    {
      field: 'data.srcip', headerName: 'Source IP', width: 130,
      renderCell: p => (
        <Typography
          variant="caption"
          sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={e => {
            e.stopPropagation()
            const ip = p.value || p.row?.data?.srcip
            if (ip) navigate(`/investigate?q=${ip}`)
          }}
        >
          {p.value || p.row?.data?.srcip || '-'}
        </Typography>
      ),
    },
    {
      field: 'GeoLocation', headerName: 'ประเทศ', width: 100,
      renderCell: p => (
        <Typography variant="caption" sx={{ fontSize: 11 }}>
          {(p.value || p.row?.GeoLocation)?.country_name || '-'}
        </Typography>
      ),
    },
    {
      field: 'agent.name', headerName: 'Agent', width: 110,
      renderCell: p => (
        <Typography variant="caption" sx={{ fontSize: 11 }}>
          {p.value || p.row?.agent?.name || '-'}
        </Typography>
      ),
    },
  ]

  const rows = alerts.map((a, i) => ({ id: i, ...a }))

  return (
    <Box className="page-enter">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>แจ้งเตือนภัยคุกคาม</Typography>
          <Typography variant="caption" color="text.secondary">Alert Management — กรองและจัดการภัยคุกคาม</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {selectionModel.length > 0 && (
            <Chip
              label={`เลือก ${selectionModel.length} รายการ`}
              color="primary"
              size="small"
              onDelete={() => setSelectionModel([])}
              sx={{ fontWeight: 600 }}
            />
          )}
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => refetch()} variant="outlined" sx={{ borderRadius: 2 }}>
            รีเฟรช
          </Button>
        </Box>
      </Box>

      {/* Severity Counter Cards */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {[
          { key: 'critical', label: 'Critical', color: '#ef4444', count: counts.critical },
          { key: 'high', label: 'High', color: '#f59e0b', count: counts.high },
          { key: 'medium', label: 'Medium', color: '#3b82f6', count: counts.medium },
          { key: 'low', label: 'Low', color: '#10b981', count: counts.low },
        ].map(s => (
          <Grid item xs={3} key={s.key}>
            <Card
              onClick={() => setLevel(s.key === 'critical' ? 15 : s.key === 'high' ? 12 : s.key === 'medium' ? 7 : 1)}
              sx={{
                cursor: 'pointer', textAlign: 'center', py: 1,
                borderBottom: `3px solid ${s.color}`,
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${s.color}33` },
              }}
            >
              <Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>
                {s.count.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textTransform: 'uppercase' }}>
                {s.label}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter Bar */}
      <Card sx={{ mb: 2, p: 1.5 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small" label="ค้นหา" value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> }}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>ระดับขั้นต่ำ</InputLabel>
              <Select value={level} label="ระดับขั้นต่ำ" onChange={e => setLevel(e.target.value)}>
                {[1,3,7,12,15].map(l => <MenuItem key={l} value={l}>Level {l}+</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>แหล่งที่มา</InputLabel>
              <Select value={source} label="แหล่งที่มา" onChange={e => setSource(e.target.value)}>
                <MenuItem value="">ทั้งหมด</MenuItem>
                {SOURCES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>ช่วงเวลา</InputLabel>
              <Select value={timeRange} label="ช่วงเวลา" onChange={e => setTimeRange(e.target.value)}>
                {['1h','6h','24h','7d','30d'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={`${alerts.length} รายการ`}
                color="primary"
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                {timeRange}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* DataGrid */}
      <Card sx={{ height: 'calc(100vh - 380px)', minHeight: 400 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={setSelectionModel}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[25, 50, 100]}
          onRowClick={p => { setSelectedAlert(p.row); setDrawerOpen(true) }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-row:hover': { cursor: 'pointer', bgcolor: 'action.hover' },
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' },
            '& .MuiDataGrid-row.row-critical': { bgcolor: 'rgba(239,68,68,0.06)', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } },
            '& .MuiDataGrid-row.row-high': { bgcolor: 'rgba(245,158,11,0.04)', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' } },
            fontSize: 12,
          }}
          getRowClassName={p => {
            const l = Number(p.row['rule.level'] || p.row?.rule?.level || 0)
            if (l >= 15) return 'row-critical'
            if (l >= 12) return 'row-high'
            return ''
          }}
          getRowHeight={() => 'auto'}
        />
      </Card>

      {/* Alert Side Panel */}
      <AlertDrawer
        alert={selectedAlert}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </Box>
  )
}
