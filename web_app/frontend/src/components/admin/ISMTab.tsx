import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Checkbox, CircularProgress, Divider, FormControlLabel,
  Grid, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, Tooltip, IconButton, Chip,
} from '@mui/material'
import Editor from '@monaco-editor/react'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useSnackbar } from 'notistack'
import { adminApi } from '../../services/api'

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

function SectionHeader({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode
  title: string
  action?: React.ReactNode
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography fontWeight={800} sx={{ fontSize: 16 }}>{title}</Typography>
      <Box sx={{ flex: 1 }} />
      {action}
    </Box>
  )
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

export function ISMTab() {
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
    const rolloverMaxPrimaryShardSizeGb = Number(form.rollover_max_primary_shard_size_gb) || 50
    return {
      policy: {
        policy_id: form.policy_id,
        description: form.description,
        schema_version: 1,
        default_state: 'hot',
        ism_template: [
          {
            index_patterns: [form.index_pattern],
            priority: 100,
          },
        ],
        states: [
          {
            name: 'hot',
            actions: [
              {
                rollover: {
                  min_primary_shard_size: `${rolloverMaxPrimaryShardSizeGb}gb`,
                  min_index_age: `${rolloverAfterDays}d`,
                },
              },
            ],
            transitions: [
              {
                state_name: 'warm',
                conditions: { min_index_age: `${rolloverAfterDays}d` },
              },
            ],
          },
          {
            name: 'warm',
            actions: [{ read_only: {} }],
            transitions: [
              {
                state_name: 'delete',
                conditions: { min_index_age: `${retentionDays}d` },
              },
            ],
          },
          {
            name: 'delete',
            actions: [{ delete: {} }],
            transitions: [],
          },
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

  const selectedPolicy = policyItems.find(item => item.policy_id === selectedPolicyId)

  return (
    <Box>
      <SectionHeader
        icon={<StorageRoundedIcon fontSize="small" />}
        title="ISM Retention"
        action={
          <Button
            size="small"
            variant="outlined"
            startIcon={isFetching ? <CircularProgress size={13} /> : <RefreshRoundedIcon />}
            onClick={() => refetch()}
            sx={{ borderRadius: 2 }}
          >
            รีเฟรช
          </Button>
        }
      />

      <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />} sx={{ mb: 2 }}>
        Wazuh บน OpenSearch ชุดนี้เขียนเป็น index รายวันอยู่แล้ว ดังนั้น rollover จะมีผลจริงเมื่อ target ใช้ alias สำหรับ write path.
        Policy นี้เตรียมไว้ให้พร้อมสำหรับ alias-backed indices และยังใช้ทำ retention 60 วันได้ทันที
      </Alert>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Policies ที่มีอยู่</Typography>
              {isLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} height={44} />)}
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, bgcolor: 'action.hover' } }}>
                        <TableCell>Policy</TableCell>
                        <TableCell>คำอธิบาย</TableCell>
                        <TableCell align="right">จัดการ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {policyItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3}>
                            <Typography variant="body2" color="text.secondary">ยังไม่มี ISM policy</Typography>
                          </TableCell>
                        </TableRow>
                      ) : policyItems.map(item => (
                        <TableRow key={item.policy_id} hover selected={item.policy_id === selectedPolicyId}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{item.policy_id}</TableCell>
                          <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{item.description || '-'}</TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                              <Tooltip title="โหลดเข้าแบบฟอร์ม">
                                <IconButton size="small" onClick={() => loadPolicy(item.policy_id)}>
                                  <RefreshRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="ลบ policy">
                                <IconButton size="small" color="error" onClick={() => {
                                  if (window.confirm(`Delete ISM policy ${item.policy_id}?`)) {
                                    deleteMut.mutate(item.policy_id)
                                  }
                                }}>
                                  <DeleteRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Current status</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip size="small" label={`Policies: ${policiesResponse?.total_policies ?? policyItems.length}`} />
                {selectedPolicyId && <Chip size="small" color="primary" label={`Selected: ${selectedPolicyId}`} />}
              </Box>
              {selectedPolicy && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Selected description</Typography>
                  <Typography variant="body2">{selectedPolicy.description || '-'}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>Policy settings</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Policy ID"
                        value={form.policy_id}
                        onChange={e => setForm(prev => ({ ...prev, policy_id: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Index pattern"
                        value={form.index_pattern}
                        onChange={e => setForm(prev => ({ ...prev, index_pattern: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Description"
                        value={form.description}
                        onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Retain (days)"
                        value={form.retention_days}
                        onChange={e => setForm(prev => ({ ...prev, retention_days: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Rollover after (days)"
                        value={form.rollover_after_days}
                        onChange={e => setForm(prev => ({ ...prev, rollover_after_days: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Max primary shard size (GB)"
                        value={form.rollover_max_primary_shard_size_gb}
                        onChange={e => setForm(prev => ({ ...prev, rollover_max_primary_shard_size_gb: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={form.apply_to_existing}
                            onChange={e => setForm(prev => ({ ...prev, apply_to_existing: e.target.checked }))}
                          />
                        }
                        label="Apply to matching existing indices"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%' }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Policy preview</Typography>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                    <Editor
                      height="340px"
                      language="json"
                      value={JSON.stringify(previewPolicy, null, 2)}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 12,
                        lineNumbers: 'on',
                        automaticLayout: true,
                      }}
                      theme="vs-dark"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined" sx={{ borderLeft: '3px solid #EAB308' }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>Rollover note</Typography>
                  <Typography variant="body2" color="text.secondary">
                    หาก index ถูกเขียนเป็นชื่อรายวันแบบ Wazuh ตรง ๆ rollover จะไม่ทำงานจนกว่าจะมี alias สำหรับ write index.
                    UI นี้สร้าง policy ให้พร้อมใช้งาน แต่การ roll เหมาะกับ stream/alias-backed path มากกว่า
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={() => setForm(DEFAULT_FORM)}
                  sx={{ borderRadius: 2 }}
                >
                  รีเซ็ต
                </Button>
                <Button
                  variant="contained"
                  startIcon={saveMut.isPending ? <CircularProgress size={14} color="inherit" /> : <SaveRoundedIcon />}
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending}
                  sx={{ borderRadius: 2 }}
                >
                  บันทึก policy
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  )
}
