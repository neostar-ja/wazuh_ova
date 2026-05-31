import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Chip, TextField, Select, MenuItem,
  FormControl, Button, Drawer, IconButton, CircularProgress,
  Tooltip, Alert, Table, TableBody, TableCell, TableHead, TableRow,
  LinearProgress, Collapse, InputAdornment, Badge, useTheme,
  Stack, Grid, Card, CardContent,
} from '@mui/material'
import SearchRoundedIcon       from '@mui/icons-material/SearchRounded'
import RefreshRoundedIcon      from '@mui/icons-material/RefreshRounded'
import CloseRoundedIcon        from '@mui/icons-material/CloseRounded'
import FilterListRoundedIcon   from '@mui/icons-material/FilterListRounded'
import DownloadRoundedIcon     from '@mui/icons-material/DownloadRounded'
import OpenInNewRoundedIcon    from '@mui/icons-material/OpenInNewRounded'
import ContentCopyRoundedIcon  from '@mui/icons-material/ContentCopyRounded'
import VisibilityRoundedIcon   from '@mui/icons-material/VisibilityRounded'
import SecurityRoundedIcon     from '@mui/icons-material/SecurityRounded'
import DataObjectRoundedIcon   from '@mui/icons-material/DataObjectRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import ShieldRoundedIcon       from '@mui/icons-material/ShieldRounded'
import GppBadRoundedIcon       from '@mui/icons-material/GppBadRounded'
import GppGoodRoundedIcon      from '@mui/icons-material/GppGoodRounded'
import RouterRoundedIcon       from '@mui/icons-material/RouterRounded'
import FiberManualRecordIcon   from '@mui/icons-material/FiberManualRecord'
import TuneRoundedIcon          from '@mui/icons-material/TuneRounded'
import BookmarkAddRoundedIcon   from '@mui/icons-material/BookmarkAddRounded'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { alertsApi, investigateApi } from '../../services/api'
import { format, formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { useSnackbar } from 'notistack'
import { AlertDetail, AlertStats, MitreAttackInfo, SeverityName, AlertSeverity, WazuhAlertItem, AlertFilters } from '../../types/alert'
import { BRAND as TOKENS, CHART_TIP_STYLE, sevColor, sevLabelShort } from '../ui/tokens'
import { PageShell } from '../ui/layout'

// ── Constants ─────────────────────────────────────────────────────────────────
const BRAND  = { purple: TOKENS.purple, purpleLight: TOKENS.purpleLight, purpleDark: TOKENS.purpleDark, orange: TOKENS.orange }
const ChartTip = CHART_TIP_STYLE

interface SeverityOption {
  key: SeverityName;
  label: string;
  color: string;
  min: number;
  max: number;
}

const SEV: SeverityOption[] = [
  { key: 'critical', label: 'Critical', color: '#EF4444',       min: 15, max: 99 },
  { key: 'high',     label: 'High',     color: TOKENS.orange,   min: 12, max: 14 },
  { key: 'medium',   label: 'Medium',   color: '#EAB308',       min: 7,  max: 11 },
  { key: 'low',      label: 'Low',      color: '#22C55E',       min: 1,  max: 6  },
]
const LC = sevColor
const LL = sevLabelShort

const SOURCES = ['fortigate', 'mikrotik', 'infoblox', 'huawei-ac', 'suricata', 'syscheck', 'ossec', 'syslog']
const TIME_OPTS = [
  { value: '1h',  label: '1 ชั่วโมง' },
  { value: '6h',  label: '6 ชั่วโมง' },
  { value: '24h', label: '24 ชั่วโมง' },
  { value: '7d',  label: '7 วัน' },
  { value: '30d', label: '30 วัน' },
]

function mapLevelToSeverity(level: number): AlertSeverity {
  if (level >= 15) return 'critical';
  if (level >= 12) return 'high';
  if (level >= 7) return 'medium';
  if (level >= 1) return 'low';
  return 'info';
}

export function normalizeWazuhAlert(raw: any): WazuhAlertItem {
  const rule = raw.rule || {};
  const data = raw.data || {};
  const agent = raw.agent || {};
  const geo = raw.GeoLocation || {};
  const pre = raw.predecoder || {};
  const decoder = raw.decoder || {};

  const level = Number(rule.level || 0);
  const id = raw.id || raw._id || `${raw['@timestamp'] || ''}-${rule.id || ''}-${agent.id || ''}`;

  return {
    id,
    timestamp: raw['@timestamp'] || raw.timestamp || new Date().toISOString(),
    ruleId: rule.id,
    ruleLevel: level,
    severity: mapLevelToSeverity(level),
    description: rule.description || raw.full_log || 'No description available',
    agentId: agent.id,
    agentName: agent.name,
    agentIp: agent.ip || data.srcip || undefined,
    managerName: raw.manager?.name,
    decoderName: decoder.name || pre.program_name,
    location: raw.location,
    sourceIp: data.srcip,
    sourcePort: data.srcport,
    destinationIp: data.dstip,
    destinationPort: data.dstport,
    protocol: data.protocol,
    mitreTactics: rule.mitre?.tactic || [],
    mitreTechniques: rule.mitre?.technique || [],
    groups: rule.groups || [],
    pciDss: rule.pci_dss || [],
    gdpr: rule.gdpr || [],
    hipaa: rule.hipaa || [],
    nist80053: rule.nist_800_53 || [],
    cis: rule.tsc || [],
    fullLog: raw.full_log,
    countryName: geo.country_name || geo.country_code || undefined,
    raw: raw,
  };
}

export function normalizeStats(rawStats: any): AlertStats {
  if (!rawStats) {
    return {
      total: 0,
      by_level: {},
      by_severity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      timeline: []
    };
  }

  const rawByLevel = rawStats.by_level || {};
  const by_severity: Record<SeverityName, number> = {
    critical: Number(rawByLevel.critical || 0),
    high:     Number(rawByLevel.high || 0),
    medium:   Number(rawByLevel.medium || 0),
    low:      Number(rawByLevel.low || 0),
    info:     Number(rawByLevel.info || 0),
  };

  const timeline = (rawStats.timeline || []).map((t: any) => ({
    timestamp: t.time || t.timestamp,
    count: t.total !== undefined ? t.total : (t.count || 0),
    severity_breakdown: {
      critical: t.critical || 0,
      high: t.high || 0,
      medium: t.medium || 0,
      low: t.low || 0,
    }
  }));

  return {
    total: rawStats.total || 0,
    by_level: rawByLevel,
    by_severity,
    timeline,
    by_agent: rawStats.by_agent || [],
    by_mitre: rawStats.by_mitre || [],
    by_srcip: rawStats.by_srcip || [],
    by_source: rawStats.by_source || [],
  };
}

// ── Helper components ─────────────────────────────────────────────────────────
interface LevelChipProps {
  level: string | number;
  animate?: boolean;
}

function LevelChip({ level, animate = false }: LevelChipProps) {
  const lv = Number(level || 0)
  return (
    <Chip label={`${lv} ${LL(lv)}`} size="small" sx={{
      height: 20, fontSize: 10, fontWeight: 800,
      bgcolor: `${LC(lv)}20`, color: LC(lv), border: `1px solid ${LC(lv)}35`,
      '& .MuiChip-label': { px: 0.75 },
      animation: animate && lv >= 15 ? 'pulse-critical 2.5s ease-in-out infinite' : 'none',
    }} />
  )
}

interface CopyBtnProps {
  text: string;
}

function CopyBtn({ text }: CopyBtnProps) {
  const { enqueueSnackbar } = useSnackbar()
  return (
    <Tooltip title="คัดลอก">
      <IconButton size="small"
        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); enqueueSnackbar('คัดลอกแล้ว', { variant: 'info', autoHideDuration: 1500 }) }}
        sx={{ opacity: 0.45, '&:hover': { opacity: 1 }, p: 0.35 }}>
        <ContentCopyRoundedIcon sx={{ fontSize: 12 }} />
      </IconButton>
    </Tooltip>
  )
}

// ── Country flag helper ───────────────────────────────────────────────────────
const CC: Record<string, string> = {
  'Thailand':'TH','China':'CN','United States':'US','Russia':'RU','Singapore':'SG',
  'Japan':'JP','India':'IN','Germany':'DE','France':'FR','United Kingdom':'GB',
  'Brazil':'BR','Australia':'AU','Vietnam':'VN','Indonesia':'ID','South Korea':'KR',
  'Hong Kong':'HK','Netherlands':'NL','Canada':'CA','Ukraine':'UA','Pakistan':'PK',
  'Taiwan':'TW','Malaysia':'MY','Italy':'IT','Spain':'ES','Turkey':'TR','Iran':'IR',
  'Philippines':'PH','Nigeria':'NG','Bangladesh':'BD','Myanmar':'MM','Cambodia':'KH',
  'Laos':'LA','Poland':'PL','Mexico':'MX','Argentina':'AR','Sweden':'SE','Norway':'NO',
  'Finland':'FI','Switzerland':'CH','Belgium':'BE','Austria':'AT','Czech Republic':'CZ',
  'Portugal':'PT','Romania':'RO','Hungary':'HU','Bulgaria':'BG','Greece':'GR',
  'Denmark':'DK','Serbia':'RS','Croatia':'HR','Slovenia':'SI','Slovakia':'SK',
  'United Arab Emirates':'AE','Saudi Arabia':'SA','Israel':'IL','Iraq':'IQ',
  'Egypt':'EG','South Africa':'ZA','Kenya':'KE','Ethiopia':'ET',
}
function getFlag(name?: string): string {
  if (!name) return ''
  const code = CC[name] || (name.length === 2 ? name.toUpperCase() : '')
  if (code.length !== 2) return ''
  return String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - 65, 0x1F1E6 + code.charCodeAt(1) - 65)
}

interface MitreTagsProps {
  groups?: string[];
  mitre?: MitreAttackInfo;
}

function MitreTags({ groups = [], mitre = {} }: MitreTagsProps) {
  const tags = [
    ...(mitre?.tactic || []),
    ...(mitre?.technique || []),
    ...(groups.filter(g => g.startsWith('attack.') || g.startsWith('mitre')).map(g => g.replace('attack.', ''))),
  ].filter(Boolean)
  const unique = [...new Set(tags)].slice(0, 6)
  if (!unique.length) return null
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25 }}>
      {unique.map((t, i) => (
        <Chip key={t} label={t} size="small" 
          sx={{ 
            height: 22, fontSize: 10, fontWeight: 600,
            bgcolor: t.includes('tactic') || mitre?.tactic?.includes(t) ? 'rgba(239,68,68,0.15)' : 'rgba(123,91,164,0.12)', 
            color: t.includes('tactic') || mitre?.tactic?.includes(t) ? '#EF4444' : BRAND.purpleLight,
            border: `1px solid ${t.includes('tactic') || mitre?.tactic?.includes(t) ? '#EF444430' : 'rgba(123,91,164,0.25)'}`,
            fontFamily: '"IBM Plex Mono"',
            transition: 'all 0.2s ease',
            animation: `slideIn 0.3s cubic-bezier(0.4,0,0.2,1) ${i * 0.05}s both`,
            '&:hover': { 
              transform: 'translateY(-2px)',
              boxShadow: t.includes('tactic') || mitre?.tactic?.includes(t) 
                ? '0 4px 12px rgba(239,68,68,0.3)' 
                : '0 4px 12px rgba(123,91,164,0.25)',
            },
            '& .MuiChip-label': { px: 1, fontWeight: 700 } 
          }} 
        />
      ))}
    </Box>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
interface DrawerSectionProps {
  label: string;
  children: React.ReactNode;
  accent?: string;
}

function DrawerSection({ label, children, accent }: DrawerSectionProps) {
  const accentColor = accent || BRAND.purple
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ 
          width: 4, height: 18, borderRadius: 1.5, 
          bgcolor: accentColor,
          boxShadow: `0 2px 8px ${accentColor}50`,
        }} />
        <Typography sx={{ 
          fontSize: 11.5, fontWeight: 900, textTransform: 'uppercase', 
          letterSpacing: '0.12em', color: accentColor,
        }}>
          {label}
        </Typography>
      </Box>
      {children}
    </Box>
  )
}

// ── IP Card (Source / Dest) ───────────────────────────────────────────────────
interface IPCardProps {
  label: string;
  ip?: string;
  port?: string | number;
  country?: string;
  onClick?: (() => void) | null;
  accent?: string;
}

function IPCard({ label, ip, port, country, onClick, accent }: IPCardProps) {
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const c = accent || BRAND.purple
  
  if (!ip) return (
    <Box sx={{ 
      flex: 1, minWidth: 0, p: 2.5, borderRadius: '16px', 
      border: '2px dashed rgba(123,91,164,0.2)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      minHeight: 110,
      bgcolor: isDark ? 'rgba(123,91,164,0.02)' : 'rgba(123,91,164,0.01)',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: 'rgba(123,91,164,0.35)',
        bgcolor: isDark ? 'rgba(123,91,164,0.04)' : 'rgba(123,91,164,0.02)',
      }
    }}>
      <Typography sx={{ fontSize: 13, color: 'text.disabled', fontWeight: 600 }}>—</Typography>
    </Box>
  )

  const isSrc = label.toLowerCase().includes('src') || label.toLowerCase().includes('source')

  return (
    <Box sx={{
      flex: 1, minWidth: 0, p: 2.5, borderRadius: '16px', minHeight: 110,
      border: `1.5px solid ${c}30`,
      background: isDark 
        ? `linear-gradient(135deg, ${c}15 0%, rgba(22,18,42,0.65) 100%)` 
        : `linear-gradient(135deg, ${c}06 0%, rgba(255,255,255,0.75) 100%)`,
      backdropFilter: 'blur(10px)',
      position: 'relative', overflow: 'hidden',
      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.15)' : `0 4px 20px ${c}08`,
      transition: 'all 0.28s cubic-bezier(0.4,0,0.2,1)',
      '&:hover': { 
        background: isDark 
          ? `linear-gradient(135deg, ${c}22 0%, rgba(22,18,42,0.8) 100%)` 
          : `linear-gradient(135deg, ${c}12 0%, rgba(255,255,255,0.9) 100%)`,
        borderColor: `${c}60`,
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 28px ${c}25`,
        '& .icon-watermark': {
          transform: 'scale(1.2) rotate(-5deg)',
          opacity: 0.15,
        }
      },
    }}>
      {/* Icon watermark in corner */}
      <Box 
        className="icon-watermark"
        sx={{ 
          position: 'absolute', top: 12, right: 12, 
          color: c, opacity: 0.08, 
          transition: 'all 0.3s ease',
          pointerEvents: 'none' 
        }}
      >
        {isSrc ? (
          <ShieldRoundedIcon sx={{ fontSize: 44 }} />
        ) : (
          <RouterRoundedIcon sx={{ fontSize: 44 }} />
        )}
      </Box>

      <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: c, mb: 1, position: 'relative', zIndex: 1 }}>
        {label}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, position: 'relative', zIndex: 1 }}>
        <Typography sx={{ fontSize: 15, fontFamily: '"IBM Plex Mono",monospace', fontWeight: 800, color: 'text.primary', wordBreak: 'break-all', lineHeight: 1.3 }}>
          {ip}
        </Typography>
        <Tooltip title="คัดลอก">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(ip); enqueueSnackbar('คัดลอกแล้ว', { variant: 'info', autoHideDuration: 1500 }) }}
            sx={{ opacity: 0.45, '&:hover': { opacity: 1 }, p: 0.4, transition: 'all 0.2s' }}>
            <ContentCopyRoundedIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, position: 'relative', zIndex: 1 }}>
        {port && <Chip label={`:${port}`} size="small" sx={{ height: 18, fontSize: 10, fontFamily: '"IBM Plex Mono"', bgcolor: `${c}18`, color: c, fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }} />}
        {country && <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>🌐 {country}</Typography>}
      </Box>

      {onClick && (
        <Button size="small" onClick={onClick}
          sx={{ 
            mt: 1.5, py: 0.4, px: 1.25, fontSize: 10.5, fontWeight: 800, 
            color: '#fff', borderRadius: '8px',
            bgcolor: c, 
            textTransform: 'none', minWidth: 0,
            boxShadow: `0 4px 12px ${c}35`,
            transition: 'all 0.2s ease',
            position: 'relative', zIndex: 1,
            '&:hover': { 
              bgcolor: c,
              filter: 'brightness(1.1)',
              transform: 'scale(1.03)',
              boxShadow: `0 6px 16px ${c}50`,
            },
          }}>
          สืบสวน →
        </Button>
      )}
    </Box>
  )
}

// ── Threat feed mini-card ─────────────────────────────────────────────────────
interface FeedMiniCardProps {
  name: string;
  color: string;
  main?: string | number;
  mainLabel?: string;
  rows?: [string, any][];
  extra?: React.ReactNode;
}

function FeedMiniCard({ name, color, main, mainLabel, rows = [], extra }: FeedMiniCardProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  return (
    <Box sx={{
      p: 2.5, borderRadius: '16px', height: '100%', minWidth: 0,
      border: `1.5px solid ${color}25`,
      background: isDark 
        ? `linear-gradient(135deg, ${color}12 0%, rgba(22,18,42,0.6) 100%)` 
        : `linear-gradient(135deg, ${color}06 0%, rgba(255,255,255,0.75) 100%)`,
      backdropFilter: 'blur(10px)',
      position: 'relative', overflow: 'hidden',
      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.15)' : `0 4px 20px ${color}08`,
      transition: 'all 0.28s cubic-bezier(0.4,0,0.2,1)',
      '&:hover': { 
        borderColor: `${color}60`, 
        background: isDark 
          ? `linear-gradient(135deg, ${color}18 0%, rgba(22,18,42,0.8) 100%)` 
          : `linear-gradient(135deg, ${color}10 0%, rgba(255,255,255,0.9) 100%)`,
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 28px ${color}25`,
        '& .card-bg-circle': {
          transform: 'scale(1.3)',
          opacity: 0.2,
        }
      },
    }}>
      <Box className="card-bg-circle" sx={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', bgcolor: `${color}15`, transition: 'all 0.3s ease', pointerEvents: 'none' }} />
      <Typography sx={{ fontSize: 10.5, fontWeight: 900, color, letterSpacing: '0.12em', mb: 1.25, position: 'relative', zIndex: 1, textTransform: 'uppercase' }}>{name}</Typography>
      {main !== undefined && (
        <>
          <Typography sx={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1, mb: 0.5, position: 'relative', zIndex: 1 }}>{main}</Typography>
          <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 1.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{mainLabel}</Typography>
        </>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, position: 'relative', zIndex: 1 }}>
        {rows.filter(([,v]) => v !== undefined && v !== null && v !== '' && v !== 0).slice(0, 4).map(([k, v]) => (
          <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0.5, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 600 }}>{k}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.primary', fontWeight: 700, maxWidth: 140, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"IBM Plex Mono"' }}>{String(v)}</Typography>
          </Box>
        ))}
      </Box>
      {extra && <Box sx={{ position: 'relative', zIndex: 1, mt: 1.5 }}>{extra}</Box>}
    </Box>
  )
}

// ── Alert Detail Drawer ───────────────────────────────────────────────────────
interface AlertDrawerProps {
  alert: WazuhAlertItem | null;
  open: boolean;
  onClose: () => void;
}

function AlertDrawer({ alert, open, onClose }: AlertDrawerProps) {
  const navigate   = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [tab, setTab]       = useState(0)
  const [enrichData, setEnrich]       = useState<any>(null)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Extract raw wazuh fields for detailed drawer content
  const rawWazuh = (alert?.raw as any) || {}
  const rule     = rawWazuh.rule || {}
  const data     = rawWazuh.data || {}
  const agent    = rawWazuh.agent || {}
  const geo      = rawWazuh.GeoLocation || {}
  const pre      = rawWazuh.predecoder || {}

  const lv       = alert?.ruleLevel || 0
  const color    = LC(lv)
  const srcip    = alert?.sourceIp
  const dstip    = alert?.destinationIp
  const country  = alert?.countryName
  const program  = alert?.decoderName
  const groups: string[] = alert?.groups || []

  const compliance = [
    { key: 'PCI-DSS', items: rule.pci_dss    || [] },
    { key: 'HIPAA',   items: rule.hipaa       || [] },
    { key: 'NIST',    items: rule.nist_800_53 || [] },
    { key: 'GDPR',    items: rule.gdpr        || [] },
  ].filter(c => c.items.length > 0)

  const hasMitre = rule.mitre?.tactic?.length || rule.mitre?.technique?.length

  const fetchEnrich = useCallback(async () => {
    if (!srcip || enrichLoading || enrichData) return
    setEnrichLoading(true)
    try {
      const r = await investigateApi.enrich(srcip)
      setEnrich(r.data)
    } catch {
      // ignore
    }
    setEnrichLoading(false)
  }, [srcip, enrichLoading, enrichData])

  useEffect(() => { if (open && srcip && tab === 1) fetchEnrich() }, [open, srcip, tab, fetchEnrich])
  useEffect(() => { if (!open) { setTab(0); setEnrich(null) } }, [open])

  const TABS = [
    { label: 'รายละเอียด', icon: <VisibilityRoundedIcon sx={{ fontSize: 13 }} />, hint: 'Network · Rules · MITRE' },
    { label: 'Threat Intel', icon: <SecurityRoundedIcon sx={{ fontSize: 13 }} />, hint: 'AbuseIPDB · OTX · Shodan · VT' },
    { label: 'Raw Log',     icon: <DataObjectRoundedIcon sx={{ fontSize: 13 }} />, hint: 'JSON' },
  ]

  // Fixed sidebar width across all tabs
  const DRAWER_WIDTH = 'min(800px, 95vw)'

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          minWidth: DRAWER_WIDTH,
          maxWidth: DRAWER_WIDTH,
          boxSizing: 'border-box',
          overflowX: 'hidden',
        },
      }}
      slotProps={{
        paper: {
          sx: {
            width: DRAWER_WIDTH,
            minWidth: DRAWER_WIDTH,
            maxWidth: DRAWER_WIDTH,
            display: 'flex', flexDirection: 'column',
            bgcolor: isDark ? 'rgba(22, 18, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(20px)',
            borderLeft: `4px solid ${color}`,
            boxShadow: isDark 
              ? `0 24px 64px rgba(0,0,0,0.65), inset 1px 0 0 0 rgba(255,255,255,0.06), 0 0 30px ${color}18`
              : `0 24px 64px rgba(123,91,164,0.18), inset 1px 0 0 0 rgba(255,255,255,0.4), 0 0 30px ${color}12`,
            overflowX: 'hidden',
          }
        }
      }}
    >
      {alert && (
        <>
          {/* ══ HEADER ══════════════════════════════════════════════════════ */}
          <Box sx={{
            flexShrink: 0,
            background: lv >= 15
              ? `linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 60%, transparent 100%)`
              : lv >= 12
              ? `linear-gradient(135deg, rgba(241,116,34,0.12) 0%, rgba(241,116,34,0.04) 60%, transparent 100%)`
              : lv >= 7
              ? `linear-gradient(135deg, rgba(234,179,8,0.1) 0%, transparent 60%)`
              : `linear-gradient(135deg, rgba(34,197,94,0.08) 0%, transparent 60%)`,
            borderBottom: `1px solid ${color}22`,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Decorative gradient orb */}
            <Box sx={{
              position: 'absolute', top: -50, right: -50,
              width: 200, height: 200, borderRadius: '50%',
              background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
              pointerEvents: 'none',
              animation: 'float 8s ease-in-out infinite',
            }} />

            <Box sx={{ p: { xs: 2.5, sm: 3 }, position: 'relative', zIndex: 1 }}>
              {/* Top row: level + rule# + source + close */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {/* Level badge — large */}
                  <Box sx={{
                    px: 1.75, py: 0.6, borderRadius: '12px',
                    bgcolor: `${color}20`, border: `2.5px solid ${color}45`,
                    display: 'flex', alignItems: 'center', gap: 1,
                    animation: lv >= 15 ? 'pulse-critical 2.5s ease-in-out infinite' : 'none',
                    boxShadow: `0 4px 14px ${color}25`,
                    whiteSpace: 'nowrap',
                  }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 8px ${color}` }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 900, color, letterSpacing: '0.06em' }}>
                      LEVEL {lv} · {LL(lv)}
                    </Typography>
                  </Box>
                  {rule.id && (
                    <Chip label={`Rule #${rule.id}`} size="small" variant="outlined"
                      sx={{ height: 26, fontSize: 11, borderColor: `${color}40`, color: color, fontWeight: 700 }} />
                  )}
                  {program && (
                    <Chip label={program} size="small"
                      sx={{ height: 26, fontSize: 11, bgcolor: 'rgba(123,91,164,0.14)', color: BRAND.purpleLight, fontWeight: 600 }} />
                  )}
                </Box>
                <IconButton size="small" onClick={onClose}
                  sx={{ 
                    borderRadius: '12px', 
                    bgcolor: 'rgba(123,91,164,0.1)',
                    p: 0.8,
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      bgcolor: 'rgba(123,91,164,0.2)',
                      transform: 'rotate(90deg)',
                    } 
                  }}>
                  <CloseRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>

              {/* Rule description */}
              <Typography sx={{ 
                fontSize: { xs: 14, sm: 16 }, 
                fontWeight: 700, 
                lineHeight: 1.5, 
                mb: 1.5, 
                color: 'text.primary',
                letterSpacing: '-0.3px',
              }}>
                {rule.description || '—'}
              </Typography>

              {/* Timestamp + Agent */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <FiberManualRecordIcon sx={{ fontSize: 6, color: color, opacity: 0.6 }} />
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontFamily: '"IBM Plex Mono",monospace', fontWeight: 500 }}>
                    {alert?.timestamp ? format(new Date(alert.timestamp), 'dd MMM yyyy · HH:mm:ss') : '—'}
                  </Typography>
                </Box>
                {agent.name && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                     <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
                     <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 500 }}>{agent.name}</Typography>
                  </Box>
                )}
              </Box>

              {/* MITRE inline tags */}
              <MitreTags groups={groups} mitre={rule.mitre} />
            </Box>

            {/* Tab bar — segmented pill control */}
            <Box sx={{ px: { xs: 2.5, sm: 3 }, pb: 2, pt: 0.5, borderTop: `1px solid ${color}15` }}>
              <Box sx={{
                display: 'flex', p: 0.5, gap: 0.5,
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                borderRadius: '14px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
              }}>
                {TABS.map((t, i) => (
                  <Tooltip key={i} title={t.hint} placement="bottom" arrow>
                    <Button size="small"
                      startIcon={t.icon}
                      onClick={() => setTab(i)}
                      sx={{
                        flex: 1,
                        borderRadius: '11px',
                        py: 1, px: { xs: 0.5, sm: 1.5 },
                        fontSize: { xs: 11, sm: 12.5 },
                        fontWeight: tab === i ? 800 : 600,
                        color: tab === i ? '#fff' : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'),
                        bgcolor: tab === i ? color : 'transparent',
                        boxShadow: tab === i ? `0 4px 14px ${color}45, 0 1px 3px rgba(0,0,0,0.15)` : 'none',
                        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                        '&:hover': {
                          bgcolor: tab === i ? color : `${color}15`,
                          color: tab === i ? '#fff' : color,
                        },
                        '& .MuiButton-startIcon': { mr: { xs: 0.4, sm: 0.8 } },
                        minWidth: 0, textTransform: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.label}
                    </Button>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          </Box>

          {/* ══ CONTENT ══════════════════════════════════════════════════════ */}
          <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: { xs: 2.5, sm: 3 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }} className="scrollbar-thin">

            {/* ─── TAB 0: Details ─────────────────────────────────────────── */}
            {tab === 0 && (
              <Box sx={{ animation: 'tabContentIn 0.22s cubic-bezier(0.4,0,0.2,1) both', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
                {/* Network section: Src → Dst */}
                <DrawerSection label="ต้นทาง → ปลายทาง" accent={color}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch', flexDirection: { xs: 'column', sm: 'row' } }}>
                    <IPCard
                      label="Source IP"
                      ip={srcip}
                      port={data.srcport}
                      country={country}
                      accent="#EF4444"
                      onClick={srcip ? () => { onClose(); navigate(`/investigate?q=${srcip}`) } : null}
                    />

                    {/* Arrow */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: color, opacity: 0.6, transform: { xs: 'rotate(90deg)', sm: 'none' } }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
                        <path d="M8 5l8 7-8 7V5z"/>
                      </svg>
                    </Box>

                    <IPCard
                      label="Dest IP"
                      ip={dstip}
                      port={data.dstport}
                      accent={BRAND.purple}
                    />
                  </Box>

                  {/* Extra network fields */}
                  {(data.srcuser || data.dstuser || agent.name) && (
                    <Box sx={{ display: 'flex', gap: 1.25, mt: 1.5, flexWrap: 'wrap' }}>
                      {[
                        ['Src User', data.srcuser], ['Dst User', data.dstuser], ['Agent', agent.name],
                      ].filter(([,v]) => v).map(([k, v]) => (
                        <Box key={k} sx={{ 
                          flex: { xs: '1 1 100%', sm: '1 1 auto' },
                          px: 1.5, py: 1, borderRadius: '12px', 
                          bgcolor: isDark ? 'rgba(123,91,164,0.08)' : 'rgba(123,91,164,0.06)',
                          border: '1px solid rgba(123,91,164,0.15)',
                          transition: 'all 0.2s ease',
                          '&:hover': { 
                            bgcolor: isDark ? 'rgba(123,91,164,0.14)' : 'rgba(123,91,164,0.1)',
                            borderColor: 'rgba(123,91,164,0.3)',
                          }
                        }}>
                          <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>{k}</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{v}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </DrawerSection>

                {/* Rule Groups */}
                {groups.length > 0 && (
                  <DrawerSection label="Rule Groups" accent={BRAND.purple}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {groups.map(g => (
                        <Chip key={g} label={g} size="small" variant="outlined"
                          sx={{ 
                            height: 26, fontSize: 11, fontWeight: 600,
                            borderColor: 'rgba(123,91,164,0.3)', 
                            color: 'text.secondary',
                            bgcolor: isDark ? 'rgba(123,91,164,0.05)' : 'rgba(123,91,164,0.03)',
                            transition: 'all 0.2s ease',
                            '&:hover': { 
                              bgcolor: 'rgba(123,91,164,0.12)', 
                              borderColor: BRAND.purple, 
                              color: BRAND.purpleLight,
                              transform: 'translateY(-2px)',
                            } 
                          }}
                        />
                      ))}
                    </Box>
                  </DrawerSection>
                )}

                {/* MITRE ATT&CK */}
                {hasMitre && (
                  <DrawerSection label="MITRE ATT&CK" accent="#EF4444">
                    <Box sx={{ 
                      p: 2, borderRadius: '14px', 
                      bgcolor: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
                      border: '1.5px solid rgba(239,68,68,0.2)',
                      transition: 'all 0.2s ease',
                    }}>
                      {rule.mitre?.tactic?.length > 0 && (
                        <Box sx={{ mb: 1.5 }}>
                          <Typography sx={{ fontSize: 10, color: '#EF4444', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.75 }}>Tactics</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {rule.mitre.tactic.map((t: string) => (
                              <Box key={t} sx={{ 
                                px: 1.25, py: 0.6, borderRadius: '8px', 
                                bgcolor: 'rgba(239,68,68,0.18)', 
                                border: '1px solid rgba(239,68,68,0.35)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: 'rgba(239,68,68,0.25)',
                                  transform: 'scale(1.05)',
                                }
                              }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>{t}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                      {rule.mitre?.technique?.length > 0 && (
                        <Box>
                          <Typography sx={{ fontSize: 10, color: 'rgba(239,68,68,0.75)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.75 }}>Techniques</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {rule.mitre.technique.map((t: string) => (
                              <Chip key={t} label={t} size="small" variant="outlined"
                                sx={{ 
                                  height: 26, fontSize: 11, fontWeight: 600,
                                  borderColor: 'rgba(239,68,68,0.4)', 
                                  color: '#EF4444',
                                  bgcolor: 'rgba(239,68,68,0.08)',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    bgcolor: 'rgba(239,68,68,0.15)',
                                    borderColor: '#EF4444',
                                    transform: 'translateY(-2px)',
                                  }
                                }} 
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </DrawerSection>
                )}

                {/* Compliance */}
                {compliance.length > 0 && (
                  <DrawerSection label="Compliance Standards" accent={BRAND.purpleLight}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                      {compliance.map(c => (
                        <Box key={c.key} sx={{ 
                          p: 1.75, borderRadius: '12px', 
                          bgcolor: isDark ? 'rgba(123,91,164,0.07)' : 'rgba(123,91,164,0.05)',
                          border: '1px solid rgba(123,91,164,0.18)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
                            borderColor: 'rgba(123,91,164,0.3)',
                          }
                        }}>
                          <Typography sx={{ fontSize: 10, fontWeight: 900, color: BRAND.purpleLight, letterSpacing: '0.08em', mb: 0.75, textTransform: 'uppercase' }}>{c.key}</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                            {c.items.slice(0, 10).map((i: string) => (
                              <Chip key={i} label={i} size="small"
                                sx={{ 
                                  height: 22, fontSize: 10, fontWeight: 600,
                                  bgcolor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)',
                                  color: BRAND.purpleLight, 
                                  '& .MuiChip-label': { px: 0.75 },
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    bgcolor: isDark ? 'rgba(123,91,164,0.25)' : 'rgba(123,91,164,0.18)',
                                    transform: 'scale(1.05)',
                                  }
                                }} 
                              />
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </DrawerSection>
                )}

                {/* GeoIP */}
                {Object.keys(geo).filter(k => geo[k]).length > 0 && (
                  <DrawerSection label="GeoIP Location" accent="#38BDF8">
                    <Box sx={{ 
                      p: 2, borderRadius: '14px', 
                      bgcolor: isDark ? 'rgba(56,189,248,0.06)' : 'rgba(56,189,248,0.04)',
                      border: '1.5px solid rgba(56,189,248,0.2)',
                    }}>
                      <Grid container spacing={1.5}>
                        {[
                          ['🌍 Country',  geo.country_name],
                          ['🏙 City',     geo.city_name],
                          ['🗺 Region',   geo.region_name],
                          ['📍 Coords',   geo.location?.lat ? `${geo.location.lat?.toFixed(2)}, ${geo.location.lon?.toFixed(2)}` : null],
                        ].filter(([,v]) => v).map(([k, v]) => (
                          <Grid item xs={6} key={k} sm={6}>
                            <Box>
                              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.4 }}>{k}</Typography>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary' }}>{v}</Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </DrawerSection>
                )}

                {/* Full log */}
                {alert.fullLog && (
                  <DrawerSection label="Full Log" accent="text.disabled">
                    <Box sx={{ position: 'relative', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <Tooltip title="คัดลอก">
                        <IconButton size="small"
                          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, bgcolor: 'rgba(123,91,164,0.12)', transition: 'all 0.2s',
                            '&:hover': { bgcolor: 'rgba(123,91,164,0.2)', transform: 'scale(1.1)' } }}
                          onClick={() => { navigator.clipboard.writeText(alert.fullLog || ''); enqueueSnackbar('คัดลอกแล้ว', { variant: 'info' }) }}>
                          <ContentCopyRoundedIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                      <Box sx={{
                        p: 2, pr: 4.5, borderRadius: '12px', maxHeight: 200, overflowY: 'auto', overflowX: 'hidden',
                        bgcolor: isDark ? 'rgba(12,10,20,0.8)' : 'rgba(123,91,164,0.05)',
                        border: '1px solid rgba(123,91,164,0.15)',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: 'rgba(123,91,164,0.25)' },
                        width: '100%', maxWidth: '100%', boxSizing: 'border-box',
                      }} className="scrollbar-thin">
                        <Typography component="pre" sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono",monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'text.secondary', lineHeight: 1.7, width: '100%', maxWidth: '100%' }}>
                          {alert.fullLog}
                        </Typography>
                      </Box>
                    </Box>
                  </DrawerSection>
                )}
              </Box>
            )}

            {/* ─── TAB 1: Threat Intel ────────────────────────────────────── */}
            {tab === 1 && (
              <Box sx={{ animation: 'tabContentIn 0.22s cubic-bezier(0.4,0,0.2,1) both', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
                {!srcip ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <SecurityRoundedIcon sx={{ fontSize: 44, color: 'rgba(123,91,164,0.25)', mb: 1.5 }} />
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600 }}>ไม่มี Source IP</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>Alert นี้ไม่มีข้อมูล Source IP สำหรับตรวจสอบ</Typography>
                  </Box>
                ) : enrichLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
                    <Box sx={{ position: 'relative' }}>
                      <CircularProgress size={48} thickness={3} sx={{ color: BRAND.purple }} />
                      <SecurityRoundedIcon sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 20, color: BRAND.purpleLight }} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>กำลังตรวจสอบ Threat Intelligence</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>{srcip}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {['AbuseIPDB', 'OTX', 'Shodan', 'VirusTotal'].map((f, i) => (
                        <Chip key={f} label={f} size="small"
                          sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(123,91,164,0.1)', color: BRAND.purpleLight,
                            animation: `pageFadeIn 0.3s ease ${i * 0.1}s both` }} />
                      ))}
                    </Box>
                  </Box>
                ) : !enrichData ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: 'rgba(123,91,164,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                      <SecurityRoundedIcon sx={{ fontSize: 28, color: BRAND.purple }} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>ตรวจสอบ {srcip}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>AbuseIPDB · OTX · Shodan · VirusTotal</Typography>
                    <Button variant="contained" onClick={fetchEnrich} startIcon={<SecurityRoundedIcon sx={{ fontSize: 15 }} />}
                      sx={{ borderRadius: '10px', fontSize: 12 }}>
                      เริ่มตรวจสอบ
                    </Button>
                  </Box>
                ) : enrichData.is_private ? (
                  <Alert severity="info" sx={{ fontSize: 12 }}>
                    <b>{srcip}</b> เป็น Private IP — ไม่ตรวจสอบใน external threat feeds
                  </Alert>
                ) : (
                  <Box>
                    {/* Verdict banner */}
                    {(() => {
                      const feeds  = enrichData.feeds || {}
                      const abuse  = feeds.abuseipdb?.abuseConfidenceScore || 0
                      const vt     = feeds.virustotal
                      const vtBad  = vt?.found ? (vt.malicious || 0) : 0
                      const otx    = feeds.otx?.pulse_count || 0
                      const riskPct = Math.max(abuse, vtBad >= 5 ? 80 : vtBad * 10, otx >= 3 ? 60 : otx * 15)
                      const verdict: 'malicious' | 'suspicious' | 'clean' = (abuse >= 75 || vtBad >= 5) ? 'malicious' : (abuse >= 30 || otx >= 3) ? 'suspicious' : 'clean'
                      const vc = { malicious: '#EF4444', suspicious: BRAND.orange, clean: '#22C55E' }
                      const vIcon = verdict === 'clean'
                        ? <GppGoodRoundedIcon sx={{ fontSize: 32, color: '#22C55E' }} />
                        : <GppBadRoundedIcon sx={{ fontSize: 32, color: vc[verdict] }} />
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, p: 2, borderRadius: '14px',
                          background: `linear-gradient(135deg, ${vc[verdict]}12 0%, ${vc[verdict]}04 100%)`,
                          border: `1.5px solid ${vc[verdict]}30` }}>
                          {vIcon}
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Chip label={verdict.toUpperCase()} size="small"
                                sx={{ bgcolor: `${vc[verdict]}20`, color: vc[verdict], fontWeight: 900, fontSize: 11, height: 22 }} />
                              <Typography sx={{ fontSize: 13, fontFamily: '"IBM Plex Mono"', fontWeight: 700, color: 'text.secondary' }}>{srcip}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(123,91,164,0.1)', overflow: 'hidden' }}>
                                <Box sx={{ height: '100%', width: `${Math.min(riskPct, 100)}%`, bgcolor: vc[verdict], borderRadius: 3, transition: 'width 0.8s ease' }} />
                              </Box>
                              <Typography sx={{ fontSize: 11, fontWeight: 800, color: vc[verdict], minWidth: 36 }}>{Math.round(riskPct)}%</Typography>
                            </Box>
                          </Box>
                        </Box>
                      )
                    })()}

                    {/* Feed cards 2×2 grid */}
                    <Grid container spacing={1.25}>
                      {[
                        {
                          name: 'ABUSEIPDB', color: '#EF4444',
                          d: enrichData.feeds?.abuseipdb,
                          main: enrichData.feeds?.abuseipdb?.available ? `${enrichData.feeds.abuseipdb.abuseConfidenceScore ?? '—'}%` : '—',
                          mainLabel: 'Abuse Confidence',
                          rows: [
                            ['Reports',  enrichData.feeds?.abuseipdb?.totalReports],
                            ['Country',  enrichData.feeds?.abuseipdb?.countryName || enrichData.feeds?.abuseipdb?.countryCode],
                            ['ISP',      enrichData.feeds?.abuseipdb?.isp],
                            ['Domain',   enrichData.feeds?.abuseipdb?.domain],
                            ['Usage',    enrichData.feeds?.abuseipdb?.usageType],
                          ] as [string, any][],
                          extra: enrichData.feeds?.abuseipdb?.available && (
                            <Box sx={{ mt: 0.75 }}>
                              <LinearProgress variant="determinate"
                                value={enrichData.feeds.abuseipdb.abuseConfidenceScore || 0}
                                sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.12)',
                                  '& .MuiLinearProgress-bar': { bgcolor: '#EF4444', borderRadius: 2 } }} />
                            </Box>
                          ),
                        },
                        {
                          name: 'ALIENVAULT OTX', color: '#FF7A00',
                          d: enrichData.feeds?.otx,
                          main: enrichData.feeds?.otx?.available ? enrichData.feeds.otx.pulse_count || 0 : '—',
                          mainLabel: 'Threat Pulses',
                          rows: [
                            ['Country', enrichData.feeds?.otx?.country_name],
                            ['ASN',     enrichData.feeds?.otx?.asn],
                            ['Malware', enrichData.feeds?.otx?.malware_count],
                          ] as [string, any][],
                          extra: enrichData.feeds?.otx?.pulse_refs?.length > 0 && (
                            <Box sx={{ mt: 0.5 }}>
                              {enrichData.feeds.otx.pulse_refs.slice(0, 2).map((p: any, i: number) => (
                                <Typography key={i} sx={{ fontSize: 9, color: '#FF7A00', lineHeight: 1.4, mt: 0.3 }} className="line-clamp-2">• {p.name}</Typography>
                              ))}
                            </Box>
                          ),
                        },
                        {
                          name: 'SHODAN', color: '#CC0000',
                          d: enrichData.feeds?.shodan,
                          main: enrichData.feeds?.shodan?.available ? enrichData.feeds.shodan.ports?.length ?? 0 : '—',
                          mainLabel: 'Open Ports',
                          rows: [
                            ['Org',     enrichData.feeds?.shodan?.org],
                            ['Country', enrichData.feeds?.shodan?.country_name],
                            ['CVEs',    enrichData.feeds?.shodan?.vulns?.length],
                          ] as [string, any][],
                          extra: enrichData.feeds?.shodan?.ports?.length > 0 && (
                            <Box sx={{ mt: 0.75 }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                                {enrichData.feeds.shodan.ports.slice(0, 8).map((p: number) => (
                                  <Chip key={p} label={p} size="small"
                                    sx={{ height: 15, fontSize: 8, fontFamily: '"IBM Plex Mono"',
                                      bgcolor: [22,23,3389,4444,6379].includes(p) ? 'rgba(239,68,68,0.18)' : 'rgba(123,91,164,0.12)',
                                      color: [22,23,3389,4444,6379].includes(p) ? '#EF4444' : 'text.secondary',
                                      '& .MuiChip-label': { px: 0.5 } }} />
                                ))}
                              </Box>
                            </Box>
                          ),
                        },
                        {
                          name: 'VIRUSTOTAL', color: '#395BA9',
                          d: enrichData.feeds?.virustotal,
                          main: enrichData.feeds?.virustotal?.available && enrichData.feeds.virustotal.found
                            ? `${enrichData.feeds.virustotal.malicious || 0}/${enrichData.feeds.virustotal.total || 0}`
                            : '—',
                          mainLabel: 'Detections',
                          rows: [
                            ['Country',   enrichData.feeds?.virustotal?.country],
                            ['AS Owner',  enrichData.feeds?.virustotal?.as_owner],
                            ['Suspicious',enrichData.feeds?.virustotal?.suspicious],
                          ] as [string, any][],
                          extra: enrichData.feeds?.virustotal?.malicious_engines?.length > 0 && (
                            <Box sx={{ mt: 0.75 }}>
                              {enrichData.feeds.virustotal.malicious_engines.slice(0, 2).map((e: any, i: number) => (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>{e.engine}</Typography>
                                  <Typography sx={{ fontSize: 9, color: '#395BA9', fontWeight: 700 }} noWrap>{e.result}</Typography>
                                </Box>
                              ))}
                            </Box>
                          ),
                        },
                      ].map(fc => (
                        <Grid item xs={6} key={fc.name}>
                          <FeedMiniCard
                            name={fc.name}
                            color={fc.color}
                            main={fc.d?.available ? fc.main : '—'}
                            mainLabel={fc.mainLabel}
                            rows={fc.d?.available ? fc.rows : []}
                            extra={fc.d?.available ? fc.extra : null}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            )}

            {/* ─── TAB 2: Raw Log ─────────────────────────────────────────── */}
            {tab === 2 && (
              <Box sx={{ animation: 'tabContentIn 0.22s cubic-bezier(0.4,0,0.2,1) both', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>Raw JSON Data</Typography>
                  <Button size="small" startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 14 }} />}
                    onClick={() => { navigator.clipboard.writeText(JSON.stringify(alert, null, 2)); enqueueSnackbar('คัดลอก JSON แล้ว', { variant: 'info' }) }}
                    sx={{ fontSize: 11.5, borderRadius: '8px', px: 1.5, py: 0.6 }}>
                    คัดลอก JSON
                  </Button>
                </Box>
                <Box sx={{
                  borderRadius: '16px', overflow: 'hidden',
                  border: '1.5px solid rgba(123,91,164,0.18)',
                  background: isDark ? 'rgba(10,8,18,0.9)' : 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  width: '100%', maxWidth: '100%', boxSizing: 'border-box',
                }}>
                  {/* Code header bar */}
                  <Box sx={{ px: 2, py: 1, bgcolor: isDark ? 'rgba(123,91,164,0.08)' : 'rgba(123,91,164,0.05)', borderBottom: '1px solid rgba(123,91,164,0.15)', display: 'flex', alignItems: 'center', gap: 0.75, width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                    {['#EF4444', '#EAB308', '#22C55E'].map(c => (
                      <Box key={c} sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: c, opacity: 0.8, cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }} />
                    ))}
                    <Typography sx={{ fontSize: 11.5, color: 'text.disabled', ml: 1.5, fontWeight: 700, fontFamily: '"IBM Plex Mono"' }}>alert.json</Typography>
                  </Box>
                  <Box sx={{ p: 2.25, overflowY: 'auto', overflowX: 'hidden', maxHeight: 'calc(100vh - 350px)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }} className="scrollbar-thin">
                    <Typography component="pre" sx={{
                      fontSize: 12, fontFamily: '"IBM Plex Mono",monospace',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      color: isDark ? '#EDE9FA' : '#334155',
                      lineHeight: 1.8, m: 0,
                      width: '100%', maxWidth: '100%',
                    }}>
                      {JSON.stringify(alert, null, 2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>

          {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
          <Box sx={{
            px: { xs: 2.5, sm: 3 }, py: 2,
            borderTop: '1px solid', borderColor: 'divider',
            display: 'flex', gap: 1.5, flexWrap: 'wrap',
            bgcolor: isDark ? 'rgba(12,10,20,0.5)' : 'rgba(123,91,164,0.04)',
            flexShrink: 0,
          }}>
            {srcip && (
              <Button variant="contained" size="small"
                startIcon={<OpenInNewRoundedIcon sx={{ fontSize: 15 }} />}
                onClick={() => { onClose(); navigate(`/investigate?q=${srcip}`) }}
                sx={{ 
                  borderRadius: '10px', fontSize: 12.5, py: 1.1, px: 2.5,
                  background: 'linear-gradient(135deg, #7B5BA4 0%, #5A3E85 100%)',
                  boxShadow: '0 4px 14px rgba(123, 91, 164, 0.4)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 18px rgba(123, 91, 164, 0.55)',
                    filter: 'brightness(1.1)'
                  }
                }}>
                สืบสวน IP
              </Button>
            )}
            {srcip && (
              <Button variant="outlined" size="small" color="warning"
                startIcon={<BookmarkAddRoundedIcon sx={{ fontSize: 15 }} />}
                onClick={() => { onClose(); navigate(`/ioc?add=${srcip}`) }}
                sx={{ 
                  borderRadius: '10px', fontSize: 12.5, py: 1.1,
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(241, 116, 34, 0.2)',
                  }
                }}>
                เพิ่ม IOC
              </Button>
            )}
            <Button variant="outlined" size="small"
              startIcon={<TuneRoundedIcon sx={{ fontSize: 15 }} />}
              onClick={() => { onClose(); navigate(`/admin?tab=1`) }}
              sx={{ 
                borderRadius: '10px', fontSize: 12.5, py: 1.1,
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(123, 91, 164, 0.15)',
                }
              }}>
              Rule Tuning
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  )
}

// ── Number formatter (K / M) ──────────────────────────────────────────────────
const fmtNum = (n?: number | null): string => {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000)    return `${(n / 1_000).toFixed(0)}K`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

// Inline mini-sparkline (pure SVG, no lib)
interface SparklineProps {
  data?: { timestamp: string; count: number }[];
  color: string;
  height?: number;
}

function Sparkline({ data = [], color, height = 32 }: SparklineProps) {
  if (!data.length) return null
  const values = data.map(d => d.count || 0)
  const max = Math.max(...values, 1)
  const w = 80, h = height
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * w
    const y = h - (v / max) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sp-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Group + Rule metadata ─────────────────────────────────────────────────────
function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

const GROUP_META: Record<string, { color: string; label: string }> = {
  fortigate:      { color: '#F17422', label: 'FortiGate' },
  fortigate_wuh:  { color: '#F17422', label: 'FortiGate' },
  mikrotik:       { color: '#3B82F6', label: 'Mikrotik' },
  routeros:       { color: '#3B82F6', label: 'RouterOS' },
  huawei:         { color: '#22C55E', label: 'Huawei USG' },
  huawei_usg:     { color: '#22C55E', label: 'Huawei USG' },
  infoblox:       { color: '#8B5CF6', label: 'Infoblox DNS' },
  infoblox_dns:   { color: '#8B5CF6', label: 'DNS Query' },
  dns_query:      { color: '#8B5CF6', label: 'DNS Query' },
  compliance:     { color: '#EAB308', label: 'Compliance' },
  authentication: { color: '#EF4444', label: 'Auth Failure' },
  windows:        { color: '#0EA5E9', label: 'Windows' },
  suricata:       { color: '#EC4899', label: 'Suricata IDS' },
  syscheck:       { color: '#64748B', label: 'FIM/Syscheck' },
  firewall:       { color: '#64748B', label: 'Firewall' },
}

const CHART_GROUPS = ['fortigate', 'mikrotik', 'huawei', 'infoblox_dns', 'compliance', 'authentication', 'windows', 'suricata', 'syscheck']

const RULE_DESC: Record<string, string> = {
  '101053': 'Mikrotik: TCP connection tracked',
  '100052': 'Huawei USG: Traffic permitted',
  '110010': 'FortiGate: Traffic logged',
  '120001': 'PCI DSS 1.3: Unauthorized access blocked',
  '110022': 'FortiGate: App-ctrl elevated risk',
  '110011': 'FortiGate: Session closed',
  '110021': 'FortiGate: DNS lookup',
  '100401': 'Infoblox DNS: HTTPS query',
  '100400': 'Infoblox DNS: A record query',
  '101052': 'Mikrotik: UDP connection',
  '100053': 'Huawei USG: Traffic denied',
  '110016': 'FortiGate: App-ctrl application',
  '120054': 'Compliance: System event',
  '110023': 'FortiGate: App-ctrl medium risk',
  '110018': 'FortiGate: URL blocked',
  '120003': 'PCI DSS 8.3: Auth failure',
  '120061': 'NIST: DHCP pool exhausted',
  '60602':  'Windows: Application error',
  '110039': 'FortiGate: Policy event',
  '100303': 'Auth: Multiple failures',
}

// ── Dashboard Section ─────────────────────────────────────────────────────────
interface DashboardSectionProps {
  stats?: AlertStats
  loading: boolean
  activeLevel: number
  onLevelClick: (level: number) => void
  onGroupClick: (group: string) => void
}

function DashboardSection({ stats, loading, activeLevel, onLevelClick, onGroupClick }: DashboardSectionProps) {
  const timeline = stats?.timeline || []
  const total    = stats?.total || 0

  const groupChartData = useMemo(() => {
    const raw = (stats as any)?.by_group || []
    return CHART_GROUPS
      .map(key => {
        const meta  = GROUP_META[key]
        const found = raw.find((b: any) => b.name === key || b.name?.includes(key))
        const count = found?.count || 0
        return { name: meta?.label || key, count, color: meta?.color || '#6B7280' }
      })
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [stats])

  const ruleChartData = useMemo(() => {
    const raw = (stats as any)?.by_rule || []
    const maxCount = Math.max(...raw.map((r: any) => r.count || 0), 1)
    return raw.slice(0, 8).map((r: any) => ({
      id: r.name,
      desc: RULE_DESC[r.name] || `Rule ${r.name}`,
      count: r.count || 0,
      pct: Math.round(((r.count || 0) / maxCount) * 100),
    }))
  }, [stats])

  const SEV_ICON: Record<SeverityName, React.ReactNode> = {
    critical: <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19H3.5L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>,
    high:     <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12V11c0 4.52-3.02 8.79-7 10.07C8.02 19.79 5 15.52 5 11V6.3l7-3.12z"/><path d="M11 7h2v6h-2zM11 15h2v2h-2z"/></svg>,
    medium:   <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/></svg>,
    low:      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm-1-9l-2.5-2.5-1.42 1.42L11 16.84l7.08-7.08-1.42-1.41L11 13z"/></svg>,
    info:     <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-2v2h2v4zm0-8h-2V7h2v2z"/></svg>,
  }

  const isTotalActive = activeLevel === 1;

  return (
    <Box sx={{ mb: 2 }}>
      {/* ── 5 count cards ── */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2 }}>
        {/* Total Card */}
        <Grid item xs={12} sm={4} md={2.4}>
          <Card
            onClick={() => onLevelClick(1)}
            sx={{
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              border: isTotalActive ? `1.5px solid ${BRAND.purple}` : '1px solid',
              borderColor: isTotalActive ? BRAND.purple : 'divider',
              background: isTotalActive
                ? `linear-gradient(135deg, ${BRAND.purple}18 0%, ${BRAND.purple}06 100%)`
                : undefined,
              boxShadow: isTotalActive
                ? `0 0 0 3px ${BRAND.purple}20, 0 8px 24px ${BRAND.purple}22`
                : '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: `0 0 0 2px ${BRAND.purple}30, 0 10px 28px ${BRAND.purple}28`,
                borderColor: BRAND.purple,
              },
            }}
          >
            <Box sx={{
              position: 'absolute', bottom: -6, right: -4,
              color: BRAND.purple, opacity: 0.08, lineHeight: 1,
              transform: 'scale(2.8)', transformOrigin: 'bottom right',
              pointerEvents: 'none',
            }}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
            </Box>
            <CardContent sx={{ p: { xs: '12px 14px !important', sm: '14px 18px !important' }, position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: isTotalActive ? BRAND.purple : 'text.disabled' }}>
                  Total Alerts
                </Typography>
                {isTotalActive && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: BRAND.purple, boxShadow: `0 0 6px ${BRAND.purple}` }} />}
              </Box>
              {loading ? (
                <Box sx={{ height: 38, display: 'flex', alignItems: 'center' }}><CircularProgress size={22} sx={{ color: BRAND.purple }} /></Box>
              ) : (
                <Typography sx={{ fontSize: { xs: 26, sm: 30 }, fontWeight: 900, color: BRAND.purple, lineHeight: 1, letterSpacing: '-0.03em', mb: 0.25 }}>
                  {fmtNum(total)}
                </Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 0.5 }}>
                <Box sx={{ opacity: 0.8 }}>
                  <Sparkline data={timeline} color={BRAND.purple} height={28} />
                </Box>
                <Typography sx={{ fontSize: 9, color: 'text.disabled', lineHeight: 1.2 }}>all levels</Typography>
              </Box>
            </CardContent>
            <Box sx={{ height: 3, background: isTotalActive ? `linear-gradient(90deg, ${BRAND.purple} 0%, ${BRAND.purple}80 100%)` : `${BRAND.purple}40` }} />
          </Card>
        </Grid>

        {/* Severity Cards */}
        {SEV.map(s => {
          const count    = stats?.by_severity?.[s.key] || 0
          const pct      = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
          const isActive = (s.key === 'critical' && activeLevel === 15) ||
                           (s.key === 'high'     && activeLevel === 12) ||
                           (s.key === 'medium'   && activeLevel === 7)  ||
                           (s.key === 'low'      && activeLevel === 1)
          return (
            <Grid item xs={6} sm={4} md={2.4} key={s.key}>
              <Card
                onClick={() => onLevelClick(s.min)}
                sx={{
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  border: isActive ? `1.5px solid ${s.color}` : '1px solid',
                  borderColor: isActive ? s.color : 'divider',
                  background: isActive
                    ? `linear-gradient(135deg, ${s.color}18 0%, ${s.color}06 100%)`
                    : undefined,
                  boxShadow: isActive
                    ? `0 0 0 3px ${s.color}20, 0 8px 24px ${s.color}22`
                    : '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 0 0 2px ${s.color}30, 0 10px 28px ${s.color}28`,
                    borderColor: s.color,
                  },
                }}
              >
                <Box sx={{
                  position: 'absolute', bottom: -6, right: -4,
                  color: s.color, opacity: 0.08, lineHeight: 1,
                  transform: 'scale(2.8)', transformOrigin: 'bottom right',
                  pointerEvents: 'none',
                }}>
                  {SEV_ICON[s.key]}
                </Box>

                <CardContent sx={{ p: { xs: '12px 14px !important', sm: '14px 18px !important' }, position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography sx={{
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.09em',
                      color: isActive ? s.color : 'text.disabled',
                    }}>
                      {s.label}
                    </Typography>
                    {isActive && (
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                    )}
                  </Box>
                  {loading ? (
                    <Box sx={{ height: 38, display: 'flex', alignItems: 'center' }}><CircularProgress size={22} sx={{ color: s.color }} /></Box>
                  ) : (
                    <Typography sx={{
                      fontSize: { xs: 26, sm: 30 },
                      fontWeight: 900, color: s.color, lineHeight: 1,
                      letterSpacing: '-0.03em', mb: 0.25,
                    }}>
                      {fmtNum(count)}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 0.5 }}>
                    <Box sx={{ opacity: 0.8 }}>
                      <Sparkline data={timeline.map(t => ({ timestamp: t.timestamp, count: t.severity_breakdown?.[s.key] ?? 0 }))} color={s.color} height={28} />
                    </Box>
                    {!loading && (
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: s.color, lineHeight: 1 }}>{pct}<span style={{ fontSize: 9, fontWeight: 600 }}>%</span></Typography>
                        <Typography sx={{ fontSize: 9, color: 'text.disabled', lineHeight: 1.2 }}>of total</Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
                <Box sx={{ height: 3, background: isActive ? `linear-gradient(90deg, ${s.color} 0%, ${s.color}80 100%)` : `${s.color}40` }} />
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {/* ── Timeline + Groups + Top Rules row ── */}
      <Grid container spacing={2}>
        {/* Timeline chart - 7 cols */}
        {timeline.length > 1 && (
          <Grid item xs={12} md={7}>
            <Card sx={{
              border: '1px solid', borderColor: 'divider', overflow: 'hidden', height: '100%',
              background: 'linear-gradient(135deg, rgba(123,91,164,0.04) 0%, transparent 60%)',
              position: 'relative',
            }}>
              {/* Decorative glow */}
              <Box sx={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%',
                background: `radial-gradient(circle, ${BRAND.purple}15 0%, transparent 70%)`, pointerEvents: 'none' }} />
              <CardContent sx={{ p: '16px 20px !important', position: 'relative' }}>
                {/* Header row */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                      <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: BRAND.purple }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary', letterSpacing: '-0.01em' }}>
                        Timeline การแจ้งเตือน
                      </Typography>
                    </Box>
                    {total > 0 && (
                      <Typography sx={{ fontSize: 11, color: 'text.disabled', pl: 1.5 }}>
                        รวม <Box component="span" sx={{ color: BRAND.purple, fontWeight: 700 }}>{fmtNum(total)}</Box> รายการในช่วงเวลาที่เลือก
                      </Typography>
                    )}
                  </Box>
                  {/* Legend pills */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    {[
                      { label: 'วิกฤต', color: '#EF4444' },
                      { label: 'สูง',   color: BRAND.orange },
                      { label: 'กลาง',  color: '#EAB308' },
                      { label: 'รวม',   color: BRAND.purple },
                    ].map(l => (
                      <Box key={l.label} sx={{
                        display: 'flex', alignItems: 'center', gap: 0.5,
                        px: 1, py: 0.25, borderRadius: '20px',
                        bgcolor: `${l.color}12`, border: `1px solid ${l.color}30`,
                      }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: l.color }} />
                        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: l.color, letterSpacing: '0.04em' }}>{l.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={timeline} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      {[
                        { id: 'gt',  color: BRAND.purple, o1: 0.28, o2: 0.02 },
                        { id: 'gc',  color: '#EF4444',    o1: 0.50, o2: 0.03 },
                        { id: 'gh',  color: BRAND.orange, o1: 0.40, o2: 0.03 },
                        { id: 'gm',  color: '#EAB308',    o1: 0.30, o2: 0.02 },
                      ].map(g => (
                        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={g.color} stopOpacity={g.o1} />
                          <stop offset="100%" stopColor={g.color} stopOpacity={g.o2} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,91,164,0.06)" vertical={false} />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 9, fill: '#9A90BF' }} axisLine={false} tickLine={false}
                      tickFormatter={t => { try { return format(new Date(t), 'HH:mm') } catch { return t } }}
                      interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9, fill: '#9A90BF' }} axisLine={false} tickLine={false} tickFormatter={fmtNum} width={36} />
                    <RechartTip
                      contentStyle={{ ...ChartTip, borderRadius: 10, padding: '8px 12px' }}
                      formatter={(v: any, n?: any) => [fmtNum(Number(v)), n || '']}
                      labelFormatter={l => { try { return format(new Date(l), 'dd MMM HH:mm') } catch { return l } }}
                    />
                    <Area type="monotone" dataKey="count" stroke={BRAND.purple} strokeWidth={2.5} fill="url(#gt)" dot={false} name="รวม" />
                    <Area type="monotone" dataKey="severity_breakdown.critical" stroke="#EF4444" strokeWidth={1.5} fill="url(#gc)" dot={false} name="วิกฤต" />
                    <Area type="monotone" dataKey="severity_breakdown.high" stroke={BRAND.orange} strokeWidth={1.5} fill="url(#gh)" dot={false} name="สูง" />
                    <Area type="monotone" dataKey="severity_breakdown.medium" stroke="#EAB308" strokeWidth={1} fill="url(#gm)" dot={false} name="กลาง" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Groups PieChart - 2.5 cols */}
        {groupChartData.length > 0 && (
          <Grid item xs={12} sm={6} md={timeline.length > 1 ? 2.5 : 5}>
            <Card sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: '12px 16px !important' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                  Alert Groups
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ResponsiveContainer width={90} height={90}>
                    <PieChart>
                      <Pie data={groupChartData} dataKey="count" nameKey="name" cx="50%" cy="50%"
                        innerRadius={22} outerRadius={40} paddingAngle={2} startAngle={90} endAngle={-270}>
                        {groupChartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <RechartTip contentStyle={ChartTip} formatter={(v: any) => [fmtNum(Number(v)), '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {groupChartData.map(d => (
                      <Box key={d.name} sx={{
                        display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.35,
                        cursor: 'pointer', borderRadius: '4px', px: 0.5, py: 0.2,
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: `${d.color}15` },
                      }}
                        onClick={() => onGroupClick(d.name.toLowerCase().replace(' ', '_'))}
                      >
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: d.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 9.5, color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.name}
                        </Typography>
                        <Typography sx={{ fontSize: 9, color: 'text.disabled', fontFamily: '"IBM Plex Mono"', flexShrink: 0 }}>
                          {fmtNum(d.count)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Top Rules - 2.5 cols */}
        {ruleChartData.length > 0 && (
          <Grid item xs={12} sm={6} md={timeline.length > 1 ? 2.5 : 7}>
            <Card sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: '12px 16px !important' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                  Top Rules
                </Typography>
                {ruleChartData.map((r, i) => (
                  <Box key={r.id} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 9, fontFamily: '"IBM Plex Mono"', color: BRAND.purpleLight, flexShrink: 0 }}>
                          #{r.id}
                        </Typography>
                        <Typography sx={{ fontSize: 9.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.desc}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 9, color: 'text.disabled', fontFamily: '"IBM Plex Mono"', ml: 0.5, flexShrink: 0 }}>
                        {fmtNum(r.count)}
                      </Typography>
                    </Box>
                    <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden' }}>
                      <Box sx={{
                        height: '100%', borderRadius: 2,
                        width: `${r.pct}%`,
                        background: `linear-gradient(90deg, ${BRAND.purple} 0%, ${BRAND.purpleLight} 100%)`,
                        opacity: 0.7 + i * 0.04,
                        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                      }} />
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

// ── Main Alerts Page ──────────────────────────────────────────────────────────
export default function AlertsPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const qc = useQueryClient()

  // Filter state
  const [level,            setLevel]            = useState<number>(1)
  const [source,           setSource]           = useState<string>('')
  const [timeRange,        setTimeRange]        = useState<string>('24h')
  const [search,           setSearch]           = useState<string>('')
  const [searchInput,      setSearchInput]      = useState<string>('')
  const [agentFilter,      setAgentFilter]      = useState<string>('')
  const [mitreFilter,      setMitreFilter]      = useState<string>('')
  const [showFilters,      setShowFilters]      = useState<boolean>(false)

  // Advanced Filters
  const [ruleIdFilter,     setRuleIdFilter]     = useState<string>('')
  const [srcIpFilter,      setSrcIpFilter]      = useState<string>('')
  const [dstIpFilter,      setDstIpFilter]      = useState<string>('')
  const [decoderFilter,    setDecoderFilter]    = useState<string>('')
  const [complianceFilter, setComplianceFilter] = useState<string>('all')

  // Group quick-filter
  const [groupFilter,      setGroupFilter]      = useState<string>('')

  // Alert detail
  const [selectedAlert,    setSelected]         = useState<WazuhAlertItem | null>(null)
  const [drawerOpen,       setDrawer]           = useState<boolean>(false)

  // Live alert indicator & auto refresh
  const [newCount,         setNewCount]         = useState<number>(0)
  const [refreshInterval,  setRefreshInterval]  = useState<number>(30000) // 30s default
  const [lastTotal,        setLastTotal]        = useState<number | null>(null)

  // Composed Lucene search query for server-side search composition
  const composedSearchQuery = useMemo(() => {
    const parts: string[] = []
    if (search.trim()) {
      parts.push(search.trim())
    }
    if (groupFilter.trim()) {
      parts.push(`rule.groups:"${groupFilter.trim()}"`)
    }
    if (ruleIdFilter.trim()) {
      parts.push(`rule.id:"${ruleIdFilter.trim()}"`)
    }
    if (srcIpFilter.trim()) {
      parts.push(`data.srcip:"${srcIpFilter.trim()}"`)
    }
    if (dstIpFilter.trim()) {
      parts.push(`data.dstip:"${dstIpFilter.trim()}"`)
    }
    if (decoderFilter.trim()) {
      parts.push(`decoder.name:"${decoderFilter.trim()}"`)
    }
    if (complianceFilter && complianceFilter !== 'all') {
      if (complianceFilter === 'pci_dss') {
        parts.push(`_exists_:rule.pci_dss`)
      } else if (complianceFilter === 'gdpr') {
        parts.push(`_exists_:rule.gdpr`)
      } else if (complianceFilter === 'hipaa') {
        parts.push(`_exists_:rule.hipaa`)
      } else if (complianceFilter === 'nist_800_53') {
        parts.push(`_exists_:rule.nist_800_53`)
      } else if (complianceFilter === 'cis') {
        parts.push(`_exists_:rule.tsc`)
      }
    }
    return parts.length > 0 ? parts.join(' AND ') : undefined
  }, [search, ruleIdFilter, srcIpFilter, dstIpFilter, decoderFilter, complianceFilter])

  // Alerts query
  const { data: rawAlerts = [], isLoading, isError, refetch, dataUpdatedAt } = useQuery<any[]>({
    queryKey: ['alerts', level, source, timeRange, composedSearchQuery, agentFilter, mitreFilter, groupFilter],
    queryFn: () => alertsApi.list({
      level, source: source || undefined, time_range: timeRange,
      q: composedSearchQuery || undefined, agent: agentFilter || undefined,
      mitre_tactic: mitreFilter || undefined, limit: 500,
    }).then(r => r.data),
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    staleTime: 15000,
  })

  const alerts = useMemo(() => (rawAlerts || []).map(normalizeWazuhAlert), [rawAlerts])

  // Stats query
  const { data: rawStats, isLoading: loadingStats, isError: isErrorStats } = useQuery<any>({
    queryKey: ['alert-stats', timeRange, level],
    queryFn: () => alertsApi.stats(timeRange, level).then(r => r.data),
    refetchInterval: refreshInterval > 0 ? refreshInterval * 2 : false,
    staleTime: 30000,
  })

  const stats = useMemo(() => normalizeStats(rawStats), [rawStats])

  // Detect new alerts (compare total)
  useEffect(() => {
    const total = stats?.total || 0
    if (lastTotal !== null && total > lastTotal) setNewCount(n => n + (total - lastTotal))
    setLastTotal(total)
  }, [stats?.total, lastTotal])

  const commitSearch = () => setSearch(searchInput)

  // Active filter chips
  const activeFilters = [
    source && { label: `Source: ${source}`, clear: () => setSource('') },
    groupFilter && { label: `Group: ${groupFilter}`, clear: () => setGroupFilter('') },
    agentFilter && { label: `Agent: ${agentFilter}`, clear: () => setAgentFilter('') },
    mitreFilter && { label: `MITRE: ${mitreFilter}`, clear: () => setMitreFilter('') },
    search && { label: `ค้นหา: "${search}"`, clear: () => { setSearch(''); setSearchInput('') } },
    ruleIdFilter && { label: `Rule ID: ${ruleIdFilter}`, clear: () => setRuleIdFilter('') },
    srcIpFilter && { label: `Src IP: ${srcIpFilter}`, clear: () => setSrcIpFilter('') },
    dstIpFilter && { label: `Dst IP: ${dstIpFilter}`, clear: () => setDstIpFilter('') },
    decoderFilter && { label: `Decoder: ${decoderFilter}`, clear: () => setDecoderFilter('') },
    complianceFilter && complianceFilter !== 'all' && { label: `Compliance: ${complianceFilter}`, clear: () => setComplianceFilter('all') },
  ].filter(Boolean) as { label: string; clear: () => void }[]

  const handleClearAll = () => {
    setSource('')
    setGroupFilter('')
    setSearch('')
    setSearchInput('')
    setAgentFilter('')
    setMitreFilter('')
    setLevel(1)
    setRuleIdFilter('')
    setSrcIpFilter('')
    setDstIpFilter('')
    setDecoderFilter('')
    setComplianceFilter('all')
  }

  const handleExport = async (fmt: 'csv' | 'json') => {
    try {
      const r = await alertsApi.export({ level, source: source||undefined, time_range: timeRange, q: composedSearchQuery||undefined, fmt })
      const url  = URL.createObjectURL(new Blob([r.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `alerts-${timeRange}.${fmt}`
      link.click()
      enqueueSnackbar(`Export ${fmt.toUpperCase()} สำเร็จ`, { variant: 'success' })
    } catch { enqueueSnackbar('Export ล้มเหลว', { variant: 'error' }) }
  }

  const connectionStatus = useMemo(() => {
    if (isError || isErrorStats) return { label: 'Error', color: '#ef4444' }
    if (isLoading || loadingStats) return { label: 'Syncing', color: '#eab308' }
    return { label: 'Connected', color: '#22c55e' }
  }, [isError, isErrorStats, isLoading, loadingStats])

  return (
    <PageShell variant="console">
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>การแจ้งเตือนภัยคุกคาม</Typography>

            {/* Connection status */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.6,
              px: 1.25, py: 0.4, borderRadius: '20px',
              bgcolor: `${connectionStatus.color}12`,
              border: `1.5px solid ${connectionStatus.color}30`,
            }}>
              <Box sx={{
                width: 7, height: 7, borderRadius: '50%', bgcolor: connectionStatus.color,
                animation: connectionStatus.label !== 'Error' ? 'pulseGlow 2s ease-in-out infinite' : 'none',
              }} />
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: connectionStatus.color, letterSpacing: '0.06em' }}>
                {connectionStatus.label.toUpperCase()}
              </Typography>
            </Box>

            {newCount > 0 && (
              <Chip
                label={`+${newCount} ใหม่`}
                size="small"
                color="error"
                onClick={() => { setNewCount(0); refetch() }}
                sx={{ height: 22, fontSize: 11, fontWeight: 800, animation: 'pulse-critical 2s ease-in-out infinite', cursor: 'pointer' }}
              />
            )}
          </Box>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.35 }}>
            Threat Alerts · {alerts.length.toLocaleString()} รายการ · ช่วงเวลา {timeRange}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Auto-refresh selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, borderRadius: '9px', bgcolor: 'rgba(123,91,164,0.06)', border: '1px solid rgba(123,91,164,0.12)' }}>
            <FiberManualRecordIcon sx={{ fontSize: 8, color: refreshInterval > 0 ? '#22C55E' : 'text.disabled', animation: refreshInterval > 0 ? 'pulseGlow 2s ease-in-out infinite' : 'none' }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: refreshInterval > 0 ? '#22C55E' : 'text.disabled' }}>
              {refreshInterval > 0 ? 'AUTO' : 'MANUAL'}
            </Typography>
            <FormControl size="small">
              <Select value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))}
                sx={{ height: 20, fontSize: 9, color: 'text.secondary', bgcolor: 'transparent', '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, padding: 0 }}>
                <MenuItem value={0} sx={{ fontSize: 11 }}>Off</MenuItem>
                <MenuItem value={15000} sx={{ fontSize: 11 }}>15s</MenuItem>
                <MenuItem value={30000} sx={{ fontSize: 11 }}>30s</MenuItem>
                <MenuItem value={60000} sx={{ fontSize: 11 }}>60s</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Button size="small" startIcon={<RefreshRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['alert-stats'] }); setNewCount(0) }}
            variant="outlined" sx={{ borderRadius: '9px', fontSize: 11 }} aria-label="รีเฟรชข้อมูล">
            รีเฟรช
          </Button>
          <Button size="small" startIcon={<DownloadRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={() => handleExport('csv')} variant="outlined" sx={{ borderRadius: '9px', fontSize: 11 }} aria-label="ดาวน์โหลด CSV">
            CSV
          </Button>
        </Box>
      </Box>

      {/* ── Dashboard Section ── */}
      <DashboardSection
        stats={stats}
        loading={loadingStats}
        activeLevel={level}
        onLevelClick={lv => setLevel(prev => prev === lv ? 1 : lv)}
        onGroupClick={g => setGroupFilter(prev => prev === g ? '' : g)}
      />

      {/* ── Group Quick-Filter Chips ── */}
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5, alignItems: 'center' }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', mr: 0.25, letterSpacing: '0.06em' }}>
          FILTER GROUP:
        </Typography>
        {[
          { key: 'fortigate',    label: 'FortiGate',   color: '#F17422' },
          { key: 'mikrotik',     label: 'Mikrotik',    color: '#3B82F6' },
          { key: 'huawei',       label: 'Huawei USG',  color: '#22C55E' },
          { key: 'infoblox_dns', label: 'Infoblox DNS',color: '#8B5CF6' },
          { key: 'authentication',label: 'Auth',       color: '#EF4444' },
          { key: 'compliance',   label: 'Compliance',  color: '#EAB308' },
          { key: 'suricata',     label: 'Suricata IDS',color: '#EC4899' },
          { key: 'windows',      label: 'Windows',     color: '#0EA5E9' },
        ].map(g => {
          const isActive = groupFilter === g.key
          return (
            <Chip
              key={g.key}
              label={g.label}
              size="small"
              onClick={() => setGroupFilter(prev => prev === g.key ? '' : g.key)}
              sx={{
                height: 22, fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                color: isActive ? g.color : 'text.secondary',
                border: `1.5px solid ${isActive ? g.color : 'transparent'}`,
                bgcolor: isActive ? `${g.color}18` : 'action.hover',
                transition: 'all 0.18s',
                '&:hover': { bgcolor: `${g.color}20`, color: g.color, borderColor: `${g.color}60` },
              }}
            />
          )
        })}
        {groupFilter && (
          <Chip label="✕ ล้าง" size="small" onClick={() => setGroupFilter('')}
            sx={{ height: 22, fontSize: 10, cursor: 'pointer', bgcolor: 'rgba(239,68,68,0.1)', color: '#EF4444' }} />
        )}
      </Box>

      {/* ── Filter Bar ── */}
      <Card sx={{ mb: 2, p: 1.5, border: '1px solid rgba(123,91,164,0.15)' }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: activeFilters.length ? 1 : 0 }}>
          {/* Search */}
          <TextField size="small" placeholder="ค้นหา IP, Rule, Description..." value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitSearch()}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
            sx={{ minWidth: 220, flex: 1 }} />

          {/* Level */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={level} onChange={e => setLevel(Number(e.target.value))} displayEmpty sx={{ fontSize: 12 }}>
              <MenuItem value={1}>ทุกระดับ</MenuItem>
              {SEV.map(s => {
                const th = { critical: 'วิกฤต', high: 'สูง', medium: 'กลาง', low: 'ต่ำ' }[s.key] || s.label
                return (
                  <MenuItem key={s.key} value={s.min}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                      {th} ({s.min}+)
                    </Box>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>

          {/* Source */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={source} onChange={e => setSource(e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
              <MenuItem value="">ทุกแหล่งข้อมูล</MenuItem>
              {SOURCES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Time range */}
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select value={timeRange} onChange={e => setTimeRange(e.target.value)} sx={{ fontSize: 12 }}>
              {TIME_OPTS.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>

          {/* More filters toggle */}
          <Tooltip title="ตัวกรองเพิ่มเติม">
            <IconButton size="small" onClick={() => setShowFilters(o => !o)}
              sx={{ bgcolor: showFilters ? 'rgba(123,91,164,0.15)' : 'transparent', color: showFilters ? BRAND.purpleLight : 'text.secondary' }}>
              <Badge badgeContent={[agentFilter, mitreFilter].filter(Boolean).length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: 9 } }}>
                <FilterListRoundedIcon sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Button size="small" variant="contained" onClick={commitSearch} sx={{ borderRadius: '9px', fontSize: 12, py: 0.8, px: 2, minWidth: 80 }}>
            ค้นหา
          </Button>
        </Box>

        {/* Extra filters */}
        <Collapse in={showFilters}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            {/* Agent filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
                <MenuItem value="">ทุก Agent</MenuItem>
                {(stats?.by_agent || []).map((a: any) => <MenuItem key={a.name} value={a.name}>{a.name} ({a.count.toLocaleString()})</MenuItem>)}
              </Select>
            </FormControl>

            {/* MITRE tactic */}
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <Select value={mitreFilter} onChange={e => setMitreFilter(e.target.value)} displayEmpty sx={{ fontSize: 12 }}>
                <MenuItem value="">ทุก MITRE Tactic</MenuItem>
                {(stats?.by_mitre || []).map((m: any) => <MenuItem key={m.name} value={m.name}>{m.name} ({m.count.toLocaleString()})</MenuItem>)}
              </Select>
            </FormControl>

            {/* Rule ID */}
            <TextField size="small" placeholder="Rule ID เช่น 101053" value={ruleIdFilter}
              onChange={e => setRuleIdFilter(e.target.value)}
              sx={{ minWidth: 130, maxWidth: 140, '& .MuiInputBase-input': { fontSize: 12 } }} />

            {/* Source IP */}
            <TextField size="small" placeholder="IP ต้นทาง" value={srcIpFilter}
              onChange={e => setSrcIpFilter(e.target.value)}
              sx={{ minWidth: 130, maxWidth: 150, '& .MuiInputBase-input': { fontSize: 12 } }} />

            {/* Dest IP */}
            <TextField size="small" placeholder="IP ปลายทาง" value={dstIpFilter}
              onChange={e => setDstIpFilter(e.target.value)}
              sx={{ minWidth: 130, maxWidth: 150, '& .MuiInputBase-input': { fontSize: 12 } }} />

            {/* Decoder */}
            <TextField size="small" placeholder="Decoder / โปรโตคอล" value={decoderFilter}
              onChange={e => setDecoderFilter(e.target.value)}
              sx={{ minWidth: 140, maxWidth: 160, '& .MuiInputBase-input': { fontSize: 12 } }} />

            {/* Compliance Framework */}
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select value={complianceFilter} onChange={e => setComplianceFilter(e.target.value)} sx={{ fontSize: 12 }}>
                <MenuItem value="all">ทุก Compliance Standard</MenuItem>
                <MenuItem value="pci_dss">PCI-DSS</MenuItem>
                <MenuItem value="gdpr">GDPR</MenuItem>
                <MenuItem value="hipaa">HIPAA</MenuItem>
                <MenuItem value="nist_800_53">NIST 800-53</MenuItem>
                <MenuItem value="cis">CIS Controls</MenuItem>
              </Select>
            </FormControl>

            {/* Top attackers quick-filter */}
            {(stats?.by_srcip || []).length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', mr: 0.5 }}>IP โจมตีสูงสุด:</Typography>
                {(stats?.by_srcip || []).slice(0, 5).map((ip: any) => (
                  <Chip key={ip.name} label={ip.name} size="small" onClick={() => setSearchInput(ip.name)}
                    sx={{ height: 18, fontSize: 9, fontFamily: '"IBM Plex Mono"', cursor: 'pointer', bgcolor: 'rgba(239,68,68,0.1)', color: '#EF4444',
                      '&:hover': { bgcolor: 'rgba(239,68,68,0.2)' } }} />
                ))}
              </Box>
            )}
          </Box>
        </Collapse>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', alignSelf: 'center' }}>กรองด้วย:</Typography>
            {activeFilters.map((f, i) => (
              <Chip key={i} label={f.label} size="small" onDelete={f.clear}
                sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(123,91,164,0.12)', color: BRAND.purpleLight, '& .MuiChip-deleteIcon': { fontSize: 14, color: BRAND.purpleLight } }} />
            ))}
            <Chip label="ล้างทั้งหมด" size="small" onClick={handleClearAll}
              sx={{ height: 20, fontSize: 10, cursor: 'pointer', bgcolor: 'rgba(239,68,68,0.1)', color: '#EF4444' }} />
          </Box>
        )}
      </Card>

      {/* ── Quick source chips ── */}
      {stats && !loadingStats && (stats.by_source || []).length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', mr: 0.25, letterSpacing: '0.06em' }}>
            แหล่งข้อมูล:
          </Typography>
          {(stats.by_source || []).slice(0, 6).map((s: any) => (
            <Chip key={s.name} label={`${s.name}  ${s.count.toLocaleString()}`} size="small"
              onClick={() => setSource(prev => prev === s.name ? '' : s.name)}
              sx={{
                height: 22, fontSize: 10, cursor: 'pointer',
                bgcolor: source === s.name ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.07)',
                color: source === s.name ? BRAND.purpleLight : 'text.secondary',
                border: `1px solid ${source === s.name ? BRAND.purple : 'transparent'}`,
                fontFamily: source === s.name ? 'inherit' : '"IBM Plex Mono"',
                '&:hover': { bgcolor: 'rgba(123,91,164,0.15)', color: BRAND.purpleLight },
              }} />
          ))}
        </Box>
      )}

      {/* ── Alerts Table ── */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        {isLoading && <LinearProgress sx={{ height: 2, '& .MuiLinearProgress-bar': { bgcolor: BRAND.purple } }} />}

        {/* Table header bar */}
        <Box sx={{
          px: 2, py: 1.25,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid', borderColor: 'divider',
          background: 'linear-gradient(90deg, rgba(123,91,164,0.04) 0%, transparent 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: BRAND.purple }} />
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary' }}>รายการแจ้งเตือน</Typography>
            {!isLoading && (
              <Chip label={`${alerts.length.toLocaleString()} รายการ`} size="small"
                sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: `${BRAND.purple}18`, color: BRAND.purpleLight }} />
            )}
          </Box>
          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
            ทั้งระบบ {(stats?.total || 0).toLocaleString()} รายการ
            {dataUpdatedAt ? ` · ${formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true, locale: th })}` : ''}
          </Typography>
        </Box>

        <Box sx={{ overflow: 'auto' }} className="scrollbar-thin">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-stickyHeader': { bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider' } }}>
                {[
                  { label: 'เวลา',        w: 120, mobile: true  },
                  { label: 'ระดับ',       w: 90,  mobile: true  },
                  { label: 'คำอธิบาย',    w: 'auto', mobile: true },
                  { label: 'แหล่งข้อมูล', w: 120, mobile: false },
                  { label: 'IP ต้นทาง',   w: 140, mobile: false },
                  { label: '🌐 ประเทศ',   w: 120, mobile: false },
                  { label: 'Agent',       w: 110, mobile: false },
                ].map(h => (
                  <TableCell key={h.label} sx={{
                    fontSize: 10, fontWeight: 800, color: 'text.disabled',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    py: 1.25, whiteSpace: 'nowrap', width: h.w,
                    display: h.mobile ? 'table-cell' : { xs: 'none', md: 'table-cell' },
                  }}>
                    {h.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 10, border: 'none' }}>
                    <Box sx={{ opacity: 0.4 }}>
                      <NotificationsActiveRoundedIcon sx={{ fontSize: 48, color: BRAND.purple, display: 'block', mx: 'auto', mb: 1.5 }} />
                    </Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.disabled' }}>
                      ไม่พบรายการแจ้งเตือน
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>
                      ลองเปลี่ยนเงื่อนไขการค้นหาหรือช่วงเวลา
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((a, i) => {
                  const lv      = a.ruleLevel
                  const srcip   = a.sourceIp
                  const country = a.countryName
                  const flag    = getFlag(country)
                  const groups: string[] = a.groups || []
                  const mitre: MitreAttackInfo = { tactic: a.mitreTactics, technique: a.mitreTechniques }
                  const isCrit  = lv >= 15
                  const isHigh  = lv >= 12 && lv < 15
                  const isMed   = lv >= 7  && lv < 12
                  const accentColor = isCrit ? '#EF4444' : isHigh ? BRAND.orange : isMed ? '#EAB308' : '#22C55E'

                  // Decoder color from GROUP_META
                  const decoderKey = Object.keys(GROUP_META).find(k => a.decoderName?.toLowerCase().includes(k))
                  const decoderColor = decoderKey ? GROUP_META[decoderKey].color : BRAND.purpleLight
                  const decoderLabel = decoderKey ? GROUP_META[decoderKey].label : (a.decoderName || '—')

                  return (
                    <TableRow
                      key={i}
                      hover
                      onClick={() => { setSelected(a); setDrawer(true) }}
                      sx={{
                        cursor: 'pointer',
                        position: 'relative',
                        bgcolor: isCrit ? 'rgba(239,68,68,0.03)' : isHigh ? 'rgba(241,116,34,0.025)' : 'transparent',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          bgcolor: `${accentColor}08`,
                        },
                        '& .MuiTableCell-root': {
                          borderColor: isCrit ? 'rgba(239,68,68,0.08)' : 'divider',
                        },
                      }}
                    >
                      {/* Time — left accent border */}
                      <TableCell sx={{
                        py: 1.25, pl: 1.5,
                        borderLeft: `3px solid ${isCrit || isHigh ? accentColor : `${accentColor}50`}`,
                      }}>
                        <Typography sx={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono"', color: 'text.secondary', lineHeight: 1.2 }}>
                          {a.timestamp ? format(new Date(a.timestamp), 'dd/MM/yy') : '-'}
                        </Typography>
                        <Typography sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono"', color: 'text.primary', fontWeight: 600, lineHeight: 1.2, mt: 0.2 }}>
                          {a.timestamp ? format(new Date(a.timestamp), 'HH:mm:ss') : '-'}
                        </Typography>
                      </TableCell>

                      {/* Level */}
                      <TableCell sx={{ py: 1.25 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
                          <LevelChip level={lv} animate={isCrit} />
                          {a.ruleId && (
                            <Typography sx={{ fontSize: 9, fontFamily: '"IBM Plex Mono"', color: 'text.disabled' }}>
                              #{a.ruleId}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Description + MITRE tags */}
                      <TableCell sx={{ py: 1.25, maxWidth: 320, minWidth: 220 }}>
                        <Typography sx={{
                          fontSize: 12.5, lineHeight: 1.4, fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: isCrit ? '#FCA5A5' : isHigh ? '#FDBA74' : 'text.primary',
                          maxWidth: 310,
                        }}>
                          {a.description || '-'}
                        </Typography>
                        {(groups.length > 0 || (mitre.tactic && mitre.tactic.length > 0)) && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, mt: 0.5 }}>
                            {groups.slice(0, 3).map(g => {
                              const gKey = Object.keys(GROUP_META).find(k => g.includes(k))
                              const gColor = gKey ? GROUP_META[gKey].color : '#6B7280'
                              return (
                                <Box key={g} sx={{
                                  px: 0.75, py: 0.15, borderRadius: '4px', fontSize: 9, fontWeight: 700,
                                  bgcolor: `${gColor}18`, color: gColor, border: `1px solid ${gColor}30`,
                                  letterSpacing: '0.03em',
                                }}>
                                  {g.replace('_', ' ')}
                                </Box>
                              )
                            })}
                            {(mitre.tactic || []).slice(0, 2).map(t => (
                              <Box key={t} sx={{
                                px: 0.75, py: 0.15, borderRadius: '4px', fontSize: 9, fontWeight: 700,
                                bgcolor: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)',
                              }}>
                                ⚔ {t}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </TableCell>

                      {/* Source (decoder) — hidden on mobile */}
                      <TableCell sx={{ py: 1.25, display: { xs: 'none', md: 'table-cell' } }}>
                        <Box sx={{
                          display: 'inline-flex', alignItems: 'center', gap: 0.5,
                          px: 0.9, py: 0.35, borderRadius: '6px',
                          bgcolor: `${decoderColor}15`, border: `1px solid ${decoderColor}30`,
                          cursor: 'pointer', transition: 'all 0.15s',
                          '&:hover': { bgcolor: `${decoderColor}25` },
                        }}
                          onClick={e => { e.stopPropagation(); setSource(a.decoderName || '') }}
                        >
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: decoderColor, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: decoderColor, whiteSpace: 'nowrap' }}>
                            {decoderLabel}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Src IP — hidden on mobile */}
                      <TableCell sx={{ py: 1.25, display: { xs: 'none', md: 'table-cell' } }}>
                        {srcip ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            <Typography sx={{
                              fontSize: 11.5, fontFamily: '"IBM Plex Mono"', fontWeight: 600,
                              color: BRAND.purpleLight, cursor: 'pointer', lineHeight: 1,
                              '&:hover': { color: BRAND.purple, textDecoration: 'underline' },
                            }}
                              onClick={e => { e.stopPropagation(); navigate(`/investigate?q=${srcip}`) }}>
                              {srcip}
                            </Typography>
                            <CopyBtn text={srcip} />
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                        )}
                        {a.sourcePort && (
                          <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"', mt: 0.2 }}>
                            :{a.sourcePort}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Country + flag — hidden on mobile */}
                      <TableCell sx={{ py: 1.25, display: { xs: 'none', md: 'table-cell' } }}>
                        {country ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {flag && (
                              <Box sx={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{flag}</Box>
                            )}
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>
                              {country}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>

                      {/* Agent — hidden on mobile */}
                      <TableCell sx={{ py: 1.25, display: { xs: 'none', md: 'table-cell' } }}>
                        {a.agentName ? (
                          <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            px: 0.8, py: 0.3, borderRadius: '6px',
                            bgcolor: 'rgba(123,91,164,0.08)', border: '1px solid rgba(123,91,164,0.15)',
                          }}>
                            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#22C55E', flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {a.agentName}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Box>

        {/* Table footer */}
        <Box sx={{
          px: 2, py: 1.25, borderTop: '1px solid', borderColor: 'divider',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(90deg, rgba(123,91,164,0.02) 0%, transparent 100%)',
        }}>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            แสดง {Math.min(alerts.length, 500).toLocaleString()} จาก {(stats?.total || alerts.length).toLocaleString()} รายการ
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[['ดาวน์โหลด CSV', 'csv'], ['ดาวน์โหลด JSON', 'json']].map(([label, fmt]) => (
              <Button key={fmt} size="small" onClick={() => handleExport(fmt as 'csv' | 'json')}
                variant="outlined"
                sx={{ fontSize: 10, py: 0.4, px: 1.25, borderRadius: '8px', color: 'text.secondary', borderColor: 'divider',
                  '&:hover': { color: BRAND.purpleLight, borderColor: BRAND.purple } }}>
                {label}
              </Button>
            ))}
          </Box>
        </Box>
      </Card>

      {/* Alert Drawer */}
      <AlertDrawer alert={selectedAlert} open={drawerOpen} onClose={() => setDrawer(false)} />
    </PageShell>
  )
}
