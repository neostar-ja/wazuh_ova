import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Drawer, Box, Typography, Chip, IconButton, Tooltip, Button, Grid,
  CircularProgress, Alert, LinearProgress, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material'
import VisibilityRoundedIcon   from '@mui/icons-material/VisibilityRounded'
import SecurityRoundedIcon     from '@mui/icons-material/SecurityRounded'
import DataObjectRoundedIcon   from '@mui/icons-material/DataObjectRounded'
import CloseRoundedIcon        from '@mui/icons-material/CloseRounded'
import FiberManualRecordIcon   from '@mui/icons-material/FiberManualRecord'
import ContentCopyRoundedIcon  from '@mui/icons-material/ContentCopyRounded'
import OpenInNewRoundedIcon    from '@mui/icons-material/OpenInNewRounded'
import BookmarkAddRoundedIcon  from '@mui/icons-material/BookmarkAddRounded'
import TuneRoundedIcon         from '@mui/icons-material/TuneRounded'
import GppBadRoundedIcon       from '@mui/icons-material/GppBadRounded'
import GppGoodRoundedIcon      from '@mui/icons-material/GppGoodRounded'
import { alertsApi, investigateApi } from '../../services/api'
import { format } from 'date-fns'
import { useSnackbar } from 'notistack'
import { WazuhAlertItem } from '../../types/alert'
import { BRAND, SEV_COLOR, GRADIENT, FEED_COLOR, sevColor, sevLabelShort } from '../ui/tokens'
import { MitreTags, DrawerSection, IPCard, FeedMiniCard } from './shared/AlertUiBits'
import { getVisibleAlertGroups } from './alertTaxonomy'

// ── Alert Detail Drawer ───────────────────────────────────────────────────────
interface AlertDrawerProps {
  alert: WazuhAlertItem | null;
  open: boolean;
  onClose: () => void;
  onTuned?: () => void;
}

const LEVEL_OPTIONS = [
  { value: 15, label: '15 · Critical' },
  { value: 12, label: '12 · High' },
  { value: 7, label: '7 · Medium' },
  { value: 3, label: '3 · Low' },
]

export function AlertDrawer({ alert, open, onClose, onTuned }: AlertDrawerProps) {
  const navigate   = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [tab, setTab]       = useState(0)
  const [enrichData, setEnrich]       = useState<any>(null)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [tuneOpen, setTuneOpen] = useState(false)
  const [tuneScope, setTuneScope] = useState<'single' | 'rule'>('single')
  const [tuneLevel, setTuneLevel] = useState(12)
  const [tuneReason, setTuneReason] = useState('')
  const [tuneSaving, setTuneSaving] = useState(false)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Extract raw wazuh fields for detailed drawer content
  const rawWazuh = (alert?.raw as any) || {}
  const rule     = rawWazuh.rule || {}
  const data     = rawWazuh.data || {}
  const agent    = rawWazuh.agent || {}
  const geo      = rawWazuh.GeoLocation || {}

  const lv       = alert?.ruleLevel || 0
  const originalLv = alert?.originalRuleLevel || lv
  const color    = sevColor(lv)
  const srcip    = alert?.sourceIp
  const dstip    = alert?.destinationIp
  const country  = alert?.countryName
  const program  = alert?.decoderName
  const groups: string[] = alert?.groups || []

  const compliance = [
    { key: 'PCI-DSS', items: rule.pci_dss    || [] },
    { key: 'HIPAA',   items: rule.hipaa       || [] },
    { key: 'NIST',    items: rule.nist_800_53 || [] },
    { key: 'GDPR',    items: rule.gdpr        || [] },
  ].filter(c => c.items.length > 0)

  const hasMitre = rule.mitre?.tactic?.length || rule.mitre?.technique?.length
  const tuning = alert?.socTuning

  const fetchEnrich = useCallback(async () => {
    if (!srcip || enrichLoading || enrichData) return
    setEnrichLoading(true)
    try {
      const r = await investigateApi.enrich(srcip)
      setEnrich(r.data)
    } catch {
      // ignore
    }
    setEnrichLoading(false)
  }, [srcip, enrichLoading, enrichData])

  useEffect(() => { if (open && srcip && tab === 1) fetchEnrich() }, [open, srcip, tab, fetchEnrich])
  useEffect(() => { if (!open) { setTab(0); setEnrich(null) } }, [open])
  useEffect(() => {
    if (!open || !alert) return
    setTuneScope('single')
    setTuneLevel(alert.ruleLevel >= 15 ? 12 : alert.ruleLevel)
    setTuneReason('')
  }, [open, alert])

  const saveTuning = async () => {
    if (!alert) return
    const reason = tuneReason.trim()
    if (!reason) {
      enqueueSnackbar('กรุณาระบุเหตุผลการปรับระดับ', { variant: 'warning' })
      return
    }
    if (tuneScope === 'rule' && !alert.ruleId) {
      enqueueSnackbar('Alert นี้ไม่มี Rule ID จึงปรับแบบทั้ง Rule ไม่ได้', { variant: 'warning' })
      return
    }
    setTuneSaving(true)
    try {
      await alertsApi.setSeverityOverride({
        scope: tuneScope,
        alert_id: alert.socAlertId || alert.id,
        rule_id: alert.ruleId,
        original_level: originalLv,
        tuned_level: tuneLevel,
        reason,
      })
      enqueueSnackbar(tuneScope === 'rule' ? 'ปรับระดับทั้ง Rule สำเร็จ' : 'ปรับระดับเฉพาะ Alert สำเร็จ', { variant: 'success' })
      setTuneOpen(false)
      onTuned?.()
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.detail || 'ไม่สามารถปรับระดับได้', { variant: 'error' })
    } finally {
      setTuneSaving(false)
    }
  }

  const TABS = [
    { label: 'รายละเอียด', icon: <VisibilityRoundedIcon sx={{ fontSize: 13 }} />, hint: 'Network · Rules · MITRE' },
    { label: 'Threat Intel', icon: <SecurityRoundedIcon sx={{ fontSize: 13 }} />, hint: 'AbuseIPDB · OTX · Shodan · VT' },
    { label: 'Raw Log',     icon: <DataObjectRoundedIcon sx={{ fontSize: 13 }} />, hint: 'JSON' },
  ]

  // Fixed sidebar width across all tabs
  const DRAWER_WIDTH = 'min(800px, 95vw)'

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          minWidth: DRAWER_WIDTH,
          maxWidth: DRAWER_WIDTH,
          boxSizing: 'border-box',
          overflowX: 'hidden',
        },
      }}
      slotProps={{
        paper: {
          sx: {
            width: DRAWER_WIDTH,
            minWidth: DRAWER_WIDTH,
            maxWidth: DRAWER_WIDTH,
            display: 'flex', flexDirection: 'column',
            bgcolor: isDark ? 'rgba(22, 18, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(20px)',
            borderLeft: `4px solid ${color}`,
            boxShadow: isDark
              ? `0 24px 64px rgba(0,0,0,0.65), inset 1px 0 0 0 rgba(255,255,255,0.06), 0 0 30px ${color}18`
              : `0 24px 64px rgba(79,110,247,0.18), inset 1px 0 0 0 rgba(255,255,255,0.4), 0 0 30px ${color}12`,
            overflowX: 'hidden',
          }
        }
      }}
    >
      {alert && (
        <>
          {/* ══ HEADER ══════════════════════════════════════════════════════ */}
          <Box sx={{
            flexShrink: 0,
            background: lv >= 15
              ? `linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 60%, transparent 100%)`
              : lv >= 12
              ? `linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0.04) 60%, transparent 100%)`
              : lv >= 7
              ? `linear-gradient(135deg, rgba(245,158,11,0.1) 0%, transparent 60%)`
              : `linear-gradient(135deg, rgba(34,197,94,0.08) 0%, transparent 60%)`,
            borderBottom: `1px solid ${color}22`,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Decorative gradient orb */}
            <Box sx={{
              position: 'absolute', top: -50, right: -50,
              width: 200, height: 200, borderRadius: '50%',
              background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
              pointerEvents: 'none',
              animation: 'float 8s ease-in-out infinite',
            }} />

            <Box sx={{ p: { xs: 2.5, sm: 3 }, position: 'relative', zIndex: 1 }}>
              {/* Top row: level + rule# + source + close */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {/* Level badge — large */}
                  <Box sx={{
                    px: 1.75, py: 0.6, borderRadius: '12px',
                    bgcolor: `${color}20`, border: `2.5px solid ${color}45`,
                    display: 'flex', alignItems: 'center', gap: 1,
                    animation: lv >= 15 ? 'pulse-critical 2.5s ease-in-out infinite' : 'none',
                    boxShadow: `0 4px 14px ${color}25`,
                    whiteSpace: 'nowrap',
                  }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 8px ${color}` }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 900, color, letterSpacing: '0.06em' }}>
                      LEVEL {lv} · {sevLabelShort(lv)}
                    </Typography>
                  </Box>
                  {rule.id && (
                    <Chip label={`Rule #${rule.id}`} size="small" variant="outlined"
                      sx={{ height: 26, fontSize: 11, borderColor: `${color}40`, color: color, fontWeight: 700 }} />
                  )}
                  {program && (
                    <Chip label={program} size="small"
                      sx={{ height: 26, fontSize: 11, bgcolor: 'rgba(79,110,247,0.14)', color: BRAND.primaryLight, fontWeight: 600 }} />
                  )}
                  {tuning && (
                    <Chip label={`TUNED ${tuning.original_level}→${tuning.tuned_level} · ${tuning.scope === 'rule' ? 'ทั้ง Rule' : 'เฉพาะ Alert'}`} size="small"
                      sx={{ height: 26, fontSize: 10.5, bgcolor: 'rgba(234,179,8,0.16)', color: '#FBBF24', fontWeight: 800 }} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  <Tooltip title="ปรับระดับความรุนแรง">
                    <IconButton size="small" onClick={() => setTuneOpen(true)}
                      sx={{ borderRadius: '12px', bgcolor: 'rgba(234,179,8,0.12)', color: '#FBBF24', p: 0.8,
                        '&:hover': { bgcolor: 'rgba(234,179,8,0.22)' } }}>
                      <TuneRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={onClose}
                    sx={{
                      borderRadius: '12px',
                      bgcolor: 'rgba(79,110,247,0.1)',
                      p: 0.8,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(79,110,247,0.2)',
                        transform: 'rotate(90deg)',
                      }
                    }}>
                    <CloseRoundedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Rule description */}
              <Typography sx={{
                fontSize: { xs: 14, sm: 16 },
                fontWeight: 700,
                lineHeight: 1.5,
                mb: 1.5,
                color: 'text.primary',
                letterSpacing: '-0.3px',
              }}>
                {rule.description || '—'}
              </Typography>

              {/* Timestamp + Agent */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <FiberManualRecordIcon sx={{ fontSize: 6, color: color, opacity: 0.6 }} />
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontFamily: '"IBM Plex Mono",monospace', fontWeight: 500 }}>
                    {alert?.timestamp ? format(new Date(alert.timestamp), 'dd MMM yyyy · HH:mm:ss') : '—'}
                  </Typography>
                </Box>
                {agent.name && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                     <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
                     <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 500 }}>{agent.name}</Typography>
                  </Box>
                )}
              </Box>

              {/* MITRE inline tags */}
              <MitreTags groups={groups} mitre={rule.mitre} />
            </Box>

            {/* Tab bar — segmented pill control */}
            <Box sx={{ px: { xs: 2.5, sm: 3 }, pb: 2, pt: 0.5, borderTop: `1px solid ${color}15` }}>
              <Box sx={{
                display: 'flex', p: 0.5, gap: 0.5,
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                borderRadius: '14px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
              }}>
                {TABS.map((t, i) => (
                  <Tooltip key={i} title={t.hint} placement="bottom" arrow>
                    <Button size="small"
                      startIcon={t.icon}
                      onClick={() => setTab(i)}
                      sx={{
                        flex: 1,
                        borderRadius: '11px',
                        py: 1, px: { xs: 0.5, sm: 1.5 },
                        fontSize: { xs: 11, sm: 12.5 },
                        fontWeight: tab === i ? 800 : 600,
                        color: tab === i ? '#fff' : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'),
                        bgcolor: tab === i ? color : 'transparent',
                        boxShadow: tab === i ? `0 4px 14px ${color}45, 0 1px 3px rgba(0,0,0,0.15)` : 'none',
                        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                        '&:hover': {
                          bgcolor: tab === i ? color : `${color}15`,
                          color: tab === i ? '#fff' : color,
                        },
                        '& .MuiButton-startIcon': { mr: { xs: 0.4, sm: 0.8 } },
                        minWidth: 0, textTransform: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.label}
                    </Button>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          </Box>

          {/* ══ CONTENT ══════════════════════════════════════════════════════ */}
          <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: { xs: 2.5, sm: 3 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }} className="scrollbar-thin">

            {/* ─── TAB 0: Details ─────────────────────────────────────────── */}
            {tab === 0 && (
              <Box sx={{ animation: 'tabContentIn 0.22s cubic-bezier(0.4,0,0.2,1) both', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
                {/* Network section: Src → Dst */}
                <DrawerSection label="ต้นทาง → ปลายทาง" accent={color}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch', flexDirection: { xs: 'column', sm: 'row' } }}>
                    <IPCard
                      label="Source IP"
                      ip={srcip}
                      port={data.srcport}
                      country={country}
                      accent="#EF4444"
                      onClick={srcip ? () => { onClose(); navigate(`/investigate?q=${srcip}`) } : null}
                    />

                    {/* Arrow */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: color, opacity: 0.6, transform: { xs: 'rotate(90deg)', sm: 'none' } }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
                        <path d="M8 5l8 7-8 7V5z"/>
                      </svg>
                    </Box>

                    <IPCard
                      label="Dest IP"
                      ip={dstip}
                      port={data.dstport}
                      accent={BRAND.primary}
                    />
                  </Box>

                  {/* Extra network fields */}
                  {(data.srcuser || data.dstuser || agent.name) && (
                    <Box sx={{ display: 'flex', gap: 1.25, mt: 1.5, flexWrap: 'wrap' }}>
                      {[
                        ['Src User', data.srcuser], ['Dst User', data.dstuser], ['Agent', agent.name],
                      ].filter(([,v]) => v).map(([k, v]) => (
                        <Box key={k} sx={{
                          flex: { xs: '1 1 100%', sm: '1 1 auto' },
                          px: 1.5, py: 1, borderRadius: '12px',
                          bgcolor: isDark ? 'rgba(79,110,247,0.08)' : 'rgba(79,110,247,0.06)',
                          border: '1px solid rgba(79,110,247,0.15)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: isDark ? 'rgba(79,110,247,0.14)' : 'rgba(79,110,247,0.1)',
                            borderColor: 'rgba(79,110,247,0.3)',
                          }
                        }}>
                          <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>{k}</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{v}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </DrawerSection>

                {/* Rule Groups */}
                {groups.length > 0 && (
                  <DrawerSection label="Rule Groups" accent={BRAND.primary}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {getVisibleAlertGroups(groups, groups.length).map((groupMeta) => (
                        <Chip key={groupMeta.key} label={groupMeta.label} size="small" variant="outlined"
                          sx={{
                            height: 26, fontSize: 11, fontWeight: 600,
                            borderColor: `${groupMeta.color}40`,
                            color: groupMeta.color,
                            bgcolor: isDark ? `${groupMeta.color}14` : `${groupMeta.color}0a`,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: `${groupMeta.color}20`,
                              borderColor: groupMeta.color,
                              transform: 'translateY(-2px)',
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </DrawerSection>
                )}

                {/* MITRE ATT&CK */}
                {hasMitre && (
                  <DrawerSection label="MITRE ATT&CK" accent="#EF4444">
                    <Box sx={{
                      p: 2, borderRadius: '14px',
                      bgcolor: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
                      border: '1.5px solid rgba(239,68,68,0.2)',
                      transition: 'all 0.2s ease',
                    }}>
                      {rule.mitre?.tactic?.length > 0 && (
                        <Box sx={{ mb: 1.5 }}>
                          <Typography sx={{ fontSize: 10, color: '#EF4444', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.75 }}>Tactics</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {rule.mitre.tactic.map((t: string) => (
                              <Box key={t} sx={{
                                px: 1.25, py: 0.6, borderRadius: '8px',
                                bgcolor: 'rgba(239,68,68,0.18)',
                                border: '1px solid rgba(239,68,68,0.35)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: 'rgba(239,68,68,0.25)',
                                  transform: 'scale(1.05)',
                                }
                              }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>{t}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                      {rule.mitre?.technique?.length > 0 && (
                        <Box>
                          <Typography sx={{ fontSize: 10, color: 'rgba(239,68,68,0.75)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.75 }}>Techniques</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {rule.mitre.technique.map((t: string) => (
                              <Chip key={t} label={t} size="small" variant="outlined"
                                sx={{
                                  height: 26, fontSize: 11, fontWeight: 600,
                                  borderColor: 'rgba(239,68,68,0.4)',
                                  color: '#EF4444',
                                  bgcolor: 'rgba(239,68,68,0.08)',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    bgcolor: 'rgba(239,68,68,0.15)',
                                    borderColor: '#EF4444',
                                    transform: 'translateY(-2px)',
                                  }
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </DrawerSection>
                )}

                {/* Compliance */}
                {compliance.length > 0 && (
                  <DrawerSection label="Compliance Standards" accent={BRAND.primaryLight}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                      {compliance.map(c => (
                        <Box key={c.key} sx={{
                          p: 1.75, borderRadius: '12px',
                          bgcolor: isDark ? 'rgba(79,110,247,0.07)' : 'rgba(79,110,247,0.05)',
                          border: '1px solid rgba(79,110,247,0.18)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: isDark ? 'rgba(79,110,247,0.12)' : 'rgba(79,110,247,0.08)',
                            borderColor: 'rgba(79,110,247,0.3)',
                          }
                        }}>
                          <Typography sx={{ fontSize: 10, fontWeight: 900, color: BRAND.primaryLight, letterSpacing: '0.08em', mb: 0.75, textTransform: 'uppercase' }}>{c.key}</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                            {c.items.slice(0, 10).map((i: string) => (
                              <Chip key={i} label={i} size="small"
                                sx={{
                                  height: 22, fontSize: 10, fontWeight: 600,
                                  bgcolor: isDark ? 'rgba(79,110,247,0.15)' : 'rgba(79,110,247,0.1)',
                                  color: BRAND.primaryLight,
                                  '& .MuiChip-label': { px: 0.75 },
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    bgcolor: isDark ? 'rgba(79,110,247,0.25)' : 'rgba(79,110,247,0.18)',
                                    transform: 'scale(1.05)',
                                  }
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </DrawerSection>
                )}

                {/* GeoIP */}
                {Object.keys(geo).filter(k => geo[k]).length > 0 && (
                  <DrawerSection label="GeoIP Location" accent="#38BDF8">
                    <Box sx={{
                      p: 2, borderRadius: '14px',
                      bgcolor: isDark ? 'rgba(56,189,248,0.06)' : 'rgba(56,189,248,0.04)',
                      border: '1.5px solid rgba(56,189,248,0.2)',
                    }}>
                      <Grid container spacing={1.5}>
                        {[
                          ['🌍 Country',  geo.country_name],
                          ['🏙 City',     geo.city_name],
                          ['🗺 Region',   geo.region_name],
                          ['📍 Coords',   geo.location?.lat ? `${geo.location.lat?.toFixed(2)}, ${geo.location.lon?.toFixed(2)}` : null],
                        ].filter(([,v]) => v).map(([k, v]) => (
                          <Grid item xs={6} key={k} sm={6}>
                            <Box>
                              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.4 }}>{k}</Typography>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary' }}>{v}</Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </DrawerSection>
                )}

                {/* Full log */}
                {alert.fullLog && (
                  <DrawerSection label="Full Log" accent="text.disabled">
                    <Box sx={{ position: 'relative', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <Tooltip title="คัดลอก">
                        <IconButton size="small"
                          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, bgcolor: 'rgba(79,110,247,0.12)', transition: 'all 0.2s',
                            '&:hover': { bgcolor: 'rgba(79,110,247,0.2)', transform: 'scale(1.1)' } }}
                          onClick={() => { navigator.clipboard.writeText(alert.fullLog || ''); enqueueSnackbar('คัดลอกแล้ว', { variant: 'info' }) }}>
                          <ContentCopyRoundedIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                      <Box sx={{
                        p: 2, pr: 4.5, borderRadius: '12px', maxHeight: 200, overflowY: 'auto', overflowX: 'hidden',
                        bgcolor: isDark ? 'rgba(12,10,20,0.8)' : 'rgba(79,110,247,0.05)',
                        border: '1px solid rgba(79,110,247,0.15)',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: 'rgba(79,110,247,0.25)' },
                        width: '100%', maxWidth: '100%', boxSizing: 'border-box',
                      }} className="scrollbar-thin">
                        <Typography component="pre" sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono",monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'text.secondary', lineHeight: 1.7, width: '100%', maxWidth: '100%' }}>
                          {alert.fullLog}
                        </Typography>
                      </Box>
                    </Box>
                  </DrawerSection>
                )}
              </Box>
            )}

            {/* ─── TAB 1: Threat Intel ────────────────────────────────────── */}
            {tab === 1 && (
              <Box sx={{ animation: 'tabContentIn 0.22s cubic-bezier(0.4,0,0.2,1) both', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
                {!srcip ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <SecurityRoundedIcon sx={{ fontSize: 44, color: 'rgba(79,110,247,0.25)', mb: 1.5 }} />
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600 }}>ไม่มี Source IP</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>Alert นี้ไม่มีข้อมูล Source IP สำหรับตรวจสอบ</Typography>
                  </Box>
                ) : enrichLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
                    <Box sx={{ position: 'relative' }}>
                      <CircularProgress size={48} thickness={3} sx={{ color: BRAND.primary }} />
                      <SecurityRoundedIcon sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 20, color: BRAND.primaryLight }} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>กำลังตรวจสอบ Threat Intelligence</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>{srcip}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {['AbuseIPDB', 'OTX', 'Shodan', 'VirusTotal'].map((f, i) => (
                        <Chip key={f} label={f} size="small"
                          sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(79,110,247,0.1)', color: BRAND.primaryLight,
                            animation: `pageFadeIn 0.3s ease ${i * 0.1}s both` }} />
                      ))}
                    </Box>
                  </Box>
                ) : !enrichData ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: 'rgba(79,110,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                      <SecurityRoundedIcon sx={{ fontSize: 28, color: BRAND.primary }} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>ตรวจสอบ {srcip}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>AbuseIPDB · OTX · Shodan · VirusTotal</Typography>
                    <Button variant="contained" onClick={fetchEnrich} startIcon={<SecurityRoundedIcon sx={{ fontSize: 15 }} />}
                      sx={{ borderRadius: '10px', fontSize: 12 }}>
                      เริ่มตรวจสอบ
                    </Button>
                  </Box>
                ) : enrichData.is_private ? (
                  <Alert severity="info" sx={{ fontSize: 12 }}>
                    <b>{srcip}</b> เป็น Private IP — ไม่ตรวจสอบใน external threat feeds
                  </Alert>
                ) : (
                  <Box>
                    {/* Verdict banner */}
                    {(() => {
                      const feeds  = enrichData.feeds || {}
                      const abuse  = feeds.abuseipdb?.abuseConfidenceScore || 0
                      const vt     = feeds.virustotal
                      const vtBad  = vt?.found ? (vt.malicious || 0) : 0
                      const otx    = feeds.otx?.pulse_count || 0
                      const riskPct = Math.max(abuse, vtBad >= 5 ? 80 : vtBad * 10, otx >= 3 ? 60 : otx * 15)
                      const verdict: 'malicious' | 'suspicious' | 'clean' = (abuse >= 75 || vtBad >= 5) ? 'malicious' : (abuse >= 30 || otx >= 3) ? 'suspicious' : 'clean'
                      const vc = { malicious: '#EF4444', suspicious: SEV_COLOR.high, clean: '#22C55E' }
                      const vIcon = verdict === 'clean'
                        ? <GppGoodRoundedIcon sx={{ fontSize: 32, color: '#22C55E' }} />
                        : <GppBadRoundedIcon sx={{ fontSize: 32, color: vc[verdict] }} />
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, p: 2, borderRadius: '14px',
                          background: `linear-gradient(135deg, ${vc[verdict]}12 0%, ${vc[verdict]}04 100%)`,
                          border: `1.5px solid ${vc[verdict]}30` }}>
                          {vIcon}
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Chip label={verdict.toUpperCase()} size="small"
                                sx={{ bgcolor: `${vc[verdict]}20`, color: vc[verdict], fontWeight: 900, fontSize: 11, height: 22 }} />
                              <Typography sx={{ fontSize: 13, fontFamily: '"IBM Plex Mono"', fontWeight: 700, color: 'text.secondary' }}>{srcip}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(79,110,247,0.1)', overflow: 'hidden' }}>
                                <Box sx={{ height: '100%', width: `${Math.min(riskPct, 100)}%`, bgcolor: vc[verdict], borderRadius: 3, transition: 'width 0.8s ease' }} />
                              </Box>
                              <Typography sx={{ fontSize: 11, fontWeight: 800, color: vc[verdict], minWidth: 36 }}>{Math.round(riskPct)}%</Typography>
                            </Box>
                          </Box>
                        </Box>
                      )
                    })()}

                    {/* Feed cards 2×2 grid */}
                    <Grid container spacing={1.25}>
                      {[
                        {
                          name: 'ABUSEIPDB', color: '#EF4444',
                          d: enrichData.feeds?.abuseipdb,
                          main: enrichData.feeds?.abuseipdb?.available ? `${enrichData.feeds.abuseipdb.abuseConfidenceScore ?? '—'}%` : '—',
                          mainLabel: 'Abuse Confidence',
                          rows: [
                            ['Reports',  enrichData.feeds?.abuseipdb?.totalReports],
                            ['Country',  enrichData.feeds?.abuseipdb?.countryName || enrichData.feeds?.abuseipdb?.countryCode],
                            ['ISP',      enrichData.feeds?.abuseipdb?.isp],
                            ['Domain',   enrichData.feeds?.abuseipdb?.domain],
                            ['Usage',    enrichData.feeds?.abuseipdb?.usageType],
                          ] as [string, any][],
                          extra: enrichData.feeds?.abuseipdb?.available && (
                            <Box sx={{ mt: 0.75 }}>
                              <LinearProgress variant="determinate"
                                value={enrichData.feeds.abuseipdb.abuseConfidenceScore || 0}
                                sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.12)',
                                  '& .MuiLinearProgress-bar': { bgcolor: '#EF4444', borderRadius: 2 } }} />
                            </Box>
                          ),
                        },
                        {
                          name: 'ALIENVAULT OTX', color: FEED_COLOR.otx,
                          d: enrichData.feeds?.otx,
                          main: enrichData.feeds?.otx?.available ? enrichData.feeds.otx.pulse_count || 0 : '—',
                          mainLabel: 'Threat Pulses',
                          rows: [
                            ['Country', enrichData.feeds?.otx?.country_name],
                            ['ASN',     enrichData.feeds?.otx?.asn],
                            ['Malware', enrichData.feeds?.otx?.malware_count],
                          ] as [string, any][],
                          extra: enrichData.feeds?.otx?.pulse_refs?.length > 0 && (
                            <Box sx={{ mt: 0.5 }}>
                              {enrichData.feeds.otx.pulse_refs.slice(0, 2).map((p: any, i: number) => (
                                <Typography key={i} sx={{ fontSize: 9, color: FEED_COLOR.otx, lineHeight: 1.4, mt: 0.3 }} className="line-clamp-2">• {p.name}</Typography>
                              ))}
                            </Box>
                          ),
                        },
                        {
                          name: 'SHODAN', color: FEED_COLOR.shodan,
                          d: enrichData.feeds?.shodan,
                          main: enrichData.feeds?.shodan?.available ? enrichData.feeds.shodan.ports?.length ?? 0 : '—',
                          mainLabel: 'Open Ports',
                          rows: [
                            ['Org',     enrichData.feeds?.shodan?.org],
                            ['Country', enrichData.feeds?.shodan?.country_name],
                            ['CVEs',    enrichData.feeds?.shodan?.vulns?.length],
                          ] as [string, any][],
                          extra: enrichData.feeds?.shodan?.ports?.length > 0 && (
                            <Box sx={{ mt: 0.75 }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                                {enrichData.feeds.shodan.ports.slice(0, 8).map((p: number) => (
                                  <Chip key={p} label={p} size="small"
                                    sx={{ height: 15, fontSize: 8, fontFamily: '"IBM Plex Mono"',
                                      bgcolor: [22,23,3389,4444,6379].includes(p) ? 'rgba(239,68,68,0.18)' : 'rgba(79,110,247,0.12)',
                                      color: [22,23,3389,4444,6379].includes(p) ? '#EF4444' : 'text.secondary',
                                      '& .MuiChip-label': { px: 0.5 } }} />
                                ))}
                              </Box>
                            </Box>
                          ),
                        },
                        {
                          name: 'VIRUSTOTAL', color: FEED_COLOR.virustotal,
                          d: enrichData.feeds?.virustotal,
                          main: enrichData.feeds?.virustotal?.available && enrichData.feeds.virustotal.found
                            ? `${enrichData.feeds.virustotal.malicious || 0}/${enrichData.feeds.virustotal.total || 0}`
                            : '—',
                          mainLabel: 'Detections',
                          rows: [
                            ['Country',   enrichData.feeds?.virustotal?.country],
                            ['AS Owner',  enrichData.feeds?.virustotal?.as_owner],
                            ['Suspicious',enrichData.feeds?.virustotal?.suspicious],
                          ] as [string, any][],
                          extra: enrichData.feeds?.virustotal?.malicious_engines?.length > 0 && (
                            <Box sx={{ mt: 0.75 }}>
                              {enrichData.feeds.virustotal.malicious_engines.slice(0, 2).map((e: any, i: number) => (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>{e.engine}</Typography>
                                  <Typography sx={{ fontSize: 9, color: FEED_COLOR.virustotal, fontWeight: 700 }} noWrap>{e.result}</Typography>
                                </Box>
                              ))}
                            </Box>
                          ),
                        },
                      ].map(fc => (
                        <Grid item xs={6} key={fc.name}>
                          <FeedMiniCard
                            name={fc.name}
                            color={fc.color}
                            main={fc.d?.available ? fc.main : '—'}
                            mainLabel={fc.mainLabel}
                            rows={fc.d?.available ? fc.rows : []}
                            extra={fc.d?.available ? fc.extra : null}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            )}

            {/* ─── TAB 2: Raw Log ─────────────────────────────────────────── */}
            {tab === 2 && (
              <Box sx={{ animation: 'tabContentIn 0.22s cubic-bezier(0.4,0,0.2,1) both', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>Raw JSON Data</Typography>
                  <Button size="small" startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 14 }} />}
                    onClick={() => { navigator.clipboard.writeText(JSON.stringify(alert, null, 2)); enqueueSnackbar('คัดลอก JSON แล้ว', { variant: 'info' }) }}
                    sx={{ fontSize: 11.5, borderRadius: '8px', px: 1.5, py: 0.6 }}>
                    คัดลอก JSON
                  </Button>
                </Box>
                <Box sx={{
                  borderRadius: '16px', overflow: 'hidden',
                  border: '1.5px solid rgba(79,110,247,0.18)',
                  background: isDark ? 'rgba(10,8,18,0.9)' : 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  width: '100%', maxWidth: '100%', boxSizing: 'border-box',
                }}>
                  {/* Code header bar */}
                  <Box sx={{ px: 2, py: 1, bgcolor: isDark ? 'rgba(79,110,247,0.08)' : 'rgba(79,110,247,0.05)', borderBottom: '1px solid rgba(79,110,247,0.15)', display: 'flex', alignItems: 'center', gap: 0.75, width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                    {[SEV_COLOR.critical, SEV_COLOR.medium, SEV_COLOR.low].map(c => (
                      <Box key={c} sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: c, opacity: 0.8, cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }} />
                    ))}
                    <Typography sx={{ fontSize: 11.5, color: 'text.disabled', ml: 1.5, fontWeight: 700, fontFamily: '"IBM Plex Mono"' }}>alert.json</Typography>
                  </Box>
                  <Box sx={{ p: 2.25, overflowY: 'auto', overflowX: 'hidden', maxHeight: 'calc(100vh - 350px)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }} className="scrollbar-thin">
                    <Typography component="pre" sx={{
                      fontSize: 12, fontFamily: '"IBM Plex Mono",monospace',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      color: isDark ? '#EDE9FA' : '#334155',
                      lineHeight: 1.8, m: 0,
                      width: '100%', maxWidth: '100%',
                    }}>
                      {JSON.stringify(alert, null, 2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>

          {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
          <Box sx={{
            px: { xs: 2.5, sm: 3 }, py: 2,
            borderTop: '1px solid', borderColor: 'divider',
            display: 'flex', gap: 1.5, flexWrap: 'wrap',
            bgcolor: isDark ? 'rgba(12,10,20,0.5)' : 'rgba(79,110,247,0.04)',
            flexShrink: 0,
          }}>
            {srcip && (
              <Button variant="contained" size="small"
                startIcon={<OpenInNewRoundedIcon sx={{ fontSize: 15 }} />}
                onClick={() => { onClose(); navigate(`/investigate?q=${srcip}`) }}
                sx={{
                  borderRadius: '10px', fontSize: 12.5, py: 1.1, px: 2.5,
                  background: GRADIENT.primary,
                  boxShadow: '0 4px 14px rgba(79,110,247, 0.4)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 18px rgba(79,110,247, 0.55)',
                    filter: 'brightness(1.1)'
                  }
                }}>
                สืบสวน IP
              </Button>
            )}
            {srcip && (
              <Button variant="outlined" size="small" color="warning"
                startIcon={<BookmarkAddRoundedIcon sx={{ fontSize: 15 }} />}
                onClick={() => { onClose(); navigate(`/ioc?add=${srcip}`) }}
                sx={{
                  borderRadius: '10px', fontSize: 12.5, py: 1.1,
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(249,115,22, 0.2)',
                  }
                }}>
                เพิ่ม IOC
              </Button>
            )}
            <Button variant="outlined" size="small"
              startIcon={<TuneRoundedIcon sx={{ fontSize: 15 }} />}
              onClick={() => setTuneOpen(true)}
              sx={{
                borderRadius: '10px', fontSize: 12.5, py: 1.1,
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(79,110,247, 0.15)',
                }
              }}>
              ปรับระดับ
            </Button>
          </Box>

          <Dialog open={tuneOpen} onClose={() => !tuneSaving && setTuneOpen(false)} maxWidth="sm" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: isDark ? 'rgba(22,18,42,0.98)' : '#fff' } } }}>
            <DialogTitle sx={{ fontSize: 16, fontWeight: 800 }}>
              ปรับระดับความรุนแรง
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Alert severity="info" sx={{ fontSize: 12, borderRadius: 2 }}>
                การปรับนี้เป็น Web override ใน SOC Center ไม่แก้ raw log ย้อนหลังใน OpenSearch และไม่แก้ Wazuh rule file โดยตรง
              </Alert>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`Alert: ${alert.socAlertId || alert.id}`} size="small" sx={{ fontFamily: '"IBM Plex Mono"', maxWidth: '100%' }} />
                {alert.ruleId && <Chip label={`Rule #${alert.ruleId}`} size="small" />}
                <Chip label={`เดิม ${originalLv} → แสดงปัจจุบัน ${lv}`} size="small" color="warning" />
              </Box>
              <FormControl size="small" fullWidth>
                <InputLabel>ขอบเขตผลกระทบ</InputLabel>
                <Select value={tuneScope} label="ขอบเขตผลกระทบ" onChange={e => setTuneScope(e.target.value as 'single' | 'rule')}>
                  <MenuItem value="single">เฉพาะ Alert นี้เท่านั้น</MenuItem>
                  <MenuItem value="rule" disabled={!alert.ruleId}>ทั้งหมดที่เป็น Rule #{alert.ruleId || '—'}</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>ระดับใหม่</InputLabel>
                <Select value={tuneLevel} label="ระดับใหม่" onChange={e => setTuneLevel(Number(e.target.value))}>
                  {LEVEL_OPTIONS.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="เหตุผล"
                size="small"
                multiline
                minRows={3}
                value={tuneReason}
                onChange={e => setTuneReason(e.target.value)}
                placeholder="เช่น firewall allowed event นี้ตรวจสอบแล้วเป็น expected traffic จึงลดจาก Critical เป็น High"
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setTuneOpen(false)} disabled={tuneSaving} sx={{ borderRadius: 2 }}>ยกเลิก</Button>
              <Button variant="contained" onClick={saveTuning} disabled={tuneSaving}
                sx={{ borderRadius: 2, bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}>
                บันทึก
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Drawer>
  )
}
