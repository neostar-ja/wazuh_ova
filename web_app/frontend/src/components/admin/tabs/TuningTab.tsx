import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, IconButton, MenuItem,
  Paper, Select, Skeleton, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography, useTheme,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import { format } from 'date-fns'
import { useSnackbar } from 'notistack'
import { adminApi } from '../../../services/api'
import { ConfirmDialog, getLevelColor, SectionHeader } from '../shared'

const ACCENT = '#EAB308'

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: alpha('#22C55E', 0.12), color: '#22C55E', label: 'active' },
  expired:  { bg: alpha('#94A3B8', 0.12), color: '#94A3B8', label: 'expired' },
  reverted: { bg: alpha('#EF4444', 0.12), color: '#EF4444', label: 'reverted' },
}

function LevelArrow({ from, to }: { from: number; to: number }) {
  const fromColor = getLevelColor(from)
  const toColor = getLevelColor(to)
  const isDown = to < from
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
      <Box sx={{
        px: 0.75, py: 0.25, borderRadius: 1,
        bgcolor: alpha(fromColor, 0.15), color: fromColor,
        fontSize: 11, fontWeight: 800, fontFamily: '"IBM Plex Mono",monospace',
        minWidth: 32, textAlign: 'center',
      }}>
        {from}
      </Box>
      <ArrowForwardRoundedIcon sx={{
        fontSize: 14,
        color: isDown ? '#22C55E' : '#EF4444',
        transform: isDown ? 'rotate(0deg)' : 'rotate(0deg)',
      }} />
      <Box sx={{
        px: 0.75, py: 0.25, borderRadius: 1,
        bgcolor: alpha(toColor, 0.15), color: toColor,
        fontSize: 11, fontWeight: 800, fontFamily: '"IBM Plex Mono",monospace',
        minWidth: 32, textAlign: 'center',
      }}>
        {to}
      </Box>
    </Box>
  )
}

export function TuningTab() {
  const qc = useQueryClient()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const [addOpen, setAddOpen] = useState(false)
  const [deployOpen, setDeployOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [form, setForm] = useState({ rule_id: '', original_level: 7, tuned_level: 3, reason: '' })
  const [formError, setFormError] = useState<Record<string, string>>({})

  const { data: tunings = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-tuning'],
    queryFn: () => adminApi.listTuning().then(r => r.data),
  })

  const addMut = useMutation({
    mutationFn: adminApi.addTuning,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tuning'] })
      setAddOpen(false)
      setForm({ rule_id: '', original_level: 7, tuned_level: 3, reason: '' })
      enqueueSnackbar('เพิ่ม Tuning สำเร็จ', { variant: 'success' })
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.detail || 'เกิดข้อผิดพลาด', { variant: 'error' }),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: string }) =>
      adminApi.updateTuningStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tuning'] }),
    onError: (e: any) => enqueueSnackbar(e.response?.data?.detail || 'ไม่สามารถอัปเดตสถานะ', { variant: 'error' }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string | number) => adminApi.deleteTuning(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tuning'] })
      setDeleteTarget(null)
      enqueueSnackbar('ลบ Tuning สำเร็จ', { variant: 'success' })
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.detail || 'ลบไม่สำเร็จ', { variant: 'error' }),
  })

  const deployMut = useMutation({
    mutationFn: adminApi.deployTuningToWazuh,
    onSuccess: (res) => {
      setDeployOpen(false)
      const deployed = res.data?.deployed?.length ?? 0
      enqueueSnackbar(`Deploy ไป Wazuh สำเร็จ (${deployed} rules)`, { variant: 'success' })
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.detail || 'Deploy ไป Wazuh ไม่สำเร็จ', { variant: 'error' }),
  })

  const validateForm = () => {
    const err: Record<string, string> = {}
    if (!form.rule_id.trim()) err.rule_id = 'กรุณาระบุ Rule ID'
    if (form.original_level < 1 || form.original_level > 15) err.original_level = 'ระดับ 1–15'
    if (form.tuned_level < 1 || form.tuned_level > 15) err.tuned_level = 'ระดับ 1–15'
    if (!form.reason.trim()) err.reason = 'กรุณาระบุเหตุผล'
    setFormError(err)
    return Object.keys(err).length === 0
  }

  const activeCount = tunings.filter(t => t.status === 'active').length

  return (
    <Box>
      <SectionHeader
        icon={<TuneRoundedIcon fontSize="small" />}
        title="Alert Tuning"
        count={tunings.length}
        color={ACCENT}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={() => setDeployOpen(true)}
              disabled={!activeCount || deployMut.isPending}
              sx={{ borderRadius: 2, fontSize: 12, height: 32 }}>
              ใช้กับ Wazuh
            </Button>
            <Button size="small" variant="outlined" startIcon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={() => setAddOpen(true)}
              sx={{ borderRadius: 2, fontSize: 12, height: 32, borderColor: ACCENT, color: ACCENT,
                '&:hover': { borderColor: ACCENT, bgcolor: alpha(ACCENT, 0.08) } }}>
              เพิ่ม Tuning
            </Button>
          </Box>
        }
      />

      <Alert severity="info" sx={{ mt: 2, mb: 2, fontSize: 12, borderRadius: 1.75 }}>
        ค่า active มีผลทันทีใน SOC Center · ถ้าต้องการให้ Wazuh สร้าง alert ใหม่ด้วยระดับนี้ ให้กด <strong>ใช้กับ Wazuh</strong> ·{' '}
        ระบบจะเขียนไฟล์ managed rules แยกจาก default rules · <strong>active</strong> {activeCount} รายการมีผลอยู่
      </Alert>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
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
              <TableCell>Rule ID</TableCell>
              <TableCell>ระดับ (เดิม → ใหม่)</TableCell>
              <TableCell sx={{ minWidth: 160 }}>เหตุผล</TableCell>
              <TableCell>เพิ่มโดย</TableCell>
              <TableCell>วันที่</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <TableCell key={j}><Skeleton height={24} sx={{ borderRadius: 1 }} /></TableCell>
                ))}
              </TableRow>
            )) : tunings.map(t => (
              <TableRow
                key={t.id}
                hover
                sx={{
                  '&:last-child td': { border: 0 },
                  opacity: t.status === 'active' ? 1 : 0.6,
                  transition: 'opacity 0.15s',
                }}>
                <TableCell>
                  <Box sx={{
                    display: 'inline-block',
                    px: 0.75, py: 0.25, borderRadius: 1,
                    bgcolor: alpha(ACCENT, isDark ? 0.12 : 0.08),
                    fontFamily: '"IBM Plex Mono",monospace',
                    fontSize: 12.5, fontWeight: 700, color: ACCENT,
                  }}>
                    {t.rule_id}
                  </Box>
                </TableCell>
                <TableCell>
                  <LevelArrow from={t.original_level} to={t.tuned_level} />
                </TableCell>
                <TableCell sx={{ fontSize: 12.5, maxWidth: 200, color: 'text.secondary' }}>
                  {t.reason}
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{t.added_by}</TableCell>
                <TableCell sx={{ fontSize: 11.5, fontFamily: '"IBM Plex Mono",monospace', color: 'text.disabled' }}>
                  {t.added_at ? format(new Date(t.added_at), 'dd/MM/yy') : '-'}
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={t.status}
                    onChange={e => statusMut.mutate({ id: t.id, status: e.target.value })}
                    sx={{
                      fontSize: 11.5, height: 28,
                      '& .MuiSelect-select': { py: 0.4, px: 1 },
                      bgcolor: STATUS_STYLE[t.status]?.bg || 'transparent',
                      color: STATUS_STYLE[t.status]?.color || 'text.primary',
                      '& fieldset': { borderColor: alpha(STATUS_STYLE[t.status]?.color || '#94A3B8', 0.4) },
                    }}>
                    {['active', 'expired', 'reverted'].map(s => (
                      <MenuItem key={s} value={s} sx={{ fontSize: 12 }}>{s}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="ลบ Tuning นี้">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteTarget(t)}
                      sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                      <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!isLoading && tunings.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <TuneRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body2" color="text.disabled" fontWeight={500} mb={1.5}>
              ยังไม่มี Alert Tuning
            </Typography>
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)}
              variant="outlined" sx={{ borderRadius: 2 }}>
              เพิ่ม Tuning แรก
            </Button>
          </Box>
        )}
      </TableContainer>

      {/* Add dialog */}
      <Dialog open={addOpen} onClose={() => { setAddOpen(false); setFormError({}) }}
        maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
        <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: 16 }}>เพิ่ม Alert Tuning</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Rule ID"
                value={form.rule_id}
                error={!!formError.rule_id} helperText={formError.rule_id}
                onChange={e => setForm(f => ({ ...f, rule_id: e.target.value }))}
                placeholder="เช่น 100001"
                InputProps={{ sx: { fontFamily: '"IBM Plex Mono",monospace', fontSize: 13 } }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="ระดับเดิม (original)" type="number"
                error={!!formError.original_level} helperText={formError.original_level || '1–15'}
                inputProps={{ min: 1, max: 15 }} value={form.original_level}
                onChange={e => setForm(f => ({ ...f, original_level: +e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="ระดับใหม่ (tuned)" type="number"
                error={!!formError.tuned_level} helperText={formError.tuned_level || '1–15'}
                inputProps={{ min: 1, max: 15 }} value={form.tuned_level}
                onChange={e => setForm(f => ({ ...f, tuned_level: +e.target.value }))} />
            </Grid>
            {form.rule_id && (
              <Grid item xs={12}>
                <Box sx={{
                  p: 1.25, borderRadius: 1.5,
                  bgcolor: alpha(ACCENT, 0.08), border: `1px solid ${alpha(ACCENT, 0.2)}`,
                  display: 'flex', alignItems: 'center', gap: 1.5,
                }}>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', flex: 1 }}>Preview:</Typography>
                  <LevelArrow from={form.original_level} to={form.tuned_level} />
                </Box>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="เหตุผล" multiline rows={2}
                error={!!formError.reason} helperText={formError.reason}
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="เช่น false positive จาก monitoring tool, ลด noise" />
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
            เพิ่ม Tuning
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget?.id)}
        title="ลบ Alert Tuning"
        message={`ลบ Tuning Rule ID "${deleteTarget?.rule_id}" ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        loading={deleteMut.isPending} />

      <ConfirmDialog open={deployOpen} onClose={() => setDeployOpen(false)}
        onConfirm={() => deployMut.mutate()}
        title="ใช้ Alert Tuning กับ Wazuh"
        message={`ระบบจะคัดลอก rule ต้นฉบับของ active tuning ${activeCount} รายการไปยังไฟล์ soc_center_tuning_rules.xml พร้อม overwrite level แล้ว restart Wazuh Manager มีผลกับ alert ใหม่หลัง deploy เท่านั้น`}
        confirmColor="warning"
        loading={deployMut.isPending} />
    </Box>
  )
}
