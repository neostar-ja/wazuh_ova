import { useMemo, useState } from 'react'
import {
  Box, Chip, Skeleton, Stack, Table, TableBody,
  TableCell, TableHead, TablePagination, TableRow, Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { SEV_COLOR, BRAND, sevColor, sevLabel, fmtN } from '../../ui/tokens'

interface RawEvent {
  '@timestamp'?: string
  rule?: { id?: string | number; description?: string; level?: number; groups?: string[] }
  agent?: { name?: string }
  data?: Record<string, unknown>
  predecoder?: { program_name?: string }
}

interface Props {
  loading: boolean
  events: unknown[]
  onDrillDown: (q: string) => void
}

type SevFilter = 'all' | 'critical' | 'high' | 'medium' | 'low'

function parseSev(level: number): SevFilter {
  if (level >= 15) return 'critical'
  if (level >= 12) return 'high'
  if (level >= 7)  return 'medium'
  return 'low'
}

function formatTs(ts?: string): string {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toLocaleString('en-GB', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return ts }
}

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

const SEV_FILTERS: Array<{ val: SevFilter; label: string; color: string }> = [
  { val: 'all',      label: 'All',      color: BRAND.purple },
  { val: 'critical', label: 'Critical', color: SEV_COLOR.critical },
  { val: 'high',     label: 'High',     color: SEV_COLOR.high },
  { val: 'medium',   label: 'Medium',   color: SEV_COLOR.medium },
  { val: 'low',      label: 'Low',      color: SEV_COLOR.low },
]

export default function AlertsTab({ loading, events, onDrillDown }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const [sev, setSev]           = useState<SevFilter>('all')
  const [page, setPage]         = useState(0)
  const [rowsPerPage, setRows]  = useState(15)

  const textMuted  = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec    = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const headBg     = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)'
  const rowHover   = isDark ? 'rgba(123,91,164,0.07)' : 'rgba(123,91,164,0.04)'
  const rowAlt     = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(123,91,164,0.015)'
  const divider    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.07)'

  const parsed = useMemo(() =>
    (events as RawEvent[]).map(e => ({
      ts:     e['@timestamp'] ?? '',
      ruleId: String(e.rule?.id ?? ''),
      desc:   e.rule?.description ?? '',
      level:  Number(e.rule?.level ?? 0),
      agent:  e.agent?.name ?? '',
      source: e.predecoder?.program_name ?? '',
      srcip:  String(e.data?.srcip ?? e.data?.['src_ip'] ?? ''),
      dstip:  String(e.data?.dstip ?? e.data?.['dst_ip'] ?? ''),
    })), [events])

  const filtered = useMemo(() =>
    sev === 'all' ? parsed : parsed.filter(e => parseSev(e.level) === sev),
    [parsed, sev])

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: parsed.length, critical: 0, high: 0, medium: 0, low: 0 }
    for (const e of parsed) { const s = parseSev(e.level); c[s] = (c[s] ?? 0) + 1 }
    return c
  }, [parsed])

  if (loading) return (
    <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />
  )

  return (
    <Stack spacing={2} className="animate-fade-in">
      {/* Severity filter chips */}
      <Box className="flex items-center flex-wrap gap-1.5">
        <NotificationsActiveRoundedIcon sx={{ fontSize: 16, color: textMuted, mr: 0.5 }} />
        {SEV_FILTERS.map(f => (
          <Box
            key={f.val}
            onClick={() => { setSev(f.val); setPage(0) }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer select-none transition-all duration-150"
            sx={{
              bgcolor: sev === f.val ? `rgba(${hexRgb(f.color)},0.18)` : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)'),
              color:   sev === f.val ? f.color : textMuted,
              border:  sev === f.val ? `1px solid rgba(${hexRgb(f.color)},0.35)` : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(123,91,164,0.1)'}`,
              '&:hover': { bgcolor: `rgba(${hexRgb(f.color)},0.1)`, color: f.color },
            }}
          >
            {sev === f.val && f.val !== 'all' && (
              <Box className="w-1.5 h-1.5 rounded-full animate-pulse-slow" sx={{ background: f.color }} />
            )}
            {f.label}
            <Box className="px-1.5 py-0 rounded-full text-[9px]"
              sx={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(123,91,164,0.1)',
                    color: sev === f.val ? f.color : textMuted }}>
              {fmtN(counts[f.val] ?? 0)}
            </Box>
          </Box>
        ))}
      </Box>

      {filtered.length === 0 ? (
        <Box className="py-12 flex flex-col items-center gap-2">
          <Box className="w-12 h-12 rounded-2xl flex items-center justify-center"
            sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)' }}>
            <NotificationsActiveRoundedIcon sx={{ fontSize: 22, color: textMuted }} />
          </Box>
          <Typography sx={{ fontSize: 13, color: textMuted }}>No alerts match this filter</Typography>
        </Box>
      ) : (
        <Box className="rounded-xl overflow-hidden"
          sx={{ border: `1px solid ${divider}` }}>
          <Box sx={{ overflowX: 'auto' }} className="scrollbar-thin">
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow sx={{ background: headBg }}>
                  {['TIMESTAMP', 'SEV', 'RULE', 'DESCRIPTION', 'AGENT', 'SOURCE', 'SRC IP'].map(h => (
                    <TableCell key={h} sx={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 1, color: textMuted,
                      borderBottom: `1px solid ${divider}`, py: 1, px: 1.5, whiteSpace: 'nowrap',
                    }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pageRows.map((e, i) => {
                  const color = sevColor(e.level)
                  return (
                    <TableRow key={i} sx={{
                      background: i % 2 === 0 ? rowAlt : 'transparent',
                      '&:hover': { background: rowHover },
                      '& td': { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)'}` },
                    }}>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="font-mono text-[10px] whitespace-nowrap" sx={{ color: textMuted }}>
                          {formatTs(e.ts)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Box className="flex items-center gap-1.5 whitespace-nowrap">
                          <Box className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse-slow"
                            sx={{ background: color, boxShadow: `0 0 4px ${color}80` }} />
                          <Typography className="text-[10px] font-bold" sx={{ color }}>
                            {sevLabel(e.level).toUpperCase()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="font-mono text-[10px] font-semibold" sx={{ color: BRAND.purple }}>
                          #{e.ruleId}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 280 }}>
                        <Typography className="text-[11px] truncate" title={e.desc} sx={{ color: textSec }}>
                          {e.desc || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="text-[10px] whitespace-nowrap" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,100,0.5)' }}>
                          {e.agent || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="text-[10px]" sx={{ color: textMuted }}>{e.source || '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        {e.srcip ? (
                          <Box
                            onClick={() => onDrillDown(e.srcip)}
                            className="flex items-center gap-1 cursor-pointer group"
                          >
                            <Typography className="font-mono text-[10px]" sx={{ color: '#60A5FA' }}>
                              {e.srcip}
                            </Typography>
                            <OpenInNewRoundedIcon className="opacity-0 group-hover:opacity-40 transition-opacity"
                              sx={{ fontSize: 11, color: '#60A5FA' }} />
                          </Box>
                        ) : (
                          <Typography className="text-[10px]" sx={{ color: textMuted }}>—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ borderTop: `1px solid ${divider}`, background: headBg }}>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRows(parseInt(e.target.value)); setPage(0) }}
              rowsPerPageOptions={[10, 15, 25, 50]}
              sx={{
                color: textMuted, fontSize: 11, minHeight: 44,
                '.MuiTablePagination-select, .MuiTablePagination-displayedRows': { fontSize: 11 },
                '.MuiTablePagination-actions button': { color: textMuted },
              }}
            />
          </Box>
        </Box>
      )}
    </Stack>
  )
}
