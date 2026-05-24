import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton,
  Paper, Tooltip, Typography, useTheme,
} from '@mui/material'
import Editor from '@monaco-editor/react'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import { useSnackbar } from 'notistack'
import { adminApi } from '../../../services/api'
import { useThemeMode } from '../../../theme/ThemeContext'
import { BRAND, ConfirmDialog, prettifyXML, SectionHeader } from '../shared'

const ACCENT = BRAND.orange

const CONFIG_SECTIONS = [
  { label: 'global',                  key: '<global>' },
  { label: 'alerts',                  key: '<alerts>' },
  { label: 'remote',                  key: '<remote>' },
  { label: 'auth',                    key: '<auth>' },
  { label: 'cluster',                 key: '<cluster>' },
  { label: 'syscheck',                key: '<syscheck>' },
  { label: 'rootcheck',               key: '<rootcheck>' },
  { label: 'vulnerability-detection', key: '<vulnerability-detection>' },
  { label: 'sca',                     key: '<sca>' },
  { label: 'wodle',                   key: '<wodle' },
  { label: 'localfile',               key: '<localfile>' },
  { label: 'ruleset',                 key: '<ruleset>' },
  { label: 'email_alerts',            key: '<email_alerts>' },
  { label: 'syslog_output',           key: '<syslog_output>' },
]

export function WazuhConfigTab() {
  const { mode } = useThemeMode()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveConfirm, setSaveConfirm] = useState(false)
  const [deployConfirm, setDeployConfirm] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const editorRef = useRef<any>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-wazuh-config'],
    queryFn: () => adminApi.getWazuhConfig().then(r => r.data),
  })

  useEffect(() => {
    if (data?.content && !content) {
      setContent(data.content)
      setOriginalContent(data.content)
    }
  }, [data, content])

  const isDirty = content !== originalContent
  const lineCount = content.split('\n').length

  const jumpToSection = (key: string) => {
    if (!editorRef.current) return
    const lines = editorRef.current.getModel()?.getValue()?.split('\n') || []
    const idx = lines.findIndex((l: string) => l.trim().startsWith(key))
    if (idx >= 0) {
      editorRef.current.revealLineInCenter(idx + 1)
      editorRef.current.setPosition({ lineNumber: idx + 1, column: 1 })
      editorRef.current.focus()
    }
  }

  const saveConfig = async () => {
    setSaveConfirm(false); setSaving(true)
    try {
      await adminApi.saveWazuhConfig(content)
      setOriginalContent(content)
      enqueueSnackbar('บันทึก ossec.conf สำเร็จ — กรุณา Deploy เพื่อให้มีผล', { variant: 'success' })
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
        icon={<SettingsSuggestRoundedIcon fontSize="small" />}
        title="ossec.conf"
        color={ACCENT}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<RefreshRoundedIcon sx={{ fontSize: 15 }} />}
              onClick={() => { refetch(); setContent(''); setOriginalContent('') }}
              sx={{ borderRadius: 2, fontSize: 12, height: 32 }}>
              โหลดใหม่
            </Button>
            <Button size="small" variant="contained" color="warning"
              startIcon={deploying ? <CircularProgress size={13} color="inherit" /> : <RocketLaunchRoundedIcon sx={{ fontSize: 15 }} />}
              onClick={() => setDeployConfirm(true)} disabled={deploying}
              sx={{ borderRadius: 2, fontSize: 12, height: 32 }}>
              Deploy
            </Button>
          </Box>
        }
      />

      <Alert severity="warning" sx={{ mt: 2, mb: 2, fontSize: 12, borderRadius: 1.75 }}>
        <strong>⚠️ ossec.conf</strong> — ไฟล์หลักของ Wazuh Manager · แก้ผิดอาจทำให้ระบบหยุดทำงาน · หลังบันทึกต้อง <strong>Deploy</strong>
      </Alert>

      <Box sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start' }}>
        {/* Section jump panel */}
        <Box sx={{ width: 172, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
          <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
            <Box sx={{
              px: 1.5, py: 0.875, bgcolor: 'action.hover',
              borderBottom: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 0.75,
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ACCENT }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>Section Jump</Typography>
            </Box>
            {CONFIG_SECTIONS.map(s => (
              <Box
                key={s.label}
                onClick={() => jumpToSection(s.key)}
                sx={{
                  px: 1.375, py: 0.6, cursor: 'pointer',
                  fontSize: 11.5, fontFamily: '"IBM Plex Mono",monospace',
                  color: 'text.secondary',
                  borderBottom: '1px solid', borderBottomColor: 'divider',
                  transition: 'all 0.1s',
                  '&:hover': {
                    bgcolor: alpha(ACCENT, isDark ? 0.12 : 0.08),
                    color: ACCENT,
                    pl: 1.875,
                  },
                }}>
                &lt;{s.label}&gt;
              </Box>
            ))}
          </Paper>
        </Box>

        {/* Editor */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper variant="outlined" sx={{
            px: 1.5, py: 0.875, mb: 1.25,
            display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
            borderRadius: 2,
          }}>
            <Box sx={{
              px: 0.75, py: 0.25, borderRadius: 0.875,
              bgcolor: alpha(ACCENT, 0.12), color: ACCENT,
              fontSize: 10.5, fontWeight: 700, fontFamily: '"IBM Plex Mono",monospace',
              flexShrink: 0,
            }}>
              /var/ossec/etc/ossec.conf
            </Box>
            {isDirty && (
              <Box sx={{
                px: 0.75, py: 0.2, borderRadius: 0.875, flexShrink: 0,
                bgcolor: alpha('#F59E0B', 0.15), color: '#F59E0B',
                fontSize: 10, fontWeight: 700,
              }}>
                ● unsaved
              </Box>
            )}
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', ml: 'auto', flexShrink: 0 }}>
              {lineCount.toLocaleString()} lines
            </Typography>
            <Tooltip title="Format XML (prettify)">
              <IconButton size="small" onClick={() => setContent(prettifyXML(content))}
                sx={{ borderRadius: 1.5, color: 'text.secondary', '&:hover': { color: ACCENT } }}>
                <AutoFixHighRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Button size="small"
              startIcon={saving ? <CircularProgress size={12} /> : <SaveRoundedIcon sx={{ fontSize: 14 }} />}
              variant="contained" disableElevation onClick={() => setSaveConfirm(true)}
              disabled={saving || !isDirty || isLoading}
              sx={{ borderRadius: 1.75, fontSize: 12, height: 30, px: 1.5 }}>
              บันทึก
            </Button>
          </Paper>

          {isLoading ? (
            <Box sx={{
              height: 560, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid', borderColor: 'divider', borderRadius: 1.75,
              bgcolor: alpha(ACCENT, 0.02),
            }}>
              <CircularProgress size={32} sx={{ color: ACCENT }} />
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 1.75, overflow: 'hidden' }}>
              <Editor height="560px" language="xml" value={content}
                theme={mode === 'dark' ? 'vs-dark' : 'light'}
                onChange={v => setContent(v || '')}
                onMount={e => { editorRef.current = e }}
                options={{
                  fontSize: 13, fontFamily: '"IBM Plex Mono",monospace',
                  minimap: { enabled: true, scale: 1 }, wordWrap: 'on',
                  scrollBeyondLastLine: false, lineNumbers: 'on',
                  renderLineHighlight: 'line', padding: { top: 10, bottom: 8 },
                  folding: true, showFoldingControls: 'always',
                  smoothScrolling: true, cursorBlinking: 'smooth',
                }}
              />
            </Paper>
          )}
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.75, pl: 0.5 }}>
            Ctrl+F ค้นหา · Ctrl+H แทนที่ · Ctrl+/ comment · ต้อง Deploy หลังบันทึก
          </Typography>
        </Box>
      </Box>

      <ConfirmDialog open={saveConfirm} onClose={() => setSaveConfirm(false)} onConfirm={saveConfig}
        title="ยืนยันการบันทึก ossec.conf"
        message="การแก้ไขที่ไม่ถูกต้องอาจทำให้ Wazuh Manager หยุดทำงาน ตรวจสอบ syntax XML ก่อนบันทึก"
        confirmColor="warning" loading={saving} />

      <ConfirmDialog open={deployConfirm} onClose={() => setDeployConfirm(false)} onConfirm={deploy}
        title="ยืนยันการ Deploy & Restart"
        message="Wazuh Manager จะ restart ชั่วคราว (~30 วินาที) ระหว่างนั้นจะหยุดรับ logs"
        confirmColor="warning" loading={deploying} />
    </Box>
  )
}
