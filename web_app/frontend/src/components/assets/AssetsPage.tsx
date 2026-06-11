import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded'
import LanRoundedIcon from '@mui/icons-material/LanRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import WifiRoundedIcon from '@mui/icons-material/WifiRounded'
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import HubRoundedIcon from '@mui/icons-material/HubRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import TroubleshootRoundedIcon from '@mui/icons-material/TroubleshootRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import { formatDistanceToNowStrict } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { assetsApi } from '../../services/api'
import { PageShell } from '../ui/layout'
import SectionCard from '../ui/SectionCard'
import MetricCard from '../ui/MetricCard'
import { BRAND, SEV_COLOR, PIE_COLORS, getChartTipStyle } from '../ui/tokens'
import { AlertMessage, DetailPanel, EmptyState, LoadingSpinner, StatusDot } from '../common/CommonComponents'

const ACCENT = '#0EA5E9'
const TIME_RANGE_OPTIONS = ['1d', '7d', '14d', '30d']

function formatBytes(value?: number | null) {
  if (!value) return '—'
  const gb = value / (1024 ** 3)
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`
  return `${gb.toFixed(1)} GB`
}

function formatPercent(value?: number | null) {
  if (value == null) return '—'
  return `${(value * 100).toFixed(0)}%`
}

function formatRelative(value?: string | null) {
  if (!value) return '—'
  try {
    return formatDistanceToNowStrict(new Date(value), { addSuffix: true })
  } catch {
    return value
  }
}

function riskColor(value = 0) {
  if (value >= 8) return SEV_COLOR.critical
  if (value >= 5) return '#F59E0B'
  return SEV_COLOR.low
}

function statusConfig(status?: string) {
  if (status === 'online') return { color: '#22C55E', label: 'Online', pulse: true }
  if (status === 'stale') return { color: '#F59E0B', label: 'Stale', pulse: false }
  return { color: '#94A3B8', label: 'Offline', pulse: false }
}

function RiskChip({ value = 0 }: { value?: number }) {
  const color = riskColor(value)
  return (
    <Chip
      label={value.toFixed(1)}
      size="small"
      sx={{
        height: 24,
        fontWeight: 800,
        fontFamily: '"IBM Plex Mono", monospace',
        bgcolor: `${color}18`,
        color,
        border: `1px solid ${color}35`,
      }}
    />
  )
}

function AssetStatus({ status }: { status?: string }) {
  const config = statusConfig(status)
  return <StatusDot color={config.color} label={config.label} pulse={config.pulse} />
}

function MonoValue({ value }: { value?: string | null }) {
  return (
    <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12 }}>
      {value || '—'}
    </Typography>
  )
}

function InventoryCoverage({ counts }: { counts?: Record<string, number> }) {
  const items = [
    { key: 'system', label: 'System profiles', icon: <DevicesRoundedIcon sx={{ fontSize: 16 }} />, color: '#38BDF8' },
    { key: 'hardware', label: 'Hardware baselines', icon: <MemoryRoundedIcon sx={{ fontSize: 16 }} />, color: '#F59E0B' },
    { key: 'interfaces', label: 'Interfaces', icon: <HubRoundedIcon sx={{ fontSize: 16 }} />, color: '#22C55E' },
    { key: 'networks', label: 'Network addresses', icon: <LanRoundedIcon sx={{ fontSize: 16 }} />, color: '#A855F7' },
    { key: 'ports', label: 'Open ports', icon: <RouterRoundedIcon sx={{ fontSize: 16 }} />, color: '#EF4444' },
  ]

  return (
    <Stack spacing={1.1}>
      {items.map((item) => (
        <Box
          key={item.key}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            px: 1.5,
            py: 1.1,
            borderRadius: 2,
            bgcolor: `${item.color}10`,
            border: `1px solid ${item.color}20`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ color: item.color, display: 'flex' }}>{item.icon}</Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{item.label}</Typography>
          </Box>
          <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12.5, fontWeight: 700, color: item.color }}>
            {(counts?.[item.key] || 0).toLocaleString()}
          </Typography>
        </Box>
      ))}
    </Stack>
  )
}

function DeviceDrawer({
  identifier,
  timeRange,
  open,
  onClose,
}: {
  identifier: string | null
  timeRange: string
  open: boolean
  onClose: () => void
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['asset-detail', identifier, timeRange],
    queryFn: () => assetsApi.detail(identifier || '', timeRange).then((r) => r.data),
    enabled: open && Boolean(identifier),
    retry: 0,
    refetchOnWindowFocus: false,
  })

  const device = data?.device || {}
  const alerts: any[] = data?.recent_alerts || []
  const dhcpHistory: any[] = data?.dhcp_history || []
  const wifiSessions: any[] = data?.wifi_sessions || []
  const topRules: any[] = data?.top_rules || []

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title={device.hostname || device.agent || identifier || 'Asset detail'}
      subtitle={device.os ? `${device.os}${device.os_version ? ` • ${device.os_version}` : ''}` : device.ip || 'Managed asset detail'}
      width={680}
    >
      {isLoading ? (
        <LoadingSpinner message="กำลังโหลดรายละเอียด asset..." />
      ) : error ? (
        <AlertMessage type="error" title="โหลดรายละเอียดไม่สำเร็จ" message="ลองเปิดอุปกรณ์ใหม่อีกครั้ง" />
      ) : !data ? (
        <EmptyState title="ไม่พบข้อมูล asset" message="ลองขยายช่วงเวลาหรือเลือกอุปกรณ์อื่น" />
      ) : (
        <Stack spacing={2}>
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(ACCENT, 0.18)} 0%, ${alpha(BRAND.purple, 0.18)} 100%)`,
              border: '1px solid',
              borderColor: alpha(ACCENT, 0.2),
            }}
          >
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={7}>
                <Stack spacing={0.75}>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT }}>
                    Managed Asset Identity
                  </Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1.05 }}>
                    {device.hostname || device.agent || identifier}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    <Chip label={`Agent ${device.agent_id || '—'}`} size="small" variant="outlined" />
                    {device.group ? <Chip label={`Group ${device.group}`} size="small" variant="outlined" /> : null}
                    {device.node ? <Chip label={`Node ${device.node}`} size="small" variant="outlined" /> : null}
                    {device.top_source ? <Chip label={`Top source ${device.top_source}`} size="small" variant="outlined" /> : null}
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={6} md={2.5}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>Risk score</Typography>
                <RiskChip value={device.risk_score || 0} />
              </Grid>
              <Grid item xs={6} md={2.5}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>Status</Typography>
                <AssetStatus status={device.status} />
              </Grid>
            </Grid>
          </Box>

          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <SectionCard
                title="System Profile"
                subtitle="ข้อมูลจาก Wazuh system and hardware inventory"
                icon={<DevicesRoundedIcon fontSize="small" />}
                accent={ACCENT}
                variant="glass"
              >
                <Stack spacing={1.1}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Hostname</Typography>
                    <MonoValue value={device.hostname} />
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Primary IP</Typography>
                    <MonoValue value={device.ip} />
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Primary MAC</Typography>
                    <MonoValue value={device.mac} />
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Operating system</Typography>
                    <Typography sx={{ fontSize: 12.5 }}>{device.os || '—'}{device.os_version ? ` • ${device.os_version}` : ''}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Architecture</Typography>
                    <Typography sx={{ fontSize: 12.5 }}>{device.architecture || '—'}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Wazuh version</Typography>
                    <Typography sx={{ fontSize: 12.5 }}>{device.version || '—'}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Last keepalive</Typography>
                    <Typography sx={{ fontSize: 12.5 }}>{formatRelative(device.last_seen)}</Typography>
                  </Box>
                </Stack>
              </SectionCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <SectionCard
                title="Hardware & Network"
                subtitle="CPU, memory, interfaces, addresses"
                icon={<MemoryRoundedIcon fontSize="small" />}
                accent={BRAND.orange}
                variant="glass"
              >
                <Grid container spacing={1.1}>
                  <Grid item xs={6}>
                    <MetricCard title="CPU Cores" value={device.cpu_cores || 0} subtitle={device.cpu_name || 'Processor'} color="#F59E0B" compact accent />
                  </Grid>
                  <Grid item xs={6}>
                    <MetricCard title="RAM Used" value={formatBytes(device.memory_used)} subtitle={`${formatPercent(device.memory_usage)} of ${formatBytes(device.memory_total)}`} color="#FB7185" compact accent />
                  </Grid>
                  <Grid item xs={6}>
                    <MetricCard title="Interfaces" value={device.interface_count || 0} subtitle="Discovered interfaces" color="#22C55E" compact accent />
                  </Grid>
                  <Grid item xs={6}>
                    <MetricCard title="Addresses" value={device.address_count || 0} subtitle="Known IP addresses" color={ACCENT} compact accent />
                  </Grid>
                </Grid>
              </SectionCard>
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <SectionCard
                title={`Recent Alerts (${alerts.length})`}
                subtitle="เหตุการณ์ล่าสุดที่เกี่ยวข้องกับ asset นี้"
                icon={<SecurityRoundedIcon fontSize="small" />}
                accent="#EF4444"
                variant="default"
                bodyScroll
                minHeight={320}
              >
                {alerts.length === 0 ? (
                  <Alert severity="info">ยังไม่พบ alert ในช่วงเวลาที่เลือก</Alert>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Rule</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Risk</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {alerts.map((alert, index) => (
                        <TableRow key={`${alert.timestamp}-${index}`} hover>
                          <TableCell sx={{ fontSize: 12 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{alert.description || '—'}</Typography>
                            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                              {alert.rule_id || '—'} • {formatRelative(alert.timestamp)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontSize: 11.5 }}>{alert.source || '—'}</TableCell>
                          <TableCell><RiskChip value={Math.min((alert.level || 0) / 1.5, 10)} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SectionCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <SectionCard
                title={`Observed DHCP (${dhcpHistory.length})`}
                subtitle="ประวัติ lease ที่สัมพันธ์กับ asset นี้"
                icon={<RouterRoundedIcon fontSize="small" />}
                accent={ACCENT}
                variant="default"
                bodyScroll
                minHeight={320}
              >
                {dhcpHistory.length === 0 ? (
                  <Alert severity="info">ยังไม่พบ DHCP history ในช่วงเวลานี้</Alert>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Lease</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Agent</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dhcpHistory.map((event, index) => (
                        <TableRow key={`${event['@timestamp']}-${index}`} hover>
                          <TableCell sx={{ fontSize: 12 }}>
                            <MonoValue value={event.data?.dhcp_ip} />
                            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                              {event.data?.dhcp_hostname || '—'} • {formatRelative(event['@timestamp'])}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontSize: 11.5 }}>{event.data?.dhcp_action || '—'}</TableCell>
                          <TableCell sx={{ fontSize: 11.5 }}>{event.agent?.name || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SectionCard>
            </Grid>
          </Grid>

          <SectionCard
            title={`Top Rules (${topRules.length})`}
            subtitle="กฎที่สัมพันธ์กับ asset นี้บ่อยที่สุด"
            icon={<TroubleshootRoundedIcon fontSize="small" />}
            accent={BRAND.purple}
            variant="flat"
          >
            {topRules.length === 0 ? (
              <Alert severity="info">ยังไม่พบ top rules</Alert>
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
                  {topRules.map((rule) => (
                    <TableRow key={rule.id} hover>
                      <TableCell><MonoValue value={rule.id} /></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{rule.description || '—'}</TableCell>
                      <TableCell align="right">{rule.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {wifiSessions.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 1 }}>Wireless sessions</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Session</TableCell>
                      <TableCell>AP MAC</TableCell>
                      <TableCell>User</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {wifiSessions.slice(0, 12).map((event, index) => (
                      <TableRow key={`${event['@timestamp']}-${index}`} hover>
                        <TableCell sx={{ fontSize: 12 }}>
                          {event.data?.ac_msg_type || '—'}
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                            {formatRelative(event['@timestamp'])}
                          </Typography>
                        </TableCell>
                        <TableCell><MonoValue value={event.data?.ap_mac} /></TableCell>
                        <TableCell sx={{ fontSize: 11.5 }}>{event.data?.dstuser || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </SectionCard>
        </Stack>
      )}
    </DetailPanel>
  )
}

export default function AssetsPage() {
  const theme = useTheme()
  const [timeRange, setTimeRange] = useState('7d')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState(0)
  const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null)

  const devicesQuery = useQuery<any[]>({
    queryKey: ['assets-devices', timeRange],
    queryFn: () => assetsApi.devices(timeRange).then((r) => r.data),
    retry: 0,
    refetchOnWindowFocus: false,
  })
  const statsQuery = useQuery<any>({
    queryKey: ['assets-stats', timeRange],
    queryFn: () => assetsApi.stats(timeRange).then((r) => r.data),
    retry: 0,
    refetchOnWindowFocus: false,
  })
  const dhcpQuery = useQuery<any[]>({
    queryKey: ['assets-dhcp', timeRange],
    queryFn: () => assetsApi.dhcp(timeRange).then((r) => r.data),
    retry: 0,
    refetchOnWindowFocus: false,
  })
  const sessionsQuery = useQuery<any[]>({
    queryKey: ['assets-sessions', timeRange],
    queryFn: () => assetsApi.sessions(timeRange).then((r) => r.data),
    retry: 0,
    refetchOnWindowFocus: false,
  })

  const devices = devicesQuery.data || []
  const stats = statsQuery.data || {}
  const dhcp = dhcpQuery.data || []
  const sessions = sessionsQuery.data || []

  const filteredDevices = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return devices
    return devices.filter((device) =>
      [
        device.agent,
        device.hostname,
        device.ip,
        device.mac,
        device.os,
        device.group,
        device.node,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    )
  }, [devices, search])

  const topRiskAssets = useMemo(
    () => [...filteredDevices].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 6),
    [filteredDevices],
  )

  const statusBreakdown = useMemo(() => ([
    { name: 'Online', value: stats.online_devices || 0, color: '#22C55E' },
    { name: 'Stale', value: stats.stale_devices || 0, color: '#F59E0B' },
    {
      name: 'Offline',
      value: Math.max(0, (stats.total_devices || 0) - (stats.online_devices || 0) - (stats.stale_devices || 0)),
      color: '#94A3B8',
    },
  ]).filter((item) => item.value > 0), [stats])

  const osChartData = ((stats.os_breakdown || []) as Array<{ label: string; value: number }>).slice(0, 6)
  const hasPrimaryError = devicesQuery.error || statsQuery.error

  const headerActions = (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
      <TextField
        size="small"
        placeholder="ค้นหา hostname / IP / MAC / OS"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ minWidth: { xs: '100%', sm: 280 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
      />
      <FormControl size="small" sx={{ minWidth: 110 }}>
        <Select value={timeRange} onChange={(event) => setTimeRange(event.target.value)}>
          {TIME_RANGE_OPTIONS.map((range) => (
            <MenuItem key={range} value={range}>{range}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  )

  return (
    <PageShell
      title="Asset Intelligence"
      subtitle="Managed endpoint inventory จาก Wazuh Syscollector พร้อม DHCP activity และ network observations ในมุมเดียว"
      actions={headerActions}
      variant="dashboard"
      maxWidth="wide"
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          px: { xs: 2, md: 3 },
          py: { xs: 2.25, md: 3 },
          background: `linear-gradient(135deg, ${alpha(ACCENT, 0.18)} 0%, ${alpha(BRAND.purple, 0.2)} 52%, ${alpha('#0F172A', theme.palette.mode === 'dark' ? 0.55 : 0.03)} 100%)`,
          border: '1px solid',
          borderColor: alpha(ACCENT, 0.18),
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -80,
            right: -40,
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha('#67E8F9', 0.24)} 0%, transparent 68%)`,
            pointerEvents: 'none',
          }}
        />
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid item xs={12} md={7}>
            <Stack spacing={1}>
              <Chip
                icon={<Inventory2RoundedIcon sx={{ fontSize: 16 }} />}
                label="Wazuh System Inventory + OpenSearch Activity"
                size="small"
                sx={{
                  alignSelf: 'flex-start',
                  bgcolor: alpha('#FFFFFF', theme.palette.mode === 'dark' ? 0.08 : 0.65),
                  border: '1px solid',
                  borderColor: alpha('#FFFFFF', 0.16),
                }}
              />
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 900, lineHeight: 1.05, maxWidth: 820 }}>
                มองเห็น asset ที่ถูกจัดการ, network footprint, และสัญญาณความเสี่ยงในหน้าเดียว
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 760 }}>
                Wazuh docs ระบุว่า Syscollector เก็บ hardware, operating system, interfaces, addresses และ open ports สำหรับ inventory
                ของ endpoint ได้โดยตรง ส่วนหน้านี้นำข้อมูลนั้นมาผสานกับ DHCP history และ alert activity เพื่อใช้เป็น asset cockpit
                สำหรับ SOC และทีม infra
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Grid container spacing={1.25}>
              <Grid item xs={6}>
                <MetricCard title="Managed Assets" value={stats.total_devices || 0} subtitle="Wazuh agents with inventory" icon={<DevicesRoundedIcon />} color={ACCENT} accent />
              </Grid>
              <Grid item xs={6}>
                <MetricCard title="DHCP Unique IPs" value={stats.dhcp_unique_ips || 0} subtitle={`Observed in ${timeRange}`} icon={<RouterRoundedIcon />} color="#22C55E" accent />
              </Grid>
              <Grid item xs={6}>
                <MetricCard title="High Risk" value={stats.high_risk_devices || 0} subtitle="Risk score >= 7.0" icon={<SecurityRoundedIcon />} color="#EF4444" accent />
              </Grid>
              <Grid item xs={6}>
                <MetricCard title="New 24h" value={stats.new_devices_24h || 0} subtitle="Recently enrolled agents" icon={<AccessTimeRoundedIcon />} color="#F59E0B" accent />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>

      {hasPrimaryError ? (
        <AlertMessage
          type="error"
          title="โหลดข้อมูล Assets ไม่สำเร็จ"
          message="ตรวจสอบ backend assets service หรือ OpenSearch connection แล้วลองใหม่"
          action={
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                devicesQuery.refetch()
                statsQuery.refetch()
                dhcpQuery.refetch()
                sessionsQuery.refetch()
              }}
            >
              Reload
            </Button>
          }
        />
      ) : null}

      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Online Agents" value={stats.online_devices || 0} subtitle="Active from Wazuh API" icon={<LanRoundedIcon />} color="#22C55E" accent />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Stale Agents" value={stats.stale_devices || 0} subtitle="Disconnected or pending" icon={<AccessTimeRoundedIcon />} color="#F59E0B" accent />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="DHCP Events 24h" value={stats.dhcp_events_24h || 0} subtitle="Recent lease activity" icon={<DnsRoundedIcon />} color="#38BDF8" accent />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="IP Conflicts" value={stats.conflict_devices || 0} subtitle="IPs seen with multiple MACs" icon={<TroubleshootRoundedIcon />} color="#EC4899" accent />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={8}>
          <SectionCard
            title="Managed Asset Inventory"
            subtitle="Agent-backed endpoints enriched with hardware, network and alert posture"
            icon={<Inventory2RoundedIcon fontSize="small" />}
            accent={ACCENT}
            variant="glass"
            toolbar={
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                  <Chip label={`${filteredDevices.length} assets`} size="small" variant="outlined" />
                  <Chip label={`${stats.online_devices || 0} online`} size="small" variant="outlined" sx={{ borderColor: alpha('#22C55E', 0.5), color: '#22C55E' }} />
                  <Chip label={`${stats.high_risk_devices || 0} high risk`} size="small" variant="outlined" sx={{ borderColor: alpha('#EF4444', 0.5), color: '#EF4444' }} />
                </Box>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  แสดง IP/MAC หลัก, OS, risk, last keepalive และ interface coverage
                </Typography>
              </Box>
            }
            noPad
          >
            {devicesQuery.isLoading ? (
              <Box sx={{ p: 3 }}>
                <LoadingSpinner message="กำลังโหลด managed asset inventory..." />
              </Box>
            ) : filteredDevices.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <EmptyState title="ไม่พบ managed assets" message="ลองปรับช่วงเวลา หรือเปลี่ยนคำค้นหา" />
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 640 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Asset</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>OS</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Network</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Risk</TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Alerts</TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Interfaces</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Last Seen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredDevices.map((device, index) => (
                      <TableRow
                        key={`${device.asset_id || device.agent_id || device.ip || index}`}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => setSelectedIdentifier(device.asset_id || device.agent_id || device.ip || device.hostname || device.mac)}
                      >
                        <TableCell sx={{ minWidth: 160 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{device.hostname || device.agent || '—'}</Typography>
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                            Agent {device.agent_id || '—'}{device.group ? ` • ${device.group}` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 140, display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography sx={{ fontSize: 12 }}>{device.os || '—'}</Typography>
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{device.os_version || device.architecture || '—'}</Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 160, display: { xs: 'none', md: 'table-cell' } }}>
                          <MonoValue value={device.ip} />
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{device.mac || '—'}</Typography>
                        </TableCell>
                        <TableCell><AssetStatus status={device.status} /></TableCell>
                        <TableCell><RiskChip value={device.risk_score || 0} /></TableCell>
                        <TableCell align="right" sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}>
                          {(device.event_count || 0).toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, display: { xs: 'none', lg: 'table-cell' } }}>
                          {(device.interface_count || 0).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ fontSize: 11.5, display: { xs: 'none', sm: 'table-cell' } }}>{formatRelative(device.last_seen)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={1.5}>
            <SectionCard
              title="Asset Status Mix"
              subtitle="Distribution of managed agent state"
              icon={<LanRoundedIcon fontSize="small" />}
              accent="#22C55E"
              variant="default"
            >
              {statusBreakdown.length === 0 ? (
                <EmptyState title="ไม่มี status data" message="ยังไม่พบ managed agent state ในช่วงเวลานี้" />
              ) : (
                <Box sx={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={4}
                      >
                        {statusBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartTooltip contentStyle={getChartTipStyle(theme.palette.mode === 'dark')} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </SectionCard>

            <SectionCard
              title="OS Footprint"
              subtitle="Inventory distribution by operating system"
              icon={<StorageRoundedIcon fontSize="small" />}
              accent={BRAND.purple}
              variant="default"
            >
              {osChartData.length === 0 ? (
                <EmptyState title="ไม่มี inventory distribution" message="ยังไม่พบ system inventory docs" />
              ) : (
                <Box sx={{ height: 230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={osChartData} layout="vertical" margin={{ left: 20, right: 12, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 11 }} />
                      <RechartTooltip contentStyle={getChartTipStyle(theme.palette.mode === 'dark')} />
                      <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                        {osChartData.map((_, index: number) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </SectionCard>

            <SectionCard
              title="Inventory Coverage"
              subtitle="Counts from Wazuh inventory indices"
              icon={<HubRoundedIcon fontSize="small" />}
              accent="#F59E0B"
              variant="default"
            >
              <InventoryCoverage counts={stats.inventory_counts} />
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      <SectionCard
        title="Operational Lenses"
        subtitle="Switch between managed inventory, DHCP observation and wireless session feed"
        icon={<RouterRoundedIcon fontSize="small" />}
        accent={ACCENT}
        variant="glass"
        noPad
      >
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1.5 }}>
          <Tab label={`Risk Queue (${topRiskAssets.length})`} />
          <Tab label={`DHCP Activity (${dhcp.length})`} />
          <Tab label={`Wireless Sessions (${sessions.length})`} />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            {topRiskAssets.length === 0 ? (
              <EmptyState title="ยังไม่มี risk queue" message="เมื่อ asset มี alert และ risk score จะปรากฏในส่วนนี้" />
            ) : (
              <Grid container spacing={1.25}>
                {topRiskAssets.map((device, index) => (
                  <Grid item xs={12} md={6} xl={4} key={`${device.asset_id || device.agent_id || index}`}>
                    <Box
                      onClick={() => setSelectedIdentifier(device.asset_id || device.agent_id || device.ip || device.hostname || device.mac)}
                      sx={{
                        p: 1.75,
                        borderRadius: 3,
                        cursor: 'pointer',
                        bgcolor: alpha(riskColor(device.risk_score || 0), 0.08),
                        border: '1px solid',
                        borderColor: alpha(riskColor(device.risk_score || 0), 0.18),
                        transition: 'all 0.18s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 12px 28px ${alpha(riskColor(device.risk_score || 0), 0.18)}`,
                        },
                      }}
                    >
                      <Stack spacing={0.9}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>
                              {device.hostname || device.agent || '—'}
                            </Typography>
                            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                              {device.os || 'Unknown OS'}{device.ip ? ` • ${device.ip}` : ''}
                            </Typography>
                          </Box>
                          <RiskChip value={device.risk_score || 0} />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <AssetStatus status={device.status} />
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {(device.event_count || 0).toLocaleString()} alerts
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                          {device.top_source ? <Chip label={device.top_source} size="small" variant="outlined" /> : null}
                          {device.group ? <Chip label={device.group} size="small" variant="outlined" /> : null}
                          <Chip label={`last ${formatRelative(device.last_seen)}`} size="small" variant="outlined" />
                        </Box>
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            {dhcpQuery.isLoading ? (
              <LoadingSpinner message="กำลังโหลด DHCP activity..." />
            ) : dhcp.length === 0 ? (
              <EmptyState title="ไม่มี DHCP activity" message="ช่วงเวลานี้ยังไม่พบ lease event" />
            ) : (
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Lease</TableCell>
                      <TableCell>MAC</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Agent</TableCell>
                      <TableCell>Observed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dhcp.slice(0, 200).map((event, index) => (
                      <TableRow key={`${event['@timestamp']}-${index}`} hover>
                        <TableCell sx={{ fontSize: 12 }}>
                          <MonoValue value={event.data?.dhcp_ip} />
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{event.data?.dhcp_hostname || '—'}</Typography>
                        </TableCell>
                        <TableCell><MonoValue value={event.data?.dhcp_mac} /></TableCell>
                        <TableCell sx={{ fontSize: 11.5 }}>{event.data?.dhcp_action || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 11.5 }}>{event.agent?.name || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{formatRelative(event['@timestamp'])}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ p: 2 }}>
            {sessionsQuery.isLoading ? (
              <LoadingSpinner message="กำลังโหลด wireless sessions..." />
            ) : sessions.length === 0 ? (
              <EmptyState
                title="ไม่พบ wireless sessions"
                message="ไม่มีข้อมูล `huawei-ac` ในช่วงเวลาที่เลือก จึงแสดง empty state แบบตั้งใจ ไม่ใช่ API พัง"
              />
            ) : (
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Session</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>AP MAC</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Observed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessions.slice(0, 200).map((session, index) => (
                      <TableRow key={`${session['@timestamp']}-${index}`} hover>
                        <TableCell sx={{ fontSize: 11.5 }}>{session.data?.ac_msg_type || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          <MonoValue value={session.data?.srcip} />
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{session.data?.mac || '—'}</Typography>
                        </TableCell>
                        <TableCell><MonoValue value={session.data?.ap_mac} /></TableCell>
                        <TableCell sx={{ fontSize: 11.5 }}>{session.data?.dstuser || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{formatRelative(session['@timestamp'])}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </SectionCard>

      <DeviceDrawer
        identifier={selectedIdentifier}
        timeRange={timeRange === '1d' ? '7d' : '30d'}
        open={Boolean(selectedIdentifier)}
        onClose={() => setSelectedIdentifier(null)}
      />
    </PageShell>
  )
}
