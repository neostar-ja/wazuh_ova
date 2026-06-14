import { useState } from 'react'
import { alpha } from '@mui/material/styles'
import {
  Box, Card, CardContent, Divider, Drawer,
  IconButton, Paper, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import CodeRoundedIcon from '@mui/icons-material/CodeRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded'
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import ToggleOnRoundedIcon from '@mui/icons-material/ToggleOnRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import { PageShell } from '../ui/layout'
import { BRAND } from './shared'
import { SystemStatusTab } from './tabs/SystemStatusTab'
import { RulesTab } from './tabs/RulesTab'
import { DecodersTab } from './tabs/DecodersTab'
import { ListsTab } from './tabs/ListsTab'
import { WazuhConfigTab } from './tabs/WazuhConfigTab'
import { TuningTab } from './tabs/TuningTab'
import { LogSourcesTab } from './tabs/LogSourcesTab'
import { ISMRetentionTab } from './tabs/ISMRetentionTab'
import { NotifyTab } from './tabs/NotifyTab'
import { UsersTab } from './tabs/UsersTab'
import { AuditTab } from './tabs/AuditTab'

interface NavItem { id: string; label: string; icon: React.ReactNode; color: string }
interface NavGroup { section: string; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    section: 'WAZUH ENGINE',
    items: [
      { id: 'status',   label: 'สถานะระบบ',   icon: <MonitorHeartRoundedIcon sx={{ fontSize: 17 }} />,        color: '#22C55E' },
      { id: 'rules',    label: 'Rules',         icon: <ArticleRoundedIcon sx={{ fontSize: 17 }} />,             color: BRAND.purple },
      { id: 'decoders', label: 'Decoders',      icon: <CodeRoundedIcon sx={{ fontSize: 17 }} />,                color: '#3B82F6' },
      { id: 'lists',    label: 'CDB Lists',     icon: <ListAltRoundedIcon sx={{ fontSize: 17 }} />,             color: '#06B6D4' },
      { id: 'wazuhcfg', label: 'ossec.conf',    icon: <SettingsSuggestRoundedIcon sx={{ fontSize: 17 }} />,    color: BRAND.orange },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      { id: 'tuning',  label: 'Alert Tuning',  icon: <TuneRoundedIcon sx={{ fontSize: 17 }} />,                color: '#EAB308' },
      { id: 'logsources', label: 'แหล่งข้อมูล Log', icon: <ToggleOnRoundedIcon sx={{ fontSize: 17 }} />,       color: '#F43F5E' },
      { id: 'ism',     label: 'ISM Retention', icon: <StorageRoundedIcon sx={{ fontSize: 17 }} />,             color: '#14B8A6' },
      { id: 'notify',  label: 'การแจ้งเตือน', icon: <NotificationsActiveRoundedIcon sx={{ fontSize: 17 }} />, color: '#229ED9' },
    ],
  },
  {
    section: 'PLATFORM',
    items: [
      { id: 'users', label: 'ผู้ใช้ระบบ', icon: <PeopleRoundedIcon sx={{ fontSize: 17 }} />,  color: '#8B5CF6' },
      { id: 'audit', label: 'Audit Log',  icon: <HistoryRoundedIcon sx={{ fontSize: 17 }} />, color: '#64748B' },
    ],
  },
]

const CONTENT_MAP: Record<string, React.ReactNode> = {
  status:   <SystemStatusTab />,
  rules:    <RulesTab />,
  decoders: <DecodersTab />,
  lists:    <ListsTab />,
  wazuhcfg: <WazuhConfigTab />,
  tuning:   <TuningTab />,
  logsources: <LogSourcesTab />,
  ism:      <ISMRetentionTab />,
  notify:   <NotifyTab />,
  users:    <UsersTab />,
  audit:    <AuditTab />,
}

export default function AdminPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isDark = theme.palette.mode === 'dark'
  const [activeId, setActiveId] = useState('status')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeItem = NAV.flatMap(g => g.items).find(i => i.id === activeId)

  const handleNav = (id: string) => {
    setActiveId(id)
    setDrawerOpen(false)
  }

  const NavContent = () => (
    <Box sx={{ py: 0.5 }}>
      {NAV.map((group, gi) => (
        <Box key={gi}>
          {gi > 0 && <Divider sx={{ mx: 1.5, my: 0.5 }} />}
          <Box sx={{ px: 2, pt: gi === 0 ? 1.5 : 1.25, pb: 0.5 }}>
            <Typography sx={{
              fontSize: 9.5, fontWeight: 900, letterSpacing: '0.13em',
              textTransform: 'uppercase', color: 'text.disabled',
            }}>
              {group.section}
            </Typography>
          </Box>

          {group.items.map(item => {
            const isActive = activeId === item.id
            return (
              <Box
                key={item.id}
                onClick={() => handleNav(item.id)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  px: 1.5, py: 0.875, mx: 0.75, mb: 0.25,
                  borderRadius: 1.75, cursor: 'pointer',
                  bgcolor: isActive ? alpha(item.color, isDark ? 0.18 : 0.1) : 'transparent',
                  borderLeft: `3px solid ${isActive ? item.color : 'transparent'}`,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: alpha(item.color, isActive ? (isDark ? 0.22 : 0.13) : 0.07),
                    borderLeftColor: isActive ? item.color : alpha(item.color, 0.45),
                  },
                }}
              >
                <Box sx={{
                  color: isActive ? item.color : 'text.disabled',
                  display: 'flex', flexShrink: 0,
                  transition: 'color 0.15s',
                }}>
                  {item.icon}
                </Box>
                <Typography sx={{
                  fontSize: 13, fontWeight: isActive ? 700 : 500, flex: 1,
                  color: isActive
                    ? (isDark ? item.color : 'text.primary')
                    : 'text.secondary',
                  transition: 'all 0.15s',
                }}>
                  {item.label}
                </Typography>
                {isActive && (
                  <Box sx={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    bgcolor: item.color,
                    boxShadow: `0 0 8px ${item.color}90`,
                  }} />
                )}
              </Box>
            )
          })}
          {gi === NAV.length - 1 && <Box sx={{ pb: 1 }} />}
        </Box>
      ))}
    </Box>
  )

  return (
    <PageShell
      variant="management"
      title="ผู้ดูแลระบบ"
      subtitle="จัดการ Wazuh Engine, Rules, Decoders, CDB Lists, Config, Users และการตั้งค่า"
    >
      {/* Mobile drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 272,
              borderRight: '1px solid',
              borderColor: 'divider',
              backgroundImage: 'none',
            },
          },
        }}
      >
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.5,
          borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%',
              bgcolor: BRAND.purple, boxShadow: `0 0 8px ${BRAND.purple}`,
            }} />
            <Typography fontWeight={800} fontSize={14}>ผู้ดูแลระบบ</Typography>
          </Box>
          <IconButton size="small" onClick={() => setDrawerOpen(false)}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        <NavContent />
      </Drawer>

      <Box sx={{ display: 'flex', gap: { md: 2.5 }, alignItems: 'flex-start' }}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <Box sx={{ width: 218, flexShrink: 0, position: 'sticky', top: 16 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <NavContent />
            </Paper>
          </Box>
        )}

        {/* Content area */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Mobile: current-tab breadcrumb bar */}
          {isMobile && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.25, mb: 2,
              px: 1.25, py: 0.875,
              borderRadius: 2,
              border: '1px solid', borderColor: 'divider',
              bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
            }}>
              <IconButton
                size="small"
                onClick={() => setDrawerOpen(true)}
                sx={{
                  bgcolor: alpha(BRAND.purple, 0.1), color: BRAND.purple,
                  borderRadius: 1.5, p: 0.625,
                  '&:hover': { bgcolor: alpha(BRAND.purple, 0.18) },
                }}
              >
                <MenuRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
              {activeItem && (
                <>
                  <Box sx={{ color: activeItem.color, display: 'flex', alignItems: 'center' }}>
                    {activeItem.icon}
                  </Box>
                  <Typography fontWeight={700} fontSize={13.5}>
                    {activeItem.label}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Box sx={{
                    width: 7, height: 7, borderRadius: '50%',
                    bgcolor: activeItem.color,
                    boxShadow: `0 0 7px ${activeItem.color}`,
                  }} />
                </>
              )}
            </Box>
          )}

          <Card sx={{ overflow: 'visible', borderRadius: 2.5 }}>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
              <Box key={activeId} sx={{ animation: 'tabContentIn 0.2s cubic-bezier(0.4,0,0.2,1) both' }}>
                {CONTENT_MAP[activeId]}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </PageShell>
  )
}
