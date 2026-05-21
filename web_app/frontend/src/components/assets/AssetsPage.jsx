import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Card, CardContent, Typography, Tabs, Tab, Chip, FormControl,
  Select, MenuItem, TextField, InputAdornment, Grid, Divider, Table,
  TableBody, TableCell, TableHead, TableRow, Alert, TableContainer,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import DevicesIcon from '@mui/icons-material/Devices'
import WifiIcon from '@mui/icons-material/Wifi'
import RouterIcon from '@mui/icons-material/Router'
import ShieldIcon from '@mui/icons-material/Shield'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { format } from 'date-fns'
import { assetsApi } from '../../services/api'
import { DetailPanel, LoadingSpinner, EmptyState, StatusDot, StatusCard } from '../common/CommonComponents'

function RiskChip({ value = 0 }) {
  const color = value >= 8 ? 'error' : value >= 5 ? 'warning' : 'success'
  return <Chip label={value.toFixed(1)} size="small" color={color} sx={{ fontWeight: 700 }} />
}

function StatusChip({ status }) {
  const config = {
    online: { color: '#10b981', label: 'Online', pulse: true },
    stale: { color: '#f59e0b', label: 'Stale', pulse: false },
    offline: { color: '#94a3b8', label: 'Offline', pulse: false },
  }
  const item = config[status] || config.offline
  return <StatusDot color={item.color} label={item.label} pulse={item.pulse} />
}

function SmallMono({ value }) {
  return (
    <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12 }}>
      {value || '-'}
    </Typography>
  )
}

function DeviceDrawer({ identifier, timeRange, open, onClose }) {
  const [tab, setTab] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['asset-detail', identifier, timeRange],
    queryFn: () => assetsApi.detail(identifier, timeRange).then(r => r.data),
    enabled: open && Boolean(identifier),
  })

  const device = data?.device || {}
  const alerts = data?.recent_alerts || []
  const dhcp = data?.dhcp_history || []
  const wifi = data?.wifi_sessions || []
  const topRules = data?.top_rules || []

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title={device.hostname || device.ip || identifier || 'รายละเอียดอุปกรณ์'}
      subtitle={device.mac || device.user || 'Asset detail'}
      width={560}
    >
      {isLoading ? (
        <LoadingSpinner message="กำลังโหลดข้อมูลอุปกรณ์..." />
      ) : !data ? (
        <EmptyState title="ไม่พบข้อมูลอุปกรณ์" message="ลองเลือกอุปกรณ์อื่นหรือขยายช่วงเวลา" />
      ) : (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Card variant="outlined">
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">IP Address</Typography>
                  <SmallMono value={device.ip} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card variant="outlined">
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">MAC Address</Typography>
                  <SmallMono value={device.mac} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined">
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Risk Score</Typography>
                  <Box sx={{ mt: 0.5 }}><RiskChip value={device.risk_score || 0} /></Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined">
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}><StatusChip status={device.status} /></Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined">
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Events</Typography>
                  <Typography variant="h6" fontWeight={700}>{(device.event_count || 0).toLocaleString()}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {device.user ? <Chip label={`User: ${device.user}`} size="small" variant="outlined" /> : null}
            {device.agent ? <Chip label={`Agent: ${device.agent}`} size="small" variant="outlined" /> : null}
            {device.top_source ? <Chip label={`Source: ${device.top_source}`} size="small" variant="outlined" /> : null}
            {device.last_seen ? (
              <Chip
                icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
                label={`Last seen ${format(new Date(device.last_seen), 'dd/MM HH:mm')}`}
                size="small"
                variant="outlined"
              />
            ) : null}
          </Box>

          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`Alerts (${alerts.length})`} />
            <Tab label={`DHCP (${dhcp.length})`} />
            <Tab label={`WiFi (${wifi.length})`} />
            <Tab label={`Rules (${topRules.length})`} />
          </Tabs>

          {tab === 0 && (
            alerts.length === 0 ? (
              <Alert severity="info">ไม่พบ alert history สำหรับอุปกรณ์นี้</Alert>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>เวลา</TableCell>
                    <TableCell>รายละเอียด</TableCell>
                    <TableCell>Level</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((alert, index) => (
                    <TableRow key={`${alert.timestamp}-${index}`} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                        {alert.timestamp ? format(new Date(alert.timestamp), 'dd/MM HH:mm') : '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                          {alert.description || '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {alert.source || '-'} · {alert.agent || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell><RiskChip value={Math.min((alert.level || 0) / 1.5, 10)} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}

          {tab === 1 && (
            dhcp.length === 0 ? (
              <Alert severity="info">ไม่พบ DHCP history</Alert>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>เวลา</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell>Hostname</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dhcp.map((event, index) => (
                    <TableRow key={`${event['@timestamp']}-${index}`} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                        {event['@timestamp'] ? format(new Date(event['@timestamp']), 'dd/MM HH:mm') : '-'}
                      </TableCell>
                      <TableCell>{event.data?.dhcp_action || '-'}</TableCell>
                      <TableCell><SmallMono value={event.data?.dhcp_ip} /></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{event.data?.dhcp_hostname || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}

          {tab === 2 && (
            wifi.length === 0 ? (
              <Alert severity="info">ไม่พบ WiFi sessions</Alert>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>เวลา</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>AP MAC</TableCell>
                    <TableCell>User</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wifi.map((event, index) => (
                    <TableRow key={`${event['@timestamp']}-${index}`} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                        {event['@timestamp'] ? format(new Date(event['@timestamp']), 'dd/MM HH:mm') : '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{event.data?.ac_msg_type || '-'}</TableCell>
                      <TableCell><SmallMono value={event.data?.ap_mac} /></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{event.data?.dstuser || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}

          {tab === 3 && (
            topRules.length === 0 ? (
              <Alert severity="info">ไม่พบ top rules</Alert>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rule ID</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topRules.map(rule => (
                    <TableRow key={rule.id} hover>
                      <TableCell><SmallMono value={rule.id} /></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{rule.description || '-'}</TableCell>
                      <TableCell align="right">{rule.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </>
      )}
    </DetailPanel>
  )
}

export default function AssetsPage() {
  const [tab, setTab] = useState(0)
  const [timeRange, setTimeRange] = useState('7d')
  const [search, setSearch] = useState('')
  const [selectedIdentifier, setSelectedIdentifier] = useState(null)

  const { data: devices = [], isLoading: devLoading } = useQuery({
    queryKey: ['assets-devices', timeRange],
    queryFn: () => assetsApi.devices(timeRange).then(r => r.data),
  })
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['assets-stats', timeRange],
    queryFn: () => assetsApi.stats(timeRange).then(r => r.data),
  })
  const { data: dhcp = [], isLoading: dhcpLoading } = useQuery({
    queryKey: ['assets-dhcp', timeRange],
    queryFn: () => assetsApi.dhcp(timeRange).then(r => r.data),
  })
  const { data: sessions = [], isLoading: sessLoading } = useQuery({
    queryKey: ['assets-sessions', timeRange],
    queryFn: () => assetsApi.sessions(timeRange).then(r => r.data),
  })

  const filteredDevices = useMemo(() => {
    const filterStr = search.trim().toLowerCase()
    if (!filterStr) return devices
    return devices.filter(device =>
      [device.ip, device.mac, device.hostname, device.user, device.agent]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(filterStr))
    )
  }, [devices, search])

  const rows = filteredDevices.map((device, index) => ({
    id: `${device.ip || 'na'}-${device.mac || 'na'}-${index}`,
    ...device,
  }))

  const summaryCards = [
    {
      title: 'อุปกรณ์ทั้งหมด',
      value: stats?.total_devices || 0,
      status: 'neutral',
      icon: DevicesIcon,
    },
    {
      title: 'Online',
      value: stats?.online_devices || 0,
      status: 'success',
      icon: WifiIcon,
    },
    {
      title: 'อุปกรณ์ใหม่ 24 ชม.',
      value: stats?.new_devices_24h || 0,
      status: 'info',
      icon: RouterIcon,
    },
    {
      title: 'High Risk',
      value: stats?.high_risk_devices || 0,
      status: 'critical',
      icon: ShieldIcon,
    },
  ]

  return (
    <Box className="page-enter">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>สินทรัพย์เครือข่าย</Typography>
          <Typography variant="caption" color="text.secondary">
            Asset Inventory — IP, MAC, DHCP และ WiFi session visibility
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="ค้นหา IP / MAC / Host / User"
            value={search}
            onChange={event => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small">
            <Select value={timeRange} onChange={event => setTimeRange(event.target.value)}>
              {['1d', '7d', '14d', '30d'].map(range => (
                <MenuItem key={range} value={range}>{range}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {summaryCards.map(card => (
          <Grid item xs={6} md={3} key={card.title}>
            <StatusCard
              title={card.title}
              value={statsLoading ? '...' : card.value.toLocaleString()}
              status={card.status}
              icon={card.icon}
            />
          </Grid>
        ))}
      </Grid>

      <Card>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Device Inventory (${filteredDevices.length})`} />
          <Tab label={`DHCP History (${dhcp.length})`} />
          <Tab label={`WiFi Sessions (${sessions.length})`} />
        </Tabs>

        <CardContent sx={{ p: 0 }}>
          {tab === 0 && (
            devLoading ? (
              <Box sx={{ p: 3 }}>
                <LoadingSpinner message="กำลังโหลด asset inventory..." />
              </Box>
            ) : rows.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <EmptyState title="ไม่พบอุปกรณ์" message="ลองเปลี่ยนช่วงเวลา หรือคำค้นหา" />
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 560 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>IP Address</TableCell>
                      <TableCell>MAC Address</TableCell>
                      <TableCell>Hostname</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Risk</TableCell>
                      <TableCell align="right">Events</TableCell>
                      <TableCell>Last Seen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow
                        key={row.id}
                        hover
                        onClick={() => setSelectedIdentifier(row.ip || row.mac)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell><SmallMono value={row.ip} /></TableCell>
                        <TableCell><SmallMono value={row.mac} /></TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{row.hostname || '-'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{row.user || '-'}</TableCell>
                        <TableCell><StatusChip status={row.status} /></TableCell>
                        <TableCell><RiskChip value={row.risk_score || 0} /></TableCell>
                        <TableCell align="right">{(row.event_count || 0).toLocaleString()}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>
                          {row.last_seen ? format(new Date(row.last_seen), 'dd/MM HH:mm') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          )}

          {tab === 1 && (
            dhcpLoading ? (
              <LoadingSpinner message="กำลังโหลด DHCP history..." />
            ) : dhcp.length === 0 ? (
              <EmptyState title="ไม่มี DHCP history" message="ช่วงเวลานี้ไม่มีข้อมูล DHCP" />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>เวลา</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell>MAC</TableCell>
                    <TableCell>Hostname</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Agent</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dhcp.slice(0, 200).map((event, index) => (
                    <TableRow key={`${event['@timestamp']}-${index}`} hover>
                      <TableCell sx={{ fontSize: 11 }}>
                        {event['@timestamp'] ? format(new Date(event['@timestamp']), 'dd/MM HH:mm') : '-'}
                      </TableCell>
                      <TableCell><SmallMono value={event.data?.dhcp_ip} /></TableCell>
                      <TableCell><SmallMono value={event.data?.dhcp_mac} /></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{event.data?.dhcp_hostname || '-'}</TableCell>
                      <TableCell>{event.data?.dhcp_action || '-'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{event.agent?.name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}

          {tab === 2 && (
            sessLoading ? (
              <LoadingSpinner message="กำลังโหลด WiFi sessions..." />
            ) : sessions.length === 0 ? (
              <EmptyState title="ไม่มี WiFi sessions" message="ช่วงเวลานี้ไม่มีข้อมูล WiFi" />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>เวลา</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell>MAC</TableCell>
                    <TableCell>AP MAC</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>User</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.slice(0, 200).map((session, index) => (
                    <TableRow key={`${session['@timestamp']}-${index}`} hover>
                      <TableCell sx={{ fontSize: 11 }}>
                        {session['@timestamp'] ? format(new Date(session['@timestamp']), 'dd/MM HH:mm') : '-'}
                      </TableCell>
                      <TableCell><SmallMono value={session.data?.srcip} /></TableCell>
                      <TableCell><SmallMono value={session.data?.mac} /></TableCell>
                      <TableCell><SmallMono value={session.data?.ap_mac} /></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{session.data?.ac_msg_type || '-'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{session.data?.dstuser || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>

      <Divider sx={{ my: 1.5, opacity: 0 }} />

      <DeviceDrawer
        identifier={selectedIdentifier}
        timeRange={timeRange === '1d' ? '7d' : '30d'}
        open={Boolean(selectedIdentifier)}
        onClose={() => setSelectedIdentifier(null)}
      />
    </Box>
  )
}
