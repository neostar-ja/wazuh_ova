import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import {
  Alert, Box, Button, Chip, CircularProgress, InputAdornment,
  Paper, Skeleton, TextField, Tooltip, Typography, useTheme,
} from '@mui/material'
import { Grid } from '@mui/material'
import Editor from '@monaco-editor/react'
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import { useSnackbar } from 'notistack'
import { adminApi } from '../../../services/api'
import { useThemeMode } from '../../../theme/ThemeContext'
import { ConfirmDialog, SectionHeader } from '../shared'

const ACCENT = '#06B6D4'

export function ListsTab() {
  const { mode } = useThemeMode()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [deployConfirm, setDeployConfirm] = useState(false)
  const [deploying, setDeploying] = useState(false)

  const { data: filesData, isLoading } = useQuery({
    queryKey: ['admin-lists-files'],
    queryFn: () => adminApi.listCdbLists().then(r => r.data),
  })

  const allFiles = filesData?.data?.affected_items || []
  const sorted = allFiles.filter(
    (f: any) => !search || f.filename?.toLowerCase().includes(search.toLowerCase())
  ) as any[]
  const isDirty = content !== originalContent
  const entryCount = content.split('\n').filter(l => l.trim() && !l.startsWith('#')).length
  const commentCount = content.split('\n').filter(l => l.trim().startsWith('#')).length

  const loadFile = async (item: any) => {
    try {
      const r = await adminApi.getCdbList(item.filename)
      setSelectedFile(item)
      setContent(r.data.content || '')
      setOriginalContent(r.data.content || '')
    } catch { enqueueSnackbar(`โหลดล้มเหลว: ${item.filename}`, { variant: 'error' }) }
  }

  const saveFile = async () => {
    if (!selectedFile) return
    setSaving(true)
    try {
      await adminApi.saveCdbList(selectedFile.filename, content)
      setOriginalContent(content)
      enqueueSnackbar('บันทึกสำเร็จ', { variant: 'success' })
    } catch (e: any) { enqueueSnackbar(e.response?.data?.detail || 'บันทึกล้มเหลว', { variant: 'error' }) }
    setSaving(false)
  }

  const deploy = async () => {
    setDeployConfirm(false); setDeploying(true)
    try {
      await adminApi.deploy()
      enqueueSnackbar('Restart Wazuh Manager สำเร็จ', { variant: 'success' })
    } catch (e: any) { enqueueSnackbar(e.response?.data?.detail || 'Restart ล้มเหลว', { variant: 'error' }) }
    setDeploying(false)
  }

  return (
    <Box>
      <SectionHeader
        icon={<ListAltRoundedIcon fontSize="small" />}
        title="CDB Lists"
        count={allFiles.length}
        color={ACCENT}
        action={
          <Button size="small" variant="contained" color="warning"
            startIcon={deploying ? <CircularProgress size={13} color="inherit" /> : <RocketLaunchRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={() => setDeployConfirm(true)} disabled={deploying}
            sx={{ borderRadius: 2, fontSize: 12, height: 32 }}>
            Deploy
          </Button>
        }
      />

      <Alert severity="info" sx={{ mt: 2, mb: 2, fontSize: 12, borderRadius: 1.75 }}>
        <strong>CDB Lists</strong> — allowlists / denylists สำหรับ IP, domain, user · รูปแบบ:{' '}
        <code style={{ fontFamily: 'IBM Plex Mono, monospace' }}>value:label</code> หรือ{' '}
        <code style={{ fontFamily: 'IBM Plex Mono, monospace' }}>value</code> หนึ่งรายการต่อบรรทัด
      </Alert>

      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={3}>
          <TextField size="small" fullWidth placeholder="ค้นหา list..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment>,
              sx: { fontSize: 12.5, borderRadius: 1.75 },
            }}
            sx={{ mb: 1 }} />

          <Paper variant="outlined" sx={{ maxHeight: 540, overflow: 'auto', borderRadius: 2 }}>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Box key={i} sx={{ px: 1.5, py: 0.5 }}><Skeleton height={24} /></Box>
              ))
            ) : (
              <>
                <Box sx={{
                  px: 1.5, py: 0.625,
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  bgcolor: 'action.hover',
                  borderBottom: '1px solid', borderBottomColor: 'divider',
                }}>
                  <ListAltRoundedIcon sx={{ fontSize: 12, color: ACCENT }} />
                  <Typography sx={{
                    fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '0.09em', color: ACCENT,
                  }}>
                    CDB Lists ({allFiles.length})
                  </Typography>
                </Box>
                {sorted.map((f, i) => (
                  <Tooltip key={i} title={f.relative_dirname ? `${f.relative_dirname}/${f.filename}` : f.filename} placement="right" arrow>
                    <Box
                      onClick={() => loadFile(f)}
                      sx={{
                        px: 1.5, py: 0.75, cursor: 'pointer',
                        fontSize: 12, fontFamily: '"IBM Plex Mono",monospace',
                        bgcolor: selectedFile?.filename === f.filename ? alpha(ACCENT, isDark ? 0.18 : 0.1) : 'transparent',
                        borderLeft: `2.5px solid ${selectedFile?.filename === f.filename ? ACCENT : 'transparent'}`,
                        color: selectedFile?.filename === f.filename ? ACCENT : 'text.secondary',
                        '&:hover': { bgcolor: alpha(ACCENT, 0.07) },
                        borderBottom: '1px solid', borderBottomColor: 'divider',
                        transition: 'all 0.1s',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                      {f.filename}
                    </Box>
                  </Tooltip>
                ))}
                {sorted.length === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled">ไม่พบ list</Typography>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} sm={9}>
          {selectedFile ? (
            <Box>
              {/* Toolbar */}
              <Paper variant="outlined" sx={{
                px: 1.5, py: 0.875, mb: 1.25,
                display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
                borderRadius: 2,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.875, flex: 1, minWidth: 0 }}>
                  <Box sx={{
                    px: 0.75, py: 0.2, borderRadius: 0.875,
                    bgcolor: alpha(ACCENT, 0.15), color: ACCENT,
                    fontSize: 10, fontWeight: 700,
                  }}>
                    CDB
                  </Box>
                  <Typography variant="caption" sx={{
                    fontFamily: '"IBM Plex Mono",monospace', fontWeight: 600,
                    fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {selectedFile.filename}
                  </Typography>
                  {isDirty && (
                    <Box sx={{
                      px: 0.75, py: 0.2, borderRadius: 0.875, flexShrink: 0,
                      bgcolor: alpha('#F59E0B', 0.15), color: '#F59E0B',
                      fontSize: 10, fontWeight: 700,
                    }}>
                      ● unsaved
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0 }}>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10.5 }}>
                    {entryCount} entries
                    {commentCount > 0 && ` · ${commentCount} comments`}
                  </Typography>
                  <Button size="small"
                    startIcon={saving ? <CircularProgress size={12} /> : <SaveRoundedIcon sx={{ fontSize: 14 }} />}
                    variant="contained" disableElevation onClick={saveFile} disabled={saving || !isDirty}
                    sx={{ borderRadius: 1.75, fontSize: 12, height: 30, px: 1.5 }}>
                    บันทึก
                  </Button>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ borderRadius: 1.75, overflow: 'hidden' }}>
                <Editor height="500px" language="plaintext" value={content}
                  theme={mode === 'dark' ? 'vs-dark' : 'light'}
                  onChange={v => setContent(v || '')}
                  options={{
                    fontSize: 13, fontFamily: '"IBM Plex Mono",monospace',
                    minimap: { enabled: false }, wordWrap: 'off',
                    scrollBeyondLastLine: false, lineNumbers: 'on',
                    padding: { top: 10, bottom: 8 },
                    renderLineHighlight: 'line',
                    cursorBlinking: 'smooth',
                  }}
                />
              </Paper>
              <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.75, pl: 0.5 }}>
                รูปแบบ: <code style={{ fontFamily: 'IBM Plex Mono, monospace' }}>value:label</code> หรือ{' '}
                <code style={{ fontFamily: 'IBM Plex Mono, monospace' }}>value</code>
                {' '}· บรรทัดขึ้นต้น <code style={{ fontFamily: 'IBM Plex Mono, monospace' }}>#</code> คือ comment
              </Typography>
            </Box>
          ) : (
            <Box sx={{
              height: 540, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed', borderColor: 'divider', borderRadius: 2.5, gap: 1.5,
              bgcolor: alpha(ACCENT, isDark ? 0.03 : 0.02),
            }}>
              <ListAltRoundedIcon sx={{ fontSize: 48, color: alpha(ACCENT, 0.3) }} />
              <Typography variant="body2" color="text.disabled" fontWeight={600} fontSize={13.5}>
                เลือก CDB List จากรายการด้านซ้าย
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11.5 }}>
                allowlists · denylists · custom lookups
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      <ConfirmDialog open={deployConfirm} onClose={() => setDeployConfirm(false)} onConfirm={deploy}
        title="ยืนยันการ Deploy & Restart"
        message="Wazuh Manager จะ restart ชั่วคราว (~30 วินาที) ระหว่างนั้นจะหยุดรับ logs"
        confirmColor="warning" loading={deploying} />
    </Box>
  )
}
