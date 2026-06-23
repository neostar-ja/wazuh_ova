import { Box, Typography, useTheme } from '@mui/material'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { sevColor, sevLabelShort, BRAND } from '../ui/tokens'
import SectionCard from '../ui/SectionCard'
import { countryFlag } from './attackMapUtils'

export interface LiveFeedItem {
  timestamp: string
  rule_id: string | number
  level: number
  description: string
  srcip?: string
  country?: string
  agent?: string
}

interface LiveAttackFeedProps {
  feed?: LiveFeedItem[]
  loading?: boolean
  maxItems?: number
}

function LiveAttackFeed({ feed = [], loading = false, maxItems = 30 }: LiveAttackFeedProps) {
  const navigate = useNavigate()
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const items = feed.slice(0, maxItems)

  return (
    <SectionCard
      title="Live Attack Feed"
      subtitle="เหตุการณ์ความเสี่ยงสูงล่าสุด (Level 12+)"
      icon={<BoltRoundedIcon sx={{ fontSize: 16 }} />}
      iconColor={sevColor(15)}
      size="sm"
      density="compact"
      bodyScroll
      minHeight={320}
      loading={loading}
      empty={!items.length ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5 }}>
          <Box sx={{
            width: 52, height: 52, borderRadius: '12px', bgcolor: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="#22C55E" />
            </svg>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>ระบบปลอดภัย</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>ไม่มีการแจ้งเตือนระดับสูงในช่วงนี้</Typography>
          </Box>
        </Box>
      ) : undefined}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((item, idx) => {
          const color = sevColor(item.level)
          const label = sevLabelShort(item.level)
          const flag = item.country ? countryFlag(item.country) : ''
          return (
            <Box
              key={`${idx}-${item.timestamp}`}
              onClick={() => navigate('/alerts')}
              sx={{
                display: 'flex', gap: 1.5, p: 1.25, borderRadius: '10px',
                border: `1px solid ${isDark ? 'rgba(79,110,247,0.15)' : 'rgba(79,110,247,0.1)'}`,
                bgcolor: isDark ? `${color}08` : `${color}05`,
                transition: 'all 0.2s ease', cursor: 'pointer',
                '&:hover': { bgcolor: `${color}14`, border: `1px solid ${color}30` },
              }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 8px ${color}80`, flexShrink: 0, mt: 0.6 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono",monospace', color: 'text.disabled', whiteSpace: 'nowrap' }}>
                    {item.timestamp ? format(new Date(item.timestamp), 'HH:mm:ss') : '—'}
                  </Typography>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 0.75, py: 0.25, borderRadius: '5px', bgcolor: `${color}18`, border: `1px solid ${color}35` }}>
                    <Typography sx={{ fontSize: 9, fontWeight: 800, color, fontFamily: '"IBM Plex Mono",monospace' }}>
                      {item.level} {label}
                    </Typography>
                  </Box>
                  {item.country && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      <Typography sx={{ fontSize: 12, lineHeight: 1 }}>{flag}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{item.country}</Typography>
                    </Box>
                  )}
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.primary', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.5 }}>
                  {item.description || 'Unknown'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {item.srcip && (
                    <Box
                      onClick={(e) => { e.stopPropagation(); navigate(`/investigate?q=${encodeURIComponent(item.srcip!)}`) }}
                      sx={{
                        px: 0.75, py: 0.25, borderRadius: '5px', cursor: 'pointer',
                        bgcolor: isDark ? 'rgba(79,110,247,0.1)' : 'rgba(79,110,247,0.05)',
                        '&:hover': { bgcolor: isDark ? 'rgba(79,110,247,0.2)' : 'rgba(79,110,247,0.1)' },
                      }}
                    >
                      <Typography sx={{ fontSize: 10, fontFamily: '"IBM Plex Mono",monospace', color: isDark ? BRAND.primaryLight : BRAND.primary }}>
                        {item.srcip}
                      </Typography>
                    </Box>
                  )}
                  {item.agent && (
                    <Box sx={{ px: 0.75, py: 0.25, borderRadius: '5px', bgcolor: isDark ? 'rgba(79,110,247,0.1)' : 'rgba(79,110,247,0.05)' }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 600 }}>{item.agent}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )
        })}
      </Box>
    </SectionCard>
  )
}

export default LiveAttackFeed
