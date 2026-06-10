/**
 * Advanced Filters Panel
 * Collapsible section สำหรับ structured filters
 * Theme-aware: supports Dark and Light mode
 */

import {
  Box,
  Button,
  Collapse,
  TextField,
  MenuItem,
  useTheme,
  Typography,
  Grid,
  Divider,
} from '@mui/material'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import {
  SearchFormState,
  PROTOCOL_OPTIONS,
  ACTION_OPTIONS,
  DIRECTION_OPTIONS,
  SOURCE_FAMILY_OPTIONS,
} from './searchTypes'
import { BRAND } from '../ui/tokens'

interface AdvancedFiltersProps {
  form: SearchFormState
  onFieldChange: <K extends keyof SearchFormState>(key: K, value: SearchFormState[K]) => void
  showAdvanced: boolean
  onToggle: () => void
}

const TIME_RANGE_OPTIONS = [
  { value: '1h',  label: '1 ชั่วโมง' },
  { value: '6h',  label: '6 ชั่วโมง' },
  { value: '24h', label: '24 ชั่วโมง' },
  { value: '7d',  label: '7 วัน' },
  { value: '30d', label: '30 วัน' },
  { value: '90d', label: '90 วัน' },
]

export function AdvancedFilters({
  form,
  onFieldChange,
  showAdvanced,
  onToggle,
}: AdvancedFiltersProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const filterPanelBg = isDark
    ? 'rgba(22,17,42,0.85)'
    : 'rgba(255,255,255,0.95)'
  const filterPanelBorder = isDark
    ? 'rgba(123,91,164,0.2)'
    : 'rgba(123,91,164,0.14)'

  return (
    <Box>
      <Button
        variant="text"
        startIcon={<TuneRoundedIcon sx={{ fontSize: 16 }} />}
        endIcon={
          showAdvanced ? (
            <ExpandLessRoundedIcon sx={{ fontSize: 16 }} />
          ) : (
            <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />
          )
        }
        onClick={onToggle}
        aria-expanded={showAdvanced}
        aria-label="Toggle advanced filters"
        sx={{
          px: 0,
          fontWeight: 700,
          fontSize: 13,
          color: showAdvanced ? BRAND.purple : 'text.secondary',
          transition: 'color 0.2s ease',
          '&:hover': { bgcolor: 'transparent', color: BRAND.purple },
        }}
      >
        ตัวกรองขั้นสูง
      </Button>

      <Collapse in={showAdvanced}>
        <Box
          sx={{
            mt: 1.5,
            p: { xs: 2, md: 2.5 },
            borderRadius: '14px',
            bgcolor: filterPanelBg,
            border: `1px solid ${filterPanelBorder}`,
            boxShadow: isDark
              ? '0 4px 24px rgba(0,0,0,0.25)'
              : '0 2px 16px rgba(123,91,164,0.08)',
          }}
        >
          {/* Network Filters */}
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: BRAND.purple,
              mb: 1.5,
            }}
          >
            เครือข่าย
          </Typography>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={4} md={3} lg={2}>
              <TextField
                label="Port"
                size="small"
                fullWidth
                value={form.port}
                onChange={(e) => onFieldChange('port', e.target.value)}
                inputProps={{ inputMode: 'numeric', 'aria-label': 'Port filter' }}
                sx={{ fontFamily: '"IBM Plex Mono", monospace' }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={3} lg={2}>
              <TextField
                label="Src Port"
                size="small"
                fullWidth
                value={form.srcport}
                onChange={(e) => onFieldChange('srcport', e.target.value)}
                inputProps={{ inputMode: 'numeric', 'aria-label': 'Source port filter' }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={3} lg={2}>
              <TextField
                label="Dst Port"
                size="small"
                fullWidth
                value={form.dstport}
                onChange={(e) => onFieldChange('dstport', e.target.value)}
                inputProps={{ inputMode: 'numeric', 'aria-label': 'Destination port filter' }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={3} lg={2}>
              <TextField
                label="Src IP"
                size="small"
                fullWidth
                value={form.srcip}
                onChange={(e) => onFieldChange('srcip', e.target.value)}
                inputProps={{ 'aria-label': 'Source IP filter', style: { fontFamily: '"IBM Plex Mono", monospace' } }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={3} lg={2}>
              <TextField
                label="Dst IP"
                size="small"
                fullWidth
                value={form.dstip}
                onChange={(e) => onFieldChange('dstip', e.target.value)}
                inputProps={{ 'aria-label': 'Destination IP filter', style: { fontFamily: '"IBM Plex Mono", monospace' } }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={3} lg={2}>
              <TextField
                select
                label="Protocol"
                size="small"
                fullWidth
                value={form.proto}
                onChange={(e) => onFieldChange('proto', e.target.value)}
                inputProps={{ 'aria-label': 'Protocol filter' }}
              >
                {PROTOCOL_OPTIONS.map((opt) => (
                  <MenuItem key={opt || 'all'} value={opt}>
                    {opt ? opt.toUpperCase() : 'ทั้งหมด'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Divider
            sx={{
              my: 2,
              borderColor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
            }}
          />

          {/* Context Filters */}
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: BRAND.orange,
              mb: 1.5,
            }}
          >
            Context
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <TextField
                label="Agent / Host"
                size="small"
                fullWidth
                value={form.agent}
                onChange={(e) => onFieldChange('agent', e.target.value)}
                inputProps={{ 'aria-label': 'Agent filter' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <TextField
                label="Rule Group"
                size="small"
                fullWidth
                value={form.group}
                onChange={(e) => onFieldChange('group', e.target.value)}
                inputProps={{ 'aria-label': 'Rule group filter' }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={3} lg={2}>
              <TextField
                select
                label="Direction"
                size="small"
                fullWidth
                value={form.direction}
                onChange={(e) => onFieldChange('direction', e.target.value as any)}
                inputProps={{ 'aria-label': 'Direction filter' }}
              >
                {DIRECTION_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4} md={3} lg={2}>
              <TextField
                select
                label="Action"
                size="small"
                fullWidth
                value={form.action}
                onChange={(e) => onFieldChange('action', e.target.value)}
                inputProps={{ 'aria-label': 'Action filter' }}
              >
                {ACTION_OPTIONS.map((opt) => (
                  <MenuItem key={opt || 'all'} value={opt}>
                    {opt ? opt.toUpperCase() : 'ทั้งหมด'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <TextField
                select
                label="Source Family"
                size="small"
                fullWidth
                value={form.source_family}
                onChange={(e) => onFieldChange('source_family', e.target.value)}
                inputProps={{ 'aria-label': 'Source family filter' }}
              >
                {SOURCE_FAMILY_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                label="ผลลัพธ์สูงสุด"
                size="small"
                fullWidth
                value={form.size}
                onChange={(e) => onFieldChange('size', e.target.value)}
                inputProps={{ inputMode: 'numeric', 'aria-label': 'Max results' }}
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Box>
  )
}
