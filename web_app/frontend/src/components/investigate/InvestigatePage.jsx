import { useState } from 'react'
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Grid, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Divider,
  CircularProgress, Alert,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { investigateApi } from '../../services/api'
import { format } from 'date-fns'

export default function InvestigatePage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('auto')
  const [timeRange, setTimeRange] = useState('30d')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [enrichData, setEnrichData] = useState(null)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResults(null)
    setEnrichData(null)
    try {
      const r = await investigateApi.search(query, type, timeRange)
      setResults(r.data)
      if (type === 'auto' || type === 'ip') {
        try {
          const e = await investigateApi.enrich(query)
          setEnrichData(e.data)
        } catch {}
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>สืบสวน</Typography>

      <Card sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth size="small" label="ค้นหา (IP / MAC / Username / Hostname)"
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>ประเภท</InputLabel>
              <Select value={type} label="ประเภท" onChange={e => setType(e.target.value)}>
                <MenuItem value="auto">อัตโนมัติ</MenuItem>
                <MenuItem value="ip">IP Address</MenuItem>
                <MenuItem value="mac">MAC Address</MenuItem>
                <MenuItem value="user">Username</MenuItem>
                <MenuItem value="host">Hostname</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>ย้อนหลัง</InputLabel>
              <Select value={timeRange} label="ย้อนหลัง" onChange={e => setTimeRange(e.target.value)}>
                {['7d','14d','30d','90d'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              fullWidth variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              onClick={handleSearch} disabled={loading || !query.trim()}
            >
              ค้นหา
            </Button>
          </Grid>
        </Grid>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {enrichData && !enrichData.is_private && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>Threat Intelligence: {query}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">AbuseIPDB Confidence</Typography>
                <Typography variant="h6" color={enrichData.abuseipdb?.abuseConfidenceScore > 50 ? 'error' : 'text.primary'}>
                  {enrichData.abuseipdb?.abuseConfidenceScore ?? 'N/A'}%
                </Typography>
                <Typography variant="caption" display="block">
                  ประเทศ: {enrichData.abuseipdb?.countryCode || '-'} | ISP: {enrichData.abuseipdb?.isp || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">OTX Reputation</Typography>
                <Typography variant="body2">
                  {JSON.stringify(enrichData.otx).length > 10 ? 'พบข้อมูล OTX' : 'ไม่พบข้อมูล'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Timeline เหตุการณ์ ({results.count} รายการ)
              </Typography>
              <Chip size="small" label={`ย้อนหลัง ${timeRange}`} />
            </Box>
            {results.events.length === 0 ? (
              <Alert severity="info">ไม่พบเหตุการณ์ที่เกี่ยวข้อง</Alert>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>เวลา</TableCell>
                      <TableCell>คำอธิบาย</TableCell>
                      <TableCell>แหล่งที่มา</TableCell>
                      <TableCell>ระดับ</TableCell>
                      <TableCell>Agent</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.events.slice(0, 100).map((e, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {e['@timestamp'] ? format(new Date(e['@timestamp']), 'MM/dd HH:mm') : '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{e.rule?.description || e['rule.description'] || '-'}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{e.predecoder?.program_name || '-'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={e.rule?.level || '-'} sx={{ fontSize: 10 }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{e.agent?.name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
