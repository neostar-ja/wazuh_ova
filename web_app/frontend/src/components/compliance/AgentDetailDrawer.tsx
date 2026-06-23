import { Box, Button, Card, CardContent, Grid, Tab, Table, TableBody, TableHead, TableRow, TableCell, Tabs, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import GppBadOutlinedIcon from '@mui/icons-material/GppBadOutlined'
import WifiTetheringErrorOutlinedIcon from '@mui/icons-material/WifiTetheringErrorOutlined'
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import { DetailPanel, EmptyState, LoadingSpinner } from '../common/CommonComponents'
import MetricCard from '../ui/MetricCard'
import { ContentGrid } from '../ui/layout'
import { BRAND, SEV_COLOR } from '../ui/tokens'
import { formatCompactNumber, formatDateTime, formatPercent } from './complianceUtils'
import { SevChip, StatChip, THCell } from './compliancePrimitives'

const AGENT_TAB_LABELS = ['ข้อมูลทั่วไป', 'Failed Controls', 'ช่องโหว่', 'Alerts ล่าสุด']

interface AgentDetailDrawerProps {
  agent: any | null
  onClose: () => void
  drawerTab: number
  setDrawerTab: (tab: number) => void
  scaQuery: any
  vulnerabilitiesQuery: any
  alertsQuery: any
  onSelectCheck: (check: any) => void
  isDark: boolean
}

export function AgentDetailDrawer({
  agent, onClose, drawerTab, setDrawerTab,
  scaQuery, vulnerabilitiesQuery, alertsQuery,
  onSelectCheck,
}: AgentDetailDrawerProps) {
  const navigate = useNavigate()

  return (
    <DetailPanel
      open={Boolean(agent)}
      onClose={onClose}
      title={agent?.name || 'รายละเอียดอุปกรณ์'}
      subtitle={agent ? `${agent.agentId} · ${agent.os}` : ''}
      width={760}
    >
      {agent && (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small" variant="outlined"
              endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />}
              onClick={() => navigate(`/alerts?agent=${encodeURIComponent(agent.name)}`)}
              sx={{ borderRadius: '9px', fontSize: 11, borderColor: `${BRAND.primary}40`, color: BRAND.primary, '&:hover': { borderColor: BRAND.primary, bgcolor: `${BRAND.primary}0c` } }}
            >
              ดู Alerts ของอุปกรณ์นี้
            </Button>
          </Box>

          <ContentGrid variant="auto-fit" minCardWidth={150} gap="sm">
            <MetricCard title="คะแนน Compliance" value={agent.score === null ? 'N/A' : formatPercent(agent.score)} icon={<ShieldOutlinedIcon />} color={BRAND.primary} accent />
            <MetricCard title="ไม่ผ่าน SCA" value={formatCompactNumber(agent.failedChecks)} icon={<GppBadOutlinedIcon />} color={SEV_COLOR.critical} accent />
            <MetricCard title="High/Critical" value={formatCompactNumber((agent.highAlerts || 0) + (agent.criticalAlerts || 0))} icon={<WifiTetheringErrorOutlinedIcon />} color={SEV_COLOR.high} accent />
            <MetricCard title="CVEs ที่เปิดอยู่" value={formatCompactNumber(agent.vulnerabilities)} icon={<BugReportOutlinedIcon />} color={BRAND.accent} accent />
          </ContentGrid>

          <Card variant="outlined">
            <Tabs value={drawerTab} onChange={(_, v) => setDrawerTab(v)} variant="scrollable" scrollButtons="auto"
              sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 12 }, '& .Mui-selected': { color: BRAND.primary }, '& .MuiTabs-indicator': { bgcolor: BRAND.primary } }}>
              {AGENT_TAB_LABELS.map(l => <Tab key={l} label={l} />)}
            </Tabs>
            <CardContent>
              {drawerTab === 0 && (
                <Grid container spacing={2}>
                  {[
                    { label: 'ชื่ออุปกรณ์', val: agent.name },
                    { label: 'สถานะ', val: <StatChip status={agent.status} /> },
                    { label: 'IP / กลุ่ม', val: `${agent.ip} · ${agent.group}` },
                    { label: 'OS / เวอร์ชัน', val: `${agent.os} ${agent.osVersion || ''} · ${agent.version}` },
                    { label: 'พบออนไลน์ล่าสุด', val: formatDateTime(agent.lastSeen) },
                    { label: 'สแกน SCA ล่าสุด', val: formatDateTime(agent.lastScan) },
                  ].map(({ label, val }) => (
                    <Grid item xs={12} md={6} key={label}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.25 }}>{label}</Typography>
                      {typeof val === 'string' ? (
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{val}</Typography>
                      ) : val}
                    </Grid>
                  ))}
                </Grid>
              )}
              {drawerTab === 1 && (
                scaQuery.isLoading ? <LoadingSpinner message="กำลังโหลด..." /> :
                scaQuery.data?.checks?.length ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <THCell>Policy</THCell>
                        <THCell>Control</THCell>
                        <THCell>สถานะ</THCell>
                        <THCell>สแกนล่าสุด</THCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scaQuery.data.checks.map((check: any) => (
                        <TableRow key={check.id} hover sx={{ cursor: 'pointer' }} onClick={() => onSelectCheck(check)}>
                          <TableCell sx={{ py: 1, fontSize: 11 }}>{check.policyName}</TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, fontFamily: '"IBM Plex Mono"' }}>{check.controlId}</Typography>
                            <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{check.title}</Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1 }}><StatChip status={check.status} /></TableCell>
                          <TableCell sx={{ py: 1, fontSize: 10.5, color: 'text.secondary' }}>{formatDateTime(check.lastSeen)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <EmptyState title="ไม่มี SCA" message="ยังไม่มี SCA checks สำหรับอุปกรณ์นี้" />
              )}
              {drawerTab === 2 && (
                vulnerabilitiesQuery.isLoading ? <LoadingSpinner message="กำลังโหลด..." /> :
                vulnerabilitiesQuery.data?.items?.length ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <THCell>CVE</THCell>
                        <THCell>แพ็กเกจ</THCell>
                        <THCell>ระดับ</THCell>
                        <THCell>ตรวจพบ</THCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {vulnerabilitiesQuery.data.items.map((item: any) => (
                        <TableRow key={`${item.cve}-${item.packageName}`} hover>
                          <TableCell sx={{ py: 1, fontFamily: '"IBM Plex Mono"', fontSize: 11, fontWeight: 700 }}>{item.cve}</TableCell>
                          <TableCell sx={{ py: 1, fontSize: 11 }}>{item.packageName}</TableCell>
                          <TableCell sx={{ py: 1 }}><SevChip severity={item.severity} /></TableCell>
                          <TableCell sx={{ py: 1, fontSize: 10.5, color: 'text.secondary' }}>{formatDateTime(item.detectedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <EmptyState title="ไม่มีช่องโหว่" message="ไม่พบข้อมูล CVE สำหรับอุปกรณ์นี้" />
              )}
              {drawerTab === 3 && (
                alertsQuery.isLoading ? <LoadingSpinner message="กำลังโหลด..." /> :
                alertsQuery.data?.items?.length ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <THCell>เวลา</THCell>
                        <THCell>Rule</THCell>
                        <THCell>ระดับ</THCell>
                        <THCell>Groups</THCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {alertsQuery.data.items.map((item: any) => (
                        <TableRow key={item.id} hover>
                          <TableCell sx={{ py: 1, fontSize: 10.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDateTime(item.timestamp)}</TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, fontFamily: '"IBM Plex Mono"' }}>{item.ruleId}</Typography>
                            <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{item.description}</Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1 }}><SevChip severity={item.severity} /></TableCell>
                          <TableCell sx={{ py: 1, fontSize: 10, color: 'text.secondary' }}>
                            {(item.groups || []).slice(0, 4).join(', ') || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <EmptyState title="ไม่มี Alerts" message="ไม่พบ compliance alerts ที่เกี่ยวข้องกับอุปกรณ์นี้" />
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </DetailPanel>
  )
}

export default AgentDetailDrawer
