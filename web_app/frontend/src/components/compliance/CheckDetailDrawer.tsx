import { Box, Stack, Typography } from '@mui/material'
import { DetailPanel } from '../common/CommonComponents'
import { BRAND, SEV_COLOR, getBorder, getSoftBg, getSurface } from '../ui/tokens'
import { CopyBtn, FRAMEWORK_TH, StatChip } from './compliancePrimitives'

interface CheckDetailDrawerProps {
  check: any | null
  onClose: () => void
  isDark: boolean
}

export function CheckDetailDrawer({ check, onClose, isDark }: CheckDetailDrawerProps) {
  return (
    <DetailPanel
      open={Boolean(check)}
      onClose={onClose}
      title={check?.title || check?.requirement || 'รายละเอียด Control'}
      subtitle={check ? `${FRAMEWORK_TH[check.framework] || check.framework || ''} · ${check.controlId || ''}` : ''}
      width={640}
    >
      {check && (
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.75 }}>สถานะ</Typography>
            <StatChip status={check.status} />
          </Box>
          {check.description && (
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.5 }}>คำอธิบาย</Typography>
              <Typography sx={{ fontSize: 12.5, lineHeight: 1.6 }}>{check.description}</Typography>
            </Box>
          )}
          {check.rationale && (
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.5 }}>เหตุผล</Typography>
              <Typography sx={{ fontSize: 12.5, lineHeight: 1.6 }}>{check.rationale}</Typography>
            </Box>
          )}
          {check.remediation && (
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.5 }}>วิธีแก้ไข</Typography>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: getSoftBg(SEV_COLOR.low, 6), border: `1px solid ${SEV_COLOR.low}30` }}>
                <Typography sx={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{check.remediation}</Typography>
              </Box>
            </Box>
          )}
          {check.evidence?.command && (
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.5 }}>คำสั่งตรวจสอบ</Typography>
              <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: getSurface(isDark, 'flat'),
                border: `1px solid ${getBorder(isDark, 'default')}`, fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5, wordBreak: 'break-word', lineHeight: 1.6 }}>
                {check.evidence.command}
              </Box>
              <Box sx={{ mt: 0.5 }}><CopyBtn value={check.evidence.command} /></Box>
            </Box>
          )}
          {check.references?.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.disabled', mb: 0.5 }}>อ้างอิง</Typography>
              <Stack spacing={0.5}>
                {check.references.map((ref: string) => (
                  <Typography key={ref} sx={{ fontSize: 11.5, color: BRAND.primary, wordBreak: 'break-all' }}>{ref}</Typography>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      )}
    </DetailPanel>
  )
}

export default CheckDetailDrawer
