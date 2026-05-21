import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Grid, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Divider,
  CircularProgress, Alert, Tabs, Tab, Avatar, Tooltip, IconButton,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PersonIcon from '@mui/icons-material/Person'
import PublicIcon from '@mui/icons-material/Public'
import TimelineIcon from '@mui/icons-material/Timeline'
import RouterIcon from '@mui/icons-material/Router'
import WifiIcon from '@mui/icons-material/Wifi'
import ListAltIcon from '@mui/icons-material/ListAlt'
import ShieldIcon from '@mui/icons-material/Shield'
import HubIcon from '@mui/icons-material/Hub'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer,
} from 'recharts'
import { investigateApi } from '../../services/api'
import { format } from 'date-fns'
import { useSnackbar } from 'notistack'

const ChartTooltipStyle = {
  background: 'rgba(30,41,59,0.95)',
  border: '1px solid #334155',
  borderRadius: 8,
  fontSize: 12,
  color: '#e2e8f0',
}

// ─── Identity Card ────────────────────────────────────────────────────────────
function IdentityCard({ query, type, results, enrichData }) {
  const { enqueueSnackbar } = useSnackbar()
  const identity = results?.identity || {}

  const abuseScore = enrichData?.abuseipdb?.abuseConfidenceScore
  const scoreColor = abuseScore > 50 ? '#ef4444' : abuseScore > 20 ? '#f59e0b' : '#10b981'
  const isPrivate = enrichData?.is_private

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          {/* Avatar */}
          <Avatar
            sx={{
              width: 56, height: 56,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              fontSize: 20, fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {type === 'ip' || type === 'auto' ? <PublicIcon /> : <PersonIcon />}
          </Avatar>

          {/* Main Identity Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: 18, fontFamily: '"IBM Plex Mono", monospace' }}>
                {query}
              </Typography>
              <Tooltip title="คัดลอก">
                <IconButton
                  size="small"
                  onClick={() => { navigator.clipboard.writeText(query); enqueueSnackbar('คัดลอกแล้ว', { variant: 'info' }) }}
                  sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                >
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              <Chip label={type.toUpperCase()} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
              {results?.count !== undefined && (
                <Chip label={`${results.count} events`} size="small" sx={{ height: 20, fontSize: 10 }} />
              )}
              {identity?.hostname && (
                <Chip label={`Host: ${identity.hostname}`} size="small" sx={{ height: 20, fontSize: 10 }} />
              )}
              {identity?.user && (
                <Chip label={`User: ${identity.user}`} size="small" sx={{ height: 20, fontSize: 10 }} />
              )}
              {identity?.agent && (
                <Chip label={`Agent: ${identity.agent}`} size="small" sx={{ height: 20, fontSize: 10 }} />
              )}
              {isPrivate && (
                <Chip label="Private IP" size="small" color="success" sx={{ height: 20, fontSize: 10 }} />
              )}
            </Box>

            {!enrichData && identity?.risk_score !== undefined && (
              <Grid container spacing={1} sx={{ mb: 1 }}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9, textTransform: 'uppercase' }}>Risk Score</Typography>
                    <Typography variant="h6" fontWeight={700}>{identity.risk_score}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9, textTransform: 'uppercase' }}>Status</Typography>
                    <Typography variant="body2" fontWeight={700}>{identity.status || '-'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9, textTransform: 'uppercase' }}>First Seen</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {identity.first_seen ? format(new Date(identity.first_seen), 'dd/MM HH:mm') : '-'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9, textTransform: 'uppercase' }}>Last Seen</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {identity.last_seen ? format(new Date(identity.last_seen), 'dd/MM HH:mm') : '-'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}

            {/* Enrichment Summary */}
            {enrichData && !isPrivate && (
              <Grid container spacing={1}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9, textTransform: 'uppercase' }}>Abuse Score</Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: scoreColor }}>
                      {abuseScore ?? 'N/A'}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9, textTransform: 'uppercase' }}>Reports</Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {enrichData.abuseipdb?.totalReports ?? 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9, textTransform: 'uppercase' }}>Country</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {enrichData.abuseipdb?.countryCode || '-'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9, textTransform: 'uppercase' }}>ISP</Typography>
                    <Typography variant="body2" fontWeight={500} noWrap sx={{ fontSize: 11 }}>
                      {enrichData.abuseipdb?.isp || '-'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────
function TimelineTab({ events }) {
  // Group events by hour
  const hourlyData = {}
  events.forEach(e => {
    if (!e['@timestamp']) return
    const hour = format(new Date(e['@timestamp']), 'MM/dd HH:00')
    hourlyData[hour] = (hourlyData[hour] || 0) + 1
  })
  const chartData = Object.entries(hourlyData)
    .map(([time, count]) => ({ time, count }))
    .sort((a, b) => a.time.localeCompare(b.time))

  return (
    <Box>
      {chartData.length > 1 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11, mb: 1, display: 'block' }}>
            Activity Timeline
          </Typography>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="investigateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <RechartTooltip contentStyle={ChartTooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#investigateGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        รวมเหตุการณ์ย้อนหลัง {events.length} รายการ
      </Typography>
    </Box>
  )
}

function EventsTab({ events }) {
  return (
    <Box>
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11, mb: 1, display: 'block' }}>
        Events ({events.length})
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>เวลา</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>คำอธิบาย</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>แหล่งที่มา</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>ระดับ</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Agent</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.slice(0, 100).map((e, i) => {
              const level = Number(e.rule?.level || e['rule.level'] || 0)
              return (
                <TableRow key={i} hover>
                  <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'nowrap' }}>
                    {e['@timestamp'] ? format(new Date(e['@timestamp']), 'MM/dd HH:mm') : '-'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{e.rule?.description || e['rule.description'] || '-'}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>
                    <Chip label={e.predecoder?.program_name || '-'} size="small" variant="outlined" sx={{ height: 18, fontSize: 9 }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={level}
                      sx={{
                        fontSize: 10, height: 18, fontWeight: 700,
                        bgcolor: level >= 15 ? '#ef4444' : level >= 12 ? '#f59e0b' : level >= 7 ? '#3b82f6' : '#10b981',
                        color: '#fff',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{e.agent?.name || '-'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}

// ─── DHCP Tab ─────────────────────────────────────────────────────────────────
function DHCPTab({ events }) {
  const dhcpEvents = events.filter(e =>
    e.data?.dhcp_action || e.predecoder?.program_name === 'infoblox'
  )

  return (
    <Box>
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11, mb: 1, display: 'block' }}>
        DHCP History ({dhcpEvents.length} records)
      </Typography>
      {dhcpEvents.length === 0 ? (
        <Alert severity="info" sx={{ fontSize: 12 }}>ไม่พบเหตุการณ์ DHCP ที่เกี่ยวข้อง</Alert>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>เวลา</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Action</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>IP</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>MAC</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Hostname</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dhcpEvents.slice(0, 50).map((e, i) => (
              <TableRow key={i} hover>
                <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'nowrap' }}>
                  {e['@timestamp'] ? format(new Date(e['@timestamp']), 'MM/dd HH:mm') : '-'}
                </TableCell>
                <TableCell>
                  <Chip label={e.data?.dhcp_action || '-'} size="small" color={e.data?.dhcp_action === 'ACK' ? 'success' : 'default'} sx={{ height: 18, fontSize: 10 }} />
                </TableCell>
                <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>{e.data?.dhcp_ip || e.data?.srcip || '-'}</TableCell>
                <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>{e.data?.dhcp_mac || e.data?.mac || '-'}</TableCell>
                <TableCell sx={{ fontSize: 11 }}>{e.data?.dhcp_hostname || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}

// ─── WiFi Tab ─────────────────────────────────────────────────────────────────
function WiFiTab({ events }) {
  const wifiEvents = events.filter(e =>
    e.predecoder?.program_name === 'huawei-ac' || e.data?.ac_msg_type
  )

  return (
    <Box>
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11, mb: 1, display: 'block' }}>
        WiFi Sessions ({wifiEvents.length} records)
      </Typography>
      {wifiEvents.length === 0 ? (
        <Alert severity="info" sx={{ fontSize: 12 }}>ไม่พบเหตุการณ์ WiFi ที่เกี่ยวข้อง</Alert>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>เวลา</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Event</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>IP</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>MAC</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>User</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>AP MAC</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wifiEvents.slice(0, 50).map((e, i) => (
              <TableRow key={i} hover>
                <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'nowrap' }}>
                  {e['@timestamp'] ? format(new Date(e['@timestamp']), 'MM/dd HH:mm') : '-'}
                </TableCell>
                <TableCell>
                  <Chip label={e.data?.ac_msg_type || '-'} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                </TableCell>
                <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>{e.data?.srcip || '-'}</TableCell>
                <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>{e.data?.mac || '-'}</TableCell>
                <TableCell sx={{ fontSize: 11 }}>{e.data?.dstuser || '-'}</TableCell>
                <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>{e.data?.ap_mac || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}

// ─── Threat Intel Tab ─────────────────────────────────────────────────────────
function ThreatIntelTab({ enrichData, query }) {
  if (!enrichData) return <Alert severity="info" sx={{ fontSize: 12 }}>กำลังโหลดข้อมูล Threat Intelligence...</Alert>
  if (enrichData.is_private) return <Alert severity="info" sx={{ fontSize: 12 }}>{query} เป็น Private IP — ไม่ตรวจสอบ Threat Intelligence</Alert>

  return (
    <Box>
      {/* AbuseIPDB Detail */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            🛡️ AbuseIPDB
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.disabled" display="block" fontSize={10}>Confidence</Typography>
              <Typography variant="h4" fontWeight={700} color={
                (enrichData.abuseipdb?.abuseConfidenceScore || 0) > 50 ? 'error.main' : 'success.main'
              }>
                {enrichData.abuseipdb?.abuseConfidenceScore ?? 'N/A'}%
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.disabled" display="block" fontSize={10}>Total Reports</Typography>
              <Typography variant="h4" fontWeight={700}>{enrichData.abuseipdb?.totalReports ?? 0}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.disabled" display="block" fontSize={10}>Country</Typography>
              <Typography variant="body1" fontWeight={600}>{enrichData.abuseipdb?.countryCode || '-'}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.disabled" display="block" fontSize={10}>ISP</Typography>
              <Typography variant="body2">{enrichData.abuseipdb?.isp || '-'}</Typography>
            </Grid>
          </Grid>
          <Divider sx={{ my: 1.5 }} />
          <Grid container spacing={1}>
            {[
              ['Domain', enrichData.abuseipdb?.domain],
              ['Usage Type', enrichData.abuseipdb?.usageType],
              ['Last Reported', enrichData.abuseipdb?.lastReportedAt],
              ['Whitelisted', enrichData.abuseipdb?.isWhitelisted ? 'Yes' : 'No'],
            ].map(([k, v]) => v ? (
              <Grid item xs={6} sm={3} key={k}>
                <Typography variant="caption" color="text.disabled" fontSize={10}>{k}</Typography>
                <Typography variant="body2" fontSize={12}>{v}</Typography>
              </Grid>
            ) : null)}
          </Grid>
        </CardContent>
      </Card>

      {/* OTX */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>🌐 AlienVault OTX</Typography>
          {enrichData.otx && Object.keys(enrichData.otx).length > 0 ? (
            <Box sx={{ bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
              <Typography variant="caption" component="pre" sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(enrichData.otx, null, 2).slice(0, 2000)}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" fontSize={12}>ไม่พบข้อมูลใน OTX</Typography>
          )}
        </CardContent>
      </Card>

      {/* Shodan */}
      {enrichData.shodan && (
        <Card variant="outlined">
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>🔍 Shodan</Typography>
            <Box sx={{ bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
              <Typography variant="caption" component="pre" sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(enrichData.shodan, null, 2).slice(0, 2000)}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

// ─── Correlation Tab ──────────────────────────────────────────────────────────
function CorrelationTab({ correlation = {}, events, query }) {
  const relatedIPs = (correlation.related_ips || [])
    .map(item => item.value)
    .filter(value => value && value !== query)
  const relatedAgents = (correlation.related_agents || []).map(item => item.value).filter(Boolean)
  const topRules = correlation.top_rules || []

  return (
    <Box>
      {/* Related IPs */}
      <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, mb: 1, display: 'block', textTransform: 'uppercase' }}>
        Related IPs ({relatedIPs.length})
      </Typography>
      {relatedIPs.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {relatedIPs.slice(0, 20).map(ip => (
            <Chip
              key={ip}
              label={ip}
              size="small"
              variant="outlined"
              sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono", monospace', cursor: 'pointer' }}
            />
          ))}
        </Box>
      ) : (
        <Alert severity="info" sx={{ fontSize: 12, mb: 2 }}>ไม่พบ IP ที่เกี่ยวข้อง</Alert>
      )}

      {/* Related Agents */}
      <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, mb: 1, display: 'block', textTransform: 'uppercase' }}>
        Agents ที่เกี่ยวข้อง ({relatedAgents.length})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
        {relatedAgents.map(a => (
          <Chip key={a} label={a} size="small" color="primary" variant="outlined" sx={{ fontSize: 10 }} />
        ))}
      </Box>

      {/* Top Rules */}
      <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, mb: 1, display: 'block', textTransform: 'uppercase' }}>
        Top Rules Triggered ({topRules.length})
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: 10, fontWeight: 700 }}>Rule ID</TableCell>
            <TableCell sx={{ fontSize: 10, fontWeight: 700 }}>Description</TableCell>
            <TableCell align="right" sx={{ fontSize: 10, fontWeight: 700 }}>Count</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {topRules
            .slice(0, 15)
            .map(rule => (
              <TableRow key={rule.id} hover>
                <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 600 }}>{rule.id}</TableCell>
                <TableCell sx={{ fontSize: 11 }}>{rule.description || '-'}</TableCell>
                <TableCell align="right"><Chip label={rule.count} size="small" color="primary" sx={{ height: 18, fontSize: 10 }} /></TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Box>
  )
}

// ─── Investigate Page ─────────────────────────────────────────────────────────
export default function InvestigatePage() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [type, setType] = useState('auto')
  const [timeRange, setTimeRange] = useState('30d')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [enrichData, setEnrichData] = useState(null)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(0)

  // Auto-search if query param provided
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
      handleSearchWithQuery(initialQuery)
    }
  }, [initialQuery])

  const handleSearchWithQuery = async (q) => {
    if (!q?.trim()) return
    setLoading(true)
    setError('')
    setResults(null)
    setEnrichData(null)
    setTab(0)
    try {
      const r = await investigateApi.search(q, type, timeRange)
      setResults(r.data)
      if (type === 'auto' || type === 'ip') {
        try {
          const e = await investigateApi.enrich(q)
          setEnrichData(e.data)
        } catch {}
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => handleSearchWithQuery(query)

  const events = results?.events || []
  const dhcpEvents = results?.dhcp || []
  const wifiEvents = results?.wifi || []
  const correlation = results?.correlation || {}

  return (
    <Box className="page-enter">
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>สืบสวน</Typography>
        <Typography variant="caption" color="text.secondary">Investigation Center — ค้นหาและวิเคราะห์ Entity</Typography>
      </Box>

      {/* Search Bar */}
      <Card sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth size="small" label="ค้นหา (IP / MAC / Username / Hostname)"
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> }}
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
              fullWidth variant="contained"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              onClick={handleSearch} disabled={loading || !query.trim()}
              sx={{ borderRadius: 2 }}
            >
              ค้นหา
            </Button>
          </Grid>
        </Grid>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Identity Card */}
      {results && (
        <IdentityCard
          query={results.query || query}
          type={results.type || type}
          results={results}
          enrichData={enrichData}
        />
      )}

      {/* Tab Results */}
      {results && (
        <Card>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1, borderColor: 'divider',
              '& .MuiTab-root': { fontSize: 12, minHeight: 40, py: 0 },
            }}
          >
            <Tab icon={<TimelineIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Timeline (${events.length})`} />
            <Tab icon={<RouterIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="DHCP" />
            <Tab icon={<WifiIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="WiFi" />
            <Tab icon={<ListAltIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Events" />
            <Tab icon={<ShieldIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Threat Intel" />
            <Tab icon={<HubIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Correlation" />
          </Tabs>
          <CardContent>
            {tab === 0 && <TimelineTab events={events} />}
            {tab === 1 && <DHCPTab events={dhcpEvents} />}
            {tab === 2 && <WiFiTab events={wifiEvents} />}
            {tab === 3 && <EventsTab events={events} />}
            {tab === 4 && <ThreatIntelTab enrichData={enrichData} query={query} />}
            {tab === 5 && <CorrelationTab correlation={correlation} events={events} query={query} />}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
