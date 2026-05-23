import { useMemo, useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import EmptyState from '../ui/EmptyState'
import SectionCard from '../ui/SectionCard'
import { jsonToDisplay } from './utils'

interface RawEvidencePanelProps {
  raw?: unknown
  filename: string
}

export function RawEvidencePanel({ raw, filename }: RawEvidencePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const json = useMemo(() => (raw == null ? '' : jsonToDisplay(raw)), [raw])

  const handleDownload = () => {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <SectionCard
      title="Raw Evidence"
      subtitle="แสดงหลักฐานดิบเป็น JSON เท่านั้น โดยไม่ render HTML จาก backend"
      icon={<DataObjectRoundedIcon />}
      accent="#38BDF8"
      action={
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => navigator.clipboard.writeText(json)} disabled={!json}>
            Copy JSON
          </Button>
          <Button size="small" startIcon={<DownloadRoundedIcon />} onClick={handleDownload} disabled={!json}>
            Download
          </Button>
        </Stack>
      }
      empty={<EmptyState title="ไม่มี raw evidence" description="backend ยังไม่ส่งหลักฐานดิบสำหรับ query นี้" />}
    >
      {!json ? null : (
        <Stack spacing={1.25}>
          <Button size="small" variant="outlined" onClick={() => setExpanded((current) => !current)} sx={{ alignSelf: 'flex-start' }}>
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
          <Box
            sx={{
              p: 2,
              borderRadius: '18px',
              bgcolor: 'rgba(13,18,30,0.72)',
              border: '1px solid rgba(56,189,248,0.16)',
              maxHeight: expanded ? 720 : 360,
              overflow: 'auto',
            }}
          >
            <Typography
              component="pre"
              sx={{
                m: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
                lineHeight: 1.7,
                color: '#d8e4ff',
              }}
            >
              {json}
            </Typography>
          </Box>
        </Stack>
      )}
    </SectionCard>
  )
}

export default RawEvidencePanel
