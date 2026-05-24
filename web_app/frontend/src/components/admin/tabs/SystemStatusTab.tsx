import { useQuery } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import {
  Box, Button, Card, CardContent, Grid, Skeleton, Typography, useTheme,
} from '@mui/material'
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import { format, formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { adminApi } from '../../../services/api'
import { BRAND, SectionHeader } from '../shared'

const DAEMON_LABELS: Record<string, { label: string; desc: string }> = {
  'wazuh-analysisd':    { label: 'Analysis',     desc: 'วิเคราะห์ log และ trigger alerts' },
  'wazuh-remoted':      { label: 'Remote',        desc: 'รับ log จาก agents' },
  'wazuh-logcollector': { label: 'Log Collector', desc: 'เก็บ log จาก local files' },
  'wazuh-syscheckd':    { label: 'Syscheck',      desc: 'ตรวจสอบความเปลี่ยนแปลงไฟล์' },
  'wazuh-monitord':     { label: 'Monitor',       desc: 'ตรวจสอบ agent connections' },
  'wazuh-db':           { label: 'Database',      desc: 'ฐานข้อมูล SQLite' },
  'wazuh-authd':        { label: 'Auth',          desc: 'ลงทะเบียน agents' },
  'wazuh-modulesd':     { label: 'Modules',       desc: 'Wodles และ vulnerability detection' },
  'wazuh-execd':        { label: 'Exec',          desc: 'Active response execution' },
  'wazuh-maild':        { label: 'Mail',          desc: 'Email notifications' },
  'wazuh-clusterd':     { label: 'Cluster',       desc: 'Cluster node communication' },
  'wazuh-apid':         { label: 'API',           desc: 'REST API server' },
  'wazuh-reportd':      { label: 'Report',        desc: 'สร้างรายงาน' },
}

function StatBox({ value, label, color }: { value: any; label: string; color: string }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  return (
    <Box sx={{
      textAlign: 'center', p: { xs: 1.5, sm: 2 }, borderRadius: 2.5,
      bgcolor: alpha(color, isDark ? 0.14 : 0.07),
      border: `1px solid ${alpha(color, isDark ? 0.3 : 0.2)}`,
      transition: 'all 0.2s',
      '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 4px 16px ${alpha(color, 0.2)}` },
    }}>
      <Typography sx={{
        fontSize: { xs: 28, sm: 34 }, fontWeight: 900, color,
        lineHeight: 1, fontFamily: '"IBM Plex Mono",monospace', letterSpacing: '-0.02em',
      }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5, fontWeight: 600, letterSpacing: '0.04em' }}>
        {label}
      </Typography>
    </Box>
  )
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: '"IBM Plex Mono",monospace', color: 'text.primary' }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

export function SystemStatusTab() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: () => adminApi.getSystemStatus().then(r => r.data),
    refetchInterval: 60000,
    staleTime: 30000,
  })

  const managerInfo  = data?.manager_info?.data?.affected_items?.[0] || {}
  const daemonList   = data?.manager_status?.data?.affected_items?.[0] || {}
  const agentSummary = data?.agents_summary?.data?.affected_items?.[0] || {}

  const runningCount = Object.values(daemonList).filter(v => v === 'running').length
  const stoppedCount = Object.values(daemonList).filter(v => v !== 'running' && v !== undefined).length
  const totalDaemons = Object.keys(daemonList).length

  const agentStats = [
    { label: 'ทั้งหมด',          value: agentSummary.total            ?? '—', color: BRAND.purple },
    { label: 'ออนไลน์',          value: agentSummary.active           ?? '—', color: '#22C55E' },
    { label: 'ขาดการเชื่อมต่อ',  value: agentSummary.disconnected     ?? '—', color: '#EF4444' },
    { label: 'รอดำเนินการ',       value: agentSummary.pending          ?? '—', color: '#EAB308' },
    { label: 'ไม่เคยเชื่อมต่อ',  value: agentSummary.never_connected  ?? '—', color: '#94A3B8' },
  ]

  return (
    <Box>
      <SectionHeader
        icon={<MonitorHeartRoundedIcon fontSize="small" />}
        title="สถานะระบบ Wazuh"
        color="#22C55E"
        action={
          <Button size="small" variant="outlined" startIcon={<RefreshRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={() => refetch()} sx={{ borderRadius: 2, fontSize: 12, height: 32 }}>
            รีเฟรช
          </Button>
        }
      />

      {isLoading ? (
        <Box sx={{ mt: 2.5 }}>
          <Grid container spacing={2}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}><Skeleton height={80} variant="rounded" sx={{ borderRadius: 2 }} /></Grid>
            ))}
          </Grid>
        </Box>
      ) : (
        <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Top row: Manager Info + Agent Summary */}
          <Grid container spacing={2}>

            {/* Manager Info */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{
                borderRadius: 2.5, height: '100%',
                borderLeft: `3px solid ${BRAND.purple}`,
                bgcolor: alpha(BRAND.purple, isDark ? 0.04 : 0.02),
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      bgcolor: '#22C55E', boxShadow: `0 0 8px #22C55E`,
                    }} />
                    <Typography sx={{
                      fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.1em', color: BRAND.purpleLight,
                    }}>
                      Wazuh Manager
                    </Typography>
                    {managerInfo.version && (
                      <Box sx={{
                        ml: 'auto', px: 0.75, py: 0.25, borderRadius: 1,
                        bgcolor: alpha(BRAND.purple, 0.15), color: BRAND.purple,
                        fontSize: 10.5, fontWeight: 700, fontFamily: '"IBM Plex Mono",monospace',
                      }}>
                        {managerInfo.version}
                      </Box>
                    )}
                  </Box>
                  <Grid container spacing={2}>
                    {[
                      ['Type', managerInfo.type],
                      ['Architecture', managerInfo.architecture],
                      ['OpenSSL', managerInfo.openssl_support],
                      ['Max Agents', managerInfo.max_agents],
                      ['Compile Date', managerInfo.compilation_date
                        ? format(new Date(managerInfo.compilation_date), 'dd MMM yyyy', { locale: th }) : null],
                      ['Install Date', managerInfo.installation_date
                        ? format(new Date(managerInfo.installation_date), 'dd MMM yyyy', { locale: th }) : null],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <Grid item xs={6} key={k as string}>
                        <InfoRow label={k as string} value={v} />
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Agent Summary */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{
                borderRadius: 2.5, height: '100%',
                borderLeft: '3px solid #22C55E',
                bgcolor: alpha('#22C55E', isDark ? 0.04 : 0.02),
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      bgcolor: '#22C55E', boxShadow: '0 0 8px #22C55E',
                      animation: 'pulse 2s infinite',
                    }} />
                    <Typography sx={{
                      fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.1em', color: '#22C55E',
                    }}>
                      Agents Summary
                    </Typography>
                  </Box>
                  <Grid container spacing={1.25}>
                    {agentStats.map(s => (
                      <Grid item xs={4} key={s.label}>
                        <StatBox value={s.value} label={s.label} color={s.color} />
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Daemon Status */}
          <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Typography sx={{
                  fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'text.secondary', flex: 1,
                }}>
                  Daemon Status
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22C55E', boxShadow: '0 0 6px #22C55E80' }} />
                    <Typography sx={{ fontSize: 11.5, color: '#22C55E', fontWeight: 600 }}>
                      {runningCount} running
                    </Typography>
                  </Box>
                  {stoppedCount > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#EF4444' }} />
                      <Typography sx={{ fontSize: 11.5, color: '#EF4444', fontWeight: 600 }}>
                        {stoppedCount} stopped
                      </Typography>
                    </Box>
                  )}
                  {totalDaemons > 0 && (
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                      / {totalDaemons} total
                    </Typography>
                  )}
                </Box>
              </Box>

              <Grid container spacing={1.25}>
                {Object.entries(daemonList).sort(([a], [b]) => a.localeCompare(b)).map(([name, status]) => {
                  const isRunning = status === 'running'
                  const meta = DAEMON_LABELS[name] || { label: name.replace('wazuh-', ''), desc: '' }
                  return (
                    <Grid item xs={12} sm={6} md={4} key={name}>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1.25, p: 1.375,
                        borderRadius: 2,
                        bgcolor: isRunning
                          ? alpha('#22C55E', isDark ? 0.08 : 0.05)
                          : alpha('#EF4444', isDark ? 0.1 : 0.06),
                        border: `1px solid ${alpha(isRunning ? '#22C55E' : '#EF4444', 0.2)}`,
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: isRunning
                            ? alpha('#22C55E', isDark ? 0.12 : 0.08)
                            : alpha('#EF4444', isDark ? 0.14 : 0.09),
                        },
                      }}>
                        <Box sx={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          bgcolor: isRunning ? '#22C55E' : '#EF4444',
                          boxShadow: isRunning
                            ? '0 0 7px rgba(34,197,94,0.7)'
                            : '0 0 5px rgba(239,68,68,0.5)',
                        }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: isRunning ? '#22C55E' : '#EF4444', lineHeight: 1.2 }}>
                            {meta.label}
                          </Typography>
                          <Typography sx={{
                            fontSize: 10, color: 'text.disabled',
                            fontFamily: '"IBM Plex Mono",monospace',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {name}
                          </Typography>
                        </Box>
                        <Box sx={{
                          px: 0.75, py: 0.25, borderRadius: 1, flexShrink: 0,
                          bgcolor: alpha(isRunning ? '#22C55E' : '#EF4444', 0.15),
                          color: isRunning ? '#22C55E' : '#EF4444',
                          fontSize: 10, fontWeight: 700, fontFamily: '"IBM Plex Mono",monospace',
                        }}>
                          {isRunning ? 'OK' : String(status)}
                        </Box>
                      </Box>
                    </Grid>
                  )
                })}
              </Grid>

              {Object.keys(daemonList).length === 0 && (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <ErrorOutlineRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
                  <Typography variant="body2" color="text.disabled" fontWeight={500}>
                    ไม่สามารถดึงข้อมูล daemon status ได้
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {dataUpdatedAt && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'right', fontSize: 11 }}>
              อัปเดตเมื่อ {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true, locale: th })}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}
