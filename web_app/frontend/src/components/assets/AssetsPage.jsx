import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Box, Card, CardContent, Typography, Tabs, Tab,
  Table, TableBody, TableCell, TableHead, TableRow,
  Chip, FormControl, Select, MenuItem, TextField,
  InputAdornment, Skeleton,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { assetsApi } from '../../services/api'
import { format } from 'date-fns'

export default function AssetsPage() {
  const [tab, setTab] = useState(0)
  const [timeRange, setTimeRange] = useState('7d')
  const [search, setSearch] = useState('')

  const { data: devices = [], isLoading: devLoading } = useQuery({
    queryKey: ['assets-devices', timeRange],
    queryFn: () => assetsApi.devices(timeRange).then(r => r.data),
  })
  const { data: dhcp = [], isLoading: dhcpLoading } = useQuery({
    queryKey: ['assets-dhcp', timeRange],
    queryFn: () => assetsApi.dhcp(timeRange).then(r => r.data),
  })
  const { data: sessions = [], isLoading: sessLoading } = useQuery({
    queryKey: ['assets-sessions', timeRange],
    queryFn: () => assetsApi.sessions(timeRange).then(r => r.data),
  })

  const filterStr = search.toLowerCase()
  const filteredDevices = devices.filter(d =>
    (d.ip || '').includes(filterStr) || (d.mac || '').toLowerCase().includes(filterStr)
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>สินทรัพย์เครือข่าย</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small" placeholder="ค้นหา IP / MAC"
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <FormControl size="small">
            <Select value={timeRange} onChange={e => setTimeRange(e.target.value)}>
              {['1d','7d','14d','30d'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`อุปกรณ์ (${filteredDevices.length})`} />
          <Tab label={`DHCP (${dhcp.length})`} />
          <Tab label={`WiFi Sessions (${sessions.length})`} />
        </Tabs>

        <CardContent sx={{ p: 0, overflowX: 'auto' }}>
          {tab === 0 && (
            devLoading ? <Skeleton variant="rectangular" height={300} sx={{ m: 2 }} /> : (
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>IP Address</TableCell>
                  <TableCell>MAC Address</TableCell>
                  <TableCell align="right">จำนวน Events</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {filteredDevices.map((d, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{d.ip}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{d.mac}</TableCell>
                      <TableCell align="right"><Chip size="small" label={d.count} /></TableCell>
                    </TableRow>
                  ))}
                  {filteredDevices.length === 0 && (
                    <TableRow><TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 3 }}>ไม่พบข้อมูล</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )
          )}

          {tab === 1 && (
            dhcpLoading ? <Skeleton variant="rectangular" height={300} sx={{ m: 2 }} /> : (
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>เวลา</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>MAC</TableCell>
                  <TableCell>Hostname</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Agent</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {dhcp.slice(0, 200).map((d, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                        {d['@timestamp'] ? format(new Date(d['@timestamp']), 'MM/dd HH:mm') : '-'}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.data?.dhcp_ip || '-'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.data?.dhcp_mac || '-'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{d.data?.dhcp_hostname || '-'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={d.data?.dhcp_action || '-'}
                          color={d.data?.dhcp_action === 'ACK' ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{d.agent?.name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}

          {tab === 2 && (
            sessLoading ? <Skeleton variant="rectangular" height={300} sx={{ m: 2 }} /> : (
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>เวลา</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>MAC</TableCell>
                  <TableCell>AP MAC</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>User</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {sessions.slice(0, 200).map((s, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                        {s['@timestamp'] ? format(new Date(s['@timestamp']), 'MM/dd HH:mm') : '-'}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{s.data?.srcip || '-'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{s.data?.mac || '-'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{s.data?.ap_mac || '-'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{s.data?.ac_msg_type || '-'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{s.data?.dstuser || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
