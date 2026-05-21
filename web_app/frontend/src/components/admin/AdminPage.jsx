import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Card, CardContent, Typography, Tabs, Tab, Grid,
  Table, TableBody, TableCell, TableHead, TableRow,
  Button, TextField, Chip, Alert, Select, MenuItem, FormControl,
  InputLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Tooltip, IconButton,
} from '@mui/material'
import Editor from '@monaco-editor/react'
import RefreshIcon from '@mui/icons-material/Refresh'
import SaveIcon from '@mui/icons-material/Save'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import AddIcon from '@mui/icons-material/Add'
import { adminApi } from '../../services/api'
import { format } from 'date-fns'
import { useSnackbar } from 'notistack'
import { useThemeMode } from '../../theme/ThemeContext'

function RulesTab() {
  const { mode } = useThemeMode()
  const { enqueueSnackbar } = useSnackbar()
  const [selectedFile, setSelectedFile] = useState(null)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [deploying, setDeploying] = useState(false)

  const { data: rulesData } = useQuery({
    queryKey: ['admin-rules'],
    queryFn: () => adminApi.listRules().then(r => r.data),
  })

  const files = rulesData?.data?.affected_items || []

  const loadFile = async (filename) => {
    try {
      const r = await adminApi.getRule(filename)
      setSelectedFile(filename)
      setContent(r.data.content || '')
    } catch (e) {
      enqueueSnackbar(`โหลดไฟล์ล้มเหลว: ${filename}`, { variant: 'error' })
    }
  }

  const saveFile = async () => {
    if (!selectedFile) return
    setSaving(true)
    try {
      await adminApi.saveRule(selectedFile, content)
      enqueueSnackbar('บันทึกสำเร็จ', { variant: 'success' })
    } catch {
      enqueueSnackbar('บันทึกล้มเหลว', { variant: 'error' })
    }
    setSaving(false)
  }

  const deploy = async () => {
    setDeploying(true)
    try {
      await adminApi.deploy()
      enqueueSnackbar('Restart Wazuh Manager สำเร็จ', { variant: 'success' })
    } catch {
      enqueueSnackbar('Restart ล้มเหลว', { variant: 'error' })
    }
    setDeploying(false)
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={3}>
        <Typography variant="subtitle2" mb={1}>ไฟล์ Rules</Typography>
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: 400, overflow: 'auto' }}>
          {files.map((f, i) => (
            <Box
              key={i}
              onClick={() => loadFile(f.filename)}
              sx={{
                px: 1.5, py: 0.8, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace',
                bgcolor: selectedFile === f.filename ? 'primary.main' + '22' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
                borderBottom: 1, borderColor: 'divider',
              }}
            >
              {f.filename}
            </Box>
          ))}
        </Box>
      </Grid>
      <Grid item xs={12} sm={9}>
        {selectedFile ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">{selectedFile}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
                  variant="outlined" onClick={saveFile} disabled={saving}>บันทึก</Button>
                <Button size="small" startIcon={deploying ? <CircularProgress size={14} /> : <RocketLaunchIcon />}
                  variant="contained" color="warning" onClick={deploy} disabled={deploying}>Deploy</Button>
              </Box>
            </Box>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Editor
                height="400px"
                language="xml"
                value={content}
                theme={mode === 'dark' ? 'vs-dark' : 'light'}
                onChange={v => setContent(v || '')}
                options={{ fontSize: 13, minimap: { enabled: false }, wordWrap: 'on' }}
              />
            </Box>
          </>
        ) : (
          <Alert severity="info">เลือกไฟล์จากรายการด้านซ้าย</Alert>
        )}
      </Grid>
    </Grid>
  )
}

function TuningTab() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ rule_id: '', original_level: 7, tuned_level: 3, reason: '' })

  const { data: tunings = [] } = useQuery({
    queryKey: ['admin-tuning'],
    queryFn: () => adminApi.listTuning().then(r => r.data),
  })

  const addMut = useMutation({
    mutationFn: adminApi.addTuning,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tuning'] })
      setOpen(false)
      enqueueSnackbar('เพิ่ม Tuning สำเร็จ', { variant: 'success' })
    },
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setOpen(true)}>เพิ่ม Tuning</Button>
      </Box>
      <Table size="small">
        <TableHead><TableRow>
          <TableCell>Rule ID</TableCell>
          <TableCell>ระดับเดิม</TableCell>
          <TableCell>ระดับใหม่</TableCell>
          <TableCell>เหตุผล</TableCell>
          <TableCell>เพิ่มโดย</TableCell>
          <TableCell>วันที่</TableCell>
          <TableCell>สถานะ</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {tunings.map(t => (
            <TableRow key={t.id} hover>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{t.rule_id}</TableCell>
              <TableCell><Chip size="small" label={t.original_level} /></TableCell>
              <TableCell><Chip size="small" label={t.tuned_level} color="warning" /></TableCell>
              <TableCell sx={{ fontSize: 12 }}>{t.reason}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{t.added_by}</TableCell>
              <TableCell sx={{ fontSize: 11 }}>{t.added_at ? format(new Date(t.added_at), 'dd/MM/yy') : '-'}</TableCell>
              <TableCell><Chip size="small" label={t.status} color={t.status === 'active' ? 'success' : 'default'} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>เพิ่ม Alert Tuning</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth size="small" label="Rule ID" value={form.rule_id} onChange={e => setForm(f => ({ ...f, rule_id: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="ระดับเดิม" type="number" value={form.original_level} onChange={e => setForm(f => ({ ...f, original_level: +e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="ระดับใหม่" type="number" value={form.tuned_level} onChange={e => setForm(f => ({ ...f, tuned_level: +e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="เหตุผล" multiline rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={() => addMut.mutate(form)}>บันทึก</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function UsersTab() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'viewer' })

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers().then(r => r.data),
  })

  const addMut = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setOpen(false)
      enqueueSnackbar('สร้างผู้ใช้สำเร็จ', { variant: 'success' })
    },
    onError: err => enqueueSnackbar(err.response?.data?.detail || 'เกิดข้อผิดพลาด', { variant: 'error' }),
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setOpen(true)}>สร้างผู้ใช้</Button>
      </Box>
      <Table size="small">
        <TableHead><TableRow>
          <TableCell>Username</TableCell>
          <TableCell>ชื่อ</TableCell>
          <TableCell>Email</TableCell>
          <TableCell>Role</TableCell>
          <TableCell>สถานะ</TableCell>
          <TableCell>เข้าสู่ระบบล่าสุด</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {users.map(u => (
            <TableRow key={u.id} hover>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{u.username}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{u.full_name}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{u.email}</TableCell>
              <TableCell><Chip size="small" label={u.role} color={u.role === 'superadmin' ? 'error' : u.role === 'admin' ? 'warning' : 'default'} /></TableCell>
              <TableCell><Chip size="small" label={u.is_active ? 'active' : 'inactive'} color={u.is_active ? 'success' : 'default'} /></TableCell>
              <TableCell sx={{ fontSize: 11 }}>{u.last_login ? format(new Date(u.last_login), 'dd/MM/yy HH:mm') : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>สร้างผู้ใช้ใหม่</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[['username','Username'],['full_name','ชื่อเต็ม'],['email','Email'],['password','รหัสผ่าน']].map(([k, l]) => (
              <Grid item xs={12} sm={6} key={k}>
                <TextField fullWidth size="small" label={l} type={k === 'password' ? 'password' : 'text'}
                  value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select value={form.role} label="Role" onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {['viewer','analyst','admin','superadmin'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={() => addMut.mutate(form)}>สร้าง</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function AuditTab() {
  const { data: logs = [] } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => adminApi.auditLog().then(r => r.data),
    refetchInterval: 30000,
  })

  return (
    <Table size="small">
      <TableHead><TableRow>
        <TableCell>เวลา</TableCell>
        <TableCell>ผู้ใช้</TableCell>
        <TableCell>Action</TableCell>
        <TableCell>Target</TableCell>
        <TableCell>IP</TableCell>
      </TableRow></TableHead>
      <TableBody>
        {logs.map(l => (
          <TableRow key={l.id} hover>
            <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap' }}>
              {l.timestamp ? format(new Date(l.timestamp), 'dd/MM HH:mm:ss') : '-'}
            </TableCell>
            <TableCell sx={{ fontSize: 12 }}>{l.username}</TableCell>
            <TableCell><Chip size="small" label={l.action} /></TableCell>
            <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{l.target || '-'}</TableCell>
            <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{l.ip_address || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

const TABS = [
  { label: 'Rules & Decoders', component: <RulesTab /> },
  { label: 'Alert Tuning', component: <TuningTab /> },
  { label: 'ผู้ใช้ระบบ', component: <UsersTab /> },
  { label: 'Audit Log', component: <AuditTab /> },
]

export default function AdminPage() {
  const [tab, setTab] = useState(0)

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>ผู้ดูแลระบบ</Typography>
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TABS.map((t, i) => <Tab key={i} label={t.label} />)}
        </Tabs>
        <CardContent>
          {TABS[tab].component}
        </CardContent>
      </Card>
    </Box>
  )
}
