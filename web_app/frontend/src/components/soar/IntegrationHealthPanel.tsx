import { Box, Skeleton, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import CasesRoundedIcon from '@mui/icons-material/CasesRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import NetworkCheckRoundedIcon from '@mui/icons-material/NetworkCheckRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded'
import { soarApi, IntegrationHealth } from '../../services/soarApi'

const ICON_MAP: Record<string, React.ReactNode> = {
  shield:   <ShieldRoundedIcon sx={{ fontSize: 13 }} />,
  search:   <SearchRoundedIcon sx={{ fontSize: 13 }} />,
  case:     <CasesRoundedIcon sx={{ fontSize: 13 }} />,
  soar:     <AutoFixHighRoundedIcon sx={{ fontSize: 13 }} />,
  threat:   <BugReportRoundedIcon sx={{ fontSize: 13 }} />,
  dns:      <DnsRoundedIcon sx={{ fontSize: 13 }} />,
  nac:      <NetworkCheckRoundedIcon sx={{ fontSize: 13 }} />,
  firewall: <ShieldRoundedIcon sx={{ fontSize: 13 }} />,
}

type StatusType = IntegrationHealth['status']

const STATUS_META: Record<StatusType, { color: string; dot: string; icon: React.ReactNode }> = {
  connected:      { color: '#22C55E', dot: '#22C55E', icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 11 }} /> },
  degraded:       { color: '#EAB308', dot: '#EAB308', icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 11 }} /> },
  not_configured: { color: '#64748B', dot: '#475569', icon: <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 11 }} /> },
  error:          { color: '#EF4444', dot: '#EF4444', icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 11 }} /> },
  simulation_only:{ color: '#EAB308', dot: '#EAB308', icon: <ScienceRoundedIcon sx={{ fontSize: 11 }} /> },
}

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function IntegChip({ item, isDark }: { item: IntegrationHealth; isDark: boolean }) {
  const meta = STATUS_META[item.status] ?? STATUS_META.not_configured
  const configured = item.configured

  const tooltip = [
    `${item.name}`,
    `สถานะ: ${item.label}`,
    item.simulation_only ? '⚠️ SIMULATION ONLY — ไม่มีการดำเนินการจริง' : '',
    item.note ?? '',
    item.detail?.error ? `ข้อผิดพลาด: ${item.detail.error}` : '',
  ].filter(Boolean).join('\n')

  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line', fontSize: 11 }}>{tooltip}</span>} arrow placement="top">
      <Box
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
        sx={{
          background: configured
            ? isDark ? `rgba(${hexRgb(meta.color)},0.07)` : `rgba(${hexRgb(meta.color)},0.05)`
            : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.5)',
          border: `1px solid ${configured ? `rgba(${hexRgb(meta.color)},0.25)` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(100,116,139,0.15)'}`,
          transition: 'all 0.15s',
          cursor: 'default',
          '&:hover': configured ? { transform: 'translateY(-1px)', boxShadow: `0 3px 10px rgba(${hexRgb(meta.color)},0.12)` } : {},
        }}
      >
        <Box sx={{ color: configured ? meta.color : '#475569', opacity: configured ? 1 : 0.5, display: 'flex' }}>
          {ICON_MAP[item.icon] ?? ICON_MAP.shield}
        </Box>
        <Box className="min-w-0">
          <Typography className="truncate font-medium" sx={{ fontSize: 10, lineHeight: 1.2, color: configured ? (isDark ? '#EDE9FA' : '#1A1033') : isDark ? 'rgba(255,255,255,0.35)' : 'rgba(60,40,100,0.4)' }}>
            {item.name}
          </Typography>
          <Box className="flex items-center gap-1">
            {item.simulation_only && (
              <ScienceRoundedIcon sx={{ fontSize: 9, color: '#EAB308' }} />
            )}
            <Typography className="truncate" sx={{ fontSize: 9, color: configured ? meta.color : '#64748B', lineHeight: 1 }}>
              {item.simulation_only ? 'SIMULATION' : item.label}
            </Typography>
          </Box>
        </Box>
        <Box
          className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full"
          sx={{
            background: meta.dot,
            boxShadow: item.connected ? `0 0 6px ${meta.dot}80` : 'none',
            animation: item.connected && item.status === 'connected' ? 'pulseGlow 2.5s ease-in-out infinite' : 'none',
          }}
        />
      </Box>
    </Tooltip>
  )
}

interface Props {
  compact?: boolean
}

export default function IntegrationHealthPanel({ compact = false }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  const { data, isLoading } = useQuery({
    queryKey: ['soar-health'],
    queryFn: () => soarApi.getHealth().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'
  const panelBg   = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(248,246,255,0.7)'
  const panelBord = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.1)'

  const integrations: IntegrationHealth[] = data?.integrations ?? []
  const connectedCount = integrations.filter(i => i.connected).length
  const configuredCount = integrations.filter(i => i.configured).length
  const blockMode: string = data?.block_mode ?? 'simulation_only'

  if (isLoading) {
    return (
      <Box className="rounded-xl p-3" sx={{ background: panelBg, border: `1px solid ${panelBord}` }}>
        <Box className="flex items-center gap-2 mb-3">
          <Skeleton variant="text" width={200} height={12} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
        </Box>
        <Box className="grid gap-1.5" sx={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)' }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box className="rounded-xl p-3" sx={{ background: panelBg, border: `1px solid ${panelBord}` }}>
      {/* Header */}
      <Box className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <Box className="flex items-center gap-2">
          <Typography className="text-[9px] font-bold tracking-widest" sx={{ color: textMuted }}>
            INTEGRATION HEALTH
          </Typography>
          {blockMode === 'simulation_only' && (
            <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              sx={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
              <ScienceRoundedIcon sx={{ fontSize: 10, color: '#EAB308' }} />
              <Typography sx={{ fontSize: 9, color: '#EAB308', fontWeight: 700, letterSpacing: '0.05em' }}>
                SIMULATION MODE — ไม่มีการดำเนินการจริง
              </Typography>
            </Box>
          )}
        </Box>
        <Box className="flex items-center gap-3">
          {[
            { label: 'เชื่อมต่อ', value: connectedCount, color: '#22C55E' },
            { label: 'ตั้งค่าแล้ว', value: configuredCount, color: '#38BDF8' },
            { label: 'ทั้งหมด', value: integrations.length, color: '#64748B' },
          ].map(({ label, value, color }) => (
            <Box key={label} className="flex items-center gap-1">
              <Typography className="font-mono font-bold text-[11px]" sx={{ color }}>{value}</Typography>
              <Typography sx={{ fontSize: 9, color: textMuted }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Integration chips */}
      <Box className="grid gap-1.5" sx={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
        {integrations.map(item => (
          <IntegChip key={item.id} item={item} isDark={isDark} />
        ))}
      </Box>

      {/* Legend */}
      {!compact && (
        <Box className="flex items-center gap-4 mt-2.5 pt-2"
          sx={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)'}` }}>
          {([
            ['#22C55E', 'เชื่อมต่อแล้ว'],
            ['#EAB308', 'Simulation / Degraded'],
            ['#EF4444', 'ข้อผิดพลาด'],
            ['#64748B', 'ยังไม่ตั้งค่า'],
          ] as [string, string][]).map(([color, label]) => (
            <Box key={label} className="flex items-center gap-1">
              <Box className="w-1.5 h-1.5 rounded-full" sx={{ background: color }} />
              <Typography sx={{ fontSize: 9, color: textMuted }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
