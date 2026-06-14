import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Box,
  IconButton,
  InputBase,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Sun,
  Moon,
  Bell,
  BellOff,
  BellRing,
  LogOut,
  KeyRound,
  ChevronRight,
  Search,
  ShieldCheck,
  Circle,
  Command as CommandIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { pushApi } from '../../services/api'
import { useThemeMode } from '../../theme/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import { UserRole } from '../../types/auth'
import { NAV_GROUPS } from './sidebar/navItems'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrator',
  analyst: 'Analyst',
  viewer: 'Viewer',
}

function hasRole(groupRoles: UserRole[] | undefined, userRole: string | undefined): boolean {
  if (!groupRoles || groupRoles.length === 0) return true
  if (!userRole) return false
  return groupRoles.includes(userRole as UserRole)
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <Box sx={{ minWidth: 74 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', color: 'text.primary', lineHeight: 1.2 }}>
        {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
      </Typography>
      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', lineHeight: 1.2, mt: 0.2 }}>
        {time.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Typography>
    </Box>
  )
}

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const theme = useTheme()
  const mode = theme.palette.mode
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'))
  const pushFeatureEnabled = import.meta.env.VITE_ENABLE_PUSH_SW === 'true'
  const { toggleTheme } = useThemeMode()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [newAlerts, setNewAlerts] = useState(0)
  const [wsConnected, setWsConnected] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('soc-push-enabled') === '1')
  const wsRef = useRef<WebSocket | null>(null)

  const initials = useMemo(
    () => (user?.name || user?.username || 'U').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
    [user?.name, user?.username]
  )

  const navCommands = useMemo(
    () => NAV_GROUPS
      .filter(group => hasRole(group.roles, user?.role))
      .map(group => ({
        ...group,
        items: group.items.filter(item => hasRole(item.roles, user?.role)),
      }))
      .filter(group => group.items.length > 0),
    [user?.role]
  )

  const runSearch = (query: string) => {
    const q = query.trim()
    if (!q) return
    navigate(`/investigate?q=${encodeURIComponent(q)}`)
    setSearchQ('')
    setCommandOpen(false)
  }

  const handleLogout = async () => {
    setUserMenuOpen(false)
    await logout()
    navigate('/login')
  }

  const handleTogglePush = async () => {
    if (!pushFeatureEnabled) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    if (pushEnabled) {
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          const keys = subscription.toJSON().keys as { p256dh: string; auth: string }
          await pushApi.unsubscribe({ endpoint: subscription.endpoint, keys })
          await subscription.unsubscribe()
        }
        setPushEnabled(false)
        localStorage.setItem('soc-push-enabled', '0')
      } catch {
        return
      }
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      const { data } = await pushApi.getVapidKey()
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: data.publicKey,
      })
      const json = subscription.toJSON()
      await pushApi.subscribe({ endpoint: subscription.endpoint, keys: json.keys as { p256dh: string; auth: string } })
      setPushEnabled(true)
      localStorage.setItem('soc-push-enabled', '1')
    } catch {
      return
    }
  }

  // Global ⌘K / Ctrl+K shortcut to open the command palette
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      try {
        const base = import.meta.env.VITE_BASE_PATH || '/wazuh'
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const socket = new WebSocket(`${protocol}://${window.location.host}${base}/ws/alerts`)
        wsRef.current = socket

        socket.onopen = () => setWsConnected(true)
        socket.onerror = () => socket.close()
        socket.onclose = () => {
          setWsConnected(false)
          reconnectTimer = setTimeout(connect, 5000)
        }
        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data)
            setNewAlerts(payload.count ?? 0)
          } catch {
            return
          }
        }
      } catch {
        reconnectTimer = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  const utilityButtonSx = {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
    color: 'text.secondary',
    transition: 'all 180ms ease',
    '&:hover': {
      bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.98)',
      color: 'text.primary',
      borderColor: 'text.disabled',
    },
  } as const

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1099,
        flexShrink: 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: mode === 'dark' ? 'rgba(11,17,32,0.72)' : 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <Box
        sx={{
          maxWidth: 1680,
          mx: 'auto',
          px: { xs: 1.5, sm: 2, md: 2.5 },
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        {isMobile && (
          <IconButton onClick={onMenuClick} aria-label="Open navigation" sx={utilityButtonSx}>
            <MenuIcon size={20} />
          </IconButton>
        )}

        {isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: '#fff',
                boxShadow: '0 12px 24px rgba(79,110,247,0.28)',
              }}
            >
              <ShieldCheck size={19} />
            </Box>
            {!isCompact && (
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, lineHeight: 1.1, color: 'text.primary' }}>
                  SOC Center
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', lineHeight: 1.1 }}>
                  Security Operations
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: { xs: 'flex-end', md: 'flex-start' },
            minWidth: 0,
          }}
        >
          {/* Command palette trigger (desktop) */}
          <Box
            component="button"
            onClick={() => setCommandOpen(true)}
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              width: { md: 320, lg: 420 },
              maxWidth: '100%',
              gap: 1,
              px: 1.4,
              py: 0.95,
              borderRadius: 14,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.92)',
              boxShadow: mode === 'dark' ? 'none' : '0 8px 18px rgba(15,23,42,0.04)',
              cursor: 'pointer',
              font: 'inherit',
              textAlign: 'left',
              transition: 'all 180ms ease',
              '&:hover': {
                borderColor: 'text.disabled',
              },
            }}
          >
            <Search size={17} className="text-muted-foreground shrink-0" />
            <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: 'text.disabled' }}>
              ค้นหา IP, Host, User, MAC, Domain หรือไปยังหน้า...
            </Typography>
            <Box
              sx={{
                display: { md: 'none', lg: 'flex' },
                alignItems: 'center',
                gap: 0.3,
                borderLeft: '1px solid',
                borderColor: 'divider',
                pl: 1,
              }}
            >
              <CommandIcon size={11} className="text-muted-foreground" />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled' }}>K</Typography>
            </Box>
          </Box>

          {/* Search icon trigger (mobile) */}
          <IconButton
            onClick={() => setCommandOpen(true)}
            aria-label="Search"
            sx={{ display: { xs: 'flex', md: 'none' }, ...utilityButtonSx }}
          >
            <Search size={19} />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9, flexShrink: 0 }}>
          <Box
            sx={{
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center',
              gap: 0.8,
              px: 1.2,
              py: 0.9,
              borderRadius: 999,
              border: '1px solid',
              borderColor: wsConnected ? 'rgba(34,197,94,0.22)' : 'divider',
              bgcolor: wsConnected ? 'rgba(34,197,94,0.08)' : 'rgba(148,163,184,0.08)',
            }}
          >
            <Circle
              size={10}
              className={cn(wsConnected ? 'text-[#22C55E]' : 'text-[#94A3B8]', wsConnected && 'animate-pulse-glow')}
              fill="currentColor"
            />
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary' }}>
              {wsConnected ? 'Live stream' : 'Feed offline'}
            </Typography>
          </Box>

          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              px: 1.15,
              py: 0.85,
              borderRadius: 14,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.88)',
            }}
          >
            <LiveClock />
          </Box>

          {pushFeatureEnabled && (
            <Tooltip title={pushEnabled ? 'ปิด Browser push' : 'เปิด Browser push'}>
              <IconButton onClick={handleTogglePush} sx={utilityButtonSx}>
                {pushEnabled ? <BellRing size={19} /> : <BellOff size={19} />}
              </IconButton>
            </Tooltip>
          )}

          {/* Notifications popover */}
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <Tooltip title="การแจ้งเตือน">
              <PopoverTrigger asChild>
                <IconButton sx={utilityButtonSx}>
                  <Badge badgeContent={newAlerts > 99 ? '99+' : newAlerts} color="error" overlap="circular">
                    <Bell size={19} />
                  </Badge>
                </IconButton>
              </PopoverTrigger>
            </Tooltip>
            <PopoverContent align="end" className="w-80">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">การแจ้งเตือนใหม่</p>
                <span className={cn(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
                  newAlerts > 0 ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground'
                )}>
                  {newAlerts > 99 ? '99+' : newAlerts}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {newAlerts > 0
                  ? `มีการแจ้งเตือนใหม่ ${newAlerts} รายการรอการตรวจสอบจากระบบ Wazuh`
                  : 'ไม่มีการแจ้งเตือนใหม่ในขณะนี้ ระบบจะอัปเดตแบบเรียลไทม์'}
              </p>
              <Separator className="my-3 -mx-4 w-[calc(100%+2rem)]" />
              <button
                onClick={() => { setNotifOpen(false); navigate('/alerts') }}
                className="ui-btn-primary w-full justify-center"
              >
                ไปที่หน้าการแจ้งเตือนทั้งหมด
              </button>
            </PopoverContent>
          </Popover>

          <Tooltip title={mode === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}>
            <IconButton onClick={toggleTheme} sx={utilityButtonSx}>
              {mode === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </IconButton>
          </Tooltip>

          {/* User menu */}
          <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Box
                component="button"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  pl: 0.6,
                  pr: 1,
                  py: 0.45,
                  minWidth: 0,
                  borderRadius: 14,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)',
                  cursor: 'pointer',
                  font: 'inherit',
                  transition: 'all 180ms ease',
                  '&:hover': {
                    borderColor: 'text.disabled',
                  },
                }}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-[13px]">{initials}</AvatarFallback>
                </Avatar>
                <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    {user?.name || user?.username}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', lineHeight: 1.2 }}>
                    {ROLE_LABELS[user?.role || ''] || user?.role || 'User'}
                  </Typography>
                </Box>
                <ChevronRight size={17} className="hidden md:block text-muted-foreground" />
              </Box>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2.5 py-1.5">
                <p className="text-sm font-bold text-foreground">{user?.name || user?.username}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ROLE_LABELS[user?.role || ''] || user?.role || 'User'}
                </p>
                {user?.username && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <KeyRound size={13} />
                    {user.username}
                  </p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>การตั้งค่า</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => { setUserMenuOpen(false); navigate('/admin') }}>
                <ShieldCheck size={16} />
                การจัดการระบบ
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleLogout}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut size={16} />
                ออกจากระบบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Box>
      </Box>

      {/* ⌘K command palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput
          placeholder="ค้นหา IP, Host, User, MAC, Domain หรือไปยังหน้า..."
          value={searchQ}
          onValueChange={setSearchQ}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && searchQ.trim()) {
              event.preventDefault()
              runSearch(searchQ)
            }
          }}
        />
        <CommandList>
          <CommandEmpty>ไม่พบผลลัพธ์</CommandEmpty>
          {searchQ.trim() && (
            <>
              <CommandGroup heading="ค้นหา">
                <CommandItem onSelect={() => runSearch(searchQ)}>
                  <Search size={16} />
                  ค้นหา “{searchQ}” ในระบบวิเคราะห์เหตุการณ์
                  <CommandShortcut>Enter</CommandShortcut>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          {navCommands.map(group => (
            <CommandGroup key={group.id} heading={group.section}>
              {group.items.map(item => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.descriptionTh}`}
                  onSelect={() => { navigate(item.path); setCommandOpen(false) }}
                >
                  <span className="flex h-5 w-5 items-center justify-center" style={{ color: item.color }}>
                    {item.icon}
                  </span>
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </Box>
  )
}
