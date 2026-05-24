import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, FormControl,
  Grid, InputAdornment, InputLabel, MenuItem, Select, Skeleton, TextField,
  Typography, useTheme,
} from '@mui/material'
import TelegramIcon from '@mui/icons-material/Telegram'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded'
import TagRoundedIcon from '@mui/icons-material/TagRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { useSnackbar } from 'notistack'
import { adminApi } from '../../../services/api'
import { SectionHeader } from '../shared'

const ACCENT = '#229ED9'

export function NotifyTab() {
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [config, setConfig] = useState({ telegram_bot_token: '', telegram_chat_id: '', alert_level_threshold: '12' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
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
  }, [configData, dirty])

  const handleChange = (key: string, value: string) => {
    setConfig(c => ({ ...c, [key]: value }))
    setDirty(true)
    setTestResult(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.saveConfig(config)
      setDirty(false)
      enqueueSnackbar('บันทึกการตั้งค่าสำเร็จ', { variant: 'success' })
    } catch (e: any) { enqueueSnackbar(e.response?.data?.detail || 'บันทึกล้มเหลว', { variant: 'error' }) }
    setSaving(false)
  }

  const handleTest = async () => {
    if (!config.telegram_bot_token || !config.telegram_chat_id) {
      enqueueSnackbar('กรุณากรอก Bot Token และ Chat ID ก่อน', { variant: 'warning' }); return
    }
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch(`https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.telegram_chat_id,
          text: '🔔 *SOC Center — ทดสอบการแจ้งเตือน*\nระบบทำงานปกติ ✅',
          parse_mode: 'Markdown',
        }),
      })
      const d = await res.json()
      if (d.ok) {
        setTestResult('ok')
        enqueueSnackbar('ส่ง test message สำเร็จ ✓', { variant: 'success' })
      } else {
        setTestResult('fail')
        enqueueSnackbar(`ส่งไม่สำเร็จ: ${d.description}`, { variant: 'error' })
      }
    } catch {
      setTestResult('fail')
      enqueueSnackbar('ไม่สามารถเชื่อมต่อ Telegram API', { variant: 'error' })
    }
    setTesting(false)
  }

  const LEVEL_OPTIONS = [
    { value: '7',  label: 'ระดับ 7+', desc: 'Medium, High, Critical' },
    { value: '10', label: 'ระดับ 10+', desc: 'High, Critical' },
    { value: '12', label: 'ระดับ 12+', desc: 'High–Critical เท่านั้น' },
    { value: '15', label: 'ระดับ 15', desc: 'Critical เท่านั้น' },
  ]

  return (
    <Box>
      <SectionHeader
        icon={<NotificationsActiveRoundedIcon fontSize="small" />}
        title="การตั้งค่าแจ้งเตือน"
        color={ACCENT}
      />

      {isLoading ? (
        <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={60} sx={{ borderRadius: 2 }} />)}
        </Box>
      ) : (
        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          {/* Telegram card */}
          <Grid item xs={12} md={7}>
            <Card variant="outlined" sx={{
              borderRadius: 2.5, height: '100%',
              borderLeft: `3px solid ${ACCENT}`,
              bgcolor: alpha(ACCENT, isDark ? 0.04 : 0.02),
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 2,
                    bgcolor: alpha(ACCENT, 0.15), display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TelegramIcon sx={{ color: ACCENT, fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography fontWeight={700} fontSize={14}>Telegram Notification</Typography>
                    <Typography variant="caption" color="text.secondary" fontSize={11.5}>
                      ส่ง alert ไปยัง Telegram bot
                    </Typography>
                  </Box>
                  {testResult === 'ok' && (
                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleRoundedIcon sx={{ color: '#22C55E', fontSize: 16 }} />
                      <Typography sx={{ fontSize: 11.5, color: '#22C55E', fontWeight: 600 }}>Connected</Typography>
                    </Box>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth size="small" label="Bot Token" type="password"
                      value={config.telegram_bot_token}
                      onChange={e => handleChange('telegram_bot_token', e.target.value)}
                      placeholder="123456789:AAHxxxxxx..."
                      helperText="ได้จาก @BotFather บน Telegram"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <VpnKeyRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth size="small" label="Chat ID"
                      value={config.telegram_chat_id}
                      onChange={e => handleChange('telegram_chat_id', e.target.value)}
                      placeholder="-1001234567890"
                      helperText="Group chat ID (ขึ้นต้นด้วย -100...)"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <TagRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                        sx: { fontFamily: '"IBM Plex Mono",monospace' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined" size="small"
                      startIcon={testing ? <CircularProgress size={14} /> : <SendRoundedIcon />}
                      onClick={handleTest} disabled={testing}
                      sx={{
                        borderRadius: 2, borderColor: ACCENT, color: ACCENT,
                        '&:hover': { borderColor: ACCENT, bgcolor: alpha(ACCENT, 0.08) },
                      }}>
                      ส่ง Test Message
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Threshold card */}
          <Grid item xs={12} md={5}>
            <Card variant="outlined" sx={{
              borderRadius: 2.5, height: '100%',
              borderLeft: '3px solid #EAB308',
              bgcolor: alpha('#EAB308', isDark ? 0.04 : 0.02),
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 2,
                    bgcolor: alpha('#EAB308', 0.15), display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TuneRoundedIcon sx={{ color: '#EAB308', fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography fontWeight={700} fontSize={14}>เกณฑ์การแจ้งเตือน</Typography>
                    <Typography variant="caption" color="text.secondary" fontSize={11.5}>
                      ระดับ alert ขั้นต่ำสำหรับ Telegram
                    </Typography>
                  </Box>
                </Box>

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>ระดับขั้นต่ำ</InputLabel>
                  <Select
                    value={config.alert_level_threshold}
                    label="ระดับขั้นต่ำ"
                    onChange={e => handleChange('alert_level_threshold', e.target.value as string)}>
                    {LEVEL_OPTIONS.map(o => (
                      <MenuItem key={o.value} value={o.value}>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{o.label}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{o.desc}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Alert severity="info" sx={{ fontSize: 12, py: 0.75, borderRadius: 1.75 }}>
                  WebSocket alerts (browser) ส่งระดับ 7+ เสมอ ·
                  การตั้งค่านี้ใช้สำหรับ Telegram เท่านั้น
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          {/* Save footer */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, pt: 0.5 }}>
              {dirty && (
                <Typography variant="caption" color="warning.main" fontWeight={600}>
                  ● มีการเปลี่ยนแปลงที่ยังไม่บันทึก
                </Typography>
              )}
              <Button
                variant="contained" disableElevation
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveRoundedIcon />}
                onClick={handleSave} disabled={saving || !dirty}
                sx={{ borderRadius: 2, fontSize: 13 }}>
                บันทึกการตั้งค่า
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}
