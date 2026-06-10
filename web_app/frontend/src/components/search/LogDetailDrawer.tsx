/**
 * Log Detail Drawer
 * Right-side drawer แสดงรายละเอียด event เมื่อ click บน table row
 * Pattern: สอดคล้องกับ AlertsPage AlertDrawer
 */

import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Tooltip,
  Stack,
  Divider,
  useTheme,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useSnackbar } from 'notistack'
import { format } from 'date-fns'
import { BRAND, SEV_COLOR, sevColor, sevLabel } from '../ui/tokens'
import { deriveSourceFamily, familyLabel, familyColor, normalizeGroups } from './searchTypes'

// ── Types ──────────────────────────────────────────────────────────────────────

interface LogDetailDrawerProps {
  event: any | null
  open: boolean
  onClose: () => void
}

// ── Helper Components ──────────────────────────────────────────────────────────

function DrawerSection({
  label,
  children,
  accent,
}: {
  label: string
  children: React.ReactNode
  accent?: string
}) {
  const c = accent || BRAND.purple
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box
          sx={{
            width: 4,
            height: 18,
            borderRadius: 1.5,
            bgcolor: c,
            boxShadow: `0 2px 8px ${c}50`,
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: c,
          }}
        >
          {label}
        </Typography>
      </Box>
      {children}
    </Box>
  )
}

function FieldRow({
  label,
  value,
  mono = false,
  copyable = false,
}: {
  label: string
  value?: string | null
  mono?: boolean
  copyable?: boolean
}) {
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  if (!value) return null
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        py: 0.75,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
        gap: 1,
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          color: 'text.secondary',
          fontWeight: 600,
          flexShrink: 0,
          minWidth: 100,
          maxWidth: 140,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 700,
            color: 'text.primary',
            fontFamily: mono ? '"IBM Plex Mono", monospace' : 'inherit',
            wordBreak: 'break-all',
            flex: 1,
            textAlign: 'right',
          }}
        >
          {value}
        </Typography>
        {copyable && (
          <Tooltip title="คัดลอก">
            <IconButton
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(value)
                enqueueSnackbar('คัดลอกแล้ว', { variant: 'info', autoHideDuration: 1500 })
              }}
              sx={{ opacity: 0.4, '&:hover': { opacity: 1 }, p: 0.3, flexShrink: 0 }}
              aria-label={`Copy ${label}`}
            >
              <ContentCopyRoundedIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  )
}

function IPBlock({
  label,
  ip,
  port,
  accent,
  onInvestigate,
}: {
  label: string
  ip?: string
  port?: string | number
  accent: string
  onInvestigate?: () => void
}) {
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  if (!ip) {
    return (
      <Box
        sx={{
          flex: 1,
          p: 2,
          borderRadius: '12px',
          border: `2px dashed ${isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 90,
        }}
      >
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        flex: 1,
        p: 2,
        borderRadius: '12px',
        border: `1.5px solid ${accent}30`,
        background: isDark
          ? `linear-gradient(135deg, ${accent}12 0%, rgba(22,18,42,0.6) 100%)`
          : `linear-gradient(135deg, ${accent}06 0%, rgba(255,255,255,0.8) 100%)`,
        minHeight: 90,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: accent,
          mb: 0.75,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          sx={{
            fontSize: 14,
            fontFamily: '"IBM Plex Mono", monospace',
            fontWeight: 800,
            color: 'text.primary',
            wordBreak: 'break-all',
            flex: 1,
          }}
        >
          {ip}
        </Typography>
        <Tooltip title="คัดลอก IP">
          <IconButton
            size="small"
            onClick={() => {
              navigator.clipboard.writeText(ip)
              enqueueSnackbar('คัดลอกแล้ว', { variant: 'info', autoHideDuration: 1500 })
            }}
            sx={{ opacity: 0.4, '&:hover': { opacity: 1 }, p: 0.3, flexShrink: 0 }}
            aria-label={`Copy ${label} IP`}
          >
            <ContentCopyRoundedIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Tooltip>
      </Box>
      {port && (
        <Chip
          label={`:${port}`}
          size="small"
          sx={{
            mt: 0.75,
            height: 18,
            fontSize: 10,
            fontFamily: '"IBM Plex Mono", monospace',
            fontWeight: 700,
            bgcolor: `${accent}18`,
            color: accent,
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      )}
      {onInvestigate && (
        <Button
          size="small"
          onClick={onInvestigate}
          endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 11 }} />}
          sx={{
            mt: 1,
            py: 0.25,
            px: 1,
            fontSize: 10.5,
            fontWeight: 700,
            color: '#fff',
            bgcolor: accent,
            borderRadius: '8px',
            textTransform: 'none',
            minWidth: 0,
            boxShadow: `0 3px 10px ${accent}30`,
            '&:hover': { bgcolor: accent, filter: 'brightness(1.1)' },
          }}
        >
          Investigate
        </Button>
      )}
    </Box>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function LogDetailDrawer({ event, open, onClose }: LogDetailDrawerProps) {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [tab, setTab] = useState(0)

  // Escape to close
  useEffect(() => {
    if (!open) { setTab(0); return }
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!event) return null

  // Extract fields
  const rule = event?.rule ?? {}
  const data = event?.data ?? {}
  const agent = event?.agent ?? {}
  const geo = event?.GeoLocation ?? {}
  const predecoder = event?.predecoder ?? {}
  const decoder = event?.decoder ?? {}

  const level = Number(rule.level ?? 0)
  const color = sevColor(level)
  const family = deriveSourceFamily(event)
  const familyAccent = familyColor(family)
  const groups = normalizeGroups(rule.groups)

  const srcip = data.srcip
  const dstip = data.dstip
  const timestamp = event['@timestamp']

  const compliance = [
    { key: 'PCI-DSS', items: rule.pci_dss ?? [] },
    { key: 'HIPAA',   items: rule.hipaa ?? [] },
    { key: 'NIST',    items: rule.nist_800_53 ?? [] },
    { key: 'GDPR',    items: rule.gdpr ?? [] },
  ].filter((c) => c.items.length > 0)

  const TABS = [
    { label: 'รายละเอียด',   icon: <VisibilityRoundedIcon sx={{ fontSize: 13 }} /> },
    { label: 'Raw Log / JSON', icon: <DataObjectRoundedIcon sx={{ fontSize: 13 }} /> },
  ]

  const DRAWER_WIDTH = 'min(760px, 95vw)'

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(event, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = timestamp ? format(new Date(timestamp), 'yyyy-MM-dd-HHmmss') : Date.now()
    a.download = `log-event-${ts}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}
      slotProps={{
        paper: {
          sx: {
            width: DRAWER_WIDTH,
            minWidth: DRAWER_WIDTH,
            maxWidth: DRAWER_WIDTH,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: isDark ? 'rgba(22,18,42,0.97)' : 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(20px)',
            borderLeft: `4px solid ${color}`,
            boxShadow: isDark
              ? `0 24px 64px rgba(0,0,0,0.65), 0 0 30px ${color}15`
              : `0 24px 64px rgba(123,91,164,0.18), 0 0 30px ${color}10`,
            overflowX: 'hidden',
          },
        },
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          flexShrink: 0,
          background:
            level >= 15
              ? `linear-gradient(135deg, rgba(239,68,68,0.14) 0%, transparent 70%)`
              : level >= 12
              ? `linear-gradient(135deg, rgba(241,116,34,0.1) 0%, transparent 70%)`
              : level >= 7
              ? `linear-gradient(135deg, rgba(234,179,8,0.08) 0%, transparent 70%)`
              : `linear-gradient(135deg, ${BRAND.purple}08 0%, transparent 70%)`,
          borderBottom: `1px solid ${color}18`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative orb */}
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ p: { xs: 2.5, sm: 3 }, position: 'relative', zIndex: 1 }}>
          {/* Level + Rule + Close */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              mb: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {level > 0 && (
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '10px',
                    bgcolor: `${color}20`,
                    border: `2px solid ${color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    boxShadow: `0 3px 12px ${color}20`,
                  }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: color,
                      boxShadow: `0 0 6px ${color}`,
                    }}
                  />
                  <Typography sx={{ fontSize: 12, fontWeight: 900, color, letterSpacing: '0.05em' }}>
                    LEVEL {level} · {sevLabel(level).toUpperCase()}
                  </Typography>
                </Box>
              )}
              {rule.id && (
                <Chip
                  label={`Rule #${rule.id}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 24,
                    fontSize: 11,
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontWeight: 700,
                    borderColor: `${color}35`,
                    color: color,
                  }}
                />
              )}
              {family !== 'unknown' && (
                <Chip
                  label={familyLabel(family)}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: 11,
                    fontWeight: 600,
                    bgcolor: `${familyAccent}18`,
                    color: familyAccent,
                  }}
                />
              )}
            </Box>
            <Tooltip title="ปิด (Esc)">
              <IconButton
                size="small"
                onClick={onClose}
                aria-label="Close detail drawer"
                sx={{
                  borderRadius: '10px',
                  bgcolor: 'rgba(123,91,164,0.1)',
                  p: 0.75,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(123,91,164,0.2)',
                    transform: 'rotate(90deg)',
                  },
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Rule description */}
          <Typography
            sx={{
              fontSize: { xs: 14, sm: 15 },
              fontWeight: 700,
              lineHeight: 1.5,
              mb: 1.25,
              color: 'text.primary',
            }}
          >
            {rule.description || event.full_log || 'Log Event'}
          </Typography>

          {/* Timestamp + Agent */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <FiberManualRecordIcon sx={{ fontSize: 6, color, opacity: 0.6 }} />
              <Typography
                sx={{
                  fontSize: 11,
                  color: 'text.secondary',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                {timestamp ? format(new Date(timestamp), 'dd MMM yyyy · HH:mm:ss') : '—'}
              </Typography>
            </Box>
            {agent.name && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: SEV_COLOR.low,
                    boxShadow: `0 0 6px ${SEV_COLOR.low}70`,
                  }}
                />
                <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
                  {agent.name}
                </Typography>
              </Box>
            )}
          </Box>

          {/* MITRE tags */}
          {(rule.mitre?.tactic?.length || rule.mitre?.technique?.length) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25 }}>
              {[...(rule.mitre?.tactic ?? []), ...(rule.mitre?.technique ?? [])]
                .filter(Boolean)
                .slice(0, 6)
                .map((t: string, i: number) => (
                  <Chip
                    key={t}
                    label={t}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: rule.mitre?.tactic?.includes(t)
                        ? 'rgba(239,68,68,0.14)'
                        : `${BRAND.purple}12`,
                      color: rule.mitre?.tactic?.includes(t) ? '#EF4444' : BRAND.purpleLight,
                      border: `1px solid ${rule.mitre?.tactic?.includes(t) ? '#EF444430' : `${BRAND.purple}25`}`,
                      fontFamily: '"IBM Plex Mono", monospace',
                    }}
                  />
                ))}
            </Box>
          )}
        </Box>

        {/* Tab bar */}
        <Box sx={{ px: 3, pb: 2, pt: 0 }}>
          <Box
            sx={{
              display: 'flex',
              p: 0.5,
              gap: 0.5,
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              borderRadius: '12px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            {TABS.map((t, i) => (
              <Button
                key={i}
                size="small"
                startIcon={t.icon}
                onClick={() => setTab(i)}
                sx={{
                  flex: 1,
                  borderRadius: '9px',
                  py: 0.9,
                  fontSize: 12,
                  fontWeight: tab === i ? 800 : 600,
                  color:
                    tab === i
                      ? '#fff'
                      : isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                  bgcolor: tab === i ? color : 'transparent',
                  boxShadow: tab === i ? `0 3px 12px ${color}40` : 'none',
                  transition: 'all 0.22s ease',
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: tab === i ? color : `${color}12`,
                    color: tab === i ? '#fff' : color,
                  },
                  '& .MuiButton-startIcon': { mr: 0.75 },
                }}
              >
                {t.label}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <Box
        sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: { xs: 2.5, sm: 3 } }}
        className="scrollbar-thin"
      >
        {/* ── TAB 0: Details ─────────────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            {/* Network: Src → Dst */}
            <DrawerSection label="ต้นทาง → ปลายทาง" accent={color}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: 'stretch',
                }}
              >
                <IPBlock
                  label="Source IP"
                  ip={srcip}
                  port={data.srcport}
                  accent="#EF4444"
                  onInvestigate={
                    srcip
                      ? () => {
                          onClose()
                          navigate(`/investigate?q=${srcip}`)
                        }
                      : undefined
                  }
                />
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color,
                    opacity: 0.5,
                    transform: { xs: 'rotate(90deg)', sm: 'none' },
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5l8 7-8 7V5z" />
                  </svg>
                </Box>
                <IPBlock
                  label="Dest IP"
                  ip={dstip}
                  port={data.dstport}
                  accent={BRAND.purple}
                  onInvestigate={
                    dstip
                      ? () => {
                          onClose()
                          navigate(`/investigate?q=${dstip}`)
                        }
                      : undefined
                  }
                />
              </Box>

              {/* Extra network context */}
              {(data.proto || data.transport || data.action || data.direction) && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                  {(data.proto || data.transport) && (
                    <Chip
                      label={String(data.proto || data.transport).toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: `${BRAND.purple}14`,
                        color: BRAND.purpleLight,
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontWeight: 700,
                      }}
                    />
                  )}
                  {data.action && (
                    <Chip
                      label={String(data.action).toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: ['deny', 'drop', 'block'].includes(
                          String(data.action).toLowerCase()
                        )
                          ? 'rgba(239,68,68,0.14)'
                          : 'rgba(34,197,94,0.14)',
                        color: ['deny', 'drop', 'block'].includes(
                          String(data.action).toLowerCase()
                        )
                          ? '#EF4444'
                          : '#22C55E',
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontWeight: 700,
                      }}
                    />
                  )}
                  {data.direction && (
                    <Chip
                      label={String(data.direction).toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        color: 'text.secondary',
                        fontFamily: '"IBM Plex Mono", monospace',
                      }}
                    />
                  )}
                </Box>
              )}
            </DrawerSection>

            {/* Rule Context */}
            <DrawerSection label="Rule Context" accent={BRAND.purple}>
              <FieldRow label="Rule ID"          value={rule.id}                   mono copyable />
              <FieldRow label="Level"            value={level > 0 ? String(level) : null} mono />
              <FieldRow label="Description"      value={rule.description}          copyable />
              <FieldRow label="Decoder"          value={decoder.name || predecoder.program_name} mono />
              <FieldRow label="Location"         value={event.location}            mono />
              {groups.length > 0 && (
                <Box sx={{ py: 0.75, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600, mb: 0.75 }}>
                    Groups
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                    {groups.map((g) => (
                      <Chip
                        key={g}
                        label={g}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 22,
                          fontSize: 10,
                          fontWeight: 600,
                          fontFamily: '"IBM Plex Mono", monospace',
                          borderColor: isDark ? 'rgba(123,91,164,0.25)' : 'rgba(123,91,164,0.18)',
                          color: 'text.secondary',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </DrawerSection>

            {/* Agent */}
            {agent.name && (
              <DrawerSection label="Agent / Host" accent={SEV_COLOR.low}>
                <FieldRow label="Agent Name"  value={agent.name} copyable />
                <FieldRow label="Agent ID"    value={agent.id}   mono copyable />
                <FieldRow label="Agent IP"    value={agent.ip}   mono copyable />
              </DrawerSection>
            )}

            {/* GeoIP */}
            {geo.country_name && (
              <DrawerSection label="GeoIP" accent="#38BDF8">
                <FieldRow label="Country"  value={geo.country_name} />
                <FieldRow label="City"     value={geo.city_name} />
                <FieldRow label="ASN"      value={geo.asn} mono />
                <FieldRow label="AS Org"   value={geo.as_org} />
              </DrawerSection>
            )}

            {/* Compliance */}
            {compliance.length > 0 && (
              <DrawerSection label="Compliance" accent={SEV_COLOR.medium}>
                {compliance.map((c) => (
                  <Box key={c.key} sx={{ mb: 1 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.disabled', mb: 0.5 }}>
                      {c.key}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {c.items.map((item: string) => (
                        <Chip
                          key={item}
                          label={item}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 10,
                            fontFamily: '"IBM Plex Mono", monospace',
                            bgcolor: `${SEV_COLOR.medium}12`,
                            color: SEV_COLOR.medium,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </DrawerSection>
            )}

            {/* Actions */}
            <DrawerSection label="Actions" accent={BRAND.orange}>
              <Stack spacing={1}>
                {srcip && (
                  <Button
                    variant="outlined"
                    startIcon={<ManageSearchRoundedIcon />}
                    endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 13 }} />}
                    size="small"
                    onClick={() => { onClose(); navigate(`/investigate?q=${srcip}`) }}
                    sx={{
                      justifyContent: 'flex-start',
                      borderColor: isDark ? 'rgba(123,91,164,0.25)' : 'rgba(123,91,164,0.18)',
                      color: BRAND.purple,
                      fontWeight: 700,
                      '&:hover': { borderColor: BRAND.purple, bgcolor: `${BRAND.purple}08` },
                    }}
                  >
                    Investigate Source IP ({srcip})
                  </Button>
                )}
                {dstip && (
                  <Button
                    variant="outlined"
                    startIcon={<ManageSearchRoundedIcon />}
                    endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 13 }} />}
                    size="small"
                    onClick={() => { onClose(); navigate(`/investigate?q=${dstip}`) }}
                    sx={{
                      justifyContent: 'flex-start',
                      borderColor: isDark ? 'rgba(123,91,164,0.25)' : 'rgba(123,91,164,0.18)',
                      color: BRAND.purple,
                      fontWeight: 700,
                      '&:hover': { borderColor: BRAND.purple, bgcolor: `${BRAND.purple}08` },
                    }}
                  >
                    Investigate Dest IP ({dstip})
                  </Button>
                )}
                {srcip && (
                  <Button
                    variant="outlined"
                    startIcon={<SecurityRoundedIcon />}
                    endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 13 }} />}
                    size="small"
                    onClick={() => { onClose(); navigate(`/ioc?q=${srcip}`) }}
                    sx={{
                      justifyContent: 'flex-start',
                      borderColor: isDark ? 'rgba(241,116,34,0.25)' : 'rgba(241,116,34,0.18)',
                      color: BRAND.orange,
                      fontWeight: 700,
                      '&:hover': { borderColor: BRAND.orange, bgcolor: `${BRAND.orange}08` },
                    }}
                  >
                    Check IOC — {srcip}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<DownloadRoundedIcon />}
                  size="small"
                  onClick={handleDownloadJSON}
                  sx={{
                    justifyContent: 'flex-start',
                    borderColor: isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.15)',
                    color: 'text.secondary',
                    fontWeight: 700,
                    '&:hover': { borderColor: BRAND.purple, color: BRAND.purple },
                  }}
                >
                  Download Event JSON
                </Button>
              </Stack>
            </DrawerSection>
          </Box>
        )}

        {/* ── TAB 1: Raw Log / JSON ──────────────────────────────────────── */}
        {tab === 1 && (
          <Box>
            {/* Full Log */}
            {event.full_log && (
              <DrawerSection label="Raw Log" accent={BRAND.orange}>
                <Box sx={{ position: 'relative' }}>
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: '10px',
                      bgcolor: isDark ? 'rgba(12,10,20,0.8)' : 'rgba(248,246,255,0.8)',
                      border: `1px solid ${isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.12)'}`,
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: 11.5,
                      lineHeight: 1.65,
                      color: 'text.primary',
                      overflowX: 'auto',
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}
                    className="scrollbar-thin"
                  >
                    {event.full_log}
                  </Box>
                  <Tooltip title="Copy raw log">
                    <IconButton
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(event.full_log)
                        enqueueSnackbar('คัดลอก raw log แล้ว', { variant: 'info', autoHideDuration: 1500 })
                      }}
                      aria-label="Copy raw log"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: isDark ? 'rgba(22,18,42,0.8)' : 'rgba(255,255,255,0.8)',
                        '&:hover': { bgcolor: isDark ? 'rgba(22,18,42,1)' : '#fff' },
                        boxShadow: 1,
                      }}
                    >
                      <ContentCopyRoundedIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </DrawerSection>
            )}

            {/* Raw JSON */}
            <DrawerSection label="Raw JSON" accent={BRAND.purple}>
              <Box sx={{ position: 'relative' }}>
                <Box
                  component="pre"
                  sx={{
                    p: 1.75,
                    borderRadius: '10px',
                    bgcolor: isDark ? 'rgba(12,10,20,0.8)' : 'rgba(248,246,255,0.8)',
                    border: `1px solid ${isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.12)'}`,
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 11,
                    lineHeight: 1.7,
                    color: 'text.primary',
                    overflowX: 'auto',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    m: 0,
                    maxHeight: 480,
                    overflowY: 'auto',
                  }}
                  className="scrollbar-thin"
                >
                  {JSON.stringify(event, null, 2)}
                </Box>
                <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Copy JSON">
                    <IconButton
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(event, null, 2))
                        enqueueSnackbar('คัดลอก JSON แล้ว', { variant: 'info', autoHideDuration: 1500 })
                      }}
                      aria-label="Copy JSON"
                      sx={{
                        bgcolor: isDark ? 'rgba(22,18,42,0.8)' : 'rgba(255,255,255,0.8)',
                        '&:hover': { bgcolor: isDark ? 'rgba(22,18,42,1)' : '#fff' },
                        boxShadow: 1,
                      }}
                    >
                      <ContentCopyRoundedIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download JSON">
                    <IconButton
                      size="small"
                      onClick={handleDownloadJSON}
                      aria-label="Download JSON"
                      sx={{
                        bgcolor: isDark ? 'rgba(22,18,42,0.8)' : 'rgba(255,255,255,0.8)',
                        '&:hover': { bgcolor: isDark ? 'rgba(22,18,42,1)' : '#fff' },
                        boxShadow: 1,
                      }}
                    >
                      <DownloadRoundedIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </DrawerSection>
          </Box>
        )}
      </Box>
    </Drawer>
  )
}
