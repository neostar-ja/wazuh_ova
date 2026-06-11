import { useQuery } from '@tanstack/react-query'
import {
  Box, Card, CardContent, Typography, Grid, Skeleton, Chip, useTheme,
} from '@mui/material'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import { kpiApi } from '../../services/api'
import { PageShell } from '../ui/layout'
import { KpiSummary, KpiTimelinePoint, KpiStorageForecast } from '../../types'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import { getChartTipStyle } from '../ui/tokens'

interface KPICardProps {
  title: string
  value?: number
  unit: string
  color?: string
  loading: boolean
}

function KPICard({ title, value, unit, color = 'primary.main', loading }: KPICardProps) {
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

function ForecastCard({ forecast, loading }: { forecast?: KpiStorageForecast; loading: boolean }) {
  const days = forecast?.days_to_full
  const urgency = days == null ? 'info' : days <= 14 ? 'error' : days <= 30 ? 'warning' : 'success'
  const urgencyColor = urgency === 'error' ? '#ef4444' : urgency === 'warning' ? '#f59e0b' : urgency === 'success' ? '#22c55e' : '#3b82f6'

  return (
    <Card sx={{ border: '1px solid', borderColor: `${urgencyColor}55` }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1 }}>
          <Typography variant="caption" color="text.secondary">ประมาณการดิสก์เต็ม</Typography>
          <StorageRoundedIcon fontSize="small" color="action" />
        </Box>
        {loading ? (
          <Skeleton height={44} />
        ) : (
          <Typography variant="h4" fontWeight={800} sx={{ color: urgencyColor }}>
            {days?.toFixed(1) ?? '-'} <Typography component="span" variant="body1" color="text.secondary">days</Typography>
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {forecast?.full_date ? `คาดว่าเต็มวันที่ ${forecast.full_date}` : 'ยังคำนวณไม่ได้'}
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip size="small" label={`เฉลี่ย ${forecast?.estimated_daily_gb ?? 0} GB/day`} />
          <Chip size="small" label={`ใช้ไป ${forecast?.usage_percent ?? 0}%`} color={urgency as any} />
          <Chip size="small" label={`sample ${forecast?.sample_days ?? 0} วัน`} />
        </Box>
      </CardContent>
    </Card>
  )
}

export default function KPIPage() {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { data: summary, isLoading } = useQuery<KpiSummary>({
    queryKey: ['kpi-summary'],
    queryFn: () => kpiApi.summary().then(r => r.data),
    refetchInterval: 300000,
  })
  const { data: storageForecast, isLoading: storageLoading } = useQuery<KpiStorageForecast>({
    queryKey: ['kpi-storage-forecast'],
    queryFn: () => kpiApi.storageForecast().then(r => r.data),
    refetchInterval: 300000,
  })
  const { data: timeline = [] } = useQuery<KpiTimelinePoint[]>({
    queryKey: ['kpi-timeline'],
    queryFn: () => kpiApi.timeline(30).then(r => r.data),
  })

  return (
    <PageShell
      variant="dashboard"
      title="KPI ประสิทธิภาพ SOC"
      subtitle="ประสิทธิภาพ Security Operations Center ย้อนหลัง 30 วัน"
    >
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

      <Box sx={{ mb: 3 }}>
        <ForecastCard forecast={storageForecast} loading={storageLoading} />
      </Box>

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
                  <Tooltip contentStyle={getChartTipStyle(isDark)} />
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
                  <Tooltip contentStyle={getChartTipStyle(isDark)} />
                  <Bar dataKey="critical" fill="#ef4444" stackId="a" name="Critical" />
                  <Bar dataKey="high" fill="#f59e0b" stackId="a" name="High" />
                  <Bar dataKey="medium" fill="#3b82f6" stackId="a" name="Medium" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Chip size="small" label="Critical" sx={{ bgcolor: '#ef4444', color: '#fff', fontSize: 11 }} />
                <Chip size="small" label="High" sx={{ bgcolor: '#f59e0b', color: '#fff', fontSize: 11 }} />
                <Chip size="small" label="Medium" sx={{ bgcolor: '#7B5BA4', color: '#fff', fontSize: 11 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageShell>
  )
}
