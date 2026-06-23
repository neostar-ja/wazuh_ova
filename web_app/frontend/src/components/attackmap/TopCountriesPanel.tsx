import { Box, Typography } from '@mui/material'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import { useNavigate } from 'react-router-dom'
import { SEV_COLOR, fmtN } from '../ui/tokens'
import SectionCard from '../ui/SectionCard'
import { countryFlag } from './attackMapUtils'

const RANK_COLORS = [SEV_COLOR.critical, SEV_COLOR.high, SEV_COLOR.medium, '#06B6D4', '#A855F7', '#EC4899', SEV_COLOR.low]

export interface TopCountryItem { name: string; count: number }

interface TopCountriesPanelProps {
  countries?: TopCountryItem[]
  loading?: boolean
}

function TopCountriesPanel({ countries = [], loading = false }: TopCountriesPanelProps) {
  const navigate = useNavigate()
  const max = Math.max(...countries.map((c) => c.count), 1)
  const total = countries.reduce((s, c) => s + c.count, 0)

  return (
    <SectionCard
      title="ประเทศต้นทางโจมตี"
      subtitle="เรียงตามจำนวนเหตุการณ์ Level 12+"
      icon={<PublicRoundedIcon sx={{ fontSize: 16 }} />}
      iconColor={SEV_COLOR.high}
      size="sm"
      density="compact"
      bodyScroll
      minHeight={260}
      loading={loading}
      empty={!countries.length ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, gap: 1 }}>
          <PublicRoundedIcon sx={{ fontSize: 26, color: 'text.disabled', opacity: 0.35 }} />
          <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 500 }}>ไม่มีข้อมูล GeoIP</Typography>
        </Box>
      ) : undefined}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {countries.slice(0, 12).map((c, i) => {
          const color = i === 0 ? SEV_COLOR.critical : i < 3 ? SEV_COLOR.high : RANK_COLORS[i % RANK_COLORS.length]
          const pct = Math.round((c.count / max) * 100)
          const sharePct = total > 0 ? ((c.count / total) * 100).toFixed(1) : '0'
          return (
            <Box
              key={c.name}
              onClick={() => navigate(`/alerts?country=${encodeURIComponent(c.name)}`)}
              sx={{
                p: '7px 10px', borderRadius: '10px',
                bgcolor: i === 0 ? `${color}12` : `${color}07`,
                border: `1px solid ${color}${i === 0 ? '30' : '18'}`,
                cursor: 'pointer', transition: 'all 0.2s',
                '&:hover': { bgcolor: `${color}18`, border: `1px solid ${color}35` },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                  <Box sx={{
                    width: 16, height: 16, borderRadius: '5px', bgcolor: `${color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Typography sx={{ fontSize: 8.5, fontWeight: 900, color }}>{i + 1}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{countryFlag(c.name)}</Typography>
                  <Typography sx={{
                    fontSize: 11.5, color: 'text.secondary', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: i === 0 ? 700 : 500,
                  }}>
                    {c.name || 'Unknown'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{sharePct}%</Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, color, fontFamily: '"IBM Plex Mono",monospace' }}>
                    {fmtN(c.count)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ height: 5, borderRadius: 3, bgcolor: `${color}15`, overflow: 'hidden' }}>
                <Box sx={{
                  height: '100%', width: `${pct}%`, borderRadius: 3,
                  background: `linear-gradient(90deg, ${color} 0%, ${color}90 100%)`,
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

export default TopCountriesPanel
