import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined'
import GppBadOutlinedIcon from '@mui/icons-material/GppBadOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import { EmptyState, LoadingSpinner } from '../../common/CommonComponents'
import { SectionCard } from '../../ui/SectionCard'
import MetricCard from '../../ui/MetricCard'
import { ContentGrid } from '../../ui/layout'
import { BRAND, SEV_COLOR } from '../../ui/tokens'
import { formatCompactNumber, formatDateTime } from '../complianceUtils'
import { FrameBadge, StatChip, THCell } from '../compliancePrimitives'

interface ScaTabProps {
  scaQuery: any
  onSelectCheck: (check: any) => void
}

export function ScaTab({ scaQuery, onSelectCheck }: ScaTabProps) {
  if (scaQuery.isLoading) return <LoadingSpinner message="กำลังโหลด SCA checks และ failed controls..." />
  if (!scaQuery.data?.checks?.length) {
    return <EmptyState title="ไม่พบ SCA Checks" message="ยังไม่พบ SCA checks หรือ failed controls ที่ตรงกับ filter ปัจจุบัน" />
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <ContentGrid columns={4} gap="sm">
        <MetricCard title="นโยบาย SCA" value={formatCompactNumber(scaQuery.data.meta?.totalPolicies || 0)} subtitle="จาก Wazuh SCA" icon={<PolicyOutlinedIcon />} color={BRAND.primary} accent />
        <MetricCard title="ไม่ผ่าน" value={formatCompactNumber(scaQuery.data.summary?.failed || 0)} subtitle="จาก Wazuh SCA" icon={<GppBadOutlinedIcon />} color={SEV_COLOR.critical} accent />
        <MetricCard title="ผ่าน" value={formatCompactNumber(scaQuery.data.summary?.passed || 0)} subtitle="จาก Wazuh SCA" icon={<CheckCircleOutlinedIcon />} color={SEV_COLOR.low} accent />
        <MetricCard title="ไม่เกี่ยวข้อง" value={formatCompactNumber(scaQuery.data.summary?.notApplicable || 0)} subtitle="จาก Wazuh SCA" icon={<VerifiedOutlinedIcon />} color="#94a3b8" accent />
      </ContentGrid>

      <SectionCard title="ตาราง Failed Controls" subtitle="คลิกเพื่อดู rationale, remediation และคำสั่งที่เกี่ยวข้อง" accent={BRAND.primary} noPad>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <THCell>Agent</THCell>
                <THCell>Policy</THCell>
                <THCell>Control</THCell>
                <THCell>สถานะ</THCell>
                <THCell>มาตรฐาน</THCell>
                <THCell>สแกนล่าสุด</THCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scaQuery.data.checks.map((check: any) => (
                <TableRow key={check.id} hover sx={{ cursor: 'pointer', borderLeft: `3px solid ${SEV_COLOR.critical}60`,
                  '&:hover': { bgcolor: `${SEV_COLOR.critical}08` } }}
                  onClick={() => onSelectCheck(check)}>
                  <TableCell sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{check.affectedAgents?.[0] || '-'}</Typography>
                    <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>{check.policyId}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25, maxWidth: 160 }}>
                    <Typography sx={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {check.policyName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25, maxWidth: 260 }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, fontFamily: '"IBM Plex Mono"' }}>{check.controlId}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>
                      {check.title}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}><StatChip status={check.status} /></TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                      {(check.frameworks || []).map((f: string) => <FrameBadge key={f} id={f} />)}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 1.25, fontSize: 10.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {formatDateTime(check.lastSeen)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
    </Box>
  )
}

export default ScaTab
