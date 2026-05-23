import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box, Card, CardContent, Typography, TextField, Button, Grid,
  Chip, Table, TableBody, TableCell, TableHead, TableRow,
  FormControl, Select, MenuItem, Alert, CircularProgress,
  IconButton, Tooltip, LinearProgress, Divider, Avatar, Collapse,
  InputAdornment, Badge, useTheme,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import WifiRoundedIcon from '@mui/icons-material/WifiRounded'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'
import HubRoundedIcon from '@mui/icons-material/HubRounded'
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import NetworkCheckRoundedIcon from '@mui/icons-material/NetworkCheckRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import FingerprintRoundedIcon from '@mui/icons-material/FingerprintRounded'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import InfoRoundedIcon from '@mui/icons-material/InfoRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import GppBadRoundedIcon from '@mui/icons-material/GppBadRounded'
import GppGoodRoundedIcon from '@mui/icons-material/GppGoodRounded'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { investigateApi } from '../../services/api'
import { format, formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { useSnackbar } from 'notistack'

// ── Constants ─────────────────────────────────────────────────────────────────
const BRAND = { purple: '#7B5BA4', purpleLight: '#9B7DC4', purpleDark: '#5A3E85', orange: '#F17422' }
const ChartTip = {
  background: 'rgba(22,18,42,0.97)',
  border: '1px solid rgba(123,91,164,0.3)',
  borderRadius: 8, fontSize: 12, color: '#EDE9FA',
}

const LEVEL_COLOR = (lv) => lv >= 15 ? '#EF4444' : lv >= 12 ? BRAND.orange : lv >= 7 ? BRAND.purple : '#22C55E'
const LEVEL_LABEL = (lv) => lv >= 15 ? 'CRIT' : lv >= 12 ? 'HIGH' : lv >= 7 ? 'MED' : 'LOW'

const ENTITY_TYPE_CONFIG = {
  ip:   { icon: <RouterRoundedIcon />,      label: 'IP Address',   color: BRAND.purple },
  mac:  { icon: <FingerprintRoundedIcon />, label: 'MAC Address',  color: '#38BDF8' },
  user: { icon: <PersonRoundedIcon />,      label: 'Username',     color: BRAND.orange },
  host: { icon: <DnsRoundedIcon />,         label: 'Hostname',     color: '#22C55E' },
  auto: { icon: <SearchRoundedIcon />,      label: 'Auto-detect',  color: BRAND.purple },
}

const STATUS_CONFIG = {
  online:  { color: '#22C55E', label: 'Online',  icon: <CheckCircleRoundedIcon sx={{ fontSize: 13 }} /> },
  stale:   { color: BRAND.orange, label: 'Stale', icon: <WarningRoundedIcon sx={{ fontSize: 13 }} /> },
  offline: { color: '#5A5278', label: 'Offline', icon: <InfoRoundedIcon sx={{ fontSize: 13 }} /> },
}

const RECENT_KEY = 'soc_inv_recent'
const MAX_RECENT = 8
const getRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] } }
const saveRecent = (v) => {
  const p = getRecent().filter(x => x !== v)
  localStorage.setItem(RECENT_KEY, JSON.stringify([v, ...p].slice(0, MAX_RECENT)))
}

// ── Utility components ────────────────────────────────────────────────────────
function CopyBtn({ text, sx = {} }) {
  const { enqueueSnackbar } = useSnackbar()
  return (
    <Tooltip title="คัดลอก">
      <IconButton size="small" onClick={() => { navigator.clipboard.writeText(text); enqueueSnackbar('คัดลอกแล้ว', { variant: 'info', autoHideDuration: 1500 }) }}
        sx={{ opacity: 0.45, '&:hover': { opacity: 1 }, p: 0.4, ...sx }}>
        <ContentCopyRoundedIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Tooltip>
  )
}

function SectionLabel({ children, count }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.disabled' }}>
        {children}
      </Typography>
      {count !== undefined && (
        <Chip label={count} size="small" sx={{ height: 16, fontSize: 9, fontWeight: 700, bgcolor: 'rgba(123,91,164,0.12)', color: BRAND.purpleLight, '& .MuiChip-label': { px: 0.7 } }} />
      )}
    </Box>
  )
}

function LevelChip({ level }) {
  const lv = Number(level || 0)
  return (
    <Chip label={`${lv} ${LEVEL_LABEL(lv)}`} size="small" sx={{
      height: 18, fontSize: 9, fontWeight: 800,
      bgcolor: `${LEVEL_COLOR(lv)}20`, color: LEVEL_COLOR(lv),
      '& .MuiChip-label': { px: 0.75 },
      animation: lv >= 15 ? 'pulse-critical 2.5s ease-in-out infinite' : 'none',
    }} />
  )
}

// ── Risk Score Gauge ──────────────────────────────────────────────────────────
function RiskGauge({ score = 0 }) {
  const color = score >= 7.5 ? '#EF4444' : score >= 5 ? BRAND.orange : score >= 2.5 ? '#EAB308' : '#22C55E'
  const pct = Math.round((score / 10) * 100)
  const circ = 2 * Math.PI * 36
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: 88, height: 88 }}>
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(123,91,164,0.12)" strokeWidth="7" />
          <circle cx="44" cy="44" r="36" fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
            strokeLinecap="round" transform="rotate(-90 44 44)"
            style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 5px ${color}70)` }}
          />
          <text x="44" y="39" textAnchor="middle" fill={color} fontSize="17" fontWeight="800" fontFamily="IBM Plex Sans Thai,sans-serif">{score}</text>
          <text x="44" y="53" textAnchor="middle" fill="rgba(237,233,250,0.45)" fontSize="8" fontFamily="IBM Plex Sans Thai,sans-serif">/10 Risk</text>
        </svg>
      </Box>
      <Chip label={score >= 7.5 ? 'HIGH RISK' : score >= 5 ? 'MEDIUM' : score >= 2.5 ? 'LOW RISK' : 'CLEAN'}
        size="small" sx={{ height: 18, fontSize: 9, fontWeight: 800, bgcolor: `${color}18`, color, border: `1px solid ${color}40`, mt: 0.5 }} />
    </Box>
  )
}

// ── Entity Identity Card ──────────────────────────────────────────────────────
function EntityCard({ query, data, enrichData, onClose }) {
  const identity   = data.identity || {}
  const levelDist  = data.level_dist || {}
  const entityType = data.type || 'auto'
  const typeConf   = ENTITY_TYPE_CONFIG[entityType] || ENTITY_TYPE_CONFIG.auto
  const statusConf = STATUS_CONFIG[identity.status] || STATUS_CONFIG.offline
  const isPrivate  = enrichData?.is_private
  const abuseScore = enrichData?.feeds?.abuseipdb?.abuseConfidenceScore

  return (
    <Card sx={{
      mb: 2, border: `1px solid ${typeConf.color}30`, position: 'relative', overflow: 'hidden',
      background: `linear-gradient(135deg, ${typeConf.color}08 0%, transparent 60%)`,
    }}>
      <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%',
        background: `radial-gradient(circle, ${typeConf.color}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <CardContent sx={{ p: '18px 22px !important' }}>
        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <Avatar sx={{ width: 54, height: 54, background: `linear-gradient(135deg, ${typeConf.color} 0%, ${BRAND.purpleDark} 100%)`, flexShrink: 0 }}>
            {typeConf.icon}
          </Avatar>

          {/* Main info */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 17, fontWeight: 800, wordBreak: 'break-all' }}>
                {query}
              </Typography>
              <CopyBtn text={query} />
              <Chip label={typeConf.label} size="small"
                sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: `${typeConf.color}18`, color: typeConf.color, border: `1px solid ${typeConf.color}30` }} />
              <Chip
                icon={statusConf.icon}
                label={statusConf.label}
                size="small"
                sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: `${statusConf.color}15`, color: statusConf.color,
                  '& .MuiChip-icon': { color: statusConf.color }, border: `1px solid ${statusConf.color}30` }}
              />
              {isPrivate && <Chip label="Private IP" size="small" color="info" sx={{ height: 20, fontSize: 10 }} />}
            </Box>

            {/* Key identifiers row */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
              {[
                ['IP', identity.ip], ['MAC', identity.mac], ['Host', identity.hostname],
                ['User', identity.user], ['Agent', identity.agent],
              ].filter(([, v]) => v && v !== query).map(([k, v]) => (
                <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase' }}>{k}:</Typography>
                  <Typography sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono",monospace', color: 'text.secondary' }}>{v}</Typography>
                  <CopyBtn text={v} />
                </Box>
              ))}
            </Box>

            {/* Stats row */}
            <Grid container spacing={1}>
              {[
                { label: 'Events',    value: data.count || 0,          color: BRAND.purple },
                { label: 'Critical',  value: levelDist.critical || 0,  color: '#EF4444' },
                { label: 'High',      value: levelDist.high || 0,      color: BRAND.orange },
                { label: 'Medium',    value: levelDist.medium || 0,    color: '#EAB308' },
                { label: 'First Seen',value: identity.first_seen ? format(new Date(identity.first_seen), 'dd/MM HH:mm') : '—', isText: true },
                { label: 'Last Seen', value: identity.last_seen ? format(new Date(identity.last_seen), 'dd/MM HH:mm') : '—', isText: true },
              ].map(({ label, value, color, isText }) => (
                <Grid item xs={6} sm={4} md={2} key={label}>
                  <Box sx={{ px: 1.25, py: 0.85, bgcolor: 'rgba(123,91,164,0.05)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(123,91,164,0.1)' }}>
                    <Typography sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.25 }}>
                      {label}
                    </Typography>
                    <Typography sx={{ fontSize: isText ? 11 : 18, fontWeight: 800, color: color || 'text.primary', lineHeight: 1.1, fontFamily: isText ? '"IBM Plex Mono",monospace' : 'inherit' }}>
                      {isText ? value : Number(value).toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Risk gauge + threat score */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <RiskGauge score={identity.risk_score || 0} />
            {abuseScore !== undefined && !isPrivate && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 0.25 }}>AbuseIPDB</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800,
                  color: abuseScore >= 75 ? '#EF4444' : abuseScore >= 30 ? BRAND.orange : '#22C55E' }}>
                  {abuseScore}%
                </Typography>
              </Box>
            )}
          </Box>

          <IconButton size="small" onClick={onClose} sx={{ alignSelf: 'flex-start' }}>
            <CloseRoundedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Activity Section ──────────────────────────────────────────────────────────
function ActivitySection({ data }) {
  const events  = data.events || []
  const hourly  = data.hourly || []
  const sources = data.top_sources || []
  const [expanded, setExpanded] = useState(true)
  const [filterLevel, setFilterLevel] = useState(0)
  const [filterSrc, setFilterSrc]     = useState('')

  const filtered = events.filter(e => {
    const lv = Number(e.rule?.level || 0)
    if (filterLevel && lv < filterLevel) return false
    if (filterSrc && e.predecoder?.program_name !== filterSrc) return false
    return true
  })

  const allSources = [...new Set(events.map(e => e.predecoder?.program_name).filter(Boolean))]

  return (
    <Card sx={{ mb: 2 }}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', '&:hover': { bgcolor: 'rgba(123,91,164,0.03)' } }}
        onClick={() => setExpanded(o => !o)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineRoundedIcon sx={{ fontSize: 16, color: BRAND.purple }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>กิจกรรม &amp; Event Log</Typography>
          <Chip label={events.length} size="small" color="primary" sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: 0.7 } }} />
        </Box>
        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{expanded ? 'ซ่อน' : 'แสดง'}</Typography>
      </Box>

      <Collapse in={expanded}>
        <Divider />
        <CardContent sx={{ p: '14px 16px !important' }}>
          {/* Timeline chart */}
          {hourly.length > 1 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600, mb: 1 }}>Activity Timeline (รายชั่วโมง)</Typography>
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={hourly} margin={{ top: 2, right: 0, left: -35, bottom: 0 }}>
                  <defs>
                    <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={BRAND.purple} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={BRAND.purple} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,91,164,0.1)" />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#9A90BF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#9A90BF' }} axisLine={false} tickLine={false} />
                  <RechartTooltip contentStyle={ChartTip} formatter={v => [v, 'Events']} />
                  <Area type="monotone" dataKey="count" stroke={BRAND.purple} strokeWidth={2} fill="url(#invGrad)" dot={false}
                    activeDot={{ r: 3, fill: BRAND.purple, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          )}

          {/* Level distribution bar */}
          {data.level_dist && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {[['Critical', '#EF4444', data.level_dist.critical], ['High', BRAND.orange, data.level_dist.high],
                ['Medium', '#EAB308', data.level_dist.medium], ['Low', '#22C55E', data.level_dist.low]].map(([l, c, n]) => (
                n > 0 && (
                  <Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, borderRadius: '7px', bgcolor: `${c}14`, border: `1px solid ${c}25` }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c, boxShadow: `0 0 5px ${c}80` }} />
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: c }}>{n}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{l}</Typography>
                  </Box>
                )
              ))}
            </Box>
          )}

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <Select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
                <MenuItem value={0}>ทุก Level</MenuItem>
                <MenuItem value={15}>Critical (15+)</MenuItem>
                <MenuItem value={12}>High (12+)</MenuItem>
                <MenuItem value={7}>Medium (7+)</MenuItem>
              </Select>
            </FormControl>
            {allSources.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <Select value={filterSrc} onChange={e => setFilterSrc(e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
                  <MenuItem value="">ทุก Source</MenuItem>
                  {allSources.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <Typography sx={{ fontSize: 11, color: 'text.disabled', alignSelf: 'center', ml: 0.5 }}>
              แสดง {filtered.length} / {events.length} events
            </Typography>
          </Box>

          {/* Events table */}
          <Box sx={{ maxHeight: 340, overflow: 'auto' }} className="scrollbar-thin">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['เวลา', 'Level', 'รายละเอียด', 'Source', 'Src IP', 'Dst IP', 'Agent'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.07em', py: 0.75, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: 'text.disabled', fontSize: 12 }}>ไม่มีข้อมูล</TableCell></TableRow>
                ) : filtered.slice(0, 200).map((e, i) => {
                  const lv = Number(e.rule?.level || 0)
                  const groups = e.rule?.groups || []
                  const mitreTags = groups.filter(g => g.startsWith('attack.') || g.startsWith('mitre'))
                  return (
                    <TableRow key={i} hover sx={{ bgcolor: lv >= 15 ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      <TableCell sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono"', whiteSpace: 'nowrap', py: 0.9 }}>
                        {e['@timestamp'] ? format(new Date(e['@timestamp']), 'dd/MM HH:mm:ss') : '-'}
                      </TableCell>
                      <TableCell sx={{ py: 0.9 }}><LevelChip level={lv} /></TableCell>
                      <TableCell sx={{ py: 0.9, maxWidth: 260 }}>
                        <Typography sx={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                          {e.rule?.description || '-'}
                        </Typography>
                        {mitreTags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.3, mt: 0.3, flexWrap: 'wrap' }}>
                            {mitreTags.slice(0, 3).map(t => (
                              <Chip key={t} label={t.replace('attack.', '')} size="small"
                                sx={{ height: 14, fontSize: 8, bgcolor: 'rgba(123,91,164,0.15)', color: BRAND.purpleLight, '& .MuiChip-label': { px: 0.5 } }} />
                            ))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 0.9 }}>
                        <Chip label={e.predecoder?.program_name || '-'} size="small" variant="outlined"
                          sx={{ height: 16, fontSize: 9, borderColor: 'rgba(123,91,164,0.2)', color: 'text.secondary' }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono"', py: 0.9 }}>{e.data?.srcip || '-'}</TableCell>
                      <TableCell sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono"', py: 0.9 }}>{e.data?.dstip || '-'}</TableCell>
                      <TableCell sx={{ fontSize: 10, py: 0.9 }}>{e.agent?.name || '-'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  )
}

// ── Network Section (DHCP + WiFi) ─────────────────────────────────────────────
function NetworkSection({ data }) {
  const dhcp = data.dhcp || []
  const wifi = data.wifi || []
  const [tab, setTab] = useState(0)
  const hasDHCP = dhcp.length > 0
  const hasWiFi = wifi.length > 0

  if (!hasDHCP && !hasWiFi) return null

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: '14px 16px !important' }}>
        <SectionLabel count={dhcp.length + wifi.length}>เครือข่าย (DHCP &amp; WiFi)</SectionLabel>
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
          {hasDHCP && (
            <Button size="small" startIcon={<NetworkCheckRoundedIcon sx={{ fontSize: 14 }} />}
              onClick={() => setTab(0)}
              sx={{ borderRadius: '8px', fontSize: 11, py: 0.5,
                bgcolor: tab === 0 ? 'rgba(123,91,164,0.15)' : 'transparent',
                color: tab === 0 ? BRAND.purpleLight : 'text.secondary' }}>
              DHCP ({dhcp.length})
            </Button>
          )}
          {hasWiFi && (
            <Button size="small" startIcon={<WifiRoundedIcon sx={{ fontSize: 14 }} />}
              onClick={() => setTab(1)}
              sx={{ borderRadius: '8px', fontSize: 11, py: 0.5,
                bgcolor: tab === 1 ? 'rgba(123,91,164,0.15)' : 'transparent',
                color: tab === 1 ? BRAND.purpleLight : 'text.secondary' }}>
              WiFi ({wifi.length})
            </Button>
          )}
        </Box>

        <Box sx={{ maxHeight: 280, overflow: 'auto' }} className="scrollbar-thin">
          {tab === 0 && hasDHCP && (
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['เวลา', 'Action', 'IP Address', 'MAC Address', 'Hostname', 'Agent'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', py: 0.75 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dhcp.map((e, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono"', whiteSpace: 'nowrap', py: 0.9 }}>
                      {e['@timestamp'] ? format(new Date(e['@timestamp']), 'dd/MM HH:mm') : '-'}
                    </TableCell>
                    <TableCell sx={{ py: 0.9 }}>
                      <Chip label={e.data?.dhcp_action || '-'} size="small"
                        color={e.data?.dhcp_action === 'ACK' ? 'success' : e.data?.dhcp_action === 'RELEASE' ? 'warning' : 'default'}
                        sx={{ height: 18, fontSize: 9, fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 11, py: 0.9 }}>{e.data?.dhcp_ip || '-'}</TableCell>
                    <TableCell sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 10, py: 0.9 }}>{e.data?.dhcp_mac || '-'}</TableCell>
                    <TableCell sx={{ fontSize: 11, py: 0.9 }}>{e.data?.dhcp_hostname || '-'}</TableCell>
                    <TableCell sx={{ fontSize: 10, py: 0.9 }}>{e.agent?.name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tab === 1 && hasWiFi && (
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['เวลา', 'Event', 'IP Address', 'MAC', 'User', 'AP MAC', 'Agent'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', py: 0.75 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {wifi.map((e, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono"', whiteSpace: 'nowrap', py: 0.9 }}>
                      {e['@timestamp'] ? format(new Date(e['@timestamp']), 'dd/MM HH:mm') : '-'}
                    </TableCell>
                    <TableCell sx={{ py: 0.9 }}>
                      <Chip label={e.data?.ac_msg_type || '-'} size="small" variant="outlined"
                        sx={{ height: 16, fontSize: 9, borderColor: 'rgba(56,189,248,0.35)', color: '#38BDF8' }} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 11, py: 0.9 }}>{e.data?.srcip || '-'}</TableCell>
                    <TableCell sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 10, py: 0.9 }}>{e.data?.mac || '-'}</TableCell>
                    <TableCell sx={{ fontSize: 11, py: 0.9 }}>{e.data?.dstuser || '-'}</TableCell>
                    <TableCell sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 10, py: 0.9 }}>{e.data?.ap_mac || '-'}</TableCell>
                    <TableCell sx={{ fontSize: 10, py: 0.9 }}>{e.agent?.name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Threat Intel Section ──────────────────────────────────────────────────────
function ThreatIntelSection({ enrichData, entityType }) {
  if (entityType !== 'ip' && entityType !== 'auto') return null
  if (!enrichData) return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: '14px 16px !important' }}>
        <SectionLabel>Threat Intelligence</SectionLabel>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} sx={{ color: BRAND.purple }} />
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>กำลังโหลดข้อมูล Threat Intelligence...</Typography>
        </Box>
      </CardContent>
    </Card>
  )

  if (enrichData.is_private) return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: '14px 16px !important' }}>
        <SectionLabel>Threat Intelligence</SectionLabel>
        <Alert severity="info" sx={{ fontSize: 12 }}>Private IP — ไม่ตรวจสอบใน external threat feeds</Alert>
      </CardContent>
    </Card>
  )

  const feeds = enrichData.feeds || {}
  const abuse = feeds.abuseipdb || {}
  const otx   = feeds.otx || {}
  const shodan = feeds.shodan || {}
  const vt    = feeds.virustotal || {}

  const feedCards = [
    {
      name: 'ABUSEIPDB', color: '#EF4444', available: abuse.available,
      main: abuse.abuseConfidenceScore ?? '—',
      mainLabel: 'Confidence %',
      rows: [
        ['Country', abuse.countryName || abuse.countryCode],
        ['ISP', abuse.isp],
        ['Reports', abuse.totalReports],
        ['Domain', abuse.domain],
        ['Usage', abuse.usageType],
        ['Whitelisted', abuse.isWhitelisted ? 'Yes' : 'No'],
      ],
      bar: abuse.abuseConfidenceScore,
      barColor: (abuse.abuseConfidenceScore || 0) >= 75 ? '#EF4444' : (abuse.abuseConfidenceScore || 0) >= 30 ? BRAND.orange : '#22C55E',
    },
    {
      name: 'ALIENVAULT OTX', color: '#FF7A00', available: otx.available,
      main: otx.pulse_count ?? '—',
      mainLabel: 'Pulses',
      rows: [
        ['Country', otx.country_name],
        ['ASN', otx.asn],
        ['Malware', otx.malware_count],
        ['City', otx.city],
      ],
      extra: otx.pulse_refs?.length > 0 ? otx.pulse_refs.slice(0, 3).map(p => p.name) : null,
    },
    {
      name: 'SHODAN', color: '#CC0000', available: shodan.available,
      main: shodan.ports?.length ?? '—',
      mainLabel: 'Open Ports',
      rows: [
        ['Org', shodan.org],
        ['Country', shodan.country_name],
        ['ASN', shodan.asn],
        ['CVEs', shodan.vulns?.length],
      ],
      ports: shodan.ports?.slice(0, 12),
      vulns: shodan.vulns?.slice(0, 5),
    },
    {
      name: 'VIRUSTOTAL', color: '#395BA9', available: vt.available,
      main: vt.found ? `${vt.malicious || 0}/${vt.total || 0}` : '—',
      mainLabel: 'Detections',
      rows: [
        ['Country', vt.country],
        ['AS Owner', vt.as_owner],
        ['Suspicious', vt.suspicious],
        ['Harmless', vt.harmless],
      ],
      engines: vt.malicious_engines?.slice(0, 3),
    },
  ]

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: '14px 16px !important' }}>
        <SectionLabel>Threat Intelligence (4 แหล่ง)</SectionLabel>
        <Grid container spacing={1.5}>
          {feedCards.map(fc => (
            <Grid item xs={12} sm={6} lg={3} key={fc.name}>
              <Box sx={{
                p: 1.5, borderRadius: '12px', height: '100%',
                border: `1px solid ${fc.available ? `${fc.color}28` : 'rgba(123,91,164,0.1)'}`,
                bgcolor: fc.available ? `${fc.color}06` : 'rgba(123,91,164,0.03)',
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 9, fontWeight: 800, color: fc.available ? fc.color : 'text.disabled', letterSpacing: '0.07em' }}>
                    {fc.name}
                  </Typography>
                  {!fc.available && <Chip label="N/A" size="small" sx={{ height: 14, fontSize: 8, opacity: 0.5 }} />}
                </Box>
                {fc.available ? (
                  <>
                    <Typography sx={{ fontSize: 22, fontWeight: 900, color: fc.barColor || fc.color, lineHeight: 1, mb: 0.25 }}>
                      {fc.main}
                    </Typography>
                    <Typography sx={{ fontSize: 9, color: 'text.disabled', mb: fc.bar !== undefined ? 0.75 : 1 }}>{fc.mainLabel}</Typography>
                    {fc.bar !== undefined && (
                      <LinearProgress variant="determinate" value={fc.bar || 0} sx={{
                        height: 4, borderRadius: 2, mb: 1,
                        bgcolor: `${fc.color}15`,
                        '& .MuiLinearProgress-bar': { bgcolor: fc.barColor, borderRadius: 2 },
                      }} />
                    )}
                    {fc.rows.filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 0).slice(0, 4).map(([k, v]) => (
                      <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography sx={{ fontSize: 9, color: 'text.disabled', textTransform: 'uppercase' }}>{k}</Typography>
                        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                          {String(v)}
                        </Typography>
                      </Box>
                    ))}
                    {fc.ports?.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography sx={{ fontSize: 9, color: 'text.disabled', mb: 0.3, textTransform: 'uppercase' }}>Ports</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                          {fc.ports.map(p => (
                            <Chip key={p} label={p} size="small" sx={{
                              height: 15, fontSize: 8, fontFamily: '"IBM Plex Mono"',
                              bgcolor: [22, 23, 3389, 4444, 6379].includes(p) ? 'rgba(239,68,68,0.15)' : 'rgba(123,91,164,0.1)',
                              color: [22, 23, 3389, 4444, 6379].includes(p) ? '#EF4444' : 'text.secondary',
                              '& .MuiChip-label': { px: 0.5 },
                            }} />
                          ))}
                        </Box>
                      </Box>
                    )}
                    {fc.vulns?.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography sx={{ fontSize: 9, color: '#EF4444', textTransform: 'uppercase', fontWeight: 700, mb: 0.3 }}>CVEs</Typography>
                        {fc.vulns.map(v => (
                          <Chip key={v} label={v} size="small" sx={{ height: 14, fontSize: 8, mr: 0.3, mb: 0.2, bgcolor: 'rgba(239,68,68,0.1)', color: '#EF4444', '& .MuiChip-label': { px: 0.5 } }} />
                        ))}
                      </Box>
                    )}
                    {fc.extra?.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography sx={{ fontSize: 9, color: 'text.disabled', textTransform: 'uppercase', mb: 0.3 }}>Threat Pulses</Typography>
                        {fc.extra.map((p, i) => (
                          <Typography key={i} sx={{ fontSize: 9, color: 'text.secondary', lineHeight: 1.4 }} className="line-clamp-2">{p}</Typography>
                        ))}
                      </Box>
                    )}
                    {fc.engines?.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography sx={{ fontSize: 9, color: '#EF4444', textTransform: 'uppercase', fontWeight: 700, mb: 0.3 }}>Detected by</Typography>
                        {fc.engines.map((eng, i) => (
                          <Typography key={i} sx={{ fontSize: 9, color: '#EF4444' }}>{eng.engine}: {eng.result}</Typography>
                        ))}
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>ไม่มีข้อมูล</Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

// ── MITRE ATT&CK Section ──────────────────────────────────────────────────────
function MitreSection({ mitre = {} }) {
  const tactics    = mitre.tactics || []
  const techniques = mitre.techniques || []
  if (!tactics.length && !techniques.length) return null

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: '14px 16px !important' }}>
        <SectionLabel>MITRE ATT&amp;CK Mapping</SectionLabel>
        {tactics.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 0.75 }}>Tactics</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {tactics.map(t => (
                <Chip key={t} label={t} size="small"
                  sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }} />
              ))}
            </Box>
          </Box>
        )}
        {techniques.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 0.75 }}>Techniques</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {techniques.map(t => (
                <Chip key={t} label={t} size="small" variant="outlined"
                  sx={{ height: 20, fontSize: 10, borderColor: 'rgba(123,91,164,0.35)', color: BRAND.purpleLight }} />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ── Correlation Section ───────────────────────────────────────────────────────
function CorrelationSection({ data }) {
  const corr    = data.correlation || {}
  const sources = data.top_sources || []
  const relIPs  = (corr.related_ips || []).filter(x => x.value)
  const relMACs = (corr.related_macs || []).filter(x => x.value)
  const relUsers = (corr.related_users || []).filter(x => x.value)
  const relAgents = (corr.related_agents || []).filter(x => x.value)
  const topRules  = corr.top_rules || []
  const conflicts = corr.ip_conflicts || {}

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: '14px 16px !important' }}>
        <SectionLabel>ความสัมพันธ์ &amp; Correlation</SectionLabel>
        <Grid container spacing={2}>
          {/* Related entities */}
          <Grid item xs={12} md={5}>
            {[
              { label: 'IP ที่เกี่ยวข้อง', items: relIPs, color: BRAND.purple, mono: true },
              { label: 'MAC ที่เกี่ยวข้อง', items: relMACs, color: '#38BDF8', mono: true },
              { label: 'ผู้ใช้ที่เกี่ยวข้อง', items: relUsers, color: BRAND.orange },
              { label: 'Agents', items: relAgents, color: '#22C55E' },
            ].filter(g => g.items.length > 0).map(g => (
              <Box key={g.label} sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>{g.label}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {g.items.slice(0, 10).map(({ value, count }) => (
                    <Tooltip key={value} title={`${count} events`}>
                      <Chip label={value} size="small"
                        sx={{ height: 20, fontSize: 10, cursor: 'default', fontFamily: g.mono ? '"IBM Plex Mono"' : 'inherit',
                          bgcolor: `${g.color}15`, color: g.color, border: `1px solid ${g.color}25` }} />
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            ))}

            {/* IP conflicts */}
            {Object.keys(conflicts).length > 0 && (
              <Alert severity="warning" sx={{ fontSize: 11, mb: 1 }}>
                <b>IP Conflict:</b> พบ IP ที่ใช้ MAC หลายค่า
                {Object.entries(conflicts).map(([ip, macs]) => (
                  <Box key={ip} sx={{ mt: 0.5 }}>
                    <Typography sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono"' }}>{ip}: {macs.join(', ')}</Typography>
                  </Box>
                ))}
              </Alert>
            )}
          </Grid>

          {/* Top rules */}
          <Grid item xs={12} md={4}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 0.75 }}>Top Rules Triggered</Typography>
            <Box sx={{ maxHeight: 250, overflow: 'auto' }} className="scrollbar-thin">
              {topRules.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>ไม่มีข้อมูล</Typography>
              ) : topRules.map((r, i) => (
                <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75,
                  p: 0.75, borderRadius: '8px', bgcolor: 'rgba(123,91,164,0.04)' }}>
                  <Typography sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono"', color: BRAND.purpleLight, minWidth: 48, fontWeight: 700 }}>
                    {r.id}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.description}
                  </Typography>
                  <Chip label={r.count} size="small" color="primary" sx={{ height: 16, fontSize: 9, minWidth: 24, '& .MuiChip-label': { px: 0.7 } }} />
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Top sources chart */}
          {sources.length > 0 && (
            <Grid item xs={12} md={3}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 0.75 }}>Log Sources</Typography>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sources.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#9A90BF' }} width={80} axisLine={false} tickLine={false} />
                  <RechartTooltip contentStyle={ChartTip} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={BRAND.purple} />
                </BarChart>
              </ResponsiveContainer>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  )
}

// ── Main Investigate Page ─────────────────────────────────────────────────────
export default function InvestigatePage() {
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const inputRef = useRef(null)

  const [query,      setQuery]     = useState(initialQ)
  const [entityType, setEntityType]= useState('auto')
  const [timeRange,  setTimeRange] = useState('30d')
  const [loading,    setLoading]   = useState(false)
  const [error,      setError]     = useState('')
  const [result,     setResult]    = useState(null)
  const [enrichData, setEnrich]    = useState(null)
  const [recent,     setRecent]    = useState(getRecent)

  const doSearch = useCallback(async (q, type = entityType, tr = timeRange) => {
    const val = (q || query).trim()
    if (!val) return
    setQuery(val)
    setLoading(true)
    setError('')
    setResult(null)
    setEnrich(null)
    try {
      const r = await investigateApi.search(val, type, tr)
      setResult(r.data)
      saveRecent(val)
      setRecent(getRecent())
      // Fetch enrich if entity is IP
      const detectedType = r.data.type
      if (detectedType === 'ip' || detectedType === 'auto') {
        investigateApi.enrich(val).then(e => setEnrich(e.data)).catch(() => {})
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการค้นหา')
    } finally {
      setLoading(false)
    }
  }, [query, entityType, timeRange])

  // Auto-search from URL param
  useEffect(() => { if (initialQ) doSearch(initialQ) }, [])

  const clearResult = () => { setResult(null); setEnrich(null); setQuery(''); setError(''); inputRef.current?.focus() }

  return (
    <Box className="page-enter">
      {/* ── Header ── */}
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>วิเคราะห์เหตุการณ์</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
          Forensic Investigation — IP · MAC · Username · Hostname · Alert Correlation
        </Typography>
      </Box>

      {/* ── Hero Search ── */}
      <Card sx={{
        mb: 2.5, overflow: 'hidden', position: 'relative',
        border: '1px solid rgba(123,91,164,0.2)',
        background: 'linear-gradient(135deg, rgba(123,91,164,0.07) 0%, rgba(241,116,34,0.03) 100%)',
      }}>
        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,91,164,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <CardContent sx={{ p: '20px 24px !important', position: 'relative', zIndex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 2 }}>
            ค้นหาและวิเคราะห์ Entity
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <TextField
              inputRef={inputRef}
              placeholder="เช่น 192.168.1.100 · aa:bb:cc:dd:ee:ff · johndoe · PC-NURSE-01"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              size="small" sx={{ flex: 1, minWidth: 260 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: BRAND.purple, fontSize: 20 }} /></InputAdornment>,
                endAdornment: query && <InputAdornment position="end"><IconButton size="small" onClick={() => { setQuery(''); setResult(null) }}><CloseRoundedIcon sx={{ fontSize: 16 }} /></IconButton></InputAdornment>,
                sx: { fontSize: 14, fontFamily: '"IBM Plex Mono",monospace' },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select value={entityType} onChange={e => setEntityType(e.target.value)} sx={{ fontSize: 12 }}>
                <MenuItem value="auto">อัตโนมัติ</MenuItem>
                <MenuItem value="ip">IP Address</MenuItem>
                <MenuItem value="mac">MAC Address</MenuItem>
                <MenuItem value="user">Username</MenuItem>
                <MenuItem value="host">Hostname</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select value={timeRange} onChange={e => setTimeRange(e.target.value)} sx={{ fontSize: 12 }}>
                {['7d', '14d', '30d', '90d'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchRoundedIcon />}
              onClick={() => doSearch()} disabled={loading || !query.trim()}
              sx={{ py: 0.95, px: 2.5, borderRadius: '10px', minWidth: 120, whiteSpace: 'nowrap' }}>
              {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
            </Button>
          </Box>

          {recent.length > 0 && !result && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600, flexShrink: 0 }}>ค้นหาล่าสุด:</Typography>
              {recent.map((r, i) => (
                <Chip key={i} label={r} size="small" onClick={() => doSearch(r)}
                  sx={{ height: 20, fontSize: 10, fontFamily: '"IBM Plex Mono"', cursor: 'pointer',
                    bgcolor: 'rgba(123,91,164,0.08)', color: 'text.secondary',
                    '&:hover': { bgcolor: 'rgba(123,91,164,0.18)', color: BRAND.purpleLight } }} />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Loading */}
      {loading && (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress sx={{ color: BRAND.purple, mb: 2 }} size={40} />
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>กำลังวิเคราะห์เหตุการณ์ใน Wazuh...</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>ค้นหาใน OpenSearch · DHCP · WiFi · Correlation</Typography>
        </Box>
      )}

      {/* Empty state */}
      {!loading && !result && !error && (
        <Card sx={{ textAlign: 'center', py: 8, border: '1px dashed', borderColor: 'rgba(123,91,164,0.2)', bgcolor: 'transparent' }}>
          <SecurityRoundedIcon sx={{ fontSize: 56, color: 'rgba(123,91,164,0.3)', mb: 1.5 }} />
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.secondary' }}>พร้อมวิเคราะห์เหตุการณ์</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>ใส่ IP, MAC, Username หรือ Hostname แล้วกด Enter</Typography>
          <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
            {[
              { icon: <RouterRoundedIcon sx={{ fontSize: 16 }} />, label: 'IP Address', ex: '192.168.1.100' },
              { icon: <FingerprintRoundedIcon sx={{ fontSize: 16 }} />, label: 'MAC Address', ex: 'aa:bb:cc:11:22:33' },
              { icon: <PersonRoundedIcon sx={{ fontSize: 16 }} />, label: 'Username', ex: 'john.doe' },
              { icon: <DnsRoundedIcon sx={{ fontSize: 16 }} />, label: 'Hostname', ex: 'PC-WARD-01' },
            ].map(({ icon, label, ex }) => (
              <Box key={label} sx={{ textAlign: 'center', cursor: 'pointer', opacity: 0.65, '&:hover': { opacity: 1 } }}
                onClick={() => { setQuery(ex); inputRef.current?.focus() }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(123,91,164,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 0.75, color: BRAND.purpleLight }}>
                  {icon}
                </Box>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>{ex}</Typography>
              </Box>
            ))}
          </Box>
        </Card>
      )}

      {/* Results */}
      {!loading && result && (
        <>
          <EntityCard query={result.query || query} data={result} enrichData={enrichData} onClose={clearResult} />
          <ActivitySection data={result} />
          <NetworkSection data={result} />
          <ThreatIntelSection enrichData={enrichData} entityType={result.type} />
          <MitreSection mitre={result.mitre} />
          <CorrelationSection data={result} />
        </>
      )}
    </Box>
  )
}
