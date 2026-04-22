'use client'

import { useState } from 'react'
import { getIcon } from '@/lib/utils/icon-map'
import { InlineMarkdown } from '../markdown-renderer'

export interface WheelSegment {
  label: string          // short uppercase label on wedge, e.g. "Reasoning"
  icon?: string          // lucide icon name shown in hub when active
  title?: string         // longer title in sidebar
  description?: string   // description in sidebar
  metric?: string        // hub metric value, e.g. "89.2"
  metricLabel?: string   // metric sublabel, e.g. "Bench (MMLU)"
}

export interface WheelBlockContent {
  sectionLabel?: string
  heading?: string
  subheading?: string
  segments?: WheelSegment[]
}

interface WheelBlockProps {
  content: WheelBlockContent
  settings?: Record<string, unknown>
}

// Dial geometry (matches the shadcn.io reference: 400x400 viewBox, 180 outer, 96 inner)
const CENTER = 200
const OUTER = 180
const INNER = 96
const GAP_DEG = 0.76 // small visual gap between wedges

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) }
}

function wedgePath(startDeg: number, endDeg: number) {
  const a1 = startDeg + GAP_DEG
  const a2 = endDeg - GAP_DEG
  const o1 = polar(a1, OUTER)
  const o2 = polar(a2, OUTER)
  const i1 = polar(a1, INNER)
  const i2 = polar(a2, INNER)
  const f = (n: number) => n.toFixed(2)
  return `M ${f(o1.x)} ${f(o1.y)} A ${OUTER} ${OUTER} 0 0 1 ${f(o2.x)} ${f(o2.y)} L ${f(i2.x)} ${f(i2.y)} A ${INNER} ${INNER} 0 0 0 ${f(i1.x)} ${f(i1.y)} Z`
}

export function WheelBlock({ content, settings }: WheelBlockProps) {
  const segs = (content.segments || []).slice(0, 8)
  const count = segs.length
  const [active, setActive] = useState(0)

  if (count === 0) {
    return (
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Bitte Segmente konfigurieren (2–8 Einträge).
        </div>
      </section>
    )
  }

  const sweep = 360 / count
  const startOffset = -90 // first wedge starts at top
  const activeSeg = segs[active]
  const ActiveIcon = activeSeg?.icon ? getIcon(activeSeg.icon) : null

  const midAngle = startOffset + active * sweep + sweep / 2
  const needleRotation = midAngle + 90 // needle default points up

  const prev = () => setActive(a => (a - 1 + count) % count)
  const next = () => setActive(a => (a + 1) % count)

  return (
    <section
      className="container mx-auto px-4 py-12 md:py-16"
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
      }}
    >
      {(content.sectionLabel || content.heading || content.subheading) && (
        <div className="max-w-xl">
          {content.sectionLabel && (
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {content.sectionLabel}
            </span>
          )}
          {content.heading && (
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {content.heading}
            </h2>
          )}
          {content.subheading && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              <InlineMarkdown text={content.subheading} />
            </p>
          )}
        </div>
      )}

      <div className="mt-10 grid gap-8 rounded-2xl border bg-card p-6 md:grid-cols-[1fr_240px] md:gap-10 md:p-8">
        {/* Dial */}
        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-[420px]" role="radiogroup" aria-label="Segment selector">
            <svg viewBox="0 0 400 400" className="h-auto w-full">
              <title>Radial dial selector</title>
              {segs.map((seg, i) => {
                const a1 = startOffset + i * sweep
                const a2 = a1 + sweep
                const mid = (a1 + a2) / 2
                const textR = (OUTER + INNER) / 2
                const tp = polar(mid, textR)
                const isActive = i === active
                return (
                  <g key={i}>
                    <path
                      d={wedgePath(a1, a2)}
                      className={`cursor-pointer transition-all duration-200 ${isActive ? 'fill-emerald-500/20 stroke-emerald-500' : 'fill-muted/40 stroke-border hover:fill-muted/60'}`}
                      strokeWidth={1.5}
                      role="radio"
                      aria-checked={isActive}
                      aria-label={`Select ${seg.label}`}
                      tabIndex={0}
                      onClick={() => setActive(i)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(i) }
                      }}
                    />
                    <text
                      x={tp.x}
                      y={tp.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`pointer-events-none text-[11px] font-medium uppercase tracking-wider ${isActive ? 'fill-foreground' : 'fill-muted-foreground'}`}
                    >
                      {seg.label}
                    </text>
                  </g>
                )
              })}
              {/* Needle */}
              <g
                aria-hidden="true"
                style={{
                  transformOrigin: '50% 50%',
                  transformBox: 'fill-box',
                  transform: `rotate(${needleRotation}deg)`,
                  transition: 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <line x1="200" y1="200" x2="200" y2="112" className="stroke-foreground" strokeWidth={2.5} strokeLinecap="round" />
                <circle cx="200" cy="112" r="3" className="fill-foreground" />
              </g>
              {/* Hub */}
              <circle cx="200" cy="200" r="90" className="fill-background stroke-border" strokeWidth={1} />
              <circle cx="200" cy="200" r="4" className="fill-foreground" />
            </svg>

            {/* Hub content overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <div className="flex flex-col items-center px-6 text-center" style={{ width: 120 }}>
                {ActiveIcon && (
                  <span className="flex size-8 items-center justify-center rounded-md border bg-card">
                    <ActiveIcon className="size-4 text-foreground" />
                  </span>
                )}
                <div className="mt-2 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
                  {activeSeg?.label}
                </div>
                {activeSeg?.metric && (
                  <div className="mt-1 font-mono text-lg font-semibold text-foreground tabular-nums">
                    {activeSeg.metric}
                  </div>
                )}
                {activeSeg?.metricLabel && (
                  <div className="text-[9px] text-muted-foreground">{activeSeg.metricLabel}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Ausgewählt
            </div>
            {activeSeg?.title && (
              <h3 className="mt-1.5 text-sm font-medium leading-snug text-foreground">
                {activeSeg.title}
              </h3>
            )}
            {activeSeg?.description && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {activeSeg.description}
              </p>
            )}
          </div>

          <div className="flex-1">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Alle Segmente
            </div>
            <ul className="mt-2 space-y-1">
              {segs.map((seg, i) => {
                const isActive = i === active
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${isActive ? 'bg-muted' : 'hover:bg-muted/60'}`}
                    >
                      <span className={`size-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                      <span className={`flex-1 text-xs ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {seg.label}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="flex items-center justify-between gap-2 border-t pt-4">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Drehen
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prev}
                className="flex size-7 items-center justify-center rounded-md border bg-background text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Vorheriges Segment"
              >←</button>
              <button
                type="button"
                onClick={next}
                className="flex size-7 items-center justify-center rounded-md border bg-background text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Nächstes Segment"
              >→</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
