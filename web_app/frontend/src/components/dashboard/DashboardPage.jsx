import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Grid, Card, CardContent, Typography, Box, Chip, Skeleton,
  Select, MenuItem, FormControl, LinearProgress, Alert,
} from '@mui/material'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { dashboardApi } from '../../services/api'
import { format } from 'date-fns'

const LEVEL_COLORS = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' }

function MetricCard({ title, value, icon, color, loading }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}22` }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">{title}</Typography>
          {loading
            ? <Skeleton width={60} height={32} />
            : <Typography variant="h5" fontWeight={700} color={color}>{value?.toLocaleString() || 0}</Typography>}
        </Box>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState('24h')
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', timeRange],
    queryFn: () => dashboardApi.stats(timeRange).then(r => r.data),
    refetchInterval: 60000,
  })
  const { data: cluster } = useQuery({
    queryKey: ['cluster'],
    queryFn: () => dashboardApi.cluster().then(r => r.data),
    refetchInterval: 120000,
  })

  const pieData = stats?.by_source?.slice(0, 6).map(s => ({ name: s.name || 'unknown', value: s.count })) || []
  const timelineData = stats?.timeline?.map(t => ({
    time: t.time ? format(new Date(t.time), 'HH:mm') : '',
    count: t.count,
  })) || []

  const clusterNodes = cluster?.data?.affected_items || []

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>แดชบอร์ดภาพรวม</Typography>
        <FormControl size="small">
          <Select value={timeRange} onChange={e => setTimeRange(e.target.value)}>
            <MenuItem value="1h">1 ชั่วโมง</MenuItem>
            <MenuItem value="6h">6 ชั่วโมง</MenuItem>
            <MenuItem value="24h">24 ชั่วโมง</MenuItem>
            <MenuItem value="7d">7 วัน</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <MetricCard title="Critical" value={stats?.critical} icon={<NotificationsActiveIcon sx={{ color: '#ef4444' }} />} color="#ef4444" loading={isLoading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard title="High" value={stats?.high} icon={<WarningIcon sx={{ color: '#f59e0b' }} />} color="#f59e0b" loading={isLoading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard title="Medium" value={stats?.medium} icon={<InfoIcon sx={{ color: '#3b82f6' }} />} color="#3b82f6" loading={isLoading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard title="Low" value={stats?.low} icon={<CheckCircleIcon sx={{ color: '#10b981' }} />} color="#10b981" loading={isLoading} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>แนวโน้ม Alert ตามเวลา</Typography>
              {isLoading ? <Skeleton variant="rectangular" height={200} /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f622" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>แหล่งที่มา Log (Top 6)</Typography>
              {isLoading ? <Skeleton variant="rectangular" height={200} /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name.split('-')[0]}>
                      {pieData.map((_, i) => <Cell key={i} fill={Object.values(LEVEL_COLORS)[i % 4]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>สุขภาพ Wazuh Cluster</Typography>
              {clusterNodes.length === 0 ? (
                <Alert severity="info" sx={{ fontSize: 12 }}>กำลังโหลดข้อมูล Cluster...</Alert>
              ) : (
                clusterNodes.map(node => (
                  <Box key={node.name} sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                    <Chip size="small" label={node.type} color={node.type === 'master' ? 'primary' : 'default'} />
                    <Typography variant="body2">{node.name}</Typography>
                    <Chip size="small" label={node.status || 'active'} color={node.status === 'active' ? 'success' : 'error'} sx={{ ml: 'auto' }} />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>ประเทศที่โจมตีสูงสุด (Top 10)</Typography>
              {(stats?.by_country || []).map((c, i) => (
                <Box key={i} sx={{ mb: 0.8 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                    <Typography variant="caption">{c.name || 'Unknown'}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.count}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((c.count / (stats?.by_country[0]?.count || 1)) * 100, 100)}
                    sx={{ height: 4, borderRadius: 2 }}
                    color="warning"
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
