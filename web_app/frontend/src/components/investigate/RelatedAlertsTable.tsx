import { useMemo, useState } from 'react'
import {
  Box,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import type { InvestigationAlert, InvestigationSeverity } from '../../types'
import EmptyState from '../ui/EmptyState'
import SectionCard from '../ui/SectionCard'
import { CopyValueButton, MonoValue, SeverityChip, formatCompactTimestamp } from './utils'

interface RelatedAlertsTableProps {
  alerts: InvestigationAlert[]
  onSelectAlert: (alert: InvestigationAlert) => void
  techniqueFilter?: string | null
  onClearTechniqueFilter?: () => void
}

export function RelatedAlertsTable({ alerts, onSelectAlert, techniqueFilter, onClearTechniqueFilter }: RelatedAlertsTableProps) {
  const [severity, setSeverity] = useState<InvestigationSeverity>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const filtered = useMemo(() => {
    let base = severity === 'all' ? alerts : alerts.filter((alert) => alert.severity === severity)
    if (techniqueFilter) {
      base = base.filter((alert) => [...(alert.mitreTactics ?? []), ...(alert.mitreTechniques ?? [])].includes(techniqueFilter))
    }
    return [...base].sort((left, right) => right.timestamp.localeCompare(left.timestamp))
  }, [alerts, severity, techniqueFilter])

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <SectionCard
      title="Related Alerts"
      subtitle="เหตุการณ์ที่เกี่ยวข้องกับ entity นี้ พร้อมเปิดรายละเอียดเชิงลึกต่อแถวได้"
      icon={<NotificationsActiveRoundedIcon />}
      accent="#F17422"
      action={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {techniqueFilter ? (
            <Chip
              label={`MITRE: ${techniqueFilter}`}
              onDelete={onClearTechniqueFilter}
              size="small"
              sx={{ maxWidth: 180 }}
            />
          ) : null}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={severity}
              label="Severity"
              onChange={(event) => {
                setSeverity(event.target.value as InvestigationSeverity)
                setPage(0)
              }}
            >
              <MenuItem value="all">ทุกระดับ</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="info">Info</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      }
      empty={<EmptyState title="ไม่พบ related alerts" description="ไม่พบ alert ที่สัมพันธ์กับ query นี้ในช่วงเวลาที่เลือก" />}
      noPad
    >
      {alerts.length === 0 ? null : (
        <Box>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Rule ID</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>Decoder</TableCell>
                <TableCell>MITRE</TableCell>
                <TableCell>Compliance</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((alert) => (
                <TableRow key={alert.id} hover onClick={() => onSelectAlert(alert)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ minWidth: 126 }}>
                    <MonoValue value={formatCompactTimestamp(alert.timestamp)} />
                  </TableCell>
                  <TableCell><SeverityChip severity={alert.severity} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <MonoValue value={alert.ruleId} />
                      <CopyValueButton value={alert.ruleId} />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{alert.description}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Typography sx={{ fontSize: 12 }}>{alert.agentName ?? '—'}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    {alert.sourceIp ? (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <MonoValue value={alert.sourceIp} />
                        <CopyValueButton value={alert.sourceIp} />
                      </Stack>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    {alert.destinationIp ? (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <MonoValue value={alert.destinationIp} />
                        <CopyValueButton value={alert.destinationIp} />
                      </Stack>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{alert.decoder ?? '—'}</TableCell>
                  <TableCell sx={{ minWidth: 170 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {[...(alert.mitreTactics ?? []), ...(alert.mitreTechniques ?? [])].slice(0, 2).join(', ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 180 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {alert.compliance?.slice(0, 2).join(', ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="เปิดรายละเอียด">
                      <IconButton size="small" onClick={(event) => { event.stopPropagation(); onSelectAlert(alert) }}>
                        <OpenInFullRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </Box>
      )}
    </SectionCard>
  )
}

export default RelatedAlertsTable
