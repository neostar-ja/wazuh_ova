import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { EmptyState, LoadingSpinner } from '../../common/CommonComponents'
import { SectionCard } from '../../ui/SectionCard'
import { BRAND } from '../../ui/tokens'
import { formatDateTime, SEVERITY_COLORS } from '../complianceUtils'
import { FrameBadge, SevChip, THCell } from '../compliancePrimitives'

interface AlertsTabProps {
  alertsQuery: any
}

export function AlertsTab({ alertsQuery }: AlertsTabProps) {
  const navigate = useNavigate()

  if (alertsQuery.isLoading) return <LoadingSpinner message="กำลังโหลด compliance-related alerts..." />
  if (!alertsQuery.data?.items?.length) {
    return <EmptyState title="ไม่พบ Compliance Alerts" message="ไม่พบ alert ที่เกี่ยวข้องกับ compliance ภายใต้ filter ปัจจุบัน" />
  }

  return (
    <SectionCard title="การแจ้งเตือนที่เกี่ยวข้องกับ Compliance" subtitle="Alerts จาก Wazuh/OpenSearch ที่มี compliance mapping · คลิก Rule เพื่อดู Alerts" accent={BRAND.primary} noPad>
      <TableContainer sx={{ maxHeight: 520 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <THCell>เวลา</THCell>
              <THCell>Rule</THCell>
              <THCell>ระดับ</THCell>
              <THCell>Agent</THCell>
              <THCell>IP</THCell>
              <THCell>Groups</THCell>
              <THCell>Compliance</THCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alertsQuery.data.items.map((alert: any) => {
              const color = SEVERITY_COLORS[alert.severity] || '#64748b'
              return (
                <TableRow key={alert.id} hover
                  sx={{ borderLeft: `3px solid ${color}60`, '&:hover': { bgcolor: `${color}04` } }}>
                  <TableCell sx={{ py: 1.25, whiteSpace: 'nowrap', fontSize: 10.5, color: 'text.secondary' }}>
                    {formatDateTime(alert.timestamp)}
                  </TableCell>
                  <TableCell sx={{ py: 1.25, maxWidth: 240 }}>
                    <Typography
                      sx={{ fontSize: 11.5, fontWeight: 700, fontFamily: '"IBM Plex Mono"', cursor: 'pointer',
                        '&:hover': { color: BRAND.primary, textDecoration: 'underline' } }}
                      onClick={() => navigate(`/alerts?rule_id=${alert.ruleId}`)}
                    >
                      {alert.ruleId}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 230 }}>
                      {alert.description}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}><SevChip severity={alert.severity} /></TableCell>
                  <TableCell sx={{ py: 1.25, fontSize: 11.5, fontWeight: 600 }}>{alert.agent}</TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono"', color: BRAND.primaryLight }}>{alert.sourceIp || '—'}</Typography>
                    <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>{alert.destinationIp || ''}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25, maxWidth: 140 }}>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(alert.groups || []).slice(0, 3).join(', ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                      {Object.entries(alert.compliance || {}).slice(0, 2).map(([name]) => (
                        <FrameBadge key={`${alert.id}-${name}`} id={name} />
                      ))}
                    </Box>
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

export default AlertsTab
