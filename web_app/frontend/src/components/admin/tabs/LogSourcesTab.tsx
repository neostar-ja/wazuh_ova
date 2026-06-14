import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Paper, Skeleton, Switch, TextField, Typography,
} from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import PauseCircleRoundedIcon from '@mui/icons-material/PauseCircleRounded'
import ToggleOnRoundedIcon from '@mui/icons-material/ToggleOnRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import { format } from 'date-fns'
import { useSnackbar } from 'notistack'
import { adminApi } from '../../../services/api'
import { ConfirmDialog, SectionHeader } from '../shared'

const ACCENT = '#F43F5E'

interface LogSource {
  key: string
  label: string
  description: string
  rule_id_range: string
  rules_files: string[]
  decoders_files: string[]
  caveat: string | null
  enabled: boolean
  reason: string | null
  updated_by: string | null
  updated_at: string | null
}

function StatusChip({ enabled }: { enabled: boolean }) {
  const color = enabled ? '#22C55E' : '#F59E0B'
  const Icon = enabled ? CheckCircleRoundedIcon : PauseCircleRoundedIcon
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 0.875, py: 0.25, borderRadius: 1,
      bgcolor: alpha(color, 0.12), color,
      border: `1px solid ${alpha(color, 0.3)}`,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <Icon sx={{ fontSize: 13 }} />
      {enabled ? 'เปิดรับ' : 'ปิดรับชั่วคราว'}
    </Box>
  )
}

export function LogSourcesTab() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [disableTarget, setDisableTarget] = useState<LogSource | null>(null)
  const [enableTarget, setEnableTarget] = useState<LogSource | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  const { data: sources = [], isLoading } = useQuery<LogSource[]>({
    queryKey: ['admin-log-sources'],
    queryFn: () => adminApi.listLogSources().then(r => r.data),
  })

  const disableMut = useMutation({
    mutationFn: ({ key, reason }: { key: string; reason: string }) =>
      adminApi.disableLogSource(key, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-log-sources'] })
      setDisableTarget(null)
      setReason('')
      enqueueSnackbar('ปิดรับ Log source สำเร็จ — Wazuh Manager กำลังรีสตาร์ท', { variant: 'success' })
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.detail || 'เกิดข้อผิดพลาด', { variant: 'error' }),
  })

  const enableMut = useMutation({
    mutationFn: (key: string) => adminApi.enableLogSource(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-log-sources'] })
      setEnableTarget(null)
      enqueueSnackbar('เปิดรับ Log source สำเร็จ — Wazuh Manager กำลังรีสตาร์ท', { variant: 'success' })
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.detail || 'เกิดข้อผิดพลาด', { variant: 'error' }),
  })

  const handleToggle = (source: LogSource) => {
    if (source.enabled) {
      setReason('')
      setReasonError('')
      setDisableTarget(source)
    } else {
      setEnableTarget(source)
    }
  }

  const confirmDisable = () => {
    if (!reason.trim()) {
      setReasonError('กรุณาระบุเหตุผล')
      return
    }
    if (disableTarget) disableMut.mutate({ key: disableTarget.key, reason: reason.trim() })
  }

  const disabledCount = sources.filter(s => !s.enabled).length

  return (
    <Box>
      <SectionHeader
        icon={<ToggleOnRoundedIcon fontSize="small" />}
        title="แหล่งข้อมูล Log"
        count={sources.length}
        color={ACCENT}
      />

      <Alert severity="info" sx={{ mt: 2, mb: 2, fontSize: 12, borderRadius: 1.75 }}>
        เปิด/ปิดรับ alert จากแหล่งข้อมูลแต่ละชนิดได้ชั่วคราว — การปิดจะตั้งค่า level ของ rule ทั้งหมดในไฟล์เป็น 0
        (ยัง decode ปกติ แต่ไม่สร้าง alert) และสามารถเปิดคืนค่าเดิมได้ทุกเมื่อ
        ทุกครั้งที่เปลี่ยนสถานะ Wazuh Manager จะรีสตาร์ท (~10-30 วินาที)
        {disabledCount > 0 && <> · <strong>ปิดอยู่ {disabledCount} แหล่ง</strong></>}
      </Alert>

      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={92} sx={{ borderRadius: 2, mb: 1.5 }} />
        ))
      ) : sources.map(s => (
        <Paper key={s.key} variant="outlined" sx={{
          p: 2, borderRadius: 2, mb: 1.5,
          borderColor: s.enabled ? 'divider' : alpha('#F59E0B', 0.4),
          bgcolor: s.enabled ? 'transparent' : alpha('#F59E0B', 0.04),
          transition: 'border-color 0.15s, background-color 0.15s',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                <Typography fontWeight={700} fontSize={14}>{s.label}</Typography>
                <StatusChip enabled={s.enabled} />
                <Box sx={{
                  px: 0.75, py: 0.2, borderRadius: 1,
                  bgcolor: alpha(ACCENT, 0.1), color: ACCENT,
                  fontFamily: '"IBM Plex Mono",monospace',
                  fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  {s.rule_id_range}
                </Box>
              </Box>

              <Typography fontSize={12.5} color="text.secondary" sx={{ mb: 0.75 }}>
                {s.description}
              </Typography>

              <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: '"IBM Plex Mono",monospace' }}>
                {s.rules_files.join(', ')}
                {s.decoders_files.length > 0 && ` · ${s.decoders_files.join(', ')}`}
              </Typography>

              {s.caveat && (
                <Box sx={{
                  display: 'flex', alignItems: 'flex-start', gap: 0.75, mt: 1, p: 1,
                  borderRadius: 1.5, bgcolor: alpha('#F59E0B', 0.08),
                  border: `1px solid ${alpha('#F59E0B', 0.2)}`,
                }}>
                  <WarningAmberRoundedIcon sx={{ fontSize: 15, color: '#F59E0B', mt: 0.1, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.5 }}>
                    {s.caveat}
                  </Typography>
                </Box>
              )}

              {!s.enabled && (
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1 }}>
                  เหตุผล: <strong>{s.reason || '-'}</strong>
                  {s.updated_by && <> · ปิดโดย <strong>{s.updated_by}</strong></>}
                  {s.updated_at && <> · {format(new Date(s.updated_at), 'dd/MM/yy HH:mm')}</>}
                </Typography>
              )}
            </Box>

            <Switch
              checked={s.enabled}
              onChange={() => handleToggle(s)}
              disabled={disableMut.isPending || enableMut.isPending}
              color={s.enabled ? 'success' : 'warning'}
            />
          </Box>
        </Paper>
      ))}

      {/* Disable dialog */}
      <Dialog open={!!disableTarget} onClose={() => !disableMut.isPending && setDisableTarget(null)}
        maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
        <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: 16 }}>
          ปิดรับ Log: {disableTarget?.label}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth size="small" label="เหตุผล" multiline rows={2}
            autoFocus
            value={reason}
            error={!!reasonError}
            helperText={reasonError}
            onChange={e => { setReason(e.target.value); setReasonError('') }}
            placeholder="เช่น log ไหลเข้ามากเกินไป, กำลัง maintenance อุปกรณ์"
            sx={{ mb: 2 }}
          />
          <Alert severity="warning" sx={{ fontSize: 12, borderRadius: 1.5, mb: disableTarget?.caveat ? 1.5 : 0 }}>
            Wazuh Manager จะรีสตาร์ททันที (~10-30 วินาที) — กระทบการประมวลผล alert ของ
            <strong> ทุกแหล่งข้อมูล</strong> ชั่วคราวระหว่างรีสตาร์ท
          </Alert>
          {disableTarget?.caveat && (
            <Alert severity="info" sx={{ fontSize: 12, borderRadius: 1.5 }}>
              {disableTarget.caveat}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDisableTarget(null)} disabled={disableMut.isPending}
            variant="outlined" sx={{ borderRadius: 2, flex: 1 }}>
            ยกเลิก
          </Button>
          <Button variant="contained" color="warning" disableElevation
            onClick={confirmDisable}
            disabled={disableMut.isPending}
            startIcon={disableMut.isPending ? <CircularProgress size={13} color="inherit" /> : null}
            sx={{ borderRadius: 2, flex: 1 }}>
            ปิดรับ Log
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enable confirm dialog */}
      <ConfirmDialog
        open={!!enableTarget}
        onClose={() => setEnableTarget(null)}
        onConfirm={() => enableTarget && enableMut.mutate(enableTarget.key)}
        title={`เปิดรับ Log: ${enableTarget?.label ?? ''}`}
        message="ระบบจะคืนค่า rule level เดิมทั้งหมดและ restart Wazuh Manager (~10-30 วินาที) เพื่อเริ่มรับ alert จากแหล่งข้อมูลนี้อีกครั้ง"
        confirmColor="success"
        loading={enableMut.isPending}
      />
    </Box>
  )
}
