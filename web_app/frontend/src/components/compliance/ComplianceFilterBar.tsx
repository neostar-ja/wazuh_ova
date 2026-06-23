import { FormControl, Grid, InputAdornment, MenuItem, Select, TextField } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { SectionCard } from '../ui/SectionCard'
import { BRAND } from '../ui/tokens'
import { FRAMEWORK_TH } from './compliancePrimitives'

interface FrameworkOption {
  frameworkId: string
  frameworkName: string
}

interface ComplianceFilterBarProps {
  timeRange: string; setTimeRange: (v: string) => void
  framework: string; setFramework: (v: string) => void
  agentGroup: string; setAgentGroup: (v: string) => void
  agentOs: string; setAgentOs: (v: string) => void
  severity: string; setSeverity: (v: string) => void
  status: string; setStatus: (v: string) => void
  search: string; setSearch: (v: string) => void
  frameworkOptions: FrameworkOption[]
  groupOptions: string[]
  osOptions: string[]
}

export function ComplianceFilterBar({
  timeRange, setTimeRange,
  framework, setFramework,
  agentGroup, setAgentGroup,
  agentOs, setAgentOs,
  severity, setSeverity,
  status, setStatus,
  search, setSearch,
  frameworkOptions, groupOptions, osOptions,
}: ComplianceFilterBarProps) {
  const selects: { val: string; set: (v: string) => void; items: { v: string; l: string }[] }[] = [
    {
      val: timeRange, set: setTimeRange,
      items: [{ v: '24h', l: '24 ชั่วโมง' }, { v: '7d', l: '7 วัน' }, { v: '30d', l: '30 วัน' }, { v: '90d', l: '90 วัน' }],
    },
    {
      val: framework, set: setFramework,
      items: [{ v: 'all', l: 'ทุกมาตรฐาน' }, ...frameworkOptions.map(item => ({ v: item.frameworkId, l: FRAMEWORK_TH[item.frameworkId] || item.frameworkName }))],
    },
    {
      val: agentGroup, set: setAgentGroup,
      items: [{ v: 'all', l: 'ทุกกลุ่ม' }, ...groupOptions.map(g => ({ v: g, l: g }))],
    },
    {
      val: agentOs, set: setAgentOs,
      items: [{ v: 'all', l: 'ทุก OS' }, ...osOptions.map(o => ({ v: o, l: o }))],
    },
    {
      val: severity, set: setSeverity,
      items: [
        { v: 'all', l: 'ทุกระดับ' }, { v: 'critical', l: 'วิกฤต' },
        { v: 'high', l: 'สูง' }, { v: 'medium', l: 'กลาง' }, { v: 'low', l: 'ต่ำ' },
      ],
    },
    {
      val: status, set: setStatus,
      items: [
        { v: 'all', l: 'ทุกสถานะ' }, { v: 'passed', l: 'ผ่าน' }, { v: 'failed', l: 'ไม่ผ่าน' },
        { v: 'not_applicable', l: 'ไม่เกี่ยวข้อง' }, { v: 'active', l: 'ออนไลน์' }, { v: 'disconnected', l: 'ออฟไลน์' },
      ],
    },
  ]

  return (
    <SectionCard title="ตัวกรอง" accent={BRAND.primary} density="compact" variant="flat">
      <Grid container spacing={1.25} sx={{ alignItems: 'center' }}>
        {selects.map((f, idx) => (
          <Grid item xs={6} sm={4} md={2} key={idx}>
            <FormControl fullWidth size="small">
              <Select value={f.val} onChange={e => f.set(e.target.value)} sx={{ fontSize: 12 }}>
                {f.items.map(item => <MenuItem key={item.v} value={item.v} sx={{ fontSize: 12 }}>{item.l}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        ))}
        <Grid item xs={12}>
          <TextField fullWidth size="small"
            placeholder="ค้นหา agent, rule, CVE, policy, control..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
            sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
          />
        </Grid>
      </Grid>
    </SectionCard>
  )
}

export default ComplianceFilterBar
