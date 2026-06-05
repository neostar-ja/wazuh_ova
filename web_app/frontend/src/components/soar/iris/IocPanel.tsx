import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Typography, Stack, Button, TextField, CircularProgress, Skeleton,
  Tooltip, IconButton, Chip, Collapse,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import { useSnackbar } from 'notistack'
import { soarApi, CaseIoc, extractCaseIocs } from '../../../services/soarApi'
import { hexRgb, TLP_LABELS } from '../soarUtils'
import { SEV_COLOR } from '../../ui/tokens'

const EXTENDED_IOC_TYPES = [
  { id: 76,  name: 'ip-dst',      category: 'Network' },
  { id: 77,  name: 'ip-src',      category: 'Network' },
  { id: 78,  name: 'domain',      category: 'Network' },
  { id: 79,  name: 'url',         category: 'Network' },
  { id: 80,  name: 'md5',         category: 'Hash' },
  { id: 81,  name: 'sha256',      category: 'Hash' },
  { id: 82,  name: 'sha1',        category: 'Hash' },
  { id: 11,  name: 'email-src',   category: 'Email' },
  { id: 17,  name: 'filename',    category: 'File' },
  { id: 20,  name: 'hostname',    category: 'Network' },
  { id: 21,  name: 'mac-address', category: 'Network' },
]

interface MispResult { id: string; type: string; category: string; value: string; event_id: string; to_ids: boolean; Event?: { info: string } }

export default function IocPanel({ caseId }: { caseId: number }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.8)'

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ioc_value: '', ioc_type_id: 76, ioc_description: '' })
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [mispMap, setMispMap] = useState<Record<string, MispResult[]>>({})
  const [mispKey, setMispKey] = useState<string | null>(null)

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

  const handleMispSearch = async (value: string, idx: number) => {
    setExpandedIdx(idx)
    if (mispMap[value] !== undefined) return
    setMispKey(value)
    try {
      const r = await soarApi.searchMisp(value)
      setMispMap(prev => ({ ...prev, [value]: r.data?.attributes ?? [] }))
    } catch {
      setMispMap(prev => ({ ...prev, [value]: [] }))
      enqueueSnackbar('MISP ไม่ตอบสนอง', { variant: 'warning', autoHideDuration: 2000 })
    } finally {
      setMispKey(null)
    }
  }

  const iocs: CaseIoc[] = extractCaseIocs(data)
  const networkIocs = iocs.filter(i => ['ip-src','ip-dst','domain','hostname','url','mac-address'].includes(i.ioc_type?.type_name ?? ''))
  const hashIocs    = iocs.filter(i => ['md5','sha1','sha256'].includes(i.ioc_type?.type_name ?? ''))

  if (isLoading) return <Stack spacing={1}>{[1,2,3].map(i => <Skeleton key={i} height={52} sx={{ borderRadius: 1.5 }} />)}</Stack>

  return (
    <Stack spacing={2}>
      {iocs.length > 0 && (
        <Box className="flex flex-wrap gap-2">
          {[
            { label: 'ทั้งหมด', count: iocs.length, color: SEV_COLOR.high },
            { label: 'Network', count: networkIocs.length, color: '#38BDF8' },
            { label: 'Hash',    count: hashIocs.length,    color: '#A855F7' },
          ].filter(c => c.count > 0).map(c => (
            <Box key={c.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              sx={{ background: `rgba(${hexRgb(c.color)},0.08)`, border: `1px solid rgba(${hexRgb(c.color)},0.2)` }}>
              <Typography className="font-mono font-bold text-[11px]" sx={{ color: c.color }}>{c.count}</Typography>
              <Typography sx={{ fontSize: 10, color: textMuted }}>{c.label}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {!showForm ? (
        <Button size="small" startIcon={<AddRoundedIcon />} variant="outlined"
          onClick={() => setShowForm(true)}
          sx={{ alignSelf: 'flex-start', borderRadius: 2, fontSize: 12,
            borderColor: `rgba(${hexRgb(SEV_COLOR.high)},0.4)`, color: SEV_COLOR.high,
            '&:hover': { borderColor: SEV_COLOR.high, background: `rgba(${hexRgb(SEV_COLOR.high)},0.06)` } }}>
          เพิ่ม IOC
        </Button>
      ) : (
        <Box className="rounded-xl p-3" sx={{ background: cardBg, border: `1px solid rgba(${hexRgb(SEV_COLOR.high)},0.2)` }}>
          <Stack spacing={1.5}>
            <TextField size="small" label="IOC Value *" value={form.ioc_value}
              onChange={e => setForm(f => ({ ...f, ioc_value: e.target.value }))} fullWidth
              placeholder="IP · domain · MD5 · SHA256 · URL"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12 } }} />
            <Box className="grid grid-cols-2 gap-2">
              <TextField size="small" label="ประเภท IOC" value={form.ioc_type_id}
                onChange={e => setForm(f => ({ ...f, ioc_type_id: Number(e.target.value) }))}
                select SelectProps={{ native: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 12 } }}>
                {EXTENDED_IOC_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                ))}
              </TextField>
              <TextField size="small" label="คำอธิบาย" value={form.ioc_description}
                onChange={e => setForm(f => ({ ...f, ioc_description: e.target.value }))}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 12 } }} />
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
          <BugReportRoundedIcon sx={{ fontSize: 36, color: textMuted, opacity: 0.35 }} />
          <Typography sx={{ fontSize: 12, color: textMuted }}>ยังไม่มี IOC ในเคสนี้</Typography>
        </Box>
      ) : (
        <>
          <Typography sx={{ fontSize: 10, color: textMuted }}>
            คลิก 🔍 ค้นหาใน MISP · คลิก 🌐 เปิด Investigate V2
          </Typography>
          <Box className="rounded-xl overflow-hidden"
            sx={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}` }}>
            {iocs.map((ioc, i) => {
              const tlp = TLP_LABELS[2]
              const canInvestigate = /^\d{1,3}(\.\d{1,3}){3}$/.test(ioc.ioc_value) || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(ioc.ioc_value)
              const misp = mispMap[ioc.ioc_value]
              const isExpanded = expandedIdx === i

              return (
                <Box key={ioc.ioc_id} sx={{ borderBottom: i < iocs.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.07)'}` : 'none' }}>
                  <Box
                    className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
                    sx={{
                      background: i % 2 === 0 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.7)') : 'transparent',
                      '&:hover': { background: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)' },
                      transition: 'background 0.1s',
                    }}
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  >
                    <Box className="flex-1 min-w-0">
                      <Box className="flex items-center gap-2 flex-wrap">
                        <Typography className="font-mono text-[12px] break-all font-bold" sx={{ color: SEV_COLOR.high }}>
                          {ioc.ioc_value}
                        </Typography>
                        <Box className="px-1.5 py-0.5 rounded text-[9px] font-semibold" sx={{ background: 'rgba(20,184,166,0.12)', color: '#14B8A6' }}>
                          {ioc.ioc_type?.type_name ?? 'unknown'}
                        </Box>
                        <Box className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                          sx={{ background: `rgba(${hexRgb(tlp.color)},0.1)`, color: tlp.color, border: `1px solid rgba(${hexRgb(tlp.color)},0.2)` }}>
                          {ioc.ioc_tlp?.tlp_name ?? 'TLP:GREEN'}
                        </Box>
                        {misp && misp.length > 0 && (
                          <Chip label={`MISP: ${misp.length}`} size="small"
                            sx={{ height: 16, fontSize: 9, fontWeight: 700, bgcolor: 'rgba(168,85,247,0.12)', color: '#A855F7', border: 'none' }} />
                        )}
                      </Box>
                      {ioc.ioc_description && (
                        <Typography sx={{ fontSize: 10, color: textMuted, mt: 0.3 }}>{ioc.ioc_description}</Typography>
                      )}
                    </Box>
                    <Box className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <Tooltip title="Copy">
                        <IconButton size="small" onClick={() => { navigator.clipboard.writeText(ioc.ioc_value) }}
                          sx={{ p: 0.5, color: textMuted }}>
                          <ContentCopyRoundedIcon sx={{ fontSize: 11 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Search MISP">
                        <IconButton size="small" onClick={() => handleMispSearch(ioc.ioc_value, i)}
                          sx={{ p: 0.5, color: '#A855F7', '&:hover': { background: 'rgba(168,85,247,0.1)' } }}>
                          {mispKey === ioc.ioc_value ? <CircularProgress size={11} /> : <SearchRoundedIcon sx={{ fontSize: 11 }} />}
                        </IconButton>
                      </Tooltip>
                      {canInvestigate && (
                        <Tooltip title="Investigate V2">
                          <IconButton size="small" onClick={() => navigate(`/investigate?q=${encodeURIComponent(ioc.ioc_value)}&range=30d`)}
                            sx={{ p: 0.5, color: '#38BDF8', '&:hover': { background: 'rgba(56,189,248,0.1)' } }}>
                            <TravelExploreRoundedIcon sx={{ fontSize: 11 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {isExpanded ? <ExpandLessRoundedIcon sx={{ fontSize: 13, color: textMuted }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 13, color: textMuted }} />}
                    </Box>
                  </Box>

                  <Collapse in={isExpanded && misp != null}>
                    <Box className="mx-3 mb-2 rounded-xl overflow-hidden"
                      sx={{ background: isDark ? 'rgba(168,85,247,0.06)' : 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.2)' }}>
                      {misp && misp.length > 0 ? (
                        <>
                          <Box className="px-3 py-1.5" sx={{ borderBottom: '1px solid rgba(168,85,247,0.15)', background: 'rgba(168,85,247,0.08)' }}>
                            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#A855F7', letterSpacing: '0.06em' }}>
                              MISP — {misp.length} MATCHES
                            </Typography>
                          </Box>
                          {misp.slice(0, 5).map((r, ri) => (
                            <Box key={ri} className="flex items-start gap-2 px-3 py-2"
                              sx={{ borderBottom: ri < misp.length - 1 ? '1px solid rgba(168,85,247,0.1)' : 'none' }}>
                              <Box className="flex-1 min-w-0">
                                <Box className="flex items-center gap-2 flex-wrap">
                                  <Typography className="font-mono text-[10px]" sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#1A1033' }}>{r.value}</Typography>
                                  {r.to_ids && <Chip label="IDS" size="small" sx={{ height: 14, fontSize: 8, fontWeight: 700, bgcolor: 'rgba(239,68,68,0.12)', color: '#EF4444', border: 'none' }} />}
                                  <Typography sx={{ fontSize: 9, color: '#A855F7' }}>{r.type}</Typography>
                                </Box>
                                {r.Event?.info && <Typography sx={{ fontSize: 9.5, color: textMuted }}>{r.Event.info}</Typography>}
                              </Box>
                              <Typography className="font-mono text-[9px]" sx={{ color: textMuted }}>#{r.event_id}</Typography>
                            </Box>
                          ))}
                        </>
                      ) : (
                        <Box className="px-3 py-2.5">
                          <Typography sx={{ fontSize: 10, color: textMuted }}>ไม่พบใน MISP</Typography>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              )
            })}
          </Box>
        </>
      )}
    </Stack>
  )
}
