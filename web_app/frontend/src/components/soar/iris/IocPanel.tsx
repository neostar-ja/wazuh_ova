import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Box, Typography, Stack, Button, TextField, CircularProgress, Skeleton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import { useSnackbar } from 'notistack'
import { soarApi, CaseIoc, IOC_TYPES } from '../../../services/soarApi'
import { hexRgb, TLP_LABELS } from '../soarUtils'
import { SEV_COLOR } from '../../ui/tokens'

export default function IocPanel({ caseId }: { caseId: number }) {
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
