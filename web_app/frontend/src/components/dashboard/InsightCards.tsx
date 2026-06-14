import React from 'react'
import { Box, Typography, useTheme, Skeleton } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded'
import GppBadRoundedIcon from '@mui/icons-material/GppBadRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import { CountByNameItem, RuleItem, AgentItem, IPAddressItem } from '../../types/dashboard'
import { fmtN, BRAND, getBorder } from '../ui/tokens'

interface InsightCardsProps {
  topAgent?: AgentItem
  topIP?: IPAddressItem
  topRule?: RuleItem
  isLoading?: boolean
}

export function InsightCards({ topAgent, topIP, topRule, isLoading = false }: InsightCardsProps) {
  const navigate = useNavigate()
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'

  const cards = [
    {
      id: 'agent',
      title: 'Risk Agent ชั้นนำ',
      titleTh: 'Agent ที่มีความเสี่ยงสูง',
      icon: DevicesRoundedIcon,
      color: BRAND.accent,
      data: topAgent,
      onClick: () => {
        if (topAgent?.name) {
          navigate(`/alerts?agent=${encodeURIComponent(topAgent.name)}`)
        }
      },
    },
    {
      id: 'ip',
      title: 'Top Source IP',
      titleTh: 'IP โจมตีชั้นนำ',
      icon: RouterRoundedIcon,
      color: '#EF4444',
      data: topIP,
      onClick: () => {
        if (topIP?.name) {
          navigate(`/investigate?q=${encodeURIComponent(topIP.name)}`)
        }
      },
    },
    {
      id: 'rule',
      title: 'Top Triggered Rule',
      titleTh: 'Rule ที่เรียกใช้มากที่สุด',
      icon: GppBadRoundedIcon,
      color: BRAND.primary,
      data: topRule,
      onClick: () => {
        if (topRule?.name) {
          navigate(`/alerts?rule_id=${encodeURIComponent(topRule.name)}`)
        }
      },
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card) => {
        const IconComponent = card.icon
        const hasData = !!card.data?.name

        return (
          <Box
            key={card.id}
            onClick={hasData ? card.onClick : undefined}
            sx={{
              borderRadius: '12px',
              p: '16px',
              border: `1px solid ${hasData ? `${card.color}20` : getBorder(isDark)}`,
              bgcolor: isDark
                ? hasData
                  ? `linear-gradient(135deg, ${card.color}0A 0%, rgba(16,12,32,0.6) 100%)`
                  : 'rgba(79,110,247,0.05)'
                : hasData
                  ? `linear-gradient(135deg, ${card.color}06 0%, rgba(255,255,255,0.4) 100%)`
                  : 'rgba(79,110,247,0.02)',
              transition: 'all 0.2s ease',
              cursor: hasData ? 'pointer' : 'default',
              opacity: hasData ? 1 : 0.5,
              '&:hover': hasData
                ? {
                    border: `1px solid ${card.color}40`,
                    bgcolor: isDark
                      ? `linear-gradient(135deg, ${card.color}12 0%, rgba(16,12,32,0.7) 100%)`
                      : `linear-gradient(135deg, ${card.color}08 0%, rgba(255,255,255,0.6) 100%)`,
                    transform: 'translateY(-2px)',
                    boxShadow: isDark
                      ? `0 4px 12px ${card.color}20`
                      : `0 4px 12px ${card.color}15`,
                  }
                : {},
            }}
          >
            {/* Header with icon */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  bgcolor: `${card.color}15`,
                  border: `1px solid ${card.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconComponent sx={{ fontSize: 18, color: card.color }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {card.titleTh}
                </Typography>
              </Box>
            </Box>

            {/* Content */}
            {isLoading ? (
              <>
                <Skeleton height={24} sx={{ mb: 1, borderRadius: '6px' }} />
                <Skeleton height={16} sx={{ borderRadius: '6px' }} />
              </>
            ) : hasData ? (
              <>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: card.color,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 1,
                    fontFamily: card.id === 'ip' ? '"IBM Plex Mono",monospace' : 'inherit',
                  }}
                >
                  {card.data?.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      flex: 1,
                      height: 4,
                      borderRadius: '2px',
                      bgcolor: `${card.color}20`,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: '100%',
                        bgcolor: card.color,
                        boxShadow: `0 0 6px ${card.color}60`,
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: card.color,
                      fontFamily: '"IBM Plex Mono",monospace',
                    }}
                  >
                    {fmtN(card.data?.count || 0)}
                  </Typography>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 2,
                  gap: 1,
                }}
              >
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>ไม่มีข้อมูล</Typography>
              </Box>
            )}
          </Box>
        )
      })}
    </div>
  )
}
