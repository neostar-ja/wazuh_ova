import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Drawer, Box, Typography, Stack, CircularProgress, Skeleton,
  Button, IconButton, TextField, Chip, Tooltip, Select,
  MenuItem, FormControl, InputLabel,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import EscalatorWarningRoundedIcon from '@mui/icons-material/EscalatorWarningRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded'
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import { useSnackbar } from 'notistack'
import { useNavigate } from 'react-router-dom'
import {
  soarApi,
  IrisAlert,
  IrisAlertSourceContext,
  IrisAlertStatusOption,
  IrisAlertWazuhEvent,
  IrisAlertWazuhContext,
  IrisSeverityOption,
} from '../../../services/soarApi'
import { getSev, getStat, fmtTime, hexRgb, SEV_OPTIONS, STATUS_OPTIONS } from '../soarUtils'
import { BRAND, SEV_COLOR } from '../../ui/tokens'

const ALERT_COLOR = '#7B5BA4'

const SOURCE_STATUS_META: Record<string, { label: string; color: string }> = {
  matched: { label: 'เชื่อมโยงได้', color: '#22C55E' },
  partial: { label: 'เชื่อมโยงบางส่วน', color: '#F59E0B' },
  not_found: { label: 'ไม่พบ context', color: '#64748B' },
  unsupported: { label: 'source ไม่รองรับ', color: '#A855F7' },
  error: { label: 'ค้นหา context ไม่สำเร็จ', color: '#EF4444' },
}

interface Props {
  alertId: number | null
  irisUrl?: string
  open: boolean
  onClose: () => void
  onEscalated?: () => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme()
  return (
    <Typography className="text-[9px] font-bold tracking-widest mb-2"
      sx={{ color: palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)' }}>
      {children}
    </Typography>
  )
}

export default function AlertDetailDrawer({ alertId, irisUrl, open, onClose, onEscalated }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)'
  const divider   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'

  const [editNote, setEditNote] = useState('')
  const [editStatus, setEditStatus] = useState<number | ''>('')
  const [editSev, setEditSev] = useState<number | ''>('')
  const [escTitle, setEscTitle] = useState('')
  const [showEscForm, setShowEscForm] = useState(false)
  const [mispResults, setMispResults] = useState<unknown[]>([])
  const [mispLoading, setMispLoading] = useState(false)

  const { data: resp, isLoading } = useQuery({
    queryKey: ['alert-detail', alertId],
    queryFn: () => soarApi.getIrisAlert(alertId!).then(r => r.data),
    enabled: open && !!alertId,
  })

  const { data: statusResp } = useQuery({
    queryKey: ['iris-alert-statuses'],
    queryFn: () => soarApi.getIrisAlertStatuses().then(r => r.data),
    enabled: open,
  })

  const { data: severityResp } = useQuery({
    queryKey: ['iris-severities'],
    queryFn: () => soarApi.getIrisSeverities().then(r => r.data),
    enabled: open,
  })

  const alert: IrisAlert | null = resp?.data?.alert ?? null
  const sourceContext: IrisAlertSourceContext | null = resp?.data?.source_context ?? null
  const wazuhContext: IrisAlertWazuhContext | null = resp?.data?.wazuh_context ?? null

  const updateMut = useMutation({
    mutationFn: (payload: { alert_status_id?: number; alert_severity_id?: number; alert_note?: string }) =>
      soarApi.updateIrisAlert(alertId!, payload),
    onSuccess: () => {
      enqueueSnackbar('อัปเดต alert สำเร็จ', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['alert-detail', alertId] })
      queryClient.invalidateQueries({ queryKey: ['iris-alerts'] })
    },
    onError: () => enqueueSnackbar('ไม่สามารถอัปเดต alert ได้', { variant: 'error' }),
  })

  const escalateMut = useMutation({
    mutationFn: () =>
      soarApi.escalateIrisAlerts({
        alert_ids: [alertId!],
        case_title: escTitle || `Escalated: ${alert?.alert_title}`,
        note: 'Escalated from SOC Alert Detail Workbench',
      }),
    onSuccess: (r) => {
      enqueueSnackbar('ยกระดับเป็น Case สำเร็จ', { variant: 'success' })
      setShowEscForm(false)
      queryClient.invalidateQueries({ queryKey: ['iris-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['iris-cases'] })
      onEscalated?.()
    },
    onError: () => enqueueSnackbar('ไม่สามารถยกระดับ Alert ได้', { variant: 'error' }),
  })

  const handleSaveNote = () => {
    if (!editNote.trim()) return
    updateMut.mutate({ alert_note: editNote })
  }

  const handleSaveStatus = (val: number) => {
    setEditStatus(val)
    updateMut.mutate({ alert_status_id: val })
  }

  const handleSaveSev = (val: number) => {
    setEditSev(val)
    updateMut.mutate({ alert_severity_id: val })
  }

  const handleSearchMisp = async (value: string) => {
    if (!value) return
    setMispLoading(true)
    try {
      const r = await soarApi.searchMisp(value)
      setMispResults(r.data?.attributes ?? [])
    } catch {
      setMispResults([])
    } finally {
      setMispLoading(false)
    }
  }

  const handleInvestigate = (q: string) => {
    onClose()
    navigate(`/investigate?q=${encodeURIComponent(q)}&range=30d`)
  }

  if (!open) return null

  const sev  = alert ? getSev(alert.alert_severity_id) : null
  const stat = alert ? getStat(alert.alert_status_id) : null
  const iocs = alert?.iocs ?? []
  const tags = alert?.alert_tags?.split(',').map(t => t.trim()).filter(Boolean) ?? []
  const severityOptions = (severityResp?.data?.length ? severityResp.data : SEV_OPTIONS.map(option => ({
    severity_id: option.id,
    severity_name: getSev(option.id).label,
    severity_description: option.label,
  } as IrisSeverityOption)))
  const statusOptions = (statusResp?.data?.length ? statusResp.data : STATUS_OPTIONS.map(option => ({
    status_id: option.id,
    status_name: getStat(option.id).label,
    status_description: option.label,
  } as IrisAlertStatusOption)))
  const sourceStatus = sourceContext?.status ? SOURCE_STATUS_META[sourceContext.status] ?? SOURCE_STATUS_META.not_found : null
  const primaryEvent: IrisAlertWazuhEvent | null = wazuhContext?.primary_event ?? null
  const relatedEvents = wazuhContext?.related_events ?? []
  const eventRule = primaryEvent?.rule ?? {}
  const eventData = primaryEvent?.data ?? {}
  const eventAgent = primaryEvent?.agent ?? {}
  const eventProgram = primaryEvent?.decoder?.name ?? primaryEvent?.predecoder?.program_name
  const modificationEntries = Object.entries(alert?.modification_history ?? {}).sort(([a], [b]) => Number(b) - Number(a))
  const mispAttrs = mispResults as Array<{ value?: string; type?: string; to_ids?: boolean }>

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: 640 },
            background: isDark ? '#16112A' : '#F8F6FF',
            borderLeft: `1px solid ${divider}`,
          },
        },
      }}
    >
      {/* Header */}
      <Box
        className="sticky top-0 z-10 px-5 py-4"
        sx={{ background: isDark ? 'rgba(22,17,42,0.95)' : 'rgba(248,246,255,0.95)', borderBottom: `1px solid ${divider}`, backdropFilter: 'blur(10px)' }}
      >
        <Box className="flex items-center justify-between mb-2">
          <Box className="flex items-center gap-2.5">
            <Box className="w-8 h-8 rounded-xl flex items-center justify-center"
              sx={{ background: `rgba(${hexRgb(ALERT_COLOR)},0.12)` }}>
              <NotificationsActiveRoundedIcon sx={{ fontSize: 16, color: ALERT_COLOR }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: isDark ? '#EDE9FA' : '#1A1033', lineHeight: 1.2 }}>
                {isLoading ? <Skeleton width={220} /> : (alert?.alert_title ?? '—')}
              </Typography>
              <Typography className="font-mono" sx={{ fontSize: 10, color: textMuted }}>Alert #{alertId}</Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: textMuted }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Severity + Status badges */}
        {alert && sev && stat && (
          <Box className="flex flex-wrap gap-2 items-center">
            <Chip size="small" label={sev.labelTh.toUpperCase()}
              sx={{ height: 20, fontSize: 9, fontWeight: 700, bgcolor: `rgba(${hexRgb(sev.color)},0.12)`, color: sev.color, border: `1px solid rgba(${hexRgb(sev.color)},0.3)` }} />
            <Chip size="small" label={stat.labelTh}
              sx={{ height: 20, fontSize: 9, fontWeight: 700, bgcolor: `rgba(${hexRgb(stat.color)},0.12)`, color: stat.color, border: `1px solid rgba(${hexRgb(stat.color)},0.3)` }} />
            {alert.owner?.user_login && (
              <Typography sx={{ fontSize: 10, color: textMuted }}>
                ผู้รับผิดชอบ: <Box component="span" sx={{ color: textSec, fontWeight: 600 }}>{alert.owner.user_login}</Box>
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        {isLoading ? (
          <Stack spacing={2}>{[1,2,3,4].map(i => <Skeleton key={i} height={72} sx={{ borderRadius: 2 }} />)}</Stack>
        ) : !alert ? (
          <Box className="py-16 flex flex-col items-center gap-3">
            <Typography sx={{ fontSize: 12, color: textMuted }}>ไม่พบข้อมูล Alert</Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Quick actions */}
            <Box className="flex flex-wrap gap-2">
              {irisUrl && (
                <Button size="small" variant="outlined" endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 12 }} />}
                  component="a" href={`${irisUrl}/alerts?alert_id=${alertId}`} target="_blank" rel="noopener"
                  sx={{ borderRadius: 2, fontSize: 11, borderColor: `rgba(${hexRgb(ALERT_COLOR)},0.4)`, color: ALERT_COLOR,
                    '&:hover': { borderColor: ALERT_COLOR, background: `rgba(${hexRgb(ALERT_COLOR)},0.06)` } }}>
                  เปิด IRIS
                </Button>
              )}
              {iocs[0]?.ioc_value && (
                <Button size="small" variant="outlined" startIcon={<TravelExploreRoundedIcon sx={{ fontSize: 13 }} />}
                  onClick={() => handleInvestigate(iocs[0].ioc_value)}
                  sx={{ borderRadius: 2, fontSize: 11, borderColor: 'rgba(56,189,248,0.4)', color: '#38BDF8',
                    '&:hover': { borderColor: '#38BDF8', background: 'rgba(56,189,248,0.06)' } }}>
                  Investigate V2
                </Button>
              )}
              <Button size="small" variant="outlined" startIcon={<EscalatorWarningRoundedIcon sx={{ fontSize: 13 }} />}
                onClick={() => { setShowEscForm(!showEscForm); setEscTitle(`Escalated: ${alert.alert_title}`) }}
                sx={{ borderRadius: 2, fontSize: 11, borderColor: 'rgba(245,158,11,0.4)', color: '#F59E0B',
                  '&:hover': { borderColor: '#F59E0B', background: 'rgba(245,158,11,0.06)' } }}>
                Escalate → Case
              </Button>
            </Box>

            {/* Escalate form */}
            {showEscForm && (
              <Box className="rounded-xl p-3" sx={{ background: cardBg, border: '1px solid rgba(245,158,11,0.2)' }}>
                <SectionLabel>ESCALATE เป็น IRIS CASE</SectionLabel>
                <Stack spacing={1.5}>
                  <TextField size="small" label="ชื่อ Case" value={escTitle}
                    onChange={e => setEscTitle(e.target.value)} fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 12 } }} />
                  <Box className="flex gap-2 justify-end">
                    <Button size="small" onClick={() => setShowEscForm(false)} sx={{ borderRadius: 2, fontSize: 11 }}>ยกเลิก</Button>
                    <Button size="small" variant="contained" disabled={!escTitle.trim() || escalateMut.isPending}
                      onClick={() => escalateMut.mutate()}
                      sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, background: '#F59E0B', '&:hover': { background: '#D97706' } }}>
                      {escalateMut.isPending ? <CircularProgress size={12} color="inherit" sx={{ mr: 0.5 }} /> : null}
                      Escalate
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}

            {/* Alert info */}
            <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
              <SectionLabel>รายละเอียด ALERT</SectionLabel>
              <Stack spacing={1}>
                {[
                  { label: 'Alert ID', value: String(alert.alert_id ?? alertId) },
                  { label: 'Alert UUID', value: alert.alert_uuid ?? '' },
                  { label: 'แหล่งที่มา', value: alert.alert_source },
                  { label: 'Source Ref', value: alert.alert_source_ref },
                  { label: 'Source Link', value: alert.alert_source_link ?? '' },
                  { label: 'วันเวลา Event', value: fmtTime(alert.alert_source_event_time) },
                  { label: 'วันเวลาสร้าง', value: fmtTime(alert.alert_creation_time) },
                  { label: 'ลูกค้า', value: alert.customer?.customer_name ?? '' },
                  { label: 'Classification', value: alert.classification?.name ?? '' },
                  { label: 'Resolution', value: alert.resolution_status?.name ?? '' },
                ].map(({ label, value }) => value ? (
                  <Box key={label} className="flex items-start gap-2">
                    <Typography sx={{ fontSize: 10, color: textMuted, minWidth: 90, pt: 0.1 }}>{label}:</Typography>
                    <Typography className="font-mono text-[10px] break-all flex-1" sx={{ color: textSec }}>{value}</Typography>
                  </Box>
                ) : null)}
              </Stack>
            </Box>

            {/* Description */}
            {alert.alert_description && (
              <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
                <SectionLabel>คำอธิบาย</SectionLabel>
                <Typography sx={{ fontSize: 11.5, color: textSec, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {alert.alert_description}
                </Typography>
              </Box>
            )}

            {sourceContext && (
              <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
                <SectionLabel>SOURCE CONTEXT</SectionLabel>
                <Stack spacing={1}>
                  <Box className="flex flex-wrap items-center gap-2">
                    {sourceStatus && (
                      <Chip
                        size="small"
                        label={sourceStatus.label}
                        sx={{
                          height: 22,
                          fontSize: 10,
                          fontWeight: 700,
                          bgcolor: `rgba(${hexRgb(sourceStatus.color)},0.12)`,
                          color: sourceStatus.color,
                          border: `1px solid rgba(${hexRgb(sourceStatus.color)},0.3)`,
                        }}
                      />
                    )}
                    {sourceContext.match_strategy && (
                      <Typography className="font-mono" sx={{ fontSize: 10, color: textMuted }}>
                        strategy: {sourceContext.match_strategy}
                      </Typography>
                    )}
                  </Box>
                  {[
                    { label: 'Source Type', value: sourceContext.source_type ?? '' },
                    { label: 'Source URL', value: sourceContext.source_url ?? '' },
                    { label: 'Matched Event Time', value: fmtTime(sourceContext.event_time) },
                  ].map(({ label, value }) => value ? (
                    <Box key={label} className="flex items-start gap-2">
                      <Typography sx={{ fontSize: 10, color: textMuted, minWidth: 120, pt: 0.1 }}>{label}:</Typography>
                      <Typography className="font-mono text-[10px] break-all flex-1" sx={{ color: textSec }}>{value}</Typography>
                    </Box>
                  ) : null)}
                  {(sourceContext.notes ?? []).length > 0 && (
                    <Box className="rounded-lg p-2" sx={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)' }}>
                      {(sourceContext.notes ?? []).map((note, idx) => (
                        <Typography key={`${note}-${idx}`} sx={{ fontSize: 10.5, color: textSec, lineHeight: 1.6 }}>
                          {note}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Stack>
              </Box>
            )}

            <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
              <SectionLabel>WAZUH EVENT CONTEXT</SectionLabel>
              {primaryEvent ? (
                <Stack spacing={1.25}>
                  {[
                    { label: 'Rule ID', value: eventRule.id ? String(eventRule.id) : '' },
                    { label: 'Rule', value: eventRule.description ?? '' },
                    { label: 'Level', value: eventRule.level != null ? String(eventRule.level) : '' },
                    { label: 'Agent', value: eventAgent.name ?? '' },
                    { label: 'Program', value: eventProgram ?? '' },
                    { label: 'เวลา Event', value: fmtTime(primaryEvent['@timestamp']) },
                    { label: 'Source IP', value: eventData.srcip ?? '' },
                    { label: 'Destination IP', value: eventData.dstip ?? '' },
                  ].map(({ label, value }) => value ? (
                    <Box key={label} className="flex items-start gap-2">
                      <Typography sx={{ fontSize: 10, color: textMuted, minWidth: 100, pt: 0.1 }}>{label}:</Typography>
                      <Typography className="font-mono text-[10px] break-all flex-1" sx={{ color: textSec }}>{value}</Typography>
                    </Box>
                  ) : null)}
                  {(wazuhContext?.summary?.groups ?? []).length > 0 && (
                    <Box className="flex flex-wrap gap-1 pt-1">
                      {(wazuhContext?.summary?.groups ?? []).map(group => (
                        <Box key={group} className="px-2 py-0.5 rounded text-[9px] font-semibold"
                          sx={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8' }}>
                          {group}
                        </Box>
                      ))}
                    </Box>
                  )}
                  {primaryEvent.full_log && (
                    <Box className="rounded-lg p-2" sx={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)' }}>
                      <Typography sx={{ fontSize: 10, color: textMuted, mb: 0.5 }}>Full log</Typography>
                      <Typography className="font-mono" sx={{ fontSize: 10.5, color: textSec, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {primaryEvent.full_log}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              ) : (
                <Typography sx={{ fontSize: 11.5, color: textMuted }}>
                  ยังไม่พบ Wazuh event context สำหรับ alert นี้
                </Typography>
              )}
            </Box>

            {relatedEvents.length > 0 && (
              <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
                <SectionLabel>RELATED WAZUH EVENTS</SectionLabel>
                <Stack spacing={1}>
                  {relatedEvents.map((event, idx) => (
                    <Box key={`${event['@timestamp'] ?? idx}-${idx}`} className="rounded-lg p-2"
                      sx={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)' }}>
                      <Typography sx={{ fontSize: 10.5, color: textSec, fontWeight: 700 }}>
                        {event.rule?.description ?? 'Wazuh event'}
                      </Typography>
                      <Typography className="font-mono" sx={{ fontSize: 10, color: textMuted }}>
                        {fmtTime(event['@timestamp'])} · rule {event.rule?.id ?? '—'} · {event.agent?.name ?? '—'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Update severity/status */}
            <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
              <SectionLabel>อัปเดตสถานะ</SectionLabel>
              <Typography sx={{ fontSize: 10, color: textMuted, mb: 1.5 }}>
                ตัวเลือกในส่วนนี้ดึงจาก IRIS API โดยตรง: `/manage/severities/list` และ `/manage/alert-status/list`
              </Typography>
              <Box className="grid grid-cols-2 gap-3">
                <FormControl size="small">
                  <InputLabel sx={{ fontSize: 12 }}>ความรุนแรง</InputLabel>
                  <Select
                    value={editSev !== '' ? editSev : (alert.alert_severity_id ?? '')}
                    onChange={e => handleSaveSev(Number(e.target.value))}
                    label="ความรุนแรง"
                    sx={{ borderRadius: '8px', fontSize: 12 }}
                  >
                    {severityOptions.map(s => (
                      <MenuItem key={s.severity_id} value={s.severity_id} sx={{ fontSize: 12 }}>
                        {getSev(s.severity_id).labelTh} ({s.severity_name})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel sx={{ fontSize: 12 }}>สถานะ</InputLabel>
                  <Select
                    value={editStatus !== '' ? editStatus : (alert.alert_status_id ?? '')}
                    onChange={e => handleSaveStatus(Number(e.target.value))}
                    label="สถานะ"
                    sx={{ borderRadius: '8px', fontSize: 12 }}
                  >
                    {statusOptions.map(s => (
                      <MenuItem key={s.status_id} value={s.status_id} sx={{ fontSize: 12 }}>
                        {getStat(s.status_id).labelTh} ({s.status_name})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Note */}
            <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
              <SectionLabel>บันทึกเพิ่มเติม</SectionLabel>
              {alert.alert_note && (
                <Box className="rounded-lg p-2 mb-2" sx={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}` }}>
                  <Typography sx={{ fontSize: 11, color: textSec, whiteSpace: 'pre-wrap' }}>{alert.alert_note}</Typography>
                </Box>
              )}
              <Stack spacing={1.5}>
                <TextField size="small" multiline rows={3} value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  placeholder="เพิ่มบันทึก..." fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 11.5 } }} />
                <Button size="small" variant="outlined" startIcon={<SaveRoundedIcon sx={{ fontSize: 13 }} />}
                  disabled={!editNote.trim() || updateMut.isPending}
                  onClick={handleSaveNote}
                  sx={{ alignSelf: 'flex-end', borderRadius: 2, fontSize: 11, borderColor: `rgba(${hexRgb(ALERT_COLOR)},0.4)`, color: ALERT_COLOR,
                    '&:hover': { borderColor: ALERT_COLOR, background: `rgba(${hexRgb(ALERT_COLOR)},0.06)` } }}>
                  บันทึก
                </Button>
              </Stack>
            </Box>

            {/* IOCs */}
            {iocs.length > 0 && (
              <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
                <SectionLabel>INDICATORS OF COMPROMISE ({iocs.length})</SectionLabel>
                <Stack spacing={1}>
                  {iocs.map((ioc, i) => (
                    <Box key={i} className="rounded-lg p-2 flex items-center gap-2 justify-between"
                      sx={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)' }}>
                      <Box className="flex items-center gap-2 min-w-0">
                        <BugReportRoundedIcon sx={{ fontSize: 13, color: SEV_COLOR.high, shrink: 0 }} />
                        <Box className="min-w-0">
                          <Typography className="font-mono text-[11px] break-all font-semibold" sx={{ color: SEV_COLOR.high }}>
                            {ioc.ioc_value}
                          </Typography>
                          <Typography sx={{ fontSize: 9, color: textMuted }}>{ioc.ioc_type?.type_name}</Typography>
                        </Box>
                      </Box>
                      <Box className="flex items-center gap-1 shrink-0">
                        <Tooltip title="ค้นหาใน MISP">
                          <IconButton size="small"
                            onClick={() => handleSearchMisp(ioc.ioc_value)}
                            sx={{ color: '#A855F7', '&:hover': { background: 'rgba(168,85,247,0.1)' } }}>
                            <BugReportRoundedIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Investigate V2">
                          <IconButton size="small"
                            onClick={() => handleInvestigate(ioc.ioc_value)}
                            sx={{ color: '#38BDF8', '&:hover': { background: 'rgba(56,189,248,0.1)' } }}>
                            <TravelExploreRoundedIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  ))}
                </Stack>

                {/* MISP results inline */}
                {mispLoading && (
                  <Box className="mt-2 flex items-center gap-2">
                    <CircularProgress size={12} />
                    <Typography sx={{ fontSize: 11, color: textMuted }}>ค้นหาใน MISP...</Typography>
                  </Box>
                )}
                {mispResults.length > 0 && (
                  <Box className="mt-2 p-2 rounded-lg" sx={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)' }}>
                    <Typography sx={{ fontSize: 10, color: '#A855F7', fontWeight: 700, mb: 1 }}>
                      MISP: พบ {mispResults.length} รายการ
                    </Typography>
                    {mispAttrs.slice(0, 5).map((attr, i) => (
                      <Box key={i} className="flex items-center gap-2 mb-1">
                        <Typography className="font-mono text-[10px]" sx={{ color: textSec }}>{String(attr.value)}</Typography>
                        <Typography sx={{ fontSize: 9, color: textMuted }}>{String(attr.type)}</Typography>
                        {attr.to_ids && <Box className="px-1 rounded text-[8px] font-bold" sx={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>IDS</Box>}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <Box>
                <SectionLabel>TAGS</SectionLabel>
                <Box className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <Box key={tag} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                      sx={{ background: `rgba(${hexRgb(BRAND.purple)},0.1)`, color: isDark ? '#C4B5FD' : BRAND.purpleDark }}>
                      {tag}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {modificationEntries.length > 0 && (
              <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${divider}` }}>
                <SectionLabel>HISTORY</SectionLabel>
                <Stack spacing={1}>
                  {modificationEntries.slice(0, 8).map(([ts, entry]) => (
                    <Box key={ts} className="rounded-lg p-2" sx={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.04)' }}>
                      <Typography sx={{ fontSize: 10.5, color: textSec, fontWeight: 700 }}>
                        {entry.action ?? 'Alert updated'}
                      </Typography>
                      <Typography className="font-mono" sx={{ fontSize: 10, color: textMuted }}>
                        {entry.user ?? 'system'} · {fmtTime(new Date(Number(ts) * 1000).toISOString())}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Simulation notice */}
            <Box className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
              sx={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
              <ScienceRoundedIcon sx={{ fontSize: 14, color: '#EAB308', mt: 0.1 }} />
              <Typography sx={{ fontSize: 10.5, color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,40,100,0.65)', lineHeight: 1.6 }}>
                <Box component="span" sx={{ fontWeight: 700, color: '#EAB308' }}>SIMULATION ONLY</Box>
                {' '}— action ทุกอย่างที่มีผลต่อ firewall หรือ Wazuh Active Response
                เป็นเพียงการจำลอง ไม่มีการดำเนินการจริง
              </Typography>
            </Box>
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}
