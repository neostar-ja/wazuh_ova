import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton,
  InputAdornment, Paper, Skeleton, TextField, Tooltip, Typography,
  useTheme,
} from '@mui/material'
import { Grid } from '@mui/material'
import Editor from '@monaco-editor/react'
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded'
import CodeRoundedIcon from '@mui/icons-material/CodeRounded'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import FolderRoundedIcon from '@mui/icons-material/FolderRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import { useSnackbar } from 'notistack'
import { adminApi } from '../../../services/api'
import { useThemeMode } from '../../../theme/ThemeContext'
import { BRAND, ConfirmDialog, getLevelColor, prettifyXML, RuleItem, SectionHeader } from '../shared'

interface XmlFileEditorProps {
  title: string
  listFn: () => Promise<any>
  getFn: (filename: string) => Promise<any>
  saveFn: (filename: string, content: string) => Promise<any>
  parseItemsFn: (xml: string) => RuleItem[]
  itemLabel: string
}

const NAV_COLOR: Record<string, string> = { Rules: BRAND.purple, Decoders: '#3B82F6' }

export function XmlFileEditor({ title, listFn, getFn, saveFn, parseItemsFn, itemLabel }: XmlFileEditorProps) {
  const { mode } = useThemeMode()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { enqueueSnackbar } = useSnackbar()
  const accentColor = NAV_COLOR[title] || BRAND.purple

  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isCustomFile, setIsCustomFile] = useState(false)
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [showList, setShowList] = useState(true)
  const [deployConfirm, setDeployConfirm] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const editorRef = useRef<any>(null)

  const { data: filesData, isLoading } = useQuery({
    queryKey: [`admin-${title}-files`],
    queryFn: () => listFn().then(r => r.data),
  })

  const allFiles = filesData?.data?.affected_items || []
  const customCount = allFiles.filter((f: any) => f.relative_dirname?.includes('etc')).length
  const sorted = [
    ...allFiles.filter((f: any) => f.relative_dirname?.includes('etc')),
    ...allFiles.filter((f: any) => !f.relative_dirname?.includes('etc')),
  ].filter((f: any) => !search || f.filename.toLowerCase().includes(search.toLowerCase())) as any[]

  const isDirty = content !== originalContent
  const parsedItems = parseItemsFn(content)
  const filteredItems = itemSearch
    ? parsedItems.filter(r =>
        r.id?.toLowerCase().includes(itemSearch.toLowerCase()) ||
        r.desc?.toLowerCase().includes(itemSearch.toLowerCase()) ||
        r.parent?.toLowerCase().includes(itemSearch.toLowerCase()))
    : parsedItems

  const loadFile = async (filename: string, custom: boolean) => {
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

  const jumpToItem = (id: string) => {
    if (!editorRef.current) return
    const lines = editorRef.current.getModel()?.getValue()?.split('\n') || []
    const idx = lines.findIndex((l: string) => l.includes(`id="${id}"`) || l.includes(`name="${id}"`))
    if (idx >= 0) {
      editorRef.current.revealLineInCenter(idx + 1)
      editorRef.current.setPosition({ lineNumber: idx + 1, column: 1 })
      editorRef.current.focus()
    }
  }

  return (
    <Box>
      <SectionHeader
        icon={title === 'Rules' ? <ArticleRoundedIcon fontSize="small" /> : <CodeRoundedIcon fontSize="small" />}
        title={title}
        count={allFiles.length}
        color={accentColor}
        action={
          <Button size="small" variant="contained" color="warning"
            startIcon={deploying ? <CircularProgress size={13} color="inherit" /> : <RocketLaunchRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={() => setDeployConfirm(true)} disabled={deploying}
            sx={{ borderRadius: 2, fontSize: 12, height: 32 }}>
            Deploy
          </Button>
        }
      />

      <Grid container spacing={1.5} sx={{ mt: 2 }}>
        {/* File list */}
        <Grid item xs={12} sm={3}>
          <TextField size="small" fullWidth placeholder="ค้นหาไฟล์..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment>,
              sx: { fontSize: 12.5, borderRadius: 1.75 },
            }}
            sx={{ mb: 1 }} />

          <Paper variant="outlined" sx={{ maxHeight: 540, overflow: 'auto', borderRadius: 2 }}>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Box key={i} sx={{ px: 1.5, py: 0.5 }}><Skeleton height={24} /></Box>
                ))
              : (() => {
                  let lastGroup: string | null = null
                  return sorted.map((f, i) => {
                    const isCustom = f.relative_dirname?.includes('etc')
                    const group = isCustom ? 'CUSTOM' : 'DEFAULT'
                    const showGroupHeader = group !== lastGroup
                    lastGroup = group
                    const isSelected = selectedFile === f.filename
                    return (
                      <Box key={i}>
                        {showGroupHeader && (
                          <Box sx={{
                            px: 1.5, py: 0.625,
                            display: 'flex', alignItems: 'center', gap: 0.75,
                            bgcolor: 'action.hover',
                            borderBottom: '1px solid', borderColor: 'divider',
                          }}>
                            {isCustom
                              ? <FolderOpenRoundedIcon sx={{ fontSize: 12, color: 'warning.main' }} />
                              : <FolderRoundedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
                            <Typography sx={{
                              fontSize: 9.5, fontWeight: 800, letterSpacing: '0.09em',
                              textTransform: 'uppercase',
                              color: isCustom ? 'warning.main' : 'text.disabled',
                            }}>
                              {isCustom ? `Custom (${customCount})` : 'Default'}
                            </Typography>
                          </Box>
                        )}
                        <Tooltip title={`${f.relative_dirname}/${f.filename}`} placement="right" arrow>
                          <Box
                            onClick={() => loadFile(f.filename, isCustom)}
                            sx={{
                              px: 1.5, py: 0.75, cursor: 'pointer',
                              fontSize: 12, fontFamily: '"IBM Plex Mono",monospace',
                              bgcolor: isSelected ? alpha(accentColor, isDark ? 0.18 : 0.1) : 'transparent',
                              borderLeft: `2.5px solid ${isSelected ? accentColor : 'transparent'}`,
                              color: isSelected ? accentColor : isCustom ? 'text.primary' : 'text.secondary',
                              fontWeight: isCustom ? 500 : 400,
                              '&:hover': { bgcolor: alpha(accentColor, 0.07) },
                              borderBottom: '1px solid', borderBottomColor: 'divider',
                              transition: 'all 0.1s',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                            {f.filename}
                          </Box>
                        </Tooltip>
                      </Box>
                    )
                  })
                })()}
            {!isLoading && sorted.length === 0 && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
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
              <Paper variant="outlined" sx={{
                px: 1.5, py: 0.875, mb: 1.25,
                display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
                borderRadius: 2,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.875, flex: 1, minWidth: 0 }}>
                  <Box sx={{
                    px: 0.75, py: 0.2, borderRadius: 0.875,
                    bgcolor: isCustomFile ? alpha('#F59E0B', 0.15) : alpha('#94A3B8', 0.12),
                    color: isCustomFile ? '#F59E0B' : 'text.secondary',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>
                    {isCustomFile ? 'CUSTOM' : 'DEFAULT'}
                  </Box>
                  <Typography variant="caption" sx={{
                    fontFamily: '"IBM Plex Mono",monospace', fontWeight: 600,
                    fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {selectedFile}
                  </Typography>
                  {isDirty && isCustomFile && (
                    <Box sx={{
                      px: 0.75, py: 0.2, borderRadius: 0.875, flexShrink: 0,
                      bgcolor: alpha('#F59E0B', 0.15), color: '#F59E0B',
                      fontSize: 10, fontWeight: 700,
                    }}>
                      ● unsaved
                    </Box>
                  )}
                </Box>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10.5, flexShrink: 0 }}>
                  {parsedItems.length} {itemLabel} · {content.split('\n').length} lines
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Format XML (prettify)">
                    <IconButton size="small" onClick={() => setContent(prettifyXML(content))}
                      sx={{ borderRadius: 1.5, color: 'text.secondary', '&:hover': { color: accentColor } }}>
                      <AutoFixHighRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={showList ? 'ซ่อน item list' : 'แสดง item list'}>
                    <IconButton size="small" onClick={() => setShowList(v => !v)}
                      sx={{ borderRadius: 1.5, color: showList ? accentColor : 'text.disabled' }}>
                      <TuneRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  {isCustomFile ? (
                    <Button size="small"
                      startIcon={saving ? <CircularProgress size={12} /> : <SaveRoundedIcon sx={{ fontSize: 14 }} />}
                      variant="contained" disableElevation onClick={saveFile} disabled={saving || !isDirty}
                      sx={{ borderRadius: 1.75, fontSize: 12, height: 30, px: 1.5 }}>
                      บันทึก
                    </Button>
                  ) : (
                    <Box sx={{
                      px: 0.875, py: 0.3, borderRadius: 1,
                      bgcolor: 'action.hover', color: 'text.disabled',
                      fontSize: 11, fontWeight: 600,
                    }}>
                      read-only
                    </Box>
                  )}
                </Box>
              </Paper>

              {!isCustomFile && (
                <Alert severity="warning" sx={{ mb: 1.25, py: 0.5, fontSize: 12, borderRadius: 1.75 }}>
                  <strong>Default file</strong> — จะถูกเขียนทับเมื่ออัปเดต Wazuh แก้ไขใน{' '}
                  <strong>local_{title.toLowerCase()}.xml</strong> แทน
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Paper variant="outlined" sx={{ borderRadius: 1.75, overflow: 'hidden' }}>
                    <Editor height="500px" language="xml" value={content}
                      theme={mode === 'dark' ? 'vs-dark' : 'light'}
                      onChange={v => isCustomFile && setContent(v || '')}
                      onMount={e => { editorRef.current = e }}
                      options={{
                        fontSize: 13, fontFamily: '"IBM Plex Mono",monospace',
                        minimap: { enabled: false }, wordWrap: 'on',
                        scrollBeyondLastLine: false, lineNumbers: 'on',
                        renderLineHighlight: 'line', padding: { top: 10, bottom: 8 },
                        readOnly: !isCustomFile, folding: true, showFoldingControls: 'always',
                        bracketPairColorization: { enabled: true }, smoothScrolling: true,
                        cursorBlinking: 'smooth',
                      }}
                    />
                  </Paper>
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.75, pl: 0.5 }}>
                    Ctrl+F ค้นหา · Ctrl+H แทนที่ · Alt+Z word wrap · Ctrl+/ comment
                  </Typography>
                </Box>

                {showList && parsedItems.length > 0 && (
                  <Box sx={{ width: 210, flexShrink: 0 }}>
                    <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
                      <Box sx={{
                        px: 1.5, py: 0.875,
                        borderBottom: '1px solid', borderColor: 'divider',
                        bgcolor: 'action.hover',
                        display: 'flex', alignItems: 'center', gap: 0.75,
                      }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, flex: 1 }}>
                          {itemLabel}
                        </Typography>
                        <Box sx={{
                          px: 0.625, height: 16, display: 'inline-flex', alignItems: 'center',
                          borderRadius: 0.75, bgcolor: alpha(accentColor, 0.12), color: accentColor,
                          fontSize: 10, fontWeight: 700, fontFamily: '"IBM Plex Mono",monospace',
                        }}>
                          {parsedItems.length}
                        </Box>
                      </Box>
                      <Box sx={{ px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <TextField size="small" fullWidth placeholder={`ค้นหา...`}
                          value={itemSearch} onChange={e => setItemSearch(e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 14, color: 'text.disabled' }} /></InputAdornment>,
                            sx: { fontSize: 11.5, borderRadius: 1.25 },
                          }}
                        />
                      </Box>
                      <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
                        {filteredItems.map(r => {
                          const lvNum = +(r.level || 0)
                          const lvColor = getLevelColor(lvNum)
                          return (
                            <Box key={r.id} onClick={() => jumpToItem(r.id)}
                              sx={{
                                px: 1.25, py: 0.875, cursor: 'pointer',
                                borderBottom: '1px solid', borderColor: 'divider',
                                '&:hover': { bgcolor: alpha(accentColor, 0.06) },
                                transition: 'background 0.1s',
                              }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                                {r.level ? (
                                  <Box sx={{
                                    px: 0.5, height: 15, display: 'inline-flex', alignItems: 'center',
                                    borderRadius: 0.625, bgcolor: alpha(lvColor, 0.15), color: lvColor,
                                    fontSize: 9.5, fontWeight: 800, fontFamily: '"IBM Plex Mono",monospace',
                                  }}>
                                    lv.{r.level}
                                  </Box>
                                ) : r.parent ? (
                                  <Box sx={{
                                    px: 0.5, height: 15, display: 'inline-flex', alignItems: 'center',
                                    borderRadius: 0.625, bgcolor: alpha('#3B82F6', 0.12), color: '#3B82F6',
                                    fontSize: 9.5, fontWeight: 700,
                                  }}>
                                    child
                                  </Box>
                                ) : null}
                                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontFamily: '"IBM Plex Mono",monospace' }}>
                                  {r.id?.slice(0, 10)}
                                </Typography>
                              </Box>
                              <Typography sx={{
                                fontSize: 11, color: 'text.secondary', lineHeight: 1.35,
                                overflow: 'hidden', display: '-webkit-box',
                                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              }}>
                                {r.desc || r.program || r.parent || ''}
                              </Typography>
                            </Box>
                          )
                        })}
                        {filteredItems.length === 0 && (
                          <Box sx={{ p: 2.5, textAlign: 'center' }}>
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
            <Box sx={{
              height: 540, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed', borderColor: 'divider', borderRadius: 2.5, gap: 1.5,
              bgcolor: alpha(accentColor, isDark ? 0.03 : 0.02),
            }}>
              <Box sx={{ fontSize: 48, opacity: 0.25 }}>
                {title === 'Rules' ? '📄' : '</>'}
              </Box>
              <Typography variant="body2" color="text.disabled" fontWeight={600} fontSize={13.5}>
                เลือกไฟล์จากรายการด้านซ้าย
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11.5 }}>
                ✏️ Custom — แก้ไขได้ · 📖 Default — อ่านอย่างเดียว
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
