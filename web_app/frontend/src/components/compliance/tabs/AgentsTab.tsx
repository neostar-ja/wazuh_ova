import { Box, LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { EmptyState, LoadingSpinner } from '../../common/CommonComponents'
import { SectionCard } from '../../ui/SectionCard'
import { BRAND, SEV_COLOR } from '../../ui/tokens'
import { formatCompactNumber, formatDateTime, formatPercent } from '../complianceUtils'
import { scoreColor, StatChip, THCell } from '../compliancePrimitives'

interface AgentsTabProps {
  agentsQuery: any
  onSelectAgent: (agent: any) => void
}

export function AgentsTab({ agentsQuery, onSelectAgent }: AgentsTabProps) {
  const navigate = useNavigate()

  if (agentsQuery.isLoading) return <LoadingSpinner message="กำลังโหลด agent compliance posture..." />
  if (!agentsQuery.data?.items?.length) {
    return <EmptyState title="ไม่พบอุปกรณ์" message="ไม่พบ agent posture ที่ตรงกับ filter ปัจจุบัน" />
  }

  return (
    <SectionCard title="สถานะ Compliance ของอุปกรณ์" subtitle="คลิก agent เพื่อเปิดดูรายละเอียด failed controls, CVE และ alerts · คลิกชื่ออุปกรณ์เพื่อดู Alerts" accent={BRAND.primary} noPad>
      <TableContainer sx={{ maxHeight: 580 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <THCell>ชื่ออุปกรณ์</THCell>
              <THCell>IP / OS</THCell>
              <THCell>สถานะ</THCell>
              <THCell>กลุ่ม</THCell>
              <THCell>คะแนน</THCell>
              <THCell align="right">ล้มเหลว</THCell>
              <THCell align="right">วิกฤต</THCell>
              <THCell align="right">สูง</THCell>
              <THCell align="right">CVEs</THCell>
              <THCell>สแกนล่าสุด</THCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agentsQuery.data.items.map((agent: any) => {
              const score = agent.score === null ? null : Number(agent.score)
              const sc = agent.status === 'disconnected' ? '#94a3b8' : scoreColor(score)
              return (
                <TableRow key={agent.agentId} hover sx={{ cursor: 'pointer',
                  borderLeft: `3px solid ${agent.status === 'disconnected' ? `${SEV_COLOR.critical}40` : `${sc}50`}`,
                  '&:hover': { bgcolor: `${sc}06` } }}
                  onClick={() => onSelectAgent(agent)}>
                  <TableCell sx={{ py: 1.25 }}>
                    <Typography
                      sx={{ fontSize: 12, fontWeight: 700, '&:hover': { color: BRAND.primary, textDecoration: 'underline' } }}
                      onClick={e => { e.stopPropagation(); navigate(`/alerts?agent=${encodeURIComponent(agent.name)}`) }}
                    >
                      {agent.name}
                    </Typography>
                    <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>{agent.agentId}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono"' }}>{agent.ip}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{agent.os} {agent.osVersion || ''}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}><StatChip status={agent.status} /></TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{agent.group}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: sc, fontFamily: '"IBM Plex Mono"' }}>
                      {score === null ? 'N/A' : formatPercent(score)}
                    </Typography>
                    <LinearProgress variant="determinate" value={score || 0}
                      sx={{ mt: 0.25, height: 3, borderRadius: 99, bgcolor: `${sc}20`,
                        '& .MuiLinearProgress-bar': { bgcolor: sc } }} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR.critical }}>{formatCompactNumber(agent.failedChecks)}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR.critical }}>{formatCompactNumber(agent.criticalAlerts)}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR.high }}>{formatCompactNumber(agent.highAlerts)}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6' }}>{formatCompactNumber(agent.vulnerabilities)}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25, fontSize: 10.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {formatDateTime(agent.lastScan)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  )
}

export default AgentsTab
