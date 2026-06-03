import { useMutation } from '@tanstack/react-query'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, CircularProgress,
  Alert as MuiAlert,
} from '@mui/material'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import { useSnackbar } from 'notistack'
import { soarApi } from '../../../services/soarApi'
import { SEV_COLOR } from '../../ui/tokens'

interface Props {
  open: boolean
  ip: string
  caseId?: number
  onClose: () => void
}

export default function BlockIPDialog({ open, ip, caseId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()

  const blockMut = useMutation({
    mutationFn: () => soarApi.triggerBlock(ip, caseId, 'SOC Analyst'),
    onSuccess: () => {
      enqueueSnackbar(`ส่งคำสั่งบล็อก ${ip} ไปยัง Shuffle แล้ว`, { variant: 'success' })
      onClose()
    },
    onError: () => enqueueSnackbar('ไม่สามารถส่งคำสั่งบล็อก IP ได้', { variant: 'error' }),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 700, color: SEV_COLOR.critical, pb: 1 }}>
        <BlockRoundedIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
        บล็อก IP Address
      </DialogTitle>
      <DialogContent>
        <MuiAlert severity="warning" sx={{ mb: 2, fontSize: 12, borderRadius: 2 }}>
          ระบบจะส่ง IP ไปยัง Shuffle SOAR เพื่อบล็อกบน Firewall
        </MuiAlert>
        <Typography sx={{ fontSize: 13, mb: 0.5, color: 'text.secondary' }}>
          ยืนยันการบล็อก IP นี้?
        </Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', color: SEV_COLOR.critical }}>
          {ip}
        </Typography>
        {caseId && (
          <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
            เชื่อมโยงกับเคส #{caseId}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} size="small" sx={{ borderRadius: 2 }}>ยกเลิก</Button>
        <Button variant="contained" size="small" color="error"
          disabled={blockMut.isPending}
          onClick={() => blockMut.mutate()}
          sx={{ borderRadius: 2, fontWeight: 700 }}>
          {blockMut.isPending && <CircularProgress size={13} color="inherit" sx={{ mr: 1 }} />}
          บล็อก IP
        </Button>
      </DialogActions>
    </Dialog>
  )
}
