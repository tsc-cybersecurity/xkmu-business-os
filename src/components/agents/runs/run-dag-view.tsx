/**
 * RunDagView — SVG-Visualisierung des Agent-Step-DAGs.
 *
 * Eigener Layered-Graph-Layouter (kein react-flow / dagre).
 * Topo-Sort via iterativem Bellman-aehnlichem Algorithmus (max 100 Iterationen,
 * Zyklen-Schutz). Horizontal pro Layer verteilt, vertikal = Layer.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §7 (DAG-Visualisierung)
 */
'use client'

import { useMemo } from 'react'

// ─── Typen ───────────────────────────────────────────────────────────────────

export interface DagStep {
  id: string
  stepKey: string
  workerType: string
  status: string
  dependsOnStepKeys: string[]
}

export interface DagNode {
  id: string
  stepKey: string
  workerType: string
  status: string
  layer: number
  indexInLayer: number
  x: number
  y: number
}

export interface DagEdge {
  fromKey: string
  toKey: string
}

// ─── Layout-Helper (pure — testbar ohne DOM) ──────────────────────────────

const NODE_W = 160
const NODE_H = 56
const H_GAP = 40
const V_GAP = 60

/**
 * Berechnet Layer-Assignment via iterativem Longest-Path-Algorithmus.
 * Gibt DagNodes mit x/y-Koordinaten zurueck.
 */
export function computeDagLayout(steps: DagStep[]): DagNode[] {
  if (steps.length === 0) return []

  // Initialisierung: alle Layer = 0
  const layerOf: Record<string, number> = {}
  for (const s of steps) {
    layerOf[s.stepKey] = 0
  }

  // Iterativer Bellman-aehnlicher Pass: max 100 Iterationen (Zyklen-Schutz)
  const MAX_ITER = 100
  let changed = true
  let iter = 0
  while (changed && iter < MAX_ITER) {
    changed = false
    iter++
    for (const s of steps) {
      for (const depKey of s.dependsOnStepKeys) {
        // Nur bekannte Deps beruecksichtigen
        if (layerOf[depKey] === undefined) continue
        const needed = layerOf[depKey] + 1
        if (needed > layerOf[s.stepKey]) {
          layerOf[s.stepKey] = needed
          changed = true
        }
      }
    }
  }

  // Gruppierung nach Layer
  const byLayer: Record<number, DagStep[]> = {}
  for (const s of steps) {
    const l = layerOf[s.stepKey]
    if (!byLayer[l]) byLayer[l] = []
    byLayer[l].push(s)
  }

  // Koordinaten berechnen
  const nodes: DagNode[] = []
  const maxLayer = Math.max(...Object.keys(byLayer).map(Number))

  for (let layer = 0; layer <= maxLayer; layer++) {
    const layerSteps = byLayer[layer] ?? []
    const totalW = layerSteps.length * NODE_W + (layerSteps.length - 1) * H_GAP
    const startX = Math.max(0, (600 - totalW) / 2) // zentriert in 600px

    layerSteps.forEach((s, idx) => {
      nodes.push({
        id: s.id,
        stepKey: s.stepKey,
        workerType: s.workerType,
        status: s.status,
        layer,
        indexInLayer: idx,
        x: startX + idx * (NODE_W + H_GAP),
        y: layer * (NODE_H + V_GAP),
      })
    })
  }

  return nodes
}

// ─── Status-Farben ────────────────────────────────────────────────────────────

function statusColor(status: string): { fill: string; stroke: string; text: string } {
  switch (status) {
    case 'completed':
      return { fill: '#d1fae5', stroke: '#10b981', text: '#065f46' }
    case 'running':
      return { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af' }
    case 'failed':
      return { fill: '#fee2e2', stroke: '#ef4444', text: '#991b1b' }
    case 'skipped':
      return { fill: '#f3f4f6', stroke: '#9ca3af', text: '#6b7280' }
    default: // pending / unknown
      return { fill: '#fef9c3', stroke: '#eab308', text: '#713f12' }
  }
}

// ─── React-Component ─────────────────────────────────────────────────────────

interface RunDagViewProps {
  steps: DagStep[]
}

export function RunDagView({ steps }: RunDagViewProps) {
  const nodes = useMemo(() => computeDagLayout(steps), [steps])

  if (nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">Keine Steps vorhanden.</p>
  }

  // Kanten: fuer jeden Step fuer jede bekannte Dep eine Edge
  const nodeByKey: Record<string, DagNode> = {}
  for (const n of nodes) nodeByKey[n.stepKey] = n

  const edges: DagEdge[] = []
  for (const s of steps) {
    for (const depKey of s.dependsOnStepKeys) {
      if (nodeByKey[depKey]) {
        edges.push({ fromKey: depKey, toKey: s.stepKey })
      }
    }
  }

  const maxLayer = Math.max(...nodes.map((n) => n.layer))
  const svgH = (maxLayer + 1) * (NODE_H + V_GAP) + V_GAP
  const svgW = 640

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      role="img"
      aria-label="Agent-Run DAG"
      className="w-full overflow-x-auto"
    >
      {/* Arrowhead-Definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((e) => {
        const from = nodeByKey[e.fromKey]
        const to = nodeByKey[e.toKey]
        if (!from || !to) return null
        const x1 = from.x + NODE_W / 2
        const y1 = from.y + NODE_H
        const x2 = to.x + NODE_W / 2
        const y2 = to.y
        return (
          <line
            key={`${e.fromKey}->${e.toKey}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2 - 6}
            stroke="#94a3b8"
            strokeWidth={1.5}
            markerEnd="url(#arrowhead)"
          />
        )
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const col = statusColor(n.status)
        return (
          <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill={col.fill}
              stroke={col.stroke}
              strokeWidth={1.5}
            />
            <text
              x={NODE_W / 2}
              y={20}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill={col.text}
            >
              {n.stepKey.length > 20 ? n.stepKey.slice(0, 19) + '…' : n.stepKey}
            </text>
            <text
              x={NODE_W / 2}
              y={36}
              textAnchor="middle"
              fontSize={10}
              fill={col.text}
              opacity={0.75}
            >
              {n.workerType.length > 22 ? n.workerType.slice(0, 21) + '…' : n.workerType}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
