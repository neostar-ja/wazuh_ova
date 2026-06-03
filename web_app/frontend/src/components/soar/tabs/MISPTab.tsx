import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Typography, Stack, Skeleton, TextField, Button, Select, MenuItem,
  FormControl, InputLabel, InputAdornment, Link, Table, TableBody,
  TableCell, TableHead, TableRow, Alert as MuiAlert, CircularProgress, Tooltip,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import { MispAttribute, soarApi } from '../../../services/soarApi'
import { BRAND, SEV_COLOR } from '../../ui/tokens'
import { hexRgb } from '../soarUtils'
import { fmtN } from '../../ui/tokens'

interface Props {
  mispUrl?: string
}

const IOC_TYPE_OPTIONS = [
  { value: '',          label: 'ทุกประเภท' },
  { value: 'ip-dst',   label: 'IP (ปลายทาง)' },
  { value: 'ip-src',   label: 'IP (ต้นทาง)' },
  { value: 'domain',   label: 'Domain' },
  { value: 'url',      label: 'URL' },
  { value: 'md5',      label: 'MD5 Hash' },
  { value: 'sha256',   label: 'SHA-256 Hash' },
  { value: 'sha1',     label: 'SHA-1 Hash' },
  { value: 'email-src', label: 'อีเมล' },
  { value: 'filename', label: 'ชื่อไฟล์' },
]

export default function MISPTab({ mispUrl }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const [query, setQuery]     = useState('')
  const [iocType, setIocType] = useState('')
  const [searched, setSearched] = useState(false)

  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)'
  const cardBord  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'
  const divider   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,91,164,0.07)'
  const headBg    = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)'
  const rowAlt    = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(123,91,164,0.015)'
  const rowHover  = isDark ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.04)'

  const { data: mispStats, isLoading: statsLoading } = useQuery({
    queryKey: ['misp-stats'],
    queryFn: () => soarApi.getMispStats().then(r => r.data),
    staleTime: 300000,
    refetchInterval: 300000,
  })

  const { data: searchResp, isLoading: searchLoading, refetch: doSearch } = useQuery({
    queryKey: ['misp-search', query, iocType],
    queryFn: () => soarApi.searchMisp(query, iocType || undefined).then(r => r.data),
    enabled: false,
  })

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    setSearched(true)
    doSearch()
  }, [query, doSearch])

  const attrs: MispAttribute[] = searchResp?.response?.Attribute ?? []
  const statsError = mispStats && !mispStats.connected && mispStats.error
  const isConnected = mispStats?.connected || mispStats?.search_available

  return (
    <Stack spacing={3} className="animate-fade-in">
      {/* Stats cards */}
      <Box className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Box className="rounded-2xl p-3.5" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: '#14B8A6', mb: 0.5, textTransform: 'uppercase' }}>
            สถานะ MISP
          </Typography>
          {statsLoading ? <Skeleton width={80} height={28} /> : (
            <Box className="flex items-center gap-2 mt-1">
              <Box className="w-2 h-2 rounded-full" sx={{ background: isConnected ? '#22C55E' : '#EF4444' }} />
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: isConnected ? '#22C55E' : '#EF4444', lineHeight: 1 }}>
                {isConnected ? 'เชื่อมต่อแล้ว' : 'ออฟไลน์'}
              </Typography>
            </Box>
          )}
          <Typography sx={{ fontSize: 10, color: textMuted, mt: 0.5 }}>
            {mispStats?.version ? `MISP v${mispStats.version}` : 'Threat Intelligence'}
          </Typography>
        </Box>

        <Box className="rounded-2xl p-3.5" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: BRAND.purple, mb: 0.5, textTransform: 'uppercase' }}>
            ค้นหา IOC
          </Typography>
          {statsLoading ? <Skeleton width={48} height={28} /> : (
            <Typography sx={{ fontSize: 24, fontWeight: 900, color: BRAND.purple, fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1 }}>
              {mispStats?.search_available ? 'พร้อม' : '—'}
            </Typography>
          )}
          <Typography sx={{ fontSize: 10, color: textMuted, mt: 0.5 }}>IP, domain, hash, URL</Typography>
        </Box>

        <Box className="rounded-2xl p-3.5 col-span-2 sm:col-span-1" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: '#F59E0B', mb: 0.5, textTransform: 'uppercase' }}>
            ผลการค้นหา
          </Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#F59E0B', fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1 }}>
            {searched ? fmtN(attrs.length) : '—'}
          </Typography>
          <Typography sx={{ fontSize: 10, color: textMuted, mt: 0.5 }}>
            {searched ? `จากการค้นหา "${query}"` : 'รอการค้นหา'}
          </Typography>
        </Box>
      </Box>

      {statsError && (
        <MuiAlert severity="error" variant="outlined" sx={{ borderRadius: 2, fontSize: 12 }}>
          MISP: {statsError}
        </MuiAlert>
      )}

      {/* Search bar */}
      <Box className="rounded-2xl p-4" sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
        <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: '#14B8A6', mb: 2, textTransform: 'uppercase' }}>
          ค้นหาตัวบ่งชี้ภัยคุกคาม (IOC)
        </Typography>
        <Box className="flex flex-wrap gap-2 items-stretch">
          <TextField size="small"
            placeholder="ป้อน IP, domain, hash, URL..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            sx={{ flex: 1, minWidth: 220,
              '& .MuiOutlinedInput-root': { fontSize: 13, borderRadius: '10px',
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)',
                fontFamily: '"IBM Plex Mono", monospace' } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 16, color: textMuted }} /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ fontSize: 12 }}>ประเภท IOC</InputLabel>
            <Select value={iocType} onChange={e => setIocType(e.target.value)} label="ประเภท IOC"
              sx={{ fontSize: 12, borderRadius: '10px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)' }}>
              {IOC_TYPE_OPTIONS.map(t => <MenuItem key={t.value} value={t.value} sx={{ fontSize: 12 }}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" size="small"
            onClick={handleSearch}
            disabled={!query.trim() || searchLoading}
            sx={{ background: '#14B8A6', '&:hover': { background: '#0D9488' },
              borderRadius: '10px', height: 40, px: 3, fontWeight: 700, fontSize: 12,
              '&:disabled': { background: 'rgba(20,184,166,0.3)' } }}>
            {searchLoading ? <CircularProgress size={14} color="inherit" /> : 'ค้นหา'}
          </Button>
          {mispUrl && (
            <Link href={mispUrl} target="_blank" rel="noopener" underline="none"
              className="flex items-center gap-1 self-center px-2 text-xs font-semibold"
              sx={{ color: '#14B8A6', '&:hover': { color: '#2DD4BF' } }}>
              เปิด MISP <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
            </Link>
          )}
        </Box>
      </Box>

      {/* Results */}
      {searched && (
        searchLoading ? (
          <Stack spacing={1}>{[1,2,3].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />)}</Stack>
        ) : attrs.length === 0 ? (
          <Box className="py-12 flex flex-col items-center gap-3 rounded-2xl"
            sx={{ background: cardBg, border: `1px solid ${cardBord}` }}>
            <BugReportRoundedIcon sx={{ fontSize: 36, color: textMuted, opacity: 0.5 }} />
            <Typography sx={{ fontSize: 13, color: textMuted }}>ไม่พบ IOC ที่ตรงกัน</Typography>
            <Typography sx={{ fontSize: 11, color: textMuted, opacity: 0.7 }}>
              ลองค้นหาด้วย query อื่น หรือตรวจสอบฐานข้อมูล MISP
            </Typography>
          </Box>
        ) : (
          <Box>
            <Box className="flex items-center gap-2 mb-2">
              <SecurityRoundedIcon sx={{ fontSize: 14, color: '#14B8A6' }} />
              <Typography sx={{ fontSize: 11, color: textSec }}>
                พบ <Box component="span" sx={{ fontWeight: 700, color: '#14B8A6' }}>{attrs.length}</Box> รายการ
              </Typography>
            </Box>
            <Box className="rounded-xl overflow-hidden" sx={{ border: `1px solid ${divider}` }}>
              <Box sx={{ overflowX: 'auto' }} className="scrollbar-thin">
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow sx={{ background: headBg }}>
                      {['ค่า IOC', 'ประเภท', 'หมวดหมู่', 'Event', 'IDS Flag'].map(h => (
                        <TableCell key={h} sx={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: textMuted,
                          borderBottom: `1px solid ${divider}`, py: 1, px: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attrs.map((a, i) => (
                      <TableRow key={a.id} sx={{
                        background: i % 2 === 0 ? rowAlt : 'transparent',
                        '&:hover': { background: rowHover },
                        '& td': { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)'}` },
                      }}>
                        <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 280 }}>
                          <Tooltip title={a.value}>
                            <Typography className="font-mono text-[11px] break-all font-semibold" sx={{ color: SEV_COLOR.high }}>
                              {a.value}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Box className="px-1.5 py-0.5 rounded text-[9px] font-semibold inline-flex"
                            sx={{ background: 'rgba(20,184,166,0.12)', color: '#14B8A6' }}>
                            {a.type}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Typography className="text-[10px]" sx={{ color: textSec }}>{a.category}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Typography className="font-mono text-[10px] font-semibold" sx={{ color: BRAND.purple }}>
                            #{a.event_id}
                          </Typography>
                          {a.Event?.info && (
                            <Tooltip title={a.Event.info}>
                              <Typography className="text-[9px] truncate max-w-[140px]" sx={{ color: textMuted }}>
                                {a.Event.info}
                              </Typography>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          <Box className="px-1.5 py-0.5 rounded text-[9px] font-bold inline-flex"
                            sx={a.to_ids
                              ? { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }
                              : { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)', color: textMuted }}>
                            {a.to_ids ? 'IDS' : 'ข้อมูล'}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          </Box>
        )
      )}
    </Stack>
  )
}
