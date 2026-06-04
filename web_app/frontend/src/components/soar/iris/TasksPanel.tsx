import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Typography, Stack, Button, IconButton, TextField, Chip,
  Select, MenuItem, FormControl, InputLabel, Skeleton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded'
import { useSnackbar } from 'notistack'
import { soarApi, CaseTask, PlaybookTemplate } from '../../../services/soarApi'
import { hexRgb } from '../soarUtils'

const CASE_COLOR = '#6366F1'

const PRIORITY_META = {
  low:      { color: '#22C55E', label: 'ต่ำ' },
  medium:   { color: '#38BDF8', label: 'ปานกลาง' },
  high:     { color: '#F17422', label: 'สูง' },
  critical: { color: '#EF4444', label: 'วิกฤต' },
}

const STATUS_META = {
  todo:        { color: '#64748B', label: 'รอดำเนินการ', icon: <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 14 }} /> },
  in_progress: { color: '#38BDF8', label: 'กำลังดำเนินการ', icon: <PlayArrowRoundedIcon sx={{ fontSize: 14 }} /> },
  done:        { color: '#22C55E', label: 'เสร็จสิ้น', icon: <CheckCircleRoundedIcon sx={{ fontSize: 14 }} /> },
  blocked:     { color: '#EF4444', label: 'ติดปัญหา', icon: <BlockRoundedIcon sx={{ fontSize: 14 }} /> },
}

interface Props { caseId: number }

function TaskRow({ task, caseId }: { task: CaseTask; caseId: number }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'
  const textSec   = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,40,100,0.75)'

  const statusMeta   = STATUS_META[task.status]   ?? STATUS_META.todo
  const priorityMeta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium

  const cycleMut = useMutation({
    mutationFn: (newStatus: string) => soarApi.updateCaseTask(caseId, task.id, { status: newStatus as CaseTask['status'] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case-tasks', caseId] }),
    onError: () => enqueueSnackbar('อัปเดต task ล้มเหลว', { variant: 'error' }),
  })

  const deleteMut = useMutation({
    mutationFn: () => soarApi.deleteCaseTask(caseId, task.id),
    onSuccess: () => {
      enqueueSnackbar('ลบ task แล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['case-tasks', caseId] })
    },
    onError: () => enqueueSnackbar('ลบ task ล้มเหลว', { variant: 'error' }),
  })

  const nextStatus = { todo: 'in_progress', in_progress: 'done', done: 'todo', blocked: 'in_progress' }

  return (
    <Box
      className="flex items-start gap-2.5 p-2.5 rounded-xl transition-all"
      sx={{
        background: task.status === 'done'
          ? isDark ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.03)'
          : isDark ? 'rgba(255,255,255,0.025)' : 'rgba(248,246,255,0.8)',
        border: `1px solid ${task.status === 'done' ? 'rgba(34,197,94,0.15)' : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.08)'}`,
        opacity: task.status === 'done' ? 0.7 : 1,
      }}
    >
      {/* Status toggle */}
      <Tooltip title={`สถานะ: ${statusMeta.label} — คลิกเพื่อเปลี่ยน`}>
        <IconButton size="small" onClick={() => cycleMut.mutate(nextStatus[task.status])}
          sx={{ color: statusMeta.color, p: 0.5, mt: 0.2, '&:hover': { background: `rgba(${hexRgb(statusMeta.color)},0.1)` } }}>
          {cycleMut.isPending ? <CircularProgress size={14} /> : statusMeta.icon}
        </IconButton>
      </Tooltip>

      <Box className="flex-1 min-w-0">
        <Box className="flex items-start gap-2 flex-wrap">
          <Typography
            sx={{
              fontSize: 12, fontWeight: 600, flex: 1,
              color: task.status === 'done' ? textMuted : (isDark ? '#EDE9FA' : '#1A1033'),
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
            }}>
            {task.title}
          </Typography>
          <Box className="flex items-center gap-1 shrink-0">
            <Box className="px-1.5 py-0.5 rounded text-[9px] font-bold"
              sx={{ background: `rgba(${hexRgb(priorityMeta.color)},0.12)`, color: priorityMeta.color }}>
              {priorityMeta.label}
            </Box>
          </Box>
        </Box>
        {task.description && (
          <Typography sx={{ fontSize: 10.5, color: textMuted, mt: 0.3, lineHeight: 1.5 }}>{task.description}</Typography>
        )}
        <Box className="flex items-center gap-2 mt-1 flex-wrap">
          <Box className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
            sx={{ background: `rgba(${hexRgb(statusMeta.color)},0.1)`, color: statusMeta.color }}>
            {statusMeta.label}
          </Box>
          {task.assignee && <Typography sx={{ fontSize: 9, color: textMuted }}>ผู้รับผิดชอบ: {task.assignee}</Typography>}
          {task.template_id && <Typography sx={{ fontSize: 9, color: '#6366F1' }}>Playbook</Typography>}
        </Box>
      </Box>

      <Tooltip title="ลบ task">
        <IconButton size="small" onClick={() => { if (window.confirm('ลบ task นี้?')) deleteMut.mutate() }}
          sx={{ color: textMuted, p: 0.5, '&:hover': { color: '#EF4444', background: 'rgba(239,68,68,0.08)' } }}>
          <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

export default function TasksPanel({ caseId }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'

  const [showForm, setShowForm] = useState(false)
  const [showPlaybooks, setShowPlaybooks] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', assignee: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['case-tasks', caseId],
    queryFn: () => soarApi.getCaseTasks(caseId).then(r => r.data),
    enabled: !!caseId,
  })

  const { data: tplData } = useQuery({
    queryKey: ['playbook-templates'],
    queryFn: () => soarApi.getPlaybookTemplates().then(r => r.data),
    enabled: showPlaybooks,
  })

  const createMut = useMutation({
    mutationFn: () => soarApi.createCaseTask(caseId, form),
    onSuccess: () => {
      enqueueSnackbar('เพิ่ม task สำเร็จ', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['case-tasks', caseId] })
      setForm({ title: '', description: '', priority: 'medium', assignee: '' })
      setShowForm(false)
    },
    onError: () => enqueueSnackbar('เพิ่ม task ล้มเหลว', { variant: 'error' }),
  })

  const applyTplMut = useMutation({
    mutationFn: (templateId: string) => soarApi.applyTemplate(caseId, templateId),
    onSuccess: (r) => {
      enqueueSnackbar(`ใช้ playbook "${r.data?.template}" สร้าง ${r.data?.tasks_created} tasks สำเร็จ`, { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['case-tasks', caseId] })
      setShowPlaybooks(false)
    },
    onError: () => enqueueSnackbar('ใช้ playbook template ล้มเหลว', { variant: 'error' }),
  })

  const tasks: CaseTask[] = data?.tasks ?? []
  const templates: PlaybookTemplate[] = tplData?.templates ?? []

  const groups = {
    todo:        tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done:        tasks.filter(t => t.status === 'done'),
    blocked:     tasks.filter(t => t.status === 'blocked'),
  }

  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.8)'

  if (isLoading) {
    return <Stack spacing={1}>{[1,2,3].map(i => <Skeleton key={i} height={56} sx={{ borderRadius: 1.5 }} />)}</Stack>
  }

  return (
    <Stack spacing={2.5}>
      {/* Action bar */}
      <Box className="flex flex-wrap gap-2">
        <Button size="small" startIcon={<AddRoundedIcon />} variant="outlined"
          onClick={() => setShowForm(!showForm)}
          sx={{ borderRadius: 2, fontSize: 12, borderColor: `rgba(${hexRgb(CASE_COLOR)},0.4)`, color: CASE_COLOR,
            '&:hover': { borderColor: CASE_COLOR, background: `rgba(${hexRgb(CASE_COLOR)},0.06)` } }}>
          เพิ่ม Task
        </Button>
        <Button size="small" startIcon={<PlaylistAddRoundedIcon />} variant="outlined"
          onClick={() => setShowPlaybooks(true)}
          sx={{ borderRadius: 2, fontSize: 12, borderColor: 'rgba(168,85,247,0.4)', color: '#A855F7',
            '&:hover': { borderColor: '#A855F7', background: 'rgba(168,85,247,0.06)' } }}>
          ใช้ Playbook Template
        </Button>

        {/* Progress summary */}
        {tasks.length > 0 && (
          <Box className="ml-auto flex items-center gap-2">
            {Object.entries(groups).map(([key, list]) => {
              const m = STATUS_META[key as keyof typeof STATUS_META]
              return list.length > 0 ? (
                <Box key={key} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                  sx={{ background: `rgba(${hexRgb(m.color)},0.1)`, border: `1px solid rgba(${hexRgb(m.color)},0.2)` }}>
                  <Typography className="font-mono font-bold text-[10px]" sx={{ color: m.color }}>{list.length}</Typography>
                  <Typography sx={{ fontSize: 9, color: textMuted }}>{m.label}</Typography>
                </Box>
              ) : null
            })}
          </Box>
        )}
      </Box>

      {/* Add form */}
      {showForm && (
        <Box className="rounded-xl p-3" sx={{ background: cardBg, border: `1px solid rgba(${hexRgb(CASE_COLOR)},0.2)` }}>
          <Stack spacing={1.5}>
            <TextField size="small" label="ชื่อ Task *" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 12 } }} />
            <TextField size="small" label="รายละเอียด (optional)" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} fullWidth multiline rows={2}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 11.5 } }} />
            <Box className="grid grid-cols-2 gap-2">
              <FormControl size="small">
                <InputLabel sx={{ fontSize: 12 }}>ความสำคัญ</InputLabel>
                <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} label="ความสำคัญ" sx={{ borderRadius: '8px', fontSize: 12 }}>
                  {Object.entries(PRIORITY_META).map(([k, v]) => (
                    <MenuItem key={k} value={k} sx={{ fontSize: 12 }}>
                      <Box className="flex items-center gap-2">
                        <Box className="w-2 h-2 rounded-full" sx={{ background: v.color }} />
                        {v.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField size="small" label="ผู้รับผิดชอบ" value={form.assignee}
                onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 12 } }} />
            </Box>
            <Box className="flex gap-2 justify-end">
              <Button size="small" onClick={() => setShowForm(false)} sx={{ borderRadius: 2, fontSize: 11 }}>ยกเลิก</Button>
              <Button size="small" variant="contained" disabled={!form.title.trim() || createMut.isPending}
                onClick={() => createMut.mutate()}
                sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, background: CASE_COLOR, '&:hover': { background: '#4F46E5' } }}>
                {createMut.isPending ? <CircularProgress size={12} color="inherit" sx={{ mr: 0.5 }} /> : null}
                เพิ่ม Task
              </Button>
            </Box>
          </Stack>
        </Box>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <Box className="py-10 flex flex-col items-center gap-3">
          <Typography sx={{ fontSize: 36 }}>✓</Typography>
          <Typography sx={{ fontSize: 12, color: textMuted }}>ยังไม่มี task — เพิ่ม task หรือใช้ Playbook Template</Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {/* In progress first */}
          {groups.in_progress.map(t => <TaskRow key={t.id} task={t} caseId={caseId} />)}
          {groups.blocked.map(t => <TaskRow key={t.id} task={t} caseId={caseId} />)}
          {groups.todo.map(t => <TaskRow key={t.id} task={t} caseId={caseId} />)}
          {groups.done.map(t => <TaskRow key={t.id} task={t} caseId={caseId} />)}
        </Stack>
      )}

      {/* Playbook templates dialog */}
      <Dialog open={showPlaybooks} onClose={() => setShowPlaybooks(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: isDark ? '#16112A' : '#F8F6FF', borderRadius: 3 } }}>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>เลือก Playbook Template</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {templates.length === 0 ? (
              <Box className="py-6 flex justify-center">
                <CircularProgress size={24} />
              </Box>
            ) : templates.map(tpl => (
              <Box key={tpl.id} className="p-3 rounded-xl cursor-pointer transition-all"
                onClick={() => applyTplMut.mutate(tpl.id)}
                sx={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.8)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.15)'}`,
                  '&:hover': { background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)', transform: 'translateY(-1px)' },
                }}>
                <Box className="flex items-start gap-2">
                  <Box className="flex-1">
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033' }}>{tpl.name}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,100,0.6)', mt: 0.3 }}>{tpl.description}</Typography>
                  </Box>
                  <Box className="px-2 py-0.5 rounded text-[9px] font-semibold shrink-0"
                    sx={{ background: 'rgba(99,102,241,0.12)', color: CASE_COLOR }}>
                    {tpl.tasks.length} tasks
                  </Box>
                </Box>
                {applyTplMut.isPending && (
                  <Box className="flex items-center gap-1 mt-1">
                    <CircularProgress size={10} />
                    <Typography sx={{ fontSize: 10, color: textMuted }}>กำลังสร้าง tasks...</Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPlaybooks(false)} sx={{ borderRadius: 2, fontSize: 12 }}>ยกเลิก</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
