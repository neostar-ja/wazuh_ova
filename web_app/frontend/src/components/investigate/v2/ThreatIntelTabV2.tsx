import { Box, Chip, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import { SEV_COLOR } from '../../ui/tokens'

interface Props {
  loading: boolean
  data?: { ip?: string; ioc_type?: string; is_private?: boolean; feeds?: Record<string, unknown> }
  irisData?: { found?: boolean; alert_count?: number; alerts?: IrisAlert[] }
  entityType: string
  query: string
}
interface IrisAlert { alert_id?: number; alert_title?: string; severity?: string; status?: string; created?: string; iocs?: string[] }

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme()
  return (
    <Typography className="text-[9px] font-bold tracking-widest mb-3"
      sx={{ color: palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)' }}>
      {children}
    </Typography>
  )
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? SEV_COLOR.critical : score >= 50 ? SEV_COLOR.high : score >= 25 ? SEV_COLOR.medium : SEV_COLOR.low
  const R = 22; const cx = 28; const cy = 28
  const fill = (score / 100) * (2 * Math.PI * R)
  const circ = 2 * Math.PI * R

  return (
    <Box sx={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <svg width="56" height="56">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <Box className="absolute inset-0 flex items-center justify-center">
        <Typography className="font-mono font-bold leading-none" sx={{ fontSize: 13, color }}>{score}</Typography>
      </Box>
    </Box>
  )
}

export default function ThreatIntelTabV2({ loading, data, irisData, entityType, query }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(123,91,164,0.02)'
  const cardBord  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'

  const noData = entityType !== 'ip' && !irisData?.found
  if (noData) return (
    <Box className="py-16 flex flex-col items-center gap-3 animate-fade-in">
      <Box className="w-14 h-14 rounded-2xl flex items-center justify-center"
        sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)' }}>
        <PolicyRoundedIcon sx={{ fontSize: 28, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(123,91,164,0.3)' }} />
      </Box>
      <Typography sx={{ fontSize: 13, color: textMuted }}>
        Threat intelligence is available for IP addresses
      </Typography>
    </Box>
  )

  const feeds = data?.feeds as Record<string, unknown> ?? {}

  return (
    <Stack spacing={3.5} className="animate-fade-in">
      {/* IRIS Section */}
      {irisData && (
        <Box>
          <SectionLabel>DFIR-IRIS CONTEXT</SectionLabel>
          {irisData.found ? (
            <Stack spacing={1.5}>
              <Box className="flex items-center gap-2 mb-1">
                <WarningAmberRoundedIcon sx={{ color: SEV_COLOR.high, fontSize: 20 }} />
                <Typography className="font-semibold text-sm" sx={{ color: SEV_COLOR.high }}>
                  Matched in {irisData.alert_count} IRIS alert{irisData.alert_count !== 1 ? 's' : ''}
                </Typography>
              </Box>
              {(irisData.alerts ?? []).map((alert, i) => (
                <Box key={i} className="rounded-xl overflow-hidden"
                  sx={{ background: isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Box className="px-4 py-3">
                    <Box className="flex items-start justify-between gap-2 mb-2">
                      <Typography className="text-sm font-semibold flex-1"
                        sx={{ color: isDark ? '#EDE9FA' : '#1A1033' }}>
                        {alert.alert_title}
                      </Typography>
                      <Box className="flex gap-1.5 shrink-0">
                        {alert.severity && (
                          <Box className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                            sx={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                            {alert.severity}
                          </Box>
                        )}
                        {alert.status && (
                          <Box className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                            sx={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.08)',
                                  color: textSec, border: `1px solid ${cardBord}` }}>
                            {alert.status}
                          </Box>
                        )}
                      </Box>
                    </Box>
                    {alert.iocs && alert.iocs.length > 0 && (
                      <Box className="flex flex-wrap gap-1.5">
                        {alert.iocs.slice(0, 6).map((ioc, j) => (
                          <Typography key={j} className="font-mono text-[9px] px-2 py-0.5 rounded"
                            sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)', color: textMuted }}>
                            {ioc}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          ) : (
            <Box className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
              sx={{ background: isDark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircleRoundedIcon sx={{ color: SEV_COLOR.low, fontSize: 18 }} />
              <Typography className="text-sm" sx={{ color: SEV_COLOR.low }}>
                Not found in any IRIS alert or IOC
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Threat feeds */}
      {data && !data.is_private && (
        <Box>
          <SectionLabel>THREAT INTELLIGENCE FEEDS</SectionLabel>
          {Object.keys(feeds).length === 0 ? (
            <Box className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
              sx={{ background: isDark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircleRoundedIcon sx={{ color: SEV_COLOR.low, fontSize: 18 }} />
              <Typography className="text-sm" sx={{ color: SEV_COLOR.low }}>No threat indicators found for this IP</Typography>
            </Box>
          ) : (
            <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(feeds).map(([name, result]) => (
                <FeedCard key={name} name={name} result={result} isDark={isDark} />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Private IP notice */}
      {data?.is_private && (
        <Box className="py-12 flex flex-col items-center gap-3">
          <Box className="w-14 h-14 rounded-2xl flex items-center justify-center"
            sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)' }}>
            <LockRoundedIcon sx={{ fontSize: 26, color: textMuted }} />
          </Box>
          <Typography className="text-sm text-center max-w-xs" sx={{ color: textMuted }}>
            Private IP address — external threat intelligence is not applicable
          </Typography>
        </Box>
      )}
    </Stack>
  )
}

function FeedCard({ name, result, isDark }: { name: string; result: unknown; isDark: boolean }) {
  const { palette } = useTheme()
  const r      = result as Record<string, unknown>
  const status = r?.status as string ?? 'unknown'
  const score  = Number(r?.score ?? r?.confidence ?? 0)
  const verdict = String(r?.verdict ?? '')
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'

  const isConfigured = status !== 'not_configured'
  const isMalicious  = score > 50

  const accentColor = !isConfigured ? '#64748B' : (isMalicious ? SEV_COLOR.critical : SEV_COLOR.low)

  return (
    <Box className="rounded-xl overflow-hidden transition-all duration-200"
      sx={{
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'}`,
        '&:hover': {
          border: `1px solid rgba(${hexRgb(accentColor)},0.3)`,
          boxShadow: `0 4px 16px rgba(${hexRgb(accentColor)},0.08)`,
        },
      }}
    >
      {/* Card top strip */}
      <Box className="h-0.5" sx={{ background: isConfigured ? `linear-gradient(90deg,${accentColor}80,${accentColor})` : 'rgba(100,116,139,0.2)' }} />

      <Box className="p-3">
        <Box className="flex items-center justify-between mb-2">
          <Typography className="text-xs font-bold" sx={{ color: isDark ? 'rgba(255,255,255,0.75)' : '#1A1033' }}>
            {name}
          </Typography>
          {isConfigured && score > 0 ? (
            <ScoreRing score={score} />
          ) : (
            <Box className="px-2 py-0.5 rounded-full text-[9px] font-bold"
              sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)', color: textMuted }}>
              {status === 'not_configured' ? 'Not configured' : status === 'not_found' ? 'No match' : status}
            </Box>
          )}
        </Box>

        {isConfigured && score === 0 && (
          <Box className="flex items-center gap-1.5">
            <CheckCircleRoundedIcon sx={{ fontSize: 13, color: SEV_COLOR.low }} />
            <Typography className="text-[10px]" sx={{ color: SEV_COLOR.low }}>Clean</Typography>
          </Box>
        )}
        {verdict && (
          <Typography className="text-[10px] truncate mt-1" sx={{ color: textMuted }}>{verdict}</Typography>
        )}
      </Box>
    </Box>
  )
}
