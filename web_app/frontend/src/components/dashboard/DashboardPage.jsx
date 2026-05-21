import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useCallback } from 'react'
import {
  Grid, Card, CardContent, Typography, Box, Chip, Skeleton,
  Select, MenuItem, FormControl, Alert, Divider, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Tooltip,
  IconButton, useTheme,
} from '@mui/material'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import StorageIcon from '@mui/icons-material/Storage'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlineRounded'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlineRounded'
import PublicIcon from '@mui/icons-material/Public'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { dashboardApi, alertsApi } from '../../services/api'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import WorldMap from './WorldMap'

const LEVEL_COLORS = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#3b82f6',
  low:      '#10b981',
}

const PIE_PALETTE = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

const AUTO_REFRESH_MS = 30000

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ title, value, icon, color, loading, subtitle, trend, trendValue }) {
  const trendIcon = trend === 'up' ? <TrendingUpIcon sx={{ fontSize: 14 }} />
    : trend === 'down' ? <TrendingDownIcon sx={{ fontSize: 14 }} />
    : <TrendingFlatIcon sx={{ fontSize: 14 }} />

  const trendColor = trend === 'up' ? '#ef4444' : trend === 'down' ? '#10b981' : '#94a3b8'

  return (
    <Card
      sx={{
        borderLeft: `3px solid ${color}`,
        transition: 'all 0.25s ease',
        '&:hover': { boxShadow: `0 4px 20px ${color}33`, transform: 'translateY(-2px)' },
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: '14px 16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={80} height={36} sx={{ mt: 0.3 }} />
            ) : (
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{ color, lineHeight: 1.2, mt: 0.3, fontSize: '1.75rem' }}
              >
                {(value ?? 0).toLocaleString()}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
              {subtitle && !loading && (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                  {subtitle}
                </Typography>
              )}
              {trendValue !== undefined && !loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, ml: subtitle ? 0.5 : 0 }}>
                  <Box sx={{ color: trendColor, display: 'flex', alignItems: 'center' }}>{trendIcon}</Box>
                  <Typography variant="caption" sx={{ fontSize: 10, color: trendColor, fontWeight: 600 }}>
                    {trendValue > 0 ? '+' : ''}{trendValue}%
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
          <Box
            sx={{
              p: 1,
              borderRadius: '10px',
              bgcolor: `${color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────
const ChartTooltipStyle = {
  background: 'rgba(30,41,59,0.95)',
  border: '1px solid #334155',
  borderRadius: 8,
  fontSize: 12,
  color: '#e2e8f0',
}

// ─── Cluster Status ───────────────────────────────────────────────────────────
function ClusterCard({ cluster }) {
  let nodes = []
  if (cluster) {
    if (Array.isArray(cluster.data?.affected_items)) {
      nodes = cluster.data.affected_items
    } else if (Array.isArray(cluster?.affected_items)) {
      nodes = cluster.affected_items
    } else if (typeof cluster === 'object' && !Array.isArray(cluster)) {
      if (Object.keys(cluster).length > 0 && !cluster.name) {
        nodes = [{
          name: cluster.node || cluster.name || 'Master',
          status: 'active',
          type: 'master',
        }]
      }
    }
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: '14px 16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <StorageIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="subtitle2" fontWeight={600} fontSize={13}>
            สุขภาพ Wazuh Cluster
          </Typography>
        </Box>
        {!cluster || nodes.length === 0 ? (
          <Alert severity="info" sx={{ fontSize: 12 }}>กำลังโหลดข้อมูล...</Alert>
        ) : (
          nodes.map((node, i) => (
            <Box key={node?.name || i}>
              <Box sx={{ display: 'flex', alignItems: 'center', py: 0.8, gap: 1 }}>
                <Box
                  sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    bgcolor: (node?.status || 'active') === 'active' ? '#10b981' : '#ef4444',
                    flexShrink: 0,
                    animation: (node?.status || 'active') === 'active' ? 'pulse-slow 2s ease-in-out infinite' : 'none',
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12 }}>
                    {node?.name || `Node ${i + 1}`}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: 10 }}>
                    {node?.type || 'worker'}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={node?.status || 'active'}
                  color={(node?.status || 'active') === 'active' ? 'success' : 'error'}
                  sx={{ height: 18, fontSize: 10 }}
                />
              </Box>
              {i < nodes.length - 1 && <Divider />}
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ─── Recent Critical Alerts ───────────────────────────────────────────────────
function RecentCriticalAlerts({ alerts = [], loading, onRowClick }) {
  const navigate = useNavigate()

  const criticalAlerts = alerts
    .filter(a => {
      const level = Number(a['rule.level'] || a?.rule?.level || 0)
      return level >= 12
    })
    .slice(0, 8)

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: '14px 16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorOutlineIcon sx={{ fontSize: 16, color: '#ef4444' }} />
            <Typography variant="subtitle2" fontWeight={600} fontSize={13}>
              แจ้งเตือนล่าสุด (Critical/High)
            </Typography>
          </Box>
          <Tooltip title="ดูทั้งหมด">
            <IconButton size="small" onClick={() => navigate('/alerts')} sx={{ borderRadius: 1.5 }}>
              <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            </IconButton>
          </Tooltip>
        </Box>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={28} sx={{ mb: 0.5 }} />)
        ) : criticalAlerts.length === 0 ? (
          <Alert severity="success" sx={{ fontSize: 12, py: 0.5 }}>
            ไม่มี Critical/High alerts ล่าสุด ✓
          </Alert>
        ) : (
          <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 10, fontWeight: 700, py: 0.5, color: 'text.disabled', textTransform: 'uppercase' }}>เวลา</TableCell>
                  <TableCell sx={{ fontSize: 10, fontWeight: 700, py: 0.5, color: 'text.disabled', textTransform: 'uppercase' }}>ระดับ</TableCell>
                  <TableCell sx={{ fontSize: 10, fontWeight: 700, py: 0.5, color: 'text.disabled', textTransform: 'uppercase' }}>คำอธิบาย</TableCell>
                  <TableCell sx={{ fontSize: 10, fontWeight: 700, py: 0.5, color: 'text.disabled', textTransform: 'uppercase' }}>Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {criticalAlerts.map((a, i) => {
                  const level = Number(a['rule.level'] || a?.rule?.level || 0)
                  const isCritical = level >= 15
                  return (
                    <TableRow
                      key={i}
                      hover
                      onClick={() => onRowClick && onRowClick(a)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isCritical ? 'rgba(239,68,68,0.06)' : 'transparent',
                        '&:hover': { bgcolor: isCritical ? 'rgba(239,68,68,0.1)' : 'action.hover' },
                        animation: isCritical && i === 0 ? 'pulse-critical 3s ease-in-out 1' : 'none',
                      }}
                    >
                      <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'nowrap', py: 0.7 }}>
                        {a['@timestamp'] ? format(new Date(a['@timestamp']), 'HH:mm:ss') : '-'}
                      </TableCell>
                      <TableCell sx={{ py: 0.7 }}>
                        <Chip
                          label={isCritical ? `${level} CRIT` : `${level} HIGH`}
                          size="small"
                          sx={{
                            bgcolor: isCritical ? '#ef4444' : '#f59e0b',
                            color: '#fff', fontSize: 10, height: 18, fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, maxWidth: 200, py: 0.7 }} className="line-clamp-2">
                        {a['rule.description'] || a?.rule?.description || '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', py: 0.7 }}>
                        {a['data.srcip'] || a?.data?.srcip || '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Auto-Refresh Indicator ───────────────────────────────────────────────────
function AutoRefreshIndicator({ paused, onToggle, countdown }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={paused ? 'เปิดรีเฟรชอัตโนมัติ' : 'หยุดรีเฟรชอัตโนมัติ'}>
        <IconButton size="small" onClick={onToggle} sx={{ borderRadius: 1.5 }}>
          {paused
            ? <PlayCircleOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            : <PauseCircleOutlineIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          }
        </IconButton>
      </Tooltip>
      {!paused && (
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', fontFamily: '"IBM Plex Mono", monospace' }}>
          {countdown}s
        </Typography>
      )}
    </Box>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState('24h')
  const [autoRefreshPaused, setAutoRefreshPaused] = useState(false)
  const [countdown, setCountdown] = useState(30)

  const refreshInterval = autoRefreshPaused ? false : AUTO_REFRESH_MS

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', timeRange],
    queryFn: () => dashboardApi.stats(timeRange).then(r => r.data),
    refetchInterval: refreshInterval,
  })
  const { data: cluster } = useQuery({
    queryKey: ['cluster'],
    queryFn: () => dashboardApi.cluster().then(r => r.data),
    refetchInterval: 120000,
  })
  const { data: recentAlerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['recent-critical-alerts'],
    queryFn: () => alertsApi.list({ level: 12, limit: 20, time_range: '24h' }).then(r => r.data),
    refetchInterval: refreshInterval,
  })

  // Countdown timer
  useEffect(() => {
    if (autoRefreshPaused) return
    setCountdown(30)
    const id = setInterval(() => {
      setCountdown(c => c <= 1 ? 30 : c - 1)
    }, 1000)
    return () => clearInterval(id)
  }, [autoRefreshPaused, timeRange])

  const total = (stats?.critical || 0) + (stats?.high || 0) + (stats?.medium || 0) + (stats?.low || 0)

  const pieData = (stats?.by_source || [])
    .slice(0, 6)
    .map(s => ({ name: s.name?.split('-')[0] || 'unknown', value: s.count }))

  const timelineData = (stats?.timeline || []).map(t => ({
    time: t.time ? format(new Date(t.time), 'HH:mm', { locale: th }) : '',
    count: t.count,
  }))

  const countries = stats?.by_country || []

  // Calculate mock trend (compare first half vs second half of timeline)
  const calcTrend = useCallback(() => {
    if (!stats?.timeline || stats.timeline.length < 2) return { value: 0, direction: 'flat' }
    const mid = Math.floor(stats.timeline.length / 2)
    const firstHalf = stats.timeline.slice(0, mid).reduce((s, t) => s + t.count, 0)
    const secondHalf = stats.timeline.slice(mid).reduce((s, t) => s + t.count, 0)
    if (firstHalf === 0) return { value: 0, direction: 'flat' }
    const pct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100)
    return { value: pct, direction: pct > 5 ? 'up' : pct < -5 ? 'down' : 'flat' }
  }, [stats?.timeline])

  const overallTrend = calcTrend()

  return (
    <Box className="page-enter">
      {/* Page header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>แดชบอร์ดภาพรวม</Typography>
          <Typography variant="caption" color="text.secondary">
            Security Operations Center — โรงพยาบาลวลัยลักษณ์
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoRefreshIndicator
            paused={autoRefreshPaused}
            onToggle={() => setAutoRefreshPaused(p => !p)}
            countdown={countdown}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              sx={{ fontSize: 13, borderRadius: 2 }}
            >
              <MenuItem value="1h">1 ชั่วโมง</MenuItem>
              <MenuItem value="6h">6 ชั่วโมง</MenuItem>
              <MenuItem value="24h">24 ชั่วโมง</MenuItem>
              <MenuItem value="7d">7 วัน</MenuItem>
              <MenuItem value="30d">30 วัน</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={4} md={2.4}>
          <MetricCard
            title="รวมทั้งหมด"
            value={total}
            icon={<StorageIcon sx={{ color: '#6366f1', fontSize: 20 }} />}
            color="#6366f1"
            loading={isLoading}
            subtitle="alerts"
            trend={overallTrend.direction}
            trendValue={overallTrend.value}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <MetricCard
            title="Critical"
            value={stats?.critical}
            icon={<NotificationsActiveIcon sx={{ color: LEVEL_COLORS.critical, fontSize: 20 }} />}
            color={LEVEL_COLORS.critical}
            loading={isLoading}
            subtitle="ระดับ 15+"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <MetricCard
            title="High"
            value={stats?.high}
            icon={<WarningAmberIcon sx={{ color: LEVEL_COLORS.high, fontSize: 20 }} />}
            color={LEVEL_COLORS.high}
            loading={isLoading}
            subtitle="ระดับ 12–14"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <MetricCard
            title="Medium"
            value={stats?.medium}
            icon={<InfoOutlinedIcon sx={{ color: LEVEL_COLORS.medium, fontSize: 20 }} />}
            color={LEVEL_COLORS.medium}
            loading={isLoading}
            subtitle="ระดับ 7–11"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <MetricCard
            title="Low"
            value={stats?.low}
            icon={<CheckCircleIcon sx={{ color: LEVEL_COLORS.low, fontSize: 20 }} />}
            color={LEVEL_COLORS.low}
            loading={isLoading}
            subtitle="ระดับ 1–6"
          />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Timeline chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: '14px 16px !important' }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5} fontSize={13}>
                แนวโน้ม Alert ตามเวลา
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={timelineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <RechartTooltip
                      contentStyle={ChartTooltipStyle}
                      formatter={v => [v.toLocaleString(), 'Alerts']}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#alertGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Source pie chart */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: '14px 16px !important' }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5} fontSize={13}>
                แหล่งที่มา Log (Top 6)
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
              ) : pieData.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                  <Typography variant="caption" color="text.disabled">ไม่มีข้อมูล</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={65}
                      innerRadius={30}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip
                      contentStyle={ChartTooltipStyle}
                      formatter={v => [v.toLocaleString(), 'Alerts']}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={v => <span style={{ fontSize: 11, color: '#94a3b8' }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 3: WorldMap + Cluster */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* World Map — Attack Origins */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: '14px 16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PublicIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="subtitle2" fontWeight={600} fontSize={13}>
                  แผนที่โจมตีทั่วโลก
                </Typography>
                {countries.length > 0 && (
                  <Chip size="small" label={`${countries.length} ประเทศ`} color="primary" sx={{ height: 18, fontSize: 10 }} />
                )}
              </Box>
              <Box sx={{ height: 300, borderRadius: 1, overflow: 'hidden' }}>
                <WorldMap countries={countries} loading={isLoading} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cluster health */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            <ClusterCard cluster={cluster} />

            {/* Top countries compact */}
            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ p: '14px 16px !important' }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1.5} fontSize={13}>
                  ประเทศที่โจมตีสูงสุด (Top 10)
                </Typography>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
                ) : countries.length === 0 ? (
                  <Alert severity="info" sx={{ fontSize: 12 }}>ไม่มีข้อมูล GeoLocation</Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {countries.slice(0, 10).map((c, i) => {
                      const pct = Math.min((c.count / (countries[0]?.count || 1)) * 100, 100)
                      return (
                        <Box key={i}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
                            <Typography variant="caption" sx={{ fontSize: 11 }} noWrap>
                              {c.name || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, ml: 0.5 }}>
                              {c.count.toLocaleString()}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 3,
                              borderRadius: 2,
                              mb: 0.3,
                              bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: i < 3 ? '#ef4444' : i < 6 ? '#f59e0b' : '#3b82f6',
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Box>
                      )
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Row 4: Recent Critical Alerts */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <RecentCriticalAlerts
            alerts={recentAlerts}
            loading={alertsLoading}
            onRowClick={() => navigate('/alerts')}
          />
        </Grid>
      </Grid>
    </Box>
  )
}
