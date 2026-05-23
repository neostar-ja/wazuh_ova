import { Box, Chip, Grid, Stack, Typography } from '@mui/material'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import ThreatIntelRoundedIcon from '@mui/icons-material/PolicyRounded'
import type { ThreatIntelResult } from '../../types'
import EmptyState from '../ui/EmptyState'
import SectionCard from '../ui/SectionCard'
import { MonoValue, riskColor } from './utils'

interface ThreatIntelPanelProps {
  results?: ThreatIntelResult[]
}

function statusLabel(status: ThreatIntelResult['status']): string {
  switch (status) {
    case 'available':
      return 'Available'
    case 'not_configured':
      return 'Not Configured'
    case 'not_found':
      return 'No Match'
    case 'private':
      return 'Private'
    default:
      return 'Error'
  }
}

export function ThreatIntelPanel({ results }: ThreatIntelPanelProps) {
  const hasResults = Boolean(results && results.length > 0)
  const allNotConfigured = hasResults && results?.every((result) => result.status === 'not_configured')
  const title = allNotConfigured ? 'Threat Intelligence ยังไม่ได้ตั้งค่า' : 'Threat Intelligence'
  const subtitle = allNotConfigured
    ? 'backend มี integration รองรับ แต่ยังไม่มี API key หรือ feed ที่พร้อมใช้งาน'
    : 'ผล enrichment จาก AbuseIPDB, OTX, Shodan, VirusTotal หรือ feed ภายใน'

  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      icon={<ThreatIntelRoundedIcon />}
      accent="#38BDF8"
      empty={
        <EmptyState
          title="Threat Intelligence ยังไม่มีข้อมูล"
          description="ถ้า query นี้เป็น IP, Domain หรือ Hash แต่ยังไม่พบผล ให้ตรวจสอบว่า backend enrichment ถูกตั้งค่าแล้ว"
        />
      }
    >
      {!hasResults ? null : (
        <Grid container spacing={1.5}>
          {results?.map((result) => {
            const scoreColor = riskColor(result.score != null ? result.score / 10 : undefined)
            return (
              <Grid key={result.source} item xs={12} md={6}>
                <Box
                  sx={{
                    height: '100%',
                    p: 2,
                    borderRadius: '18px',
                    bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ fontSize: 15, fontWeight: 800, textTransform: 'capitalize' }}>{result.source}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{result.verdict ?? 'ไม่มี verdict'}</Typography>
                    </Box>
                    <Chip
                      label={statusLabel(result.status)}
                      size="small"
                      color={result.status === 'available' ? 'success' : result.status === 'not_configured' ? 'warning' : 'default'}
                    />
                  </Stack>

                  <Stack direction="row" spacing={1.2} useFlexGap sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                    {result.score != null && (
                      <Box sx={{ px: 1.2, py: 1, borderRadius: '14px', bgcolor: `${scoreColor}15`, border: `1px solid ${scoreColor}25` }}>
                        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                          Reputation
                        </Typography>
                        <Typography sx={{ fontSize: 18, color: scoreColor, fontWeight: 900, fontFamily: '"IBM Plex Mono", monospace' }}>
                          {result.score}
                        </Typography>
                      </Box>
                    )}
                    {result.country && (
                      <Box sx={{ px: 1.2, py: 1, borderRadius: '14px', bgcolor: 'rgba(56,189,248,0.12)' }}>
                        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                          GeoIP
                        </Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{result.country}</Typography>
                      </Box>
                    )}
                    {result.asn && (
                      <Box sx={{ px: 1.2, py: 1, borderRadius: '14px', bgcolor: 'rgba(123,91,164,0.12)' }}>
                        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                          ASN
                        </Typography>
                        <MonoValue value={result.asn} />
                      </Box>
                    )}
                  </Stack>

                  <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                    {result.organization && (
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        <PublicRoundedIcon sx={{ fontSize: 14, mr: 0.75, verticalAlign: 'text-bottom' }} />
                        {result.organization}
                      </Typography>
                    )}
                    {result.lastSeen && (
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Last seen: {result.lastSeen}</Typography>
                    )}
                  </Stack>

                  {result.tags?.length ? (
                    <Stack direction="row" spacing={0.8} useFlexGap sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                      {result.tags.slice(0, 8).map((tag) => (
                        <Chip key={`${result.source}-${tag}`} label={tag} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  ) : null}

                  {result.references?.length ? (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.6 }}>
                        References
                      </Typography>
                      <Stack spacing={0.5}>
                        {result.references.slice(0, 4).map((reference) => (
                          <Typography key={reference} sx={{ fontSize: 12, color: 'text.secondary' }}>
                            {reference}
                          </Typography>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}
                </Box>
              </Grid>
            )
          })}
        </Grid>
      )}
    </SectionCard>
  )
}

export default ThreatIntelPanel
