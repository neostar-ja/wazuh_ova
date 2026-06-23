import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Box, Typography, CircularProgress, useTheme } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import worldTopo from 'world-atlas/countries-110m.json'
import { SEV_COLOR, getBorder, getChartTipStyle, fmtN } from '../ui/tokens'
import { countryFlag, countryCentroidFallback, TARGET_LATLON, TARGET_LABEL } from './attackMapUtils'

export interface AttackMapCountry {
  name: string
  count: number
  lat: number | null
  lon: number | null
}

interface AttackWorldMapProps {
  countries?: AttackMapCountry[]
  loading?: boolean
}

const SEV_COLORS = [SEV_COLOR.critical, SEV_COLOR.high, SEV_COLOR.medium, '#06B6D4', '#A855F7', '#EC4899', SEV_COLOR.low]

const WORLD_TOPOLOGY = worldTopo as unknown as Topology
const LAND = feature(WORLD_TOPOLOGY, WORLD_TOPOLOGY.objects.countries as any) as unknown as GeoJSON.FeatureCollection<GeoJSON.GeometryObject>
const GRATICULE = geoGraticule10()

const MIN_SCALE = 1
const MAX_SCALE = 8

interface TooltipState { x: number; y: number; title: string; lines: string[] }

function AttackWorldMap({ countries = [], loading = false }: AttackWorldMapProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const navigate = useNavigate()

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ active: false, moved: false, lastX: 0, lastY: 0 })

  const measure = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const width = Math.max(0, Math.floor(rect.width))
    const height = Math.max(0, Math.floor(rect.height))
    if (!width || !height) return

    setSize((prev) => {
      if (prev.width === width && prev.height === height) return prev
      return { width, height }
    })
  }, [])

  useLayoutEffect(() => {
    measure()
    const raf = requestAnimationFrame(() => measure())
    return () => cancelAnimationFrame(raf)
  }, [measure, countries.length, loading])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ width: Math.max(0, Math.floor(width)), height: Math.max(0, Math.floor(height)) })
      }
    })
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [measure])

  const projection = useMemo(() => {
    if (!size.width || !size.height) return null
    return geoNaturalEarth1().fitSize([size.width, size.height], LAND as any)
  }, [size.width, size.height])

  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection])

  const countryPaths = useMemo(() => {
    if (!pathGen) return []
    return (LAND.features as any[])
      .map((f, i) => ({ id: f.id ?? i, d: pathGen(f) || '' }))
      .filter((c) => c.d)
  }, [pathGen])

  const sphereD = useMemo(() => (pathGen ? pathGen({ type: 'Sphere' } as any) : null), [pathGen])
  const graticuleD = useMemo(() => (pathGen ? pathGen(GRATICULE as any) : null), [pathGen])

  const { markers, arcs, targetXY } = useMemo(() => {
    if (!projection) return { markers: [] as any[], arcs: [] as any[], targetXY: null as [number, number] | null }

    const targetXY = projection([TARGET_LATLON[1], TARGET_LATLON[0]]) as [number, number] | null

    const valid = countries
      .map((c) => {
        let lat = c.lat, lon = c.lon
        if (lat == null || lon == null) {
          const fb = countryCentroidFallback(c.name)
          if (!fb) return null
          lat = fb[0]; lon = fb[1]
        }
        const xy = projection([lon as number, lat as number])
        if (!xy) return null
        return { name: c.name, count: c.count, x: xy[0], y: xy[1] }
      })
      .filter((v): v is { name: string; count: number; x: number; y: number } => v !== null)
      .sort((a, b) => b.count - a.count)

    if (!valid.length) return { markers: [], arcs: [], targetXY }

    const maxCount = Math.max(...valid.map((v) => v.count), 1)
    const markers = valid.map((v, i) => ({
      ...v,
      color: i === 0 ? SEV_COLOR.critical : i < 3 ? SEV_COLOR.high : SEV_COLORS[i % SEV_COLORS.length],
      r: Math.max(6, Math.min(22, 6 + (v.count / maxCount) * 16)),
    }))

    const arcs = targetXY ? valid.slice(0, 10).map((v, i) => {
      const dx = targetXY[0] - v.x, dy = targetXY[1] - v.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const mx = (v.x + targetXY[0]) / 2
      const my = (v.y + targetXY[1]) / 2
      const bow = Math.min(dist * 0.3, 180)
      return {
        id: v.name,
        x1: v.x, y1: v.y, x2: targetXY[0], y2: targetXY[1],
        cx: mx, cy: my - bow,
        length: dist * 1.18,
        color: i === 0 ? SEV_COLOR.critical : i < 3 ? SEV_COLOR.high : SEV_COLORS[i % SEV_COLORS.length],
        width: Math.max(1, Math.min(2.5, 1 + (v.count / maxCount) * 1.5)),
        duration: 2.4 + i * 0.35,
        delay: i * 0.45,
      }
    }) : []

    return { markers, arcs, targetXY }
  }, [countries, projection])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY > 0 ? 0.88 : 1 / 0.88
    setView((prev) => {
      const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.k * factor))
      if (k === prev.k) return prev
      if (k === MIN_SCALE) return { x: 0, y: 0, k }
      const x = mx - (mx - prev.x) * (k / prev.k)
      const y = my - (my - prev.y) * (k / prev.k)
      return { x, y, k }
    })
  }, [])

  const zoomBy = useCallback((factor: number) => {
    setView((prev) => {
      const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.k * factor))
      if (k === prev.k) return prev
      if (k === MIN_SCALE) return { x: 0, y: 0, k }
      const cx = size.width / 2, cy = size.height / 2
      const x = cx - (cx - prev.x) * (k / prev.k)
      const y = cy - (cy - prev.y) * (k / prev.k)
      return { x, y, k }
    })
  }, [size.width, size.height])

  const resetView = useCallback(() => setView({ x: 0, y: 0, k: 1 }), [])

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    dragRef.current = { active: true, moved: false, lastX: e.clientX, lastY: e.clientY }
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.lastX
    const dy = e.clientY - dragRef.current.lastY
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragRef.current.moved = true
    dragRef.current.lastX = e.clientX
    dragRef.current.lastY = e.clientY
    setView((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }, [])

  const endDrag = useCallback(() => {
    dragRef.current.active = false
    setIsDragging(false)
  }, [])

  const oceanColor = isDark ? '#060d1a' : '#0B1330'
  const landFill = 'rgba(79,110,247,0.14)'
  const landStroke = 'rgba(124,147,255,0.30)'
  const graticuleColor = 'rgba(124,147,255,0.07)'

  const totalAttacks = countries.reduce((s, c) => s + c.count, 0)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 480 }}>
        <CircularProgress size={36} sx={{ color: 'rgba(239,68,68,0.6)' }} />
      </Box>
    )
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative', overflow: 'hidden',
        bgcolor: oceanColor, borderRadius: 2,
        height: '100%', minHeight: 480,
        border: `1px solid ${getBorder(isDark, 'default')}`,
        boxShadow: isDark ? 'none' : '0 8px 24px rgba(15,23,42,0.12)',
      }}
    >
      <style>{`
        @keyframes pulse-ring  { 0% { transform: scale(1);   opacity: 0.8; } 100% { transform: scale(2.8); opacity: 0; } }
        @keyframes pulse-dot   { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes ripple      { 0% { transform: scale(0.8); opacity: 0.6; } 100% { transform: scale(3); opacity: 0; } }
        @keyframes target-pulse{ 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.15); } }
        @keyframes line-dash   { 0% { stroke-dashoffset: 100; opacity: 0; } 10% { opacity: 0.95; } 80% { opacity: 0.75; } 100% { stroke-dashoffset: 0; opacity: 0; } }
      `}</style>

      {/* Ambience glow */}
      <Box sx={{
        position: 'absolute', inset: 0, opacity: 0.7, pointerEvents: 'none',
        backgroundImage: `
          radial-gradient(circle at 50% 48%, rgba(34,211,238,0.05) 0%, transparent 45%),
          radial-gradient(circle at 78% 38%, rgba(34,197,94,0.08) 0%, transparent 22%),
          radial-gradient(circle at 20% 65%, rgba(239,68,68,0.06) 0%, transparent 28%)
        `,
      }} />

      {size.width > 0 && size.height > 0 ? (
        <svg
          ref={svgRef}
          width={size.width} height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={{ display: 'block', cursor: isDragging ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onDoubleClick={resetView}
        >
          <defs>
            {arcs.map((a, i) => (
              <linearGradient key={a.id} id={`attack-arc-${i}`} gradientUnits="userSpaceOnUse"
                x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}>
                <stop offset="0%" stopColor={a.color} stopOpacity="0.95" />
                <stop offset="100%" stopColor={a.color} stopOpacity="0.25" />
              </linearGradient>
            ))}
          </defs>

          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {sphereD && (
              <path d={sphereD} fill={oceanColor} stroke={getBorder(isDark, 'subtle')} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            )}
            {graticuleD && (
              <path d={graticuleD} fill="none" stroke={graticuleColor} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            )}
            {countryPaths.map((c) => (
              <path key={c.id} d={c.d} fill={landFill} stroke={landStroke} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
            ))}

            {/* Animated attack arcs toward WUH target */}
            {arcs.map((a, i) => {
              const arcStyle: Record<string, any> = {
                animation: `line-dash ${a.duration}s ease-in-out ${a.delay}s infinite`,
                filter: `drop-shadow(0 0 3px ${a.color}90)`,
              }
              return (
                <path
                  key={a.id}
                  d={`M ${a.x1} ${a.y1} Q ${a.cx} ${a.cy} ${a.x2} ${a.y2}`}
                  fill="none" stroke={`url(#attack-arc-${i})`}
                  strokeWidth={a.width} strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength={100}
                  strokeDasharray="100" strokeDashoffset="100"
                  style={arcStyle as React.CSSProperties}
                />
              )
            })}

            {/* Attack-source markers */}
            {markers.map((m, i) => {
              const r = m.r / view.k
              return (
                <g
                  key={m.name}
                  transform={`translate(${m.x},${m.y})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => setTooltip({
                    x: e.clientX, y: e.clientY,
                    title: `${countryFlag(m.name)} ${m.name}`,
                    lines: [`${m.count.toLocaleString()} เหตุการณ์ความเสี่ยงสูง`],
                  })}
                  onMouseMove={(e) => setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => { if (!dragRef.current.moved) navigate(`/alerts?country=${encodeURIComponent(m.name)}`) }}
                >
                  <circle r={r * 2.8} fill="none" stroke={m.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke"
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `ripple ${2 + i * 0.3}s ease-out ${i * 0.5}s infinite` }} />
                  <circle r={r * 2} fill={`${m.color}28`} stroke={`${m.color}60`} strokeWidth={1} vectorEffect="non-scaling-stroke"
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `pulse-ring ${1.5 + i * 0.25}s ease-out ${i * 0.4}s infinite` }} />
                  <circle r={r} fill={m.color}
                    style={{ filter: `drop-shadow(0 0 ${r * 1.4}px ${m.color})`, animation: `pulse-dot ${1.2 + i * 0.2}s ease-in-out ${i * 0.3}s infinite` }} />
                </g>
              )
            })}

            {/* WUH protected target — Bangkok */}
            {targetXY && (
              <g transform={`translate(${targetXY[0]},${targetXY[1]})`}>
                {[0, 1, 2].map((i) => (
                  <circle key={i} r={14 / view.k} fill="none" stroke="rgba(34,197,94,0.6)" strokeWidth={1.5} vectorEffect="non-scaling-stroke"
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `ripple 2.5s ease-out ${i * 0.8}s infinite` }} />
                ))}
                <circle r={5 / view.k} fill="#22C55E"
                  style={{ filter: 'drop-shadow(0 0 8px #22C55E)', animation: 'target-pulse 2s ease-in-out infinite' }} />
                <text x={0} y={-16 / view.k} textAnchor="middle" fill="#22C55E"
                  fontSize={10 / view.k} fontWeight={700}
                  stroke="rgba(6,13,26,0.85)" strokeWidth={3 / view.k} paintOrder="stroke">
                  {TARGET_LABEL}
                </text>
              </g>
            )}
          </g>
        </svg>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 480 }}>
          <CircularProgress size={28} sx={{ color: 'rgba(124,147,255,0.4)' }} />
        </Box>
      )}

      {/* Empty-data overlay */}
      {!loading && markers.length === 0 && size.width > 0 && (
        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 1.5, pointerEvents: 'none',
        }}>
          <Typography sx={{ fontSize: 32, lineHeight: 1 }}>🌍</Typography>
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
            ไม่มีข้อมูลภัยคุกคามในช่วงเวลานี้
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            ข้อมูลมาจาก Level 12+ เท่านั้น
          </Typography>
        </Box>
      )}

      {/* Tooltip */}
      {tooltip && (
        <Box sx={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y + 14, zIndex: 1400,
          pointerEvents: 'none', ...getChartTipStyle(isDark),
          px: 1.25, py: 0.75, minWidth: 150,
        }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.25 }}>{tooltip.title}</Typography>
          {tooltip.lines.map((l, i) => (
            <Typography key={i} sx={{ fontSize: 11, opacity: 0.8 }}>{l}</Typography>
          ))}
        </Box>
      )}

      {/* Legend — top attack sources */}
      {markers.length > 0 && (
        <Box sx={{
          position: 'absolute', left: 12, bottom: 12, zIndex: 20,
          bgcolor: 'rgba(6,13,26,0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px', p: '8px 12px', maxWidth: 220,
        }}>
          <Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', mb: 0.75, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            แหล่งโจมตีสูงสุด
          </Typography>
          {markers.slice(0, 6).map((m) => (
            <Box key={m.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: m.color, flexShrink: 0, boxShadow: `0 0 6px ${m.color}` }} />
              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', minWidth: 90, whiteSpace: 'nowrap' }}>
                {countryFlag(m.name)} {m.name}
              </Typography>
              <Typography sx={{ fontSize: 10, color: m.color, fontFamily: '"IBM Plex Mono",monospace', fontWeight: 700 }}>
                {m.count.toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Live counter badge */}
      <Box sx={{
        position: 'absolute', right: 12, top: 12, zIndex: 20,
        bgcolor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '8px', px: 1.25, py: 0.5,
      }}>
        <Typography sx={{ fontSize: 10, color: '#EF4444', fontWeight: 700 }}>
          ⚡ {countries.length} ประเทศ · {fmtN(totalAttacks)} เหตุการณ์
        </Typography>
      </Box>

      {/* Zoom controls */}
      <Box sx={{
        position: 'absolute', right: 12, bottom: 12, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: 0.5,
        bgcolor: 'rgba(6,13,26,0.85)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', p: 0.5,
      }}>
        {[
          { label: '+', action: () => zoomBy(1.4) },
          { label: '−', action: () => zoomBy(1 / 1.4) },
          { label: '⟲', action: resetView },
        ].map((btn) => (
          <Box
            key={btn.label}
            onClick={btn.action}
            sx={{
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
              fontSize: 14, fontWeight: 700, userSelect: 'none',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
            }}
          >
            {btn.label}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default AttackWorldMap
