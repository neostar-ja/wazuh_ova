import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { EmptyState, LoadingSpinner } from '../../common/CommonComponents'
import { SectionCard } from '../../ui/SectionCard'
import { BRAND, SEV_COLOR } from '../../ui/tokens'
import { formatDateTime } from '../complianceUtils'
import { FrameBadge, StatChip, THCell } from '../compliancePrimitives'

interface EvidenceTabProps {
  evidenceQuery: any
}

export function EvidenceTab({ evidenceQuery }: EvidenceTabProps) {
  if (evidenceQuery.isLoading) return <LoadingSpinner message="กำลังโหลด audit evidence..." />
  if (!evidenceQuery.data?.items?.length) {
    return <EmptyState title="ไม่พบหลักฐาน Audit" message="ไม่พบ evidence ที่สามารถใช้สำหรับ audit ภายใต้ filter ปัจจุบัน" />
  }

  return (
    <SectionCard title="หลักฐาน Audit" subtitle="Evidence จาก SCA และ compliance-mapped alerts สำหรับ Auditor" accent={BRAND.primary} noPad>
      <TableContainer sx={{ maxHeight: 520 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <THCell>เวลา</THCell>
              <THCell>มาตรฐาน</THCell>
              <THCell>Control</THCell>
              <THCell>รายละเอียด</THCell>
              <THCell>แหล่งข้อมูล</THCell>
              <THCell>สถานะ</THCell>
              <THCell>อุปกรณ์</THCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {evidenceQuery.data.items.map((item: any) => {
              const color = item.status === 'passed' ? SEV_COLOR.low : item.status === 'failed' ? SEV_COLOR.critical : '#94a3b8'
              return (
                <TableRow key={item.id} hover
                  sx={{ borderLeft: `3px solid ${color}60`, '&:hover': { bgcolor: `${color}04` } }}>
                  <TableCell sx={{ py: 1.25, whiteSpace: 'nowrap', fontSize: 10.5, color: 'text.secondary' }}>
                    {formatDateTime(item.timestamp)}
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}><FrameBadge id={item.framework} /></TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono"', fontWeight: 700 }}>{item.controlId}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25, maxWidth: 260 }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 600, mb: 0.1 }}>{item.requirement}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>
                      {item.details}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25, fontSize: 11, color: 'text.secondary' }}>{item.evidenceSource}</TableCell>
                  <TableCell sx={{ py: 1.25 }}><StatChip status={item.status} /></TableCell>
                  <TableCell sx={{ py: 1.25, fontSize: 11, color: 'text.secondary' }}>{item.relatedAgents}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  )
}

export default EvidenceTab
