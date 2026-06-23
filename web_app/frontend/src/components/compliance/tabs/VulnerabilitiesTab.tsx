import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import { EmptyState, LoadingSpinner } from '../../common/CommonComponents'
import { SectionCard } from '../../ui/SectionCard'
import MetricCard from '../../ui/MetricCard'
import { ContentGrid } from '../../ui/layout'
import { BRAND, SEV_COLOR } from '../../ui/tokens'
import { formatCompactNumber, formatDateTime, SEVERITY_COLORS } from '../complianceUtils'
import { SevChip, THCell } from '../compliancePrimitives'

interface VulnerabilitiesTabProps {
  vulnerabilitiesQuery: any
}

const SEV_TH: Record<string, string> = { critical: 'วิกฤต', high: 'สูง', medium: 'กลาง', low: 'ต่ำ' }

export function VulnerabilitiesTab({ vulnerabilitiesQuery }: VulnerabilitiesTabProps) {
  if (vulnerabilitiesQuery.isLoading) return <LoadingSpinner message="กำลังโหลด vulnerability compliance risk..." />
  if (!vulnerabilitiesQuery.data?.items?.length) {
    return <EmptyState title="ไม่พบข้อมูลช่องโหว่" message="Wazuh vulnerability detector ยังไม่มีข้อมูล หรือยังไม่ได้ตั้งค่า" />
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <ContentGrid columns={4} gap="sm">
        {(vulnerabilitiesQuery.data.summary?.bySeverity || []).map((item: any) => {
          const color = SEVERITY_COLORS[item.severity] || '#64748b'
          return (
            <MetricCard key={item.severity} title={`CVE ${SEV_TH[item.severity] || item.severity}`}
              value={formatCompactNumber(item.count)} subtitle="จาก Wazuh vulnerability detector"
              icon={<BugReportOutlinedIcon />} color={color} accent />
          )
        })}
      </ContentGrid>

      <SectionCard title="ช่องโหว่ที่ต้องแก้ไข" subtitle="CVE จาก Wazuh vulnerability module" accent={BRAND.primary} noPad>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <THCell>CVE</THCell>
                <THCell>แพ็กเกจ</THCell>
                <THCell>ความรุนแรง</THCell>
                <THCell>อุปกรณ์</THCell>
                <THCell>เวอร์ชันที่ติดตั้ง</THCell>
                <THCell>เวอร์ชันแก้ไข</THCell>
                <THCell>ตรวจพบ</THCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vulnerabilitiesQuery.data.items.map((item: any) => {
                const color = SEVERITY_COLORS[item.severity] || '#64748b'
                return (
                  <TableRow key={`${item.cve}-${item.agentId}`} hover
                    sx={{ borderLeft: `3px solid ${color}60`, '&:hover': { bgcolor: `${color}04` } }}>
                    <TableCell sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 800, fontFamily: '"IBM Plex Mono"', color: 'text.primary' }}>
                        {item.cve}
                      </Typography>
                      {item.references?.[0] && (
                        <Button size="small" href={item.references[0]} target="_blank" rel="noreferrer"
                          endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 11 }} />}
                          sx={{ fontSize: 9.5, color: BRAND.primary, p: 0, minWidth: 0, textTransform: 'none', '&:hover': { textDecoration: 'underline' } }}>
                          อ้างอิง
                        </Button>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono"' }}>{item.packageName}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}><SevChip severity={item.severity} /></TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{item.agentName}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{item.os}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.25, fontSize: 10.5, fontFamily: '"IBM Plex Mono"', color: 'text.secondary' }}>
                      {item.installedVersion}
                    </TableCell>
                    <TableCell sx={{ py: 1.25, fontSize: 10.5, fontFamily: '"IBM Plex Mono"', color: SEV_COLOR.low }}>
                      {item.fixedVersion || '—'}
                    </TableCell>
                    <TableCell sx={{ py: 1.25, fontSize: 10.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {formatDateTime(item.detectedAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
    </Box>
  )
}

export default VulnerabilitiesTab
