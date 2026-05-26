import { useState, useRef } from 'react'
import { Box, InputBase, Popper, Paper, ClickAwayListener, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import LaptopRoundedIcon from '@mui/icons-material/LaptopRounded'
import FingerprintRoundedIcon from '@mui/icons-material/FingerprintRounded'
import type { TimeRange } from './InvestigatePageV2'

interface SearchHeroProps {
  value: string
  timeRange: TimeRange
  loading: boolean
  recentSearches: string[]
  onChange: (v: string) => void
  onSearch: (q: string, range: TimeRange) => void
}

const TIME_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: '1h',  label: '1h' },
  { value: '6h',  label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d',  label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
]

interface DetectedType { label: string; color: string; icon: React.ReactNode }

function detectType(v: string): DetectedType | null {
  v = v.trim()
  if (!v) return null
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v))
    return { label: 'IP Address', color: '#0EA5E9', icon: <RouterRoundedIcon sx={{ fontSize: 12 }} /> }
  if (/^([0-9a-fA-F]{2}[:\-]){5}[0-9a-fA-F]{2}$/.test(v))
    return { label: 'MAC', color: '#8B5CF6', icon: <FingerprintRoundedIcon sx={{ fontSize: 12 }} /> }
  if (/^CVE-\d{4}-\d+$/i.test(v))
    return { label: 'CVE', color: '#EF4444', icon: <FingerprintRoundedIcon sx={{ fontSize: 12 }} /> }
  if (/^[0-9a-fA-F]{32,64}$/.test(v))
    return { label: 'Hash', color: '#F59E0B', icon: <FingerprintRoundedIcon sx={{ fontSize: 12 }} /> }
  if (v.includes('.') && !v.includes(' '))
    return { label: 'Host/Domain', color: '#22C55E', icon: <LaptopRoundedIcon sx={{ fontSize: 12 }} /> }
  return { label: 'User/Host', color: '#F17422', icon: <PersonRoundedIcon sx={{ fontSize: 12 }} /> }
}

export default function SearchHero({ value, timeRange, loading, recentSearches, onChange, onSearch }: SearchHeroProps) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const detected  = detectType(value)

  const submit = () => {
    if (value.trim()) { onSearch(value.trim(), timeRange); setOpen(false) }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
    if (e.key === 'Escape') setOpen(false)
  }

  const borderColor = isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.15)'
  const bgColor = isDark ? 'rgba(10,6,20,0.92)' : 'rgba(248,246,255,0.95)'

  return (
    <Box sx={{
      position: 'sticky', top: 0, zIndex: 100,
      background: bgColor,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${borderColor}`,
      mx: -2, px: 2, py: 1.25,
    }}>
      <Box className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        {/* Search input */}
        <Box
          ref={anchorRef}
          onClick={() => { setOpen(true); inputRef.current?.focus() }}
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl cursor-text transition-all duration-200"
          sx={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)',
            border: open
              ? '1.5px solid rgba(139,92,246,0.55)'
              : `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(123,91,164,0.15)'}`,
            '&:hover': { borderColor: 'rgba(139,92,246,0.35)' },
          }}
        >
          <SearchRoundedIcon sx={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(100,70,160,0.4)', fontSize: 18, flexShrink: 0 }} />

          <InputBase
            inputRef={inputRef}
            value={value}
            onChange={e => { onChange(e.target.value); setOpen(true) }}
            onKeyDown={handleKey}
            onFocus={() => setOpen(true)}
            placeholder="Search IP, hostname, user, MAC, domain, hash…"
            fullWidth
            sx={{
              color: isDark ? '#EDE9FA' : '#1A1033',
              fontSize: 14,
              fontFamily: value ? '"IBM Plex Mono", monospace' : 'inherit',
              '& input': { p: 0, '&::placeholder': { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)', opacity: 1 } },
            }}
          />

          {/* Type badge */}
          {detected && (
            <Box className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              sx={{ background: `${detected.color}20`, color: detected.color, border: `1px solid ${detected.color}30` }}>
              {detected.icon}
              <span className="hidden xs:inline">{detected.label}</span>
            </Box>
          )}

          {value && (
            <Box onClick={e => { e.stopPropagation(); onChange(''); inputRef.current?.focus() }}
              className="p-0.5 rounded cursor-pointer opacity-40 hover:opacity-70 transition-opacity shrink-0"
              sx={{ color: isDark ? '#fff' : '#333' }}>
              <CloseRoundedIcon sx={{ fontSize: 16, display: 'block' }} />
            </Box>
          )}
        </Box>

        {/* Time range */}
        <Box className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide shrink-0">
          {TIME_OPTIONS.map(opt => (
            <Box
              key={opt.value}
              onClick={() => onSearch(value, opt.value)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer select-none transition-all duration-150 whitespace-nowrap"
              sx={{
                color: timeRange === opt.value ? '#A78BFA' : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(90,62,133,0.5)'),
                background: timeRange === opt.value ? 'rgba(139,92,246,0.18)' : 'transparent',
                border: timeRange === opt.value ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
                '&:hover': { color: '#C4B5FD', background: 'rgba(139,92,246,0.1)' },
              }}
            >
              {opt.label}
            </Box>
          ))}
        </Box>

        {/* Investigate button */}
        <Box
          onClick={submit}
          className="ui-btn ui-btn-primary text-xs sm:text-sm shrink-0 justify-center"
          sx={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', minWidth: 110 }}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.416" strokeDashoffset="10" />
              </svg>
              Searching…
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <SearchRoundedIcon sx={{ fontSize: 15 }} />
              Investigate
            </span>
          )}
        </Box>
      </Box>

      {/* Dropdown */}
      <Popper open={open && recentSearches.length > 0 && !value} anchorEl={anchorRef.current}
        placement="bottom-start" style={{ zIndex: 9999, width: anchorRef.current?.offsetWidth }}>
        <ClickAwayListener onClickAway={() => setOpen(false)}>
          <Paper elevation={8} sx={{
            mt: 0.75,
            background: isDark ? 'rgba(15,10,28,0.98)' : 'rgba(255,255,255,0.98)',
            border: `1px solid ${isDark ? 'rgba(123,91,164,0.25)' : 'rgba(123,91,164,0.15)'}`,
            borderRadius: 2, overflow: 'hidden',
            backdropFilter: 'blur(20px)',
          }}>
            <Box className="px-3 py-2 flex items-center gap-1.5"
              sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)'}` }}>
              <AccessTimeRoundedIcon sx={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(100,70,160,0.4)' }} />
              <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
                color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(60,40,100,0.4)' }}>
                RECENT SEARCHES
              </Typography>
            </Box>
            {recentSearches.map(r => (
              <Box key={r}
                onClick={() => { onChange(r); onSearch(r, timeRange); setOpen(false) }}
                className="px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors duration-100"
                sx={{
                  color: isDark ? '#C4B5FD' : '#5A3E85',
                  '&:hover': { background: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.06)' },
                }}>
                <AccessTimeRoundedIcon sx={{ fontSize: 13, opacity: 0.4 }} />
                <Typography sx={{ fontSize: 12, fontFamily: '"IBM Plex Mono", monospace' }}>{r}</Typography>
              </Box>
            ))}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  )
}
