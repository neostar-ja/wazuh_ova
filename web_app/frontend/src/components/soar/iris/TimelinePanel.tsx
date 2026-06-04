import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Box, Typography, Stack, Button, TextField, CircularProgress, Skeleton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'
import { format } from 'date-fns'
import { useSnackbar } from 'notistack'
import { soarApi, CaseTimelineEvent } from '../../../services/soarApi'
import { fmtTime } from '../soarUtils'

export default function TimelinePanel({ caseId }: { caseId: number }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.8)'
  const [form, setForm] = useState({ title: '', content: '', event_date: format(new Date(), "yyyy-MM-dd'T'HH:mm") })
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['case-timeline', caseId],
    queryFn: () => soarApi.getCaseTimeline(caseId).then(r => r.data),
    enabled: !!caseId,
  })

  const addMut = useMutation({
    mutationFn: () => soarApi.addCaseTimelineEvent(caseId, { ...form, event_date: form.event_date + ':00' }),
    onSuccess: () => {
      enqueueSnackbar('เพิ่มเหตุการณ์ใน Timeline เรียบร้อยแล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['case-timeline', caseId] })
      setForm({ title: '', content: '', event_date: format(new Date(), "yyyy-MM-dd'T'HH:mm") })
      setShowForm(false)
    },
    onError: () => enqueueSnackbar('ไม่สามารถเพิ่มเหตุการณ์ได้', { variant: 'error' }),
  })

  const events: CaseTimelineEvent[] = data?.data?.timeline ?? []

  if (isLoading) return <Stack spacing={1}>{[1,2,3].map(i => <Skeleton key={i} height={60} sx={{ borderRadius: 1.5 }} />)}</Stack>

  return (
    <Stack spacing={2}>
      {!showForm ? (
        <Button size="small" startIcon={<AddRoundedIcon />} variant="outlined"
          onClick={() => setShowForm(true)}
          sx={{ alignSelf: 'flex-start', borderRadius: 2, fontSize: 12, borderColor: 'rgba(20,184,166,0.4)', color: '#14B8A6',
            '&:hover': { borderColor: '#14B8A6', background: 'rgba(20,184,166,0.06)' } }}>
          เพิ่มเหตุการณ์
        </Button>
      ) : (
        <Box className="rounded-xl p-3" sx={{ background: cardBg, border: '1px solid rgba(20,184,166,0.2)' }}>
          <Stack spacing={1.5}>
            <TextField size="small" label="หัวข้อเหตุการณ์ *" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            <TextField size="small" label="เนื้อหา" value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} fullWidth
              multiline rows={2} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            <TextField size="small" label="วันเวลาเหตุการณ์" type="datetime-local" value={form.event_date}
              onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputLabelProps={{ shrink: true }} />
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

      {events.length === 0 ? (
        <Box className="py-10 flex flex-col items-center gap-2">
          <TimelineRoundedIcon sx={{ fontSize: 32, color: textMuted, opacity: 0.4 }} />
          <Typography sx={{ fontSize: 12, color: textMuted }}>ยังไม่มีเหตุการณ์ใน Timeline</Typography>
        </Box>
      ) : (
        <Box className="relative pl-5">
          <Box className="absolute left-2 top-0 bottom-0 w-px" sx={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.15)' }} />
          <Stack spacing={2}>
            {[...events].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()).map(ev => (
              <Box key={ev.event_id} className="relative">
                <Box className="absolute -left-5 top-1.5 w-3 h-3 rounded-full border-2"
                  sx={{ background: ev.event_color || '#14B8A6', borderColor: isDark ? '#1E1730' : '#F8F6FF' }} />
                <Box className="rounded-xl p-3" sx={{ background: cardBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.08)'}` }}>
                  <Box className="flex items-start justify-between gap-2">
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033' }}>
                      {ev.event_title}
                    </Typography>
                    <Typography className="font-mono text-[9px] shrink-0" sx={{ color: textMuted }}>
                      {fmtTime(ev.event_date)}
                    </Typography>
                  </Box>
                  {ev.event_content && (
                    <Typography sx={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.6)', mt: 0.5, lineHeight: 1.5 }}>
                      {ev.event_content}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  )
}
