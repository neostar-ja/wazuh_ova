import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import {
  Alert, Box, Button, Card, CardContent, Checkbox, CircularProgress, Divider, FormControlLabel,
  Grid, IconButton, Paper, Skeleton, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography, useTheme,
} from '@mui/material'
import Editor from '@monaco-editor/react'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import { useSnackbar } from 'notistack'
import { adminApi } from '../../../services/api'
import { useThemeMode } from '../../../theme/ThemeContext'
import { SectionHeader } from '../shared'

const ACCENT = '#14B8A6'

interface PolicyFormState {
  policy_id: string
  index_pattern: string
  retention_days: string
  rollover_after_days: string
  rollover_max_primary_shard_size_gb: string
  description: string
  apply_to_existing: boolean
}

interface PolicyListItem {
  policy_id: string
  description?: string
  [key: string]: any
}

const DEFAULT_FORM: PolicyFormState = {
  policy_id: 'wazuh-alerts-60d-rollover',
  index_pattern: 'wazuh-alerts-4.x-*',
  retention_days: '60',
  rollover_after_days: '1',
  rollover_max_primary_shard_size_gb: '50',
  description: 'Wazuh alerts retention policy with rollover and 60-day delete',
  apply_to_existing: false,
}

function normalizePolicyListItem(entry: any): PolicyListItem {
  const policy = entry?.policy || entry
  return {
    policy_id: policy?.policy_id || policy?._id || entry?.policy_id || '',
    description: policy?.description || entry?.description || '',
    ...entry,
  }
}

function SettingRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      {children}
      {hint && <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{hint}</Typography>}
    </Box>
  )
}

export function ISMRetentionTab() {
  const { mode } = useThemeMode()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState<PolicyFormState>(DEFAULT_FORM)
  const [selectedPolicyId, setSelectedPolicyId] = useState('')

  const { data: policiesResponse, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-ism-policies'],
    queryFn: () => adminApi.listIsmPolicies().then(r => r.data),
    refetchInterval: 60000,
  })

  const policyItems: PolicyListItem[] = useMemo(() => {
    const raw = policiesResponse?.policies || []
    return raw.map(normalizePolicyListItem).filter((item: PolicyListItem) => item.policy_id)
  }, [policiesResponse])

  useEffect(() => {
    if (!selectedPolicyId && policyItems.length > 0) {
      setSelectedPolicyId(policyItems[0].policy_id)
    }
  }, [policyItems, selectedPolicyId])

  const previewPolicy = useMemo(() => {
    const retentionDays = Number(form.retention_days) || 60
    const rolloverAfterDays = Number(form.rollover_after_days) || 1
    const rolloverMaxGb = Number(form.rollover_max_primary_shard_size_gb) || 50
    return {
      policy: {
        policy_id: form.policy_id,
        description: form.description,
        schema_version: 1,
        default_state: 'hot',
        ism_template: [{ index_patterns: [form.index_pattern], priority: 100 }],
        states: [
          {
            name: 'hot',
            actions: [{ rollover: { min_primary_shard_size: `${rolloverMaxGb}gb`, min_index_age: `${rolloverAfterDays}d` } }],
            transitions: [{ state_name: 'warm', conditions: { min_index_age: `${rolloverAfterDays}d` } }],
          },
          {
            name: 'warm',
            actions: [{ read_only: {} }],
            transitions: [{ state_name: 'delete', conditions: { min_index_age: `${retentionDays}d` } }],
          },
          { name: 'delete', actions: [{ delete: {} }], transitions: [] },
        ],
      },
    }
  }, [form])

  const loadPolicy = async (policyId: string) => {
    try {
      const res = await adminApi.getIsmPolicy(policyId)
      const policy = res.data?.policy || res.data?.[0]?.policy || res.data
      const config = policy?.policy || policy
      setSelectedPolicyId(policyId)
      setForm({
        policy_id: config?.policy_id || policyId,
        index_pattern: config?.ism_template?.[0]?.index_patterns?.[0] || form.index_pattern,
        retention_days: String(config?.states?.[1]?.transitions?.[0]?.conditions?.min_index_age?.replace?.('d', '') || DEFAULT_FORM.retention_days),
        rollover_after_days: String(config?.states?.[0]?.transitions?.[0]?.conditions?.min_index_age?.replace?.('d', '') || DEFAULT_FORM.rollover_after_days),
        rollover_max_primary_shard_size_gb: String(config?.states?.[0]?.actions?.[0]?.rollover?.min_primary_shard_size?.replace?.('gb', '') || DEFAULT_FORM.rollover_max_primary_shard_size_gb),
        description: config?.description || DEFAULT_FORM.description,
        apply_to_existing: false,
      })
      enqueueSnackbar(`โหลด policy ${policyId} แล้ว`, { variant: 'success' })
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.detail || 'ไม่สามารถโหลด policy ได้', { variant: 'error' })
    }
  }

  const saveMut = useMutation({
    mutationFn: async () => adminApi.saveIsmPolicy(form.policy_id, {
      index_pattern: form.index_pattern,
      retention_days: Number(form.retention_days),
      rollover_after_days: Number(form.rollover_after_days),
      rollover_max_primary_shard_size_gb: Number(form.rollover_max_primary_shard_size_gb),
      description: form.description,
      apply_to_existing: form.apply_to_existing,
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-ism-policies'] })
      enqueueSnackbar('บันทึก ISM policy สำเร็จ', { variant: 'success' })
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.detail || 'บันทึก policy ไม่สำเร็จ', { variant: 'error' }),
  })

  const deleteMut = useMutation({
    mutationFn: (policyId: string) => adminApi.deleteIsmPolicy(policyId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-ism-policies'] })
      setSelectedPolicyId('')
      enqueueSnackbar('ลบ ISM policy สำเร็จ', { variant: 'success' })
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.detail || 'ลบ policy ไม่สำเร็จ', { variant: 'error' }),
  })

  return (
    <Box>
      <SectionHeader
        icon={<StorageRoundedIcon fontSize="small" />}
        title="ISM Retention"
        color={ACCENT}
        action={
          <Button size="small" variant="outlined"
            startIcon={isFetching ? <CircularProgress size={13} /> : <RefreshRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={() => refetch()}
            sx={{ borderRadius: 2, fontSize: 12, height: 32, borderColor: ACCENT, color: ACCENT,
              '&:hover': { borderColor: ACCENT, bgcolor: alpha(ACCENT, 0.08) } }}>
            รีเฟรช
          </Button>
        }
      />

      <Alert severity="info" sx={{ mt: 2, mb: 2.5, fontSize: 12, borderRadius: 1.75 }}>
        Wazuh บน OpenSearch เขียน index รายวัน · rollover จะมีผลเมื่อ index ใช้ write-path alias ·
        policy นี้ใช้ทำ <strong>retention {form.retention_days} วัน</strong> ได้ทันที
      </Alert>

      <Grid container spacing={2.5}>
        {/* Policy list + status */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, flex: 1 }}>Policies</Typography>
                  <Box sx={{
                    px: 0.75, height: 18, display: 'inline-flex', alignItems: 'center',
                    borderRadius: 1, bgcolor: alpha(ACCENT, 0.12), color: ACCENT,
                    fontSize: 11, fontWeight: 700, fontFamily: '"IBM Plex Mono",monospace',
                  }}>
                    {policiesResponse?.total_policies ?? policyItems.length}
                  </Box>
                </Box>

                {isLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={40} sx={{ borderRadius: 1.5 }} />)}
                  </Box>
                ) : policyItems.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" fontSize={12.5}>ยังไม่มี ISM policy</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.625 }}>
                    {policyItems.map(item => (
                      <Box
                        key={item.policy_id}
                        sx={{
                          p: 1.25, borderRadius: 1.75,
                          border: '1px solid',
                          borderColor: item.policy_id === selectedPolicyId
                            ? alpha(ACCENT, 0.4) : 'divider',
                          bgcolor: item.policy_id === selectedPolicyId
                            ? alpha(ACCENT, isDark ? 0.1 : 0.06) : 'transparent',
                          transition: 'all 0.15s',
                        }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{
                              fontSize: 12, fontWeight: 600,
                              fontFamily: '"IBM Plex Mono",monospace',
                              color: item.policy_id === selectedPolicyId ? ACCENT : 'text.primary',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.policy_id}
                            </Typography>
                            {item.description && (
                              <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.2 }}>
                                {item.description.slice(0, 45)}{item.description.length > 45 ? '…' : ''}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                            <Tooltip title="โหลดเข้าฟอร์ม">
                              <IconButton size="small" onClick={() => loadPolicy(item.policy_id)}
                                sx={{ color: ACCENT, opacity: 0.7, '&:hover': { opacity: 1 } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="ลบ policy นี้">
                              <IconButton size="small" color="error"
                                sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                                onClick={() => {
                                  if (window.confirm(`Delete ISM policy "${item.policy_id}"?`))
                                    deleteMut.mutate(item.policy_id)
                                }}>
                                <DeleteRoundedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Retention summary card */}
            <Card variant="outlined" sx={{ borderLeft: `3px solid ${ACCENT}`, borderRadius: 2.5 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.25 }}>
                  Current Settings
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { label: 'Policy ID', value: form.policy_id },
                    { label: 'Index Pattern', value: form.index_pattern },
                    { label: 'Retention', value: `${form.retention_days} days` },
                    { label: 'Rollover', value: `every ${form.rollover_after_days}d or ${form.rollover_max_primary_shard_size_gb}GB` },
                  ].map(({ label, value }) => (
                    <Box key={label}>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, fontFamily: '"IBM Plex Mono",monospace' }}>{value}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Form + preview */}
        <Grid item xs={12} lg={8}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 2 }}>Policy Settings</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <SettingRow label="Policy ID">
                        <TextField fullWidth size="small" value={form.policy_id}
                          onChange={e => setForm(p => ({ ...p, policy_id: e.target.value }))}
                          InputProps={{ sx: { fontFamily: '"IBM Plex Mono",monospace', fontSize: 12.5 } }} />
                      </SettingRow>
                    </Grid>
                    <Grid item xs={12}>
                      <SettingRow label="Index Pattern">
                        <TextField fullWidth size="small" value={form.index_pattern}
                          onChange={e => setForm(p => ({ ...p, index_pattern: e.target.value }))}
                          InputProps={{ sx: { fontFamily: '"IBM Plex Mono",monospace', fontSize: 12.5 } }} />
                      </SettingRow>
                    </Grid>
                    <Grid item xs={12}>
                      <SettingRow label="Description">
                        <TextField fullWidth size="small" value={form.description}
                          onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                      </SettingRow>
                    </Grid>
                    <Grid item xs={6}>
                      <SettingRow label="Retention (days)" hint="ลบ index หลังจาก N วัน">
                        <TextField fullWidth size="small" type="number" value={form.retention_days}
                          onChange={e => setForm(p => ({ ...p, retention_days: e.target.value }))}
                          InputProps={{ sx: { fontFamily: '"IBM Plex Mono",monospace' } }} />
                      </SettingRow>
                    </Grid>
                    <Grid item xs={6}>
                      <SettingRow label="Rollover after (days)">
                        <TextField fullWidth size="small" type="number" value={form.rollover_after_days}
                          onChange={e => setForm(p => ({ ...p, rollover_after_days: e.target.value }))}
                          InputProps={{ sx: { fontFamily: '"IBM Plex Mono",monospace' } }} />
                      </SettingRow>
                    </Grid>
                    <Grid item xs={12}>
                      <SettingRow label="Max shard size (GB)">
                        <TextField fullWidth size="small" type="number" value={form.rollover_max_primary_shard_size_gb}
                          onChange={e => setForm(p => ({ ...p, rollover_max_primary_shard_size_gb: e.target.value }))}
                          InputProps={{ sx: { fontFamily: '"IBM Plex Mono",monospace' } }} />
                      </SettingRow>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox size="small" checked={form.apply_to_existing}
                            onChange={e => setForm(p => ({ ...p, apply_to_existing: e.target.checked }))}
                            sx={{ color: ACCENT, '&.Mui-checked': { color: ACCENT } }} />
                        }
                        label={<Typography sx={{ fontSize: 12.5 }}>Apply to matching existing indices</Typography>}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 2.5 }}>
                <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, flex: 1 }}>Policy Preview (JSON)</Typography>
                    <Box sx={{
                      px: 0.75, py: 0.2, borderRadius: 0.875,
                      bgcolor: alpha(ACCENT, 0.12), color: ACCENT, fontSize: 10, fontWeight: 700,
                    }}>
                      read-only
                    </Box>
                  </Box>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.75, overflow: 'hidden', flex: 1 }}>
                    <Editor
                      height="340px"
                      language="json"
                      value={JSON.stringify(previewPolicy, null, 2)}
                      theme={mode === 'dark' ? 'vs-dark' : 'light'}
                      options={{
                        readOnly: true, minimap: { enabled: false },
                        scrollBeyondLastLine: false, fontSize: 12,
                        fontFamily: '"IBM Plex Mono",monospace',
                        lineNumbers: 'on', automaticLayout: true,
                        padding: { top: 8, bottom: 8 },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined" sx={{ borderLeft: `3px solid #EAB308`, borderRadius: 2.5 }}>
                <CardContent sx={{ p: 1.75 }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#EAB308', mb: 0.5 }}>⚠ Rollover Note</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5, lineHeight: 1.6 }}>
                    หาก index เขียนเป็นชื่อรายวันตรง ๆ (เช่น Wazuh ค่าเริ่มต้น) rollover จะไม่ทำงานจนกว่าจะตั้ง write-path alias.
                    Policy นี้ให้ประโยชน์ทันทีในด้าน retention-delete ส่วน rollover เหมาะกับ alias-backed indices
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="outlined" onClick={() => setForm(DEFAULT_FORM)}
                  startIcon={<RestartAltRoundedIcon />}
                  sx={{ borderRadius: 2, fontSize: 12 }}>
                  รีเซ็ต
                </Button>
                <Button variant="contained" disableElevation
                  startIcon={saveMut.isPending ? <CircularProgress size={14} color="inherit" /> : <SaveRoundedIcon />}
                  onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                  sx={{ borderRadius: 2, fontSize: 12, bgcolor: ACCENT, '&:hover': { bgcolor: '#0F9689' } }}>
                  บันทึก Policy
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  )
}
