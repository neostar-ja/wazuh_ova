import { Box, Chip, Skeleton, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts'
import { BRAND, CHART_TIP_STYLE, PIE_COLORS, fmtN } from '../../ui/tokens'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'

interface NetflowData {
  ip?: string; total?: number
  top_dst_ips?: Bucket[]; top_src_ips?: Bucket[]; top_dstports?: Bucket[]
  proto_dist?: ProtoBucket[]; conn_state?: Bucket[]; zone_src?: Bucket[]
  zone_dst?: Bucket[]; rule_names?: Bucket[]; decoders?: Bucket[]; geo_countries?: Bucket[]
}
interface Bucket { value: string; count: number }
interface ProtoBucket { value: string; raw: string; count: number }

interface Props {
  loading: boolean; data?: NetflowData; entityType: string; onDrillDown: (ip: string) => void
}

const PORT_HINTS: Record<string, string> = {
  '80': 'HTTP', '443': 'HTTPS', '22': 'SSH', '23': 'Telnet', '21': 'FTP',
  '25': 'SMTP', '53': 'DNS', '3306': 'MySQL', '3389': 'RDP', '5432': 'PG',
  '6379': 'Redis', '27017': 'Mongo', '8080': 'HTTP-Alt', '8443': 'HTTPS-Alt',
}

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  const { palette } = useTheme()
  return (
    <Box className="flex items-center gap-1.5 mb-3">
      {icon && <Box sx={{ color: palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(60,40,100,0.3)', '& svg': { fontSize: 14 } }}>{icon}</Box>}
      <Typography className="text-[9px] font-bold tracking-widest"
        sx={{ color: palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)' }}>
        {children}
      </Typography>
    </Box>
  )
}

export default function NetworkTab({ loading, data, entityType, onDrillDown }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const trackBg   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(123,91,164,0.02)'
  const cardBord  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.1)'

  const tipStyle = isDark ? CHART_TIP_STYLE : {
    background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(123,91,164,0.2)',
    borderRadius: 8, fontSize: 12, color: '#1A1033',
  }

  if (loading) return (
    <Stack spacing={2.5} className="animate-fade-in">
      {[180, 120, 180].map((h, i) => (
        <Skeleton key={i} variant="rectangular" height={h} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />
      ))}
    </Stack>
  )

  if (!data || (data.total ?? 0) === 0) return (
    <Box className="py-16 flex flex-col items-center justify-center gap-3 animate-fade-in">
      <Box className="w-14 h-14 rounded-2xl flex items-center justify-center"
        sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)' }}>
        <RouterRoundedIcon sx={{ fontSize: 28, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(123,91,164,0.3)' }} />
      </Box>
      <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,100,0.5)', fontSize: 13 }}>
        {entityType !== 'ip' ? 'Network analysis is available for IP addresses only' : 'No network traffic found for this IP'}
      </Typography>
    </Box>
  )

  const topDst    = data.top_dst_ips  ?? []
  const topSrc    = data.top_src_ips  ?? []
  const topPorts  = data.top_dstports ?? []
  const proto     = data.proto_dist   ?? []
  const connState = data.conn_state   ?? []
  const zoneSrc   = data.zone_src     ?? []
  const zoneDst   = data.zone_dst     ?? []
  const ruleNames = data.rule_names   ?? []
  const geo       = data.geo_countries ?? []

  return (
    <Stack spacing={3.5} className="animate-fade-in">
      {/* Summary pills */}
      <Box className="flex flex-wrap gap-2">
        <StatPill label="Traffic Events" value={fmtN(data.total)} color={BRAND.purple} isDark={isDark} />
        {proto.length > 0 && <StatPill label="Primary Protocol" value={proto[0]?.value ?? '—'} color="#0EA5E9" isDark={isDark} />}
        {connState.length > 0 && <StatPill label="Conn State" value={connState[0]?.value ?? '—'} color="#22C55E" isDark={isDark} />}
        {ruleNames.length > 0 && <StatPill label="FW Policy" value={ruleNames[0]?.value ?? '—'} color="#F59E0B" isDark={isDark} />}
        {topPorts.length > 0 && <StatPill label="Top Port" value={`${topPorts[0]?.value} (${PORT_HINTS[topPorts[0]?.value ?? ''] ?? ''})`} color="#EC4899" isDark={isDark} />}
      </Box>

      {/* Top connections */}
      {(topDst.length > 0 || topSrc.length > 0) && (
        <Box>
          <SectionLabel icon={<RouterRoundedIcon />}>TOP CONNECTIONS</SectionLabel>
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topDst.length > 0 && (
              <ConnectionList title={`Destinations from ${data.ip}`} items={topDst} dir="→"
                color="#0EA5E9" onDrillDown={onDrillDown} isDark={isDark} />
            )}
            {topSrc.length > 0 && (
              <ConnectionList title={`Sources to ${data.ip}`} items={topSrc} dir="←"
                color="#22C55E" onDrillDown={onDrillDown} isDark={isDark} />
            )}
          </Box>
        </Box>
      )}

      {/* Protocol + ports */}
      <Box className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {proto.length > 0 && (
          <Box>
            <SectionLabel>PROTOCOL DISTRIBUTION</SectionLabel>
            <Box className="rounded-xl p-3" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={proto} dataKey="count" nameKey="value"
                    cx="50%" cy="50%" outerRadius={58} innerRadius={28} paddingAngle={4}>
                    {proto.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                  </Pie>
                  <RTooltip contentStyle={tipStyle} formatter={(v) => fmtN(Number(v ?? 0))} />
                  <Legend iconSize={8} iconType="circle"
                    wrapperStyle={{ fontSize: 10, color: textSec }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        )}

        {topPorts.length > 0 && (
          <Box>
            <SectionLabel>TOP DESTINATION PORTS</SectionLabel>
            <Stack spacing={1}>
              {topPorts.slice(0, 8).map(p => {
                const hint = PORT_HINTS[p.value]
                const max  = topPorts[0]?.count ?? 1
                return (
                  <Box key={p.value} className="flex items-center gap-2">
                    <Box className="font-mono text-[11px] font-semibold text-right shrink-0" style={{ minWidth: 36, color: BRAND.purple }}>
                      {p.value}
                    </Box>
                    <Box className="text-[9px] shrink-0" style={{ minWidth: 46, color: textMuted }}>
                      {hint ?? ''}
                    </Box>
                    <Box className="flex-1 h-1.5 rounded-full overflow-hidden" sx={{ background: trackBg }}>
                      <Box className="h-full rounded-full transition-all duration-700"
                        sx={{ width: `${(p.count / max) * 100}%`, background: `linear-gradient(90deg,${BRAND.purple}99,${BRAND.purple})` }} />
                    </Box>
                    <Typography className="font-mono text-[10px] shrink-0" sx={{ color: textMuted, minWidth: 40, textAlign: 'right' }}>
                      {fmtN(p.count)}
                    </Typography>
                  </Box>
                )
              })}
            </Stack>
          </Box>
        )}
      </Box>

      {/* Zones + policies */}
      {(zoneSrc.length > 0 || zoneDst.length > 0 || ruleNames.length > 0) && (
        <Box>
          <SectionLabel icon={<SecurityRoundedIcon />}>FIREWALL ZONES & POLICIES</SectionLabel>
          <Box className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {zoneSrc.length > 0 && <ZoneCard title="Source Zones" items={zoneSrc} color="#0EA5E9" isDark={isDark} />}
            {zoneDst.length > 0 && <ZoneCard title="Destination Zones" items={zoneDst} color="#22C55E" isDark={isDark} />}
            {ruleNames.length > 0 && <ZoneCard title="FW Policies" items={ruleNames} color="#F59E0B" isDark={isDark} />}
          </Box>
        </Box>
      )}

      {/* Geo */}
      {geo.length > 0 && (
        <Box>
          <SectionLabel icon={<PublicRoundedIcon />}>GEOGRAPHIC ORIGINS</SectionLabel>
          <Box className="flex flex-wrap gap-1.5">
            {geo.map(c => (
              <Chip key={c.value}
                label={`${c.value}  ${fmtN(c.count)}`}
                size="small"
                sx={{ fontSize: 10, height: 24,
                  bgcolor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(123,91,164,0.08)',
                  color:   isDark ? '#C4B5FD' : '#5A3E85',
                  border: `1px solid ${isDark ? 'rgba(139,92,246,0.2)' : 'rgba(123,91,164,0.15)'}`,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Stack>
  )
}

function StatPill({ label, value, color, isDark }: { label: string; value: string | number; color: string; isDark: boolean }) {
  return (
    <Box className="flex flex-col px-3 py-2 rounded-xl"
      sx={{
        background: isDark ? `rgba(${hexRgb(color)},0.08)` : `rgba(${hexRgb(color)},0.06)`,
        border: `1px solid rgba(${hexRgb(color)},0.2)`,
      }}>
      <Typography className="text-[9px] font-bold tracking-wide mb-0.5" sx={{ color: `rgba(${hexRgb(color)},0.7)` }}>{label}</Typography>
      <Typography className="font-mono font-bold text-sm leading-none" sx={{ color }}>{value}</Typography>
    </Box>
  )
}

function ConnectionList({ title, items, dir, color, onDrillDown, isDark }: {
  title: string; items: Bucket[]; dir: '→' | '←'; color: string; onDrillDown: (v: string) => void; isDark: boolean
}) {
  const max = items[0]?.count ?? 1
  return (
    <Box className="rounded-xl overflow-hidden"
      sx={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(123,91,164,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}` }}>
      <Box className="px-3 py-2" sx={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}` }}>
        <Typography className="text-[10px] font-semibold truncate"
          sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(60,40,100,0.6)' }}>{title}</Typography>
      </Box>
      {items.slice(0, 8).map(item => (
        <Box key={item.value}
          onClick={() => onDrillDown(item.value)}
          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer group transition-colors duration-100"
          sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)'}`, '&:hover': { background: isDark ? 'rgba(123,91,164,0.1)' : 'rgba(123,91,164,0.05)' } }}>
          <Typography className="text-[9px] shrink-0 font-mono" sx={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(60,40,100,0.3)' }}>{dir}</Typography>
          <Typography className="font-mono text-[11px] flex-1 truncate" sx={{ color }}>
            {item.value}
          </Typography>
          <Box className="flex items-center gap-1 shrink-0">
            <Box className="w-10 h-1 rounded-full overflow-hidden" sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)' }}>
              <Box className="h-full rounded-full" sx={{ width: `${(item.count / max) * 100}%`, background: color }} />
            </Box>
            <Typography className="font-mono text-[9px]" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)', minWidth: 32, textAlign: 'right' }}>
              {fmtN(item.count)}
            </Typography>
          </Box>
          <OpenInNewRoundedIcon className="opacity-0 group-hover:opacity-30 transition-opacity shrink-0"
            sx={{ fontSize: 11, color: isDark ? '#fff' : '#333' }} />
        </Box>
      ))}
    </Box>
  )
}

function ZoneCard({ title, items, color, isDark }: { title: string; items: Bucket[]; color: string; isDark: boolean }) {
  const max = items[0]?.count ?? 1
  return (
    <Box className="rounded-xl overflow-hidden"
      sx={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(123,91,164,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}` }}>
      <Box className="px-3 py-2 flex items-center gap-1.5"
        sx={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}` }}>
        <Box className="w-1.5 h-1.5 rounded-full" sx={{ background: color }} />
        <Typography className="text-[10px] font-semibold"
          sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.65)' }}>{title}</Typography>
      </Box>
      {items.slice(0, 5).map(z => (
        <Box key={z.value} className="flex items-center gap-2 px-3 py-1.5"
          sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)'}` }}>
          <Typography className="text-[11px] flex-1 truncate"
            sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)' }}>{z.value}</Typography>
          <Box className="w-8 h-1 rounded-full overflow-hidden" sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)' }}>
            <Box className="h-full rounded-full" sx={{ width: `${(z.count / max) * 100}%`, background: color }} />
          </Box>
          <Typography className="font-mono text-[9px] shrink-0" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)', minWidth: 32, textAlign: 'right' }}>
            {fmtN(z.count)}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
