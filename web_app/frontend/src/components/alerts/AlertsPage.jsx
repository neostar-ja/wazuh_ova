import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Card, Typography, Chip, TextField, Select, MenuItem,
  FormControl, InputLabel, Button, Grid, Drawer, IconButton,
  Divider, CircularProgress,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import FilterListIcon from '@mui/icons-material/FilterList'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import { format } from 'date-fns'
import { alertsApi, investigateApi } from '../../services/api'

function LevelBadge({ level }) {
  const l = Number(level)
  if (l >= 15) return <Chip label={`${l} CRIT`} size="small" sx={{ bgcolor: '#ef4444', color: '#fff', fontSize: 11 }} />
  if (l >= 12) return <Chip label={`${l} HIGH`} size="small" sx={{ bgcolor: '#f59e0b', color: '#fff', fontSize: 11 }} />
  if (l >= 7)  return <Chip label={`${l} MED`}  size="small" sx={{ bgcolor: '#3b82f6', color: '#fff', fontSize: 11 }} />
  return <Chip label={`${l} LOW`} size="small" sx={{ bgcolor: '#10b981', color: '#fff', fontSize: 11 }} />
}

function AlertDrawer({ alert, open, onClose }) {
  const [enrichData, setEnrichData] = useState(null)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const srcip = alert?.['data.srcip'] || alert?.data?.srcip

  const fetchEnrich = async () => {
    if (!srcip) return
    setEnrichLoading(true)
    try {
      const r = await investigateApi.enrich(srcip)
      setEnrichData(r.data)
    } catch {}
    setEnrichLoading(false)
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 2 } }}>
      {alert && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={700} fontSize={16}>รายละเอียด Alert</Typography>
            <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
          </Box>
          <LevelBadge level={alert['rule.level'] || alert?.rule?.level} />
          <Typography variant="body2" fontWeight={600} mt={1} mb={2}>
            {alert['rule.description'] || alert?.rule?.description}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {[
            ['เวลา', alert['@timestamp'] ? format(new Date(alert['@timestamp']), 'dd/MM/yyyy HH:mm:ss') : '-'],
            ['Rule ID', alert['rule.id'] || alert?.rule?.id],
            ['Agent', alert['agent.name'] || alert?.agent?.name],
            ['Source IP', srcip],
            ['ประเทศ', alert['GeoLocation.country_name'] || alert?.GeoLocation?.country_name],
            ['โปรแกรม', alert['predecoder.program_name'] || alert?.predecoder?.program_name],
            ['Groups', (alert['rule.groups'] || alert?.rule?.groups || []).join(', ')],
          ].map(([k, v]) => v ? (
            <Box key={k} sx={{ mb: 0.8 }}>
              <Typography variant="caption" color="text.secondary">{k}</Typography>
              <Typography variant="body2" fontFamily="monospace" fontSize={12}>{v}</Typography>
            </Box>
          ) : null)}
          {srcip && (
            <Box mt={2}>
              <Button size="small" variant="outlined" onClick={fetchEnrich} disabled={enrichLoading}>
                {enrichLoading ? <CircularProgress size={16} /> : '🔍 ตรวจสอบ IP'}
              </Button>
              {enrichData && !enrichData.is_private && (
                <Box mt={1} p={1} sx={{ bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">AbuseIPDB Score: </Typography>
                  <Typography variant="body2" color="error">
                    {enrichData.abuseipdb?.abuseConfidenceScore ?? 'N/A'}%
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
    </Drawer>
  )
}

const SOURCES = ['fortigate', 'mikrotik', 'infoblox', 'huawei-ac', 'suricata', 'syscheck', 'ossec']

export default function AlertsPage() {
  const [level, setLevel] = useState(1)
  const [source, setSource] = useState('')
  const [timeRange, setTimeRange] = useState('24h')
  const [search, setSearch] = useState('')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['alerts', level, source, timeRange, search],
    queryFn: () => alertsApi.list({ level, source: source || undefined, time_range: timeRange, q: search || undefined, limit: 200 }).then(r => r.data),
    refetchInterval: 60000,
  })

  const columns = [
    { field: '@timestamp', headerName: 'เวลา', width: 150, renderCell: p => p.value ? format(new Date(p.value), 'MM/dd HH:mm:ss') : '-' },
    { field: 'rule.level', headerName: 'ระดับ', width: 110, renderCell: p => <LevelBadge level={p.value || p.row?.rule?.level} />, sortable: true },
    { field: 'rule.description', headerName: 'คำอธิบาย', flex: 1, minWidth: 200, renderCell: p => p.value || p.row?.rule?.description || '' },
    { field: 'predecoder.program_name', headerName: 'แหล่งที่มา', width: 130, renderCell: p => p.value || p.row?.predecoder?.program_name || '-' },
    { field: 'data.srcip', headerName: 'Source IP', width: 130, renderCell: p => p.value || p.row?.data?.srcip || '-' },
    { field: 'GeoLocation', headerName: 'ประเทศ', width: 120, renderCell: p => (p.value || p.row?.GeoLocation)?.country_name || '-' },
    { field: 'agent.name', headerName: 'Agent', width: 120, renderCell: p => p.value || p.row?.agent?.name || '-' },
  ]

  const rows = alerts.map((a, i) => ({ id: i, ...a }))

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>แจ้งเตือนภัยคุกคาม</Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={() => refetch()}>รีเฟรช</Button>
      </Box>

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
            <Chip label={`${alerts.length} รายการ`} color="primary" size="small" />
          </Grid>
        </Grid>
      </Card>

      <Card sx={{ height: 'calc(100vh - 300px)' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          density="compact"
          disableRowSelectionOnClick
          onRowClick={p => { setSelectedAlert(p.row); setDrawerOpen(true) }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-row:hover': { cursor: 'pointer', bgcolor: 'action.hover' },
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' },
            fontSize: 12,
          }}
          getRowClassName={p => {
            const l = Number(p.row['rule.level'] || p.row?.rule?.level || 0)
            if (l >= 15) return 'row-critical'
            if (l >= 12) return 'row-high'
            return ''
          }}
        />
      </Card>

      <AlertDrawer
        alert={selectedAlert}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </Box>
  )
}
