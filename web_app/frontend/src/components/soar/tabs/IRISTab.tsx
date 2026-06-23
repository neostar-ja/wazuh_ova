import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Typography, Stack, Button, Link } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { IrisAlert, IrisCase, soarApi } from '../../../services/soarApi'
import { hexRgb } from '../soarUtils'
import { BRAND } from '../../ui/tokens'
import AlertsTable from '../iris/AlertsTable'
import CasesTable from '../iris/CasesTable'
import CreateAlertDialog from '../iris/CreateAlertDialog'
import CreateCaseDialog from '../iris/CreateCaseDialog'

interface Props {
  irisUrl?: string
}

export default function IRISTab({ irisUrl }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const [view, setView] = useState<'alerts' | 'cases'>('alerts')
  const [createAlertOpen, setCreateAlertOpen] = useState(false)
  const [createCaseOpen, setCreateCaseOpen] = useState(false)
  const [alertPage, setAlertPage] = useState(0)
  const [alertRowsPerPage, setAlertRowsPerPage] = useState(10)
  const [alertSearchInput, setAlertSearchInput] = useState('')
  const [alertSearch, setAlertSearch] = useState('')
  const [alertSeverityId, setAlertSeverityId] = useState('')
  const [alertStatusId, setAlertStatusId] = useState('')

  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'

  const { data: alertsResp, isLoading: alertsLoading } = useQuery({
    queryKey: ['iris-alerts', alertPage, alertRowsPerPage, alertSearch, alertSeverityId, alertStatusId],
    queryFn: () => soarApi.getIrisAlerts({
      page: alertPage + 1,
      per_page: alertRowsPerPage,
      q: alertSearch || undefined,
      severity_id: alertSeverityId ? Number(alertSeverityId) : undefined,
      status_id: alertStatusId ? Number(alertStatusId) : undefined,
    }).then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: casesResp, isLoading: casesLoading } = useQuery({
    queryKey: ['iris-cases'],
    queryFn: () => soarApi.getIrisCases({ per_page: 50 }).then(r => r.data),
    refetchInterval: 60000,
  })

  const alerts: IrisAlert[] = alertsResp?.data?.alerts ?? []
  const alertTotal = alertsResp?.data?.total ?? alerts.length
  const cases: IrisCase[]   = casesResp?.data ?? []

  const submitAlertSearch = () => {
    setAlertPage(0)
    setAlertSearch(alertSearchInput.trim())
  }

  const resetAlertFilters = () => {
    setAlertPage(0)
    setAlertSearchInput('')
    setAlertSearch('')
    setAlertSeverityId('')
    setAlertStatusId('')
  }

  const tabs = [
    { key: 'alerts', labelTh: 'การแจ้งเตือน', icon: <NotificationsActiveRoundedIcon sx={{ fontSize: 13 }} />, count: alertTotal },
    { key: 'cases',  labelTh: 'เคสสอบสวน',    icon: <FolderOpenRoundedIcon sx={{ fontSize: 13 }} />,         count: cases.length },
  ]

  return (
    <Stack spacing={2} className="animate-fade-in">
      {/* Tab nav + actions */}
      <Box className="flex items-center justify-between flex-wrap gap-2">
        {/* Sub-tabs */}
        <Box className="flex items-center gap-1 p-1 rounded-xl"
          sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)' }}>
          {tabs.map(t => (
            <Box key={t.key}
              onClick={() => setView(t.key as 'alerts' | 'cases')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 text-xs font-semibold select-none"
              sx={{
                background: view === t.key ? BRAND.purple : 'transparent',
                color: view === t.key ? '#fff' : textMuted,
                '&:hover': view !== t.key ? { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,91,164,0.08)', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)' } : {},
              }}>
              {t.icon}
              {t.labelTh}
              <Box className="px-1.5 rounded-full text-[9px] font-bold"
                sx={{ background: view === t.key ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(123,91,164,0.12)'),
                      color: view === t.key ? '#fff' : textMuted }}>
                {t.count}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Action buttons */}
        <Box className="flex items-center gap-2 flex-wrap">
          {view === 'alerts' ? (
            <Button size="small" variant="outlined" startIcon={<AddRoundedIcon sx={{ fontSize: 13 }} />}
              onClick={() => setCreateAlertOpen(true)}
              sx={{ borderRadius: 2, fontSize: 11, fontWeight: 600,
                borderColor: `rgba(${hexRgb(BRAND.purple)},0.4)`, color: BRAND.purple,
                '&:hover': { borderColor: BRAND.purple, background: `rgba(${hexRgb(BRAND.purple)},0.06)` } }}>
              สร้างการแจ้งเตือน
            </Button>
          ) : (
            <Button size="small" variant="outlined" startIcon={<AddRoundedIcon sx={{ fontSize: 13 }} />}
              onClick={() => setCreateCaseOpen(true)}
              sx={{ borderRadius: 2, fontSize: 11, fontWeight: 600,
                borderColor: 'rgba(99,102,241,0.4)', color: '#6366F1',
                '&:hover': { borderColor: '#6366F1', background: 'rgba(99,102,241,0.06)' } }}>
              สร้างเคส
            </Button>
          )}
          {irisUrl && (
            <Link href={irisUrl} target="_blank" rel="noopener" underline="none"
              className="flex items-center gap-1 text-xs font-semibold"
              sx={{ color: BRAND.purple, '&:hover': { color: BRAND.purpleLight } }}>
              เปิด DFIR-IRIS <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
            </Link>
          )}
        </Box>
      </Box>

      {/* Content */}
      {view === 'alerts' && (
        <AlertsTable
          alerts={alerts}
          total={alertTotal}
          loading={alertsLoading}
          irisUrl={irisUrl}
          page={alertPage}
          rowsPerPage={alertRowsPerPage}
          searchInput={alertSearchInput}
          activeSearch={alertSearch}
          filterSev={alertSeverityId}
          filterStatus={alertStatusId}
          onSearchInputChange={setAlertSearchInput}
          onSearchSubmit={submitAlertSearch}
          onFilterSevChange={(value) => { setAlertSeverityId(value); setAlertPage(0) }}
          onFilterStatusChange={(value) => { setAlertStatusId(value); setAlertPage(0) }}
          onPageChange={setAlertPage}
          onRowsPerPageChange={(value) => { setAlertRowsPerPage(value); setAlertPage(0) }}
          onResetFilters={resetAlertFilters}
          onEscalated={() => setView('cases')}
        />
      )}
      {view === 'cases' && (
        <CasesTable cases={cases} loading={casesLoading} irisUrl={irisUrl} />
      )}

      {/* Dialogs */}
      <CreateAlertDialog open={createAlertOpen} onClose={() => setCreateAlertOpen(false)} />
      <CreateCaseDialog  open={createCaseOpen}  onClose={() => setCreateCaseOpen(false)} />
    </Stack>
  )
}
