import { Box, Grid, LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { EmptyState } from '../../common/CommonComponents'
import { SectionCard } from '../../ui/SectionCard'
import { ContentGrid } from '../../ui/layout'
import { BRAND, SEV_COLOR } from '../../ui/tokens'
import { FRAMEWORK_COLORS, formatCompactNumber, formatPercent } from '../complianceUtils'
import { FRAMEWORK_TH, ScoreGauge, StatChip, THCell } from '../compliancePrimitives'

interface FrameworksTabProps {
  frameworks: any[]
  onSelectFramework: (id: string) => void
}

function FrameworkCard({ framework, onSelect }: { framework: any; onSelect: (id: string) => void }) {
  const color = FRAMEWORK_COLORS[framework.frameworkId] || BRAND.primary
  const score = framework.score === null ? null : Number(framework.score)
  return (
    <Box
      onClick={() => onSelect(framework.frameworkId)}
      sx={{
        cursor: 'pointer', height: '100%', overflow: 'hidden', borderRadius: 2,
        border: '1px solid', borderColor: 'divider',
        transition: 'all 0.22s ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 10px 28px ${color}22`, borderColor: `${color}60` },
      }}
    >
      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${color} 0%, ${color}70 100%)` }} />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary', mb: 0.25 }}>
              {FRAMEWORK_TH[framework.frameworkId] || framework.frameworkName}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', lineHeight: 1.4 }}>
              {framework.description}
            </Typography>
          </Box>
          <StatChip status={framework.status} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <ScoreGauge score={score} size={68} color={color} />
          <Box sx={{ flex: 1 }}>
            <Grid container spacing={1}>
              {[
                { label: 'ผ่าน', val: framework.passed, c: SEV_COLOR.low },
                { label: 'ไม่ผ่าน', val: framework.failed, c: SEV_COLOR.critical },
                { label: 'Critical/High', val: (framework.critical || 0) + (framework.high || 0), c: SEV_COLOR.high },
                { label: 'Alerts', val: framework.alertCount, c: BRAND.primary },
              ].map(item => (
                <Grid item xs={6} key={item.label}>
                  <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>{item.label}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: item.c }}>
                    {formatCompactNumber(item.val)}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>

        <LinearProgress
          variant="determinate"
          value={score || 0}
          sx={{
            height: 6, borderRadius: 999,
            bgcolor: `${color}18`,
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>0%</Typography>
          <Typography sx={{ fontSize: 9, color, fontWeight: 700 }}>
            {score === null ? 'N/A' : formatPercent(score)}
          </Typography>
          <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>100%</Typography>
        </Box>
      </Box>
    </Box>
  )
}

function ScoreTableSection({ frameworks, onSelectFramework }: { frameworks: any[]; onSelectFramework: (id: string) => void }) {
  if (!frameworks.length) return <EmptyState title="ยังไม่มีข้อมูล Framework" message="ระบบยังไม่พบข้อมูลควบคุมหรือ alert ที่ map กับ framework ที่เลือก" />
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <THCell>มาตรฐาน</THCell>
            <THCell>คะแนน</THCell>
            <THCell align="right">ผ่าน</THCell>
            <THCell align="right">ไม่ผ่าน</THCell>
            <THCell align="right">Alerts</THCell>
            <THCell>สถานะ</THCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {frameworks.map(item => {
            const color = FRAMEWORK_COLORS[item.frameworkId] || BRAND.primary
            return (
              <TableRow key={item.frameworkId} hover onClick={() => onSelectFramework(item.frameworkId)}
                sx={{ cursor: 'pointer', borderLeft: `3px solid ${color}`, '&:hover': { bgcolor: `${color}06` } }}>
                <TableCell sx={{ py: 1.25 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary' }}>
                    {FRAMEWORK_TH[item.frameworkId] || item.frameworkName}
                  </Typography>
                  <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: '"IBM Plex Mono"' }}>
                    {item.frameworkId}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.25, minWidth: 150 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color, mb: 0.3 }}>
                    {item.score === null ? 'N/A' : formatPercent(item.score)}
                  </Typography>
                  <LinearProgress variant="determinate" value={item.score || 0}
                    sx={{ height: 5, borderRadius: 999, bgcolor: `${color}18`,
                      '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 } }} />
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR.low }}>{formatCompactNumber(item.passed)}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR.critical }}>{formatCompactNumber(item.failed)}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.primaryLight }}>{formatCompactNumber(item.alertCount)}</Typography>
                </TableCell>
                <TableCell sx={{ py: 1.25 }}><StatChip status={item.status} /></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export function FrameworksTab({ frameworks, onSelectFramework }: FrameworksTabProps) {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <ContentGrid variant="auto-fit" minCardWidth={320} gap="md">
        {frameworks.map((item: any) => (
          <FrameworkCard key={item.frameworkId} framework={item} onSelect={onSelectFramework} />
        ))}
      </ContentGrid>
      <SectionCard title="ตารางสรุปมาตรฐาน" subtitle="คะแนน, failed controls และ alerts แต่ละมาตรฐาน" accent={BRAND.primary}>
        <ScoreTableSection frameworks={frameworks} onSelectFramework={onSelectFramework} />
      </SectionCard>
    </Box>
  )
}

export default FrameworksTab
