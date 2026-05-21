import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Grid, Chip, Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, Alert, CircularProgress, IconButton, Tooltip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { iocApi } from '../../services/api'
import { format } from 'date-fns'
import { useSnackbar } from 'notistack'

export default function IOCPage() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [searchVal, setSearchVal] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ ioc_type: 'ip', value: '', description: '', severity: 'high' })

  const { data: customIOCs = [] } = useQuery({
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

  const handleSearch = async () => {
    if (!searchVal.trim()) return
    setSearchLoading(true)
    try {
      const r = await iocApi.search(searchVal)
      setSearchResult(r.data)
    } catch {}
    setSearchLoading(false)
  }

  const severityColor = s => ({ high: 'error', medium: 'warning', low: 'success', critical: 'error' }[s] || 'default')

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>ศูนย์ IOC (Indicators of Compromise)</Typography>

      <Card sx={{ mb: 2, p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1.5}>ค้นหา IOC</Typography>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth size="small" label="IP Address / Domain / Hash"
              value={searchVal} onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth variant="contained"
              startIcon={searchLoading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              onClick={handleSearch} disabled={searchLoading}
            >
              ตรวจสอบ
            </Button>
          </Grid>
        </Grid>

        {searchResult && (
          <Box mt={2} p={1.5} sx={{ bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" mb={1}>ผลการตรวจสอบ: {searchResult.value}</Typography>
            <Grid container spacing={1}>
              {searchResult.custom_match && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ fontSize: 12 }}>
                    พบใน Custom IOC: {searchResult.custom_ioc?.description} (Severity: {searchResult.custom_ioc?.severity})
                  </Alert>
                </Grid>
              )}
              {searchResult.feeds?.abuseipdb && !searchResult.feeds.abuseipdb.error && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" display="block">AbuseIPDB</Typography>
                  <Typography variant="body2">
                    Confidence: <strong>{searchResult.feeds.abuseipdb.abuseConfidenceScore}%</strong>
                    {' '}| ประเทศ: {searchResult.feeds.abuseipdb.countryCode || 'N/A'}
                  </Typography>
                </Grid>
              )}
              {!searchResult.custom_match && !searchResult.feeds?.abuseipdb?.abuseConfidenceScore && (
                <Grid item xs={12}>
                  <Alert severity="success" sx={{ fontSize: 12 }}>ไม่พบใน IOC feeds ที่ตรวจสอบ</Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>Custom IOC List ({customIOCs.length})</Typography>
            <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setAddOpen(true)}>
              เพิ่ม IOC
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ค่า</TableCell>
                <TableCell>ประเภท</TableCell>
                <TableCell>ความรุนแรง</TableCell>
                <TableCell>คำอธิบาย</TableCell>
                <TableCell>เพิ่มโดย</TableCell>
                <TableCell>วันที่</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customIOCs.map(ioc => (
                <TableRow key={ioc.id} hover>
                  <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{ioc.value}</TableCell>
                  <TableCell><Chip label={ioc.ioc_type} size="small" /></TableCell>
                  <TableCell><Chip label={ioc.severity} size="small" color={severityColor(ioc.severity)} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{ioc.description || '-'}</TableCell>
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
