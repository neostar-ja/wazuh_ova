import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import {
  Avatar, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, Grid, IconButton, InputLabel,
  MenuItem, Paper, Select, Skeleton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
  useTheme,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded'
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded'
import PersonOffRoundedIcon from '@mui/icons-material/PersonOffRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import { format } from 'date-fns'
import { useSnackbar } from 'notistack'
import { adminApi } from '../../../services/api'
import { UserRole } from '../../../types/auth'
import { ROLE_COLOR, ROLE_TH, SectionHeader } from '../shared'

const ACCENT = '#8B5CF6'

const ROLE_GRADIENT: Record<UserRole, string> = {
  superadmin: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
  admin:      'linear-gradient(135deg, #3B82F6, #2563EB)',
  analyst:    'linear-gradient(135deg, #22C55E, #16A34A)',
  viewer:     'linear-gradient(135deg, #94A3B8, #64748B)',
}

function RoleBadge({ role }: { role: UserRole }) {
  const color = ROLE_COLOR[role]
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center',
      px: 0.875, py: 0.3, borderRadius: 1,
      bgcolor: alpha(color, 0.14),
      color: color, fontSize: 11, fontWeight: 700,
      border: `1px solid ${alpha(color, 0.3)}`,
      letterSpacing: '0.02em',
    }}>
      {ROLE_TH[role]}
    </Box>
  )
}

export function UsersTab() {
  const qc = useQueryClient()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const [addOpen, setAddOpen] = useState(false)
  const [pwdTarget, setPwdTarget] = useState<any>(null)
  const [pwdValue, setPwdValue] = useState('')
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'viewer' as UserRole })
  const [formError, setFormError] = useState<Record<string, string>>({})

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers().then(r => r.data),
  })

  const addMut = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setAddOpen(false)
      setForm({ username: '', email: '', full_name: '', password: '', role: 'viewer' })
      enqueueSnackbar('สร้างผู้ใช้สำเร็จ', { variant: 'success' })
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.detail || 'เกิดข้อผิดพลาด', { variant: 'error' }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); enqueueSnackbar('อัปเดตสำเร็จ', { variant: 'success' }) },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.detail || 'ไม่สามารถอัปเดต', { variant: 'error' }),
  })

  const validateForm = () => {
    const err: Record<string, string> = {}
    if (!form.username.trim()) err.username = 'กรุณาระบุ Username'
    if (!form.email.includes('@')) err.email = 'Email ไม่ถูกต้อง'
    if (!form.full_name.trim()) err.full_name = 'กรุณาระบุชื่อเต็ม'
    if (form.password.length < 8) err.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
    setFormError(err)
    return Object.keys(err).length === 0
  }

  const activeCount = users.filter(u => u.is_active).length

  return (
    <Box>
      <SectionHeader
        icon={<PeopleRoundedIcon fontSize="small" />}
        title="ผู้ใช้ระบบ"
        count={users.length}
        color={ACCENT}
        action={
          <Button size="small" variant="outlined" startIcon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={() => setAddOpen(true)}
            sx={{ borderRadius: 2, fontSize: 12, height: 32, borderColor: ACCENT, color: ACCENT,
              '&:hover': { borderColor: ACCENT, bgcolor: alpha(ACCENT, 0.08) } }}>
            สร้างผู้ใช้
          </Button>
        }
      />

      <TableContainer component={Paper} variant="outlined" sx={{ mt: 2.5, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{
              '& th': {
                fontWeight: 700, fontSize: 10.5,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: 'text.secondary', py: 1.25,
                bgcolor: 'action.hover',
              },
            }}>
              <TableCell>ผู้ใช้</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell>เข้าสู่ระบบล่าสุด</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <TableCell key={j}><Skeleton height={24} sx={{ borderRadius: 1 }} /></TableCell>
                ))}
              </TableRow>
            )) : users.map(u => (
              <TableRow
                key={u.id}
                hover
                sx={{
                  '&:last-child td': { border: 0 },
                  opacity: u.is_active ? 1 : 0.5,
                  transition: 'opacity 0.15s',
                }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Avatar sx={{
                      width: 32, height: 32, fontSize: 12, fontWeight: 800,
                      background: u.is_active ? ROLE_GRADIENT[u.role as UserRole] || ROLE_GRADIENT.viewer : '#94A3B8',
                      boxShadow: u.is_active ? `0 2px 8px ${alpha(ROLE_COLOR[u.role as UserRole] || '#94A3B8', 0.4)}` : 'none',
                    }}>
                      {(u.full_name || u.username || '?')[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{u.full_name || u.username}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: '"IBM Plex Mono",monospace' }}>
                        @{u.username}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: 12.5, color: 'text.secondary' }}>{u.email}</TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={u.role}
                    onChange={e => updateMut.mutate({ id: u.id, data: { role: e.target.value } })}
                    renderValue={(v) => <RoleBadge role={v as UserRole} />}
                    sx={{
                      '& .MuiSelect-select': { py: 0.25, px: 0 },
                      '& fieldset': { border: 'none' },
                      fontSize: 11,
                    }}>
                    {(['viewer', 'analyst', 'admin', 'superadmin'] as UserRole[]).map(r => (
                      <MenuItem key={r} value={r}>
                        <RoleBadge role={r} />
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Box sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.5,
                    px: 0.875, py: 0.3, borderRadius: 1,
                    bgcolor: u.is_active ? alpha('#22C55E', 0.12) : alpha('#94A3B8', 0.12),
                    color: u.is_active ? '#22C55E' : '#94A3B8',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    <Box sx={{
                      width: 5, height: 5, borderRadius: '50%',
                      bgcolor: u.is_active ? '#22C55E' : '#94A3B8',
                      boxShadow: u.is_active ? '0 0 5px #22C55E' : 'none',
                    }} />
                    {u.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: 11.5, fontFamily: '"IBM Plex Mono",monospace', color: 'text.disabled' }}>
                  {u.last_login ? format(new Date(u.last_login), 'dd/MM/yy HH:mm') : '—'}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
                    <Tooltip title="รีเซ็ตรหัสผ่าน">
                      <IconButton size="small" onClick={() => setPwdTarget(u)}
                        sx={{ opacity: 0.6, '&:hover': { opacity: 1, color: 'warning.main' } }}>
                        <LockResetRoundedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={u.is_active ? 'ปิดใช้งานผู้ใช้' : 'เปิดใช้งานผู้ใช้'}>
                      <IconButton size="small"
                        onClick={() => updateMut.mutate({ id: u.id, data: { is_active: !u.is_active } })}
                        sx={{ opacity: 0.6, '&:hover': { opacity: 1, color: u.is_active ? 'error.main' : 'success.main' } }}>
                        {u.is_active
                          ? <PersonOffRoundedIcon sx={{ fontSize: 17 }} />
                          : <PersonRoundedIcon sx={{ fontSize: 17 }} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && users.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <PeopleRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body2" color="text.disabled" fontWeight={500}>ยังไม่มีผู้ใช้</Typography>
          </Box>
        )}
      </TableContainer>

      {!isLoading && users.length > 0 && (
        <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1, textAlign: 'right' }}>
          {activeCount} / {users.length} ผู้ใช้ใช้งานอยู่
        </Typography>
      )}

      {/* Add user dialog */}
      <Dialog open={addOpen} onClose={() => { setAddOpen(false); setFormError({}) }}
        maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
        <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: 16 }}>สร้างผู้ใช้ใหม่</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { key: 'username',  label: 'Username',  type: 'text',     mono: true },
              { key: 'full_name', label: 'ชื่อเต็ม',  type: 'text',     mono: false },
              { key: 'email',     label: 'Email',     type: 'email',    mono: false },
              { key: 'password',  label: 'รหัสผ่าน', type: 'password', mono: false },
            ].map(({ key, label, type, mono }) => (
              <Grid item xs={12} sm={6} key={key}>
                <TextField fullWidth size="small" label={label} type={type}
                  error={!!formError[key]} helperText={formError[key]}
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  InputProps={mono ? { sx: { fontFamily: '"IBM Plex Mono",monospace' } } : undefined} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select value={form.role} label="Role"
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  renderValue={(v) => <RoleBadge role={v as UserRole} />}>
                  {(['viewer', 'analyst', 'admin', 'superadmin'] as UserRole[]).map(r => (
                    <MenuItem key={r} value={r}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <RoleBadge role={r} />
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>({r})</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setAddOpen(false); setFormError({}) }} variant="outlined" sx={{ borderRadius: 2, flex: 1 }}>
            ยกเลิก
          </Button>
          <Button variant="contained" disableElevation
            onClick={() => validateForm() && addMut.mutate(form)}
            disabled={addMut.isPending}
            startIcon={addMut.isPending ? <CircularProgress size={13} color="inherit" /> : null}
            sx={{ borderRadius: 2, flex: 1 }}>
            สร้างผู้ใช้
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!pwdTarget} onClose={() => { setPwdTarget(null); setPwdValue('') }}
        maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
        <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: 16 }}>รีเซ็ตรหัสผ่าน</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5, p: 1.5, borderRadius: 1.75, bgcolor: 'action.hover' }}>
            <Avatar sx={{
              width: 32, height: 32, fontSize: 12, fontWeight: 800,
              background: ROLE_GRADIENT[pwdTarget?.role as UserRole] || ROLE_GRADIENT.viewer,
            }}>
              {(pwdTarget?.full_name || pwdTarget?.username || '?')[0].toUpperCase()}
            </Avatar>
            <Box>
              <Typography fontSize={13} fontWeight={600}>{pwdTarget?.full_name || pwdTarget?.username}</Typography>
              <Typography fontSize={11} color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono",monospace' }}>
                @{pwdTarget?.username}
              </Typography>
            </Box>
          </Box>
          <TextField fullWidth size="small" label="รหัสผ่านใหม่" type="password"
            value={pwdValue} onChange={e => setPwdValue(e.target.value)}
            helperText="ต้องมีอย่างน้อย 8 ตัวอักษร" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setPwdTarget(null); setPwdValue('') }} variant="outlined" sx={{ borderRadius: 2, flex: 1 }}>
            ยกเลิก
          </Button>
          <Button variant="contained" color="warning" disableElevation
            onClick={() => {
              if (pwdValue.length < 8) { enqueueSnackbar('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', { variant: 'warning' }); return }
              updateMut.mutate({ id: pwdTarget.id, data: { password: pwdValue } })
              setPwdTarget(null); setPwdValue('')
            }}
            disabled={updateMut.isPending}
            sx={{ borderRadius: 2, flex: 1 }}>
            รีเซ็ตรหัสผ่าน
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
