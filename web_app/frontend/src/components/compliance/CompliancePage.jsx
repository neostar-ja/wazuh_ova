import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Box, Card, CardContent, Typography, Grid, Chip,
  Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, FormControl, Skeleton,
} from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { complianceApi } from '../../services/api'

const FRAMEWORKS = [
  { key: 'pci_dss', label: 'PCI DSS' },
  { key: 'hipaa', label: 'HIPAA' },
  { key: 'gdpr', label: 'GDPR' },
  { key: 'nist', label: 'NIST 800-53' },
  { key: 'tsc', label: 'TSC' },
]

export default function CompliancePage() {
  const [tab, setTab] = useState(0)
  const [timeRange, setTimeRange] = useState('7d')

  const { data: summary, isLoading } = useQuery({
    queryKey: ['compliance', timeRange],
    queryFn: () => complianceApi.summary(timeRange).then(r => r.data),
    refetchInterval: 300000,
  })

  const fw = FRAMEWORKS[tab]
  const fwData = summary?.[fw.key] || {}
  const chartData = fwData.top_requirements?.map(r => ({ name: r.req, count: r.count })) || []

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>ความสอดคล้อง (Compliance)</Typography>
        <FormControl size="small">
          <Select value={timeRange} onChange={e => setTimeRange(e.target.value)}>
            {['24h','7d','30d','90d'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {FRAMEWORKS.map(fw => (
          <Grid item xs={6} sm={2.4} key={fw.key}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{fw.label}</Typography>
                {isLoading
                  ? <Skeleton height={32} />
                  : <Typography variant="h5" fontWeight={700} color="primary">
                      {summary?.[fw.key]?.total?.toLocaleString() || 0}
                    </Typography>}
                <Typography variant="caption" color="text.secondary">alerts</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {FRAMEWORKS.map((fw, i) => <Tab key={fw.key} label={fw.label} />)}
        </Tabs>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} mb={2}>
            {fw.label} — Top Requirements ({timeRange})
          </Typography>
          {isLoading ? <Skeleton variant="rectangular" height={200} /> : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={7}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={2} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={5}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Requirement</TableCell>
                      <TableCell align="right">Alerts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {chartData.slice(0, 15).map((r, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{r.name}</TableCell>
                        <TableCell align="right">
                          <Chip label={r.count} size="small" color="primary" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
