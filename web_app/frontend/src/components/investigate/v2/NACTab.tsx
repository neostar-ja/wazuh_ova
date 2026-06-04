import { Box, Chip, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import NetworkCheckRoundedIcon from '@mui/icons-material/NetworkCheckRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import type { NACResult } from '../../../types/investigate'

interface Props {
  data?: NACResult
  loading: boolean
  onDrillDown: (q: string) => void
}

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme()
  return (
    <Typography className="text-[9px] font-bold tracking-widest mb-2"
      sx={{ color: palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)' }}>
      {children}
    </Typography>
  )
}

function AuthResultBadge({ result }: { result?: string }) {
  const r = (result || '').toLowerCase()
  let color = '#64748B'
  if (r.includes('success') || r.includes('accept') || r === 'pass') color = '#22C55E'
  else if (r.includes('fail') || r.includes('reject') || r.includes('deny')) color = '#EF4444'
  else if (r.includes('quarantine') || r.includes('block')) color = '#F17422'
  else if (r.includes('timeout')) color = '#EAB308'
  return (
    <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full"
      sx={{ background: `rgba(${hexRgb(color)},0.12)`, border: `1px solid rgba(${hexRgb(color)},0.2)` }}>
      {(r.includes('success') || r.includes('accept') || r === 'pass')
        ? <LockOpenRoundedIcon sx={{ fontSize: 10, color }} />
        : <LockRoundedIcon sx={{ fontSize: 10, color }} />
      }
      <Typography className="font-bold text-[9px]" sx={{ color }}>{result || '—'}</Typography>
    </Box>
  )
}

export default function NACTab({ data, loading, onDrillDown }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const rowHover  = isDark ? 'rgba(123,91,164,0.07)' : 'rgba(123,91,164,0.04)'
  const rowBord   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)'

  if (loading) {
    return (
      <Stack spacing={2} className="animate-fade-in">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={72} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />
        ))}
      </Stack>
    )
  }

  if (!data || data.count === 0) {
    return (
      <Box className="flex flex-col items-center justify-center py-14 gap-3">
        <Box className="w-14 h-14 rounded-2xl flex items-center justify-center"
          sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)' }}>
          <NetworkCheckRoundedIcon sx={{ fontSize: 26, color: 'rgba(123,91,164,0.4)' }} />
        </Box>
        <Typography sx={{ fontSize: 12, color: textMuted, textAlign: 'center', maxWidth: 320 }}>
          ไม่พบ NAC log สำหรับ entity นี้
          <br />
          ตรวจสอบว่า Huawei Agile Controller ส่ง syslog มายัง Wazuh แล้วหรือยัง
        </Typography>
      </Box>
    )
  }

  const totalAuth    = data.auth_results.reduce((s, r) => s + r.count, 0)
  const successCount = data.auth_results.find(r => r.result.toLowerCase().includes('success') || r.result.toLowerCase().includes('accept'))?.count ?? 0
  const failCount    = data.auth_results.find(r => r.result.toLowerCase().includes('fail') || r.result.toLowerCase().includes('reject'))?.count ?? 0

  return (
    <Stack spacing={3} className="animate-fade-in">
      {/* Posture fail alert */}
      {data.has_posture_fail && (
        <Box className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
          sx={{ background: 'rgba(241,116,34,0.07)', border: '1px solid rgba(241,116,34,0.25)' }}>
          <WarningAmberRoundedIcon sx={{ fontSize: 16, color: '#F17422', mt: 0.2 }} />
          <Box>
            <Typography className="font-semibold text-[11px]" sx={{ color: '#F17422' }}>
              พบ Posture Failure หรือ Quarantine
            </Typography>
            <Typography sx={{ fontSize: 10, color: textMuted }}>
              อุปกรณ์ไม่ผ่าน compliance check — อาจขาด patch, AV ไม่ active, หรือมี policy violation
            </Typography>
          </Box>
        </Box>
      )}

      {/* Summary metrics */}
      <Box className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'NAC Events',    value: data.count,                  color: '#8B5CF6' },
          { label: 'Auth Success',  value: successCount,                color: '#22C55E' },
          { label: 'Auth Failures', value: failCount,                   color: '#EF4444' },
          { label: 'Quarantine',    value: data.quarantine_events.length, color: '#F17422' },
        ].map(m => (
          <Box key={m.label}
            className="rounded-xl px-3 py-2.5"
            sx={{ background: `rgba(${hexRgb(m.color)},0.07)`, border: `1px solid rgba(${hexRgb(m.color)},0.18)` }}>
            <Typography className="font-mono font-bold text-base" sx={{ color: m.color }}>{m.value}</Typography>
            <Typography sx={{ fontSize: 9, color: textMuted }}>{m.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Auth result breakdown */}
      {data.auth_results.length > 0 && (
        <Box>
          <SectionLabel>AUTHENTICATION RESULTS</SectionLabel>
          <Stack spacing={1.5}>
            {data.auth_results.map(r => {
              const rl = r.result.toLowerCase()
              const color = rl.includes('success') || rl.includes('accept') ? '#22C55E'
                : rl.includes('fail') || rl.includes('reject') ? '#EF4444'
                : rl.includes('quarantine') || rl.includes('block') ? '#F17422'
                : '#64748B'
              const pct = totalAuth > 0 ? (r.count / totalAuth) * 100 : 0
              return (
                <Box key={r.result}>
                  <Box className="flex items-center justify-between mb-1">
                    <Box className="flex items-center gap-2">
                      <Box className="w-2 h-2 rounded-sm" sx={{ background: color }} />
                      <Typography sx={{ fontSize: 11, color: textSec }}>{r.result}</Typography>
                    </Box>
                    <Box className="flex items-center gap-2">
                      <Typography className="font-mono text-[11px]" sx={{ color }}>{r.count.toLocaleString()}</Typography>
                      <Typography sx={{ fontSize: 10, color: textMuted }}>{pct.toFixed(0)}%</Typography>
                    </Box>
                  </Box>
                  <Box className="h-1.5 rounded-full overflow-hidden"
                    sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)' }}>
                    <Box className="h-full rounded-full transition-all duration-700"
                      sx={{ width: `${pct}%`, background: `linear-gradient(90deg,${color}99,${color})` }} />
                  </Box>
                </Box>
              )
            })}
          </Stack>
        </Box>
      )}

      {/* Quarantine events */}
      {data.quarantine_events.length > 0 && (
        <Box>
          <SectionLabel>QUARANTINE / BLOCK EVENTS ({data.quarantine_events.length})</SectionLabel>
          <Box className="rounded-xl overflow-hidden"
            sx={{ border: '1px solid rgba(241,116,34,0.2)' }}>
            <Box className="grid px-3 py-1.5"
              sx={{ gridTemplateColumns: '140px 1fr 1fr 80px', background: 'rgba(241,116,34,0.06)' }}>
              {['TIME', 'IP / MAC', 'USER', 'ACTION'].map(h => (
                <Typography key={h} className="text-[9px] font-bold tracking-wider" sx={{ color: textMuted }}>{h}</Typography>
              ))}
            </Box>
            {data.quarantine_events.map((q, i) => (
              <Box key={i}
                className="grid px-3 py-2 transition-colors"
                sx={{ gridTemplateColumns: '140px 1fr 1fr 80px', borderTop: `1px solid ${rowBord}`, '&:hover': { background: rowHover } }}>
                <Typography className="font-mono text-[10px]" sx={{ color: textMuted }}>
                  {q.timestamp ? new Date(q.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </Typography>
                <Box>
                  {q.ip && (
                    <Typography
                      className="font-mono text-[11px] cursor-pointer"
                      sx={{ color: '#38BDF8', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => onDrillDown(q.ip!)}>{q.ip}</Typography>
                  )}
                  {q.mac && (
                    <Typography
                      className="font-mono text-[10px] cursor-pointer"
                      sx={{ color: '#8B5CF6', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => onDrillDown(q.mac!)}>{q.mac}</Typography>
                  )}
                </Box>
                {q.user ? (
                  <Box className="flex items-center gap-1">
                    <PersonRoundedIcon sx={{ fontSize: 11, color: '#EAB308' }} />
                    <Typography
                      className="font-mono text-[11px] cursor-pointer truncate"
                      sx={{ color: '#EAB308', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => onDrillDown(q.user!)}>{q.user}</Typography>
                  </Box>
                ) : <Typography sx={{ fontSize: 10, color: textMuted }}>—</Typography>}
                <Chip label={q.action?.toUpperCase() ?? '—'} size="small"
                  sx={{ height: 16, fontSize: 9, fontWeight: 700, bgcolor: 'rgba(241,116,34,0.12)', color: '#F17422', border: 'none' }} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Session table */}
      <Box>
        <SectionLabel>NAC SESSIONS ({data.sessions.length})</SectionLabel>
        <Box className="rounded-xl overflow-hidden"
          sx={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'}` }}>
          <Box className="grid px-3 py-1.5"
            sx={{
              gridTemplateColumns: '130px 80px 90px 1fr 1fr 80px 80px',
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.03)',
            }}>
            {['TIME', 'AUTH', 'TYPE', 'IP / MAC', 'USER', 'VLAN', 'SWITCH / AP'].map(h => (
              <Typography key={h} className="text-[9px] font-bold tracking-wider" sx={{ color: textMuted }}>{h}</Typography>
            ))}
          </Box>
          {data.sessions.slice(0, 30).map((s, i) => (
            <Box key={i}
              className="grid px-3 py-1.5 transition-colors"
              sx={{
                gridTemplateColumns: '130px 80px 90px 1fr 1fr 80px 80px',
                borderTop: `1px solid ${rowBord}`,
                '&:hover': { background: rowHover },
              }}>
              <Typography className="font-mono text-[10px]" sx={{ color: textMuted }}>
                {s.timestamp ? new Date(s.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
              </Typography>
              <AuthResultBadge result={s.auth_result} />
              <Typography sx={{ fontSize: 10, color: textMuted }}>
                {s.auth_type || s.action || '—'}
              </Typography>
              <Box className="min-w-0">
                {s.ip && (
                  <Typography
                    className="font-mono text-[10px] cursor-pointer truncate"
                    sx={{ color: '#38BDF8', '&:hover': { textDecoration: 'underline' } }}
                    onClick={() => onDrillDown(s.ip!)}>{s.ip}</Typography>
                )}
                {s.mac && (
                  <Typography
                    className="font-mono text-[10px] cursor-pointer truncate"
                    sx={{ color: '#8B5CF6', '&:hover': { textDecoration: 'underline' } }}
                    onClick={() => onDrillDown(s.mac!)}>{s.mac}</Typography>
                )}
              </Box>
              {s.user ? (
                <Tooltip title={`Investigate: ${s.user}`}>
                  <Typography
                    className="font-mono text-[10px] cursor-pointer truncate"
                    sx={{ color: '#EAB308', '&:hover': { textDecoration: 'underline' } }}
                    onClick={() => onDrillDown(s.user!)}>{s.user}</Typography>
                </Tooltip>
              ) : <Typography sx={{ fontSize: 10, color: textMuted }}>—</Typography>}
              <Typography sx={{ fontSize: 10, color: textSec }}>{s.vlan || '—'}</Typography>
              <Tooltip title={s.switch || s.ap || ''}>
                <Typography className="text-[10px] truncate" sx={{ color: textMuted }}>
                  {s.switch || s.ap || '—'}
                </Typography>
              </Tooltip>
            </Box>
          ))}
        </Box>
      </Box>

      {/* VLAN + Policy summary */}
      <Box className="grid grid-cols-2 gap-4">
        {[
          { title: 'VLAN DISTRIBUTION', items: data.vlans, keyProp: 'vlan', color: '#38BDF8' },
          { title: 'POLICY ASSIGNMENTS', items: data.policies, keyProp: 'policy', color: '#8B5CF6' },
        ].map(({ title, items, keyProp, color }) => (
          <Box key={title}>
            <SectionLabel>{title}</SectionLabel>
            {items.length === 0 ? (
              <Typography sx={{ fontSize: 11, color: textMuted }}>—</Typography>
            ) : (
              <Stack spacing={0.5}>
                {(items as Record<string, unknown>[]).slice(0, 6).map((item, i) => {
                  const maxCount = Number((items as Record<string, unknown>[])[0]?.count ?? 1)
                  const pct = (Number(item.count) / maxCount) * 100
                  return (
                    <Box key={i} className="flex items-center gap-2">
                      <Box className="flex-1 h-1.5 rounded-full overflow-hidden"
                        sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)' }}>
                        <Box sx={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '9999px' }} />
                      </Box>
                      <Typography className="font-mono text-[10px] truncate flex-1" sx={{ color }}>{String(item[keyProp])}</Typography>
                      <Typography className="font-mono text-[10px] shrink-0" sx={{ color: textMuted }}>{Number(item.count)}</Typography>
                    </Box>
                  )
                })}
              </Stack>
            )}
          </Box>
        ))}
      </Box>
    </Stack>
  )
}
