import { useState } from 'react'
import { Box, Typography, Tooltip, IconButton, useTheme } from '@mui/material'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { fmtN } from '../../ui/tokens'
import { getFlag } from '../shared/AlertUiBits'
import { AlertStats } from '../../../types/alert'
import { PanelCard, PanelHeader } from './shared'

// ── Attack Surface Panel ──────────────────────────────────────────────────────
export function AttackSurfacePanel({ stats, onSrcIpClick, onCountryClick, onAgentClick, navigate }: {
  stats?: AlertStats;
  onSrcIpClick: (ip: string) => void;
  onCountryClick: (country: string) => void;
  onAgentClick: (agent: string) => void;
  navigate: (path: string) => void;
}) {
  const [tab, setTab] = useState(0)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const srcips    = stats?.by_srcip?.slice(0, 7) || []
  const countries = stats?.by_country?.slice(0, 7) || []
  const agents    = stats?.by_agent?.slice(0, 7) || []

  const TABS = [
    { label: 'IPs',      icon: '⚠', color: '#EF4444', items: srcips,    onItem: onSrcIpClick,   mono: true,  canInv: true  },
    { label: 'Countries',icon: '🌐', color: '#38BDF8', items: countries, onItem: onCountryClick, mono: false, canInv: false },
    { label: 'Agents',   icon: '🖥',  color: '#22C55E', items: agents,   onItem: onAgentClick,   mono: false, canInv: false },
  ]
  const active = TABS[tab]

  const hasData = srcips.length || countries.length || agents.length
  if (!hasData) return (
    <PanelCard accentColor="#EF4444" isDark={isDark}>
      <PanelHeader accent="#EF4444" title="Top Attack Surface" />
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>ไม่มีข้อมูล</Typography>
      </Box>
    </PanelCard>
  )

  return (
    <PanelCard accentColor="#EF4444" isDark={isDark}>
      <PanelHeader accent="#EF4444" title="Top Attack Surface" />
      <Box sx={{ px: 1.75, pb: 1, flexShrink: 0 }}>
        {/* Tab switcher */}
        <Box sx={{ display: 'flex', gap: 0.5, p: 0.4, borderRadius: '10px', bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
          {TABS.map((t, i) => (
            <Box key={t.label} onClick={() => setTab(i)} sx={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4,
              py: 0.55, borderRadius: '8px', cursor: 'pointer',
              bgcolor: tab === i ? t.color : 'transparent',
              boxShadow: tab === i ? `0 2px 8px ${t.color}40` : 'none',
              transition: 'all 0.18s',
              '&:hover': { bgcolor: tab === i ? t.color : `${t.color}18` },
            }}>
              <Typography sx={{ fontSize: 8.5, lineHeight: 1 }}>{t.icon}</Typography>
              <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: tab === i ? '#fff' : 'text.disabled', letterSpacing: '0.02em', lineHeight: 1 }}>
                {t.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Items */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.75, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        {active.items.map((item, i) => (
          <Box key={item.name} onClick={() => active.onItem(item.name)} sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            cursor: 'pointer', borderRadius: '8px', px: 0.75, py: 0.6,
            border: '1px solid transparent',
            transition: 'all 0.15s',
            '&:hover': {
              bgcolor: `${active.color}0E`,
              borderColor: `${active.color}28`,
              '& .inv-btn': { opacity: 1 },
            },
          }}>
            {/* rank */}
            <Typography sx={{ fontSize: 9, fontWeight: 700, color: 'text.disabled', width: 14, flexShrink: 0, lineHeight: 1, textAlign: 'center' }}>{i + 1}</Typography>
            {/* value */}
            <Typography sx={{
              fontSize: 10.5, fontFamily: active.mono ? '"IBM Plex Mono"' : 'inherit',
              fontWeight: 700, color: active.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, lineHeight: 1.2,
            }}>
              {tab === 1 ? `${getFlag(item.name)} ${item.name}` : item.name}
            </Typography>
            {/* count badge */}
            <Box sx={{ px: 0.6, py: 0.15, borderRadius: '5px', bgcolor: `${active.color}14`, flexShrink: 0 }}>
              <Typography sx={{ fontSize: 9, fontFamily: '"IBM Plex Mono"', fontWeight: 800, color: active.color, lineHeight: 1 }}>
                {fmtN(item.count)}
              </Typography>
            </Box>
            {/* investigate btn */}
            {active.canInv && (
              <Tooltip title="สืบสวน IP นี้">
                <IconButton className="inv-btn" size="small"
                  onClick={e => { e.stopPropagation(); navigate(`/investigate?q=${item.name}`) }}
                  sx={{ opacity: 0, p: 0.3, borderRadius: '6px', transition: 'opacity 0.15s', '&:hover': { bgcolor: `${active.color}20` } }}>
                  <OpenInNewRoundedIcon sx={{ fontSize: 11, color: active.color }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ))}
        {!active.items.length && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>ไม่มีข้อมูล</Typography>
          </Box>
        )}
      </Box>
    </PanelCard>
  )
}
