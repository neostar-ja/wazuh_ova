import { Box, Typography } from '@mui/material'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import { useNavigate } from 'react-router-dom'
import { SEV_COLOR, fmtN } from '../ui/tokens'
import SectionCard from '../ui/SectionCard'
import { countryFlag } from './attackMapUtils'

const RANK_COLORS = [SEV_COLOR.critical, SEV_COLOR.high, SEV_COLOR.medium, '#06B6D4', '#A855F7', '#EC4899', SEV_COLOR.low]

export interface TopSourceIpItem { ip: string; count: number; country?: string }

interface TopSourceIPsPanelProps {
  srcips?: TopSourceIpItem[]
  loading?: boolean
}

function TopSourceIPsPanel({ srcips = [], loading = false }: TopSourceIPsPanelProps) {
  const navigate = useNavigate()
  const max = Math.max(...srcips.map((s) => s.count), 1)

  return (
    <SectionCard
      title="IP โจมตีสูงสุด"
      subtitle="Level 12+ · พร้อมประเทศต้นทาง"
      icon={<RouterRoundedIcon sx={{ fontSize: 16 }} />}
      iconColor={SEV_COLOR.critical}
      size="sm"
      density="compact"
      bodyScroll
      minHeight={260}
      loading={loading}
      empty={!srcips.length ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, gap: 1 }}>
          <RouterRoundedIcon sx={{ fontSize: 26, color: 'text.disabled', opacity: 0.35 }} />
          <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 500 }}>ไม่มีภัยคุกคามที่มี srcip</Typography>
        </Box>
      ) : undefined}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {srcips.slice(0, 12).map((item, i) => {
          const color = i === 0 ? SEV_COLOR.critical : i < 3 ? SEV_COLOR.high : RANK_COLORS[i % RANK_COLORS.length]
          const pct = Math.round((item.count / max) * 100)
          const country = item.country || ''
          const flag = country ? countryFlag(country) : ''
          return (
            <Box
              key={item.ip || i}
              onClick={() => navigate(`/investigate?q=${encodeURIComponent(item.ip)}`)}
              sx={{
                p: '6px 10px', borderRadius: '10px',
                bgcolor: i === 0 ? `${color}12` : `${color}08`,
                border: `1px solid ${color}${i === 0 ? '30' : '18'}`,
                cursor: 'pointer', transition: 'all 0.2s ease',
                '&:hover': { bgcolor: `${color}18`, transform: 'translateX(3px)' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
                  <Box sx={{
                    width: 16, height: 16, borderRadius: '5px', bgcolor: `${color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Typography sx={{ fontSize: 8.5, fontWeight: 900, color }}>{i + 1}</Typography>
                  </Box>
                  <Typography sx={{
                    fontSize: 11, color, fontFamily: '"IBM Plex Mono",monospace',
                    fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.ip}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color, fontFamily: '"IBM Plex Mono",monospace', flexShrink: 0, ml: 1 }}>
                  {fmtN(item.count)}
                </Typography>
              </Box>
              {country && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.6, ml: '24px' }}>
                  {flag && <Typography sx={{ fontSize: 12, lineHeight: 1 }}>{flag}</Typography>}
                  <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{country}</Typography>
                </Box>
              )}
              <Box sx={{ height: 4, borderRadius: 3, bgcolor: `${color}15`, overflow: 'hidden', ml: '24px' }}>
                <Box sx={{
                  height: '100%', width: `${pct}%`, borderRadius: 3,
                  background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
                  transition: 'width 0.8s ease', boxShadow: `0 0 8px ${color}50`,
                }} />
              </Box>
            </Box>
          )
        })}
      </Box>
    </SectionCard>
  )
}

export default TopSourceIPsPanel
