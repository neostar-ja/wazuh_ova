import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Drawer, Box, Typography, Stack, CircularProgress, Skeleton,
  Button, IconButton, TextField, Chip, Tooltip, Divider,
  Alert as MuiAlert,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'
import EscalatorWarningRoundedIcon from '@mui/icons-material/EscalatorWarningRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { useSnackbar } from 'notistack'
import { format } from 'date-fns'
import { soarApi, CaseNoteGroup, CaseIoc, CaseTimelineEvent, IrisCase, IOC_TYPES } from '../../../services/soarApi'
import { hexRgb, fmtTime, TLP_LABELS } from '../soarUtils'
import { BRAND, SEV_COLOR } from '../../ui/tokens'

const CASE_COLOR = '#6366F1'

// ── Sub-tab nav ────────────────────────────────────────────────────────────────

function SubTabBar({ active, onChange, tabs }: {
  active: string
  onChange: (t: string) => void
  tabs: { key: string; label: string; icon: React.ReactNode; count?: number }[]
}) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'

  return (
    <Box className="flex items-center gap-0.5 p-1 rounded-xl"
      sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.06)' }}>
      {tabs.map(t => (
        <Box key={t.key}
          onClick={() => onChange(t.key)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 text-xs font-semibold select-none"
          sx={{
            background: active === t.key ? CASE_COLOR : 'transparent',
            color: active === t.key ? '#fff' : textMuted,
            '&:hover': active !== t.key ? { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.08)', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)' } : {},
          }}>
          {t.icon}
          <span>{t.label}</span>
          {t.count !== undefined && (
            <Box className="px-1.5 rounded-full text-[9px] font-bold ml-0.5"
              sx={{ background: active === t.key ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.12)'), color: active === t.key ? '#fff' : textMuted }}>
              {t.count}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  )
}

// ── Notes panel ────────────────────────────────────────────────────────────────

function NotesPanel({ caseId }: { caseId: number }) {
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

// ── IOCs panel ─────────────────────────────────────────────────────────────────

function IocPanel({ caseId }: { caseId: number }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.8)'
  const [form, setForm] = useState({ ioc_value: '', ioc_type_id: 76, ioc_description: '' })
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['case-iocs', caseId],
    queryFn: () => soarApi.getCaseIocs(caseId).then(r => r.data),
    enabled: !!caseId,
  })

  const addMut = useMutation({
    mutationFn: () => soarApi.addCaseIoc(caseId, form),
    onSuccess: () => {
      enqueueSnackbar('เพิ่ม IOC เรียบร้อยแล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['case-iocs', caseId] })
      setForm({ ioc_value: '', ioc_type_id: 76, ioc_description: '' })
      setShowForm(false)
    },
    onError: () => enqueueSnackbar('ไม่สามารถเพิ่ม IOC ได้', { variant: 'error' }),
  })

  const iocs: CaseIoc[] = data?.data ?? []

  if (isLoading) return <Stack spacing={1}>{[1,2].map(i => <Skeleton key={i} height={52} sx={{ borderRadius: 1.5 }} />)}</Stack>

  return (
    <Stack spacing={2}>
      {!showForm ? (
        <Button size="small" startIcon={<AddRoundedIcon />} variant="outlined"
          onClick={() => setShowForm(true)}
          sx={{ alignSelf: 'flex-start', borderRadius: 2, fontSize: 12, borderColor: `rgba(${hexRgb(SEV_COLOR.high)},0.4)`, color: SEV_COLOR.high,
            '&:hover': { borderColor: SEV_COLOR.high, background: `rgba(${hexRgb(SEV_COLOR.high)},0.06)` } }}>
          เพิ่ม IOC
        </Button>
      ) : (
        <Box className="rounded-xl p-3" sx={{ background: cardBg, border: `1px solid rgba(${hexRgb(SEV_COLOR.high)},0.2)` }}>
          <Stack spacing={1.5}>
            <TextField size="small" label="IOC Value *" value={form.ioc_value}
              onChange={e => setForm(f => ({ ...f, ioc_value: e.target.value }))} fullWidth
              placeholder="IP, domain, hash, URL..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: '"IBM Plex Mono", monospace' } }} />
            <Box className="grid grid-cols-2 gap-2">
              <TextField size="small" label="ประเภท IOC" value={form.ioc_type_id}
                onChange={e => setForm(f => ({ ...f, ioc_type_id: Number(e.target.value) }))}
                select SelectProps={{ native: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}>
                {IOC_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </TextField>
              <TextField size="small" label="คำอธิบาย" value={form.ioc_description}
                onChange={e => setForm(f => ({ ...f, ioc_description: e.target.value }))}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            </Box>
            <Box className="flex gap-2 justify-end">
              <Button size="small" onClick={() => setShowForm(false)} sx={{ borderRadius: 2, fontSize: 11 }}>ยกเลิก</Button>
              <Button size="small" variant="contained" disabled={!form.ioc_value.trim() || addMut.isPending}
                onClick={() => addMut.mutate()}
                sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, background: SEV_COLOR.high, '&:hover': { background: '#D56018' } }}>
                {addMut.isPending ? <CircularProgress size={12} color="inherit" sx={{ mr: 0.5 }} /> : null}
                เพิ่ม IOC
              </Button>
            </Box>
          </Stack>
        </Box>
      )}

      {iocs.length === 0 ? (
        <Box className="py-10 flex flex-col items-center gap-2">
          <BugReportRoundedIcon sx={{ fontSize: 32, color: textMuted, opacity: 0.4 }} />
          <Typography sx={{ fontSize: 12, color: textMuted }}>ยังไม่มี IOC ในเคสนี้</Typography>
        </Box>
      ) : (
        <Box className="rounded-xl overflow-hidden" sx={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}` }}>
          {iocs.map((ioc, i) => {
            const tlp = TLP_LABELS[2]
            return (
              <Box key={ioc.ioc_id}
                className="flex items-start gap-3 px-3 py-2.5"
                sx={{
                  background: i % 2 === 0 ? cardBg : 'transparent',
                  borderBottom: i < iocs.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.07)'}` : 'none',
                }}>
                <Box className="flex-1 min-w-0">
                  <Typography className="font-mono text-[11px] break-all font-semibold" sx={{ color: SEV_COLOR.high }}>
                    {ioc.ioc_value}
                  </Typography>
                  <Box className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Box className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                      sx={{ background: 'rgba(20,184,166,0.12)', color: '#14B8A6' }}>
                      {ioc.ioc_type?.type_name ?? 'unknown'}
                    </Box>
                    {ioc.ioc_description && (
                      <Typography sx={{ fontSize: 10, color: textMuted }}>{ioc.ioc_description}</Typography>
                    )}
                  </Box>
                </Box>
                <Box className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0"
                  sx={{ background: `rgba(${hexRgb(tlp.color)},0.12)`, color: tlp.color, border: `1px solid rgba(${hexRgb(tlp.color)},0.25)` }}>
                  {ioc.ioc_tlp?.tlp_name ?? 'TLP:GREEN'}
                </Box>
              </Box>
            )
          })}
        </Box>
      )}
    </Stack>
  )
}

// ── Timeline panel ─────────────────────────────────────────────────────────────

function TimelinePanel({ caseId }: { caseId: number }) {
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
          sx={{ alignSelf: 'flex-start', borderRadius: 2, fontSize: 12, borderColor: `rgba(${hexRgb('#14B8A6')},0.4)`, color: '#14B8A6',
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

// ── Main Drawer ────────────────────────────────────────────────────────────────

interface Props {
  caseData: IrisCase | null
  irisUrl?: string
  open: boolean
  onClose: () => void
}

export default function CaseDetailDrawer({ caseData, irisUrl, open, onClose }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('notes')
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const cardBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)'

  const caseId = caseData?.case_id

  const { data: detailResp, isLoading: detailLoading } = useQuery({
    queryKey: ['case-detail', caseId],
    queryFn: () => soarApi.getIrisCase(caseId!).then(r => r.data),
    enabled: open && !!caseId,
  })

  const isOpen = !caseData?.case_close_date

  const closeMut = useMutation({
    mutationFn: () => isOpen ? soarApi.closeIrisCase(caseId!) : soarApi.reopenIrisCase(caseId!),
    onSuccess: () => {
      enqueueSnackbar(isOpen ? 'ปิดเคสเรียบร้อยแล้ว' : 'เปิดเคสใหม่เรียบร้อยแล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['iris-cases'] })
      queryClient.invalidateQueries({ queryKey: ['soar-stats'] })
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] })
    },
    onError: () => enqueueSnackbar('การดำเนินการล้มเหลว', { variant: 'error' }),
  })

  const escalateMut = useMutation({
    mutationFn: () => soarApi.triggerEscalate(caseId!, 'SOC Analyst', caseData?.case_name),
    onSuccess: () => enqueueSnackbar('ส่งคำสั่ง Escalate ไปยัง Shuffle แล้ว', { variant: 'success' }),
    onError: () => enqueueSnackbar('ไม่สามารถส่งคำสั่ง Escalate ได้', { variant: 'error' }),
  })

  const tabs = [
    { key: 'notes',    label: 'บันทึก',     icon: <NotesRoundedIcon sx={{ fontSize: 13 }} /> },
    { key: 'iocs',     label: 'IOC',         icon: <BugReportRoundedIcon sx={{ fontSize: 13 }} /> },
    { key: 'timeline', label: 'Timeline',    icon: <TimelineRoundedIcon sx={{ fontSize: 13 }} /> },
  ]

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 520 },
          background: isDark ? '#16112A' : '#F8F6FF',
          borderLeft: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(123,91,164,0.12)',
        },
      }}>

      {/* Header */}
      <Box className="sticky top-0 z-10 px-5 py-4"
        sx={{
          background: isDark ? 'rgba(22,17,42,0.95)' : 'rgba(248,246,255,0.95)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'}`,
          backdropFilter: 'blur(10px)',
        }}>
        <Box className="flex items-center justify-between mb-3">
          <Box className="flex items-center gap-2.5">
            <Box className="w-8 h-8 rounded-xl flex items-center justify-center"
              sx={{ background: `rgba(${hexRgb(CASE_COLOR)},0.12)` }}>
              <FolderOpenRoundedIcon sx={{ fontSize: 16, color: CASE_COLOR }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033', lineHeight: 1.2 }}>
                {caseData?.case_name ?? '—'}
              </Typography>
              <Typography className="font-mono" sx={{ fontSize: 10, color: textMuted }}>
                เคส #{caseId}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: textMuted }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Case meta */}
        <Box className="flex flex-wrap gap-2 items-center mb-3">
          <Chip
            size="small"
            label={isOpen ? 'กำลังดำเนินการ' : 'ปิดแล้ว'}
            sx={{
              fontSize: 10, fontWeight: 700, height: 22,
              background: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
              color: isOpen ? '#22C55E' : '#64748B',
              border: isOpen ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(100,116,139,0.3)',
            }}
          />
          {caseData?.owner && (
            <Typography sx={{ fontSize: 10, color: textMuted }}>
              ผู้รับผิดชอบ: <Box component="span" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.6)', fontWeight: 600 }}>{caseData.owner}</Box>
            </Typography>
          )}
          {caseData?.client_name && (
            <Typography sx={{ fontSize: 10, color: textMuted }}>
              ลูกค้า: <Box component="span" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.6)', fontWeight: 600 }}>{caseData.client_name}</Box>
            </Typography>
          )}
        </Box>
        <Box className="flex flex-wrap gap-1.5 text-[9px]" sx={{ color: textMuted }}>
          <span>เปิด: {caseData?.case_open_date ?? '—'}</span>
          {caseData?.case_close_date && <span>· ปิด: {caseData.case_close_date}</span>}
        </Box>
      </Box>

      {/* Action buttons */}
      <Box className="px-5 py-3 flex flex-wrap gap-2"
        sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}` }}>
        <Tooltip title={isOpen ? 'ปิดเคสนี้' : 'เปิดเคสนี้ใหม่'}>
          <Button size="small" variant="outlined"
            startIcon={isOpen ? <LockRoundedIcon sx={{ fontSize: 13 }} /> : <LockOpenRoundedIcon sx={{ fontSize: 13 }} />}
            disabled={closeMut.isPending}
            onClick={() => closeMut.mutate()}
            sx={{ borderRadius: 2, fontSize: 11, fontWeight: 600,
              borderColor: isOpen ? 'rgba(100,116,139,0.4)' : 'rgba(34,197,94,0.4)',
              color: isOpen ? '#64748B' : '#22C55E',
              '&:hover': { borderColor: isOpen ? '#64748B' : '#22C55E', background: isOpen ? 'rgba(100,116,139,0.06)' : 'rgba(34,197,94,0.06)' } }}>
            {closeMut.isPending ? <CircularProgress size={11} color="inherit" sx={{ mr: 0.5 }} /> : null}
            {isOpen ? 'ปิดเคส' : 'เปิดใหม่'}
          </Button>
        </Tooltip>

        <Tooltip title="ส่ง Escalate ไปยัง Shuffle SOAR">
          <Button size="small" variant="outlined"
            startIcon={<EscalatorWarningRoundedIcon sx={{ fontSize: 13 }} />}
            disabled={escalateMut.isPending}
            onClick={() => escalateMut.mutate()}
            sx={{ borderRadius: 2, fontSize: 11, fontWeight: 600,
              borderColor: 'rgba(245,158,11,0.4)', color: '#F59E0B',
              '&:hover': { borderColor: '#F59E0B', background: 'rgba(245,158,11,0.06)' } }}>
            {escalateMut.isPending ? <CircularProgress size={11} color="inherit" sx={{ mr: 0.5 }} /> : null}
            Escalate via Shuffle
          </Button>
        </Tooltip>

        {irisUrl && (
          <Tooltip title="เปิดใน DFIR-IRIS">
            <Button size="small" variant="text"
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 12 }} />}
              component="a" href={`${irisUrl}/case?cid=${caseId}`} target="_blank" rel="noopener"
              sx={{ borderRadius: 2, fontSize: 11, color: CASE_COLOR, '&:hover': { background: `rgba(${hexRgb(CASE_COLOR)},0.06)` } }}>
              เปิด IRIS
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Content */}
      <Box className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        {detailLoading ? (
          <Stack spacing={2}>
            {[1,2,3].map(i => <Skeleton key={i} height={80} sx={{ borderRadius: 2 }} />)}
          </Stack>
        ) : (
          <Stack spacing={3}>
            {/* Case description */}
            {caseData?.case_description && (
              <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}` }}>
                <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: CASE_COLOR, mb: 1, textTransform: 'uppercase' }}>
                  รายละเอียดเคส
                </Typography>
                <Typography sx={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {caseData.case_description}
                </Typography>
              </Box>
            )}

            {/* Tab nav */}
            <SubTabBar active={activeTab} onChange={setActiveTab} tabs={tabs} />

            {/* Tab content */}
            {activeTab === 'notes'    && <NotesPanel    caseId={caseId!} />}
            {activeTab === 'iocs'     && <IocPanel      caseId={caseId!} />}
            {activeTab === 'timeline' && <TimelinePanel caseId={caseId!} />}
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}
