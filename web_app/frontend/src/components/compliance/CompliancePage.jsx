import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Box, Card, CardContent, Typography, Grid, Chip,
  Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, FormControl, Skeleton, LinearProgress, Alert,
  Divider,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import SecurityIcon from '@mui/icons-material/Security'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import { complianceApi } from '../../services/api'

const ChartTooltipStyle = { background: 'rgba(30,41,59,0.95)', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }

const FRAMEWORKS = [
  { key: 'pci_dss', label: 'PCI DSS', icon: '💳', color: '#3b82f6', description: 'Payment Card Industry Data Security Standard' },
  { key: 'hipaa', label: 'HIPAA', icon: '🏥', color: '#10b981', description: 'Health Insurance Portability and Accountability Act' },
  { key: 'gdpr', label: 'GDPR', icon: '🇪🇺', color: '#8b5cf6', description: 'General Data Protection Regulation' },
  { key: 'nist', label: 'NIST 800-53', icon: '🏛️', color: '#f59e0b', description: 'National Institute of Standards and Technology' },
  { key: 'tsc', label: 'TSC', icon: '🔐', color: '#ec4899', description: 'Trust Services Criteria' },
]

const FW_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899']

// ─── Framework Score Card ─────────────────────────────────────────────────────
function FrameworkScoreCard({ fw, data, loading, onClick, active }) {
  const total = data?.total || 0
  const topReqs = data?.top_requirements || []
  const grade = total > 1000 ? 'A' : total > 500 ? 'B' : total > 100 ? 'C' : 'D'
  const gradeColor = grade === 'A' ? '#10b981' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : '#ef4444'

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderTop: `3px solid ${fw.color}`,
        transition: 'all 0.25s ease',
        transform: active ? 'translateY(-3px)' : 'none',
        boxShadow: active ? `0 4px 16px ${fw.color}33` : undefined,
        '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 4px 16px ${fw.color}33` },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Box>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
              {fw.icon} {fw.label}
            </Typography>
            {loading ? (
              <Skeleton height={32} width={60} />
            ) : (
              <Typography variant="h5" fontWeight={700} sx={{ color: fw.color }}>
                {total.toLocaleString()}
              </Typography>
            )}
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>alerts</Typography>
          </Box>
          {!loading && (
            <Box sx={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: `${gradeColor}18`, flexShrink: 0,
            }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: gradeColor, fontSize: 14 }}>
                {grade}
              </Typography>
            </Box>
          )}
        </Box>
        {!loading && topReqs.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9, textTransform: 'uppercase' }}>
              Top: {topReqs[0]?.req}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Compliance Page ──────────────────────────────────────────────────────────
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
  const chartData = (fwData.top_requirements || []).map(r => ({ name: r.req, count: r.count }))

  // Build overview pie data
  const overviewData = FRAMEWORKS.map((f, i) => ({
    name: f.label,
    value: summary?.[f.key]?.total || 0,
    color: FW_COLORS[i],
  })).filter(d => d.value > 0)

  const totalAlerts = overviewData.reduce((s, d) => s + d.value, 0)

  return (
    <Box className="page-enter">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>ความสอดคล้อง (Compliance)</Typography>
          <Typography variant="caption" color="text.secondary">Regulatory Compliance — การปฏิบัติตามมาตรฐาน</Typography>
        </Box>
        <FormControl size="small">
          <Select value={timeRange} onChange={e => setTimeRange(e.target.value)} sx={{ borderRadius: 2, fontSize: 13 }}>
            {['24h','7d','30d','90d'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* Framework Score Cards */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {FRAMEWORKS.map((f, i) => (
          <Grid item xs={6} sm={2.4} key={f.key}>
            <FrameworkScoreCard
              fw={f}
              data={summary?.[f.key]}
              loading={isLoading}
              onClick={() => setTab(i)}
              active={tab === i}
            />
          </Grid>
        ))}
      </Grid>

      {/* Overview Row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Distribution Pie */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: '14px 16px !important' }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1} fontSize={13}>
                การกระจายตาม Framework
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : overviewData.length === 0 ? (
                <Alert severity="info" sx={{ fontSize: 12 }}>ไม่มีข้อมูล</Alert>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={overviewData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={25} paddingAngle={2}>
                        {overviewData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <RechartTooltip contentStyle={ChartTooltipStyle} />
                      <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 10 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ textAlign: 'center', mt: 0.5 }}>
                    <Typography variant="caption" color="text.disabled">
                      รวม {totalAlerts.toLocaleString()} alerts ใน {timeRange}
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Detailed Framework View */}
        <Grid item xs={12} md={8}>
          <Card>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: 1, borderColor: 'divider',
                '& .MuiTab-root': { fontSize: 12, minHeight: 36, py: 0 },
              }}
            >
              {FRAMEWORKS.map((f, i) => (
                <Tab key={f.key} label={`${f.icon} ${f.label}`} />
              ))}
            </Tabs>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: 14 }}>
                    {fw.icon} {fw.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    {fw.description}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  {!isLoading && (
                    <Typography variant="h5" fontWeight={700} sx={{ color: fw.color }}>
                      {(fwData.total || 0).toLocaleString()}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled">total alerts</Typography>
                </Box>
              </Box>

              {isLoading ? <Skeleton variant="rectangular" height={200} /> : (
                <Grid container spacing={2}>
                  {/* Bar chart */}
                  <Grid item xs={12} md={7}>
                    <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11, mb: 1, display: 'block' }}>
                      Top Requirements ({timeRange})
                    </Typography>
                    {chartData.length === 0 ? (
                      <Alert severity="info" sx={{ fontSize: 12 }}>ไม่พบข้อมูล</Alert>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={chartData.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} stroke="#94a3b8" />
                          <RechartTooltip contentStyle={ChartTooltipStyle} />
                          <Bar dataKey="count" fill={fw.color} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Grid>

                  {/* Requirements table */}
                  <Grid item xs={12} md={5}>
                    <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11, mb: 1, display: 'block' }}>
                      รายละเอียด Requirements
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Requirement</TableCell>
                          <TableCell align="right" sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Alerts</TableCell>
                          <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {chartData.slice(0, 15).map((r, i) => {
                          const pct = fwData.total > 0 ? ((r.count / fwData.total) * 100).toFixed(1) : 0
                          return (
                            <TableRow key={i} hover>
                              <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace' }}>{r.name}</TableCell>
                              <TableCell align="right">
                                <Chip label={r.count.toLocaleString()} size="small" sx={{ height: 18, fontSize: 10, bgcolor: `${fw.color}22`, color: fw.color, fontWeight: 600 }} />
                              </TableCell>
                              <TableCell>
                                {r.count > 100 ? (
                                  <Chip label={`${pct}%`} size="small" color="warning" sx={{ height: 16, fontSize: 9 }} />
                                ) : (
                                  <Chip label={`${pct}%`} size="small" color="success" sx={{ height: 16, fontSize: 9 }} />
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
