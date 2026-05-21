import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Card, CardContent, Typography, Tabs, Tab, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Button, TextField, Chip, Alert, Select, MenuItem, FormControl,
  InputLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Tooltip, IconButton, Avatar, Skeleton,
  Divider, Paper, InputAdornment, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import Editor from '@monaco-editor/react'
import RefreshIcon from '@mui/icons-material/Refresh'
import SaveIcon from '@mui/icons-material/Save'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import SearchIcon from '@mui/icons-material/Search'
import LockResetIcon from '@mui/icons-material/LockReset'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import PersonIcon from '@mui/icons-material/Person'
import SettingsIcon from '@mui/icons-material/Settings'
import TelegramIcon from '@mui/icons-material/Telegram'
import SendIcon from '@mui/icons-material/Send'
import ArticleIcon from '@mui/icons-material/Article'
import TuneIcon from '@mui/icons-material/Tune'
import PeopleIcon from '@mui/icons-material/People'
import HistoryIcon from '@mui/icons-material/History'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { adminApi } from '../../services/api'
import { format } from 'date-fns'
import { useSnackbar } from 'notistack'
import { useThemeMode } from '../../theme/ThemeContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ROLE_COLOR = { superadmin: 'error', admin: 'warning', analyst: 'info', viewer: 'default' }
const ROLE_TH = { superadmin: 'ซูเปอร์แอดมิน', admin: 'ผู้ดูแลระบบ', analyst: 'นักวิเคราะห์', viewer: 'ผู้ชม' }

const ACTION_COLOR = {
  login: 'primary', logout: 'default',
  save_rule: 'warning', deploy_restart: 'error',
  create_user: 'success', update_user: 'info', delete_tuning: 'error',
  add_tuning: 'warning', save_config: 'secondary',
}

function getLevelColor(level) {
  if (level >= 12) return '#ef4444'
  if (level >= 7)  return '#f59e0b'
  if (level >= 4)  return '#3b82f6'
  return '#94a3b8'
}

function SectionHeader({ icon, title, count, action }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: 15 }}>{title}</Typography>
      {count !== undefined && (
        <Chip size="small" label={count} color="primary" sx={{ height: 18, fontSize: 10 }} />
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
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} /> : null}
        >
          ยืนยัน
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── XML Helpers ──────────────────────────────────────────────────────────────
function prettifyXML(xml) {
  try {
    const PADDING = '  '
    let formatted = ''
    let indent = 0
    const lines = xml.replace(/>\s*</g, '>\n<').split('\n')
    lines.forEach(line => {
      line = line.trim()
      if (!line) return
      if (line.match(/^<\/\w/) || line.match(/^<\w[^>]*\/>$/)) {
        if (line.match(/^<\//)) indent--
        formatted += PADDING.repeat(Math.max(0, indent)) + line + '\n'
        if (line.match(/^<\w[^>]*\/>$/)) {
          // self-closing, no change to indent
        }
      } else if (line.match(/^<\w/) && !line.includes('</') && !line.match(/\/>$/)) {
        formatted += PADDING.repeat(indent) + line + '\n'
        if (!line.match(/<\?xml/)) indent++
      } else {
        formatted += PADDING.repeat(indent) + line + '\n'
      }
    })
    return formatted.trim()
  } catch {
    return xml
  }
}

function parseRulesFromXml(xml) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const ruleEls = doc.querySelectorAll('rule')
    return Array.from(ruleEls).map(r => ({
      id: r.getAttribute('id') || '',
      level: r.getAttribute('level') || '',
      desc: r.querySelector('description')?.textContent?.trim() || '(no description)',
    })).filter(r => r.id)
  } catch {
    return []
  }
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────
function RulesTab() {
  const { mode } = useThemeMode()
  const { enqueueSnackbar } = useSnackbar()
  const [selectedFile, setSelectedFile] = useState(null)
  const [isCustomFile, setIsCustomFile] = useState(false)
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [search, setSearch] = useState('')
  const [ruleSearch, setRuleSearch] = useState('')
  const [deployConfirm, setDeployConfirm] = useState(false)
  const [showRuleList, setShowRuleList] = useState(true)
  const editorRef = useRef(null)

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['admin-rules'],
    queryFn: () => adminApi.listRules().then(r => r.data),
  })

  const allFiles = rulesData?.data?.affected_items || []
  const sortedFiles = [
    ...allFiles.filter(f => f.relative_dirname?.includes('etc')),
    ...allFiles.filter(f => !f.relative_dirname?.includes('etc')),
  ].filter(f => !search || f.filename.toLowerCase().includes(search.toLowerCase()))

  const customCount = allFiles.filter(f => f.relative_dirname?.includes('etc')).length
  const isDirty = content !== originalContent

  // Parse rules from current XML
  const parsedRules = parseRulesFromXml(content)
  const filteredRules = ruleSearch
    ? parsedRules.filter(r => r.id.includes(ruleSearch) || r.desc.toLowerCase().includes(ruleSearch.toLowerCase()))
    : parsedRules

  const loadFile = async (filename, customFlag) => {
    try {
      const r = await adminApi.getRule(filename)
      setSelectedFile(filename)
      setIsCustomFile(!!customFlag)
      const c = r.data.content || ''
      setContent(c)
      setOriginalContent(c)
      setRuleSearch('')
    } catch {
      enqueueSnackbar(`โหลดไฟล์ล้มเหลว: ${filename}`, { variant: 'error' })
    }
  }

  const handleFormat = () => {
    const pretty = prettifyXML(content)
    setContent(pretty)
    enqueueSnackbar('จัด Format XML เรียบร้อย', { variant: 'info' })
  }

  const handleGoToRule = (ruleId) => {
    if (!editorRef.current) return
    const model = editorRef.current.getModel()
    if (!model) return
    const text = model.getValue()
    const lines = text.split('\n')
    const lineIdx = lines.findIndex(l => l.includes(`id="${ruleId}"`))
    if (lineIdx >= 0) {
      editorRef.current.revealLineInCenter(lineIdx + 1)
      editorRef.current.setPosition({ lineNumber: lineIdx + 1, column: 1 })
      editorRef.current.focus()
    }
  }

  const saveFile = async () => {
    if (!selectedFile || !isCustomFile) return
    setSaving(true)
    try {
      await adminApi.saveRule(selectedFile, content)
      setOriginalContent(content)
      enqueueSnackbar('บันทึกสำเร็จ', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(e.response?.data?.detail || 'บันทึกล้มเหลว', { variant: 'error' })
    }
    setSaving(false)
  }

  const deploy = async () => {
    setDeployConfirm(false)
    setDeploying(true)
    try {
      await adminApi.deploy()
      enqueueSnackbar('Restart Wazuh Manager สำเร็จ — กำลัง reload rules...', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(e.response?.data?.detail || 'Restart ล้มเหลว', { variant: 'error' })
    }
    setDeploying(false)
  }

  return (
    <Box>
      <SectionHeader
        icon={<ArticleIcon fontSize="small" />}
        title="Rules & Decoders"
        count={allFiles.length}
        action={
          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={deploying ? <CircularProgress size={14} color="inherit" /> : <RocketLaunchIcon />}
            onClick={() => setDeployConfirm(true)}
            disabled={deploying}
            sx={{ borderRadius: 2 }}
          >
            Deploy Wazuh
          </Button>
        }
      />

      <Grid container spacing={1.5}>
        {/* ── File list panel ──────────────────────────────── */}
        <Grid item xs={12} sm={3}>
          <TextField
            size="small" fullWidth placeholder="ค้นหาไฟล์..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
            sx={{ mb: 1 }}
          />
          <Paper variant="outlined" sx={{ maxHeight: 540, overflow: 'auto' }}>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={30} sx={{ mx: 1 }} />)
              : (() => {
                  let lastGroup = null
                  return sortedFiles.map((f, i) => {
                    const isCustom = f.relative_dirname?.includes('etc')
                    const group = isCustom ? 'CUSTOM RULES' : 'DEFAULT RULES'
                    const showHeader = group !== lastGroup
                    lastGroup = group
                    return (
                      <Box key={i}>
                        {showHeader && (
                          <Box sx={{
                            px: 1.5, py: 0.5, fontSize: 10, fontWeight: 700,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: isCustom ? 'warning.main' : 'text.disabled',
                            bgcolor: 'action.hover',
                            borderBottom: '1px solid', borderBottomColor: 'divider',
                            display: 'flex', alignItems: 'center', gap: 0.5,
                          }}>
                            {isCustom ? '✏️ ' : '📖 '}{group}{isCustom ? ` (${customCount})` : ''}
                          </Box>
                        )}
                        <Tooltip title={f.relative_dirname + '/' + f.filename} placement="right" arrow>
                          <Box
                            onClick={() => loadFile(f.filename, isCustom)}
                            sx={{
                              px: 1.5, py: 0.7,
                              cursor: 'pointer',
                              fontSize: 11.5,
                              fontFamily: '"IBM Plex Mono", monospace',
                              bgcolor: selectedFile === f.filename ? 'primary.main' + '1a' : 'transparent',
                              borderLeft: selectedFile === f.filename ? '2px solid' : '2px solid transparent',
                              borderColor: selectedFile === f.filename ? 'primary.main' : 'transparent',
                              color: selectedFile === f.filename
                                ? 'primary.main'
                                : isCustom ? 'text.primary' : 'text.secondary',
                              fontWeight: isCustom ? 500 : 400,
                              '&:hover': { bgcolor: 'action.hover' },
                              borderBottom: '1px solid', borderBottomColor: 'divider',
                              transition: 'all 0.1s',
                            }}
                          >
                            {f.filename}
                          </Box>
                        </Tooltip>
                      </Box>
                    )
                  })
                })()}
            {!isLoading && sortedFiles.length === 0 && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.disabled">ไม่พบไฟล์</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* ── Editor + Rule List panel ─────────────────────── */}
        <Grid item xs={12} sm={9}>
          {selectedFile ? (
            <Box>
              {/* Toolbar */}
              <Paper variant="outlined" sx={{ px: 1.5, py: 0.8, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {/* File info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1, minWidth: 0 }}>
                  <Chip
                    size="small"
                    label={isCustomFile ? 'Custom' : 'Default'}
                    color={isCustomFile ? 'warning' : 'default'}
                    sx={{ height: 20, fontSize: 10 }}
                  />
                  <Typography variant="caption" fontFamily='"IBM Plex Mono",monospace' fontWeight={600} noWrap sx={{ fontSize: 12 }}>
                    {selectedFile}
                  </Typography>
                  {isDirty && isCustomFile && (
                    <Chip size="small" label="ยังไม่บันทึก" color="warning" sx={{ height: 16, fontSize: 10 }} />
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, ml: 'auto', whiteSpace: 'nowrap' }}>
                    {parsedRules.length} rules • {content.split('\n').length} lines
                  </Typography>
                </Box>

                {/* Action buttons */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="จัด Format XML ให้เป็นระเบียบ">
                    <IconButton size="small" onClick={handleFormat} sx={{ borderRadius: 1.5 }}>
                      <Box component="span" sx={{ fontSize: 14, lineHeight: 1 }}>⇌</Box>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={showRuleList ? 'ซ่อน Rule List' : 'แสดง Rule List'}>
                    <IconButton size="small" onClick={() => setShowRuleList(v => !v)} sx={{ borderRadius: 1.5 }}>
                      <TuneIcon fontSize="small" sx={{ color: showRuleList ? 'primary.main' : 'text.disabled' }} />
                    </IconButton>
                  </Tooltip>
                  {isCustomFile ? (
                    <Button
                      size="small"
                      startIcon={saving ? <CircularProgress size={13} /> : <SaveIcon />}
                      variant="outlined"
                      color="primary"
                      onClick={saveFile}
                      disabled={saving || !isDirty}
                      sx={{ borderRadius: 2, fontSize: 12 }}
                    >
                      บันทึก
                    </Button>
                  ) : (
                    <Chip size="small" label="อ่านได้อย่างเดียว" color="default" sx={{ height: 24, fontSize: 10 }} />
                  )}
                </Box>
              </Paper>

              {/* Warning for default rules */}
              {!isCustomFile && (
                <Alert severity="warning" sx={{ mb: 1, py: 0.5, fontSize: 12 }}>
                  <strong>Default Rule</strong> — ไฟล์นี้จะถูกเขียนทับเมื่ออัปเดต Wazuh
                  เพิ่ม rules ที่ต้องการแก้ไขไว้ใน <strong>local_rules.xml</strong> แทน
                </Alert>
              )}

              {/* Main layout: Editor | Rule List */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                {/* Monaco Editor */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
                    <Editor
                      height="500px"
                      language="xml"
                      value={content}
                      theme={mode === 'dark' ? 'vs-dark' : 'light'}
                      onChange={v => isCustomFile && setContent(v || '')}
                      onMount={editor => { editorRef.current = editor }}
                      options={{
                        fontSize: 13,
                        fontFamily: '"IBM Plex Mono", monospace',
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        renderLineHighlight: 'line',
                        padding: { top: 8 },
                        readOnly: !isCustomFile,
                        folding: true,
                        foldingHighlight: true,
                        showFoldingControls: 'always',
                        bracketPairColorization: { enabled: true },
                        renderWhitespace: 'none',
                        smoothScrolling: true,
                        cursorBlinking: 'smooth',
                      }}
                    />
                  </Paper>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, mt: 0.5, display: 'block', pl: 0.5 }}>
                    💡 Ctrl+F ค้นหา • Ctrl+H แทนที่ • Alt+Z ตัดบรรทัด • Ctrl+/ คอมเมนต์
                  </Typography>
                </Box>

                {/* Rule List sidebar */}
                {showRuleList && parsedRules.length > 0 && (
                  <Box sx={{ width: 220, flexShrink: 0 }}>
                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Box sx={{ px: 1.5, py: 0.8, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11 }}>
                          📋 Rules ในไฟล์ ({parsedRules.length})
                        </Typography>
                      </Box>
                      <TextField
                        size="small" fullWidth
                        placeholder="ค้นหา Rule ID / description..."
                        value={ruleSearch}
                        onChange={e => setRuleSearch(e.target.value)}
                        sx={{ '& .MuiInputBase-root': { borderRadius: 0, fontSize: 11 }, '& fieldset': { border: 'none', borderBottom: '1px solid', borderColor: 'divider' } }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14, color: 'text.disabled' }} /></InputAdornment> }}
                      />
                      <Box sx={{ maxHeight: 430, overflow: 'auto' }}>
                        {filteredRules.map(r => (
                          <Box
                            key={r.id}
                            onClick={() => handleGoToRule(r.id)}
                            sx={{
                              px: 1.5, py: 0.7,
                              cursor: 'pointer',
                              borderBottom: '1px solid', borderColor: 'divider',
                              '&:hover': { bgcolor: 'action.hover' },
                              transition: 'background 0.1s',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                              <Chip
                                size="small"
                                label={`#${r.id}`}
                                sx={{
                                  height: 16, fontSize: 10, fontFamily: '"IBM Plex Mono",monospace',
                                  bgcolor: getLevelColor(+r.level) + '22',
                                  color: getLevelColor(+r.level),
                                  fontWeight: 700,
                                }}
                              />
                              {r.level && (
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                                  lv.{r.level}
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3, display: 'block' }}>
                              {r.desc.length > 55 ? r.desc.slice(0, 55) + '…' : r.desc}
                            </Typography>
                          </Box>
                        ))}
                        {filteredRules.length === 0 && (
                          <Box sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.disabled">ไม่พบ rule</Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{
              height: 540,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '1px dashed', borderColor: 'divider', borderRadius: 2, gap: 1.5,
            }}>
              <ArticleIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.disabled" fontWeight={500}>เลือกไฟล์จากรายการด้านซ้าย</Typography>
              <Typography variant="caption" color="text.disabled">
                ✏️ Custom Rules (etc/rules) — แก้ไขได้&nbsp;&nbsp;|&nbsp;&nbsp;📖 Default Rules — อ่านอย่างเดียว
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      <ConfirmDialog
        open={deployConfirm}
        onClose={() => setDeployConfirm(false)}
        onConfirm={deploy}
        title="ยืนยันการ Deploy"
        message="การ Restart Wazuh Manager จะทำให้ระบบ SIEM หยุดรับ logs ชั่วคราว (~30 วินาที) แน่ใจหรือไม่?"
        confirmColor="warning"
        loading={deploying}
      />
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tuning'] })
      setAddOpen(false)
      setForm({ rule_id: '', original_level: 7, tuned_level: 3, reason: '' })
      enqueueSnackbar('เพิ่ม Tuning สำเร็จ', { variant: 'success' })
    },
    onError: e => enqueueSnackbar(e.response?.data?.detail || 'เกิดข้อผิดพลาด', { variant: 'error' }),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateTuningStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tuning'] }),
    onError: e => enqueueSnackbar(e.response?.data?.detail || 'ไม่สามารถอัปเดตสถานะ', { variant: 'error' }),
  })

  const deleteMut = useMutation({
    mutationFn: id => adminApi.deleteTuning(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tuning'] })
      setDeleteTarget(null)
      enqueueSnackbar('ลบ Tuning สำเร็จ', { variant: 'success' })
    },
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
      <SectionHeader
        icon={<TuneIcon fontSize="small" />}
        title="Alert Tuning"
        count={tunings.length}
        action={
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            เพิ่ม Tuning
          </Button>
        }
      />

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
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton height={20} /></TableCell>
                    ))}
                  </TableRow>
                ))
              : tunings.map(t => (
                  <TableRow key={t.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, fontWeight: 600 }}>
                      {t.rule_id}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={t.original_level}
                        sx={{ bgcolor: getLevelColor(t.original_level) + '22', color: getLevelColor(t.original_level), fontWeight: 700, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={t.tuned_level}
                        sx={{ bgcolor: getLevelColor(t.tuned_level) + '22', color: getLevelColor(t.tuned_level), fontWeight: 700, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, maxWidth: 200 }}>{t.reason}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{t.added_by}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>
                      {t.added_at ? format(new Date(t.added_at), 'dd/MM/yy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={t.status}
                        onChange={e => statusMut.mutate({ id: t.id, status: e.target.value })}
                        sx={{ fontSize: 11, height: 26, '& .MuiSelect-select': { py: 0.3 } }}
                        variant="outlined"
                      >
                        <MenuItem value="active" sx={{ fontSize: 12 }}>active</MenuItem>
                        <MenuItem value="expired" sx={{ fontSize: 12 }}>expired</MenuItem>
                        <MenuItem value="reverted" sx={{ fontSize: 12 }}>reverted</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="ลบ">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(t)}
                          sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {!isLoading && tunings.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <TuneIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.disabled">ยังไม่มี Alert Tuning</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ mt: 1 }}>
              เพิ่ม Tuning แรก
            </Button>
          </Box>
        )}
      </TableContainer>

      {/* Add dialog */}
      <Dialog open={addOpen} onClose={() => { setAddOpen(false); setFormError({}) }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>เพิ่ม Alert Tuning</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Rule ID" value={form.rule_id}
                error={!!formError.rule_id} helperText={formError.rule_id}
                onChange={e => setForm(f => ({ ...f, rule_id: e.target.value }))}
                placeholder="เช่น 100001"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" label="ระดับเดิม" type="number"
                error={!!formError.original_level} helperText={formError.original_level}
                inputProps={{ min: 1, max: 15 }}
                value={form.original_level}
                onChange={e => setForm(f => ({ ...f, original_level: +e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" label="ระดับใหม่" type="number"
                error={!!formError.tuned_level} helperText={formError.tuned_level}
                inputProps={{ min: 1, max: 15 }}
                value={form.tuned_level}
                onChange={e => setForm(f => ({ ...f, tuned_level: +e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="เหตุผล" multiline rows={2}
                error={!!formError.reason} helperText={formError.reason}
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddOpen(false); setFormError({}) }}>ยกเลิก</Button>
          <Button
            variant="contained"
            onClick={() => validateForm() && addMut.mutate(form)}
            disabled={addMut.isPending}
            startIcon={addMut.isPending ? <CircularProgress size={13} /> : null}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget?.id)}
        title="ยืนยันการลบ"
        message={`ลบ Tuning Rule ID "${deleteTarget?.rule_id}" ออกจากระบบ?`}
        loading={deleteMut.isPending}
      />
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setAddOpen(false)
      setForm({ username: '', email: '', full_name: '', password: '', role: 'viewer' })
      enqueueSnackbar('สร้างผู้ใช้สำเร็จ', { variant: 'success' })
    },
    onError: e => enqueueSnackbar(e.response?.data?.detail || 'เกิดข้อผิดพลาด', { variant: 'error' }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      enqueueSnackbar('อัปเดตสำเร็จ', { variant: 'success' })
    },
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

  const handleResetPwd = () => {
    if (pwdValue.length < 8) { enqueueSnackbar('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', { variant: 'warning' }); return }
    updateMut.mutate({ id: pwdTarget.id, data: { password: pwdValue } })
    setPwdTarget(null)
    setPwdValue('')
  }

  return (
    <Box>
      <SectionHeader
        icon={<PeopleIcon fontSize="small" />}
        title="ผู้ใช้ระบบ"
        count={users.length}
        action={
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ borderRadius: 2 }}>
            สร้างผู้ใช้
          </Button>
        }
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
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton height={20} /></TableCell>
                    ))}
                  </TableRow>
                ))
              : users.map(u => (
                  <TableRow key={u.id} hover sx={{ '&:last-child td': { border: 0 }, opacity: u.is_active ? 1 : 0.55 }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 28, height: 28, fontSize: 11, fontWeight: 700,
                            background: u.is_active ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : '#94a3b8',
                          }}
                        >
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
                      <Select
                        size="small"
                        value={u.role}
                        onChange={e => updateMut.mutate({ id: u.id, data: { role: e.target.value } })}
                        sx={{ fontSize: 11, height: 26, '& .MuiSelect-select': { py: 0.3 } }}
                      >
                        {['viewer', 'analyst', 'admin', 'superadmin'].map(r => (
                          <MenuItem key={r} value={r} sx={{ fontSize: 12 }}>{ROLE_TH[r]}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={u.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                        color={u.is_active ? 'success' : 'default'}
                        sx={{ height: 20, fontSize: 10 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>
                      {u.last_login ? format(new Date(u.last_login), 'dd/MM/yy HH:mm') : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="รีเซ็ตรหัสผ่าน">
                          <IconButton size="small" onClick={() => setPwdTarget(u)} sx={{ opacity: 0.7, '&:hover': { opacity: 1, color: 'warning.main' } }}>
                            <LockResetIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                          <IconButton
                            size="small"
                            onClick={() => updateMut.mutate({ id: u.id, data: { is_active: !u.is_active } })}
                            sx={{ opacity: 0.7, '&:hover': { opacity: 1, color: u.is_active ? 'error.main' : 'success.main' } }}
                          >
                            {u.is_active ? <PersonOffIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create user dialog */}
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
                <TextField
                  fullWidth size="small" label={label} type={type}
                  error={!!formError[key]} helperText={formError[key]}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
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
          <Button
            variant="contained"
            onClick={() => validateForm() && addMut.mutate(form)}
            disabled={addMut.isPending}
            startIcon={addMut.isPending ? <CircularProgress size={13} /> : null}
          >
            สร้าง
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password reset dialog */}
      <Dialog open={!!pwdTarget} onClose={() => setPwdTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>รีเซ็ตรหัสผ่าน</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            ผู้ใช้: <strong>{pwdTarget?.username}</strong>
          </Typography>
          <TextField
            fullWidth size="small"
            label="รหัสผ่านใหม่"
            type="password"
            value={pwdValue}
            onChange={e => setPwdValue(e.target.value)}
            helperText="ต้องมีอย่างน้อย 8 ตัวอักษร"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPwdTarget(null)}>ยกเลิก</Button>
          <Button variant="contained" color="warning" onClick={handleResetPwd} disabled={updateMut.isPending}>
            รีเซ็ต
          </Button>
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

  const filtered = actionFilter
    ? logs.filter(l => l.action === actionFilter)
    : logs

  const actions = [...new Set(logs.map(l => l.action))].sort()

  return (
    <Box>
      <SectionHeader
        icon={<HistoryIcon fontSize="small" />}
        title="Audit Log"
        count={filtered.length}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.disabled">
              รีเฟรชใน {countdown}s
            </Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                displayEmpty
                sx={{ fontSize: 12, height: 30 }}
              >
                <MenuItem value="">ทุก action</MenuItem>
                {actions.map(a => <MenuItem key={a} value={a} sx={{ fontSize: 12 }}>{a}</MenuItem>)}
              </Select>
            </FormControl>
            <Select
              size="small"
              value={limit}
              onChange={e => setLimit(e.target.value)}
              sx={{ fontSize: 12, height: 30, minWidth: 80 }}
            >
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
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton height={20} /></TableCell>
                    ))}
                  </TableRow>
                ))
              : filtered.map(l => (
                  <TableRow key={l.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap', fontFamily: '"IBM Plex Mono",monospace' }}>
                      {l.timestamp ? format(new Date(l.timestamp), 'dd/MM HH:mm:ss') : '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{l.username}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={l.action}
                        color={ACTION_COLOR[l.action] || 'default'}
                        sx={{ height: 18, fontSize: 10 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono",monospace', color: 'text.secondary' }}>
                      {l.target || '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary', maxWidth: 180 }} title={l.detail}>
                      {l.detail ? l.detail.substring(0, 40) + (l.detail.length > 40 ? '…' : '') : '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: '"IBM Plex Mono",monospace', color: 'text.disabled' }}>
                      {l.ip_address || '-'}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {!isLoading && filtered.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <HistoryIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.disabled">ไม่มีบันทึกการใช้งาน</Typography>
          </Box>
        )}
      </TableContainer>
    </Box>
  )
}

// ─── Alert Config Tab ─────────────────────────────────────────────────────────
function AlertConfigTab() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [config, setConfig] = useState({
    telegram_bot_token: '',
    telegram_chat_id: '',
    alert_level_threshold: '12',
  })
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

  const handleChange = (key, value) => {
    setConfig(c => ({ ...c, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.saveConfig(config)
      setDirty(false)
      enqueueSnackbar('บันทึกการตั้งค่าสำเร็จ', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(e.response?.data?.detail || 'บันทึกล้มเหลว', { variant: 'error' })
    }
    setSaving(false)
  }

  const handleTest = async () => {
    if (!config.telegram_bot_token || !config.telegram_chat_id) {
      enqueueSnackbar('กรุณากรอก Bot Token และ Chat ID ก่อน', { variant: 'warning' })
      return
    }
    setTesting(true)
    try {
      const url = `https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.telegram_chat_id,
          text: '🔔 SOC Center — ทดสอบการแจ้งเตือน\nระบบทำงานปกติ',
        }),
      })
      const data = await res.json()
      if (data.ok) enqueueSnackbar('ส่ง test message สำเร็จ ✓', { variant: 'success' })
      else enqueueSnackbar(`ส่งไม่สำเร็จ: ${data.description}`, { variant: 'error' })
    } catch {
      enqueueSnackbar('ไม่สามารถเชื่อมต่อ Telegram API', { variant: 'error' })
    }
    setTesting(false)
  }

  const THRESHOLD_OPTIONS = [
    { value: '7',  label: 'ระดับ 7+ (Medium–Critical)' },
    { value: '10', label: 'ระดับ 10+ (High–Critical)' },
    { value: '12', label: 'ระดับ 12+ (High–Critical เท่านั้น)' },
    { value: '15', label: 'ระดับ 15 (Critical เท่านั้น)' },
  ]

  return (
    <Box>
      <SectionHeader
        icon={<SettingsIcon fontSize="small" />}
        title="การตั้งค่าแจ้งเตือน"
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={56} />)}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Telegram section */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TelegramIcon sx={{ color: '#229ED9', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={700}>Telegram Bot</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Bot Token"
                    type="password"
                    value={config.telegram_bot_token}
                    onChange={e => handleChange('telegram_bot_token', e.target.value)}
                    placeholder="123456789:AAHxxxxxx..."
                    helperText="ได้จาก @BotFather บน Telegram"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Chat ID"
                    value={config.telegram_chat_id}
                    onChange={e => handleChange('telegram_chat_id', e.target.value)}
                    placeholder="-1001234567890"
                    helperText="Group chat ID (ขึ้นต้นด้วย -100...)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={testing ? <CircularProgress size={14} /> : <SendIcon />}
                    onClick={handleTest}
                    disabled={testing}
                    sx={{ borderRadius: 2 }}
                  >
                    ส่ง Test Message
                  </Button>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Alert threshold section */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={700}>เกณฑ์การแจ้งเตือน</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                ระดับความรุนแรงขั้นต่ำที่จะส่งการแจ้งเตือนไปยัง Telegram
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>ระดับความรุนแรงขั้นต่ำ</InputLabel>
                <Select
                  value={config.alert_level_threshold}
                  label="ระดับความรุนแรงขั้นต่ำ"
                  onChange={e => handleChange('alert_level_threshold', e.target.value)}
                >
                  {THRESHOLD_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Alert severity="info" sx={{ mt: 2, fontSize: 12 }}>
                การแจ้งเตือน WebSocket จะส่ง alerts ที่มีระดับ 7+ เสมอ<br/>
                การตั้งค่านี้ใช้สำหรับ Telegram notification เท่านั้น
              </Alert>
            </Card>
          </Grid>

          {/* Save button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              {dirty && (
                <Typography variant="caption" color="warning.main" sx={{ alignSelf: 'center' }}>
                  มีการเปลี่ยนแปลงที่ยังไม่บันทึก
                </Typography>
              )}
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving || !dirty}
                sx={{ borderRadius: 2 }}
              >
                บันทึกการตั้งค่า
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}

// ─── Main AdminPage ────────────────────────────────────────────────────────────
const TABS = [
  { label: 'Rules & Decoders', icon: <ArticleIcon fontSize="small" />, component: <RulesTab /> },
  { label: 'Alert Tuning',     icon: <TuneIcon fontSize="small" />,    component: <TuningTab /> },
  { label: 'ผู้ใช้ระบบ',       icon: <PeopleIcon fontSize="small" />,  component: <UsersTab /> },
  { label: 'Audit Log',        icon: <HistoryIcon fontSize="small" />,  component: <AuditTab /> },
  { label: 'การตั้งค่า',       icon: <SettingsIcon fontSize="small" />, component: <AlertConfigTab /> },
]

export default function AdminPage() {
  const [tab, setTab] = useState(0)

  return (
    <Box className="page-enter">
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" fontWeight={700} lineHeight={1.2}>ผู้ดูแลระบบ</Typography>
        <Typography variant="caption" color="text.secondary">
          จัดการ Rules, Alert Tuning, ผู้ใช้ และการตั้งค่า
        </Typography>
      </Box>

      <Card sx={{ overflow: 'visible' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
                fontSize: 13,
                textTransform: 'none',
                fontWeight: 500,
                gap: 0.5,
              },
              '& .Mui-selected': { fontWeight: 700 },
            }}
          >
            {TABS.map((t, i) => (
              <Tab
                key={i}
                label={t.label}
                icon={t.icon}
                iconPosition="start"
                sx={{ px: 2 }}
              />
            ))}
          </Tabs>
        </Box>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          {TABS[tab].component}
        </CardContent>
      </Card>
    </Box>
  )
}
