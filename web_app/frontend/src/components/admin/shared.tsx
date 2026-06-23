import { alpha } from '@mui/material/styles'
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Typography } from '@mui/material'
import { UserRole } from '../../types/auth'

export const BRAND = { purple: '#7B5BA4', purpleLight: '#9B7DC4', orange: '#F17422' }

export const ROLE_TH: Record<UserRole, string> = {
  superadmin: 'ซูเปอร์แอดมิน',
  admin: 'ผู้ดูแลระบบ',
  analyst: 'นักวิเคราะห์',
  viewer: 'ผู้ชม',
}

export const ROLE_COLOR: Record<UserRole, string> = {
  superadmin: '#8B5CF6',
  admin: '#3B82F6',
  analyst: '#22C55E',
  viewer: '#94A3B8',
}

export const ACTION_COLOR: Record<string, 'primary' | 'default' | 'warning' | 'info' | 'secondary' | 'error' | 'success'> = {
  login: 'primary', logout: 'default',
  save_rule: 'warning', save_decoder: 'info', save_list: 'secondary', save_wazuh_config: 'warning',
  deploy_restart: 'error', deploy_tuning_wazuh: 'warning',
  create_user: 'success', update_user: 'info', delete_tuning: 'error',
  add_tuning: 'warning', save_config: 'secondary',
  disable_log_source: 'error', enable_log_source: 'success',
}

export function getLevelColor(lv: number): string {
  if (lv >= 12) return '#EF4444'
  if (lv >= 7)  return BRAND.orange
  if (lv >= 4)  return BRAND.purple
  return '#94a3b8'
}

export interface RuleItem {
  id: string
  level: string
  desc: string
  parent?: string
  program?: string
}

export function prettifyXML(xml: string): string {
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

export function parseRulesFromXml(xml: string): RuleItem[] {
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    return Array.from(doc.querySelectorAll('rule')).map(r => ({
      id: r.getAttribute('id') || '',
      level: r.getAttribute('level') || '',
      desc: r.querySelector('description')?.textContent?.trim() || '(no description)',
    })).filter(r => r.id)
  } catch { return [] }
}

export function parseDecodersFromXml(xml: string): RuleItem[] {
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    return Array.from(doc.querySelectorAll('decoder')).map(d => ({
      id: d.getAttribute('name') || '',
      level: '',
      desc: '',
      parent: d.querySelector('parent')?.textContent?.trim() || '',
      program: d.querySelector('program_name')?.textContent?.trim() || '',
    })).filter(d => d.id)
  } catch { return [] }
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  icon: React.ReactNode
  title: string
  count?: number
  action?: React.ReactNode
  color?: string
}

export function SectionHeader({ icon, title, count, action, color = BRAND.purple }: SectionHeaderProps) {
  return (
    <Box sx={{ mb: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 2 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 1.75, flexShrink: 0,
          bgcolor: alpha(color, 0.12),
          color: color,
          border: `1px solid ${alpha(color, 0.22)}`,
        }}>
          {icon}
        </Box>
        <Typography fontWeight={800} sx={{ fontSize: 15.5, letterSpacing: '-0.015em', flex: 1, minWidth: 0 }}>
          {title}
        </Typography>
        {count !== undefined && (
          <Box sx={{
            px: 0.875, height: 20, minWidth: 22,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 1, flexShrink: 0,
            bgcolor: alpha(color, 0.12),
            color: color,
            fontSize: 11, fontWeight: 700, fontFamily: '"IBM Plex Mono",monospace',
            border: `1px solid ${alpha(color, 0.2)}`,
          }}>
            {count}
          </Box>
        )}
        {action}
      </Box>
      <Divider />
    </Box>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmColor?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'
  loading?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmColor = 'error', loading }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
      <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: 16 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined" sx={{ borderRadius: 2, flex: 1 }}>ยกเลิก</Button>
        <Button variant="contained" color={confirmColor} onClick={onConfirm} disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ borderRadius: 2, flex: 1 }}>
          ยืนยัน
        </Button>
      </DialogActions>
    </Dialog>
  )
}
