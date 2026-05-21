import { useQuery } from '@tanstack/react-query'
import {
  Box, Card, CardContent, Typography, Grid, Skeleton, Chip,
} from '@mui/material'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import { kpiApi } from '../../services/api'

function KPICard({ title, value, unit, color = 'primary.main', loading }) {
  return (
    <Card>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" color="text.secondary">{title}</Typography>
        {loading ? <Skeleton height={40} /> :
          <Typography variant="h4" fontWeight={700} color={color}>{value?.toLocaleString() || 0}</Typography>}
        <Typography variant="caption" color="text.secondary">{unit}</Typography>
      </CardContent>
    </Card>
  )
}

export default function KPIPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['kpi-summary'],
    queryFn: () => kpiApi.summary().then(r => r.data),
    refetchInterval: 300000,
  })
  const { data: timeline = [] } = useQuery({
    queryKey: ['kpi-timeline'],
    queryFn: () => kpiApi.timeline(30).then(r => r.data),
  })

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>KPI ประสิทธิภาพ SOC</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <KPICard title="รวม 30 วัน" value={summary?.total_30d} unit="alerts" loading={isLoading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard title="เฉลี่ยต่อวัน" value={summary?.avg_daily} unit="alerts/day" loading={isLoading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard title="Critical 30 วัน" value={summary?.critical_30d} unit="critical alerts" color="#ef4444" loading={isLoading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard title="High 30 วัน" value={summary?.high_30d} unit="high alerts" color="#f59e0b" loading={isLoading} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                แนวโน้ม Alert รายวัน (30 วันย้อนหลัง)
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8"
                    tickFormatter={d => d?.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }} />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" dot={false} name="ทั้งหมด" strokeWidth={2} />
                  <Line type="monotone" dataKey="critical" stroke="#ef4444" dot={false} name="Critical" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="high" stroke="#f59e0b" dot={false} name="High" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="medium" stroke="#10b981" dot={false} name="Medium" strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>สรุป Alert ตาม Level</Typography>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={timeline.slice(-7)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis type="category" dataKey="date" tick={{ fontSize: 10 }} width={55}
                    tickFormatter={d => d?.slice(5)} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }} />
                  <Bar dataKey="critical" fill="#ef4444" stackId="a" name="Critical" />
                  <Bar dataKey="high" fill="#f59e0b" stackId="a" name="High" />
                  <Bar dataKey="medium" fill="#3b82f6" stackId="a" name="Medium" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <Box mt={1} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Chip size="small" label="Critical" sx={{ bgcolor: '#ef4444', color: '#fff', fontSize: 11 }} />
                <Chip size="small" label="High" sx={{ bgcolor: '#f59e0b', color: '#fff', fontSize: 11 }} />
                <Chip size="small" label="Medium" sx={{ bgcolor: '#3b82f6', color: '#fff', fontSize: 11 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
