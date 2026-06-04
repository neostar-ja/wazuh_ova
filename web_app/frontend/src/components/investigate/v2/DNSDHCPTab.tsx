import { Box, Chip, Skeleton, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import type { DNSResult, DHCPResult } from '../../../types/investigate'

interface Props {
  dns?: DNSResult
  dhcp?: DHCPResult
  dnsLoading: boolean
  dhcpLoading: boolean
  onDrillDown: (q: string) => void
}

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function Empty({ message }: { message: string }) {
  const { palette } = useTheme()
  return (
    <Box className="flex flex-col items-center justify-center py-12 gap-3">
      <Box className="w-12 h-12 rounded-2xl flex items-center justify-center"
        sx={{ background: palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.05)' }}>
        <DnsRoundedIcon sx={{ fontSize: 22, color: 'rgba(123,91,164,0.4)' }} />
      </Box>
      <Typography sx={{ fontSize: 12, color: palette.mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(60,40,100,0.35)' }}>
        {message}
      </Typography>
    </Box>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme()
  return (
    <Typography className="text-[9px] font-bold tracking-widest mb-2"
      sx={{ color: palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)' }}>
      {children}
    </Typography>
  )
}

function DNSPanel({ dns, loading, onDrillDown }: { dns?: DNSResult; loading: boolean; onDrillDown: (q: string) => void }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const rowHover  = isDark ? 'rgba(123,91,164,0.07)' : 'rgba(123,91,164,0.04)'
  const rowBord   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)'

  if (loading) {
    return (
      <Stack spacing={2}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />
        ))}
      </Stack>
    )
  }

  if (!dns || dns.count === 0) {
    return <Empty message="ไม่พบ DNS log สำหรับ entity นี้ — ตรวจสอบว่า Infoblox/named ส่ง syslog มายัง Wazuh แล้วหรือยัง" />
  }

  return (
    <Stack spacing={3}>
      {/* Summary row */}
      <Box className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'DNS Queries', value: dns.count, color: '#38BDF8' },
          { label: 'RPZ Blocks', value: dns.rpz_blocks.length, color: dns.has_malicious ? '#EF4444' : '#22C55E' },
          { label: 'Unique Domains', value: dns.top_query_names.length, color: '#8B5CF6' },
          { label: 'Resp. Codes', value: dns.response_codes.length, color: '#EAB308' },
        ].map(m => (
          <Box key={m.label}
            className="rounded-xl px-3 py-2.5 flex items-center gap-2"
            sx={{ background: `rgba(${hexRgb(m.color)},0.07)`, border: `1px solid rgba(${hexRgb(m.color)},0.18)` }}>
            <Box>
              <Typography className="font-mono font-bold text-base" sx={{ color: m.color }}>{m.value}</Typography>
              <Typography sx={{ fontSize: 9, color: textMuted }}>{m.label}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* RPZ Blocks alert */}
      {dns.has_malicious && (
        <Box className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
          sx={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <BlockRoundedIcon sx={{ fontSize: 16, color: '#EF4444', mt: 0.2 }} />
          <Box>
            <Typography className="font-semibold text-[11px]" sx={{ color: '#EF4444' }}>
              พบ {dns.rpz_blocks.length} รายการ DNS ที่ถูก RPZ Block
            </Typography>
            <Typography sx={{ fontSize: 10, color: textMuted }}>
              DNS query ไปยัง domain ที่อยู่ใน blacklist — อาจเป็นสัญญาณของ malware หรือ C2 communication
            </Typography>
          </Box>
        </Box>
      )}

      {/* RPZ block list */}
      {dns.rpz_blocks.length > 0 && (
        <Box>
          <SectionLabel>RPZ BLOCKS ({dns.rpz_blocks.length})</SectionLabel>
          <Box className="rounded-xl overflow-hidden"
            sx={{ border: `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'}` }}>
            <Box className="grid px-3 py-1.5"
              sx={{ gridTemplateColumns: '1fr 80px 140px', background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)' }}>
              {['DOMAIN', 'ACTION', 'TIME'].map(h => (
                <Typography key={h} className="text-[9px] font-bold tracking-wider" sx={{ color: textMuted }}>{h}</Typography>
              ))}
            </Box>
            {dns.rpz_blocks.slice(0, 20).map((b, i) => (
              <Box key={i}
                className="grid px-3 py-2 cursor-pointer transition-colors"
                sx={{ gridTemplateColumns: '1fr 80px 140px', borderTop: `1px solid ${rowBord}`, '&:hover': { background: rowHover } }}
                onClick={() => b.query_name && onDrillDown(b.query_name)}
              >
                <Typography className="font-mono text-[11px] truncate pr-2"
                  sx={{ color: isDark ? '#FCA5A5' : '#DC2626' }}>{b.query_name || '—'}</Typography>
                <Chip label={b.action} size="small"
                  sx={{ height: 16, fontSize: 9, fontWeight: 700, bgcolor: 'rgba(239,68,68,0.12)', color: '#EF4444', border: 'none' }} />
                <Typography className="font-mono text-[10px]" sx={{ color: textMuted }}>
                  {b.timestamp ? new Date(b.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Top query names */}
      {dns.top_query_names.length > 0 && (
        <Box>
          <SectionLabel>TOP DNS QUERIES</SectionLabel>
          <Box className="rounded-xl overflow-hidden"
            sx={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'}` }}>
            <Box className="grid px-3 py-1.5"
              sx={{ gridTemplateColumns: '1fr 60px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.03)' }}>
              {['DOMAIN', 'COUNT'].map(h => (
                <Typography key={h} className="text-[9px] font-bold tracking-wider" sx={{ color: textMuted }}>{h}</Typography>
              ))}
            </Box>
            {dns.top_query_names.slice(0, 15).map((item, i) => {
              const maxCount = dns.top_query_names[0]?.count ?? 1
              const pct = (item.count / maxCount) * 100
              return (
                <Box key={i}
                  className="grid px-3 py-2 cursor-pointer transition-colors relative overflow-hidden"
                  sx={{ gridTemplateColumns: '1fr 60px', borderTop: `1px solid ${rowBord}`, '&:hover': { background: rowHover } }}
                  onClick={() => onDrillDown(item.name)}
                >
                  <Box className="absolute inset-y-0 left-0" sx={{ width: `${pct}%`, background: 'rgba(56,189,248,0.04)', zIndex: 0 }} />
                  <Typography className="font-mono text-[11px] truncate pr-2 relative z-10" sx={{ color: textSec }}>
                    {item.name}
                  </Typography>
                  <Typography className="font-mono text-[11px] text-right relative z-10" sx={{ color: '#38BDF8' }}>
                    {item.count.toLocaleString()}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}

      {/* Response code distribution */}
      {dns.response_codes.length > 0 && (
        <Box>
          <SectionLabel>RESPONSE CODE DISTRIBUTION</SectionLabel>
          <Box className="flex flex-wrap gap-2">
            {dns.response_codes.map(rc => {
              const isNXDOMAIN = rc.code === 'NXDOMAIN'
              const isNOERROR  = rc.code === 'NOERROR'
              const color = isNXDOMAIN ? '#EF4444' : isNOERROR ? '#22C55E' : '#EAB308'
              return (
                <Box key={rc.code} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                  sx={{ background: `rgba(${hexRgb(color)},0.08)`, border: `1px solid rgba(${hexRgb(color)},0.2)` }}>
                  <Typography className="font-mono font-bold text-[11px]" sx={{ color }}>{rc.code}</Typography>
                  <Typography sx={{ fontSize: 10, color: textMuted }}>{rc.count.toLocaleString()}</Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}
    </Stack>
  )
}

function DHCPPanel({ dhcp, loading, onDrillDown }: { dhcp?: DHCPResult; loading: boolean; onDrillDown: (q: string) => void }) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'
  const textSec   = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.7)'
  const rowHover  = isDark ? 'rgba(123,91,164,0.07)' : 'rgba(123,91,164,0.04)'
  const rowBord   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,91,164,0.06)'

  const ACTION_COLOR: Record<string, string> = {
    ack: '#22C55E', offer: '#38BDF8', discover: '#8B5CF6',
    request: '#EAB308', release: '#F17422', expire: '#EF4444', nak: '#EF4444',
  }

  if (loading) {
    return (
      <Stack spacing={2}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />
        ))}
      </Stack>
    )
  }

  if (!dhcp || dhcp.count === 0) {
    return <Empty message="ไม่พบ DHCP log สำหรับ entity นี้ — ตรวจสอบว่า DHCP server ส่ง syslog มายัง Wazuh แล้วหรือยัง" />
  }

  return (
    <Stack spacing={3}>
      {/* Summary */}
      <Box className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'DHCP Events', value: dhcp.count, color: '#8B5CF6' },
          { label: 'IP Addresses', value: dhcp.ip_history.length, color: '#38BDF8' },
          { label: 'MAC Addresses', value: dhcp.mac_history.length, color: '#22C55E' },
          { label: 'Hostnames', value: dhcp.hostname_history.length, color: '#EAB308' },
        ].map(m => (
          <Box key={m.label}
            className="rounded-xl px-3 py-2.5"
            sx={{ background: `rgba(${hexRgb(m.color)},0.07)`, border: `1px solid rgba(${hexRgb(m.color)},0.18)` }}>
            <Typography className="font-mono font-bold text-base" sx={{ color: m.color }}>{m.value}</Typography>
            <Typography sx={{ fontSize: 9, color: textMuted }}>{m.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Action distribution */}
      {dhcp.actions.length > 0 && (
        <Box>
          <SectionLabel>DHCP ACTIONS</SectionLabel>
          <Box className="flex flex-wrap gap-2">
            {dhcp.actions.map(a => {
              const color = ACTION_COLOR[a.action?.toLowerCase()] ?? '#64748B'
              return (
                <Box key={a.action} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                  sx={{ background: `rgba(${hexRgb(color)},0.08)`, border: `1px solid rgba(${hexRgb(color)},0.2)` }}>
                  <Box className="w-1.5 h-1.5 rounded-full" sx={{ background: color }} />
                  <Typography className="font-mono font-bold text-[11px]" sx={{ color }}>{a.action?.toUpperCase()}</Typography>
                  <Typography sx={{ fontSize: 10, color: textMuted }}>{a.count}</Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}

      {/* Lease history */}
      <Box>
        <SectionLabel>LEASE HISTORY ({dhcp.leases.length})</SectionLabel>
        <Box className="rounded-xl overflow-hidden"
          sx={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(123,91,164,0.1)'}` }}>
          <Box className="grid px-3 py-1.5"
            sx={{ gridTemplateColumns: '140px 110px 130px 1fr 80px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(123,91,164,0.03)' }}>
            {['TIME', 'ACTION', 'IP', 'MAC / HOSTNAME', 'LEVEL'].map(h => (
              <Typography key={h} className="text-[9px] font-bold tracking-wider" sx={{ color: textMuted }}>{h}</Typography>
            ))}
          </Box>
          {dhcp.leases.slice(0, 30).map((l, i) => {
            const color = ACTION_COLOR[l.action?.toLowerCase() ?? ''] ?? '#64748B'
            return (
              <Box key={i}
                className="grid px-3 py-2 transition-colors"
                sx={{ gridTemplateColumns: '140px 110px 130px 1fr 80px', borderTop: `1px solid ${rowBord}`, '&:hover': { background: rowHover } }}
              >
                <Typography className="font-mono text-[10px]" sx={{ color: textMuted }}>
                  {l.timestamp ? new Date(l.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </Typography>
                <Box>
                  <Chip label={l.action?.toUpperCase() ?? '—'} size="small"
                    sx={{ height: 16, fontSize: 9, fontWeight: 700, bgcolor: `rgba(${hexRgb(color)},0.12)`, color, border: 'none' }} />
                </Box>
                <Tooltip title={l.ip ? `Investigate: ${l.ip}` : ''}>
                  <Typography
                    className="font-mono text-[11px] cursor-pointer truncate"
                    sx={{ color: '#38BDF8', '&:hover': { textDecoration: 'underline' } }}
                    onClick={() => l.ip && onDrillDown(l.ip)}
                  >{l.ip || '—'}</Typography>
                </Tooltip>
                <Box className="min-w-0">
                  {l.mac && (
                    <Typography
                      className="font-mono text-[10px] cursor-pointer truncate"
                      sx={{ color: '#8B5CF6', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => onDrillDown(l.mac!)}
                    >{l.mac}</Typography>
                  )}
                  {l.hostname && (
                    <Typography className="text-[10px] truncate" sx={{ color: textMuted }}>{l.hostname}</Typography>
                  )}
                </Box>
                {l.rule_level != null ? (
                  <Box className="flex items-center">
                    <Box className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                      sx={{
                        background: l.rule_level >= 12 ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.1)',
                        color: l.rule_level >= 12 ? '#EF4444' : '#EAB308',
                      }}>
                      L{l.rule_level}
                    </Box>
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: 10, color: textMuted }}>—</Typography>
                )}
              </Box>
            )
          })}
        </Box>
      </Box>

      {/* IP/MAC association */}
      {(dhcp.ip_history.length > 0 || dhcp.mac_history.length > 0) && (
        <Box className="grid grid-cols-2 gap-4">
          {[
            { title: 'IP HISTORY', items: dhcp.ip_history, keyProp: 'ip', color: '#38BDF8', onItemClick: (i: { ip: string }) => onDrillDown(i.ip) },
            { title: 'MAC HISTORY', items: dhcp.mac_history, keyProp: 'mac', color: '#8B5CF6', onItemClick: (i: { mac: string }) => onDrillDown(i.mac) },
          ].map(({ title, items, keyProp, color, onItemClick }) => (
            <Box key={title}>
              <SectionLabel>{title}</SectionLabel>
              <Stack spacing={0.5}>
                {(items as Record<string, unknown>[]).slice(0, 8).map((item, i) => (
                  <Box key={i}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                    sx={{ '&:hover': { background: rowHover } }}
                    onClick={() => onItemClick(item as { ip: string; mac: string })}
                  >
                    <Typography className="font-mono text-[11px]" sx={{ color }}>{String(item[keyProp])}</Typography>
                    <Typography className="font-mono text-[10px]" sx={{ color: textMuted }}>{Number(item.count)}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  )
}

export default function DNSDHCPTab({ dns, dhcp, dnsLoading, dhcpLoading, onDrillDown }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const [activeTab, setActiveTab] = useState(0)

  const divider = isDark ? 'rgba(123,91,164,0.18)' : 'rgba(123,91,164,0.1)'

  const hasDnsAlert  = (dns?.has_malicious ?? false) && !dnsLoading
  const hasNacAlert  = false

  return (
    <Stack spacing={2} className="animate-fade-in">
      {/* Sub-tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          borderBottom: `1px solid ${divider}`,
          minHeight: 38,
          '& .MuiTab-root': { minHeight: 38, fontSize: 11, px: 2, gap: 0.5, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,100,0.5)' },
          '& .Mui-selected': { color: isDark ? '#C4B5FD !important' : '#7B5BA4 !important', fontWeight: 700 },
          '& .MuiTabs-indicator': { bgcolor: '#8B5CF6', height: 2 },
        }}
      >
        <Tab
          icon={<DnsRoundedIcon fontSize="small" />} iconPosition="start"
          label={
            <Box className="flex items-center gap-1">
              DNS Queries
              {hasDnsAlert && <WarningAmberRoundedIcon sx={{ fontSize: 12, color: '#EF4444' }} />}
              {!dnsLoading && dns?.count != null && (
                <Box className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  sx={{ background: 'rgba(56,189,248,0.12)', color: '#38BDF8' }}>{dns.count}</Box>
              )}
            </Box>
          }
        />
        <Tab
          icon={<RouterRoundedIcon fontSize="small" />} iconPosition="start"
          label={
            <Box className="flex items-center gap-1">
              DHCP Leases
              {!dhcpLoading && dhcp?.count != null && (
                <Box className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  sx={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>{dhcp.count}</Box>
              )}
            </Box>
          }
        />
      </Tabs>

      {activeTab === 0 && <DNSPanel dns={dns} loading={dnsLoading} onDrillDown={onDrillDown} />}
      {activeTab === 1 && <DHCPPanel dhcp={dhcp} loading={dhcpLoading} onDrillDown={onDrillDown} />}
    </Stack>
  )
}
