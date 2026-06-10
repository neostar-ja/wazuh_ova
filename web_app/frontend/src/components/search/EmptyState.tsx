/**
 * Empty State
 * Shown when no search criteria are applied
 * Theme-aware: supports Dark and Light mode
 */

import { Box, Typography, Stack, Button, useTheme } from '@mui/material'
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import { BRAND } from '../ui/tokens'

interface EmptyStateProps {
  onOpenAdvanced?: () => void
}

const QUICK_TIPS = [
  { query: 'port 22', desc: 'ค้นหา SSH traffic ทั้งขาเข้าและขาออก' },
  { query: 'dstport:3389', desc: 'ค้นหา RDP connection ขาเข้า' },
  { query: 'action:deny', desc: 'ค้นหา traffic ที่ถูก deny จาก Firewall' },
  { query: 'source:firewall', desc: 'ค้นหา log เฉพาะจาก Firewall' },
  { query: 'src:10.0.0.1', desc: 'ค้นหา traffic จาก IP ต้นทางนี้' },
]

export function EmptyState({ onOpenAdvanced }: EmptyStateProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box
      sx={{
        borderRadius: '16px',
        p: { xs: 3, md: 5 },
        border: `1px solid ${isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.12)'}`,
        bgcolor: isDark ? 'rgba(22,17,42,0.85)' : 'rgba(255,255,255,0.95)',
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.35)'
          : '0 2px 16px rgba(123,91,164,0.1)',
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '20px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: `${BRAND.purple}14`,
          color: BRAND.purple,
          mx: 'auto',
          mb: 2.5,
          border: `1px solid ${BRAND.purple}25`,
        }}
      >
        <ManageSearchRoundedIcon sx={{ fontSize: 36 }} />
      </Box>

      <Typography
        sx={{
          fontSize: { xs: 18, md: 20 },
          fontWeight: 800,
          mb: 1,
          color: 'text.primary',
        }}
      >
        ค้นหา Log
      </Typography>
      <Typography
        sx={{
          fontSize: 14,
          color: 'text.secondary',
          mb: 3.5,
          maxWidth: 480,
          mx: 'auto',
          lineHeight: 1.7,
        }}
      >
        ป้อนคำค้นหาในช่องด้านบน หรือเลือก Quick Filter เพื่อเริ่มค้นหา
        event จาก Wazuh, Firewall, IDS, DNS, DHCP และ NAC
      </Typography>

      {/* Quick tips */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 1,
          mb: 3,
          maxWidth: 640,
          mx: 'auto',
          textAlign: 'left',
        }}
      >
        {QUICK_TIPS.map((tip) => (
          <Box
            key={tip.query}
            sx={{
              p: 1.5,
              borderRadius: '10px',
              border: `1px solid ${isDark ? 'rgba(123,91,164,0.14)' : 'rgba(123,91,164,0.1)'}`,
              bgcolor: isDark ? 'rgba(123,91,164,0.05)' : 'rgba(123,91,164,0.03)',
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontFamily: '"IBM Plex Mono", monospace',
                fontWeight: 700,
                color: BRAND.purple,
                mb: 0.4,
              }}
            >
              {tip.query}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.5 }}>
              {tip.desc}
            </Typography>
          </Box>
        ))}
      </Box>

      {onOpenAdvanced && (
        <Button
          variant="outlined"
          startIcon={<TuneRoundedIcon />}
          onClick={onOpenAdvanced}
          sx={{
            borderColor: `${BRAND.purple}40`,
            color: BRAND.purple,
            fontWeight: 700,
            borderRadius: '10px',
            px: 2.5,
            '&:hover': {
              borderColor: BRAND.purple,
              bgcolor: `${BRAND.purple}08`,
            },
          }}
        >
          เปิดตัวกรองขั้นสูง
        </Button>
      )}
    </Box>
  )
}
