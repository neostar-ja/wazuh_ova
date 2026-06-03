import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Typography, CircularProgress, Stack, Box,
} from '@mui/material'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import { useSnackbar } from 'notistack'
import { soarApi } from '../../../services/soarApi'
import { SEV_OPTIONS, hexRgb } from '../soarUtils'
import { BRAND } from '../../ui/tokens'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CreateAlertDialog({ open, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity_id: 5,
    tags: '',
    ioc_value: '',
  })

  const createMut = useMutation({
    mutationFn: () => soarApi.createIrisAlert(form),
    onSuccess: () => {
      enqueueSnackbar('สร้างการแจ้งเตือนใน DFIR-IRIS เรียบร้อยแล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['iris-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['soar-stats'] })
      setForm({ title: '', description: '', severity_id: 5, tags: '', ioc_value: '' })
      onClose()
    },
    onError: () => enqueueSnackbar('ไม่สามารถสร้างการแจ้งเตือนได้', { variant: 'error' }),
  })

  const isValid = form.title.trim().length > 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box className="flex items-center gap-2">
          <Box className="w-8 h-8 rounded-xl flex items-center justify-center"
            sx={{ background: `rgba(${hexRgb(BRAND.purple)},0.12)` }}>
            <NotificationsActiveRoundedIcon sx={{ fontSize: 17, color: BRAND.purple }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>สร้างการแจ้งเตือนใหม่</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>เพิ่ม Alert ใน DFIR-IRIS</Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: '12px !important' }}>
        <Stack spacing={2}>
          <TextField
            label="หัวข้อการแจ้งเตือน *"
            size="small"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            label="รายละเอียด"
            size="small"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            fullWidth
            multiline
            rows={3}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <FormControl size="small" fullWidth>
            <InputLabel>ระดับความรุนแรง</InputLabel>
            <Select
              value={form.severity_id}
              onChange={e => setForm(f => ({ ...f, severity_id: Number(e.target.value) }))}
              label="ระดับความรุนแรง"
              sx={{ borderRadius: '10px' }}
            >
              {SEV_OPTIONS.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  <Box className="flex items-center gap-2">
                    <Box className="w-2 h-2 rounded-full" sx={{ background: s.color }} />
                    {s.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Tags (คั่นด้วยจุลภาค)"
            size="small"
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            fullWidth
            placeholder="wazuh, network, malware"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            label="IOC Value (IP, domain, hash — ถ้ามี)"
            size="small"
            value={form.ioc_value}
            onChange={e => setForm(f => ({ ...f, ioc_value: e.target.value }))}
            fullWidth
            placeholder="192.168.1.1 หรือ example.com"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: '"IBM Plex Mono", monospace' } }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} size="small" sx={{ borderRadius: 2 }}>ยกเลิก</Button>
        <Button
          variant="contained"
          size="small"
          disabled={!isValid || createMut.isPending}
          onClick={() => createMut.mutate()}
          sx={{ borderRadius: 2, fontWeight: 700, background: BRAND.purple, '&:hover': { background: BRAND.purpleDark } }}
        >
          {createMut.isPending && <CircularProgress size={13} color="inherit" sx={{ mr: 1 }} />}
          สร้างการแจ้งเตือน
        </Button>
      </DialogActions>
    </Dialog>
  )
}
