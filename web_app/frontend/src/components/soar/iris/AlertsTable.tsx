import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Tooltip, TablePagination, Stack, Skeleton, TextField,
  Select, MenuItem, FormControl, InputLabel, InputAdornment, Chip, Checkbox, Button,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import EscalatorWarningRoundedIcon from '@mui/icons-material/EscalatorWarningRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import { useSnackbar } from 'notistack'
import { IrisAlert, soarApi } from '../../../services/soarApi'
import { getSev, getStat, fmtTime, hexRgb, STATUS_OPTIONS, SEV_OPTIONS } from '../soarUtils'
import { BRAND, SEV_COLOR } from '../../ui/tokens'
import BlockIPDialog from './BlockIPDialog'
import AlertDetailDrawer from './AlertDetailDrawer'

interface Props {
  alerts: IrisAlert[]
  total: number
  loading: boolean
  irisUrl?: string
  onCreateAlert?: () => void
  page: number
  rowsPerPage: number
  searchInput: string
  activeSearch: string
  filterSev: string
  filterStatus: string
  onSearchInputChange: (value: string) => void
  onSearchSubmit: () => void
  onFilterSevChange: (value: string) => void
  onFilterStatusChange: (value: string) => void
  onPageChange: (page: number) => void
  onRowsPerPageChange: (value: number) => void
  onResetFilters: () => void
  onEscalated?: () => void
}

export default function AlertsTable({
  alerts,
  total,
  loading,
  irisUrl,
  page,
  rowsPerPage,
  searchInput,
  activeSearch,
  filterSev,
  filterStatus,
  onSearchInputChange,
  onSearchSubmit,
  onFilterSevChange,
  onFilterStatusChange,
  onPageChange,
  onRowsPerPageChange,
  onResetFilters,
  onEscalated,
}: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()

  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const headBg    = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)'
  const rowHover  = isDark ? 'rgba(123,91,246,0.07)' : 'rgba(123,91,164,0.04)'
  const rowAlt    = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(123,91,164,0.015)'
  const divider   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.07)'

  const [blockDialog, setBlockDialog] = useState<{ open: boolean; ip: string }>({ open: false, ip: '' })
  const [detailAlertId, setDetailAlertId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    setSelectedIds(new Set())
  }, [alerts])

  const toggleSelect = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleAll = () => {
    const visibleIds = alerts.map(a => a.alert_id)
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))
    if (allVisibleSelected) { setSelectedIds(new Set()) }
    else { setSelectedIds(new Set(visibleIds)) }
  }

  const exportSelected = () => {
    const selected = alerts.filter(a => selectedIds.has(a.alert_id))
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `alerts_${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const bulkEscalateMut = useMutation({
    mutationFn: () => soarApi.escalateIrisAlerts({
      alert_ids: Array.from(selectedIds),
      case_title: `Escalated (bulk): ${selectedIds.size} alerts`,
      note: 'Bulk escalation from SOC SOAR page',
    }),
    onSuccess: () => {
      enqueueSnackbar(`ยกระดับ ${selectedIds.size} alerts เป็น Case สำเร็จ`, { variant: 'success' })
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['iris-cases'] })
      queryClient.invalidateQueries({ queryKey: ['iris-alerts'] })
      onEscalated?.()
    },
    onError: () => enqueueSnackbar('Bulk escalate ล้มเหลว', { variant: 'error' }),
  })

  const escalateMut = useMutation({
    mutationFn: ({ alertId, title }: { alertId: number; title: string }) =>
      soarApi.escalateIrisAlerts({ alert_ids: [alertId], case_title: `Escalated: ${title}`, note: 'Escalated from SOC Web App' }),
    onSuccess: () => {
      enqueueSnackbar('ยกระดับเป็นเคสใหม่เรียบร้อยแล้ว', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['iris-cases'] })
      queryClient.invalidateQueries({ queryKey: ['iris-alerts'] })
      onEscalated?.()
    },
    onError: () => enqueueSnackbar('ไม่สามารถยกระดับได้', { variant: 'error' }),
  })

  const hasFilters = !!activeSearch || !!filterSev || !!filterStatus
  const visibleIds = alerts.map(a => a.alert_id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))
  const partiallySelected = visibleIds.some(id => selectedIds.has(id)) && !allVisibleSelected

  if (loading) return (
    <Stack spacing={1}>{[1,2,3,4,5].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />)}</Stack>
  )

  return (
    <Stack spacing={2}>
      {/* Filters row */}
      <Box className="flex flex-wrap gap-2 items-center">
        <TextField size="small" placeholder="ค้นหา title / IOC ใน IRIS..." value={searchInput}
          onChange={e => onSearchInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSearchSubmit() }}
          sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 12,
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.9)' } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 15, color: textMuted }} /></InputAdornment> }} />

        <Button size="small" variant="outlined" onClick={onSearchSubmit}
          sx={{ borderRadius: 2, fontSize: 11, minHeight: 38, borderColor: `rgba(${hexRgb(BRAND.purple)},0.35)`, color: BRAND.purple }}>
          ค้นหา
        </Button>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel sx={{ fontSize: 12 }}>ความรุนแรง</InputLabel>
          <Select value={filterSev} onChange={e => onFilterSevChange(e.target.value)} label="ความรุนแรง"
            sx={{ borderRadius: '10px', fontSize: 12, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.9)' }}>
            <MenuItem value="" sx={{ fontSize: 12 }}>ทั้งหมด</MenuItem>
            {SEV_OPTIONS.map(s => <MenuItem key={s.id} value={String(s.id)} sx={{ fontSize: 12 }}>{s.label}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ fontSize: 12 }}>สถานะ</InputLabel>
          <Select value={filterStatus} onChange={e => onFilterStatusChange(e.target.value)} label="สถานะ"
            sx={{ borderRadius: '10px', fontSize: 12, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,246,255,0.9)' }}>
            <MenuItem value="" sx={{ fontSize: 12 }}>ทั้งหมด</MenuItem>
            {STATUS_OPTIONS.map(s => <MenuItem key={s.id} value={String(s.id)} sx={{ fontSize: 12 }}>{s.label}</MenuItem>)}
          </Select>
        </FormControl>

        {hasFilters && (
          <Chip size="small" label={`${total.toLocaleString()} รายการจาก IRIS`} onDelete={onResetFilters}
            sx={{ fontSize: 10, background: `rgba(${hexRgb(BRAND.purple)},0.12)`, color: isDark ? '#C4B5FD' : BRAND.purpleDark }} />
        )}
        {selectedIds.size > 0 && (
          <Box className="flex items-center gap-2 ml-auto">
            <Typography sx={{ fontSize: 11, color: textMuted }}>เลือก {selectedIds.size} รายการ</Typography>
            <Button size="small" variant="outlined" startIcon={<EscalatorWarningRoundedIcon sx={{ fontSize: 13 }} />}
              disabled={bulkEscalateMut.isPending}
              onClick={() => bulkEscalateMut.mutate()}
              sx={{ borderRadius: 2, fontSize: 11, borderColor: 'rgba(245,158,11,0.4)', color: '#F59E0B' }}>
              Escalate ทั้งหมด
            </Button>
            <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon sx={{ fontSize: 13 }} />}
              onClick={exportSelected}
              sx={{ borderRadius: 2, fontSize: 11, borderColor: 'rgba(56,189,248,0.4)', color: '#38BDF8' }}>
              Export JSON
            </Button>
          </Box>
        )}
      </Box>

      {/* Table */}
      {alerts.length === 0 ? (
        <Box className="py-16 flex flex-col items-center gap-3">
          <NotificationsActiveRoundedIcon sx={{ fontSize: 40, color: textMuted, opacity: 0.4 }} />
          <Typography sx={{ fontSize: 13, color: textMuted }}>ไม่พบการแจ้งเตือน</Typography>
        </Box>
      ) : (
        <Box className="rounded-xl overflow-hidden" sx={{ border: `1px solid ${divider}` }}>
          <Box sx={{ overflowX: 'auto' }} className="scrollbar-thin">
            <Table size="small" sx={{ minWidth: 780 }}>
              <TableHead>
                <TableRow sx={{ background: headBg }}>
                  <TableCell sx={{ py: 1, px: 1, borderBottom: `1px solid ${divider}`, width: 36 }}>
                    <Checkbox size="small" checked={allVisibleSelected}
                      indeterminate={partiallySelected}
                      onChange={toggleAll}
                      sx={{ padding: 0, color: textMuted, '&.Mui-checked': { color: BRAND.purple } }} />
                  </TableCell>
                  {[
                    { key: 'time',     label: 'เวลา' },
                    { key: 'title',    label: 'หัวข้อ' },
                    { key: 'severity', label: 'ความรุนแรง' },
                    { key: 'status',   label: 'สถานะ' },
                    { key: 'source',   label: 'แหล่งที่มา' },
                    { key: 'tags',     label: 'Tags' },
                    { key: 'ioc',      label: 'IOC' },
                    { key: 'actions',  label: 'ดำเนินการ' },
                  ].map(h => (
                    <TableCell key={h.key} sx={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: textMuted,
                      borderBottom: `1px solid ${divider}`, py: 1, px: 1.5, whiteSpace: 'nowrap' }}>
                      {h.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map((a, i) => {
                  const sev  = getSev(a.alert_severity_id)
                  const stat = getStat(a.alert_status_id)
                  const tags = a.alert_tags ? a.alert_tags.split(',').map(t => t.trim()).filter(Boolean) : []
                  const iocVal = a.iocs?.[0]?.ioc_value
                  return (
                    <TableRow key={a.alert_id} sx={{
                      background: selectedIds.has(a.alert_id) ? (isDark ? 'rgba(123,91,164,0.1)' : 'rgba(123,91,164,0.06)') : i % 2 === 0 ? rowAlt : 'transparent',
                      '&:hover': { background: rowHover },
                      '& td': { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)'}` },
                    }}>
                      <TableCell sx={{ py: 0.75, px: 1 }}>
                        <Checkbox size="small" checked={selectedIds.has(a.alert_id)} onChange={() => toggleSelect(a.alert_id)}
                          sx={{ padding: 0, color: textMuted, '&.Mui-checked': { color: BRAND.purple } }} />
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="font-mono text-[10px] whitespace-nowrap" sx={{ color: textMuted }}>
                          {fmtTime(a.alert_source_event_time)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 240 }}>
                        <Tooltip title={a.alert_title} placement="top-start">
                          <Typography className="text-[11px] truncate font-medium" sx={{ color: textSec }}>
                            {a.alert_title}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Tooltip title={sev.label}>
                          <Box className="flex items-center gap-1.5">
                            <Box className="w-1.5 h-1.5 rounded-full" sx={{ background: sev.color }} />
                            <Typography className="text-[10px] font-bold whitespace-nowrap" sx={{ color: sev.color }}>
                              {sev.labelTh.toUpperCase()}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Box className="px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex whitespace-nowrap"
                          sx={{ background: `rgba(${hexRgb(stat.color)},0.15)`, color: stat.color, border: `1px solid rgba(${hexRgb(stat.color)},0.3)` }}>
                          {stat.labelTh}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Typography className="text-[10px] whitespace-nowrap" sx={{ color: textMuted }}>
                          {a.alert_source}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Box className="flex flex-wrap gap-1">
                          {tags.slice(0, 2).map(tag => (
                            <Box key={tag} className="px-1.5 py-0 rounded text-[8px] font-semibold"
                              sx={{ background: `rgba(${hexRgb(BRAND.purple)},0.12)`, color: isDark ? '#C4B5FD' : BRAND.purpleDark }}>
                              {tag}
                            </Box>
                          ))}
                          {tags.length > 2 && <Typography sx={{ fontSize: 9, color: textMuted }}>+{tags.length - 2}</Typography>}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        {iocVal ? (
                          <Tooltip title={iocVal}>
                            <Typography className="font-mono text-[10px] truncate max-w-[100px]" sx={{ color: SEV_COLOR.high }}>
                              {iocVal}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography sx={{ fontSize: 10, color: textMuted }}>—</Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ py: 0.75, px: 1.5 }}>
                        <Box className="flex items-center gap-0.5">
                          <Tooltip title="ดูรายละเอียด Alert">
                            <IconButton size="small" onClick={() => setDetailAlertId(a.alert_id)}
                              sx={{ color: BRAND.purple, '&:hover': { background: `rgba(${hexRgb(BRAND.purple)},0.12)` } }}>
                              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          {iocVal && (
                            <Tooltip title={`บล็อก IP: ${iocVal}`}>
                              <IconButton size="small" onClick={() => setBlockDialog({ open: true, ip: iocVal })}
                                sx={{ color: SEV_COLOR.critical, '&:hover': { background: `rgba(${hexRgb(SEV_COLOR.critical)},0.12)` } }}>
                                <BlockRoundedIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="ยกระดับเป็นเคสใหม่">
                            <IconButton size="small"
                              disabled={escalateMut.isPending}
                              onClick={() => escalateMut.mutate({ alertId: a.alert_id, title: a.alert_title })}
                              sx={{ color: '#F59E0B', '&:hover': { background: 'rgba(245,158,11,0.12)' } }}>
                              <EscalatorWarningRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          {irisUrl && (
                            <Tooltip title="เปิดใน DFIR-IRIS">
                              <IconButton size="small" component="a"
                                href={`${irisUrl}/alerts?alert_id=${a.alert_id}`} target="_blank" rel="noopener"
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
          {total > 0 && (
            <Box sx={{ borderTop: `1px solid ${divider}`, background: headBg }}>
              <TablePagination component="div" count={total} page={page}
                onPageChange={(_, p) => onPageChange(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => onRowsPerPageChange(Number(e.target.value))}
                rowsPerPageOptions={[10, 20, 50, 100]}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
                sx={{ color: textMuted, fontSize: 11, minHeight: 44,
                  '.MuiTablePagination-displayedRows': { fontSize: 11 },
                  '.MuiTablePagination-actions button': { color: textMuted } }} />
            </Box>
          )}
        </Box>
      )}

      <BlockIPDialog
        open={blockDialog.open}
        ip={blockDialog.ip}
        onClose={() => setBlockDialog({ open: false, ip: '' })}
      />

      <AlertDetailDrawer
        alertId={detailAlertId}
        irisUrl={irisUrl}
        open={!!detailAlertId}
        onClose={() => setDetailAlertId(null)}
        onEscalated={() => {
          setDetailAlertId(null)
          onEscalated?.()
        }}
      />
    </Stack>
  )
}
