import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Box, Typography, Stack, Button, TextField, CircularProgress, Skeleton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import { useSnackbar } from 'notistack'
import { soarApi, CaseNoteGroup } from '../../../services/soarApi'
import { hexRgb, fmtTime } from '../soarUtils'

const CASE_COLOR = '#6366F1'

export default function NotesPanel({ caseId }: { caseId: number }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.8)'
  const [form, setForm] = useState({ title: '', content: '' })
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['case-notes', caseId],
    queryFn: () => soarApi.getCaseNotes(caseId).then(r => r.data),
    enabled: !!caseId,
  })

  const addMut = useMutation({
    mutationFn: () => soarApi.addCaseNote(caseId, { ...form, group_title: 'SOC Notes' }),
    onSuccess: () => {
      enqueueSnackbar('เพิ่มบันทึกเรียบร้อยแล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['case-notes', caseId] })
      setForm({ title: '', content: '' })
      setShowForm(false)
    },
    onError: () => enqueueSnackbar('ไม่สามารถเพิ่มบันทึกได้', { variant: 'error' }),
  })

  const groups: CaseNoteGroup[] = data?.data ?? []
  const allNotes = groups.flatMap(g => (g.notes ?? []).map(n => ({ ...n, group_title: g.group_title })))

  if (isLoading) return <Stack spacing={1}>{[1,2].map(i => <Skeleton key={i} height={60} sx={{ borderRadius: 1.5 }} />)}</Stack>

  return (
    <Stack spacing={2}>
      {!showForm ? (
        <Button size="small" startIcon={<AddRoundedIcon />} variant="outlined"
          onClick={() => setShowForm(true)}
          sx={{ alignSelf: 'flex-start', borderRadius: 2, fontSize: 12, borderColor: `rgba(${hexRgb(CASE_COLOR)},0.4)`, color: CASE_COLOR,
            '&:hover': { borderColor: CASE_COLOR, background: `rgba(${hexRgb(CASE_COLOR)},0.06)` } }}>
          เพิ่มบันทึก
        </Button>
      ) : (
        <Box className="rounded-xl p-3" sx={{ background: cardBg, border: `1px solid rgba(${hexRgb(CASE_COLOR)},0.2)` }}>
          <Stack spacing={1.5}>
            <TextField size="small" label="หัวข้อบันทึก *" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            <TextField size="small" label="เนื้อหา" value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} fullWidth
              multiline rows={3} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            <Box className="flex gap-2 justify-end">
              <Button size="small" onClick={() => { setShowForm(false); setForm({ title: '', content: '' }) }} sx={{ borderRadius: 2, fontSize: 11 }}>ยกเลิก</Button>
              <Button size="small" variant="contained" disabled={!form.title.trim() || addMut.isPending}
                onClick={() => addMut.mutate()}
                sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, background: CASE_COLOR, '&:hover': { background: '#4F46E5' } }}>
                {addMut.isPending ? <CircularProgress size={12} color="inherit" sx={{ mr: 0.5 }} /> : null}
                บันทึก
              </Button>
            </Box>
          </Stack>
        </Box>
      )}

      {allNotes.length === 0 ? (
        <Box className="py-10 flex flex-col items-center gap-2">
          <NotesRoundedIcon sx={{ fontSize: 32, color: textMuted, opacity: 0.4 }} />
          <Typography sx={{ fontSize: 12, color: textMuted }}>ยังไม่มีบันทึก</Typography>
        </Box>
      ) : (
        allNotes.map(note => (
          <Box key={note.note_id} className="rounded-xl p-3" sx={{ background: cardBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}` }}>
            <Box className="flex items-start justify-between gap-2 mb-1">
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033' }}>
                {note.note_title}
              </Typography>
              <Typography sx={{ fontSize: 9, color: textMuted, whiteSpace: 'nowrap' }}>
                {fmtTime(note.note_lastupdate || note.note_creationdate)}
              </Typography>
            </Box>
            {note.group_title && (
              <Typography sx={{ fontSize: 9, color: CASE_COLOR, mb: 1, fontWeight: 600, letterSpacing: '0.05em' }}>
                {note.group_title}
              </Typography>
            )}
            <Typography sx={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.65)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {note.note_content || '(ไม่มีเนื้อหา)'}
            </Typography>
          </Box>
        ))
      )}
    </Stack>
  )
}
