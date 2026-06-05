import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { soarApi, CaseEvidence, CaseEvidenceResponse, CaseEvidenceSource } from '../../../services/soarApi'
import { fmtTime, hexRgb } from '../soarUtils'

const SOURCE_COLOR: Record<string, string> = {
  wazuh: '#7B5BA4',
  opensearch: '#38BDF8',
  misp: '#F17422',
}

const STATUS_COLOR: Record<CaseEvidenceSource['status'], string> = {
  connected: '#22C55E',
  no_data: '#64748B',
  error: '#EF4444',
  not_configured: '#F59E0B',
}

interface Props { caseId: number }

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function EvidencePanel({ caseId }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,40,100,0.48)'
  const cardBg = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(248,246,255,0.8)'
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(56,189,248,0.12)'
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['case-evidence', caseId],
    queryFn: () => soarApi.getCaseEvidence(caseId).then(r => r.data),
    enabled: !!caseId,
  })

  const payload = data as CaseEvidenceResponse | undefined
  const items = payload?.evidence ?? []
  const summary = payload?.summary
  const sources = payload?.sources ?? []

  if (isLoading) {
    return <Stack spacing={1.2}>{[1, 2, 3, 4].map(i => <Skeleton key={i} height={68} sx={{ borderRadius: 1.5 }} />)}</Stack>
  }

  return (
    <Stack spacing={2}>
      <Box
        className="rounded-xl px-3 py-2.5"
        sx={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)' }}
      >
        <Box className="flex items-start justify-between gap-3">
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#38BDF8' }}>
              Live Evidence Aggregation
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: textMuted, mt: 0.4, lineHeight: 1.6 }}>
              หลักฐานถูกดึงแบบสดจาก IOC ใน IRIS แล้วค้นต่อใน Wazuh/OpenSearch และ MISP โดยไม่ใช้ local evidence DB อีกต่อไป
            </Typography>
          </Box>
          <Box className="flex items-center gap-1 shrink-0">
            <Button
              size="small"
              startIcon={isFetching ? <CircularProgress size={12} color="inherit" /> : <RefreshRoundedIcon />}
              onClick={() => refetch()}
              sx={{ borderRadius: 2, fontSize: 11, color: '#38BDF8' }}
            >
              Refresh
            </Button>
            {payload && (
              <Tooltip title="Download aggregated evidence JSON">
                <IconButton
                  size="small"
                  onClick={() => downloadJson(`case_${caseId}_live_evidence.json`, payload)}
                  sx={{ color: '#38BDF8', '&:hover': { background: 'rgba(56,189,248,0.1)' } }}
                >
                  <DownloadRoundedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      <Box className="grid grid-cols-2 gap-2">
        <Box className="rounded-xl px-3 py-2.5" sx={{ background: cardBg, border: `1px solid ${border}` }}>
          <Typography sx={{ fontSize: 9, color: textMuted, letterSpacing: '0.08em', fontWeight: 800 }}>
            EVIDENCE ITEMS
          </Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: isDark ? '#EDE9FA' : '#1A1033', lineHeight: 1.2 }}>
            {summary?.total ?? items.length}
          </Typography>
        </Box>
        <Box className="rounded-xl px-3 py-2.5" sx={{ background: cardBg, border: `1px solid ${border}` }}>
          <Typography sx={{ fontSize: 9, color: textMuted, letterSpacing: '0.08em', fontWeight: 800 }}>
            IOC QUERIED
          </Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: isDark ? '#EDE9FA' : '#1A1033', lineHeight: 1.2 }}>
            {summary?.ioc_queried ?? 0}
          </Typography>
          <Typography sx={{ fontSize: 9, color: textMuted, mt: 0.4 }}>
            จาก IOC ในเคสทั้งหมด {summary?.ioc_total ?? 0}
          </Typography>
        </Box>
      </Box>

      {summary?.ioc_limit_applied && (
        <Box className="rounded-xl px-3 py-2" sx={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Typography sx={{ fontSize: 10.5, color: '#F59E0B', lineHeight: 1.6 }}>
            เคสนี้มี IOC มากกว่า {summary.ioc_queried} รายการ ระบบจำกัดการ aggregate รอบนี้ไว้ที่ {summary.ioc_queried} IOC แรกเพื่อคุมเวลา query
          </Typography>
        </Box>
      )}

      {summary?.ioc_queried === 0 && (
        <Box className="rounded-xl px-3 py-2" sx={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.16)' }}>
          <Typography sx={{ fontSize: 10.5, color: textMuted, lineHeight: 1.6 }}>
            ยังไม่มี IOC ในเคสนี้ จึงยังไม่สามารถดึง live evidence จากระบบภายนอกได้
          </Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {sources.map((source) => {
          const color = STATUS_COLOR[source.status]
          return (
            <Box
              key={source.id}
              className="rounded-xl px-3 py-2.5"
              sx={{ background: cardBg, border: `1px solid ${border}` }}
            >
              <Box className="flex items-center justify-between gap-2">
                <Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033' }}>
                    {source.label}
                  </Typography>
                  <Typography sx={{ fontSize: 9.5, color: textMuted, mt: 0.3 }}>
                    {source.note || source.error || 'เชื่อมต่อเพื่อดึง evidence แบบสดจากต้นทาง'}
                  </Typography>
                </Box>
                <Box className="flex items-center gap-2 shrink-0">
                  <Chip
                    size="small"
                    label={source.status}
                    sx={{
                      height: 20,
                      fontSize: 10,
                      color,
                      background: `rgba(${hexRgb(color)},0.12)`,
                      border: `1px solid rgba(${hexRgb(color)},0.24)`,
                    }}
                  />
                  <Typography sx={{ fontSize: 15, fontWeight: 800, color }}>
                    {source.count}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )
        })}
      </Stack>

      {items.length === 0 ? (
        <Box className="py-10 flex flex-col items-center gap-2">
          <AttachFileRoundedIcon sx={{ fontSize: 32, color: textMuted, opacity: 0.5 }} />
          <Typography sx={{ fontSize: 12, color: textMuted }}>ไม่พบ live evidence ในช่วง 30 วันที่ query</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {items.map((ev: CaseEvidence) => {
            const srcColor = SOURCE_COLOR[ev.source] ?? '#64748B'
            const expanded = expandedId === ev.id
            return (
              <Box
                key={ev.id}
                className="rounded-xl overflow-hidden"
                sx={{ background: cardBg, border: `1px solid ${border}` }}
              >
                <Box
                  className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : ev.id)}
                >
                  <Box className="flex-1 min-w-0">
                    <Box className="flex items-center gap-2 flex-wrap">
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033' }}>
                        {ev.title}
                      </Typography>
                      <Box
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                        sx={{ background: `rgba(${hexRgb(srcColor)},0.12)`, color: srcColor }}
                      >
                        {ev.source}
                      </Box>
                      <Box
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                        sx={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8' }}
                      >
                        {ev.ev_type}
                      </Box>
                      {typeof ev.severity === 'number' && (
                        <Box
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                          sx={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                        >
                          L{ev.severity}
                        </Box>
                      )}
                    </Box>

                    <Typography sx={{ fontSize: 10.2, color: textMuted, mt: 0.4, lineHeight: 1.6 }}>
                      {ev.description || `IOC: ${ev.ioc_value || '—'}`}
                    </Typography>

                    <Box className="flex items-center gap-2 flex-wrap mt-1">
                      {ev.ioc_value && (
                        <Typography sx={{ fontSize: 9, color: textMuted }}>
                          IOC: <Box component="span" sx={{ color: '#38BDF8', fontFamily: '"IBM Plex Mono", monospace' }}>{ev.ioc_value}</Box>
                        </Typography>
                      )}
                      <Typography sx={{ fontSize: 9, color: textMuted }}>
                        {fmtTime(ev.created_at)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box className="flex items-center gap-1 shrink-0">
                    <Tooltip title="Download item JSON">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadJson(`evidence_${caseId}_${ev.id}.json`, ev)
                        }}
                        sx={{ color: '#38BDF8', '&:hover': { background: 'rgba(56,189,248,0.1)' } }}
                      >
                        <DownloadRoundedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    {ev.source_url && (
                      <Tooltip title="เปิดต้นทาง">
                        <IconButton
                          size="small"
                          component="a"
                          href={ev.source_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          sx={{ color: textMuted, '&:hover': { background: 'rgba(255,255,255,0.06)' } }}
                        >
                          <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {expanded && (
                  <Box
                    className="px-3 pb-3 pt-1"
                    sx={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(56,189,248,0.08)'}` }}
                  >
                    {ev.source_ref && (
                      <Typography sx={{ fontSize: 9.5, color: textMuted, mb: 1 }}>
                        Source ref: <Box component="span" sx={{ color: '#38BDF8', fontFamily: '"IBM Plex Mono", monospace' }}>{ev.source_ref}</Box>
                      </Typography>
                    )}

                    {ev.tags?.length ? (
                      <Box className="flex flex-wrap gap-1 mb-2">
                        {ev.tags.filter(Boolean).slice(0, 6).map(tag => (
                          <Chip
                            key={`${ev.id}-${tag}`}
                            label={tag}
                            size="small"
                            sx={{ height: 20, fontSize: 9, background: 'rgba(99,102,241,0.08)', color: '#6366F1' }}
                          />
                        ))}
                      </Box>
                    ) : null}

                    {ev.content_preview && (
                      <Box>
                        <Typography sx={{ fontSize: 9, color: textMuted, mb: 0.5 }}>Preview</Typography>
                        <Box
                          className="rounded-lg p-2 overflow-auto max-h-56"
                          sx={{
                            background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(248,246,255,0.9)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(56,189,248,0.12)'}`,
                          }}
                        >
                          <pre
                            style={{
                              margin: 0,
                              fontSize: 10,
                              color: isDark ? 'rgba(255,255,255,0.72)' : '#1A1033',
                              fontFamily: '"IBM Plex Mono", monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {ev.content_preview}
                          </pre>
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}
