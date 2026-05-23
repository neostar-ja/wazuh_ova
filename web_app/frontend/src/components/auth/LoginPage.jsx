import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, TextField, Button, Typography, Alert,
  CircularProgress, InputAdornment, IconButton,
} from '@mui/material'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded'
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded'
import { useAuth } from '../../hooks/useAuth'

const FEATURES = [
  { icon: <MonitorHeartRoundedIcon sx={{ fontSize: 20 }} />, text: 'ตรวจสอบภัยคุกคามแบบเรียลไทม์' },
  { icon: <SecurityRoundedIcon sx={{ fontSize: 20 }} />, text: 'วิเคราะห์ความปลอดภัยด้วย Wazuh SIEM' },
  { icon: <VpnKeyRoundedIcon sx={{ fontSize: 20 }} />, text: 'มาตรฐาน Compliance ครบถ้วน' },
  { icon: <ShieldRoundedIcon sx={{ fontSize: 20 }} />, text: 'ปกป้องเครือข่ายโรงพยาบาล 24/7' },
]

export default function LoginPage() {
  const navigate  = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: '#0C0A14',
      }}
    >
      {/* ── Left panel: brand visual ── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #1A1033 0%, #130F22 40%, #0C0A14 100%)',
          px: 6,
        }}
      >
        {/* Background orbs */}
        <Box sx={{
          position: 'absolute', top: '15%', left: '10%',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,91,164,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', bottom: '20%', right: '5%',
          width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(241,116,34,0.12) 0%, transparent 70%)',
          filter: 'blur(35px)',
          pointerEvents: 'none',
        }} />

        {/* Grid pattern overlay */}
        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(123,91,164,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(123,91,164,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 420 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '16px',
              background: 'linear-gradient(135deg, #7B5BA4 0%, #5A3E85 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 28px rgba(123,91,164,0.5)',
            }}>
              <SecurityRoundedIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#EDE9FA', lineHeight: 1.1 }}>
                SOC Center
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(237,233,250,0.5)', lineHeight: 1.2 }}>
                Security Operations Center
              </Typography>
            </Box>
          </Box>

          <Typography sx={{ fontSize: 32, fontWeight: 800, color: '#EDE9FA', lineHeight: 1.2, mb: 1.5 }}>
            ระบบปฏิบัติการ
            <Box
              component="span"
              sx={{
                display: 'block',
                background: 'linear-gradient(135deg, #9B7DC4 0%, #F17422 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ความปลอดภัย
            </Box>
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'rgba(237,233,250,0.55)', mb: 5, lineHeight: 1.7 }}>
            โรงพยาบาลวลัยลักษณ์ มหาวิทยาลัยวลัยลักษณ์<br />
            ระบบ SIEM ขับเคลื่อนด้วย Wazuh
          </Typography>

          {/* Feature list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {FEATURES.map((f, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Box sx={{
                  width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                  background: 'rgba(123,91,164,0.15)',
                  border: '1px solid rgba(123,91,164,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#9B7DC4',
                }}>
                  {f.icon}
                </Box>
                <Typography sx={{ fontSize: 14, color: 'rgba(237,233,250,0.7)', fontWeight: 500 }}>
                  {f.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Bottom credit */}
        <Typography sx={{ position: 'absolute', bottom: 24, fontSize: 11, color: 'rgba(237,233,250,0.3)' }}>
          Secured with Wazuh SIEM · SOC Center v2.0
        </Typography>
      </Box>

      {/* ── Right panel: login form ── */}
      <Box
        sx={{
          width: { xs: '100%', md: 480 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 5 },
          py: 6,
          bgcolor: '#16122A',
          borderLeft: '1px solid rgba(123,91,164,0.15)',
          position: 'relative',
        }}
      >
        {/* Mobile logo */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg, #7B5BA4 0%, #5A3E85 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SecurityRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#EDE9FA' }}>
            SOC Center
          </Typography>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 380 }}>
          <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#EDE9FA', mb: 0.75 }}>
            เข้าสู่ระบบ
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'rgba(237,233,250,0.45)', mb: 4, lineHeight: 1.6 }}>
            กรุณาล็อกอินด้วยบัญชีผู้ใช้ที่ได้รับสิทธิ์
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: '10px', fontSize: 13 }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Username */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(237,233,250,0.6)', mb: 0.75, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                ชื่อผู้ใช้
              </Typography>
              <TextField
                name="username"
                value={form.username}
                onChange={onChange}
                placeholder="กรอกชื่อผู้ใช้"
                fullWidth
                size="small"
                autoFocus
                autoComplete="username"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    fontSize: 14,
                    bgcolor: 'rgba(12,10,20,0.5)',
                    '& fieldset': { borderColor: 'rgba(123,91,164,0.25)' },
                    '&:hover fieldset': { borderColor: 'rgba(123,91,164,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#7B5BA4' },
                  },
                  '& .MuiInputBase-input': {
                    color: '#EDE9FA',
                    '&::placeholder': { color: 'rgba(237,233,250,0.3)' },
                    py: 1.25,
                  },
                }}
              />
            </Box>

            {/* Password */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(237,233,250,0.6)', mb: 0.75, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                รหัสผ่าน
              </Typography>
              <TextField
                name="password"
                value={form.password}
                onChange={onChange}
                type={showPass ? 'text' : 'password'}
                placeholder="กรอกรหัสผ่าน"
                fullWidth
                size="small"
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPass(s => !s)}
                        sx={{ color: 'rgba(237,233,250,0.4)', '&:hover': { color: '#9B7DC4' } }}
                      >
                        {showPass
                          ? <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
                          : <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                        }
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    fontSize: 14,
                    bgcolor: 'rgba(12,10,20,0.5)',
                    '& fieldset': { borderColor: 'rgba(123,91,164,0.25)' },
                    '&:hover fieldset': { borderColor: 'rgba(123,91,164,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#7B5BA4' },
                  },
                  '& .MuiInputBase-input': {
                    color: '#EDE9FA',
                    '&::placeholder': { color: 'rgba(237,233,250,0.3)' },
                    py: 1.25,
                  },
                }}
              />
            </Box>

            {/* Submit */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 1,
                py: 1.5,
                borderRadius: '11px',
                fontSize: 14,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #7B5BA4 0%, #5A3E85 100%)',
                boxShadow: '0 6px 20px rgba(123,91,164,0.45)',
                letterSpacing: '0.02em',
                '&:hover': {
                  background: 'linear-gradient(135deg, #9B7DC4 0%, #7B5BA4 100%)',
                  boxShadow: '0 8px 28px rgba(123,91,164,0.55)',
                },
                '&:disabled': { opacity: 0.6 },
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'เข้าสู่ระบบ'}
            </Button>
          </Box>

          {/* Divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 3 }}>
            <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(123,91,164,0.15)' }} />
            <Typography sx={{ fontSize: 11, color: 'rgba(237,233,250,0.3)' }}>
              ระบบรักษาความปลอดภัย
            </Typography>
            <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(123,91,164,0.15)' }} />
          </Box>

          {/* Security badges */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            {['Wazuh SIEM', 'JWT Auth', 'TLS/SSL'].map(tag => (
              <Box
                key={tag}
                sx={{
                  px: 1.5, py: 0.5, borderRadius: '6px',
                  border: '1px solid rgba(123,91,164,0.2)',
                  bgcolor: 'rgba(123,91,164,0.06)',
                }}
              >
                <Typography sx={{ fontSize: 10, color: 'rgba(237,233,250,0.4)', fontWeight: 600 }}>
                  {tag}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography
          sx={{ position: 'absolute', bottom: 20, fontSize: 11, color: 'rgba(237,233,250,0.2)' }}
        >
          © 2025 มหาวิทยาลัยวลัยลักษณ์ · IT Security Division
        </Typography>
      </Box>
    </Box>
  )
}
