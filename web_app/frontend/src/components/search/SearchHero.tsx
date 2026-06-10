/**
 * Search Hero Section
 * ประกอบด้วย Search Bar + Time Range + Quick Filters
 * Theme-aware: สอดคล้องกับ Design System ม่วง-ส้ม
 */

import { useRef, useEffect, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  IconButton,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded'
import DesktopWindowsRoundedIcon from '@mui/icons-material/DesktopWindowsRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import { BRAND } from '../ui/tokens'
import {
  SearchFormState,
  QUICK_FILTERS,
  SOURCE_FAMILY_OPTIONS,
  SearchSuggestion,
} from './searchTypes'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SearchHeroProps {
  form: SearchFormState
  onFieldChange: <K extends keyof SearchFormState>(key: K, value: SearchFormState[K]) => void
  onSearch: () => void
  onApplyPatch: (patch: Partial<SearchFormState>, autoCommit?: boolean) => void
  canSearch: boolean
  isLoading: boolean
  suggestions: SearchSuggestion[]
  onSuggestionSelect: (suggestion: SearchSuggestion) => void
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TIME_RANGES = [
  { value: '1h',  label: '1 ชั่วโมง' },
  { value: '6h',  label: '6 ชั่วโมง' },
  { value: '24h', label: '24 ชั่วโมง' },
  { value: '7d',  label: '7 วัน' },
  { value: '30d', label: '30 วัน' },
  { value: '90d', label: '90 วัน' },
]

const HUNT_PRESETS = [
  { label: 'SSH Activity',     patch: { query: 'port 22', proto: 'tcp' },                                    icon: <TerminalRoundedIcon sx={{ fontSize: 14 }} /> },
  { label: 'RDP Activity',     patch: { query: 'port 3389', proto: 'tcp' },                                  icon: <DesktopWindowsRoundedIcon sx={{ fontSize: 14 }} /> },
  { label: 'Failed Login',     patch: { query: 'failed', source_family: 'ssh' as const },                    icon: <LockRoundedIcon sx={{ fontSize: 14 }} /> },
  { label: 'Firewall Deny',    patch: { query: '', action: 'deny', source_family: 'firewall' as const },     icon: <BlockRoundedIcon sx={{ fontSize: 14 }} /> },
  { label: 'DNS Events',       patch: { query: '', source_family: 'dns' as const },                          icon: <DnsRoundedIcon sx={{ fontSize: 14 }} /> },
  { label: 'External Traffic', patch: { query: '', source_family: 'ids' as const },                          icon: <PublicRoundedIcon sx={{ fontSize: 14 }} /> },
  { label: 'Firewall Logs',    patch: { query: '', source_family: 'firewall' as const },                     icon: <RouterRoundedIcon sx={{ fontSize: 14 }} /> },
  { label: 'IDS / Suricata',   patch: { query: '', source_family: 'ids' as const },                          icon: <SecurityRoundedIcon sx={{ fontSize: 14 }} /> },
]

const HISTORY_KEY = 'soc-search-history'
const HISTORY_MAX = 10

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveHistory(query: string) {
  try {
    const history = loadHistory().filter((q) => q !== query)
    const updated = [query, ...history].slice(0, HISTORY_MAX)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch { /* ignore */ }
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SearchHero({
  form,
  onFieldChange,
  onSearch,
  onApplyPatch,
  canSearch,
  isLoading,
  suggestions,
  onSuggestionSelect,
}: SearchHeroProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [history, setHistory] = useState<string[]>(loadHistory)
  const [showHistory, setShowHistory] = useState(false)

  // Keyboard shortcut: '/' to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSearch = () => {
    if (!canSearch) return
    if (form.query.trim()) saveHistory(form.query.trim())
    setHistory(loadHistory())
    setShowHistory(false)
    onSearch()
  }

  const handleHistoryClear = (q?: string) => {
    if (q) {
      const updated = history.filter((h) => h !== q)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
      setHistory(updated)
    } else {
      clearHistory()
      setHistory([])
    }
  }

  const showDropdown = focused && (suggestions.length > 0 || (showHistory && history.length > 0))
  const dropdownItems = suggestions.length > 0 ? 'suggestions' : 'history'

  // Card background
  const cardBg = isDark
    ? 'rgba(22,17,42,0.9)'
    : 'rgba(255,255,255,0.97)'
  const cardBorder = isDark
    ? 'rgba(123,91,164,0.22)'
    : 'rgba(123,91,164,0.14)'

  return (
    <Box
      sx={{
        borderRadius: '20px',
        overflow: 'visible',
        border: `1px solid ${cardBorder}`,
        bgcolor: cardBg,
        boxShadow: isDark
          ? '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 4px 24px rgba(123,91,164,0.12)',
        p: { xs: 2, md: 3 },
        position: 'relative',
      }}
    >
      {/* Accent top border */}
      <Box
        sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 3,
          borderRadius: '20px 20px 0 0',
          background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.orange})`,
        }}
      />

      {/* Header labels */}
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Chip
          label="Unified Log Hunt"
          size="small"
          sx={{
            bgcolor: `${BRAND.purple}14`,
            color: BRAND.purpleLight,
            fontWeight: 700,
            fontSize: 11,
            border: `1px solid ${BRAND.purple}25`,
          }}
        />
        <Chip
          label="Wazuh · Firewall · IDS · DNS · DHCP · NAC"
          size="small"
          sx={{
            bgcolor: `${BRAND.orange}10`,
            color: BRAND.orange,
            fontWeight: 600,
            fontSize: 11,
            border: `1px solid ${BRAND.orange}20`,
          }}
        />
        {!isMobile && (
          <Chip
            label="กด / เพื่อค้นหา"
            size="small"
            sx={{
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              color: 'text.disabled',
              fontSize: 10,
              fontFamily: '"IBM Plex Mono", monospace',
            }}
          />
        )}
      </Stack>

      {/* Main search row */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.25}
        sx={{ position: 'relative' }}
      >
        {/* Search Input */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            size="medium"
            placeholder="ค้นหา IP, Port, Hostname, Rule ID, Protocol หรือข้อความใน Log..."
            value={form.query}
            onChange={(e) => {
              onFieldChange('query', e.target.value)
              setShowHistory(false)
            }}
            onFocus={() => {
              setFocused(true)
              setShowHistory(true)
            }}
            onBlur={() => setTimeout(() => { setFocused(false); setShowHistory(false) }, 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSearch) handleSearch()
              if (e.key === 'Escape') {
                inputRef.current?.blur()
                setShowHistory(false)
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: BRAND.purple, opacity: 0.7, fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: form.query && (
                <InputAdornment position="end">
                  <Tooltip title="ล้างการค้นหา">
                    <IconButton
                      size="small"
                      onClick={() => onFieldChange('query', '')}
                      aria-label="ล้างการค้นหา"
                    >
                      <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
              sx: {
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
                borderRadius: '12px',
                bgcolor: isDark ? 'rgba(12,10,20,0.6)' : 'rgba(248,246,255,0.8)',
                '& fieldset': {
                  borderColor: isDark ? 'rgba(123,91,164,0.3)' : 'rgba(123,91,164,0.2)',
                },
                '&:hover fieldset': {
                  borderColor: BRAND.purple,
                },
                '&.Mui-focused fieldset': {
                  borderColor: BRAND.purple,
                },
              },
            }}
          />

          {/* Suggestions / History Dropdown */}
          {showDropdown && (
            <Paper
              elevation={8}
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 'calc(100% + 6px)',
                zIndex: 20,
                borderRadius: '12px',
                overflow: 'hidden',
                border: `1px solid ${isDark ? 'rgba(123,91,164,0.25)' : 'rgba(123,91,164,0.15)'}`,
                bgcolor: isDark ? 'rgba(22,17,42,0.97)' : 'rgba(255,255,255,0.99)',
                backdropFilter: 'blur(20px)',
                boxShadow: isDark
                  ? '0 12px 32px rgba(0,0,0,0.5)'
                  : '0 8px 24px rgba(123,91,164,0.15)',
              }}
            >
              {/* Suggestions */}
              {dropdownItems === 'suggestions' && suggestions.map((s, i) => (
                <Box
                  key={`${s.query}-${i}`}
                  onClick={() => {
                    onSuggestionSelect(s)
                    setShowHistory(false)
                  }}
                  sx={{
                    px: 2,
                    py: 1.25,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    '&:hover': { bgcolor: `${BRAND.purple}10` },
                    borderBottom: `1px solid ${isDark ? 'rgba(123,91,164,0.08)' : 'rgba(123,91,164,0.06)'}`,
                  }}
                >
                  <SearchRoundedIcon sx={{ fontSize: 14, color: BRAND.purple, opacity: 0.6, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>
                      {s.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontFamily: '"IBM Plex Mono", monospace',
                        color: 'text.secondary',
                      }}
                    >
                      {s.query}
                    </Typography>
                  </Box>
                </Box>
              ))}

              {/* Recent History */}
              {dropdownItems === 'history' && history.length > 0 && (
                <>
                  <Box
                    sx={{
                      px: 2,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: `1px solid ${isDark ? 'rgba(123,91,164,0.1)' : 'rgba(123,91,164,0.06)'}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'text.disabled',
                      }}
                    >
                      Recent Searches
                    </Typography>
                    <Button
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleHistoryClear() }}
                      sx={{ fontSize: 10, color: 'text.disabled', minWidth: 0, px: 0.75, py: 0.25 }}
                    >
                      Clear all
                    </Button>
                  </Box>
                  {history.map((q) => (
                    <Box
                      key={q}
                      onClick={() => {
                        onFieldChange('query', q)
                        handleSearch()
                      }}
                      sx={{
                        px: 2,
                        py: 1,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        '&:hover': { bgcolor: `${BRAND.purple}08` },
                        borderBottom: `1px solid ${isDark ? 'rgba(123,91,164,0.06)' : 'rgba(123,91,164,0.04)'}`,
                      }}
                    >
                      <HistoryRoundedIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontFamily: '"IBM Plex Mono", monospace',
                          color: 'text.primary',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {q}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleHistoryClear(q) }}
                        sx={{ opacity: 0.4, '&:hover': { opacity: 1 }, p: 0.25 }}
                        aria-label={`Remove "${q}" from history`}
                      >
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Box>
                  ))}
                </>
              )}
            </Paper>
          )}
        </Box>

        {/* Time Range Selector */}
        <TextField
          select
          size="medium"
          label="ช่วงเวลา"
          value={form.timeRange}
          onChange={(e) => onFieldChange('timeRange', e.target.value as any)}
          inputProps={{ 'aria-label': 'Time range selector' }}
          sx={{
            minWidth: { xs: '100%', md: 140 },
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              '& fieldset': { borderColor: isDark ? 'rgba(123,91,164,0.3)' : 'rgba(123,91,164,0.2)' },
              '&:hover fieldset': { borderColor: BRAND.purple },
              '&.Mui-focused fieldset': { borderColor: BRAND.purple },
            },
          }}
        >
          {TIME_RANGES.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Search Button */}
        <Button
          variant="contained"
          disabled={!canSearch || isLoading}
          onClick={handleSearch}
          startIcon={
            isLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <SearchRoundedIcon />
            )
          }
          sx={{
            borderRadius: '12px',
            px: { xs: 3, md: 3 },
            minHeight: 48,
            minWidth: { xs: '100%', md: 120 },
            bgcolor: BRAND.purple,
            fontWeight: 800,
            fontSize: 14,
            boxShadow: `0 4px 14px ${BRAND.purple}40`,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: BRAND.purpleDark,
              boxShadow: `0 6px 20px ${BRAND.purple}55`,
              transform: 'translateY(-1px)',
            },
            '&:active': { transform: 'translateY(0)' },
          }}
        >
          ค้นหา
        </Button>
      </Stack>

      <Divider
        sx={{
          my: 2.5,
          borderColor: isDark ? 'rgba(123,91,164,0.1)' : 'rgba(123,91,164,0.07)',
        }}
      />

      {/* Quick Presets + Source Family Chips */}
      <Box>
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'text.disabled',
            mb: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          <BoltRoundedIcon sx={{ fontSize: 12 }} />
          Quick Presets
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {HUNT_PRESETS.map((preset) => (
            <Chip
              key={preset.label}
              icon={preset.icon}
              label={preset.label}
              onClick={() => onApplyPatch(preset.patch)}
              size="small"
              sx={{
                cursor: 'pointer',
                height: 30,
                fontSize: 12,
                fontWeight: 600,
                bgcolor: isDark ? 'rgba(123,91,164,0.1)' : 'rgba(123,91,164,0.07)',
                border: `1px solid ${isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.14)'}`,
                color: 'text.primary',
                transition: 'all 0.2s ease',
                '& .MuiChip-icon': { color: BRAND.purple, fontSize: 14 },
                '&:hover': {
                  bgcolor: `${BRAND.purple}18`,
                  borderColor: `${BRAND.purple}40`,
                  color: BRAND.purpleLight,
                  '& .MuiChip-icon': { color: BRAND.purpleLight },
                  transform: 'translateY(-1px)',
                  boxShadow: `0 3px 10px ${BRAND.purple}20`,
                },
              }}
            />
          ))}

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Source family quick filters */}
          {SOURCE_FAMILY_OPTIONS.slice(1).map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              onClick={() => onApplyPatch({ source_family: opt.value })}
              size="small"
              variant={form.source_family === opt.value ? 'filled' : 'outlined'}
              sx={{
                cursor: 'pointer',
                height: 30,
                fontSize: 12,
                fontWeight: form.source_family === opt.value ? 700 : 500,
                bgcolor:
                  form.source_family === opt.value
                    ? `${BRAND.orange}18`
                    : 'transparent',
                borderColor:
                  form.source_family === opt.value
                    ? `${BRAND.orange}40`
                    : isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.12)',
                color:
                  form.source_family === opt.value
                    ? BRAND.orange
                    : 'text.secondary',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: `${BRAND.orange}14`,
                  borderColor: `${BRAND.orange}30`,
                  color: BRAND.orange,
                },
              }}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  )
}
