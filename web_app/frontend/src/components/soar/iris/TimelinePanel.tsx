import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Typography, Stack, Button, TextField, CircularProgress, Skeleton,
  Select, MenuItem, FormControl, InputLabel, Chip,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'
import { format } from 'date-fns'
import { useSnackbar } from 'notistack'
import { soarApi, CaseTimelineEvent } from '../../../services/soarApi'
import { fmtTimeTh } from '../soarUtils'

const EVENT_COLORS = [
  { label: 'Teal (ทั่วไป)',        value: '#1bfac3' },
  { label: 'Red (โจมตี/เหตุร้าย)', value: '#EF4444' },
  { label: 'Orange (Contain)',      value: '#F17422' },
  { label: 'Yellow (Analysis)',     value: '#EAB308' },
  { label: 'Green (Recovery)',      value: '#22C55E' },
  { label: 'Blue (Info)',           value: '#38BDF8' },
  { label: 'Purple (Discovery)',    value: '#A855F7' },
]

function colorLabel(hex: string): string {
  return EVENT_COLORS.find(c => c.value === hex)?.label.split(' ')[0] ?? hex
}

export default function TimelinePanel({ caseId }: { caseId: number }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(248,246,255,0.8)'

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title:      '',
    content:    '',
    event_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    color:      '#1bfac3',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['case-timeline', caseId],
    queryFn: () => soarApi.getCaseTimeline(caseId).then(r => r.data),
    enabled: !!caseId,
  })

  const addMut = useMutation({
    mutationFn: () => soarApi.addCaseTimelineEvent(caseId, {
      ...form,
      event_date: form.event_date + ':00',
    }),
    onSuccess: () => {
      enqueueSnackbar('เพิ่มเหตุการณ์ใน Timeline เรียบร้อยแล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['case-timeline', caseId] })
      setForm({ title: '', content: '', event_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"), color: '#1bfac3' })
      setShowForm(false)
    },
    onError: () => enqueueSnackbar('ไม่สามารถเพิ่มเหตุการณ์ได้', { variant: 'error' }),
  })

  const events: CaseTimelineEvent[] = data?.data?.timeline ?? []
  const sorted = [...events].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  if (isLoading) return <Stack spacing={1}>{[1,2,3].map(i => <Skeleton key={i} height={72} sx={{ borderRadius: 1.5 }} />)}</Stack>

  return (
    <Stack spacing={2.5}>
      {/* Stats */}
      {events.length > 0 && (
        <Box className="flex flex-wrap gap-2">
          {EVENT_COLORS.filter(c => events.some(e => e.event_color === c.value)).map(c => {
            const cnt = events.filter(e => e.event_color === c.value).length
            return (
              <Box key={c.value} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                sx={{ background: `${c.value}18`, border: `1px solid ${c.value}40` }}>
                <Box className="w-2 h-2 rounded-full" sx={{ background: c.value }} />
                <Typography sx={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,40,100,0.7)' }}>
                  {c.label.split(' ')[0]}
                </Typography>
                <Typography className="font-mono font-bold text-[10px]" sx={{ color: c.value }}>{cnt}</Typography>
              </Box>
            )
          })}
          <Box className="flex items-center gap-1 ml-auto">
            <Typography sx={{ fontSize: 10, color: textMuted }}>{events.length} เหตุการณ์</Typography>
          </Box>
        </Box>
      )}

      {/* Add form */}
      {!showForm ? (
        <Button size="small" startIcon={<AddRoundedIcon />} variant="outlined"
          onClick={() => setShowForm(true)}
          sx={{ alignSelf: 'flex-start', borderRadius: 2, fontSize: 12,
            borderColor: 'rgba(20,184,166,0.4)', color: '#14B8A6',
            '&:hover': { borderColor: '#14B8A6', background: 'rgba(20,184,166,0.06)' } }}>
          เพิ่มเหตุการณ์
        </Button>
      ) : (
        <Box className="rounded-xl p-3" sx={{ background: cardBg, border: '1px solid rgba(20,184,166,0.2)' }}>
          <Stack spacing={1.5}>
            <TextField size="small" label="หัวข้อเหตุการณ์ *" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 12 } }} />
            <TextField size="small" label="รายละเอียด" value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} fullWidth
              multiline rows={2} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 11.5 } }} />
            <Box className="grid grid-cols-2 gap-2">
              <TextField size="small" label="วันเวลาเหตุการณ์" type="datetime-local"
                value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 12 } }} />
              <FormControl size="small">
                <InputLabel sx={{ fontSize: 12 }}>สี (ประเภทเหตุการณ์)</InputLabel>
                <Select value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  label="สี (ประเภทเหตุการณ์)"
                  sx={{ borderRadius: '8px', fontSize: 12 }}>
                  {EVENT_COLORS.map(c => (
                    <MenuItem key={c.value} value={c.value} sx={{ fontSize: 12 }}>
                      <Box className="flex items-center gap-2">
                        <Box className="w-3 h-3 rounded-full shrink-0" sx={{ background: c.value }} />
                        {c.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box className="flex gap-2 justify-end">
              <Button size="small" onClick={() => setShowForm(false)} sx={{ borderRadius: 2, fontSize: 11 }}>ยกเลิก</Button>
              <Button size="small" variant="contained" disabled={!form.title.trim() || addMut.isPending}
                onClick={() => addMut.mutate()}
                sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, background: '#14B8A6', '&:hover': { background: '#0D9488' } }}>
                {addMut.isPending ? <CircularProgress size={12} color="inherit" sx={{ mr: 0.5 }} /> : null}
                เพิ่ม
              </Button>
            </Box>
          </Stack>
        </Box>
      )}

      {/* Timeline */}
      {events.length === 0 ? (
        <Box className="py-12 flex flex-col items-center gap-2">
          <TimelineRoundedIcon sx={{ fontSize: 36, color: textMuted, opacity: 0.35 }} />
          <Typography sx={{ fontSize: 12, color: textMuted }}>ยังไม่มีเหตุการณ์ใน Timeline</Typography>
          <Typography sx={{ fontSize: 10, color: textMuted }}>บันทึกเหตุการณ์สำคัญตาม NIST IR lifecycle</Typography>
        </Box>
      ) : (
        <Box className="relative pl-6">
          {/* Vertical line */}
          <Box className="absolute left-2.5 top-2 bottom-2 w-px"
            sx={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.15)' }} />

          <Stack spacing={2.5}>
            {sorted.map((ev, idx) => {
              const evColor = ev.event_color || '#1bfac3'
              const isLast  = idx === sorted.length - 1
              return (
                <Box key={ev.event_id} className="relative">
                  {/* Timeline dot */}
                  <Box
                    className="absolute flex items-center justify-center"
                    sx={{
                      left: -22, top: 10,
                      width: 18, height: 18,
                      borderRadius: '50%',
                      background: `${evColor}22`,
                      border: `2px solid ${evColor}`,
                      boxShadow: isLast ? `0 0 8px ${evColor}60` : 'none',
                    }}
                  >
                    <Box className="w-1.5 h-1.5 rounded-full" sx={{ background: evColor }} />
                  </Box>

                  {/* Event card */}
                  <Box
                    className="rounded-xl p-3 transition-all"
                    sx={{
                      background: cardBg,
                      border: `1px solid ${isLast ? evColor + '40' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.08)'}`,
                      '&:hover': { border: `1px solid ${evColor}55`, transform: 'translateX(2px)' },
                    }}
                  >
                    <Box className="flex items-start justify-between gap-2 mb-1.5">
                      <Box className="flex items-start gap-2 flex-1 min-w-0">
                        <Box className="flex flex-col items-start gap-1">
                          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033', lineHeight: 1.3 }}>
                            {ev.event_title}
                          </Typography>
                          <Box className="flex items-center gap-1.5">
                            <Box className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                              sx={{ background: `${evColor}22`, color: evColor }}>
                              {colorLabel(evColor)}
                            </Box>
                            {ev.event_in_summary && (
                              <Chip label="Summary" size="small"
                                sx={{ height: 14, fontSize: 8, fontWeight: 700, bgcolor: 'rgba(99,102,241,0.12)', color: '#6366F1', border: 'none' }} />
                            )}
                          </Box>
                        </Box>
                      </Box>
                      <Typography className="font-mono text-[9px] shrink-0 mt-0.5" sx={{ color: textMuted }}>
                        {fmtTimeTh(ev.event_date)}
                      </Typography>
                    </Box>
                    {ev.event_content && (
                      <Typography sx={{ fontSize: 11, color: textSec, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {ev.event_content}
                      </Typography>
                    )}
                    {ev.event_tags && (
                      <Box className="flex flex-wrap gap-1 mt-1.5">
                        {ev.event_tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                          <Box key={tag} className="px-1.5 py-0.5 rounded text-[8px]"
                            sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.07)', color: textMuted }}>
                            {tag}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Stack>
        </Box>
      )}
    </Stack>
  )
}
