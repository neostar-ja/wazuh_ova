import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from 'recharts'
import { EmptyState } from '../../common/CommonComponents'
import { SectionCard } from '../../ui/SectionCard'
import { ContentGrid } from '../../ui/layout'
import { BRAND, SEV_COLOR, getBorder, getChartTipStyle } from '../../ui/tokens'
import { FRAMEWORK_COLORS, formatCompactNumber, formatPercent, SEVERITY_COLORS } from '../complianceUtils'
import { FRAMEWORK_TH, FrameBadge, scoreColor, THCell } from '../compliancePrimitives'

interface OverviewTabProps {
  frameworks: any[]
  findingsBySeverity: any[]
  findingsByFramework: any[]
  timeline: any[]
  topFailedControls: any[]
  topRiskyAgents: any[]
  isDark: boolean
  onSelectFramework: (id: string) => void
  onSelectCheck: (check: any) => void
  onSelectAgent: (agent: any) => void
}

const SEV_TH: Record<string, string> = { critical: 'วิกฤต', high: 'สูง', medium: 'กลาง', low: 'ต่ำ', informational: 'ข้อมูล' }

export function OverviewTab({
  frameworks, findingsBySeverity, findingsByFramework, timeline,
  topFailedControls, topRiskyAgents, isDark,
  onSelectFramework, onSelectCheck, onSelectAgent,
}: OverviewTabProps) {
  const tickFill = isDark ? '#64748B' : '#94A3B8'
  const gridStroke = getBorder(isDark, 'subtle')

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {/* Framework score pills row */}
      {frameworks.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {frameworks.map((fw: any) => {
            const color = FRAMEWORK_COLORS[fw.frameworkId] || BRAND.primary
            const score = fw.score === null ? null : Number(fw.score)
            return (
              <Box key={fw.frameworkId}
                onClick={() => onSelectFramework(fw.frameworkId)}
                sx={{
                  cursor: 'pointer', px: 1.5, py: 0.75, borderRadius: 2,
                  border: `1.5px solid ${color}40`,
                  bgcolor: `${color}10`,
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: `${color}20`, borderColor: color },
                }}>
                <Typography sx={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '0.05em', mb: 0.25 }}>
                  {FRAMEWORK_TH[fw.frameworkId] || fw.frameworkName}
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1, fontFamily: '"IBM Plex Mono"' }}>
                  {score === null ? 'N/A' : `${Math.round(score)}%`}
                </Typography>
              </Box>
            )
          })}
        </Box>
      )}

      <ContentGrid columns={3} gap="md">
        {/* Severity donut */}
        <SectionCard title="การค้นพบตามระดับความรุนแรง" subtitle="Alerts และ vulnerabilities ในช่วงเวลาที่เลือก" accent={SEV_COLOR.critical}>
          {findingsBySeverity.length === 0 ? (
            <EmptyState title="ยังไม่มีข้อมูล" message="ไม่พบข้อมูล alert หรือ vulnerability" />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={findingsBySeverity} dataKey="count" nameKey="severity"
                    innerRadius={30} outerRadius={52} paddingAngle={2} startAngle={90} endAngle={-270}>
                    {findingsBySeverity.map((item: any) => (
                      <Cell key={item.severity} fill={SEVERITY_COLORS[item.severity] || '#64748b'} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={getChartTipStyle(isDark)} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ flex: 1 }}>
                {findingsBySeverity.map((item: any) => {
                  const color = SEVERITY_COLORS[item.severity] || '#64748b'
                  return (
                    <Box key={item.severity} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{SEV_TH[item.severity] || item.severity}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color, fontFamily: '"IBM Plex Mono"' }}>
                        {formatCompactNumber(item.count)}
                      </Typography>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          )}
        </SectionCard>

        {/* Framework score bar */}
        <SectionCard title="คะแนนตามมาตรฐาน" subtitle="เฉพาะ framework ที่มีข้อมูล control mapping" accent={BRAND.primary}>
          {findingsByFramework.length === 0 ? (
            <EmptyState title="ยังไม่มีข้อมูล" message="ยังไม่มีข้อมูล controls ที่ map กับ framework" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={findingsByFramework} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="frameworkName" tick={{ fontSize: 9, fill: tickFill }} axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v.replace('NIST 800-53', 'NIST').replace('ISO 27001', 'ISO').replace('MITRE ATT&CK', 'MITRE')} />
                <YAxis tick={{ fontSize: 9, fill: tickFill }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <RechartsTooltip contentStyle={getChartTipStyle(isDark)} formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'คะแนน']} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {findingsByFramework.map((item: any) => <Cell key={item.frameworkId} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Timeline */}
        <SectionCard title="แนวโน้ม Alerts" subtitle="ช่วงเวลาที่เลือก" accent={BRAND.primary}>
          {timeline.length === 0 ? (
            <EmptyState title="ยังไม่มีข้อมูล" message="ไม่มีข้อมูลย้อนหลังสำหรับแสดงแนวโน้ม" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="gbl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={BRAND.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="timestamp" tick={{ fontSize: 8, fill: tickFill }} axisLine={false} tickLine={false} hide />
                <YAxis tick={{ fontSize: 9, fill: tickFill }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={getChartTipStyle(isDark)} formatter={(v: any) => [formatCompactNumber(Number(v)), 'Alerts']} />
                <Area type="monotone" dataKey="count" stroke={BRAND.primary} strokeWidth={2}
                  fill="url(#gbl)" dot={false} name="Alerts" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </ContentGrid>

      <ContentGrid columns={2} gap="md">
        {/* Top failed controls */}
        <SectionCard title="การตรวจสอบที่ล้มเหลวบ่อย" subtitle="SCA controls ที่พบปัญหาสูงสุดจาก Wazuh" accent={SEV_COLOR.critical} noPad>
          {topFailedControls.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <EmptyState title="ยังไม่พบ" message="ไม่มี failed controls ที่ตรงกับ filter ปัจจุบัน" />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <THCell>มาตรฐาน</THCell>
                  <THCell>Control</THCell>
                  <THCell align="right">จำนวน</THCell>
                  <THCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {topFailedControls.map((item: any) => {
                  const color = FRAMEWORK_COLORS[item.framework] || BRAND.primary
                  return (
                    <TableRow key={`${item.framework}-${item.controlId}`} hover
                      sx={{ borderLeft: `3px solid ${color}`, '&:hover': { bgcolor: `${color}06` } }}>
                      <TableCell sx={{ py: 1 }}><FrameBadge id={item.framework} /></TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.primary' }}>{item.controlId}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{item.title}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: SEV_COLOR.critical, fontFamily: '"IBM Plex Mono"' }}>
                          {formatCompactNumber(item.count)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Button size="small" onClick={() => onSelectCheck(item)}
                          sx={{ fontSize: 10, color: BRAND.primaryLight, '&:hover': { color: BRAND.primary } }}>
                          รายละเอียด
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </SectionCard>

        {/* Top risky agents */}
        <SectionCard title="อุปกรณ์ที่มีความเสี่ยงสูง" subtitle="เรียงตามคะแนน, failed checks, alerts และ CVE" accent={BRAND.primary} noPad>
          {topRiskyAgents.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <EmptyState title="ยังไม่พบ" message="ไม่มี agent ที่แสดงความเสี่ยงในช่วงเวลานี้" />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <THCell>อุปกรณ์</THCell>
                  <THCell>คะแนน</THCell>
                  <THCell align="right">ล้มเหลว</THCell>
                  <THCell align="right">CVEs</THCell>
                  <THCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {topRiskyAgents.slice(0, 10).map((agent: any) => {
                  const score = agent.score === null ? null : Number(agent.score)
                  const sc = scoreColor(score)
                  return (
                    <TableRow key={agent.agentId} hover
                      sx={{ borderLeft: `3px solid ${sc}50`, '&:hover': { bgcolor: `${sc}06` } }}>
                      <TableCell sx={{ py: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{agent.name}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{agent.os} · {agent.group}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: sc, fontFamily: '"IBM Plex Mono"' }}>
                          {score === null ? 'N/A' : formatPercent(score)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR.critical }}>
                          {formatCompactNumber(agent.failedChecks)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR.high }}>
                          {formatCompactNumber(agent.vulnerabilities)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Button size="small" onClick={() => onSelectAgent(agent)}
                          sx={{ fontSize: 10, color: BRAND.primaryLight, '&:hover': { color: BRAND.primary } }}>
                          ดูรายละเอียด
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </ContentGrid>
    </Box>
  )
}

export default OverviewTab
