import { useState } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Tooltip, Stack, Skeleton, TextField, InputAdornment,
  Chip, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import EscalatorWarningRoundedIcon from '@mui/icons-material/EscalatorWarningRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded'
import { IrisCase } from '../../../services/soarApi'
import { hexRgb, fmtTime } from '../soarUtils'
import { BRAND, SEV_COLOR } from '../../ui/tokens'
import CaseDetailDrawer from './CaseDetailDrawer'
import { useMutation } from '@tanstack/react-query'
import { soarApi } from '../../../services/soarApi'
import { useSnackbar } from 'notistack'

interface Props {
  cases: IrisCase[]
  loading: boolean
  irisUrl?: string
}

export default function CasesTable({ cases, loading, irisUrl }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const navigate = useNavigate()

  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const headBg    = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)'
  const rowHover  = isDark ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.04)'
  const rowAlt    = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(123,91,164,0.015)'
  const divider   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.07)'

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('') // '' | 'open' | 'closed'
  const [selectedCase, setSelectedCase] = useState<IrisCase | null>(null)

  const escalateMut = useMutation({
    mutationFn: (c: IrisCase) => soarApi.triggerEscalate(c.case_id, 'SOC Analyst', c.case_name),
    onSuccess: () => enqueueSnackbar('ส่งคำสั่ง Escalate ไปยัง Shuffle แล้ว', { variant: 'success' }),
    onError: () => enqueueSnackbar('ไม่สามารถส่งคำสั่ง Escalate ได้', { variant: 'error' }),
  })

  const filtered = cases.filter(c => {
    const matchSearch = !search || c.case_name.toLowerCase().includes(search.toLowerCase()) || c.client_name?.toLowerCase().includes(search.toLowerCase())
    const isOpen = !c.case_close_date
    const matchStatus = !filterStatus || (filterStatus === 'open' ? isOpen : !isOpen)
    return matchSearch && matchStatus
  })

  if (loading) return (
    <Stack spacing={1}>{[1,2,3].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />)}</Stack>
  )

  return (
    <Stack spacing={2}>
      {/* Filters */}
      <Box className="flex flex-wrap gap-2 items-center">
        <TextField size="small" placeholder="ค้นหาเคส..." value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 12,
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.9)' } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 15, color: textMuted }} /></InputAdornment> }} />

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel sx={{ fontSize: 12 }}>สถานะเคส</InputLabel>
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} label="สถานะเคส"
            sx={{ borderRadius: '10px', fontSize: 12, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.9)' }}>
            <MenuItem value="" sx={{ fontSize: 12 }}>ทั้งหมด</MenuItem>
            <MenuItem value="open" sx={{ fontSize: 12 }}>กำลังเปิด</MenuItem>
            <MenuItem value="closed" sx={{ fontSize: 12 }}>ปิดแล้ว</MenuItem>
          </Select>
        </FormControl>

        {(search || filterStatus) && (
          <Chip size="small" label={`${filtered.length} เคส`} onDelete={() => { setSearch(''); setFilterStatus('') }}
            sx={{ fontSize: 10, background: 'rgba(99,102,241,0.12)', color: isDark ? '#A5B4FC' : '#4F46E5' }} />
        )}
      </Box>

      {/* Table */}
      {filtered.length === 0 ? (
        <Box className="py-16 flex flex-col items-center gap-3">
          <FolderOpenRoundedIcon sx={{ fontSize: 40, color: textMuted, opacity: 0.4 }} />
          <Typography sx={{ fontSize: 13, color: textMuted }}>ไม่พบเคสสอบสวน</Typography>
        </Box>
      ) : (
        <Box className="rounded-xl overflow-hidden" sx={{ border: `1px solid ${divider}` }}>
          <Box sx={{ overflowX: 'auto' }} className="scrollbar-thin">
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow sx={{ background: headBg }}>
                  {[
                    { label: '#' },
                    { label: 'ชื่อเคส' },
                    { label: 'วันที่เปิด' },
                    { label: 'สถานะ' },
                    { label: 'ผู้รับผิดชอบ' },
                    { label: 'ลูกค้า' },
                    { label: 'ดำเนินการ' },
                  ].map(h => (
                    <TableCell key={h.label} sx={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: textMuted,
                      borderBottom: `1px solid ${divider}`, py: 1, px: 1.5, whiteSpace: 'nowrap' }}>
                      {h.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((c, i) => {
                  const isOpen = !c.case_close_date
                  return (
                    <TableRow key={c.case_id} sx={{
                      background: i % 2 === 0 ? rowAlt : 'transparent',
                      '&:hover': { background: rowHover },
                      '& td': { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)'}` },
                    }}>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="font-mono text-[10px] font-semibold" sx={{ color: '#6366F1' }}>
                          #{c.case_id}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 240 }}>
                        <Tooltip title={c.case_name} placement="top-start">
                          <Typography className="text-[11px] truncate font-semibold cursor-pointer"
                            onClick={() => setSelectedCase(c)}
                            sx={{ color: isDark ? '#EDE9FA' : '#1A1033', '&:hover': { color: '#6366F1' }, transition: 'color 0.15s' }}>
                            {c.case_name}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="font-mono text-[10px] whitespace-nowrap" sx={{ color: textMuted }}>
                          {c.case_open_date}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Box className="px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex"
                          sx={isOpen
                            ? { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }
                            : { background: 'rgba(100,116,139,0.15)', color: '#64748B', border: '1px solid rgba(100,116,139,0.3)' }}>
                          {isOpen ? 'เปิดอยู่' : 'ปิดแล้ว'}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="text-[10px]" sx={{ color: textMuted }}>{c.owner || '—'}</Typography>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="text-[10px]" sx={{ color: textMuted }}>{c.client_name || '—'}</Typography>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Box className="flex items-center gap-0.5">
                          <Tooltip title="เปิดหน้า Full Workspace">
                            <IconButton size="small" onClick={() => navigate(`/soar/cases/${c.case_id}`)}
                              sx={{ color: '#6366F1', '&:hover': { background: 'rgba(99,102,241,0.12)' } }}>
                              <OpenInFullRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Quick Drawer (บันทึก/IOC/Timeline)">
                            <IconButton size="small" onClick={() => setSelectedCase(c)}
                              sx={{ color: BRAND.purple, '&:hover': { background: `rgba(${hexRgb(BRAND.purple)},0.12)` } }}>
                              <ManageSearchRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Escalate ผ่าน Shuffle">
                            <IconButton size="small" disabled={escalateMut.isPending}
                              onClick={() => escalateMut.mutate(c)}
                              sx={{ color: '#F59E0B', '&:hover': { background: 'rgba(245,158,11,0.12)' } }}>
                              <EscalatorWarningRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          {irisUrl && (
                            <Tooltip title="เปิดใน DFIR-IRIS">
                              <IconButton size="small" component="a"
                                href={`${irisUrl}/case?cid=${c.case_id}`} target="_blank" rel="noopener"
                                sx={{ color: '#64748B', '&:hover': { background: 'rgba(100,116,139,0.12)' } }}>
                                <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}

      {/* Case detail drawer */}
      <CaseDetailDrawer
        caseData={selectedCase}
        irisUrl={irisUrl}
        open={!!selectedCase}
        onClose={() => setSelectedCase(null)}
      />
    </Stack>
  )
}
