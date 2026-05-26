import { useMemo } from 'react'
import { Box, Stack, Typography, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded'
import { fmtN } from '../../ui/tokens'

interface Props {
  loading: boolean
  mitre: { tactics: string[]; techniques: string[] }
  events: unknown[]
}

const TACTIC_META: Record<string, { color: string; emoji: string }> = {
  'initial-access':         { color: '#EF4444', emoji: '🚪' },
  'execution':              { color: '#F17422', emoji: '⚡' },
  'persistence':            { color: '#EAB308', emoji: '🔒' },
  'privilege-escalation':   { color: '#F59E0B', emoji: '⬆️' },
  'defense-evasion':        { color: '#22C55E', emoji: '🥷' },
  'credential-access':      { color: '#0EA5E9', emoji: '🔑' },
  'discovery':              { color: '#3B82F6', emoji: '🔍' },
  'lateral-movement':       { color: '#8B5CF6', emoji: '↔️' },
  'collection':             { color: '#A855F7', emoji: '📦' },
  'command-and-control':    { color: '#EC4899', emoji: '📡' },
  'exfiltration':           { color: '#F43F5E', emoji: '📤' },
  'impact':                 { color: '#DC2626', emoji: '💥' },
}

function tacticMeta(t: string) {
  const key = t.toLowerCase().replace(/\s+/g, '-')
  return TACTIC_META[key] ?? { color: '#7B5BA4', emoji: '🎯' }
}

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function techniqueHits(techniques: string[], events: unknown[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of techniques) map.set(t, 0)
  for (const ev of events as Array<Record<string, unknown>>) {
    const rule  = ev?.rule as Record<string, unknown> ?? {}
    const mitre = rule?.mitre as Record<string, unknown> ?? {}
    const techs = (mitre?.technique as string[] | undefined) ?? []
    const groups = (rule?.groups as string[] | undefined) ?? []
    const all   = [...techs, ...groups.filter(g => g.startsWith('attack.')).map(g => g.replace('attack.', ''))]
    for (const t of all) { if (map.has(t)) map.set(t, (map.get(t) ?? 0) + 1) }
  }
  return map
}

export default function MitreTabV2({ loading, mitre, events }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)'
  const cardBord  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'

  const techCounts = useMemo(() => techniqueHits(mitre.techniques, events), [mitre.techniques, events])

  const isEmpty = !mitre.tactics.length && !mitre.techniques.length
  if (isEmpty) return (
    <Box className="py-16 flex flex-col items-center gap-3 animate-fade-in">
      <Box className="w-14 h-14 rounded-2xl flex items-center justify-center"
        sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)' }}>
        <PsychologyRoundedIcon sx={{ fontSize: 28, color: textMuted }} />
      </Box>
      <Typography sx={{ fontSize: 13, color: textMuted }}>No MITRE ATT&CK mapping found in these events</Typography>
    </Box>
  )

  const sortedTech = [...mitre.techniques].sort((a, b) => (techCounts.get(b) ?? 0) - (techCounts.get(a) ?? 0))

  return (
    <Stack spacing={3.5} className="animate-fade-in">
      {/* Tactics */}
      {mitre.tactics.length > 0 && (
        <Box>
          <Box className="flex items-center gap-2 mb-3">
            <Typography className="text-[9px] font-bold tracking-widest" sx={{ color: textMuted }}>
              TACTICS
            </Typography>
            <Box className="px-1.5 py-0 rounded-full text-[9px] font-bold"
              sx={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(123,91,164,0.08)', color: textMuted }}>
              {mitre.tactics.length}
            </Box>
          </Box>
          <Box className="flex flex-wrap gap-2">
            {mitre.tactics.map(t => {
              const m = tacticMeta(t)
              return (
                <Box key={t}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  sx={{
                    background: isDark ? `rgba(${hexRgb(m.color)},0.1)` : `rgba(${hexRgb(m.color)},0.07)`,
                    border: `1px solid rgba(${hexRgb(m.color)},0.25)`,
                  }}
                >
                  <span className="text-sm">{m.emoji}</span>
                  <Typography className="text-xs font-bold uppercase tracking-wide" sx={{ color: m.color }}>
                    {t.replace(/-/g, ' ')}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}

      {/* Kill chain visualization */}
      {mitre.tactics.length > 1 && (
        <Box>
          <Typography className="text-[9px] font-bold tracking-widest mb-3" sx={{ color: textMuted }}>
            KILL CHAIN COVERAGE
          </Typography>
          <Box className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide py-2">
            {['initial-access','execution','persistence','privilege-escalation','defense-evasion',
              'credential-access','discovery','lateral-movement','collection','command-and-control',
              'exfiltration','impact'].map((stage, i) => {
              const m = tacticMeta(stage)
              const active = mitre.tactics.some(t => t.toLowerCase().replace(/\s+/g, '-') === stage)
              return (
                <Tooltip key={stage} title={stage.replace(/-/g, ' ')} arrow placement="top">
                  <Box className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg shrink-0 cursor-default transition-all duration-200"
                    sx={{
                      background: active ? `rgba(${hexRgb(m.color)},0.12)` : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)'),
                      border: active ? `1px solid rgba(${hexRgb(m.color)},0.3)` : `1px solid ${cardBord}`,
                      opacity: active ? 1 : 0.4,
                    }}
                  >
                    <span className="text-base leading-none">{m.emoji}</span>
                    <Typography className="text-[8px] font-bold text-center leading-tight" style={{ maxWidth: 52 }}
                      sx={{ color: active ? m.color : textMuted }}>
                      {stage.replace(/-/g, '\n').toUpperCase()}
                    </Typography>
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        </Box>
      )}

      {/* Techniques grid */}
      {sortedTech.length > 0 && (
        <Box>
          <Box className="flex items-center gap-2 mb-3">
            <Typography className="text-[9px] font-bold tracking-widest" sx={{ color: textMuted }}>TECHNIQUES</Typography>
            <Box className="px-1.5 py-0 rounded-full text-[9px] font-bold"
              sx={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(123,91,164,0.08)', color: textMuted }}>
              {sortedTech.length}
            </Box>
          </Box>
          <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {sortedTech.map(t => {
              const count = techCounts.get(t) ?? 0
              const isTID = /^T\d{4}/.test(t)
              return (
                <Box key={t}
                  className="flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150"
                  sx={{
                    background: cardBg,
                    border: `1px solid ${cardBord}`,
                    '&:hover': { border: '1px solid rgba(139,92,246,0.25)', background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.04)' },
                  }}
                >
                  <Typography
                    className={`text-[11px] truncate flex-1 mr-1 ${isTID ? 'font-mono font-semibold' : ''}`}
                    title={t}
                    sx={{ color: isTID ? (isDark ? '#C4B5FD' : '#5A3E85') : textSec }}>
                    {t}
                  </Typography>
                  {count > 0 && (
                    <Box className="px-1.5 rounded-full text-[8px] font-bold shrink-0"
                      sx={{ background: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)', color: '#A78BFA' }}>
                      {fmtN(count)}
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>
      )}
    </Stack>
  )
}
