import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, CircularProgress, FormControl, MenuItem, Select, SelectChangeEvent, useTheme } from '@mui/material'
import { useSnackbar } from 'notistack'
import { soarApi } from '../../../services/soarApi'
import {
  fallbackCaseStates,
  formatCaseStateLabel,
  getCaseStateMeta,
  getCaseStates,
  hexRgb,
  resolveCaseStateId,
} from '../soarUtils'

interface CaseStatusSelectProps {
  caseId: number
  stateId?: number | null
  stateName?: string | null
  closeDate?: string | null
  disabled?: boolean
  onUpdated?: () => void
}

export default function CaseStatusSelect({
  caseId,
  stateId,
  stateName,
  closeDate,
  disabled = false,
  onUpdated,
}: CaseStatusSelectProps) {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { data: caseStatesResp } = useQuery({
    queryKey: ['iris-case-states'],
    queryFn: () => soarApi.getIrisCaseStates().then((response) => response.data),
  })

  const caseStates = getCaseStates(
    Array.isArray(caseStatesResp?.data) ? caseStatesResp.data : fallbackCaseStates(),
  )
  const currentStateId = resolveCaseStateId({ stateId, stateName, closeDate, states: caseStates })
  const currentMeta = getCaseStateMeta({ stateId: currentStateId, stateName, closeDate, states: caseStates })

  const updateMut = useMutation({
    mutationFn: (nextStateId: number) => soarApi.setIrisCaseStatus(caseId, { state_id: nextStateId }),
    onSuccess: (_, nextStateId) => {
      const nextMeta = getCaseStateMeta({ stateId: nextStateId, states: caseStates })
      enqueueSnackbar(`อัปเดตสถานะเคสเป็น ${nextMeta.label} แล้ว`, { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['iris-cases'] })
      queryClient.invalidateQueries({ queryKey: ['iris-case-states'] })
      queryClient.invalidateQueries({ queryKey: ['iris-case-detail', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case-full', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case-activity', caseId] })
      queryClient.invalidateQueries({ queryKey: ['soar-stats'] })
      onUpdated?.()
    },
    onError: () => enqueueSnackbar('ไม่สามารถอัปเดตสถานะเคสใน IRIS ได้', { variant: 'error' }),
  })

  const handleChange = (event: SelectChangeEvent<number>) => {
    const nextStateId = Number(event.target.value)
    if (!nextStateId || nextStateId === currentStateId || updateMut.isPending) return
    updateMut.mutate(nextStateId)
  }

  return (
    <FormControl size="small" disabled={disabled || updateMut.isPending}>
      <Select<number>
        value={currentStateId}
        onChange={handleChange}
        displayEmpty
        sx={{
          minWidth: 182,
          height: 22,
          borderRadius: '999px',
          fontSize: 10,
          fontWeight: 700,
          bgcolor: `rgba(${hexRgb(currentMeta.color)},0.12)`,
          color: currentMeta.color,
          border: `1px solid rgba(${hexRgb(currentMeta.color)},0.28)`,
          '& .MuiSelect-select': {
            py: 0.25,
            pl: 1.2,
            pr: 3.5,
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          '& .MuiSelect-icon': { color: currentMeta.color, right: 8, fontSize: 18 },
          '&:hover': {
            bgcolor: `rgba(${hexRgb(currentMeta.color)},0.16)`,
          },
        }}
        renderValue={(selected) => {
          const meta = getCaseStateMeta({ stateId: Number(selected), states: caseStates })
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {updateMut.isPending ? (
                <CircularProgress size={10} sx={{ color: meta.color }} />
              ) : (
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: meta.color }} />
              )}
              <span>{meta.label}</span>
            </Box>
          )
        }}
        MenuProps={{
          slotProps: {
            paper: {
              sx: {
                borderRadius: 2,
                mt: 0.5,
                bgcolor: isDark ? '#1B1533' : '#FFFFFF',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.12)'}`,
              },
            },
          },
        }}
      >
        {caseStates.map((state) => {
          const meta = getCaseStateMeta({ stateId: state.state_id, stateName: state.state_name, states: caseStates })
          return (
            <MenuItem key={state.state_id} value={state.state_id} sx={{ fontSize: 12, color: meta.color }}>
              {formatCaseStateLabel(state.state_name)}
            </MenuItem>
          )
        })}
      </Select>
    </FormControl>
  )
}
