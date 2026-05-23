import React, { useMemo } from 'react'
import { Box, CircularProgress, Stack, Typography } from '@mui/material'

interface Coordinate {
  x: string
  y: string
}

const COUNTRY_COORDS: Record<string, Coordinate> = {
  Afghanistan: { x: '66%', y: '40%' },
  Albania: { x: '53%', y: '34%' },
  Algeria: { x: '47%', y: '42%' },
  Argentina: { x: '28%', y: '76%' },
  Australia: { x: '83%', y: '76%' },
  Austria: { x: '52%', y: '30%' },
  Bangladesh: { x: '73%', y: '43%' },
  Belgium: { x: '49%', y: '28%' },
  Brazil: { x: '34%', y: '62%' },
  Canada: { x: '20%', y: '20%' },
  China: { x: '76%', y: '36%' },
  France: { x: '48%', y: '31%' },
  Germany: { x: '51%', y: '28%' },
  India: { x: '69%', y: '46%' },
  Indonesia: { x: '78%', y: '60%' },
  Iran: { x: '64%', y: '39%' },
  Iraq: { x: '60%', y: '39%' },
  Japan: { x: '85%', y: '36%' },
  Mexico: { x: '18%', y: '42%' },
  Netherlands: { x: '49%', y: '27%' },
  Pakistan: { x: '67%', y: '42%' },
  Russia: { x: '68%', y: '18%' },
  'Saudi Arabia': { x: '59%', y: '47%' },
  Singapore: { x: '76%', y: '56%' },
  'South Africa': { x: '54%', y: '78%' },
  'South Korea': { x: '82%', y: '35%' },
  Spain: { x: '45%', y: '35%' },
  Sweden: { x: '52%', y: '21%' },
  Thailand: { x: '74%', y: '49%' },
  Turkey: { x: '57%', y: '34%' },
  Ukraine: { x: '57%', y: '28%' },
  'United Kingdom': { x: '46%', y: '25%' },
  'United States': { x: '16%', y: '31%' },
  Vietnam: { x: '77%', y: '48%' },
}

const MAP_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']

export interface CountryData {
  name: string
  count: number
}

interface WorldMapProps {
  countries?: CountryData[]
  loading?: boolean
}

interface MapMarker {
  name: string
  count: number
  x: string
  y: string
  size: number
  color: string
  glow: number
}

function WorldMap({ countries = [], loading = false }: WorldMapProps) {
  const markers = useMemo<MapMarker[]>(() => {
    if (!Array.isArray(countries) || countries.length === 0) return []

    const normalized = countries
      .map(country => {
        const name = country?.name || 'Unknown'
        const position = COUNTRY_COORDS[name]
        if (!position) return null

        return {
          name,
          count: Number(country?.count || 0),
          ...position,
        }
      })
      .filter((x): x is { name: string; count: number; x: string; y: string } => !!x)
      .sort((left, right) => right.count - left.count)

    if (normalized.length === 0) return []

    const maxCount = Math.max(...normalized.map(marker => marker.count), 1)

    return normalized.map((marker, index) => ({
      ...marker,
      size: Math.max(10, Math.min(34, 10 + (marker.count / maxCount) * 24)),
      color: MAP_COLORS[index % MAP_COLORS.length],
      glow: Math.max(0.2, Math.min(0.85, marker.count / maxCount)),
    }))
  }, [countries])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 280 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: 280,
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#09111e',
        border: '0.5px solid rgba(255,255,255,0.08)',
        backgroundImage: `
          radial-gradient(circle at 18% 22%, rgba(59,130,246,0.16), transparent 20%),
          radial-gradient(circle at 75% 28%, rgba(245,158,11,0.14), transparent 16%),
          radial-gradient(circle at 58% 62%, rgba(239,68,68,0.16), transparent 20%),
          linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
        `,
        backgroundSize: 'auto, auto, auto, 40px 40px, 40px 40px',
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: '12% 8%',
          opacity: 0.15,
          borderRadius: '48% 52% 50% 50% / 44% 46% 54% 56%',
          border: '1px solid rgba(96,165,250,0.3)',
          transform: 'skewX(-12deg)',
        }}
      />

      {markers.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', justifyContent: 'center', minHeight: 280, position: 'relative', zIndex: 1 }}>
          <Typography sx={{ fontSize: 24 }}>🌍</Typography>
          <Typography variant="body2" color="text.secondary">No geographical data</Typography>
        </Box>
      ) : (
        <>
          {markers.map(marker => (
            <Box
              key={marker.name}
              title={`${marker.name}: ${marker.count.toLocaleString()} alerts`}
              sx={{
                position: 'absolute',
                left: marker.x,
                top: marker.y,
                width: marker.size,
                height: marker.size,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                backgroundColor: marker.color,
                opacity: 0.9,
                boxShadow: `0 0 0 1px rgba(255,255,255,0.12), 0 0 24px rgba(59,130,246,${marker.glow})`,
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  border: `1px solid rgba(255,255,255,${Math.max(0.08, marker.glow * 0.25)})`,
                },
              }}
            />
          ))}

          <Box sx={{ position: 'absolute', left: 16, bottom: 16, zIndex: 1 }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
              Global Attack Map
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {markers.slice(0, 4).map(marker => (
                <Box key={marker.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: marker.color, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 11, color: 'text.primary' }}>
                    {marker.name}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                    {marker.count.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}
    </Box>
  )
}

export default WorldMap
