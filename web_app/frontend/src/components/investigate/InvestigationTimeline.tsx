import { useMemo, useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded'
import UnfoldLessRoundedIcon from '@mui/icons-material/UnfoldLessRounded'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TimelineEvent } from '../../types'
import { CHART_TIP_STYLE } from '../ui/tokens'
import EmptyState from '../ui/EmptyState'
import SectionCard from '../ui/SectionCard'
import { SeverityChip, formatCompactTimestamp, formatTimestamp, severityColor } from './utils'

interface InvestigationTimelineProps {
  timeline: TimelineEvent[]
  onSelectEvent: (event: TimelineEvent) => void
}

export function InvestigationTimeline({ timeline, onSelectEvent }: InvestigationTimelineProps) {
  const [compact, setCompact] = useState(true)

  const chartData = useMemo(() => {
    const buckets = new Map<string, { label: string; total: number; critical: number; high: number; medium: number; low: number }>()

    timeline.forEach((event) => {
      const bucket = event.timestamp.slice(0, 13)
      const current = buckets.get(bucket) ?? {
        label: bucket.replace('T', ' ') + ':00',
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      }
      current.total += 1
      current[event.severity === 'info' ? 'low' : event.severity] += 1
      buckets.set(bucket, current)
    })

    return Array.from(buckets.values()).slice(-18)
  }, [timeline])

  const visibleEvents = compact ? timeline.slice(-18).reverse() : [...timeline].reverse()
  const peak = chartData.reduce((top, current) => (current.total > top.total ? current : top), { label: '—', total: 0, critical: 0, high: 0, medium: 0, low: 0 })

  return (
    <SectionCard
      title="Timeline"
      subtitle="เรียงเหตุการณ์ตามเวลา พร้อม severity context และ raw evidence drill-down"
      icon={<TimelineRoundedIcon />}
      accent="#38BDF8"
      action={
        <Button
          size="small"
          variant="text"
          startIcon={compact ? <UnfoldMoreRoundedIcon /> : <UnfoldLessRoundedIcon />}
          onClick={() => setCompact((current) => !current)}
        >
          {compact ? 'Expanded' : 'Compact'}
        </Button>
      }
      empty={<EmptyState title="ไม่พบ timeline event" description="ยังไม่มีเหตุการณ์ที่เชื่อมโยงกับ entity นี้ในช่วงเวลาที่เลือก" />}
    >
      {timeline.length === 0 ? null : (
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Box sx={{ flex: 1, height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="timelineTotal" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#7B5BA4" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#7B5BA4" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,91,164,0.12)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={28} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip contentStyle={CHART_TIP_STYLE} />
                  <Area type="monotone" dataKey="total" stroke="#7B5BA4" fill="url(#timelineTotal)" strokeWidth={2.6} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
            <Box
              sx={{
                width: { xs: '100%', md: 220 },
                p: 2,
                borderRadius: '18px',
                bgcolor: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.16)',
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'text.disabled' }}>
                Peak Activity
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 26, fontWeight: 900, fontFamily: '"IBM Plex Mono", monospace' }}>
                {peak.total}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{peak.label}</Typography>
              <Typography sx={{ mt: 1.5, fontSize: 12, color: 'text.secondary' }}>
                ใช้ดูช่วงเวลาที่ต้องย้อน raw evidence หรือ correlate กับ alert burst เพิ่มเติม
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={1.4}>
            {visibleEvents.map((event, index) => {
              const color = severityColor(event.severity)
              const isLast = index === visibleEvents.length - 1
              return (
                <Box
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  sx={{
                    position: 'relative',
                    pl: 4,
                    pr: 1.5,
                    py: 1.35,
                    borderRadius: '16px',
                    bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'rgba(123,91,164,0.09)',
                      borderColor: 'rgba(123,91,164,0.2)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 16,
                      top: 12,
                      bottom: isLast ? 'auto' : -20,
                      width: 2,
                      height: isLast ? 14 : 'calc(100% + 20px)',
                      bgcolor: `${color}55`,
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 10,
                      top: 14,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      bgcolor: color,
                      boxShadow: `0 0 0 4px ${color}20`,
                    }}
                  />

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <SeverityChip severity={event.severity} />
                        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{event.title}</Typography>
                      </Stack>
                      <Typography sx={{ mt: 0.7, fontSize: 12.5, color: 'text.secondary' }}>{event.description}</Typography>
                      <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                        {event.ruleId && <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>Rule {event.ruleId}</Typography>}
                        {event.agentName && <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>{event.agentName}</Typography>}
                        {event.sourceIp && <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>SRC {event.sourceIp}</Typography>}
                        {event.destinationIp && <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>DST {event.destinationIp}</Typography>}
                      </Stack>
                    </Box>
                    <Box sx={{ flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: { md: 'right' } }}>
                        {formatTimestamp(event.timestamp)}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: { md: 'right' } }}>
                        {formatCompactTimestamp(event.timestamp)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        </Stack>
      )}
    </SectionCard>
  )
}

export default InvestigationTimeline
