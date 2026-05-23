import { ReactNode, useCallback } from 'react'
import {
  Box, TextField, InputAdornment, Button, Chip, Typography, IconButton, Tooltip,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { BRAND } from './tokens'

interface ActiveFilter {
  label: string
  key: string
  value: string
}

interface DataToolbarProps {
  searchValue?: string
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  filters?: ReactNode
  actions?: ReactNode
  activeFilters?: ActiveFilter[]
  onRemoveFilter?: (key: string) => void
  onClearFilters?: () => void
  showFilterToggle?: boolean
  filterOpen?: boolean
  onToggleFilters?: () => void
  activeFilterCount?: number
  resultCount?: number
  resultLabel?: string
}

export function DataToolbar({
  searchValue = '',
  searchPlaceholder = 'ค้นหา...',
  onSearchChange,
  filters,
  actions,
  activeFilters = [],
  onRemoveFilter,
  onClearFilters,
  showFilterToggle = false,
  filterOpen = false,
  onToggleFilters,
  activeFilterCount = 0,
  resultCount,
  resultLabel,
}: DataToolbarProps) {
  const handleClear = useCallback(() => {
    onSearchChange?.('')
  }, [onSearchChange])

  return (
    <Box>
      {/* Main toolbar row */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        {onSearchChange && (
          <TextField
            size="small"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            sx={{ minWidth: 220, flex: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: searchValue ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClear} sx={{ p: 0.3 }}>
                      <CloseRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
        )}

        {/* Filter toggle button */}
        {showFilterToggle && onToggleFilters && (
          <Button
            size="small"
            startIcon={<FilterListRoundedIcon />}
            onClick={onToggleFilters}
            variant={filterOpen ? 'contained' : 'outlined'}
            sx={{ borderRadius: '10px', fontSize: 12, fontWeight: 600 }}
          >
            Filters
            {activeFilterCount > 0 && (
              <Box component="span" sx={{
                ml: 0.75, px: 0.75, py: 0.1,
                borderRadius: '10px', fontSize: 10, fontWeight: 800,
                bgcolor: filterOpen ? 'rgba(255,255,255,0.25)' : BRAND.purpleFaint,
                color: filterOpen ? '#fff' : BRAND.purple,
              }}>
                {activeFilterCount}
              </Box>
            )}
          </Button>
        )}

        {/* Inline filter controls */}
        {filters}

        {/* Result count */}
        {resultCount !== undefined && (
          <Typography sx={{ fontSize: 11, color: 'text.disabled', whiteSpace: 'nowrap' }}>
            {resultCount.toLocaleString()} {resultLabel || 'รายการ'}
          </Typography>
        )}

        {/* Right-side actions */}
        {actions && <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>{actions}</Box>}
      </Box>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
          {activeFilters.map(f => (
            <Chip
              key={f.key}
              label={`${f.label}: ${f.value}`}
              size="small"
              onDelete={onRemoveFilter ? () => onRemoveFilter(f.key) : undefined}
              deleteIcon={<CloseRoundedIcon sx={{ fontSize: '12px !important' }} />}
              sx={{
                height: 22, fontSize: 11, fontWeight: 600,
                bgcolor: BRAND.purpleFaint, color: BRAND.purpleLight,
                border: '1px solid rgba(123,91,164,0.2)',
                '& .MuiChip-deleteIcon': { color: BRAND.purple, opacity: 0.6, '&:hover': { opacity: 1 } },
              }}
            />
          ))}
          {onClearFilters && (
            <Button
              size="small"
              onClick={onClearFilters}
              sx={{ fontSize: 11, color: 'text.disabled', py: 0.15, px: 0.75, minWidth: 0, borderRadius: '8px', '&:hover': { color: 'error.main' } }}
            >
              ล้างทั้งหมด
            </Button>
          )}
        </Box>
      )}
    </Box>
  )
}

export default DataToolbar
