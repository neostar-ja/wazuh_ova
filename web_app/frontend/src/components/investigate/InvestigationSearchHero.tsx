import {
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import type {
  InvestigationDirection,
  InvestigationQueryType,
  InvestigationRange,
  InvestigationSeverity,
} from '../../types'
import { BRAND } from '../ui/tokens'
import {
  directionOptions,
  queryExamples,
  queryTypeLabels,
  rangeOptions,
  severityOptions,
} from './utils'

interface InvestigationSearchHeroProps {
  query: string
  detectedType: InvestigationQueryType
  selectedType: InvestigationQueryType | 'auto'
  range: InvestigationRange
  direction: InvestigationDirection
  severity: InvestigationSeverity
  advancedOpen: boolean
  error?: string | null
  recentSearches: string[]
  searching?: boolean
  onQueryChange: (value: string) => void
  onSelectedTypeChange: (value: InvestigationQueryType | 'auto') => void
  onRangeChange: (value: InvestigationRange) => void
  onDirectionChange: (value: InvestigationDirection) => void
  onSeverityChange: (value: InvestigationSeverity) => void
  onToggleAdvanced: () => void
  onSearch: () => void
  onUseQuery: (value: string) => void
}

export function InvestigationSearchHero({
  query,
  detectedType,
  selectedType,
  range,
  direction,
  severity,
  advancedOpen,
  error,
  recentSearches,
  searching = false,
  onQueryChange,
  onSelectedTypeChange,
  onRangeChange,
  onDirectionChange,
  onSeverityChange,
  onToggleAdvanced,
  onSearch,
  onUseQuery,
}: InvestigationSearchHeroProps) {
  const activeType = selectedType === 'auto' ? detectedType : selectedType

  return (
    <Box
      className="relative overflow-hidden rounded-[28px] border border-white/10"
      sx={{
        p: { xs: 2, md: 3 },
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(145deg, rgba(21,16,40,0.96) 0%, rgba(39,28,66,0.9) 55%, rgba(24,63,97,0.78) 100%)'
            : 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(248,243,255,0.98) 55%, rgba(235,246,255,0.98) 100%)',
        boxShadow: '0 22px 60px rgba(16,12,31,0.2)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.34,
          background:
            'radial-gradient(circle at top right, rgba(241,116,34,0.18), transparent 28%), radial-gradient(circle at bottom left, rgba(123,91,164,0.22), transparent 40%)',
        }}
      />

      <Stack spacing={2.25} sx={{ position: 'relative' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: { xs: 22, md: 30 }, fontWeight: 900, letterSpacing: '-0.04em' }}>
              Investigation Workbench
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, maxWidth: 860 }}>
              ค้นหา IP, Hostname, Agent, User, Domain, Hash, Rule ID หรือ CVE แล้วเชื่อมโยง Alert, Context, Threat Intel,
              MITRE และ Evidence จาก Wazuh/OpenSearch อย่างเป็นระบบ
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip
              icon={<ManageSearchRoundedIcon />}
              label={`Detected: ${queryTypeLabels[detectedType]}`}
              sx={{
                height: 28,
                fontWeight: 800,
                bgcolor: 'rgba(123,91,164,0.14)',
                color: BRAND.purpleLight,
                border: '1px solid rgba(123,91,164,0.3)',
              }}
            />
            <Chip
              icon={<BoltRoundedIcon />}
              label={selectedType === 'auto' ? 'Auto Detection' : `Manual: ${queryTypeLabels[activeType]}`}
              sx={{
                height: 28,
                fontWeight: 800,
                bgcolor: 'rgba(34,197,94,0.1)',
                color: '#34d399',
                border: '1px solid rgba(52,211,153,0.28)',
              }}
            />
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={{ alignItems: { lg: 'center' } }}>
          <TextField
            fullWidth
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSearch()
              }
            }}
            error={Boolean(error)}
            helperText={error || 'ระบบจะ trim query และตรวจจับประเภทให้อัตโนมัติ'}
            placeholder="ค้นหา IP, Hostname, Agent, User, Domain, Hash, Rule ID หรือ CVE"
            InputProps={{
              startAdornment: <SearchRoundedIcon sx={{ color: BRAND.purpleLight, mr: 1 }} />,
              sx: {
                minHeight: 62,
                borderRadius: '20px',
                fontSize: 18,
                fontWeight: 700,
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
                '& input': {
                  fontFamily: '"IBM Plex Sans Thai", sans-serif',
                },
              },
            }}
          />

          <FormControl sx={{ minWidth: { xs: '100%', sm: 160, lg: 180 } }}>
            <InputLabel>Time Range</InputLabel>
            <Select label="Time Range" value={range} onChange={(event) => onRangeChange(event.target.value as InvestigationRange)}>
              {rangeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            size="large"
            startIcon={<SearchRoundedIcon />}
            onClick={onSearch}
            disabled={searching}
            sx={{
              minWidth: { xs: '100%', lg: 148 },
              minHeight: 56,
              borderRadius: '18px',
              fontWeight: 900,
              boxShadow: '0 18px 36px rgba(123,91,164,0.24)',
            }}
          >
            Search
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={selectedType}
            onChange={(_, value: InvestigationQueryType | 'auto' | null) => {
              if (value) onSelectedTypeChange(value)
            }}
            sx={{ flexWrap: 'wrap' }}
          >
            <ToggleButton value="auto">Auto</ToggleButton>
            <ToggleButton value="ip">IP</ToggleButton>
            <ToggleButton value="hostname">Hostname</ToggleButton>
            <ToggleButton value="user">User</ToggleButton>
            <ToggleButton value="mac">MAC</ToggleButton>
            <ToggleButton value="domain">Domain</ToggleButton>
            <ToggleButton value="hash">Hash</ToggleButton>
            <ToggleButton value="rule">Rule</ToggleButton>
            <ToggleButton value="cve">CVE</ToggleButton>
          </ToggleButtonGroup>

          <Button variant="text" startIcon={<TuneRoundedIcon />} onClick={onToggleAdvanced} sx={{ fontWeight: 800 }}>
            {advancedOpen ? 'ซ่อน Advanced Filter' : 'แสดง Advanced Filter'}
          </Button>
        </Stack>

        <Collapse in={advancedOpen}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <FormControl fullWidth>
              <InputLabel>Direction</InputLabel>
              <Select label="Direction" value={direction} onChange={(event) => onDirectionChange(event.target.value as InvestigationDirection)}>
                {directionOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select label="Severity" value={severity} onChange={(event) => onSeverityChange(event.target.value as InvestigationSeverity)}>
                {severityOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Collapse>

        {recentSearches.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'text.disabled', mb: 1 }}>
              <HistoryRoundedIcon sx={{ fontSize: 14, mr: 0.75, verticalAlign: 'text-bottom' }} />
              Recent Searches
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {recentSearches.map((recent) => (
                <Chip
                  key={recent}
                  label={recent}
                  onClick={() => onUseQuery(recent)}
                  variant="outlined"
                  sx={{ fontFamily: '"IBM Plex Mono", monospace' }}
                />
              ))}
            </Stack>
          </Box>
        )}

        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'text.disabled', mb: 1 }}>
            Quick Examples
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {queryExamples.map((example) => (
              <Chip
                key={example.value}
                label={`${example.label}: ${example.value}`}
                onClick={() => onUseQuery(example.value)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  '& .MuiChip-label': { fontFamily: '"IBM Plex Mono", monospace' },
                }}
              />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}

export default InvestigationSearchHero
