import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Card, CardContent, Typography, TextField, Button, Grid,
  Chip, Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress,
  IconButton, Tooltip, LinearProgress, Divider, Skeleton, Collapse,
  InputAdornment,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import GppBadRoundedIcon from '@mui/icons-material/GppBadRounded'
import GppGoodRoundedIcon from '@mui/icons-material/GppGoodRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import FingerprintRoundedIcon from '@mui/icons-material/FingerprintRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { iocApi } from '../../services/api'
import { PageShell } from '../ui/layout'
import { format, formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { useSnackbar } from 'notistack'
import { useThemeMode } from '../../theme/ThemeContext'
import { safeStorage } from '../../utils/safeStorage'

// ── Constants ─────────────────────────────────────────────────────────────────
const BRAND = { purple: '#7B5BA4', purpleLight: '#9B7DC4', purpleDark: '#5A3E85', orange: '#F17422' }
const ChartTip = { background: 'rgba(22,18,42,0.97)', border: '1px solid rgba(123,91,164,0.3)', borderRadius: 8, fontSize: 12, color: '#EDE9FA' }

interface VerdictItem {
  color: string;
  bg: string;
  label: string;
  icon: React.ReactNode;
  desc: string;
}

const VERDICT_CONFIG: Record<string, VerdictItem> = {
  blocked:    { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'BLOCKED',    icon: <GppBadRoundedIcon />,  desc: 'พบใน Custom IOC Block-list' },
  malicious:  { color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   label: 'MALICIOUS',  icon: <GppBadRoundedIcon />,  desc: 'ตรวจพบว่าเป็นภัยคุกคาม' },
  suspicious: { color: '#F17422', bg: 'rgba(241,116,34,0.10)',  label: 'SUSPICIOUS', icon: <WarningRoundedIcon />, desc: 'พบสัญญาณที่น่าสงสัย' },
  clean:      { color: '#22C55E', bg: 'rgba(34,197,94,0.08)',   label: 'CLEAN',      icon: <GppGoodRoundedIcon />, desc: 'ไม่พบภัยคุกคามในฐานข้อมูล' },
}

const IOC_TYPE_ICON: Record<string, React.ReactNode> = {
  ip:          <RouterRoundedIcon    sx={{ fontSize: 14 }} />,
  domain:      <LanguageRoundedIcon  sx={{ fontSize: 14 }} />,
  hash_md5:    <FingerprintRoundedIcon sx={{ fontSize: 14 }} />,
  hash_sha1:   <FingerprintRoundedIcon sx={{ fontSize: 14 }} />,
  hash_sha256: <FingerprintRoundedIcon sx={{ fontSize: 14 }} />,
  url:         <LinkRoundedIcon      sx={{ fontSize: 14 }} />,
  unknown:     <ManageSearchRoundedIcon sx={{ fontSize: 14 }} />,
}

const TYPE_LABEL: Record<string, string> = {
  ip: 'IP Address', domain: 'Domain', hash_md5: 'MD5 Hash',
  hash_sha1: 'SHA1 Hash', hash_sha256: 'SHA256 Hash', url: 'URL',
}

const SEV_COLORS: Record<string, string> = { critical: '#EF4444', high: BRAND.orange, medium: '#EAB308', low: '#22C55E' }
const PIE_PALETTE = [BRAND.purple, BRAND.orange, '#38BDF8', '#22C55E', '#EAB308', '#EC4899']

// ── Risk Score Gauge ──────────────────────────────────────────────────────────
interface RiskGaugeProps {
  score?: number;
  verdict?: string;
  size?: number;
}

function RiskGauge({ score = 0, verdict = 'clean', size = 120 }: RiskGaugeProps) {
  const cfg = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.clean
  const circumference = 2 * Math.PI * 44
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(123,91,164,0.12)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke={cfg.color} strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 6px ${cfg.color}80)` }}
          />
          <text x="50" y="44" textAnchor="middle" fill={cfg.color} fontSize="20" fontWeight="800" fontFamily="IBM Plex Sans Thai, sans-serif">
            {score}
          </text>
          <text x="50" y="58" textAnchor="middle" fill="rgba(237,233,250,0.5)" fontSize="9" fontFamily="IBM Plex Sans Thai, sans-serif">
            Risk Score
          </text>
        </svg>
      </Box>
      <Chip
        label={cfg.label}
        size="small"
        icon={cfg.icon as any}
        sx={{
          bgcolor: cfg.bg, color: cfg.color,
          fontWeight: 800, fontSize: 11, height: 24,
          border: `1px solid ${cfg.color}40`,
          '& .MuiChip-icon': { color: cfg.color, fontSize: 16 },
        }}
      />
    </Box>
  )
}

// ── Copy Button ───────────────────────────────────────────────────────────────
interface CopyBtnProps {
  text: string;
}

function CopyBtn({ text }: CopyBtnProps) {
  const { enqueueSnackbar } = useSnackbar()
  return (
    <Tooltip title="คัดลอก">
      <IconButton
        size="small"
        onClick={() => { navigator.clipboard.writeText(text); enqueueSnackbar('คัดลอกแล้ว', { variant: 'info', autoHideDuration: 1500 }) }}
        sx={{ opacity: 0.45, '&:hover': { opacity: 1 }, p: 0.4 }}
      >
        <ContentCopyRoundedIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Tooltip>
  )
}

// ── Feed Card base ────────────────────────────────────────────────────────────
interface FeedCardProps {
  title: string;
  logo: string;
  available: boolean;
  children: React.ReactNode;
  accentColor?: string;
}

function FeedCard({ title, logo, available, children, accentColor }: FeedCardProps) {
  const color = accentColor || BRAND.purple
  return (
    <Card sx={{
      height: '100%',
      border: `1px solid ${available ? `${color}30` : 'rgba(123,91,164,0.1)'}`,
      '&:hover': { borderColor: `${color}50` },
    }}>
      <CardContent sx={{ p: '14px 16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
          <Box sx={{
            px: 1, py: 0.3, borderRadius: '6px',
            bgcolor: available ? `${color}18` : 'rgba(123,91,164,0.06)',
            border: `1px solid ${color}25`,
          }}>
            <Typography sx={{ fontSize: 10, fontWeight: 800, color: available ? color : 'text.disabled', letterSpacing: '0.06em' }}>
              {logo}
            </Typography>
          </Box>
          {!available && <Chip label="ไม่พร้อมใช้" size="small" sx={{ height: 16, fontSize: 9, opacity: 0.5 }} />}
        </Box>
        {children}
      </CardContent>
    </Card>
  )
}

// ── AbuseIPDB Card ────────────────────────────────────────────────────────────
interface AbuseIPDBCardProps {
  data: any;
}

function AbuseIPDBCard({ data }: AbuseIPDBCardProps) {
  if (!data?.available) {
    return (
      <FeedCard title="AbuseIPDB" logo="ABUSEIPDB" available={false} accentColor="#EF4444">
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>ไม่มีข้อมูล</Typography>
      </FeedCard>
    )
  }
  const score = data.abuseConfidenceScore || 0
  const scoreColor = score >= 75 ? '#EF4444' : score >= 30 ? BRAND.orange : '#22C55E'
  return (
    <FeedCard title="AbuseIPDB" logo="ABUSEIPDB" available accentColor="#EF4444">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 26, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}</Typography>
          <Typography sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 600 }}>Confidence %</Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <LinearProgress variant="determinate" value={score} sx={{
            height: 6, borderRadius: 3, mb: 0.5,
            bgcolor: 'rgba(239,68,68,0.1)',
            '& .MuiLinearProgress-bar': { bgcolor: scoreColor, borderRadius: 3 },
          }} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {data.isWhitelisted && <Chip label="Whitelisted" size="small" color="success" sx={{ height: 16, fontSize: 9 }} />}
            <Chip label={`${data.totalReports || 0} Reports`} size="small" sx={{ height: 16, fontSize: 9, bgcolor: 'rgba(239,68,68,0.1)', color: '#EF4444' }} />
          </Box>
        </Box>
      </Box>
      <Grid container spacing={0.5}>
        {[
          ['ประเทศ', data.countryName || data.countryCode || '-'],
          ['ISP', data.isp || '-'],
          ['Domain', data.domain || '-'],
          ['Usage', data.usageType || '-'],
          ['Users', data.numDistinctUsers?.toLocaleString() || '0'],
          ['Last Report', data.lastReportedAt ? format(new Date(data.lastReportedAt), 'dd MMM yy') : '-'],
        ].map(([k, v]) => (
          <Grid item xs={6} key={k}>
            <Typography sx={{ fontSize: 9, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-all' }}>{v}</Typography>
          </Grid>
        ))}
      </Grid>
      {data.reports?.length > 0 && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600, mb: 0.5 }}>RECENT REPORTS</Typography>
          {data.reports.slice(0, 2).map((r: any, i: number) => (
            <Typography key={i} sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.4 }} noWrap>
              {r.comment || '(no comment)'}
            </Typography>
          ))}
        </Box>
      )}
    </FeedCard>
  )
}

// ── AlienVault OTX Card ───────────────────────────────────────────────────────
interface OTXCardProps {
  data: any;
}

function OTXCard({ data }: OTXCardProps) {
  const hasPulses = data?.available && (data?.pulse_count || 0) > 0
  return (
    <FeedCard title="OTX" logo="ALIENVAULT OTX" available={!!data?.available} accentColor="#FF7A00">
      {!data?.available ? (
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>ไม่มีข้อมูล</Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.25 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 26, fontWeight: 900, color: hasPulses ? '#FF7A00' : '#22C55E', lineHeight: 1 }}>
                {data.pulse_count || 0}
              </Typography>
              <Typography sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 600 }}>Pulses</Typography>
            </Box>
            <Box>
              {data.country_name && (
                <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{data.country_name}</Typography>
              )}
              {data.asn && (
                <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{data.asn}</Typography>
              )}
              {data.malware_count > 0 && (
                <Chip label={`${data.malware_count} Malware`} size="small" color="error" sx={{ mt: 0.5, height: 16, fontSize: 9 }} />
              )}
            </Box>
          </Box>
          {data.pulse_refs?.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                THREAT PULSES
              </Typography>
              {data.pulse_refs.map((p: any, i: number) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                  <BugReportRoundedIcon sx={{ fontSize: 12, color: '#FF7A00', mt: 0.15, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 10, lineHeight: 1.4, color: 'text.secondary' }} className="line-clamp-2">
                    {p.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          {!hasPulses && (
            <Alert severity="success" sx={{ fontSize: 11, py: 0.5 }}>ไม่พบ pulse ที่เกี่ยวข้อง</Alert>
          )}
        </>
      )}
    </FeedCard>
  )
}

// ── Shodan Card ───────────────────────────────────────────────────────────────
interface ShodanCardProps {
  data: any;
}

function ShodanCard({ data }: ShodanCardProps) {
  if (!data?.available) {
    return (
      <FeedCard title="Shodan" logo="SHODAN" available={false} accentColor="#CC0000">
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>ไม่มีข้อมูล</Typography>
      </FeedCard>
    )
  }
  return (
    <FeedCard title="Shodan" logo="SHODAN" available accentColor="#CC0000">
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.25, flexWrap: 'wrap' }}>
        {data.org && <Typography sx={{ fontSize: 11 }}><b>Org:</b> {data.org}</Typography>}
        {data.country_name && <Typography sx={{ fontSize: 11 }}><b>Country:</b> {data.country_name}</Typography>}
        {data.os && <Chip label={data.os} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />}
      </Box>
      {data.ports?.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
            OPEN PORTS ({data.ports.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
            {data.ports.slice(0, 16).map((p: number) => (
              <Chip key={p} label={p} size="small" sx={{
                height: 18, fontSize: 10, fontFamily: '"IBM Plex Mono", monospace',
                bgcolor: [21, 22, 23, 25, 443, 3389, 4444, 6379, 27017].includes(p)
                  ? 'rgba(239,68,68,0.15)' : 'rgba(123,91,164,0.1)',
                color: [21, 22, 23, 25, 443, 3389, 4444, 6379, 27017].includes(p) ? '#EF4444' : 'text.secondary',
              }} />
            ))}
          </Box>
        </Box>
      )}
      {data.vulns?.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 9, color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
            CVEs ({data.vulns.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
            {data.vulns.slice(0, 8).map((v: string) => (
              <Chip key={v} label={v} size="small" sx={{
                height: 18, fontSize: 9, bgcolor: 'rgba(239,68,68,0.1)', color: '#EF4444',
              }} />
            ))}
          </Box>
        </Box>
      )}
      {data.services?.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
            SERVICES
          </Typography>
          {data.services.slice(0, 3).map((s: any, i: number) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.3 }}>
              <Chip label={`${s.port}/${s.transport}`} size="small" sx={{ height: 16, fontSize: 9, fontFamily: '"IBM Plex Mono"', bgcolor: 'rgba(123,91,164,0.1)', color: 'text.secondary' }} />
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }} noWrap>
                {[s.product, s.version].filter(Boolean).join(' ') || 'unknown'}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      {data.last_update && (
        <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 1 }}>
          Updated: {formatDistanceToNow(new Date(data.last_update), { addSuffix: true, locale: th })}
        </Typography>
      )}
    </FeedCard>
  )
}

// ── VirusTotal Card ───────────────────────────────────────────────────────────
interface VirusTotalCardProps {
  data: any;
}

function VirusTotalCard({ data }: VirusTotalCardProps) {
  if (!data?.available) {
    return (
      <FeedCard title="VirusTotal" logo="VIRUSTOTAL" available={false} accentColor="#395BA9">
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>ไม่มีข้อมูล</Typography>
      </FeedCard>
    )
  }
  if (!data.found) {
    return (
      <FeedCard title="VirusTotal" logo="VIRUSTOTAL" available accentColor="#395BA9">
        <Alert severity="success" sx={{ fontSize: 11, py: 0.5 }}>ไม่พบในฐานข้อมูล VirusTotal</Alert>
      </FeedCard>
    )
  }
  const pct = data.total > 0 ? Math.round((data.malicious / data.total) * 100) : 0
  const scoreColor = pct >= 30 ? '#EF4444' : pct >= 10 ? BRAND.orange : '#22C55E'
  return (
    <FeedCard title="VirusTotal" logo="VIRUSTOTAL" available accentColor="#395BA9">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.25 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 22, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
            {data.malicious}<span style={{ fontSize: 13, color: 'rgba(237,233,250,0.4)' }}>/{data.total}</span>
          </Typography>
          <Typography sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 600 }}>Detections</Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <LinearProgress variant="determinate" value={pct} sx={{
            height: 6, borderRadius: 3, mb: 0.5,
            bgcolor: 'rgba(57,91,169,0.1)',
            '& .MuiLinearProgress-bar': { bgcolor: scoreColor, borderRadius: 3 },
          }} />
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {data.suspicious > 0 && <Chip label={`${data.suspicious} Suspicious`} size="small" sx={{ height: 16, fontSize: 9, bgcolor: 'rgba(241,116,34,0.15)', color: BRAND.orange }} />}
            {data.harmless > 0   && <Chip label={`${data.harmless} Clean`}     size="small" sx={{ height: 16, fontSize: 9, bgcolor: 'rgba(34,197,94,0.1)', color: '#22C55E' }} />}
          </Box>
        </Box>
      </Box>
      {data.country && (
        <Typography sx={{ fontSize: 11, mb: 0.5 }}><b>Country:</b> {data.country}</Typography>
      )}
      {data.as_owner && (
        <Typography sx={{ fontSize: 11, mb: 0.75 }}><b>AS Owner:</b> {data.as_owner}</Typography>
      )}
      {data.malicious_engines?.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: 9, color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
            DETECTED BY
          </Typography>
          {data.malicious_engines.slice(0, 4).map((e: any, i: number) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{e.engine}</Typography>
              <Typography sx={{ fontSize: 10, color: '#EF4444', fontFamily: '"IBM Plex Mono"', fontWeight: 600 }} noWrap>{e.result}</Typography>
            </Box>
          ))}
        </Box>
      )}
      {data.name && (
        <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.75 }}>
          <b>Name:</b> {data.name}
          {data.type_description && ` (${data.type_description})`}
        </Typography>
      )}
    </FeedCard>
  )
}

// ── Search Results Panel ──────────────────────────────────────────────────────
interface SearchResultsProps {
  result: any;
  onClose: () => void;
}

function SearchResults({ result, onClose }: SearchResultsProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [histTimeRange, setHistTimeRange] = useState('30d')

  const { data: histData, isFetching: histLoading, refetch: fetchHistory } = useQuery({
    queryKey: ['ioc-history', result?.value, histTimeRange],
    queryFn: () => iocApi.history(result.value, histTimeRange).then(r => r.data),
    enabled: historyOpen && !!result?.value,
    staleTime: 60000,
  })

  if (!result) return null
  const feeds   = result.feeds || {}
  const verdict = result.verdict || 'clean'
  const cfg     = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.clean

  return (
    <Box sx={{ mt: 2, animation: 'pageFadeIn 0.35s ease-out' }}>
      {/* ── Verdict banner ── */}
      <Card sx={{
        mb: 2, border: `1px solid ${cfg.color}35`,
        background: cfg.bg,
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: -30, right: -30,
          width: 140, height: 140, borderRadius: '50%',
          background: `radial-gradient(circle, ${cfg.color}18 0%, transparent 70%)`,
        }} />
        <CardContent sx={{ p: '16px 20px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <RiskGauge score={result.risk_score || 0} verdict={verdict} size={110} />
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 16, fontWeight: 700, color: 'text.primary', wordBreak: 'break-all' }}>
                  {result.value}
                </Typography>
                <CopyBtn text={result.value} />
                <Chip
                  size="small"
                  icon={(IOC_TYPE_ICON[result.ioc_type] || IOC_TYPE_ICON.unknown) as React.ReactElement}
                  label={TYPE_LABEL[result.ioc_type] || result.ioc_type}
                  sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(123,91,164,0.15)', color: BRAND.purpleLight }}
                />
              </Box>
              <Typography sx={{ fontSize: 13, color: cfg.color, fontWeight: 700, mb: 1 }}>
                {cfg.desc}
              </Typography>

              {/* Custom IOC alert */}
              {result.custom_match && result.custom_ioc && (
                <Alert severity="error" sx={{ fontSize: 12, py: 0.5, mb: 1 }}>
                  <b>Custom IOC Blocklist:</b> {result.custom_ioc.description}
                  {result.custom_ioc.severity && ` — Severity: ${result.custom_ioc.severity.toUpperCase()}`}
                </Alert>
              )}
              {result.is_private && (
                <Alert severity="info" sx={{ fontSize: 12, py: 0.5 }}>IP address ภายในเครือข่าย (Private) — ไม่ตรวจสอบในฐานข้อมูลภายนอก</Alert>
              )}

              {/* Feed availability pills */}
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {[
                  { key: 'abuseipdb', label: 'AbuseIPDB', color: '#EF4444' },
                  { key: 'otx',       label: 'OTX',       color: '#FF7A00' },
                  { key: 'shodan',    label: 'Shodan',     color: '#CC0000' },
                  { key: 'virustotal',label: 'VirusTotal', color: '#395BA9' },
                ].filter(f => feeds[f.key]).map(f => (
                  <Chip
                    key={f.key}
                    size="small"
                    label={f.label}
                    sx={{
                      height: 18, fontSize: 9, fontWeight: 700,
                      bgcolor: feeds[f.key]?.available ? `${f.color}18` : 'rgba(123,91,164,0.06)',
                      color: feeds[f.key]?.available ? f.color : 'text.disabled',
                      border: `1px solid ${feeds[f.key]?.available ? `${f.color}30` : 'transparent'}`,
                    }}
                  />
                ))}
              </Box>
            </Box>

            <IconButton size="small" onClick={onClose} sx={{ alignSelf: 'flex-start', ml: 'auto' }}>
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* ── Feed cards grid ── */}
      {!result.is_private && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {feeds.abuseipdb  !== undefined && (
            <Grid item xs={12} sm={6} lg={3}><AbuseIPDBCard  data={feeds.abuseipdb}  /></Grid>
          )}
          {feeds.otx        !== undefined && (
            <Grid item xs={12} sm={6} lg={3}><OTXCard        data={feeds.otx}        /></Grid>
          )}
          {feeds.shodan     !== undefined && (
            <Grid item xs={12} sm={6} lg={3}><ShodanCard     data={feeds.shodan}     /></Grid>
          )}
          {feeds.virustotal !== undefined && (
            <Grid item xs={12} sm={6} lg={3}><VirusTotalCard data={feeds.virustotal} /></Grid>
          )}
        </Grid>
      )}

      {/* ── Alert History toggle ── */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2, py: 1.25, cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(123,91,164,0.04)' },
          }}
          onClick={() => setHistoryOpen(o => !o)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryRoundedIcon sx={{ fontSize: 16, color: BRAND.purple }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>ประวัติ Alert ใน Wazuh</Typography>
            {histData?.count > 0 && (
              <Chip label={histData.count} size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {historyOpen && (
              <FormControl size="small" sx={{ minWidth: 90 }} onClick={e => e.stopPropagation()}>
                <Select
                  value={histTimeRange}
                  onChange={e => { setHistTimeRange(e.target.value); fetchHistory() }}
                  sx={{ fontSize: 12 }}
                >
                  {['7d', '30d', '90d'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <Chip label={historyOpen ? 'ซ่อน' : 'ดูประวัติ'} size="small"
              sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(123,91,164,0.1)', color: BRAND.purpleLight, cursor: 'pointer' }} />
          </Box>
        </Box>

        <Collapse in={historyOpen}>
          <Divider />
          <CardContent sx={{ p: '12px 16px !important' }}>
            {histLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>กำลังค้นหาใน OpenSearch...</Typography>
              </Box>
            ) : !histData ? (
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>คลิก "ดูประวัติ" เพื่อค้นหาใน alert logs</Typography>
            ) : histData.count === 0 ? (
              <Alert severity="success" sx={{ fontSize: 12 }}>ไม่พบ {result.value} ใน alert logs ในช่วง {histTimeRange}</Alert>
            ) : (
              <>
                {/* Mini timeline chart */}
                {histData.timeline?.length > 1 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 1 }}>Timeline การพบ</Typography>
                    <ResponsiveContainer width="100%" height={70}>
                      <AreaChart data={histData.timeline} margin={{ top: 2, right: 0, left: -40, bottom: 0 }}>
                        <defs>
                          <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={BRAND.purple} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={BRAND.purple} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <RechartTooltip contentStyle={ChartTip} formatter={v => [v, 'Alerts']} />
                        <Area type="monotone" dataKey="count" stroke={BRAND.purple} strokeWidth={1.5} fill="url(#histGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                )}
                {/* Alert table */}
                <Box sx={{ maxHeight: 260, overflow: 'auto' }} className="scrollbar-thin">
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {['เวลา', 'Level', 'รายละเอียด', 'Agent', 'Src IP', 'Dst IP'].map(h => (
                          <TableCell key={h} sx={{ fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', py: 0.75, letterSpacing: '0.07em' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {histData.matches.map((m: any, i: number) => {
                        const lv = m.level || 0
                        const lc = lv >= 15 ? '#EF4444' : lv >= 12 ? BRAND.orange : lv >= 7 ? BRAND.purple : '#22C55E'
                        return (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono"', whiteSpace: 'nowrap', py: 0.8 }}>
                              {m.timestamp ? format(new Date(m.timestamp), 'dd/MM HH:mm') : '-'}
                            </TableCell>
                            <TableCell sx={{ py: 0.8 }}>
                              <Chip label={lv} size="small" sx={{ height: 16, fontSize: 9, bgcolor: `${lc}20`, color: lc, fontWeight: 700, '& .MuiChip-label': { px: 0.7 } }} />
                            </TableCell>
                            <TableCell sx={{ fontSize: 11, maxWidth: 220, py: 0.8 }}>
                              <Typography sx={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                {m.description || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ fontSize: 10, py: 0.8 }}>{m.agent || '-'}</TableCell>
                            <TableCell sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono"', py: 0.8 }}>{m.srcip || '-'}</TableCell>
                            <TableCell sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono"', py: 0.8 }}>{m.dstip || '-'}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Box>
              </>
            )}
          </CardContent>
        </Collapse>
      </Card>
    </Box>
  )
}

// ── Custom IOC Manager ────────────────────────────────────────────────────────
function CustomIOCPanel() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [addOpen, setAddOpen] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterSev, setFilterSev] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ioc_type: 'ip', value: '', description: '', severity: 'high', expires_at: '' })

  const { data: iocs = [], isLoading } = useQuery<any[]>({
    queryKey: ['custom-iocs', filterType, filterSev],
    queryFn: () => iocApi.listCustom({ ioc_type: filterType || undefined, severity: filterSev || undefined }).then(r => r.data),
    staleTime: 30000,
  })

  const { data: stats = {} } = useQuery<any>({
    queryKey: ['ioc-stats'],
    queryFn: () => iocApi.stats().then(r => r.data),
    staleTime: 60000,
  })

  const { data: cdbStatus, refetch: refetchCdb } = useQuery<any>({
    queryKey: ['cdb-status'],
    queryFn: () => iocApi.cdbStatus().then(r => r.data),
    staleTime: 30000,
    refetchInterval: 60000,
  })

  const addMut = useMutation({
    mutationFn: (data: any) => iocApi.addCustom(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-iocs'] })
      qc.invalidateQueries({ queryKey: ['ioc-stats'] })
      setAddOpen(false)
      setForm({ ioc_type: 'ip', value: '', description: '', severity: 'high', expires_at: '' })
      enqueueSnackbar('เพิ่ม IOC สำเร็จ — กำลัง sync ไปยัง Wazuh CDB…', { variant: 'success' })
      setTimeout(() => refetchCdb(), 4000)
    },
    onError: () => enqueueSnackbar('เกิดข้อผิดพลาด', { variant: 'error' }),
  })

  const delMut = useMutation({
    mutationFn: (id: string | number) => iocApi.deleteCustom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-iocs'] })
      qc.invalidateQueries({ queryKey: ['ioc-stats'] })
      enqueueSnackbar('ลบ IOC แล้ว — กำลัง sync ไปยัง Wazuh CDB…', { variant: 'info' })
      setTimeout(() => refetchCdb(), 4000)
    },
  })

  const syncMut = useMutation({
    mutationFn: () => iocApi.cdbSync(),
    onSuccess: (r) => {
      const d = r.data
      refetchCdb()
      qc.invalidateQueries({ queryKey: ['cdb-status'] })
      if (d.ok) {
        enqueueSnackbar(
          `Sync สำเร็จ — IP: ${d.by_type?.ip ?? 0}, Domain: ${d.by_type?.domain ?? 0}, Hash: ${d.by_type?.hash ?? 0} IOCs → Wazuh CDB`,
          { variant: 'success' }
        )
      } else {
        enqueueSnackbar('Sync มีบางส่วนล้มเหลว ตรวจสอบ backend log', { variant: 'warning' })
      }
    },
    onError: () => enqueueSnackbar('Sync CDB ล้มเหลว', { variant: 'error' }),
  })

  const filtered = iocs.filter(i =>
    !search || i.value.toLowerCase().includes(search.toLowerCase()) || (i.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const sevColor = (s: string) => SEV_COLORS[s] || BRAND.purple

  const allListsReady = cdbStatus?.all_lists_created
  const wazuhReachable = cdbStatus?.wazuh_reachable

  return (
    <Box>
      {/* Wazuh CDB Sync Status Banner */}
      <Card sx={{
        mb: 2,
        border: `1px solid ${wazuhReachable === false ? 'rgba(239,68,68,0.25)' : allListsReady ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.25)'}`,
        background: wazuhReachable === false ? 'rgba(239,68,68,0.06)' : allListsReady ? 'rgba(34,197,94,0.05)' : 'rgba(234,179,8,0.07)',
      }}>
        <CardContent sx={{ p: '12px 16px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RouterRoundedIcon sx={{ fontSize: 18, color: wazuhReachable === false ? '#EF4444' : allListsReady ? '#22C55E' : '#EAB308' }} />
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: wazuhReachable === false ? '#EF4444' : allListsReady ? '#22C55E' : '#EAB308' }}>
                  Wazuh CDB Sync — {wazuhReachable === false ? 'ไม่สามารถเชื่อมต่อ Wazuh' : allListsReady ? 'พร้อมใช้งาน' : 'รอ Sync ครั้งแรก'}
                </Typography>
                <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                  {allListsReady
                    ? `CDB lists: soc-custom-ioc-ip, soc-custom-ioc-domain, soc-custom-ioc-hash | IOC ใน local: ${cdbStatus?.local_ioc_count ?? 0}`
                    : 'กด "Sync → Wazuh" เพื่อสร้าง CDB lists และ reload Wazuh rules'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {/* Per-list status chips */}
              {cdbStatus?.cdb_lists && Object.entries(cdbStatus.cdb_lists as Record<string, boolean>).map(([name, ok]) => (
                <Chip key={name}
                  label={name.replace('soc-custom-ioc-', '')}
                  size="small"
                  sx={{
                    height: 20, fontSize: 9, fontWeight: 700,
                    bgcolor: ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                    color: ok ? '#22C55E' : '#EF4444',
                    border: `1px solid ${ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}
                />
              ))}
              <Button
                size="small" variant="outlined"
                disabled={syncMut.isPending}
                startIcon={syncMut.isPending ? <CircularProgress size={12} /> : <ShieldRoundedIcon sx={{ fontSize: 14 }} />}
                onClick={() => syncMut.mutate()}
                sx={{
                  fontSize: 11, borderRadius: '8px', whiteSpace: 'nowrap',
                  borderColor: 'rgba(123,91,164,0.4)', color: BRAND.purple,
                  '&:hover': { borderColor: BRAND.purple, bgcolor: 'rgba(123,91,164,0.06)' },
                }}
              >
                {syncMut.isPending ? 'กำลัง Sync…' : 'Sync → Wazuh'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stats bar */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[
          { label: 'ทั้งหมด', value: stats.total || 0, color: BRAND.purple },
          ...((stats.by_severity || []).slice(0, 3).map((s: any) => ({
            label: s.name.toUpperCase(), value: s.count, color: SEV_COLORS[s.name] || BRAND.purple,
          }))),
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{ textAlign: 'center', py: 1.25, borderTop: `3px solid ${s.color}` }}>
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.07em', mt: 0.3 }}>{s.label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="ค้นหา IOC..."
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchRoundedIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} /> }}
          sx={{ minWidth: 200, flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={filterType} onChange={e => setFilterType(e.target.value)} displayEmpty>
            <MenuItem value="">ทุกประเภท</MenuItem>
            {['ip', 'domain', 'hash', 'url'].map(t => <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={filterSev} onChange={e => setFilterSev(e.target.value)} displayEmpty>
            <MenuItem value="">ทุก Severity</MenuItem>
            {['critical', 'high', 'medium', 'low'].map(s => <MenuItem key={s} value={s}>{s.toUpperCase()}</MenuItem>)}
          </Select>
        </FormControl>
        <Button
          size="small" variant="contained" startIcon={<AddRoundedIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ borderRadius: '10px', whiteSpace: 'nowrap' }}
        >
          เพิ่ม IOC
        </Button>
      </Box>

      {/* Table */}
      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={40} sx={{ mb: 0.5 }} />)
      ) : (
        <Box sx={{ overflow: 'auto' }} className="scrollbar-thin">
          <Table size="small">
            <TableHead>
              <TableRow>
                {['ค่า IOC', 'ประเภท', 'Severity', 'คำอธิบาย', 'เพิ่มโดย', 'วันที่', 'หมดอายุ', ''].map(h => (
                  <TableCell key={h} sx={{ fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.07em', py: 0.75 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: 'text.disabled', fontSize: 13 }}>
                    {iocs.length === 0 ? 'ยังไม่มี Custom IOC — คลิก "เพิ่ม IOC" เพื่อเริ่มต้น' : 'ไม่พบ IOC ที่ตรงกัน'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(ioc => {
                  const isExpired = ioc.expires_at && new Date(ioc.expires_at) < new Date()
                  return (
                    <TableRow key={ioc.id} hover sx={{ opacity: isExpired ? 0.5 : 1 }}>
                      <TableCell sx={{ py: 0.9 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontSize: 12, fontFamily: '"IBM Plex Mono"', wordBreak: 'break-all', maxWidth: 220 }}>
                            {ioc.value}
                          </Typography>
                          <CopyBtn text={ioc.value} />
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 0.9 }}>
                        <Chip label={ioc.ioc_type.toUpperCase()} size="small" variant="outlined"
                          sx={{ height: 18, fontSize: 9, borderColor: BRAND.purple, color: BRAND.purpleLight }} />
                      </TableCell>
                      <TableCell sx={{ py: 0.9 }}>
                        <Chip label={ioc.severity.toUpperCase()} size="small"
                          sx={{ height: 18, fontSize: 9, fontWeight: 800,
                            bgcolor: `${sevColor(ioc.severity)}18`, color: sevColor(ioc.severity) }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, py: 0.9, maxWidth: 200 }}>
                        <Typography sx={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                          {ioc.description || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, py: 0.9 }}>{ioc.added_by}</TableCell>
                      <TableCell sx={{ fontSize: 11, py: 0.9, whiteSpace: 'nowrap' }}>
                        {ioc.added_at ? format(new Date(ioc.added_at), 'dd/MM/yy') : '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, py: 0.9, whiteSpace: 'nowrap' }}>
                        {ioc.expires_at ? (
                          <Chip label={isExpired ? 'หมดอายุ' : format(new Date(ioc.expires_at), 'dd/MM/yy')}
                            size="small" color={isExpired ? 'error' : 'default'}
                            sx={{ height: 16, fontSize: 9 }} />
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ py: 0.9 }}>
                        <Tooltip title="ลบ">
                          <IconButton size="small" color="error"
                            onClick={() => delMut.mutate(ioc.id)}
                            disabled={delMut.isPending}
                            sx={{ p: 0.5 }}
                          >
                            <DeleteRoundedIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddRoundedIcon sx={{ color: BRAND.purple }} />เพิ่ม Custom IOC
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>ประเภท IOC</InputLabel>
                <Select value={form.ioc_type} label="ประเภท IOC" onChange={e => setForm(f => ({ ...f, ioc_type: e.target.value }))}>
                  {[['ip', 'IP Address'], ['domain', 'Domain'], ['hash', 'File Hash (MD5/SHA)'], ['url', 'URL']].map(([v, l]) => (
                    <MenuItem key={v} value={v}>{l}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>ความรุนแรง</InputLabel>
                <Select value={form.severity} label="ความรุนแรง" onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                  {[['critical', '🔴 Critical'], ['high', '🟠 High'], ['medium', '🟡 Medium'], ['low', '🟢 Low']].map(([v, l]) => (
                    <MenuItem key={v} value={v}>{l}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="ค่า IOC"
                placeholder="เช่น 192.168.1.1, example.com, abc123..."
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="คำอธิบาย (ทางเลือก)"
                placeholder="ระบุที่มาหรือเหตุผลที่ block"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="วันหมดอายุ (ทางเลือก)"
                type="datetime-local" value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} variant="outlined">ยกเลิก</Button>
          <Button
            variant="contained"
            disabled={!form.value.trim() || addMut.isPending}
            onClick={() => addMut.mutate({ ...form, expires_at: form.expires_at || null })}
            startIcon={addMut.isPending ? <CircularProgress size={14} color="inherit" /> : <AddRoundedIcon />}
          >
            บันทึก IOC
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ── Statistics Panel ──────────────────────────────────────────────────────────
function StatsPanel() {
  const { data: stats = {}, isLoading } = useQuery<any>({
    queryKey: ['ioc-stats'],
    queryFn: () => iocApi.stats().then(r => r.data),
    staleTime: 60000,
  })
  const sevColors: Record<string, string> = { critical: '#EF4444', high: BRAND.orange, medium: '#EAB308', low: '#22C55E' }

  if (isLoading) return <Box sx={{ p: 2 }}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={60} sx={{ mb: 1 }} />)}</Box>
  if (!stats.total) return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <ShieldRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
      <Typography color="text.disabled">ยังไม่มีข้อมูล Custom IOC</Typography>
    </Box>
  )

  return (
    <Grid container spacing={2}>
      {/* By Type Pie */}
      <Grid item xs={12} sm={6}>
        <Card>
          <CardContent sx={{ p: '14px 16px !important' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>IOC ตามประเภท</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.by_type || []} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={36} paddingAngle={3}>
                  {(stats.by_type || []).map((_: any, i: number) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                </Pie>
                <RechartTooltip contentStyle={ChartTip} formatter={(v: any, n?: any) => [v, n || '']} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11 }}>{v.toUpperCase()}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      {/* By Severity Bar */}
      <Grid item xs={12} sm={6}>
        <Card>
          <CardContent sx={{ p: '14px 16px !important' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>IOC ตามความรุนแรง</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.by_severity || []} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,91,164,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v.toUpperCase()} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <RechartTooltip contentStyle={ChartTip} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {(stats.by_severity || []).map((e: any, i: number) => (
                    <Cell key={i} fill={sevColors[e.name] || BRAND.purple} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      {/* By User */}
      {stats.by_user?.length > 0 && (
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent sx={{ p: '14px 16px !important' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.5 }}>ผู้เพิ่ม IOC</Typography>
              {stats.by_user.map((u: any, i: number) => (
                <Box key={i} sx={{ mb: 0.75 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography sx={{ fontSize: 12 }}>{u.name}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.purple }}>{u.count}</Typography>
                  </Box>
                  <LinearProgress variant="determinate"
                    value={Math.round((u.count / stats.total) * 100)}
                    sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(123,91,164,0.1)', '& .MuiLinearProgress-bar': { bgcolor: PIE_PALETTE[i % PIE_PALETTE.length], borderRadius: 2 } }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

// ── Main IOC Page ─────────────────────────────────────────────────────────────
const RECENT_SEARCHES_KEY = 'soc_ioc_recent'
const MAX_RECENT = 8

function getRecent(): string[] {
  try { return JSON.parse(safeStorage.getItem(RECENT_SEARCHES_KEY) || '[]') } catch { return [] }
}
function saveRecent(val: string) {
  const prev = getRecent().filter(v => v !== val)
  safeStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([val, ...prev].slice(0, MAX_RECENT)))
}

export default function IOCPage() {
  const [query, setQuery]           = useState('')
  const [activeTab, setActiveTab]   = useState(0) // 0=search, 1=custom, 2=stats
  const [searchResult, setResult]   = useState<any>(null)
  const [searching, setSearching]   = useState(false)
  const [searchError, setSearchErr] = useState('')
  const [recent, setRecent]         = useState<string[]>(getRecent)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = useCallback(async (val?: string) => {
    const q = (val || query).trim()
    if (!q) return
    setQuery(q)
    setSearching(true)
    setSearchErr('')
    setResult(null)
    try {
      const r = await iocApi.search(q)
      setResult(r.data)
      saveRecent(q)
      setRecent(getRecent())
    } catch {
      setSearchErr('เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่')
    } finally {
      setSearching(false)
    }
  }, [query])

  const clearResult = () => { setResult(null); setQuery(''); inputRef.current?.focus() }

  const TABS = [
    { label: 'ตรวจสอบ IOC',    icon: <ManageSearchRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'Custom Blocklist', icon: <TuneRoundedIcon        sx={{ fontSize: 16 }} /> },
    { label: 'สถิติ',           icon: <BarChartRoundedIcon     sx={{ fontSize: 16 }} /> },
  ]

  return (
    <PageShell
      variant="workbench"
      title="ตรวจจับภัยคุกคาม (IOC)"
      subtitle="Threat Intelligence — AbuseIPDB · AlienVault OTX · Shodan · VirusTotal"
    >
      {/* ── Tab bar ── */}
      <Box sx={{
        display: 'flex', gap: 0.5, mb: 2.5,
        bgcolor: 'rgba(123,91,164,0.06)', p: 0.5, borderRadius: '12px',
        border: '1px solid rgba(123,91,164,0.12)', width: 'fit-content',
      }}>
        {TABS.map((t, i) => (
          <Button
            key={i}
            size="small"
            startIcon={t.icon}
            onClick={() => setActiveTab(i)}
            sx={{
              borderRadius: '9px', px: 2, py: 0.75,
              fontSize: 12, fontWeight: 600,
              color: activeTab === i ? '#fff' : 'text.secondary',
              background: activeTab === i
                ? 'linear-gradient(135deg, #7B5BA4 0%, #5A3E85 100%)'
                : 'transparent',
              boxShadow: activeTab === i ? '0 4px 12px rgba(123,91,164,0.35)' : 'none',
              '&:hover': { background: activeTab === i ? undefined : 'rgba(123,91,164,0.1)', color: activeTab === i ? '#fff' : 'text.primary' },
            }}
          >
            {t.label}
          </Button>
        ))}
      </Box>

      {/* ── Tab 0: Search ── */}
      {activeTab === 0 && (
        <Box>
          {/* Hero search */}
          <Card sx={{
            mb: 2, overflow: 'hidden', position: 'relative',
            border: '1px solid rgba(123,91,164,0.2)',
            background: 'linear-gradient(135deg, rgba(123,91,164,0.08) 0%, rgba(241,116,34,0.04) 100%)',
          }}>
            <Box sx={{
              position: 'absolute', top: -60, right: -60,
              width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(123,91,164,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <CardContent sx={{ p: '20px 24px !important', position: 'relative', zIndex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
                ค้นหา Indicator of Compromise
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 2 }}>
                รองรับ: IP Address · Domain · MD5/SHA1/SHA256 Hash · URL
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  size="small"
                  placeholder="ตัวอย่าง: 1.2.3.4 · malware.com · d41d8cd9... "
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon sx={{ color: BRAND.purple, fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: query && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => { setQuery(''); setResult(null) }}>
                          <CloseRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { fontSize: 14, fontFamily: '"IBM Plex Mono", monospace' },
                  }}
                  sx={{ flex: 1, minWidth: 280 }}
                />
                <Button
                  variant="contained"
                  startIcon={searching ? <CircularProgress size={16} color="inherit" /> : <SearchRoundedIcon />}
                  onClick={() => handleSearch()}
                  disabled={searching || !query.trim()}
                  sx={{ py: 0.95, px: 2.5, borderRadius: '10px', whiteSpace: 'nowrap', minWidth: 140 }}
                >
                  {searching ? 'กำลังตรวจสอบ...' : 'ตรวจสอบ'}
                </Button>
              </Box>

              {/* Recent searches */}
              {recent.length > 0 && !searchResult && (
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600, flexShrink: 0 }}>ค้นหาล่าสุด:</Typography>
                  {recent.map((r, i) => (
                    <Chip
                      key={i}
                      label={r}
                      size="small"
                      onClick={() => handleSearch(r)}
                      sx={{
                        height: 20, fontSize: 10, fontFamily: '"IBM Plex Mono"', cursor: 'pointer',
                        bgcolor: 'rgba(123,91,164,0.08)', color: 'text.secondary',
                        '&:hover': { bgcolor: 'rgba(123,91,164,0.18)', color: BRAND.purpleLight },
                      }}
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Loading state */}
          {searching && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress sx={{ color: BRAND.purple, mb: 2 }} />
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>กำลังตรวจสอบกับ Threat Intelligence Feeds...</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                {['AbuseIPDB', 'OTX', 'Shodan', 'VirusTotal'].map(f => (
                  <Chip key={f} label={f} size="small" sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(123,91,164,0.1)', color: BRAND.purpleLight }} />
                ))}
              </Box>
            </Box>
          )}

          {/* Error */}
          {searchError && !searching && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSearchErr('')}>{searchError}</Alert>
          )}

          {/* Results */}
          {!searching && searchResult && (
            <SearchResults result={searchResult} onClose={clearResult} />
          )}

          {/* Empty state */}
          {!searching && !searchResult && !searchError && (
            <Card sx={{ textAlign: 'center', py: 8, border: '1px dashed', borderColor: 'rgba(123,91,164,0.2)', bgcolor: 'transparent' }}>
              <ShieldRoundedIcon sx={{ fontSize: 56, color: 'rgba(123,91,164,0.3)', mb: 1.5 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.secondary' }}>พร้อมตรวจสอบภัยคุกคาม</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>
                ใส่ IP, Domain, Hash หรือ URL แล้วกด Enter
              </Typography>
              {/* Quick example chips */}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                {['8.8.8.8', 'example.com', 'd41d8cd9...'].map(ex => (
                  <Chip key={ex} label={`ลอง: ${ex}`} size="small"
                    onClick={() => { setQuery(ex); inputRef.current?.focus() }}
                    sx={{ cursor: 'pointer', bgcolor: 'rgba(123,91,164,0.08)', color: 'text.secondary', fontSize: 11,
                      '&:hover': { bgcolor: 'rgba(123,91,164,0.16)' } }}
                  />
                ))}
              </Box>
            </Card>
          )}
        </Box>
      )}

      {/* ── Tab 1: Custom IOC ── */}
      {activeTab === 1 && (
        <Card>
          <CardContent sx={{ p: '16px !important' }}>
            <CustomIOCPanel />
          </CardContent>
        </Card>
      )}

      {/* ── Tab 2: Statistics ── */}
      {activeTab === 2 && <StatsPanel />}
    </PageShell>
  )
}
