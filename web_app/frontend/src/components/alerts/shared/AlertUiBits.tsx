import { Box, Typography, Chip, IconButton, Tooltip, Button, useTheme } from '@mui/material'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import ShieldRoundedIcon      from '@mui/icons-material/ShieldRounded'
import RouterRoundedIcon      from '@mui/icons-material/RouterRounded'
import { useSnackbar } from 'notistack'
import { MitreAttackInfo } from '../../../types/alert'
import { BRAND, sevColor, sevLabelShort } from '../../ui/tokens'

// ── Helper components ─────────────────────────────────────────────────────────
interface LevelChipProps {
  level: string | number;
  animate?: boolean;
}

export function LevelChip({ level, animate = false }: LevelChipProps) {
  const lv = Number(level || 0)
  return (
    <Chip label={`${lv} ${sevLabelShort(lv)}`} size="small" sx={{
      height: 20, fontSize: 10, fontWeight: 800,
      bgcolor: `${sevColor(lv)}20`, color: sevColor(lv), border: `1px solid ${sevColor(lv)}35`,
      '& .MuiChip-label': { px: 0.75 },
      animation: animate && lv >= 15 ? 'pulse-critical 2.5s ease-in-out infinite' : 'none',
    }} />
  )
}

interface CopyBtnProps {
  text: string;
}

export function CopyBtn({ text }: CopyBtnProps) {
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
export function getFlag(name?: string): string {
  if (!name) return ''
  const code = CC[name] || (name.length === 2 ? name.toUpperCase() : '')
  if (code.length !== 2) return ''
  return String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - 65, 0x1F1E6 + code.charCodeAt(1) - 65)
}

interface MitreTagsProps {
  groups?: string[];
  mitre?: MitreAttackInfo;
}

export function MitreTags({ groups = [], mitre = {} }: MitreTagsProps) {
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
            bgcolor: t.includes('tactic') || mitre?.tactic?.includes(t) ? 'rgba(239,68,68,0.15)' : 'rgba(79,110,247,0.12)',
            color: t.includes('tactic') || mitre?.tactic?.includes(t) ? '#EF4444' : BRAND.primaryLight,
            border: `1px solid ${t.includes('tactic') || mitre?.tactic?.includes(t) ? '#EF444430' : 'rgba(79,110,247,0.25)'}`,
            fontFamily: '"IBM Plex Mono"',
            transition: 'all 0.2s ease',
            animation: `slideIn 0.3s cubic-bezier(0.4,0,0.2,1) ${i * 0.05}s both`,
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: t.includes('tactic') || mitre?.tactic?.includes(t)
                ? '0 4px 12px rgba(239,68,68,0.3)'
                : '0 4px 12px rgba(79,110,247,0.25)',
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

export function DrawerSection({ label, children, accent }: DrawerSectionProps) {
  const accentColor = accent || BRAND.primary
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

export function IPCard({ label, ip, port, country, onClick, accent }: IPCardProps) {
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const c = accent || BRAND.primary

  if (!ip) return (
    <Box sx={{
      flex: 1, minWidth: 0, p: 2.5, borderRadius: '16px',
      border: '2px dashed rgba(79,110,247,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 110,
      bgcolor: isDark ? 'rgba(79,110,247,0.02)' : 'rgba(79,110,247,0.01)',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: 'rgba(79,110,247,0.35)',
        bgcolor: isDark ? 'rgba(79,110,247,0.04)' : 'rgba(79,110,247,0.02)',
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

export function FeedMiniCard({ name, color, main, mainLabel, rows = [], extra }: FeedMiniCardProps) {
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

// Inline mini-sparkline (pure SVG, no lib)
interface SparklineProps {
  data?: { timestamp: string; count: number }[];
  color: string;
  height?: number;
}

export function Sparkline({ data = [], color, height = 32 }: SparklineProps) {
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
