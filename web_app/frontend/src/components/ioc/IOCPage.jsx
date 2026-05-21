import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Grid, Chip, Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, Alert, CircularProgress, IconButton, Tooltip,
  Tabs, Tab, Divider, LinearProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SecurityIcon from '@mui/icons-material/Security'
import ListAltIcon from '@mui/icons-material/ListAlt'
import BarChartIcon from '@mui/icons-material/BarChart'
import HistoryIcon from '@mui/icons-material/History'
import GppBadIcon from '@mui/icons-material/GppBad'
import GppGoodIcon from '@mui/icons-material/GppGood'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { iocApi } from '../../services/api'
import { format } from 'date-fns'
import { useSnackbar } from 'notistack'

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899']
const ChartTooltipStyle = { background: 'rgba(30,41,59,0.95)', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }

// ─── Search Tab ───────────────────────────────────────────────────────────────
function SearchTab({ onSearchComplete }) {
  const [searchVal, setSearchVal] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const handleSearch = async () => {
    if (!searchVal.trim()) return
    setSearchLoading(true)
    try {
      const r = await iocApi.search(searchVal)
      setSearchResult(r.data)
      onSearchComplete?.(searchVal)
    } catch {}
    setSearchLoading(false)
  }

  const abuseScore = searchResult?.feeds?.abuseipdb?.abuseConfidenceScore
  const scoreColor = abuseScore > 50 ? '#ef4444' : abuseScore > 20 ? '#f59e0b' : '#10b981'

  return (
    <Box>
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11, mb: 1.5, display: 'block', textTransform: 'uppercase' }}>
        ค้นหา IOC ใน Threat Intelligence Feeds
      </Typography>
      <Grid container spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth size="small" label="IP Address / Domain / Hash / URL"
            value={searchVal} onChange={e => setSearchVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <Button
            fullWidth variant="contained"
            startIcon={searchLoading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            onClick={handleSearch} disabled={searchLoading}
            sx={{ borderRadius: 2 }}
          >
            ตรวจสอบ
          </Button>
        </Grid>
      </Grid>

      {searchResult && (
        <Box>
          {/* Risk Score Card */}
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                  <Box sx={{
                    width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `3px solid ${searchResult.custom_match ? '#ef4444' : abuseScore > 50 ? '#ef4444' : abuseScore > 20 ? '#f59e0b' : '#10b981'}`,
                    mx: 'auto', mb: 0.5,
                  }}>
                    {searchResult.custom_match
                      ? <GppBadIcon sx={{ fontSize: 28, color: '#ef4444' }} />
                      : abuseScore > 50
                        ? <GppBadIcon sx={{ fontSize: 28, color: '#ef4444' }} />
                        : <GppGoodIcon sx={{ fontSize: 28, color: '#10b981' }} />
                    }
                  </Box>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: 10, textTransform: 'uppercase' }}>
                    {searchResult.custom_match ? 'BLOCKED' : abuseScore > 50 ? 'MALICIOUS' : abuseScore > 20 ? 'SUSPICIOUS' : 'CLEAN'}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 16 }}>
                    {searchResult.value}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {searchResult.custom_match && (
                      <Chip label="Custom IOC Match" size="small" color="error" sx={{ fontSize: 10, height: 20 }} />
                    )}
                    {abuseScore !== undefined && (
                      <Chip label={`AbuseIPDB: ${abuseScore}%`} size="small" sx={{ fontSize: 10, height: 20, bgcolor: scoreColor, color: '#fff' }} />
                    )}
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Custom IOC Match Alert */}
          {searchResult.custom_match && (
            <Alert severity="error" sx={{ mb: 2, fontSize: 12 }}>
              <strong>พบใน Custom IOC:</strong> {searchResult.custom_ioc?.description} (Severity: {searchResult.custom_ioc?.severity})
            </Alert>
          )}

          {/* Feed Results */}
          <Grid container spacing={2}>
            {/* AbuseIPDB */}
            {searchResult.feeds?.abuseipdb && !searchResult.feeds.abuseipdb.error && (
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11 }}>🛡️ AbuseIPDB</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.disabled">Confidence</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: scoreColor }}>
                          {searchResult.feeds.abuseipdb.abuseConfidenceScore}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={searchResult.feeds.abuseipdb.abuseConfidenceScore || 0}
                        sx={{ height: 4, borderRadius: 2, my: 0.5, '& .MuiLinearProgress-bar': { bgcolor: scoreColor } }}
                      />
                      <Typography variant="caption" display="block" fontSize={11}>
                        ประเทศ: {searchResult.feeds.abuseipdb.countryCode || 'N/A'} | ISP: {searchResult.feeds.abuseipdb.isp || 'N/A'}
                      </Typography>
                      <Typography variant="caption" display="block" fontSize={11}>
                        Reports: {searchResult.feeds.abuseipdb.totalReports || 0} | Domain: {searchResult.feeds.abuseipdb.domain || '-'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* OTX */}
            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11 }}>🌐 AlienVault OTX</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {searchResult.feeds?.otx && Object.keys(searchResult.feeds.otx).length > 2 ? (
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        พบข้อมูลใน OTX — IOC ที่เกี่ยวข้อง
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.disabled">ไม่พบข้อมูลใน OTX</Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {!searchResult.custom_match && !abuseScore && (
            <Alert severity="success" sx={{ mt: 2, fontSize: 12 }}>ไม่พบใน IOC feeds ที่ตรวจสอบ</Alert>
          )}
        </Box>
      )}
    </Box>
  )
}

function HistoryTab({ activeValue }) {
  const [query, setQuery] = useState(activeValue || '')
  const [timeRange, setTimeRange] = useState('30d')
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLookup = async (value = query) => {
    if (!value?.trim()) return
    setLoading(true)
    try {
      const response = await iocApi.history(value, timeRange)
      setHistory(response.data)
      setQuery(value)
    } catch {
      setHistory({ value, count: 0, matches: [] })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Grid container spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="IOC Value"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && handleLookup()}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>ย้อนหลัง</InputLabel>
            <Select value={timeRange} label="ย้อนหลัง" onChange={event => setTimeRange(event.target.value)}>
              {['7d', '30d', '90d'].map(range => (
                <MenuItem key={range} value={range}>{range}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <HistoryIcon />}
            onClick={() => handleLookup()}
            disabled={loading}
          >
            ค้นย้อนหลัง
          </Button>
        </Grid>
      </Grid>

      {activeValue && !history && (
        <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
          พร้อมค้นย้อนหลังจาก IOC ล่าสุด: <strong>{activeValue}</strong>
        </Alert>
      )}

      {history && (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            พบ {history.count} alerts ที่เกี่ยวข้องกับ {history.value}
          </Typography>
          {history.matches?.length === 0 ? (
            <Alert severity="success" sx={{ fontSize: 12 }}>ไม่พบประวัติการ match ในช่วงเวลาที่เลือก</Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>เวลา</TableCell>
                  <TableCell>รายละเอียด</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Level</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.matches.map((match, index) => (
                  <TableRow key={`${match.timestamp}-${index}`} hover>
                    <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                      {match.timestamp ? format(new Date(match.timestamp), 'dd/MM HH:mm') : '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                        {match.description || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {match.agent || '-'} · {match.srcip || '-'} → {match.dstip || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{match.source || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={match.level || 0}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: 10,
                          fontWeight: 700,
                          bgcolor: match.level >= 15 ? '#ef4444' : match.level >= 12 ? '#f59e0b' : match.level >= 7 ? '#3b82f6' : '#10b981',
                          color: '#fff',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </Box>
  )
}

// ─── Custom IOC Tab ───────────────────────────────────────────────────────────
function CustomIOCTab() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ ioc_type: 'ip', value: '', description: '', severity: 'high' })

  const { data: customIOCs = [], isLoading } = useQuery({
    queryKey: ['custom-iocs'],
    queryFn: () => iocApi.listCustom().then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: data => iocApi.addCustom(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-iocs'] })
      setAddOpen(false)
      setForm({ ioc_type: 'ip', value: '', description: '', severity: 'high' })
      enqueueSnackbar('เพิ่ม IOC สำเร็จ', { variant: 'success' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: id => iocApi.deleteCustom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-iocs'] })
      enqueueSnackbar('ลบ IOC สำเร็จ', { variant: 'success' })
    },
  })

  const severityColor = s => ({ high: 'error', medium: 'warning', low: 'success', critical: 'error' }[s] || 'default')

  // Stats
  const byType = {}
  const bySeverity = {}
  customIOCs.forEach(i => {
    byType[i.ioc_type] = (byType[i.ioc_type] || 0) + 1
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1
  })

  return (
    <Box>
      {/* Stats Row */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined" sx={{ textAlign: 'center', py: 1 }}>
            <Typography variant="h5" fontWeight={700} color="primary">{customIOCs.length}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Total IOCs</Typography>
          </Card>
        </Grid>
        {Object.entries(byType).map(([type, count]) => (
          <Grid item xs={6} sm={3} key={type}>
            <Card variant="outlined" sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h5" fontWeight={700}>{count}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textTransform: 'uppercase' }}>{type}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setAddOpen(true)} sx={{ borderRadius: 2 }}>
          เพิ่ม IOC
        </Button>
      </Box>

      {/* Table */}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>ค่า</TableCell>
            <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>ประเภท</TableCell>
            <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>ความรุนแรง</TableCell>
            <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>คำอธิบาย</TableCell>
            <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>เพิ่มโดย</TableCell>
            <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>วันที่</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {customIOCs.map(ioc => (
            <TableRow key={ioc.id} hover>
              <TableCell sx={{ fontSize: 12, fontFamily: '"IBM Plex Mono", monospace' }}>{ioc.value}</TableCell>
              <TableCell><Chip label={ioc.ioc_type} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} /></TableCell>
              <TableCell><Chip label={ioc.severity} size="small" color={severityColor(ioc.severity)} sx={{ height: 18, fontSize: 10 }} /></TableCell>
              <TableCell sx={{ fontSize: 12, maxWidth: 200 }}>{ioc.description || '-'}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{ioc.added_by}</TableCell>
              <TableCell sx={{ fontSize: 11 }}>{ioc.added_at ? format(new Date(ioc.added_at), 'dd/MM/yy') : '-'}</TableCell>
              <TableCell>
                <Tooltip title="ลบ">
                  <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(ioc.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {customIOCs.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                ยังไม่มี Custom IOC — คลิก "เพิ่ม IOC" เพื่อเริ่มต้น
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>เพิ่ม IOC ใหม่</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>ประเภท</InputLabel>
                <Select value={form.ioc_type} label="ประเภท" onChange={e => setForm(f => ({ ...f, ioc_type: e.target.value }))}>
                  {['ip', 'domain', 'hash', 'url'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>ความรุนแรง</InputLabel>
                <Select value={form.severity} label="ความรุนแรง" onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                  {['critical','high','medium','low'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="ค่า IOC" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="คำอธิบาย" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={() => addMutation.mutate(form)} disabled={!form.value}>บันทึก</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Statistics Tab ───────────────────────────────────────────────────────────
function StatisticsTab() {
  const { data: customIOCs = [] } = useQuery({
    queryKey: ['custom-iocs'],
    queryFn: () => iocApi.listCustom().then(r => r.data),
  })

  const byType = {}
  const bySeverity = {}
  customIOCs.forEach(i => {
    byType[i.ioc_type] = (byType[i.ioc_type] || 0) + 1
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1
  })

  const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }))
  const sevData = Object.entries(bySeverity).map(([name, value]) => ({ name, value }))
  const sevColors = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' }

  return (
    <Box>
      <Grid container spacing={2}>
        {/* Summary Cards */}
        <Grid item xs={12}>
          <Grid container spacing={1.5}>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', py: 1.5 }}>
                <Typography variant="h4" fontWeight={700} color="primary">{customIOCs.length}</Typography>
                <Typography variant="caption" color="text.secondary">Total IOCs</Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', py: 1.5 }}>
                <Typography variant="h4" fontWeight={700} color="error">{bySeverity.critical || 0}</Typography>
                <Typography variant="caption" color="text.secondary">Critical</Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', py: 1.5 }}>
                <Typography variant="h4" fontWeight={700} color="warning.main">{bySeverity.high || 0}</Typography>
                <Typography variant="caption" color="text.secondary">High</Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', py: 1.5 }}>
                <Typography variant="h4" fontWeight={700}>{Object.keys(byType).length}</Typography>
                <Typography variant="caption" color="text.secondary">Types</Typography>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* By Type Pie */}
        <Grid item xs={12} sm={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>IOC by Type</Typography>
              {typeData.length === 0 ? (
                <Alert severity="info" sx={{ fontSize: 12 }}>ไม่มีข้อมูล</Alert>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30} paddingAngle={3}>
                      {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <RechartTooltip contentStyle={ChartTooltipStyle} />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* By Severity Bar */}
        <Grid item xs={12} sm={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>IOC by Severity</Typography>
              {sevData.length === 0 ? (
                <Alert severity="info" sx={{ fontSize: 12 }}>ไม่มีข้อมูล</Alert>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sevData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <RechartTooltip contentStyle={ChartTooltipStyle} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {sevData.map((entry, i) => (
                        <Cell key={i} fill={sevColors[entry.name] || '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

// ─── IOC Page ─────────────────────────────────────────────────────────────────
export default function IOCPage() {
  const [tab, setTab] = useState(0)
  const [activeIOC, setActiveIOC] = useState('')

  return (
    <Box className="page-enter">
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>ศูนย์ IOC (Indicators of Compromise)</Typography>
        <Typography variant="caption" color="text.secondary">Threat Intelligence — ค้นหาและจัดการ IOC</Typography>
      </Box>

      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1, borderColor: 'divider',
            '& .MuiTab-root': { fontSize: 12, minHeight: 40, py: 0 },
          }}
        >
          <Tab icon={<SearchIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="ค้นหา IOC" />
          <Tab icon={<ListAltIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Custom IOC" />
          <Tab icon={<BarChartIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="สถิติ" />
          <Tab icon={<HistoryIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="History" />
        </Tabs>
        <CardContent>
          {tab === 0 && <SearchTab onSearchComplete={setActiveIOC} />}
          {tab === 1 && <CustomIOCTab />}
          {tab === 2 && <StatisticsTab />}
          {tab === 3 && <HistoryTab activeValue={activeIOC} />}
        </CardContent>
      </Card>
    </Box>
  )
}
