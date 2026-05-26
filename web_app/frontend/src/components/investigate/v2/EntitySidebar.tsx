import { Box, Chip, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import FingerprintRoundedIcon from '@mui/icons-material/FingerprintRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import LaptopRoundedIcon from '@mui/icons-material/LaptopRounded'
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { SEV_COLOR } from '../../ui/tokens'

interface Props {
  query: string
  entityType: string
  identity?: Record<string, unknown>
  levelDist: Record<string, number>
  totalCount: number
  irisData?: { found?: boolean; alert_count?: number; alerts?: unknown[] }
  threatData?: { score?: number; is_private?: boolean }
  loading: boolean
  onDrillDown: (q: string) => void
}

interface RelatedEntry {
  value: string
  count?: number
}

const ENTITY_META = {
  ip:   { color: '#0EA5E9', label: 'IP ADDRESS',  icon: <RouterRoundedIcon sx={{ fontSize: 14 }} /> },
  mac:  { color: '#8B5CF6', label: 'MAC ADDRESS', icon: <FingerprintRoundedIcon sx={{ fontSize: 14 }} /> },
  auto: { color: '#7B5BA4', label: 'ENTITY',      icon: <TravelExploreRoundedIcon sx={{ fontSize: 14 }} /> },
} as const

function meta(t: string) {
  return (ENTITY_META as unknown as Record<string, typeof ENTITY_META.ip>)[t] ?? { color: '#7B5BA4', label: t.toUpperCase(), icon: <TravelExploreRoundedIcon sx={{ fontSize: 14 }} /> }
}

function riskScore(dist: Record<string, number>, total: number) {
  if (!total) return 0
  const w = (dist.critical ?? 0) * 10 + (dist.high ?? 0) * 6 + (dist.medium ?? 0) * 3
  return Math.round(Math.min(10, Math.log1p(w) * 1.2) * 10) / 10
}

function riskMeta(score: number) {
  if (score >= 8) return { color: SEV_COLOR.critical, label: 'CRITICAL' }
  if (score >= 6) return { color: SEV_COLOR.high,     label: 'HIGH' }
  if (score >= 4) return { color: SEV_COLOR.medium,   label: 'MEDIUM' }
  return { color: SEV_COLOR.low, label: 'LOW' }
}

function normalizeRelatedEntries(raw: unknown): RelatedEntry[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry): RelatedEntry | null => {
      if (typeof entry === 'string' || typeof entry === 'number') {
        const value = String(entry).trim()
        return value ? { value } : null
      }

      if (!entry || typeof entry !== 'object') return null

      const obj = entry as Record<string, unknown>
      const rawValue = obj.value ?? obj.name ?? obj.id
      if (rawValue == null) return null

      const value = String(rawValue).trim()
      if (!value) return null

      const count = Number(obj.count)
      return {
        value,
        count: Number.isFinite(count) ? count : undefined,
      }
    })
    .filter((entry): entry is RelatedEntry => entry !== null)
}

function RiskGauge({ score }: { score: number }) {
  const R = 40; const cx = 56; const cy = 60
  const arc  = Math.PI * R
  const fill = (score / 10) * arc
  const rm   = riskMeta(score)

  return (
    <Box className="flex flex-col items-center py-3 px-2">
      <Box sx={{ position: 'relative', width: 112, height: 72 }}>
        <svg width="112" height="72" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={SEV_COLOR.low} />
              <stop offset="50%" stopColor={SEV_COLOR.medium} />
              <stop offset="100%" stopColor={SEV_COLOR.critical} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Track */}
          <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
          {/* Fill */}
          <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none" stroke={rm.color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${fill} ${arc}`}
            filter="url(#glow)"
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const angle = Math.PI * t
            const x1 = cx - R * Math.cos(angle)
            const y1 = cy - R * Math.sin(angle)
            const x2 = cx - (R - 6) * Math.cos(angle)
            const y2 = cy - (R - 6) * Math.sin(angle)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          })}
        </svg>
        <Box className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <Typography className="font-mono font-bold leading-none" sx={{ fontSize: 22, color: rm.color }}>
            {score.toFixed(1)}
          </Typography>
          <Typography className="text-[9px] font-bold tracking-widest" sx={{ color: rm.color, mt: 0.25 }}>
            {rm.label}
          </Typography>
        </Box>
      </Box>
      <Typography className="text-[9px] font-bold tracking-widest mt-1" sx={{ color: 'rgba(255,255,255,0.2)' }}>
        RISK SCORE
      </Typography>
    </Box>
  )
}

const SEV_ROWS = [
  { key: 'critical', label: 'Critical', color: SEV_COLOR.critical },
  { key: 'high',     label: 'High',     color: SEV_COLOR.high },
  { key: 'medium',   label: 'Medium',   color: SEV_COLOR.medium },
  { key: 'low',      label: 'Low',      color: SEV_COLOR.low },
]

export default function EntitySidebar({ query, entityType, identity, levelDist, totalCount, irisData, threatData, loading, onDrillDown }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const m   = meta(entityType)
  const score = riskScore(levelDist, totalCount)

  const relatedIPs    = normalizeRelatedEntries(identity?.ips)
  const relatedMACs   = normalizeRelatedEntries(identity?.macs)
  const relatedUsers  = normalizeRelatedEntries(identity?.users)
  const relatedAgents = normalizeRelatedEntries(identity?.agents)

  const cardBg = isDark ? 'rgba(18,14,33,0.92)' : 'rgba(255,255,255,0.95)'
  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,100,0.5)'
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'

  return (
    <Box
      className="animate-slide-in-left rounded-xl overflow-hidden"
      sx={{
        background: cardBg,
        border: `1px solid ${isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.12)'}`,
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(123,91,164,0.1)',
        position: { lg: 'sticky' }, top: { lg: 72 },
      }}
    >
      {/* Entity header */}
      <Box sx={{
        p: 2,
        background: `linear-gradient(135deg, rgba(${hexRgb(m.color)},0.12) 0%, transparent 100%)`,
        borderBottom: `1px solid ${divider}`,
      }}>
        <Box className="flex items-center gap-2 mb-2">
          <Box className="flex items-center justify-center w-6 h-6 rounded-lg"
            sx={{ background: `rgba(${hexRgb(m.color)},0.15)`, color: m.color }}>
            {m.icon}
          </Box>
          <Typography className="text-[9px] font-bold tracking-widest" sx={{ color: m.color }}>
            {m.label}
          </Typography>
          <Box className="ml-auto w-2 h-2 rounded-full animate-pulse-slow"
            sx={{ background: m.color, boxShadow: `0 0 8px ${m.color}80` }} />
        </Box>
        {loading ? (
          <Skeleton variant="text" width="85%" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        ) : (
          <Typography className="font-mono text-[12px] font-semibold break-all leading-relaxed"
            sx={{ color: isDark ? '#EDE9FA' : '#1A1033' }}>
            {query}
          </Typography>
        )}
      </Box>

      {/* Risk gauge — dark mode only (hard to see in light) */}
      <Box sx={{ borderBottom: `1px solid ${divider}`, background: isDark ? 'transparent' : 'rgba(248,246,255,0.6)' }}>
        {loading ? (
          <Box className="flex justify-center py-4">
            <Skeleton variant="rectangular" width={112} height={60} sx={{ borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)' }} />
          </Box>
        ) : isDark ? (
          <RiskGauge score={score} />
        ) : (
          <Box className="flex items-center justify-between px-4 py-3">
            <Typography sx={{ fontSize: 11, color: textMuted, fontWeight: 600 }}>Risk Score</Typography>
            <Box className="flex items-center gap-1.5">
              <Typography className="font-mono font-bold text-base" sx={{ color: riskMeta(score).color }}>{score.toFixed(1)}</Typography>
              <Chip label={riskMeta(score).label} size="small"
                sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: `rgba(${hexRgb(riskMeta(score).color)},0.12)`, color: riskMeta(score).color, border: 'none' }} />
            </Box>
          </Box>
        )}
      </Box>

      {/* Severity breakdown */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${divider}` }}>
        <Typography className="text-[9px] font-bold tracking-widest mb-2.5" sx={{ color: textMuted }}>EVENT BREAKDOWN</Typography>
        <Stack spacing={1.25}>
          {SEV_ROWS.map(({ key, label, color }) => {
            const count = levelDist[key] ?? 0
            const total = Object.values(levelDist).reduce((a, b) => a + b, 0)
            const pct   = total > 0 ? (count / total) * 100 : 0
            return (
              <Box key={key}>
                <Box className="flex items-center justify-between mb-1">
                  <Box className="flex items-center gap-1.5">
                    <Box className="w-1.5 h-1.5 rounded-sm" sx={{ background: color }} />
                    <Typography sx={{ fontSize: 11, color: textSecondary }}>{label}</Typography>
                  </Box>
                  <Typography className="font-mono text-[11px]" sx={{ color: count > 0 ? color : textMuted }}>
                    {loading ? '…' : count.toLocaleString()}
                  </Typography>
                </Box>
                <Box className="h-1 rounded-full overflow-hidden" sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)' }}>
                  <Box className="h-full rounded-full transition-all duration-700"
                    sx={{ width: `${pct}%`, background: color }} />
                </Box>
              </Box>
            )
          })}
        </Stack>
      </Box>

      {/* Integrations */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${divider}` }}>
        <Typography className="text-[9px] font-bold tracking-widest mb-2.5" sx={{ color: textMuted }}>INTEGRATIONS</Typography>
        <Stack spacing={1}>
          <IntegrationRow label="DFIR-IRIS" loading={!irisData}
            status={irisData?.found ? 'danger' : 'success'}
            badge={irisData?.found ? `${irisData.alert_count} alerts` : 'Clean'} />
          {entityType === 'ip' && threatData && (
            <IntegrationRow label="Threat Intel" loading={false}
              status={threatData.is_private ? 'neutral' : ((threatData.score ?? 0) > 50 ? 'danger' : 'success')}
              badge={threatData.is_private ? 'Private IP' : ((threatData.score != null) ? `Score ${threatData.score}` : 'Clean')} />
          )}
        </Stack>
      </Box>

      {/* Related entities */}
      {(relatedIPs.length + relatedMACs.length + relatedUsers.length + relatedAgents.length) > 0 && (
        <Box sx={{ p: 2 }}>
          <Typography className="text-[9px] font-bold tracking-widest mb-2.5" sx={{ color: textMuted }}>RELATED ENTITIES</Typography>
          <Stack spacing={0.75}>
            {relatedIPs.slice(0, 4).map(ip =>
              <RelatedChip key={ip.value} entry={ip} color="#0EA5E9" onClick={() => onDrillDown(ip.value)} isDark={isDark} />
            )}
            {relatedMACs.slice(0, 3).map(mac =>
              <RelatedChip key={mac.value} entry={mac} color="#8B5CF6" onClick={() => onDrillDown(mac.value)} isDark={isDark} />
            )}
            {relatedUsers.slice(0, 3).map(u =>
              <RelatedChip key={u.value} entry={u} color="#F59E0B" onClick={() => onDrillDown(u.value)} isDark={isDark} />
            )}
            {relatedAgents.slice(0, 2).map(a =>
              <RelatedChip key={a.value} entry={a} color="#22C55E" onClick={() => onDrillDown(a.value)} isDark={isDark} />
            )}
          </Stack>
        </Box>
      )}
    </Box>
  )
}

function IntegrationRow({ label, loading, status, badge }: {
  label: string; loading: boolean; status: 'danger' | 'success' | 'neutral'; badge: string
}) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const colors = { danger: '#EF4444', success: '#22C55E', neutral: '#64748B' }
  const c = colors[status]
  return (
    <Box className="flex items-center justify-between">
      <Typography sx={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.6)' }}>{label}</Typography>
      {loading ? (
        <Skeleton variant="rounded" width={60} height={16} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
      ) : (
        <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
          sx={{ background: `rgba(${hexRgb(c)},0.12)`, color: c, border: `1px solid rgba(${hexRgb(c)},0.2)` }}>
          <Box className="w-1.5 h-1.5 rounded-full" sx={{ background: c }} />
          {badge}
        </Box>
      )}
    </Box>
  )
}

function RelatedChip({ entry, color, onClick, isDark }: { entry: RelatedEntry; color: string; onClick: () => void; isDark: boolean }) {
  return (
    <Tooltip title={`Investigate: ${entry.value}`} placement="right" arrow>
      <Box onClick={onClick}
        className="flex items-center gap-2 px-2.5 py-1 rounded-lg cursor-pointer transition-all duration-150 group"
        sx={{
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}`,
          '&:hover': {
            background: `rgba(${hexRgb(color)},0.08)`,
            borderColor: `rgba(${hexRgb(color)},0.25)`,
          },
        }}
      >
        <Box className="w-1.5 h-1.5 rounded-full shrink-0" sx={{ background: color }} />
        <Typography className="font-mono text-[10px] truncate flex-1"
          sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,40,100,0.65)' }}>
          {entry.value}
        </Typography>
        {entry.count != null && entry.count > 1 && (
          <Typography className="font-mono text-[9px] shrink-0"
            sx={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(60,40,100,0.35)' }}>
            {entry.count.toLocaleString()}
          </Typography>
        )}
        <OpenInNewRoundedIcon className="opacity-0 group-hover:opacity-40 transition-opacity shrink-0"
          sx={{ fontSize: 11, color: isDark ? '#fff' : '#333' }} />
      </Box>
    </Tooltip>
  )
}

function hexRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
