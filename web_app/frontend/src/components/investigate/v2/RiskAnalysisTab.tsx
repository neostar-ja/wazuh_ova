import { Box, Skeleton, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type { RiskScoreResult } from '../../../types/investigate'

interface Props {
  data?: RiskScoreResult
  loading: boolean
}

const RISK_META = {
  critical: { label: 'วิกฤต',    color: '#EF4444', desc: 'ต้องดำเนินการทันที — มีสัญญาณการโจมตีระดับสูง' },
  high:     { label: 'สูง',      color: '#F17422', desc: 'ต้องตรวจสอบด่วน — พบพฤติกรรมน่าสงสัย' },
  medium:   { label: 'ปานกลาง', color: '#EAB308', desc: 'ควรติดตาม — มีปัจจัยเสี่ยงที่น่าสนใจ' },
  low:      { label: 'ต่ำ',      color: '#22C55E', desc: 'ระดับเสี่ยงต่ำ — ปกติหรือยังไม่มีข้อมูลมากพอ' },
} as const

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function RiskGaugeLarge({ score, level }: { score: number; level: string }) {
  const meta = RISK_META[level as keyof typeof RISK_META] ?? RISK_META.low
  const R = 70; const cx = 90; const cy = 90
  const arc  = Math.PI * R
  const fill = (score / 10) * arc

  return (
    <Box className="flex flex-col items-center">
      <Box sx={{ position: 'relative', width: 180, height: 106 }}>
        <svg width="180" height="106" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="riskGradLarge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#22C55E" />
              <stop offset="33%"  stopColor="#EAB308" />
              <stop offset="66%"  stopColor="#F17422" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
            <filter id="glowLarge">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Track */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none" stroke={meta.color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${fill} ${arc}`}
            filter="url(#glowLarge)"
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
          />
          {/* Tick marks */}
          {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((t, i) => {
            const angle = Math.PI * t
            const x1 = cx - R * Math.cos(angle)
            const y1 = cy - R * Math.sin(angle)
            const isMajor = i % 5 === 0
            const x2 = cx - (R - (isMajor ? 10 : 6)) * Math.cos(angle)
            const y2 = cy - (R - (isMajor ? 10 : 6)) * Math.sin(angle)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isMajor ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'} strokeWidth={isMajor ? 1.5 : 1} />
          })}
          {/* Labels */}
          {([0, 5, 10] as const).map((val) => {
            const t = val / 10
            const angle = Math.PI * t
            const x = cx - (R - 18) * Math.cos(angle)
            const y = cy - (R - 18) * Math.sin(angle)
            return (
              <text key={val} x={x} y={y} textAnchor="middle" dominantBaseline="central"
                fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="monospace">
                {val}
              </text>
            )
          })}
        </svg>
        <Box className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <Typography className="font-mono font-black leading-none" sx={{ fontSize: 32, color: meta.color }}>
            {score.toFixed(1)}
          </Typography>
          <Typography className="font-bold tracking-widest text-[10px]" sx={{ color: meta.color, mt: 0.5 }}>
            {meta.label}
          </Typography>
        </Box>
      </Box>
      <Typography className="text-[11px] text-center mt-2 max-w-xs" sx={{ color: 'rgba(255,255,255,0.45)' }}>
        {meta.desc}
      </Typography>
    </Box>
  )
}

function FactorRow({ factor }: { factor: { key: string; label: string; description: string; score: number; max: number; color: string } }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const pct = (factor.score / factor.max) * 100
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'
  const textSec   = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,40,100,0.75)'

  return (
    <Box className="p-3 rounded-xl transition-all duration-200"
      sx={{
        background: isDark ? `rgba(${hexRgb(factor.color)},0.05)` : `rgba(${hexRgb(factor.color)},0.03)`,
        border: `1px solid rgba(${hexRgb(factor.color)},0.18)`,
        '&:hover': { background: `rgba(${hexRgb(factor.color)},0.09)` },
      }}>
      <Box className="flex items-start justify-between gap-3 mb-2">
        <Box className="flex-1 min-w-0">
          <Typography className="font-semibold text-[12px] mb-0.5" sx={{ color: factor.color }}>
            {factor.label}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: textSec, lineHeight: 1.5 }}>
            {factor.description}
          </Typography>
        </Box>
        <Box className="shrink-0 text-right">
          <Typography className="font-mono font-bold text-[16px]" sx={{ color: factor.color }}>
            {factor.score}
          </Typography>
          <Typography sx={{ fontSize: 9, color: textMuted }}>/ {factor.max} pts</Typography>
        </Box>
      </Box>
      <Box className="h-1.5 rounded-full overflow-hidden"
        sx={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
        <Box
          className="h-full rounded-full transition-all duration-1000 ease-out"
          sx={{ width: `${pct}%`, background: `linear-gradient(90deg,${factor.color}88,${factor.color})` }}
        />
      </Box>
    </Box>
  )
}

export default function RiskAnalysisTab({ data, loading }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'

  if (loading) {
    return (
      <Stack spacing={2} className="animate-fade-in">
        <Box className="flex justify-center py-4">
          <Skeleton variant="rectangular" width={180} height={106} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
        </Box>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={78} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />
        ))}
      </Stack>
    )
  }

  if (!data) {
    return (
      <Box className="flex flex-col items-center justify-center py-16 gap-3">
        <InfoOutlinedIcon sx={{ fontSize: 32, color: 'rgba(123,91,164,0.4)' }} />
        <Typography sx={{ fontSize: 12, color: textMuted }}>
          ค้นหา entity เพื่อดูการวิเคราะห์ความเสี่ยง
        </Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={3} className="animate-fade-in">
      {/* Gauge */}
      <Box className="flex justify-center py-3">
        <RiskGaugeLarge score={data.score} level={data.level} />
      </Box>

      {/* Score breakdown */}
      <Box className="flex items-center justify-between px-1">
        <Typography className="text-[9px] font-bold tracking-widest" sx={{ color: textMuted }}>
          RISK FACTORS ({data.factors.length} ปัจจัย)
        </Typography>
        <Box className="flex items-center gap-2">
          <Typography className="font-mono text-[11px]" sx={{ color: textMuted }}>
            คะแนนรวม:
          </Typography>
          <Typography className="font-mono font-bold text-[13px]" sx={{ color: RISK_META[data.level as keyof typeof RISK_META]?.color }}>
            {data.raw_score} / {data.max_raw}
          </Typography>
        </Box>
      </Box>

      {data.factors.length === 0 ? (
        <Box className="flex flex-col items-center py-8 gap-2">
          <Box className="w-10 h-10 rounded-2xl flex items-center justify-center"
            sx={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Typography sx={{ fontSize: 18 }}>✓</Typography>
          </Box>
          <Typography sx={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>ไม่พบปัจจัยเสี่ยง</Typography>
          <Typography sx={{ fontSize: 11, color: textMuted }}>
            Entity นี้ไม่มี alert, threat intel หรือ posture failure ที่น่ากังวล
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {data.factors.map(factor => (
            <FactorRow key={factor.key} factor={factor} />
          ))}
        </Stack>
      )}

      {/* Formula explanation */}
      <Box className="px-3 py-3 rounded-xl"
        sx={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(123,91,164,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}` }}>
        <Typography className="text-[9px] font-bold tracking-widest mb-2" sx={{ color: textMuted }}>
          วิธีคำนวณ RISK SCORE
        </Typography>
        <Box className="grid grid-cols-2 gap-1.5">
          {[
            ['Alert Severity', 'สูงสุด 40 pts'],
            ['Threat Intel', 'สูงสุด 20 pts'],
            ['MISP Match', 'สูงสุด 10 pts'],
            ['DNS Block', 'สูงสุด 10 pts'],
            ['NAC Posture', 'สูงสุด 10 pts'],
            ['Critical CVE', 'สูงสุด 10 pts'],
          ].map(([label, pts]) => (
            <Box key={label} className="flex items-center justify-between">
              <Typography sx={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(60,40,100,0.55)' }}>{label}</Typography>
              <Typography className="font-mono text-[10px]" sx={{ color: textMuted }}>{pts}</Typography>
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize: 10, color: textMuted, mt: 1.5 }}>
          คะแนน 0–100 หาร 10 = Risk Score 0.0–10.0
        </Typography>
      </Box>

      {data.computed_at && (
        <Typography sx={{ fontSize: 9, color: textMuted, textAlign: 'right' }}>
          คำนวณเมื่อ: {new Date(data.computed_at).toLocaleString('th-TH')}
        </Typography>
      )}
    </Stack>
  )
}
