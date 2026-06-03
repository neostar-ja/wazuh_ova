import React, { useMemo, useEffect, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

// Country name → { x, y } percentage coordinates on the map
const COORDS: Record<string, [number, number]> = {
  Afghanistan:      [66, 40], Albania:         [53, 33], Algeria:         [47, 42],
  Argentina:        [28, 76], Australia:       [83, 75], Austria:         [52, 29],
  Bangladesh:       [73, 44], Belgium:         [49, 27], Brazil:          [34, 62],
  Bulgaria:         [55, 31], Canada:          [20, 19], Chile:           [26, 72],
  China:            [76, 35], Colombia:        [25, 55], Croatia:         [53, 31],
  'Czech Republic': [52, 28], Denmark:         [51, 24], Egypt:           [57, 43],
  Finland:          [56, 18], France:          [48, 30], Germany:         [51, 27],
  Greece:           [55, 35], Hungary:         [53, 29], India:           [69, 46],
  Indonesia:        [79, 58], Iran:            [63, 39], Iraq:            [60, 39],
  Ireland:          [44, 25], Israel:          [58, 41], Italy:           [52, 33],
  Japan:            [85, 35], Jordan:          [58, 41], Kazakhstan:      [69, 28],
  Kenya:            [59, 58], 'South Korea':   [82, 35], Kuwait:          [61, 42],
  Libya:            [52, 42], Malaysia:        [77, 55], Mexico:          [18, 42],
  Morocco:          [44, 37], Myanmar:         [76, 46], Netherlands:     [49, 26],
  Nigeria:          [49, 54], Norway:          [51, 20], Pakistan:        [67, 42],
  Peru:             [24, 64], Philippines:     [82, 52], Poland:          [53, 27],
  Portugal:         [43, 34], Romania:         [55, 30], Russia:          [69, 18],
  'Saudi Arabia':   [60, 46], Seychelles:      [62, 62], Singapore:       [77, 56],
  'South Africa':   [54, 78], Spain:           [46, 33], Sweden:          [53, 20],
  Switzerland:      [50, 29], Taiwan:          [81, 41], Thailand:        [76, 50],
  Turkey:           [58, 34], Ukraine:         [57, 27], 'United Arab Emirates': [63, 44],
  'United Kingdom': [46, 24], 'United States': [16, 30], Vietnam:        [78, 48],
}

// Country name → ISO 3166-1 alpha-2 code
const COUNTRY_CODES: Record<string, string> = {
  Afghanistan:'AF', Albania:'AL', Algeria:'DZ', Argentina:'AR', Australia:'AU',
  Austria:'AT', Bangladesh:'BD', Belgium:'BE', Brazil:'BR', Bulgaria:'BG',
  Canada:'CA', Chile:'CL', China:'CN', Colombia:'CO', Croatia:'HR',
  'Czech Republic':'CZ', Denmark:'DK', Egypt:'EG', Finland:'FI', France:'FR',
  Germany:'DE', Greece:'GR', Hungary:'HU', India:'IN', Indonesia:'ID',
  Iran:'IR', Iraq:'IQ', Ireland:'IE', Israel:'IL', Italy:'IT',
  Japan:'JP', Jordan:'JO', Kazakhstan:'KZ', Kenya:'KE', 'South Korea':'KR',
  Kuwait:'KW', Libya:'LY', Malaysia:'MY', Mexico:'MX', Morocco:'MA',
  Myanmar:'MM', Netherlands:'NL', Nigeria:'NG', Norway:'NO', Pakistan:'PK',
  Peru:'PE', Philippines:'PH', Poland:'PL', Portugal:'PT', Romania:'RO',
  Russia:'RU', 'Saudi Arabia':'SA', Seychelles:'SC', Singapore:'SG',
  'South Africa':'ZA', Spain:'ES', Sweden:'SE', Switzerland:'CH', Taiwan:'TW',
  Thailand:'TH', Turkey:'TR', Ukraine:'UA', 'United Arab Emirates':'AE',
  'United Kingdom':'GB', 'United States':'US', Vietnam:'VN',
}

export function countryFlag(name: string): string {
  const code = COUNTRY_CODES[name]
  if (!code || code.length !== 2) return ''
  return [...code.toUpperCase()].map(c =>
    String.fromCodePoint(c.codePointAt(0)! + 127397)
  ).join('')
}

export interface CountryData { name: string; count: number }
interface WorldMapProps { countries?: CountryData[]; loading?: boolean }

// Attack line: source → target (Thailand)
interface AttackLine {
  x1: number; y1: number; x2: number; y2: number
  cx: number; cy: number   // quadratic bezier control point
  color: string; duration: number; delay: number; width: number
}

const TARGET_X = 76, TARGET_Y = 50  // Thailand

const SEV_COLORS = ['#EF4444','#F97316','#EAB308','#06B6D4','#A855F7','#EC4899','#22C55E']

function WorldMap({ countries = [], loading = false }: WorldMapProps) {
  const [tick, setTick] = useState(0)

  // Periodic re-render to animate lines
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  const { markers, lines } = useMemo(() => {
    if (!countries.length) return { markers: [], lines: [] }

    const valid = (countries
      .map(c => {
        const coord = COORDS[c.name]
        if (!coord) return null
        return { name: c.name, count: c.count, x: coord[0], y: coord[1] }
      })
      .filter(Boolean) as { name: string; count: number; x: number; y: number }[])
      .sort((a, b) => b.count - a.count)

    if (!valid.length) return { markers: [], lines: [] }

    const maxCount = Math.max(...valid.map(v => v.count), 1)

    const markers = valid.map((v, i) => ({
      ...v,
      color: i === 0 ? '#EF4444' : i < 3 ? '#F97316' : SEV_COLORS[i % SEV_COLORS.length],
      r: Math.max(6, Math.min(22, 6 + (v.count / maxCount) * 16)),
      intensity: v.count / maxCount,
    }))

    const lines: AttackLine[] = valid.slice(0, 8).map((v, i) => {
      // Quadratic bezier control point: arc up toward equator
      const midX = (v.x + TARGET_X) / 2
      const midY = Math.min(v.y, TARGET_Y) - 20 - Math.abs(v.x - TARGET_X) * 0.08
      return {
        x1: v.x, y1: v.y, x2: TARGET_X, y2: TARGET_Y,
        cx: midX, cy: midY,
        color: i === 0 ? '#EF4444' : i < 3 ? '#F97316' : SEV_COLORS[i % SEV_COLORS.length],
        duration: 1.8 + i * 0.3,
        delay: i * 0.4,
        width: Math.max(1, Math.min(3, 1 + (valid[i].count / maxCount) * 2)),
      }
    })

    return { markers, lines }
  }, [countries])

  if (loading) return (
    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', minHeight:260 }}>
      <CircularProgress size={32} sx={{ color:'rgba(239,68,68,0.6)' }} />
    </Box>
  )

  const hasData = markers.length > 0

  return (
    <Box sx={{
      position:'relative', overflow:'hidden', bgcolor:'#060d1a',
      borderRadius:2, height:'100%', minHeight:260,
      border:'1px solid rgba(239,68,68,0.08)',
    }}>
      {/* CSS animations */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.8; }
          100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }
        @keyframes line-dash {
          0%   { stroke-dashoffset: 200; opacity: 0; }
          10%  { opacity: 0.9; }
          80%  { opacity: 0.7; }
          100% { stroke-dashoffset: 0;   opacity: 0; }
        }
        @keyframes target-pulse {
          0%,100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          50%     { opacity: 0.7; transform: translate(-50%,-50%) scale(1.15); }
        }
        @keyframes ripple {
          0%   { transform: translate(-50%,-50%) scale(0.8); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(3);   opacity: 0; }
        }
      `}</style>

      {/* Background: faint grid + glow blobs */}
      <Box sx={{
        position:'absolute', inset:0, opacity:0.5,
        backgroundImage:`
          radial-gradient(circle at 76% 50%, rgba(34,197,94,0.08) 0%, transparent 18%),
          radial-gradient(circle at 18% 30%, rgba(239,68,68,0.06) 0%, transparent 20%),
          radial-gradient(circle at 50% 30%, rgba(56,189,248,0.04) 0%, transparent 30%),
          linear-gradient(rgba(96,165,250,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(96,165,250,0.04) 1px, transparent 1px)
        `,
        backgroundSize:'auto,auto,auto,36px 36px,36px 36px',
      }} />

      {/* Equator line */}
      <Box sx={{
        position:'absolute', left:0, right:0, top:'50%',
        height:'1px', bgcolor:'rgba(96,165,250,0.06)',
        transform:'translateY(-50%)',
      }} />

      {hasData ? (
        <>
          {/* SVG layer: attack lines */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }}
          >
            <defs>
              {lines.map((line, i) => (
                <linearGradient key={i} id={`lg${i}`} gradientUnits="userSpaceOnUse"
                  x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}>
                  <stop offset="0%"   stopColor={line.color} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={line.color} stopOpacity="0.3" />
                </linearGradient>
              ))}
            </defs>
            {lines.map((line, i) => (
              <path
                key={`${i}-${tick}`}
                d={`M ${line.x1} ${line.y1} Q ${line.cx} ${line.cy} ${line.x2} ${line.y2}`}
                fill="none"
                stroke={`url(#lg${i})`}
                strokeWidth={line.width}
                strokeLinecap="round"
                strokeDasharray="200"
                strokeDashoffset="200"
                style={{
                  animation: `line-dash ${line.duration}s ease-in-out ${line.delay}s infinite`,
                  filter: `drop-shadow(0 0 3px ${line.color}80)`,
                }}
              />
            ))}
          </svg>

          {/* Markers: attack sources */}
          {markers.map((m, i) => (
            <Box key={m.name} sx={{
              position:'absolute',
              left: `${m.x}%`, top: `${m.y}%`,
            }}>
              {/* Outer ripple ring */}
              <Box sx={{
                position:'absolute', width:`${m.r * 2.8}px`, height:`${m.r * 2.8}px`,
                borderRadius:'50%', border:`1.5px solid ${m.color}`,
                left:'50%', top:'50%',
                animation:`ripple ${2 + i * 0.3}s ease-out ${i * 0.5}s infinite`,
              }} />
              {/* Middle pulse ring */}
              <Box sx={{
                position:'absolute', width:`${m.r * 2}px`, height:`${m.r * 2}px`,
                borderRadius:'50%', bgcolor:`${m.color}28`,
                border:`1px solid ${m.color}60`,
                left:'50%', top:'50%',
                animation:`pulse-ring ${1.5 + i * 0.25}s ease-out ${i * 0.4}s infinite`,
              }} />
              {/* Core dot */}
              <Box
                title={`${m.name}: ${m.count.toLocaleString()} threats`}
                sx={{
                  position:'absolute',
                  width:`${m.r}px`, height:`${m.r}px`,
                  borderRadius:'50%', bgcolor:m.color,
                  left:'50%', top:'50%',
                  transform:'translate(-50%,-50%)',
                  boxShadow:`0 0 ${m.r * 1.5}px ${m.color}`,
                  animation:`pulse-dot ${1.2 + i * 0.2}s ease-in-out ${i * 0.3}s infinite`,
                  cursor:'default', zIndex:10,
                }}
              />
            </Box>
          ))}

          {/* Thailand: protected target */}
          <Box sx={{ position:'absolute', left:`${TARGET_X}%`, top:`${TARGET_Y}%` }}>
            {/* Ripple rings */}
            {[0,1,2].map(i => (
              <Box key={i} sx={{
                position:'absolute', width:'32px', height:'32px', borderRadius:'50%',
                border:'1.5px solid rgba(34,197,94,0.6)',
                left:'50%', top:'50%',
                animation:`ripple 2.5s ease-out ${i * 0.8}s infinite`,
              }} />
            ))}
            {/* Core */}
            <Box sx={{
              position:'absolute', width:'12px', height:'12px', borderRadius:'50%',
              bgcolor:'#22C55E', left:'50%', top:'50%',
              boxShadow:'0 0 16px #22C55E, 0 0 30px rgba(34,197,94,0.4)',
              animation:'target-pulse 2s ease-in-out infinite',
            }} />
            {/* Label */}
            <Box sx={{
              position:'absolute', left:'50%', top:'-28px',
              transform:'translateX(-50%)', whiteSpace:'nowrap',
              bgcolor:'rgba(6,13,26,0.85)', border:'1px solid rgba(34,197,94,0.3)',
              borderRadius:'6px', px:0.8, py:0.3,
            }}>
              <Typography sx={{ fontSize:9, color:'#22C55E', fontWeight:700, letterSpacing:'0.06em' }}>
                🇹🇭 WUH-TARGET
              </Typography>
            </Box>
          </Box>

          {/* Legend */}
          <Box sx={{
            position:'absolute', left:10, bottom:10, zIndex:20,
            bgcolor:'rgba(6,13,26,0.85)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:'10px', p:'8px 12px',
          }}>
            <Typography sx={{ fontSize:9.5, color:'rgba(255,255,255,0.4)', mb:0.75, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>
              Attack Sources
            </Typography>
            {markers.slice(0, 5).map(m => (
              <Box key={m.name} sx={{ display:'flex', alignItems:'center', gap:1, mb:0.5 }}>
                <Box sx={{ width:8, height:8, borderRadius:'50%', bgcolor:m.color, flexShrink:0, boxShadow:`0 0 6px ${m.color}` }} />
                <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.75)', minWidth:80 }}>
                  {countryFlag(m.name)} {m.name}
                </Typography>
                <Typography sx={{ fontSize:10, color:m.color, fontFamily:'"IBM Plex Mono",monospace', fontWeight:700 }}>
                  {m.count.toLocaleString()}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Top-right badge */}
          <Box sx={{
            position:'absolute', right:10, top:10,
            bgcolor:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)',
            borderRadius:'8px', px:1.25, py:0.5,
          }}>
            <Typography sx={{ fontSize:10, color:'#EF4444', fontWeight:700 }}>
              ⚡ {countries.length} ประเทศ
            </Typography>
          </Box>
        </>
      ) : (
        <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          height:'100%', minHeight:260, gap:1.5 }}>
          <Typography sx={{ fontSize:28, lineHeight:1 }}>🌍</Typography>
          <Typography sx={{ fontSize:12, color:'rgba(255,255,255,0.3)', fontWeight:500 }}>
            ไม่มีข้อมูลภัยคุกคาม
          </Typography>
          <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.2)' }}>
            ข้อมูลมาจาก Level 12+ เท่านั้น
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default WorldMap
