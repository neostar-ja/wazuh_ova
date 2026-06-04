import { Box, Skeleton, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import CasesRoundedIcon from '@mui/icons-material/CasesRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import NetworkCheckRoundedIcon from '@mui/icons-material/NetworkCheckRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded'

type SourceStatusType = 'online' | 'configured' | 'not_configured' | 'no_data' | 'error'

interface DataSource {
  id: string
  name: string
  vendor: string
  icon: string
  configured: boolean
  status: SourceStatusType
  label: string
  event_count_24h?: number
  event_count_7d?: number
}

interface CoverageItem {
  has_data: boolean
  count: number
  label: string
  last_seen?: string
}

interface Props {
  sources?: DataSource[]
  coverage?: Record<string, CoverageItem>
  loading?: boolean
  query?: string
}

const ICON_MAP: Record<string, React.ReactNode> = {
  shield:   <ShieldRoundedIcon sx={{ fontSize: 13 }} />,
  search:   <SearchRoundedIcon sx={{ fontSize: 13 }} />,
  dns:      <DnsRoundedIcon sx={{ fontSize: 13 }} />,
  dhcp:     <RouterRoundedIcon sx={{ fontSize: 13 }} />,
  nac:      <NetworkCheckRoundedIcon sx={{ fontSize: 13 }} />,
  threat:   <BugReportRoundedIcon sx={{ fontSize: 13 }} />,
  scan:     <SecurityRoundedIcon sx={{ fontSize: 13 }} />,
  case:     <CasesRoundedIcon sx={{ fontSize: 13 }} />,
  soar:     <AutoFixHighRoundedIcon sx={{ fontSize: 13 }} />,
  firewall: <ShieldRoundedIcon sx={{ fontSize: 13 }} />,
}

const STATUS_META: Record<SourceStatusType, { color: string; bg: string; icon: React.ReactNode }> = {
  online:         { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',  icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 11 }} /> },
  configured:     { color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 11 }} /> },
  no_data:        { color: '#EAB308', bg: 'rgba(234,179,8,0.1)',  icon: <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 11 }} /> },
  not_configured: { color: '#64748B', bg: 'rgba(100,116,139,0.1)',icon: <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 11 }} /> },
  error:          { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 11 }} /> },
}

function hexRgb(hex: string): string {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function SourceChip({ source, coverage, isDark }: {
  source: DataSource
  coverage?: CoverageItem
  isDark: boolean
}) {
  const meta  = STATUS_META[source.status] ?? STATUS_META.not_configured
  const icon  = ICON_MAP[source.icon] ?? ICON_MAP.shield
  const hasCov = coverage?.has_data

  const borderColor = hasCov
    ? `rgba(${hexRgb(meta.color)},0.45)`
    : source.configured
      ? `rgba(${hexRgb(meta.color)},0.2)`
      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(100,116,139,0.15)'

  const bgColor = hasCov
    ? `rgba(${hexRgb(meta.color)},0.08)`
    : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.5)'

  const tooltip = hasCov
    ? `${source.name}: พบข้อมูล ${coverage!.count} รายการ\nล่าสุด: ${coverage!.last_seen ? new Date(coverage!.last_seen).toLocaleString('th-TH') : '—'}`
    : source.configured
      ? `${source.name}: ไม่พบข้อมูลสำหรับ entity นี้`
      : `${source.name}: ยังไม่ได้เชื่อมต่อ`

  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} arrow placement="top">
      <Box
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-default transition-all duration-200"
        sx={{
          background: bgColor,
          border: `1px solid ${borderColor}`,
          minWidth: 0,
          '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 3px 10px rgba(${hexRgb(meta.color)},0.12)` },
        }}
      >
        <Box sx={{ color: hasCov ? meta.color : source.configured ? meta.color : '#64748B', opacity: source.configured ? 1 : 0.5, display: 'flex' }}>
          {icon}
        </Box>
        <Box className="min-w-0">
          <Typography
            className="truncate font-medium"
            sx={{ fontSize: 10, lineHeight: 1.2, color: hasCov ? (isDark ? '#EDE9FA' : '#1A1033') : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,100,0.45)' }}
          >
            {source.name}
          </Typography>
          <Typography className="truncate" sx={{ fontSize: 9, color: hasCov ? meta.color : '#64748B', lineHeight: 1 }}>
            {hasCov ? `${coverage!.count} events` : source.label}
          </Typography>
        </Box>
        <Box
          className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full"
          sx={{ background: hasCov ? meta.color : source.configured ? meta.color : '#374151', boxShadow: hasCov ? `0 0 6px ${meta.color}80` : 'none' }}
        />
      </Box>
    </Tooltip>
  )
}

export default function DataSourceCoveragePanel({ sources, coverage, loading, query }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  const panelBg   = isDark ? 'rgba(18,14,33,0.7)' : 'rgba(248,246,255,0.8)'
  const panelBord = isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.1)'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'

  const configured  = sources?.filter(s => s.configured).length ?? 0
  const withData    = sources?.filter(s => s.status === 'online' || s.status === 'no_data').length ?? 0

  if (loading) {
    return (
      <Box className="rounded-xl p-3" sx={{ background: panelBg, border: `1px solid ${panelBord}` }}>
        <Box className="flex items-center gap-2 mb-3">
          <Skeleton variant="text" width={160} height={14} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
        </Box>
        <Box className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-14 gap-1.5">
          {Array.from({ length: 13 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)' }} />
          ))}
        </Box>
      </Box>
    )
  }

  if (!sources?.length) return null

  return (
    <Box className="rounded-xl p-3" sx={{ background: panelBg, border: `1px solid ${panelBord}` }}>
      {/* Header row */}
      <Box className="flex items-center justify-between mb-3">
        <Box className="flex items-center gap-2">
          <Typography className="text-[9px] font-bold tracking-widest" sx={{ color: textMuted }}>
            DATA SOURCE COVERAGE
          </Typography>
          {query && (
            <Typography className="font-mono text-[9px] px-2 py-0.5 rounded-full"
              sx={{ background: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)', color: isDark ? '#C4B5FD' : '#7B5BA4' }}>
              {query}
            </Typography>
          )}
        </Box>
        <Box className="flex items-center gap-3">
          {[
            { label: 'เชื่อมต่อแล้ว', value: configured, color: '#38BDF8' },
            { label: 'มีข้อมูล', value: withData, color: '#22C55E' },
            { label: 'ทั้งหมด', value: sources.length, color: '#64748B' },
          ].map(({ label, value, color }) => (
            <Box key={label} className="flex items-center gap-1">
              <Typography className="font-mono font-bold text-[11px]" sx={{ color }}>{value}</Typography>
              <Typography sx={{ fontSize: 9, color: textMuted }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Source chips grid */}
      <Box className="grid gap-1.5"
        sx={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
        {sources.map(src => (
          <SourceChip
            key={src.id}
            source={src}
            coverage={coverage?.[src.id]}
            isDark={isDark}
          />
        ))}
      </Box>

      {/* Legend */}
      <Box className="flex items-center gap-4 mt-2.5 pt-2"
        sx={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.06)'}` }}>
        {([
          ['#22C55E', 'มีข้อมูล'],
          ['#38BDF8', 'พร้อมใช้งาน'],
          ['#EAB308', 'ไม่พบข้อมูล'],
          ['#64748B', 'ยังไม่เชื่อมต่อ'],
        ] as [string, string][]).map(([color, label]) => (
          <Box key={label} className="flex items-center gap-1">
            <Box className="w-1.5 h-1.5 rounded-full" sx={{ background: color }} />
            <Typography sx={{ fontSize: 9, color: textMuted }}>{label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
