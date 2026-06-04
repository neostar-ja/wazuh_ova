import { Box, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useMemo, useState } from 'react'
import type { EntityGraph, EntityNode, EntityNodeType } from '../../../types/investigate'

interface Props {
  graph: EntityGraph
  onDrillDown: (q: string) => void
}

const NODE_META: Record<EntityNodeType, { color: string; bg: string; symbol: string; label: string }> = {
  entity:  { color: '#A78BFA', bg: 'rgba(167,139,250,0.2)', symbol: '⬡', label: 'Entity' },
  ip:      { color: '#38BDF8', bg: 'rgba(56,189,248,0.15)', symbol: '◉', label: 'IP' },
  mac:     { color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', symbol: '⬟', label: 'MAC' },
  user:    { color: '#EAB308', bg: 'rgba(234,179,8,0.15)',  symbol: '◆', label: 'User' },
  agent:   { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', symbol: '◈', label: 'Agent' },
  vlan:    { color: '#F97316', bg: 'rgba(249,115,22,0.15)', symbol: '⬡', label: 'VLAN' },
  switch:  { color: '#EC4899', bg: 'rgba(236,72,153,0.15)', symbol: '▣', label: 'Switch/AP' },
  domain:  { color: '#06B6D4', bg: 'rgba(6,182,212,0.15)', symbol: '◎', label: 'Domain' },
  ioc:     { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', symbol: '⬛', label: 'IOC' },
  alert:   { color: '#F17422', bg: 'rgba(241,116,34,0.15)', symbol: '▲', label: 'Alert' },
  case:    { color: '#A855F7', bg: 'rgba(168,85,247,0.15)', symbol: '◧', label: 'Case' },
}

interface PositionedNode extends EntityNode {
  x: number
  y: number
  r: number
}

function layoutGraph(nodes: EntityNode[]): PositionedNode[] {
  const W = 600; const H = 440
  const cx = W / 2; const cy = H / 2

  const center = nodes.find(n => n.isCenter)
  const rest   = nodes.filter(n => !n.isCenter)

  const positioned: PositionedNode[] = []

  if (center) {
    positioned.push({ ...center, x: cx, y: cy, r: 28 })
  }

  // Arrange rest in concentric rings
  const layer1: EntityNode[] = []
  const layer2: EntityNode[] = []

  const highPriority: EntityNodeType[] = ['ip', 'mac', 'user', 'agent']
  for (const n of rest) {
    if (highPriority.includes(n.type)) layer1.push(n)
    else layer2.push(n)
  }

  const placeLayer = (items: EntityNode[], radius: number, nodeRadius: number) => {
    const total = items.length
    items.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / total - Math.PI / 2
      positioned.push({
        ...n,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        r: nodeRadius,
      })
    })
  }

  placeLayer(layer1, 130, 22)
  placeLayer(layer2, 220, 18)

  return positioned
}

function GraphNode({ node, isDark, selected, onClick }: {
  node: PositionedNode
  isDark: boolean
  selected: boolean
  onClick: () => void
}) {
  const meta = NODE_META[node.type] ?? NODE_META.entity
  const strokeColor = selected ? '#A78BFA' : meta.color
  const labelMax = 14

  return (
    <Tooltip
      title={
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{node.label}</Typography>
          <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{meta.label}</Typography>
          {node.count != null && (
            <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Events: {node.count.toLocaleString()}</Typography>
          )}
        </Box>
      }
      arrow
      placement="top"
    >
      <g
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      >
        {/* Glow ring on hover/selected */}
        {selected && (
          <circle
            cx={node.x} cy={node.y} r={node.r + 5}
            fill="none" stroke={meta.color} strokeWidth="1.5" opacity="0.3"
            strokeDasharray="4 3"
          />
        )}
        {/* Node circle */}
        <circle
          cx={node.x} cy={node.y} r={node.r}
          fill={meta.bg}
          stroke={strokeColor}
          strokeWidth={selected ? 2 : 1}
          style={{ transition: 'all 0.2s' }}
        />
        {/* Symbol */}
        <text
          x={node.x} y={node.y - (node.r > 20 ? 4 : 2)}
          textAnchor="middle" dominantBaseline="middle"
          fill={meta.color}
          fontSize={node.isCenter ? 16 : 12}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {meta.symbol}
        </text>
        {/* Label below */}
        <text
          x={node.x} y={node.y + node.r + 11}
          textAnchor="middle"
          fill={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,100,0.65)'}
          fontSize="9"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {node.label.length > labelMax ? node.label.slice(0, labelMax) + '…' : node.label}
        </text>
        {/* Count badge */}
        {node.count != null && node.count > 0 && (
          <g>
            <circle cx={node.x + node.r - 2} cy={node.y - node.r + 2} r={7}
              fill={meta.color} />
            <text
              x={node.x + node.r - 2} y={node.y - node.r + 2}
              textAnchor="middle" dominantBaseline="central"
              fill="#fff" fontSize="7" fontWeight="700"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {node.count > 99 ? '99+' : node.count}
            </text>
          </g>
        )}
      </g>
    </Tooltip>
  )
}

export function buildEntityGraph(
  query: string,
  entityType: string,
  identity?: Record<string, unknown>,
  levelDist?: Record<string, number>,
  mitre?: { tactics: string[]; techniques: string[] },
  irisData?: { found?: boolean; alert_count?: number },
  nacData?: { vlans?: { vlan: string; count: number }[]; switches?: { switch: string; count: number }[] },
): EntityGraph {
  const nodes: EntityNode[] = []
  const edges: EntityEdge[]  = []

  const centerId = `center_${query}`
  nodes.push({ id: centerId, type: 'entity', label: query, isCenter: true })

  const pushNode = (type: EntityNodeType, value: string, count?: number): string | null => {
    if (!value) return null
    const id = `${type}_${value}`
    if (!nodes.find(n => n.id === id)) {
      nodes.push({ id, type, label: value, count })
    }
    return id
  }

  const pushEdge = (sourceId: string | null, targetId: string | null, label?: string) => {
    if (sourceId && targetId) {
      edges.push({ source: sourceId, target: targetId, label })
    }
  }

  // IPs
  const ips = (identity?.ips as { value: string; count: number }[] | undefined) ?? []
  ips.slice(0, 5).forEach(({ value, count }) => {
    const id = pushNode('ip', value, count)
    pushEdge(centerId, id, 'has IP')
  })

  // MACs
  const macs = (identity?.macs as { value: string; count: number }[] | undefined) ?? []
  macs.slice(0, 4).forEach(({ value, count }) => {
    const id = pushNode('mac', value, count)
    pushEdge(centerId, id, 'has MAC')
  })

  // Users
  const users = (identity?.users as { value: string; count: number }[] | undefined) ?? []
  users.slice(0, 3).forEach(({ value, count }) => {
    const id = pushNode('user', value, count)
    pushEdge(centerId, id, 'logged in')
  })

  // Agents
  const agents = (identity?.agents as { value: string; count: number }[] | undefined) ?? []
  agents.slice(0, 3).forEach(({ value, count }) => {
    const id = pushNode('agent', value, count)
    pushEdge(centerId, id, 'seen on')
  })

  // MITRE tactics
  const totalAlerts = Object.values(levelDist ?? {}).reduce((a, b) => a + b, 0)
  if (mitre?.tactics && mitre.tactics.length > 0) {
    const tacticId = pushNode('alert', mitre.tactics[0], totalAlerts)
    pushEdge(centerId, tacticId, 'MITRE tactic')
  }

  // IRIS case
  if (irisData?.found && irisData.alert_count) {
    const caseId = pushNode('case', `IRIS (${irisData.alert_count})`, irisData.alert_count)
    pushEdge(centerId, caseId, 'in case')
  }

  // VLAN from NAC
  const vlans = nacData?.vlans ?? []
  vlans.slice(0, 2).forEach(v => {
    const id = pushNode('vlan', `VLAN ${v.vlan}`, v.count)
    const firstIp = ips[0]
    if (firstIp) {
      pushEdge(`ip_${firstIp.value}`, id, 'assigned to')
    } else {
      pushEdge(centerId, id, 'assigned to')
    }
  })

  // Switch/AP from NAC
  const switches = nacData?.switches ?? []
  switches.slice(0, 2).forEach(s => {
    const swId = pushNode('switch', s.switch, s.count)
    const firstVlan = vlans[0]
    if (firstVlan) {
      pushEdge(`vlan_VLAN ${firstVlan.vlan}`, swId, 'via')
    } else {
      pushEdge(centerId, swId, 'connected via')
    }
  })

  return { nodes, edges }
}

import type { EntityEdge } from '../../../types/investigate'

export default function EntityGraphTab({ graph, onDrillDown }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.4)'

  const positioned = useMemo(() => layoutGraph(graph.nodes), [graph.nodes])

  const nodeMap = useMemo(() => {
    const map: Record<string, PositionedNode> = {}
    positioned.forEach(n => { map[n.id] = n })
    return map
  }, [positioned])

  if (graph.nodes.length <= 1) {
    return (
      <Box className="flex flex-col items-center justify-center py-14 gap-3">
        <Typography sx={{ fontSize: 48 }}>⬡</Typography>
        <Typography sx={{ fontSize: 12, color: textMuted }}>
          ค้นหา entity เพื่อสร้าง Entity Graph
        </Typography>
      </Box>
    )
  }

  const handleNodeClick = (node: PositionedNode) => {
    setSelectedId(node.id === selectedId ? null : node.id)
    if (!node.isCenter && node.label) {
      onDrillDown(node.label)
    }
  }

  return (
    <Box className="animate-fade-in">
      <Box
        className="rounded-xl overflow-hidden"
        sx={{
          background: isDark ? 'rgba(12,9,24,0.8)' : 'rgba(248,246,255,0.8)',
          border: `1px solid ${isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.12)'}`,
        }}
      >
        <svg
          width="100%"
          viewBox="0 0 600 460"
          style={{ display: 'block', minHeight: 300 }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="rgba(123,91,164,0.5)" />
            </marker>
          </defs>

          {/* Edges */}
          {graph.edges.map((edge, i) => {
            const src = nodeMap[edge.source]
            const tgt = nodeMap[edge.target]
            if (!src || !tgt) return null

            const dx = tgt.x - src.x
            const dy = tgt.y - src.y
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len < 1) return null

            const x1 = src.x + (dx / len) * src.r
            const y1 = src.y + (dy / len) * src.r
            const x2 = tgt.x - (dx / len) * (tgt.r + 6)
            const y2 = tgt.y - (dy / len) * (tgt.r + 6)
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2

            return (
              <g key={i}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(123,91,164,0.3)"
                  strokeWidth="1"
                  markerEnd="url(#arrowhead)"
                />
                {edge.label && (
                  <text x={mx} y={my - 4} textAnchor="middle"
                    fill="rgba(123,91,164,0.5)" fontSize="8"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {edge.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {positioned.map(node => (
            <GraphNode
              key={node.id}
              node={node}
              isDark={isDark}
              selected={node.id === selectedId}
              onClick={() => handleNodeClick(node)}
            />
          ))}
        </svg>
      </Box>

      {/* Legend */}
      <Box className="flex flex-wrap gap-2 mt-3">
        {(Object.entries(NODE_META) as [EntityNodeType, typeof NODE_META.entity][])
          .filter(([type]) => graph.nodes.some(n => n.type === type))
          .map(([type, meta]) => (
            <Box key={type} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
              sx={{ background: meta.bg, border: `1px solid ${meta.color}30` }}>
              <Typography sx={{ fontSize: 11, color: meta.color }}>{meta.symbol}</Typography>
              <Typography sx={{ fontSize: 10, color: textMuted }}>{meta.label}</Typography>
            </Box>
          ))
        }
      </Box>

      <Typography sx={{ fontSize: 10, color: textMuted, mt: 2 }}>
        คลิกที่ node เพื่อสืบค้น entity นั้น — node ตรงกลางคือ entity ที่กำลัง investigate
      </Typography>
    </Box>
  )
}
