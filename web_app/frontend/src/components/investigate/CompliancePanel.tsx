import { Box, Chip, Grid, Stack, Typography } from '@mui/material'
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded'
import type { InvestigationComplianceSummary } from '../../types'
import EmptyState from '../ui/EmptyState'
import MetricCard from '../ui/MetricCard'
import SectionCard from '../ui/SectionCard'

interface CompliancePanelProps {
  summary?: InvestigationComplianceSummary
}

export function CompliancePanel({ summary }: CompliancePanelProps) {
  return (
    <SectionCard
      title="Compliance Context"
      subtitle="ผลกระทบด้าน PCI-DSS, HIPAA, NIST, CIS หรือ framework ที่ backend มีจริง"
      icon={<FactCheckRoundedIcon />}
      accent="#EAB308"
      empty={
        <EmptyState
          title="ยังไม่พบ compliance context"
          description="query นี้ยังไม่เชื่อมโยงกับ compliance evidence หรือ backend ยังไม่ส่ง framework mapping สำหรับผลลัพธ์นี้"
        />
      }
    >
      {!summary ? null : (
        <Stack spacing={2}>
          <Grid container spacing={1.25}>
            <Grid item xs={12} md={4}>
              <MetricCard title="Evidence Items" value={summary.evidenceItems} color="#38BDF8" compact accent />
            </Grid>
            <Grid item xs={12} md={4}>
              <MetricCard title="Failed SCA" value={summary.failedScaChecks} color="#EAB308" compact accent />
            </Grid>
            <Grid item xs={12} md={4}>
              <MetricCard title="Open Vulnerabilities" value={summary.openVulnerabilities} color="#EF4444" compact accent />
            </Grid>
          </Grid>

          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
              Matched Controls / Frameworks
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {summary.frameworks.length > 0 ? (
                summary.frameworks.map((framework) => (
                  <Chip
                    key={framework.name}
                    label={`${framework.name} · ${framework.count}`}
                    sx={{
                      fontWeight: 700,
                      bgcolor: 'rgba(234,179,8,0.12)',
                      border: '1px solid rgba(234,179,8,0.2)',
                    }}
                  />
                ))
              ) : (
                <Chip label="No framework match" />
              )}
            </Stack>
          </Box>

          <Box sx={{ p: 2, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.7 }}>
              เหมาะสำหรับ analyst และ audit workflow ที่ต้อง trace ว่า alert ชุดนี้เกี่ยวข้องกับ control ใดบ้าง และมี SCA/Vulnerability
              supporting evidence แค่ไหนในระดับ host
            </Typography>
          </Box>
        </Stack>
      )}
    </SectionCard>
  )
}

export default CompliancePanel
