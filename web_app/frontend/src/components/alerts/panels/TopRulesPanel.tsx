import { useMemo } from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import { BRAND, SEV_COLOR, CATEGORY_COLOR, fmtN } from '../../ui/tokens'
import { AlertStats } from '../../../types/alert'
import { PanelCard, PanelHeader } from './shared'

const RULE_DESC: Record<string, string> = {
  '101053': 'Mikrotik: TCP connection tracked',
  '100052': 'Huawei USG: Traffic permitted',
  '110010': 'FortiGate: Traffic logged',
  '120001': 'PCI DSS 1.3: Unauthorized access blocked',
  '110022': 'FortiGate: App-ctrl elevated risk',
  '110011': 'FortiGate: Session closed',
  '110021': 'FortiGate: DNS lookup',
  '100401': 'Infoblox DNS: HTTPS query',
  '100400': 'Infoblox DNS: A record query',
  '101052': 'Mikrotik: UDP connection',
  '100053': 'Huawei USG: Traffic denied',
  '110016': 'FortiGate: App-ctrl application',
  '120054': 'Compliance: System event',
  '110023': 'FortiGate: App-ctrl medium risk',
  '110018': 'FortiGate: URL blocked',
  '120003': 'PCI DSS 8.3: Auth failure',
  '120061': 'NIST: DHCP pool exhausted',
  '60602':  'Windows: Application error',
  '110039': 'FortiGate: Policy event',
  '100303': 'Auth: Multiple failures',
}

// ── Top Rules Panel ───────────────────────────────────────────────────────────
export function TopRulesPanel({ stats, onRuleClick }: { stats?: AlertStats; onRuleClick: (id: string) => void }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const rules = useMemo(() => {
    const raw = stats?.by_rule || []
    const maxCount = Math.max(...raw.map((r: any) => r.count || 0), 1)
    return raw.slice(0, 7).map((r: any, i: number) => ({
      id: r.name,
      desc: RULE_DESC[r.name] || `Rule ${r.name}`,
      count: r.count || 0,
      pct: Math.round(((r.count || 0) / maxCount) * 100),
      rank: i + 1,
    }))
  }, [stats])

  const RANK_COLOR = [SEV_COLOR.critical, SEV_COLOR.high, SEV_COLOR.medium, SEV_COLOR.low, CATEGORY_COLOR.mikrotik, BRAND.primaryLight, CATEGORY_COLOR.linuxSystem]

  if (!rules.length) return (
    <PanelCard accentColor={BRAND.accent} isDark={isDark}>
      <PanelHeader accent={BRAND.accent} title="Top Rules ที่ต้องตรวจสอบ" />
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>ไม่มีข้อมูล</Typography>
      </Box>
    </PanelCard>
  )

  return (
    <PanelCard accentColor={BRAND.accent} isDark={isDark}>
      <PanelHeader accent={BRAND.accent} title="Top Rules ที่ต้องตรวจสอบ" />
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.75, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.65 }}>
        {rules.map((r, i) => (
          <Box key={r.id} onClick={() => onRuleClick(r.id)} sx={{
            cursor: 'pointer', borderRadius: '10px', p: '8px 10px',
            border: '1px solid transparent',
            transition: 'all 0.15s',
            '&:hover': { bgcolor: `${BRAND.accent}0D`, borderColor: `${BRAND.accent}30` },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
              {/* rank badge */}
              <Box sx={{ width: 18, height: 18, borderRadius: '5px', bgcolor: `${RANK_COLOR[i]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Typography sx={{ fontSize: 8.5, fontWeight: 900, color: RANK_COLOR[i], lineHeight: 1 }}>{r.rank}</Typography>
              </Box>
              {/* rule id */}
              <Box sx={{ px: 0.6, py: 0.15, borderRadius: '4px', bgcolor: `${BRAND.primary}14`, flexShrink: 0 }}>
                <Typography sx={{ fontSize: 8.5, fontWeight: 800, color: BRAND.primaryLight, fontFamily: '"IBM Plex Mono"', lineHeight: 1 }}>
                  #{r.id}
                </Typography>
              </Box>
              {/* description */}
              <Typography sx={{ fontSize: 10, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, flex: 1, lineHeight: 1.2 }}>
                {r.desc}
              </Typography>
              {/* count */}
              <Typography sx={{ fontSize: 10, color: 'text.primary', fontFamily: '"IBM Plex Mono"', flexShrink: 0, fontWeight: 800, ml: 0.5 }}>
                {fmtN(r.count)}
              </Typography>
            </Box>
            {/* progress bar */}
            <Box sx={{ height: 3.5, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden', ml: '26px' }}>
              <Box sx={{
                height: '100%', borderRadius: 2,
                width: `${r.pct}%`,
                background: `linear-gradient(90deg, ${BRAND.accent} 0%, ${BRAND.accentDark}CC 100%)`,
                transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </Box>
          </Box>
        ))}
      </Box>
    </PanelCard>
  )
}
