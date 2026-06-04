import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Typography, Stack, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Skeleton, Chip, Tooltip, IconButton,
  CircularProgress,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded'
import { useSnackbar } from 'notistack'
import { soarApi, CaseEvidence } from '../../../services/soarApi'
import { hexRgb } from '../soarUtils'

const SOURCES = ['wazuh', 'opensearch', 'investigate', 'ioc', 'misp', 'shuffle', 'manual']
const EV_TYPES = ['json', 'text', 'screenshot', 'file_metadata', 'report']

const SOURCE_COLOR: Record<string, string> = {
  wazuh: '#7B5BA4', opensearch: '#38BDF8', investigate: '#A855F7',
  ioc: '#EF4444', misp: '#F17422', shuffle: '#22C55E', manual: '#64748B',
}

interface Props { caseId: number }

export default function EvidencePanel({ caseId }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const cardBg = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(248,246,255,0.8)'

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', source: 'manual', ev_type: 'text', sha256: '', content_preview: '' })
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['case-evidence', caseId],
    queryFn: () => soarApi.getCaseEvidence(caseId).then(r => r.data),
    enabled: !!caseId,
  })

  const createMut = useMutation({
    mutationFn: () => soarApi.createCaseEvidence(caseId, form),
    onSuccess: () => {
      enqueueSnackbar('เพิ่ม evidence สำเร็จ', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['case-evidence', caseId] })
      setForm({ title: '', description: '', source: 'manual', ev_type: 'text', sha256: '', content_preview: '' })
      setShowForm(false)
    },
    onError: () => enqueueSnackbar('เพิ่ม evidence ล้มเหลว', { variant: 'error' }),
  })

  const deleteMut = useMutation({
    mutationFn: (evId: number) => soarApi.deleteCaseEvidence(caseId, evId),
    onSuccess: () => {
      enqueueSnackbar('ลบ evidence แล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['case-evidence', caseId] })
    },
    onError: () => enqueueSnackbar('ลบ evidence ล้มเหลว', { variant: 'error' }),
  })

  const downloadEvidence = (ev: CaseEvidence) => {
    const payload = { id: ev.id, title: ev.title, source: ev.source, ev_type: ev.ev_type, sha256: ev.sha256, content_preview: ev.content_preview, created_by: ev.created_by, created_at: ev.created_at }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `evidence_${ev.id}_${ev.title}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const items: CaseEvidence[] = data?.evidence ?? []

  if (isLoading) return <Stack spacing={1}>{[1,2,3].map(i => <Skeleton key={i} height={60} sx={{ borderRadius: 1.5 }} />)}</Stack>

  return (
    <Stack spacing={2}>
      {/* Metadata-only notice */}
      <Box className="flex items-start gap-2 px-3 py-2 rounded-xl"
        sx={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)' }}>
        <AttachFileRoundedIcon sx={{ fontSize: 13, color: '#38BDF8', mt: 0.1 }} />
        <Typography sx={{ fontSize: 10.5, color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,40,100,0.65)' }}>
          <Box component="span" sx={{ fontWeight: 700, color: '#38BDF8' }}>Metadata Only</Box>
          {' '}— ระบบเก็บข้อมูล evidence เป็น metadata เท่านั้น (ไม่รองรับ file upload จริง)
          สามารถวาง content preview, hash, หรือ reference ได้
        </Typography>
      </Box>

      <Button size="small" startIcon={<AddRoundedIcon />} variant="outlined"
        onClick={() => setShowForm(!showForm)}
        sx={{ alignSelf: 'flex-start', borderRadius: 2, fontSize: 12, borderColor: 'rgba(56,189,248,0.4)', color: '#38BDF8',
          '&:hover': { borderColor: '#38BDF8', background: 'rgba(56,189,248,0.06)' } }}>
        เพิ่ม Evidence
      </Button>

      {showForm && (
        <Box className="rounded-xl p-3" sx={{ background: cardBg, border: '1px solid rgba(56,189,248,0.2)' }}>
          <Stack spacing={1.5}>
            <TextField size="small" label="ชื่อ Evidence *" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 12 } }} />
            <Box className="grid grid-cols-2 gap-2">
              <FormControl size="small">
                <InputLabel sx={{ fontSize: 12 }}>แหล่งที่มา</InputLabel>
                <Select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} label="แหล่งที่มา" sx={{ borderRadius: '8px', fontSize: 12 }}>
                  {SOURCES.map(s => <MenuItem key={s} value={s} sx={{ fontSize: 12 }}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel sx={{ fontSize: 12 }}>ประเภท</InputLabel>
                <Select value={form.ev_type} onChange={e => setForm(f => ({ ...f, ev_type: e.target.value }))} label="ประเภท" sx={{ borderRadius: '8px', fontSize: 12 }}>
                  {EV_TYPES.map(t => <MenuItem key={t} value={t} sx={{ fontSize: 12 }}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <TextField size="small" label="SHA256 (optional)" value={form.sha256}
              onChange={e => setForm(f => ({ ...f, sha256: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 } }} />
            <TextField size="small" label="Content Preview" value={form.content_preview}
              onChange={e => setForm(f => ({ ...f, content_preview: e.target.value }))} fullWidth multiline rows={3}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 } }} />
            <Box className="flex gap-2 justify-end">
              <Button size="small" onClick={() => setShowForm(false)} sx={{ borderRadius: 2, fontSize: 11 }}>ยกเลิก</Button>
              <Button size="small" variant="contained" disabled={!form.title.trim() || createMut.isPending}
                onClick={() => createMut.mutate()}
                sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, background: '#38BDF8', color: '#000', '&:hover': { background: '#0EA5E9' } }}>
                {createMut.isPending ? <CircularProgress size={12} color="inherit" sx={{ mr: 0.5 }} /> : null}
                เพิ่ม
              </Button>
            </Box>
          </Stack>
        </Box>
      )}

      {items.length === 0 ? (
        <Box className="py-10 flex flex-col items-center gap-2">
          <AttachFileRoundedIcon sx={{ fontSize: 32, color: textMuted, opacity: 0.4 }} />
          <Typography sx={{ fontSize: 12, color: textMuted }}>ยังไม่มี evidence ในเคสนี้</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {items.map(ev => {
            const srcColor = SOURCE_COLOR[ev.source] ?? '#64748B'
            const expanded = expandedId === ev.id
            return (
              <Box key={ev.id} className="rounded-xl overflow-hidden"
                sx={{ background: cardBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(56,189,248,0.1)'}` }}>
                <Box className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : ev.id)}>
                  <Box className="flex-1 min-w-0">
                    <Box className="flex items-center gap-2 flex-wrap">
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: isDark ? '#EDE9FA' : '#1A1033' }}>
                        {ev.title}
                      </Typography>
                      <Box className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                        sx={{ background: `rgba(${hexRgb(srcColor)},0.12)`, color: srcColor }}>
                        {ev.source}
                      </Box>
                      <Box className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                        sx={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8' }}>
                        {ev.ev_type}
                      </Box>
                    </Box>
                    {ev.description && (
                      <Typography sx={{ fontSize: 10, color: textMuted, mt: 0.3 }}>{ev.description}</Typography>
                    )}
                    <Typography sx={{ fontSize: 9, color: textMuted, mt: 0.5 }}>
                      {ev.created_by} • {ev.created_at ? new Date(ev.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </Typography>
                  </Box>
                  <Box className="flex items-center gap-1 shrink-0">
                    <Tooltip title="Download JSON">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); downloadEvidence(ev) }}
                        sx={{ color: '#38BDF8', '&:hover': { background: 'rgba(56,189,248,0.1)' } }}>
                        <DownloadRoundedIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ลบ">
                      <IconButton size="small"
                        onClick={(e) => { e.stopPropagation(); if (window.confirm('ลบ evidence นี้?')) deleteMut.mutate(ev.id) }}
                        sx={{ color: textMuted, '&:hover': { color: '#EF4444', background: 'rgba(239,68,68,0.08)' } }}>
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Expanded content */}
                {expanded && (ev.sha256 || ev.content_preview) && (
                  <Box className="px-3 pb-3 pt-1"
                    sx={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(56,189,248,0.08)'}` }}>
                    {ev.sha256 && (
                      <Box className="mb-2">
                        <Typography sx={{ fontSize: 9, color: textMuted, mb: 0.5 }}>SHA256:</Typography>
                        <Typography className="font-mono text-[10px] break-all" sx={{ color: '#38BDF8' }}>{ev.sha256}</Typography>
                      </Box>
                    )}
                    {ev.content_preview && (
                      <Box>
                        <Typography sx={{ fontSize: 9, color: textMuted, mb: 0.5 }}>Content Preview:</Typography>
                        <Box className="rounded-lg p-2 overflow-auto max-h-48"
                          sx={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(248,246,255,0.9)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(56,189,248,0.12)'}` }}>
                          <pre style={{ margin: 0, fontSize: 10, color: isDark ? 'rgba(255,255,255,0.7)' : '#1A1033', fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
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
