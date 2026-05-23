import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Card, CardContent, Typography, Chip, TextField, Select, MenuItem,
  FormControl, InputLabel, Button, Grid, Table, TableBody, TableCell,
  TableHead, TableRow, TableContainer, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Tooltip, IconButton, Avatar, Skeleton,
  Paper, InputAdornment, Alert, Divider, LinearProgress, useTheme,
} from '@mui/material'
import Editor from '@monaco-editor/react'
import RefreshRoundedIcon       from '@mui/icons-material/RefreshRounded'
import SaveRoundedIcon           from '@mui/icons-material/SaveRounded'
import RocketLaunchRoundedIcon   from '@mui/icons-material/RocketLaunchRounded'
import AddRoundedIcon            from '@mui/icons-material/AddRounded'
import DeleteRoundedIcon         from '@mui/icons-material/DeleteRounded'
import SearchRoundedIcon         from '@mui/icons-material/SearchRounded'
import LockResetRoundedIcon      from '@mui/icons-material/LockResetRounded'
import PersonOffRoundedIcon      from '@mui/icons-material/PersonOffRounded'
import PersonRoundedIcon         from '@mui/icons-material/PersonRounded'
import TelegramIcon              from '@mui/icons-material/Telegram'
import SendRoundedIcon           from '@mui/icons-material/SendRounded'
import ArticleRoundedIcon        from '@mui/icons-material/ArticleRounded'
import TuneRoundedIcon           from '@mui/icons-material/TuneRounded'
import PeopleRoundedIcon         from '@mui/icons-material/PeopleRounded'
import HistoryRoundedIcon        from '@mui/icons-material/HistoryRounded'
import CheckCircleRoundedIcon    from '@mui/icons-material/CheckCircleRounded'
import WarningAmberRoundedIcon   from '@mui/icons-material/WarningAmberRounded'
import MonitorHeartRoundedIcon   from '@mui/icons-material/MonitorHeartRounded'
import CodeRoundedIcon           from '@mui/icons-material/CodeRounded'
import ListAltRoundedIcon        from '@mui/icons-material/ListAltRounded'
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded'
import ErrorRoundedIcon          from '@mui/icons-material/ErrorRounded'
import FiberManualRecordIcon     from '@mui/icons-material/FiberManualRecord'
import ContentCopyRoundedIcon    from '@mui/icons-material/ContentCopyRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import { adminApi } from '../../services/api'
import { format, formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { useSnackbar } from 'notistack'
import { useThemeMode } from '../../theme/ThemeContext'

// ─── Brand ───────────────────────────────────────────────────────────────────
const BRAND = { purple: '#7B5BA4', purpleLight: '#9B7DC4', orange: '#F17422' }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ROLE_COLOR = { superadmin: 'error', admin: 'warning', analyst: 'info', viewer: 'default' }
const ROLE_TH    = { superadmin: 'ซูเปอร์แอดมิน', admin: 'ผู้ดูแลระบบ', analyst: 'นักวิเคราะห์', viewer: 'ผู้ชม' }
const ACTION_COLOR = {
  login: 'primary', logout: 'default',
  save_rule: 'warning', save_decoder: 'info', save_list: 'secondary', save_wazuh_config: 'warning',
  deploy_restart: 'error',
  create_user: 'success', update_user: 'info', delete_tuning: 'error',
  add_tuning: 'warning', save_config: 'secondary',
}

function getLevelColor(lv) {
  if (lv >= 12) return '#EF4444'
  if (lv >= 7)  return BRAND.orange
  if (lv >= 4)  return BRAND.purple
  return '#94a3b8'
}

// ─── Nav config ──────────────────────────────────────────────────────────────
const NAV = [
  {
    section: 'WAZUH ENGINE',
    items: [
      { id: 'status',   label: 'สถานะระบบ',    icon: <MonitorHeartRoundedIcon sx={{ fontSize: 17 }} />,    color: '#22C55E' },
      { id: 'rules',    label: 'Rules',          icon: <ArticleRoundedIcon sx={{ fontSize: 17 }} />,          color: BRAND.purple },
      { id: 'decoders', label: 'Decoders',       icon: <CodeRoundedIcon sx={{ fontSize: 17 }} />,             color: '#3B82F6' },
      { id: 'lists',    label: 'CDB Lists',      icon: <ListAltRoundedIcon sx={{ fontSize: 17 }} />,          color: '#06B6D4' },
      { id: 'wazuhcfg', label: 'ossec.conf',     icon: <SettingsSuggestRoundedIcon sx={{ fontSize: 17 }} />,  color: BRAND.orange },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      { id: 'tuning',  label: 'Alert Tuning',   icon: <TuneRoundedIcon sx={{ fontSize: 17 }} />,               color: '#EAB308' },
      { id: 'notify',  label: 'การแจ้งเตือน',  icon: <NotificationsActiveRoundedIcon sx={{ fontSize: 17 }} />, color: '#229ED9' },
    ],
  },
  {
    section: 'PLATFORM',
    items: [
      { id: 'users',  label: 'ผู้ใช้ระบบ',  icon: <PeopleRoundedIcon sx={{ fontSize: 17 }} />,  color: '#8B5CF6' },
      { id: 'audit',  label: 'Audit Log',    icon: <HistoryRoundedIcon sx={{ fontSize: 17 }} />, color: '#64748B' },
    ],
  },
]

// ─── Shared sub-components ────────────────────────────────────────────────────
function SectionHeader({ icon, title, count, action }) {
  const theme = useTheme()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography fontWeight={800} sx={{ fontSize: 16 }}>{title}</Typography>
      {count !== undefined && (
        <Chip size="small" label={count} color="primary" sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />
      )}
      <Box sx={{ flex: 1 }} />
      {action}
    </Box>
  )
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmColor = 'error', loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>ยกเลิก</Button>
        <Button variant="contained" color={confirmColor} onClick={onConfirm} disabled={loading}
          startIcon={loading ? <CircularProgress size={14} /> : null}>
          ยืนยัน
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function prettifyXML(xml) {
  try {
    const PAD = '  '
    let out = '', indent = 0
    xml.replace(/>\s*</g, '>\n<').split('\n').forEach(line => {
      line = line.trim()
      if (!line) return
      if (line.startsWith('</')) indent = Math.max(0, indent - 1)
      out += PAD.repeat(indent) + line + '\n'
      if (!line.startsWith('</') && !line.endsWith('/>') && line.startsWith('<') && !line.startsWith('<?') && !line.includes('</'))
        indent++
    })
    return out.trim()
  } catch { return xml }
}

function parseRulesFromXml(xml) {
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    return Array.from(doc.querySelectorAll('rule')).map(r => ({
      id: r.getAttribute('id') || '',
      level: r.getAttribute('level') || '',
      desc: r.querySelector('description')?.textContent?.trim() || '(no description)',
    })).filter(r => r.id)
  } catch { return [] }
}

function parseDecodersFromXml(xml) {
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    return Array.from(doc.querySelectorAll('decoder')).map(d => ({
      id: d.getAttribute('name') || '',
      parent: d.querySelector('parent')?.textContent?.trim() || '',
      program: d.querySelector('program_name')?.textContent?.trim() || '',
    })).filter(d => d.id)
  } catch { return [] }
}

// ─── Reusable XML file editor (Rules / Decoders) ─────────────────────────────
function XmlFileEditor({ title, listFn, getFn, saveFn, parseItemsFn, itemLabel, deployBtn }) {
  const { mode } = useThemeMode()
  const { enqueueSnackbar } = useSnackbar()
  const [selectedFile, setSelectedFile] = useState(null)
  const [isCustomFile, setIsCustomFile] = useState(false)
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [showList, setShowList] = useState(true)
  const [deployConfirm, setDeployConfirm] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const editorRef = useRef(null)

  const { data: filesData, isLoading } = useQuery({
    queryKey: [`admin-${title}-files`],
    queryFn: () => listFn().then(r => r.data),
  })

  const allFiles = filesData?.data?.affected_items || []
  const customCount = allFiles.filter(f => f.relative_dirname?.includes('etc')).length
  const sorted = [
    ...allFiles.filter(f => f.relative_dirname?.includes('etc')),
    ...allFiles.filter(f => !f.relative_dirname?.includes('etc')),
  ].filter(f => !search || f.filename.toLowerCase().includes(search.toLowerCase()))

  const isDirty = content !== originalContent
  const parsedItems = parseItemsFn(content)
  const filteredItems = itemSearch
    ? parsedItems.filter(r =>
        r.id?.toLowerCase().includes(itemSearch.toLowerCase()) ||
        r.desc?.toLowerCase().includes(itemSearch.toLowerCase()) ||
        r.parent?.toLowerCase().includes(itemSearch.toLowerCase()))
    : parsedItems

  const loadFile = async (filename, custom) => {
    try {
      const r = await getFn(filename)
      setSelectedFile(filename)
      setIsCustomFile(!!custom)
      setContent(r.data.content || '')
      setOriginalContent(r.data.content || '')
      setItemSearch('')
    } catch { enqueueSnackbar(`โหลดล้มเหลว: ${filename}`, { variant: 'error' }) }
  }

  const saveFile = async () => {
    if (!selectedFile || !isCustomFile) return
    setSaving(true)
    try {
      await saveFn(selectedFile, content)
      setOriginalContent(content)
      enqueueSnackbar('บันทึกสำเร็จ', { variant: 'success' })
    } catch (e) { enqueueSnackbar(e.response?.data?.detail || 'บันทึกล้มเหลว', { variant: 'error' }) }
    setSaving(false)
  }

  const deploy = async () => {
    setDeployConfirm(false); setDeploying(true)
    try {
      await adminApi.deploy()
      enqueueSnackbar('Restart Wazuh Manager สำเร็จ', { variant: 'success' })
    } catch (e) { enqueueSnackbar(e.response?.data?.detail || 'Restart ล้มเหลว', { variant: 'error' }) }
    setDeploying(false)
  }

  const jumpToItem = (id) => {
    if (!editorRef.current) return
    const lines = editorRef.current.getModel()?.getValue()?.split('\n') || []
    const idx = lines.findIndex(l => l.includes(`id="${id}"`) || l.includes(`name="${id}"`))
    if (idx >= 0) { editorRef.current.revealLineInCenter(idx + 1); editorRef.current.setPosition({ lineNumber: idx + 1, column: 1 }); editorRef.current.focus() }
  }

  return (
    <Box>
      <SectionHeader
        icon={title === 'Rules' ? <ArticleRoundedIcon fontSize="small" /> : <CodeRoundedIcon fontSize="small" />}
        title={title}
        count={allFiles.length}
        action={
          <Button size="small" variant="contained" color="warning"
            startIcon={deploying ? <CircularProgress size={14} color="inherit" /> : <RocketLaunchRoundedIcon />}
            onClick={() => setDeployConfirm(true)} disabled={deploying} sx={{ borderRadius: 2 }}>
            Deploy Wazuh
          </Button>
        }
      />

      <Grid container spacing={1.5}>
        {/* File list */}
        <Grid item xs={12} sm={3}>
          <TextField size="small" fullWidth placeholder="ค้นหาไฟล์..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
            sx={{ mb: 1 }} />
          <Paper variant="outlined" sx={{ maxHeight: 540, overflow: 'auto' }}>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={30} sx={{ mx: 1 }} />)
              : (() => {
                  let lastGroup = null
                  return sorted.map((f, i) => {
                    const isCustom = f.relative_dirname?.includes('etc')
                    const group = isCustom ? 'CUSTOM' : 'DEFAULT'
                    const showHeader = group !== lastGroup
                    lastGroup = group
                    return (
                      <Box key={i}>
                        {showHeader && (
                          <Box sx={{ px: 1.5, py: 0.5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                            textTransform: 'uppercase', color: isCustom ? 'warning.main' : 'text.disabled',
                            bgcolor: 'action.hover', borderBottom: '1px solid', borderBottomColor: 'divider' }}>
                            {isCustom ? '✏️ CUSTOM' : '📖 DEFAULT'}{isCustom ? ` (${customCount})` : ''}
                          </Box>
                        )}
                        <Tooltip title={`${f.relative_dirname}/${f.filename}`} placement="right" arrow>
                          <Box onClick={() => loadFile(f.filename, isCustom)}
                            sx={{
                              px: 1.5, py: 0.7, cursor: 'pointer', fontSize: 11.5,
                              fontFamily: '"IBM Plex Mono",monospace',
                              bgcolor: selectedFile === f.filename ? `${BRAND.purple}14` : 'transparent',
                              borderLeft: `2px solid ${selectedFile === f.filename ? BRAND.purple : 'transparent'}`,
                              color: selectedFile === f.filename ? BRAND.purple : isCustom ? 'text.primary' : 'text.secondary',
                              fontWeight: isCustom ? 500 : 400,
                              '&:hover': { bgcolor: 'action.hover' },
                              borderBottom: '1px solid', borderBottomColor: 'divider', transition: 'all 0.1s',
                            }}>
                            {f.filename}
                          </Box>
                        </Tooltip>
                      </Box>
                    )
                  })
                })()}
            {!isLoading && sorted.length === 0 && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.disabled">ไม่พบไฟล์</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Editor + item list */}
        <Grid item xs={12} sm={9}>
          {selectedFile ? (
            <Box>
              {/* Toolbar */}
              <Paper variant="outlined" sx={{ px: 1.5, py: 0.8, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1, minWidth: 0 }}>
                  <Chip size="small" label={isCustomFile ? 'Custom' : 'Default'}
                    color={isCustomFile ? 'warning' : 'default'} sx={{ height: 20, fontSize: 10 }} />
                  <Typography variant="caption" fontFamily='"IBM Plex Mono",monospace' fontWeight={600} noWrap sx={{ fontSize: 12 }}>
                    {selectedFile}
                  </Typography>
                  {isDirty && isCustomFile && (
                    <Chip size="small" label="ยังไม่บันทึก" color="warning" sx={{ height: 16, fontSize: 10 }} />
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, ml: 'auto', whiteSpace: 'nowrap' }}>
                    {parsedItems.length} {itemLabel} · {content.split('\n').length} lines
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Format XML">
                    <IconButton size="small" onClick={() => setContent(prettifyXML(content))} sx={{ borderRadius: 1.5 }}>
                      <Box component="span" sx={{ fontSize: 14, lineHeight: 1 }}>⇌</Box>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={showList ? 'ซ่อนรายการ' : 'แสดงรายการ'}>
                    <IconButton size="small" onClick={() => setShowList(v => !v)} sx={{ borderRadius: 1.5 }}>
                      <TuneRoundedIcon fontSize="small" sx={{ color: showList ? BRAND.purple : 'text.disabled' }} />
                    </IconButton>
                  </Tooltip>
                  {isCustomFile ? (
                    <Button size="small" startIcon={saving ? <CircularProgress size={13} /> : <SaveRoundedIcon />}
                      variant="outlined" color="primary" onClick={saveFile} disabled={saving || !isDirty} sx={{ borderRadius: 2, fontSize: 12 }}>
                      บันทึก
                    </Button>
                  ) : (
                    <Chip size="small" label="อ่านได้อย่างเดียว" color="default" sx={{ height: 24, fontSize: 10 }} />
                  )}
                </Box>
              </Paper>

              {!isCustomFile && (
                <Alert severity="warning" sx={{ mb: 1, py: 0.5, fontSize: 12 }}>
                  <strong>Default</strong> — จะถูกเขียนทับเมื่ออัปเดต Wazuh แก้ไขใน <strong>local_{title.toLowerCase()}.xml</strong> แทน
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
                    <Editor height="500px" language="xml" value={content}
                      theme={mode === 'dark' ? 'vs-dark' : 'light'}
                      onChange={v => isCustomFile && setContent(v || '')}
                      onMount={e => { editorRef.current = e }}
                      options={{
                        fontSize: 13, fontFamily: '"IBM Plex Mono",monospace',
                        minimap: { enabled: false }, wordWrap: 'on',
                        scrollBeyondLastLine: false, lineNumbers: 'on',
                        renderLineHighlight: 'line', padding: { top: 8 },
                        readOnly: !isCustomFile, folding: true, showFoldingControls: 'always',
                        bracketPairColorization: { enabled: true }, smoothScrolling: true,
                      }}
                    />
                  </Paper>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, mt: 0.5, display: 'block', pl: 0.5 }}>
                    💡 Ctrl+F ค้นหา · Ctrl+H แทนที่ · Alt+Z ตัดบรรทัด · Ctrl+/ คอมเมนต์
                  </Typography>
                </Box>

                {showList && parsedItems.length > 0 && (
                  <Box sx={{ width: 220, flexShrink: 0 }}>
                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Box sx={{ px: 1.5, py: 0.8, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11 }}>
                          📋 {itemLabel} ({parsedItems.length})
                        </Typography>
                      </Box>
                      <TextField size="small" fullWidth placeholder={`ค้นหา ${itemLabel}...`}
                        value={itemSearch} onChange={e => setItemSearch(e.target.value)}
                        sx={{ '& .MuiInputBase-root': { borderRadius: 0, fontSize: 11 }, '& fieldset': { border: 'none', borderBottom: '1px solid', borderColor: 'divider' } }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 14, color: 'text.disabled' }} /></InputAdornment> }}
                      />
                      <Box sx={{ maxHeight: 430, overflow: 'auto' }}>
                        {filteredItems.map(r => (
                          <Box key={r.id} onClick={() => jumpToItem(r.id)}
                            sx={{ px: 1.5, py: 0.7, cursor: 'pointer', borderBottom: '1px solid', borderColor: 'divider',
                              '&:hover': { bgcolor: 'action.hover' }, transition: 'background 0.1s' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                              <Chip size="small" label={r.level ? `lv.${r.level}` : r.parent ? `→${r.parent}` : r.id.slice(0, 8)}
                                sx={{ height: 16, fontSize: 10, fontFamily: '"IBM Plex Mono",monospace',
                                  bgcolor: getLevelColor(+(r.level || 0)) + '22',
                                  color: getLevelColor(+(r.level || 0)), fontWeight: 700 }} />
                              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', fontFamily: '"IBM Plex Mono",monospace' }}>
                                #{r.id?.slice(0, 8)}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3, display: 'block' }}>
                              {(r.desc || r.program || r.parent || '').slice(0, 55)}{(r.desc || r.program || '').length > 55 ? '…' : ''}
                            </Typography>
                          </Box>
                        ))}
                        {filteredItems.length === 0 && (
                          <Box sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.disabled">ไม่พบรายการ</Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ height: 540, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '1px dashed', borderColor: 'divider', borderRadius: 2, gap: 1.5 }}>
              <ArticleRoundedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.disabled" fontWeight={500}>เลือกไฟล์จากรายการด้านซ้าย</Typography>
              <Typography variant="caption" color="text.disabled">
                ✏️ Custom — แก้ไขได้ · 📖 Default — อ่านอย่างเดียว
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      <ConfirmDialog open={deployConfirm} onClose={() => setDeployConfirm(false)} onConfirm={deploy}
        title="ยืนยันการ Deploy"
        message="Restart Wazuh Manager จะทำให้ระบบหยุดรับ logs ชั่วคราว (~30 วินาที)"
        confirmColor="warning" loading={deploying} />
    </Box>
  )
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────
function RulesTab() {
  return (
    <XmlFileEditor
      title="Rules"
      listFn={adminApi.listRules}
      getFn={adminApi.getRule}
      saveFn={adminApi.saveRule}
      parseItemsFn={parseRulesFromXml}
      itemLabel="Rules"
    />
  )
}

// ─── Decoders Tab ─────────────────────────────────────────────────────────────
function DecodersTab() {
  return (
    <XmlFileEditor
      title="Decoders"
      listFn={adminApi.listDecoders}
      getFn={adminApi.getDecoder}
      saveFn={adminApi.saveDecoder}
      parseItemsFn={parseDecodersFromXml}
      itemLabel="Decoders"
    />
  )
}

// ─── CDB Lists Tab ────────────────────────────────────────────────────────────
function ListsTab() {
  const { mode } = useThemeMode()
  const { enqueueSnackbar } = useSnackbar()
  const [selectedFile, setSelectedFile] = useState(null)
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
  const sorted = allFiles.filter(f => !search || f.filename?.toLowerCase().includes(search.toLowerCase()))
  const isDirty = content !== originalContent

  const entryCount = content.split('\n').filter(l => l.trim() && !l.startsWith('#')).length

  const loadFile = async (item) => {
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
    } catch (e) { enqueueSnackbar(e.response?.data?.detail || 'บันทึกล้มเหลว', { variant: 'error' }) }
    setSaving(false)
  }

  const deploy = async () => {
    setDeployConfirm(false); setDeploying(true)
    try {
      await adminApi.deploy()
      enqueueSnackbar('Restart Wazuh Manager สำเร็จ', { variant: 'success' })
    } catch (e) { enqueueSnackbar(e.response?.data?.detail || 'Restart ล้มเหลว', { variant: 'error' }) }
    setDeploying(false)
  }

  return (
    <Box>
      <SectionHeader icon={<ListAltRoundedIcon fontSize="small" />} title="CDB Lists" count={allFiles.length}
        action={
          <Button size="small" variant="contained" color="warning"
            startIcon={deploying ? <CircularProgress size={14} color="inherit" /> : <RocketLaunchRoundedIcon />}
            onClick={() => setDeployConfirm(true)} disabled={deploying} sx={{ borderRadius: 2 }}>
            Deploy Wazuh
          </Button>
        }
      />

      <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
        <strong>CDB Lists</strong> — ใช้สำหรับ allowlists / denylists เช่น IP addresses, domain names, user accounts
        · รูปแบบ: <code>value:label</code> หรือ <code>value</code> หนึ่งรายการต่อบรรทัด
      </Alert>

      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={3}>
          <TextField size="small" fullWidth placeholder="ค้นหา list..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
            sx={{ mb: 1 }} />
          <Paper variant="outlined" sx={{ maxHeight: 540, overflow: 'auto' }}>
            {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={30} sx={{ mx: 1 }} />) : (
              <>
                <Box sx={{ px: 1.5, py: 0.5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'text.disabled', bgcolor: 'action.hover',
                  borderBottom: '1px solid', borderBottomColor: 'divider' }}>
                  📋 CDB LISTS ({allFiles.length})
                </Box>
                {sorted.map((f, i) => (
                  <Tooltip key={i} title={f.relative_dirname ? `${f.relative_dirname}/${f.filename}` : f.filename} placement="right" arrow>
                    <Box onClick={() => loadFile(f)}
                      sx={{
                        px: 1.5, py: 0.75, cursor: 'pointer', fontSize: 11.5,
                        fontFamily: '"IBM Plex Mono",monospace',
                        bgcolor: selectedFile?.filename === f.filename ? '#06B6D414' : 'transparent',
                        borderLeft: `2px solid ${selectedFile?.filename === f.filename ? '#06B6D4' : 'transparent'}`,
                        color: selectedFile?.filename === f.filename ? '#06B6D4' : 'text.secondary',
                        '&:hover': { bgcolor: 'action.hover' },
                        borderBottom: '1px solid', borderBottomColor: 'divider', transition: 'all 0.1s',
                      }}>
                      {f.filename}
                    </Box>
                  </Tooltip>
                ))}
                {sorted.length === 0 && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
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
              <Paper variant="outlined" sx={{ px: 1.5, py: 0.8, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1, minWidth: 0 }}>
                  <Chip size="small" label="CDB List" sx={{ height: 20, fontSize: 10, bgcolor: '#06B6D420', color: '#06B6D4' }} />
                  <Typography variant="caption" fontFamily='"IBM Plex Mono",monospace' fontWeight={600} noWrap sx={{ fontSize: 12 }}>
                    {selectedFile.filename}
                  </Typography>
                  {isDirty && <Chip size="small" label="ยังไม่บันทึก" color="warning" sx={{ height: 16, fontSize: 10 }} />}
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, ml: 'auto', whiteSpace: 'nowrap' }}>
                    {entryCount} entries
                  </Typography>
                </Box>
                <Button size="small" startIcon={saving ? <CircularProgress size={13} /> : <SaveRoundedIcon />}
                  variant="outlined" color="primary" onClick={saveFile} disabled={saving || !isDirty} sx={{ borderRadius: 2, fontSize: 12 }}>
                  บันทึก
                </Button>
              </Paper>
              <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
                <Editor height="500px" language="plaintext" value={content}
                  theme={mode === 'dark' ? 'vs-dark' : 'light'}
                  onChange={v => setContent(v || '')}
                  options={{
                    fontSize: 13, fontFamily: '"IBM Plex Mono",monospace',
                    minimap: { enabled: false }, wordWrap: 'off',
                    scrollBeyondLastLine: false, lineNumbers: 'on', padding: { top: 8 },
                  }}
                />
              </Paper>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, mt: 0.5, display: 'block', pl: 0.5 }}>
                💡 รูปแบบ: <code>value:label</code> หรือ <code>value</code> · บรรทัดที่ขึ้นต้นด้วย <code>#</code> คือ comment
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: 540, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '1px dashed', borderColor: 'divider', borderRadius: 2, gap: 1.5 }}>
              <ListAltRoundedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.disabled" fontWeight={500}>เลือก CDB List จากรายการด้านซ้าย</Typography>
              <Typography variant="caption" color="text.disabled">allowlists · denylists · custom lookups</Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      <ConfirmDialog open={deployConfirm} onClose={() => setDeployConfirm(false)} onConfirm={deploy}
        title="ยืนยันการ Deploy"
        message="Restart Wazuh Manager จะทำให้ระบบหยุดรับ logs ชั่วคราว (~30 วินาที)"
        confirmColor="warning" loading={deploying} />
    </Box>
  )
}

// ─── Wazuh Config (ossec.conf) Tab ────────────────────────────────────────────
const CONFIG_SECTIONS = [
  { label: 'global',              key: '<global>' },
  { label: 'alerts',              key: '<alerts>' },
  { label: 'remote',              key: '<remote>' },
  { label: 'auth',                key: '<auth>' },
  { label: 'cluster',             key: '<cluster>' },
  { label: 'syscheck',            key: '<syscheck>' },
  { label: 'rootcheck',           key: '<rootcheck>' },
  { label: 'vulnerability-detection', key: '<vulnerability-detection>' },
  { label: 'sca',                 key: '<sca>' },
  { label: 'wodle',               key: '<wodle' },
  { label: 'localfile',           key: '<localfile>' },
  { label: 'ruleset',             key: '<ruleset>' },
  { label: 'email_alerts',        key: '<email_alerts>' },
  { label: 'syslog_output',       key: '<syslog_output>' },
]

function WazuhConfigTab() {
  const { mode } = useThemeMode()
  const { enqueueSnackbar } = useSnackbar()
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveConfirm, setSaveConfirm] = useState(false)
  const [deployConfirm, setDeployConfirm] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const editorRef = useRef(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-wazuh-config'],
    queryFn: () => adminApi.getWazuhConfig().then(r => r.data),
  })

  useEffect(() => {
    if (data?.content && !content) {
      setContent(data.content)
      setOriginalContent(data.content)
    }
  }, [data])

  const isDirty = content !== originalContent
  const lineCount = content.split('\n').length

  const jumpToSection = (key) => {
    if (!editorRef.current) return
    const lines = editorRef.current.getModel()?.getValue()?.split('\n') || []
    const idx = lines.findIndex(l => l.trim().startsWith(key))
    if (idx >= 0) { editorRef.current.revealLineInCenter(idx + 1); editorRef.current.setPosition({ lineNumber: idx + 1, column: 1 }); editorRef.current.focus() }
  }

  const saveConfig = async () => {
    setSaveConfirm(false); setSaving(true)
    try {
      await adminApi.saveWazuhConfig(content)
      setOriginalContent(content)
      enqueueSnackbar('บันทึก ossec.conf สำเร็จ — กรุณา Deploy เพื่อให้การเปลี่ยนแปลงมีผล', { variant: 'success' })
    } catch (e) { enqueueSnackbar(e.response?.data?.detail || 'บันทึกล้มเหลว', { variant: 'error' }) }
    setSaving(false)
  }

  const deploy = async () => {
    setDeployConfirm(false); setDeploying(true)
    try {
      await adminApi.deploy()
      enqueueSnackbar('Restart Wazuh Manager สำเร็จ', { variant: 'success' })
    } catch (e) { enqueueSnackbar(e.response?.data?.detail || 'Restart ล้มเหลว', { variant: 'error' }) }
    setDeploying(false)
  }

  return (
    <Box>
      <SectionHeader icon={<SettingsSuggestRoundedIcon fontSize="small" />} title="ossec.conf — Wazuh Manager Configuration"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<RefreshRoundedIcon />}
              onClick={() => { refetch(); setContent(''); setOriginalContent('') }} sx={{ borderRadius: 2, fontSize: 12 }}>
              โหลดใหม่
            </Button>
            <Button size="small" variant="contained" color="warning"
              startIcon={deploying ? <CircularProgress size={14} color="inherit" /> : <RocketLaunchRoundedIcon />}
              onClick={() => setDeployConfirm(true)} disabled={deploying} sx={{ borderRadius: 2, fontSize: 12 }}>
              Deploy
            </Button>
          </Box>
        }
      />

      <Alert severity="warning" sx={{ mb: 2, fontSize: 12 }}>
        <strong>⚠️ ossec.conf</strong> — ไฟล์การตั้งค่าหลักของ Wazuh Manager · การแก้ไขที่ไม่ถูกต้องอาจทำให้ระบบหยุดทำงาน
        · หลังบันทึกต้อง <strong>Deploy</strong> เพื่อให้ผลลัพธ์มีผล
      </Alert>

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        {/* Section jumper */}
        <Box sx={{ width: 180, flexShrink: 0 }}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 1.5, py: 0.8, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11 }}>⚡ Section Jump</Typography>
            </Box>
            {CONFIG_SECTIONS.map(s => (
              <Box key={s.label} onClick={() => jumpToSection(s.key)}
                sx={{ px: 1.5, py: 0.55, cursor: 'pointer', fontSize: 11.5, fontFamily: '"IBM Plex Mono",monospace',
                  color: 'text.secondary', borderBottom: '1px solid', borderBottomColor: 'divider',
                  '&:hover': { bgcolor: `${BRAND.orange}12`, color: BRAND.orange }, transition: 'all 0.1s' }}>
                {'<'}{s.label}{'>'}
              </Box>
            ))}
          </Paper>
        </Box>

        {/* Editor */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper variant="outlined" sx={{ px: 1.5, py: 0.8, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip size="small" label="/var/ossec/etc/ossec.conf" sx={{ height: 20, fontSize: 10, bgcolor: `${BRAND.orange}20`, color: BRAND.orange, fontFamily: '"IBM Plex Mono",monospace' }} />
            {isDirty && <Chip size="small" label="ยังไม่บันทึก" color="warning" sx={{ height: 16, fontSize: 10 }} />}
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, ml: 'auto' }}>
              {lineCount} lines
            </Typography>
            <Tooltip title="Format XML">
              <IconButton size="small" onClick={() => setContent(prettifyXML(content))} sx={{ borderRadius: 1.5 }}>
                <Box component="span" sx={{ fontSize: 14, lineHeight: 1 }}>⇌</Box>
              </IconButton>
            </Tooltip>
            <Button size="small" startIcon={saving ? <CircularProgress size={13} /> : <SaveRoundedIcon />}
              variant="outlined" color="primary" onClick={() => setSaveConfirm(true)} disabled={saving || !isDirty || isLoading}
              sx={{ borderRadius: 2, fontSize: 12 }}>
              บันทึก
            </Button>
          </Paper>

          {isLoading ? (
            <Box sx={{ height: 560, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <CircularProgress size={32} sx={{ color: BRAND.orange }} />
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
              <Editor height="560px" language="xml" value={content}
                theme={mode === 'dark' ? 'vs-dark' : 'light'}
                onChange={v => setContent(v || '')}
                onMount={e => { editorRef.current = e }}
                options={{
                  fontSize: 13, fontFamily: '"IBM Plex Mono",monospace',
                  minimap: { enabled: true, scale: 1 }, wordWrap: 'on',
                  scrollBeyondLastLine: false, lineNumbers: 'on',
                  renderLineHighlight: 'line', padding: { top: 8 },
                  folding: true, showFoldingControls: 'always',
                  smoothScrolling: true,
                }}
              />
            </Paper>
          )}
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, mt: 0.5, display: 'block', pl: 0.5 }}>
            💡 Ctrl+F ค้นหา · Ctrl+H แทนที่ · Ctrl+/ คอมเมนต์ · ต้อง Deploy หลังบันทึก
          </Typography>
        </Box>
      </Box>

      <ConfirmDialog open={saveConfirm} onClose={() => setSaveConfirm(false)} onConfirm={saveConfig}
        title="ยืนยันการบันทึก ossec.conf"
        message="การแก้ไขที่ไม่ถูกต้องอาจทำให้ Wazuh Manager หยุดทำงาน คุณแน่ใจหรือไม่?"
        confirmColor="warning" loading={saving} />

      <ConfirmDialog open={deployConfirm} onClose={() => setDeployConfirm(false)} onConfirm={deploy}
        title="ยืนยันการ Deploy"
        message="Restart Wazuh Manager จะทำให้ระบบหยุดรับ logs ชั่วคราว (~30 วินาที)"
        confirmColor="warning" loading={deploying} />
    </Box>
  )
}

// ─── System Status Tab ────────────────────────────────────────────────────────
const DAEMON_LABELS = {
  'wazuh-analysisd':   { label: 'Analysis',     desc: 'วิเคราะห์ log และ trigger alerts' },
  'wazuh-remoted':     { label: 'Remote',        desc: 'รับ log จาก agents' },
  'wazuh-logcollector':{ label: 'Log Collector', desc: 'เก็บ log จาก local files' },
  'wazuh-syscheckd':   { label: 'Syscheck',      desc: 'ตรวจสอบความเปลี่ยนแปลงไฟล์' },
  'wazuh-monitord':    { label: 'Monitor',       desc: 'ตรวจสอบ agent connections' },
  'wazuh-db':          { label: 'Database',      desc: 'ฐานข้อมูล SQLite' },
  'wazuh-authd':       { label: 'Auth',          desc: 'ลงทะเบียน agents' },
  'wazuh-modulesd':    { label: 'Modules',       desc: 'Wodles และ vulnerability detection' },
  'wazuh-execd':       { label: 'Exec',          desc: 'Active response execution' },
  'wazuh-maild':       { label: 'Mail',          desc: 'Email notifications' },
  'wazuh-clusterd':    { label: 'Cluster',       desc: 'Cluster node communication' },
  'wazuh-apid':        { label: 'API',           desc: 'REST API server' },
  'wazuh-reportd':     { label: 'Report',        desc: 'สร้างรายงาน' },
}

function SystemStatusTab() {
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: () => adminApi.getSystemStatus().then(r => r.data),
    refetchInterval: 60000,
    staleTime: 30000,
  })

  const managerInfo   = data?.manager_info?.data?.affected_items?.[0] || {}
  const daemonList    = data?.manager_status?.data?.affected_items?.[0] || {}
  const agentSummary  = data?.agents_summary?.data?.affected_items?.[0] || {}

  const running = Object.entries(daemonList).filter(([,v]) => v === 'running').map(([k]) => k)
  const stopped = Object.entries(daemonList).filter(([,v]) => v !== 'running' && v !== undefined).map(([k]) => k)

  const agentStats = [
    { label: 'ทั้งหมด',        value: agentSummary.total         ?? '—', color: BRAND.purple },
    { label: 'ออนไลน์',        value: agentSummary.active        ?? '—', color: '#22C55E' },
    { label: 'ขาดการเชื่อมต่อ', value: agentSummary.disconnected  ?? '—', color: '#EF4444' },
    { label: 'รอดำเนินการ',     value: agentSummary.pending       ?? '—', color: '#EAB308' },
    { label: 'ไม่เคยเชื่อมต่อ', value: agentSummary.never_connected ?? '—', color: '#94A3B8' },
  ]

  return (
    <Box>
      <SectionHeader icon={<MonitorHeartRoundedIcon fontSize="small" />} title="สถานะระบบ Wazuh"
        action={
          <Button size="small" variant="outlined" startIcon={<RefreshRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={() => refetch()} sx={{ borderRadius: 2, fontSize: 12 }}>
            รีเฟรช
          </Button>
        }
      />

      {isLoading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}><Skeleton height={80} variant="rounded" /></Grid>
          ))}
        </Grid>
      ) : (
        <>
          {/* Manager Info */}
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ borderLeft: `3px solid ${BRAND.purple}` }}>
                <CardContent sx={{ p: '16px 20px !important' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: BRAND.purpleLight, mb: 1.5 }}>
                    Manager Info
                  </Typography>
                  <Grid container spacing={1.5}>
                    {[
                      ['Version',    managerInfo.version],
                      ['Wazuh Type', managerInfo.type],
                      ['Arch',       managerInfo.architecture],
                      ['OpenSSL',    managerInfo.openssl_support],
                      ['Compat.',    managerInfo.max_agents],
                      ['ติดตั้งเมื่อ', managerInfo.installation_date
                        ? format(new Date(managerInfo.installation_date), 'dd MMM yyyy', { locale: th })
                        : '—'],
                    ].filter(([,v]) => v).map(([k, v]) => (
                      <Grid item xs={6} key={k}>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>{k}</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: '"IBM Plex Mono",monospace', color: 'text.primary' }}>{v}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ borderLeft: `3px solid #22C55E` }}>
                <CardContent sx={{ p: '16px 20px !important' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#22C55E', mb: 1.5 }}>
                    Agents Summary
                  </Typography>
                  <Grid container spacing={1.5}>
                    {agentStats.map(s => (
                      <Grid item xs={4} key={s.label}>
                        <Box sx={{ textAlign: 'center', p: 1, borderRadius: 2, bgcolor: isDark ? `${s.color}10` : `${s.color}08`, border: `1px solid ${s.color}25` }}>
                          <Typography sx={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                          <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.3, fontWeight: 600 }}>{s.label}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Daemon Status */}
          <Card variant="outlined">
            <CardContent sx={{ p: '16px 20px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'text.secondary' }}>
                  Daemon Status
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22C55E' }} />
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{running.length} running</Typography>
                  </Box>
                  {stopped.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#EF4444' }} />
                      <Typography sx={{ fontSize: 11, color: '#EF4444' }}>{stopped.length} stopped</Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Grid container spacing={1.25}>
                {Object.entries(daemonList).sort(([a], [b]) => a.localeCompare(b)).map(([name, status]) => {
                  const isRunning = status === 'running'
                  const meta = DAEMON_LABELS[name] || { label: name.replace('wazuh-', ''), desc: '' }
                  return (
                    <Grid item xs={12} sm={6} md={4} key={name}>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1.25,
                        p: 1.25, borderRadius: 2,
                        bgcolor: isRunning
                          ? isDark ? 'rgba(34,197,94,0.07)' : 'rgba(34,197,94,0.05)'
                          : isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
                        border: `1px solid ${isRunning ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        transition: 'all 0.2s',
                      }}>
                        <Box sx={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          bgcolor: isRunning ? '#22C55E' : '#EF4444',
                          boxShadow: isRunning ? '0 0 6px rgba(34,197,94,0.6)' : '0 0 6px rgba(239,68,68,0.5)',
                        }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: isRunning ? '#22C55E' : '#EF4444' }}>
                            {meta.label}
                          </Typography>
                          <Typography sx={{ fontSize: 10, color: 'text.disabled', fontFamily: '"IBM Plex Mono",monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </Typography>
                        </Box>
                        <Chip size="small" label={isRunning ? 'running' : status}
                          sx={{ height: 18, fontSize: 10, fontWeight: 700,
                            bgcolor: isRunning ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: isRunning ? '#22C55E' : '#EF4444' }} />
                      </Box>
                    </Grid>
                  )
                })}
              </Grid>

              {Object.keys(daemonList).length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ErrorRoundedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.disabled">ไม่สามารถดึงข้อมูล daemon status ได้</Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {dataUpdatedAt && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'right', mt: 1, fontSize: 10 }}>
              อัปเดตเมื่อ {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true, locale: th })}
            </Typography>
          )}
        </>
      )}
    </Box>
  )
}

// ─── Tuning Tab ───────────────────────────────────────────────────────────────
function TuningTab() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ rule_id: '', original_level: 7, tuned_level: 3, reason: '' })
  const [formError, setFormError] = useState({})

  const { data: tunings = [], isLoading } = useQuery({
    queryKey: ['admin-tuning'],
    queryFn: () => adminApi.listTuning().then(r => r.data),
  })

  const addMut = useMutation({
    mutationFn: adminApi.addTuning,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tuning'] }); setAddOpen(false); setForm({ rule_id: '', original_level: 7, tuned_level: 3, reason: '' }); enqueueSnackbar('เพิ่ม Tuning สำเร็จ', { variant: 'success' }) },
    onError: e => enqueueSnackbar(e.response?.data?.detail || 'เกิดข้อผิดพลาด', { variant: 'error' }),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateTuningStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tuning'] }),
    onError: e => enqueueSnackbar(e.response?.data?.detail || 'ไม่สามารถอัปเดตสถานะ', { variant: 'error' }),
  })

  const deleteMut = useMutation({
    mutationFn: id => adminApi.deleteTuning(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tuning'] }); setDeleteTarget(null); enqueueSnackbar('ลบ Tuning สำเร็จ', { variant: 'success' }) },
    onError: e => enqueueSnackbar(e.response?.data?.detail || 'ลบไม่สำเร็จ', { variant: 'error' }),
  })

  const validateForm = () => {
    const err = {}
    if (!form.rule_id.trim()) err.rule_id = 'กรุณาระบุ Rule ID'
    if (form.original_level < 1 || form.original_level > 15) err.original_level = 'ระดับ 1–15'
    if (form.tuned_level < 1 || form.tuned_level > 15) err.tuned_level = 'ระดับ 1–15'
    if (!form.reason.trim()) err.reason = 'กรุณาระบุเหตุผล'
    setFormError(err)
    return Object.keys(err).length === 0
  }

  return (
    <Box>
      <SectionHeader icon={<TuneRoundedIcon fontSize="small" />} title="Alert Tuning" count={tunings.length}
        action={
          <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)} sx={{ borderRadius: 2 }}>
            เพิ่ม Tuning
          </Button>
        }
      />
      <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
        ปรับระดับความรุนแรงของ Rule เฉพาะสำหรับ SOC Center — ไม่กระทบ Wazuh default rules
        · สถานะ <strong>active</strong> = มีผล · <strong>expired</strong> = หมดอายุ · <strong>reverted</strong> = ยกเลิกแล้ว
      </Alert>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, bgcolor: 'action.hover' } }}>
              <TableCell>Rule ID</TableCell>
              <TableCell>ระดับเดิม</TableCell>
              <TableCell>ระดับใหม่</TableCell>
              <TableCell sx={{ minWidth: 160 }}>เหตุผล</TableCell>
              <TableCell>เพิ่มโดย</TableCell>
              <TableCell>วันที่</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
            )) : tunings.map(t => (
              <TableRow key={t.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell sx={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 12, fontWeight: 600 }}>{t.rule_id}</TableCell>
                <TableCell><Chip size="small" label={t.original_level} sx={{ bgcolor: getLevelColor(t.original_level) + '22', color: getLevelColor(t.original_level), fontWeight: 700, fontSize: 11 }} /></TableCell>
                <TableCell><Chip size="small" label={t.tuned_level} sx={{ bgcolor: getLevelColor(t.tuned_level) + '22', color: getLevelColor(t.tuned_level), fontWeight: 700, fontSize: 11 }} /></TableCell>
                <TableCell sx={{ fontSize: 12, maxWidth: 200 }}>{t.reason}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{t.added_by}</TableCell>
                <TableCell sx={{ fontSize: 11 }}>{t.added_at ? format(new Date(t.added_at), 'dd/MM/yy') : '-'}</TableCell>
                <TableCell>
                  <Select size="small" value={t.status}
                    onChange={e => statusMut.mutate({ id: t.id, status: e.target.value })}
                    sx={{ fontSize: 11, height: 26, '& .MuiSelect-select': { py: 0.3 } }}>
                    {['active', 'expired', 'reverted'].map(s => <MenuItem key={s} value={s} sx={{ fontSize: 12 }}>{s}</MenuItem>)}
                  </Select>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="ลบ">
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(t)} sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}>
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && tunings.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <TuneRoundedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.disabled">ยังไม่มี Alert Tuning</Typography>
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)} sx={{ mt: 1 }}>เพิ่ม Tuning แรก</Button>
          </Box>
        )}
      </TableContainer>

      <Dialog open={addOpen} onClose={() => { setAddOpen(false); setFormError({}) }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>เพิ่ม Alert Tuning</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Rule ID" value={form.rule_id}
                error={!!formError.rule_id} helperText={formError.rule_id}
                onChange={e => setForm(f => ({ ...f, rule_id: e.target.value }))} placeholder="เช่น 100001" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="ระดับเดิม" type="number"
                error={!!formError.original_level} helperText={formError.original_level}
                inputProps={{ min: 1, max: 15 }} value={form.original_level}
                onChange={e => setForm(f => ({ ...f, original_level: +e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="ระดับใหม่" type="number"
                error={!!formError.tuned_level} helperText={formError.tuned_level}
                inputProps={{ min: 1, max: 15 }} value={form.tuned_level}
                onChange={e => setForm(f => ({ ...f, tuned_level: +e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="เหตุผล" multiline rows={2}
                error={!!formError.reason} helperText={formError.reason}
                value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddOpen(false); setFormError({}) }}>ยกเลิก</Button>
          <Button variant="contained" onClick={() => validateForm() && addMut.mutate(form)} disabled={addMut.isPending}
            startIcon={addMut.isPending ? <CircularProgress size={13} /> : null}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget?.id)}
        title="ยืนยันการลบ"
        message={`ลบ Tuning Rule ID "${deleteTarget?.rule_id}" ออกจากระบบ?`}
        loading={deleteMut.isPending} />
    </Box>
  )
}

// ─── Notify (Alert Config) Tab ────────────────────────────────────────────────
function NotifyTab() {
  const { enqueueSnackbar } = useSnackbar()
  const [config, setConfig] = useState({ telegram_bot_token: '', telegram_chat_id: '', alert_level_threshold: '12' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [dirty, setDirty] = useState(false)

  const { data: configData, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => adminApi.getConfig().then(r => r.data),
  })

  useEffect(() => {
    if (configData && !dirty) {
      setConfig({
        telegram_bot_token: configData.telegram_bot_token || '',
        telegram_chat_id: configData.telegram_chat_id || '',
        alert_level_threshold: configData.alert_level_threshold || '12',
      })
    }
  }, [configData])

  const handleChange = (key, value) => { setConfig(c => ({ ...c, [key]: value })); setDirty(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.saveConfig(config)
      setDirty(false)
      enqueueSnackbar('บันทึกการตั้งค่าสำเร็จ', { variant: 'success' })
    } catch (e) { enqueueSnackbar(e.response?.data?.detail || 'บันทึกล้มเหลว', { variant: 'error' }) }
    setSaving(false)
  }

  const handleTest = async () => {
    if (!config.telegram_bot_token || !config.telegram_chat_id) {
      enqueueSnackbar('กรุณากรอก Bot Token และ Chat ID ก่อน', { variant: 'warning' }); return
    }
    setTesting(true)
    try {
      const res = await fetch(`https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.telegram_chat_id, text: '🔔 SOC Center — ทดสอบการแจ้งเตือน\nระบบทำงานปกติ' }),
      })
      const d = await res.json()
      if (d.ok) enqueueSnackbar('ส่ง test message สำเร็จ ✓', { variant: 'success' })
      else enqueueSnackbar(`ส่งไม่สำเร็จ: ${d.description}`, { variant: 'error' })
    } catch { enqueueSnackbar('ไม่สามารถเชื่อมต่อ Telegram API', { variant: 'error' }) }
    setTesting(false)
  }

  return (
    <Box>
      <SectionHeader icon={<NotificationsActiveRoundedIcon fontSize="small" />} title="การตั้งค่าแจ้งเตือน" />
      {isLoading ? <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={56} />)}</Box> : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ p: 2.5, borderLeft: `3px solid #229ED9` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TelegramIcon sx={{ color: '#229ED9', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={700}>Telegram Bot</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Bot Token" type="password"
                    value={config.telegram_bot_token} onChange={e => handleChange('telegram_bot_token', e.target.value)}
                    placeholder="123456789:AAHxxxxxx..." helperText="ได้จาก @BotFather บน Telegram" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Chat ID"
                    value={config.telegram_chat_id} onChange={e => handleChange('telegram_chat_id', e.target.value)}
                    placeholder="-1001234567890" helperText="Group chat ID (ขึ้นต้นด้วย -100...)" />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="outlined" size="small"
                    startIcon={testing ? <CircularProgress size={14} /> : <SendRoundedIcon />}
                    onClick={handleTest} disabled={testing} sx={{ borderRadius: 2 }}>
                    ส่ง Test Message
                  </Button>
                </Grid>
              </Grid>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ p: 2.5, borderLeft: `3px solid #EAB308` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WarningAmberRoundedIcon sx={{ color: '#EAB308', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={700}>เกณฑ์การแจ้งเตือน</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                ระดับความรุนแรงขั้นต่ำที่จะส่งการแจ้งเตือนไปยัง Telegram
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>ระดับความรุนแรงขั้นต่ำ</InputLabel>
                <Select value={config.alert_level_threshold} label="ระดับความรุนแรงขั้นต่ำ"
                  onChange={e => handleChange('alert_level_threshold', e.target.value)}>
                  {[
                    { value: '7',  label: 'ระดับ 7+ (Medium–Critical)' },
                    { value: '10', label: 'ระดับ 10+ (High–Critical)' },
                    { value: '12', label: 'ระดับ 12+ (High–Critical เท่านั้น)' },
                    { value: '15', label: 'ระดับ 15 (Critical เท่านั้น)' },
                  ].map(o => <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
              <Alert severity="info" sx={{ mt: 2, fontSize: 12 }}>
                การแจ้งเตือน WebSocket จะส่ง alerts ระดับ 7+ เสมอ<br/>
                การตั้งค่านี้ใช้สำหรับ Telegram notification เท่านั้น
              </Alert>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              {dirty && <Typography variant="caption" color="warning.main" sx={{ alignSelf: 'center' }}>มีการเปลี่ยนแปลงที่ยังไม่บันทึก</Typography>}
              <Button variant="contained"
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveRoundedIcon />}
                onClick={handleSave} disabled={saving || !dirty} sx={{ borderRadius: 2 }}>
                บันทึกการตั้งค่า
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [addOpen, setAddOpen] = useState(false)
  const [pwdTarget, setPwdTarget] = useState(null)
  const [pwdValue, setPwdValue] = useState('')
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'viewer' })
  const [formError, setFormError] = useState({})

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers().then(r => r.data),
  })

  const addMut = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setAddOpen(false); setForm({ username: '', email: '', full_name: '', password: '', role: 'viewer' }); enqueueSnackbar('สร้างผู้ใช้สำเร็จ', { variant: 'success' }) },
    onError: e => enqueueSnackbar(e.response?.data?.detail || 'เกิดข้อผิดพลาด', { variant: 'error' }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); enqueueSnackbar('อัปเดตสำเร็จ', { variant: 'success' }) },
    onError: e => enqueueSnackbar(e.response?.data?.detail || 'ไม่สามารถอัปเดต', { variant: 'error' }),
  })

  const validateForm = () => {
    const err = {}
    if (!form.username.trim()) err.username = 'กรุณาระบุ Username'
    if (!form.email.includes('@')) err.email = 'Email ไม่ถูกต้อง'
    if (!form.full_name.trim()) err.full_name = 'กรุณาระบุชื่อเต็ม'
    if (form.password.length < 8) err.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
    setFormError(err)
    return Object.keys(err).length === 0
  }

  return (
    <Box>
      <SectionHeader icon={<PeopleRoundedIcon fontSize="small" />} title="ผู้ใช้ระบบ" count={users.length}
        action={<Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)} sx={{ borderRadius: 2 }}>สร้างผู้ใช้</Button>}
      />

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, bgcolor: 'action.hover' } }}>
              <TableCell>ผู้ใช้</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell>เข้าสู่ระบบล่าสุด</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
            )) : users.map(u => (
              <TableRow key={u.id} hover sx={{ '&:last-child td': { border: 0 }, opacity: u.is_active ? 1 : 0.55 }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700,
                      background: u.is_active ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : '#94a3b8' }}>
                      {(u.full_name || u.username)[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600} fontSize={12}>{u.full_name}</Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono",monospace' }}>
                        @{u.username}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{u.email}</TableCell>
                <TableCell>
                  <Select size="small" value={u.role}
                    onChange={e => updateMut.mutate({ id: u.id, data: { role: e.target.value } })}
                    sx={{ fontSize: 11, height: 26, '& .MuiSelect-select': { py: 0.3 } }}>
                    {['viewer', 'analyst', 'admin', 'superadmin'].map(r => (
                      <MenuItem key={r} value={r} sx={{ fontSize: 12 }}>{ROLE_TH[r]}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={u.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    color={u.is_active ? 'success' : 'default'} sx={{ height: 20, fontSize: 10 }} />
                </TableCell>
                <TableCell sx={{ fontSize: 11 }}>
                  {u.last_login ? format(new Date(u.last_login), 'dd/MM/yy HH:mm') : '-'}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Tooltip title="รีเซ็ตรหัสผ่าน">
                      <IconButton size="small" onClick={() => setPwdTarget(u)} sx={{ opacity: 0.7, '&:hover': { opacity: 1, color: 'warning.main' } }}>
                        <LockResetRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                      <IconButton size="small"
                        onClick={() => updateMut.mutate({ id: u.id, data: { is_active: !u.is_active } })}
                        sx={{ opacity: 0.7, '&:hover': { opacity: 1, color: u.is_active ? 'error.main' : 'success.main' } }}>
                        {u.is_active ? <PersonOffRoundedIcon fontSize="small" /> : <PersonRoundedIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={addOpen} onClose={() => { setAddOpen(false); setFormError({}) }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>สร้างผู้ใช้ใหม่</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { key: 'username', label: 'Username', type: 'text' },
              { key: 'full_name', label: 'ชื่อเต็ม', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'password', label: 'รหัสผ่าน', type: 'password' },
            ].map(({ key, label, type }) => (
              <Grid item xs={12} sm={6} key={key}>
                <TextField fullWidth size="small" label={label} type={type}
                  error={!!formError[key]} helperText={formError[key]}
                  value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select value={form.role} label="Role" onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {['viewer', 'analyst', 'admin', 'superadmin'].map(r => (
                    <MenuItem key={r} value={r}>{ROLE_TH[r]} ({r})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddOpen(false); setFormError({}) }}>ยกเลิก</Button>
          <Button variant="contained" onClick={() => validateForm() && addMut.mutate(form)} disabled={addMut.isPending}
            startIcon={addMut.isPending ? <CircularProgress size={13} /> : null}>สร้าง</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pwdTarget} onClose={() => setPwdTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>รีเซ็ตรหัสผ่าน</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>ผู้ใช้: <strong>{pwdTarget?.username}</strong></Typography>
          <TextField fullWidth size="small" label="รหัสผ่านใหม่" type="password"
            value={pwdValue} onChange={e => setPwdValue(e.target.value)} helperText="ต้องมีอย่างน้อย 8 ตัวอักษร" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPwdTarget(null)}>ยกเลิก</Button>
          <Button variant="contained" color="warning"
            onClick={() => { if (pwdValue.length < 8) { enqueueSnackbar('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', { variant: 'warning' }); return }; updateMut.mutate({ id: pwdTarget.id, data: { password: pwdValue } }); setPwdTarget(null); setPwdValue('') }}
            disabled={updateMut.isPending}>รีเซ็ต</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────
function AuditTab() {
  const [limit, setLimit] = useState(100)
  const [actionFilter, setActionFilter] = useState('')
  const [countdown, setCountdown] = useState(30)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-audit', limit],
    queryFn: () => adminApi.auditLog(limit).then(r => r.data),
    refetchInterval: 30000,
  })

  useEffect(() => {
    const id = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000)
    return () => clearInterval(id)
  }, [])

  const actions = [...new Set(logs.map(l => l.action))].sort()
  const filtered = actionFilter ? logs.filter(l => l.action === actionFilter) : logs

  return (
    <Box>
      <SectionHeader icon={<HistoryRoundedIcon fontSize="small" />} title="Audit Log" count={filtered.length}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.disabled">รีเฟรชใน {countdown}s</Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select value={actionFilter} onChange={e => setActionFilter(e.target.value)} displayEmpty sx={{ fontSize: 12, height: 30 }}>
                <MenuItem value="">ทุก action</MenuItem>
                {actions.map(a => <MenuItem key={a} value={a} sx={{ fontSize: 12 }}>{a}</MenuItem>)}
              </Select>
            </FormControl>
            <Select size="small" value={limit} onChange={e => setLimit(e.target.value)} sx={{ fontSize: 12, height: 30, minWidth: 80 }}>
              {[50, 100, 200].map(l => <MenuItem key={l} value={l} sx={{ fontSize: 12 }}>{l} รายการ</MenuItem>)}
            </Select>
          </Box>
        }
      />

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, bgcolor: 'action.hover' } }}>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>เวลา</TableCell>
              <TableCell>ผู้ใช้</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>รายละเอียด</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
            )) : filtered.map(l => (
              <TableRow key={l.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap', fontFamily: '"IBM Plex Mono",monospace' }}>
                  {l.timestamp ? format(new Date(l.timestamp), 'dd/MM HH:mm:ss') : '-'}
                </TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{l.username}</TableCell>
                <TableCell>
                  <Chip size="small" label={l.action} color={ACTION_COLOR[l.action] || 'default'} sx={{ height: 18, fontSize: 10 }} />
                </TableCell>
                <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono",monospace', color: 'text.secondary' }}>{l.target || '-'}</TableCell>
                <TableCell sx={{ fontSize: 11, color: 'text.secondary', maxWidth: 180 }} title={l.detail}>
                  {l.detail ? l.detail.substring(0, 40) + (l.detail.length > 40 ? '…' : '') : '-'}
                </TableCell>
                <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono",monospace', color: 'text.disabled' }}>{l.ip_address || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && filtered.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <HistoryRoundedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.disabled">ไม่มีบันทึกการใช้งาน</Typography>
          </Box>
        )}
      </TableContainer>
    </Box>
  )
}

// ─── Main AdminPage ────────────────────────────────────────────────────────────
const CONTENT_MAP = {
  status:   <SystemStatusTab />,
  rules:    <RulesTab />,
  decoders: <DecodersTab />,
  lists:    <ListsTab />,
  wazuhcfg: <WazuhConfigTab />,
  tuning:   <TuningTab />,
  notify:   <NotifyTab />,
  users:    <UsersTab />,
  audit:    <AuditTab />,
}

export default function AdminPage() {
  const [activeId, setActiveId] = useState('status')
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box className="page-enter">
      {/* ── Header ── */}
      <Box sx={{ mb: 2.5 }}>
        <Typography fontWeight={800} sx={{ fontSize: 20, lineHeight: 1.2 }}>ผู้ดูแลระบบ</Typography>
        <Typography variant="caption" color="text.secondary">
          จัดการ Wazuh Engine, Rules, Decoders, CDB Lists, Config, Users และการตั้งค่า
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* ── Sidebar ── */}
        <Box sx={{ width: 210, flexShrink: 0, position: 'sticky', top: 16 }}>
          <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
            {NAV.map((group, gi) => (
              <Box key={gi}>
                {gi > 0 && <Divider />}
                <Box sx={{ px: 1.5, pt: gi === 0 ? 1.25 : 1, pb: 0.5 }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.disabled' }}>
                    {group.section}
                  </Typography>
                </Box>
                {group.items.map(item => {
                  const isActive = activeId === item.id
                  return (
                    <Box
                      key={item.id}
                      onClick={() => setActiveId(item.id)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.25,
                        px: 1.5, py: 0.9, mx: 0.75, mb: 0.25, borderRadius: 1.5,
                        cursor: 'pointer',
                        bgcolor: isActive
                          ? isDark ? `${item.color}20` : `${item.color}15`
                          : 'transparent',
                        borderLeft: `3px solid ${isActive ? item.color : 'transparent'}`,
                        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                        '&:hover': {
                          bgcolor: isDark ? `${item.color}12` : `${item.color}10`,
                          borderLeftColor: `${item.color}80`,
                        },
                      }}
                    >
                      <Box sx={{ color: isActive ? item.color : 'text.disabled', display: 'flex', alignItems: 'center', transition: 'color 0.18s', flexShrink: 0 }}>
                        {item.icon}
                      </Box>
                      <Typography sx={{
                        fontSize: 12.5,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? item.color : 'text.secondary',
                        transition: 'all 0.18s',
                        lineHeight: 1.3,
                      }}>
                        {item.label}
                      </Typography>
                      {isActive && (
                        <Box sx={{ ml: 'auto', width: 6, height: 6, borderRadius: '50%', bgcolor: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                      )}
                    </Box>
                  )
                })}
                {gi === NAV.length - 1 && <Box sx={{ pb: 1 }} />}
              </Box>
            ))}
          </Paper>
        </Box>

        {/* ── Content ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card sx={{ overflow: 'visible' }}>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Box key={activeId} sx={{ animation: 'tabContentIn 0.2s cubic-bezier(0.4,0,0.2,1) both' }}>
                {CONTENT_MAP[activeId]}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}
