import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, CircularProgress, Stack, Box,
} from '@mui/material'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import { useSnackbar } from 'notistack'
import { soarApi } from '../../../services/soarApi'
import { hexRgb } from '../soarUtils'

const CASE_COLOR = '#6366F1'

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (caseId: number) => void
}

export default function CreateCaseDialog({ open, onClose, onCreated }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ case_name: '', case_description: '' })

  const createMut = useMutation({
    mutationFn: () => soarApi.createIrisCase(form),
    onSuccess: (res) => {
      enqueueSnackbar('สร้างเคสใน DFIR-IRIS เรียบร้อยแล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['iris-cases'] })
      queryClient.invalidateQueries({ queryKey: ['soar-stats'] })
      const caseId = res?.data?.data?.case_id
      if (caseId && onCreated) onCreated(caseId)
      setForm({ case_name: '', case_description: '' })
      onClose()
    },
    onError: () => enqueueSnackbar('ไม่สามารถสร้างเคสได้', { variant: 'error' }),
  })

  const isValid = form.case_name.trim().length > 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box className="flex items-center gap-2">
          <Box className="w-8 h-8 rounded-xl flex items-center justify-center"
            sx={{ background: `rgba(${hexRgb(CASE_COLOR)},0.12)` }}>
            <FolderOpenRoundedIcon sx={{ fontSize: 17, color: CASE_COLOR }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>สร้างเคสสอบสวนใหม่</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>เปิด Case ใหม่ใน DFIR-IRIS</Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: '12px !important' }}>
        <Stack spacing={2}>
          <TextField
            label="ชื่อเคส *"
            size="small"
            value={form.case_name}
            onChange={e => setForm(f => ({ ...f, case_name: e.target.value }))}
            fullWidth
            placeholder="เช่น: Malware Incident 2026-06"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            label="รายละเอียดเคส"
            size="small"
            value={form.case_description}
            onChange={e => setForm(f => ({ ...f, case_description: e.target.value }))}
            fullWidth
            multiline
            rows={4}
            placeholder="อธิบายเหตุการณ์ที่เกิดขึ้น..."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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
          sx={{ borderRadius: 2, fontWeight: 700, background: CASE_COLOR, '&:hover': { background: '#4F46E5' } }}
        >
          {createMut.isPending && <CircularProgress size={13} color="inherit" sx={{ mr: 1 }} />}
          สร้างเคส
        </Button>
      </DialogActions>
    </Dialog>
  )
}
