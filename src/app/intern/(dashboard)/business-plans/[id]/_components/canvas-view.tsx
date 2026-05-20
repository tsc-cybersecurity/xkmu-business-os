'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CanvasPlan {
  problem?: string[]
  solution?: string[]
  keyMetrics?: string[]
  uniqueValueProposition?: string
  unfairAdvantage?: string[]
  channels?: string[]
  customerSegments?: string[]
  costStructure?: string[]
  revenueStreams?: string[]
}

function Box({ title, items, accent }: { title: string; items?: string[] | string; accent?: string }) {
  const list = Array.isArray(items) ? items : items ? [items] : []
  return (
    <Card className={accent ? `border-l-4 ${accent}` : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">–</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {list.map((item, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-muted-foreground flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function CanvasView({ canvas }: { canvas: CanvasPlan | null | undefined }) {
  if (!canvas) {
    return <p className="text-sm text-muted-foreground italic">Kein Canvas verfügbar.</p>
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Box title="Problem" items={canvas.problem} accent="border-red-400" />
      <Box title="Lösung" items={canvas.solution} accent="border-blue-400" />
      <Box title="Schlüsselmetriken" items={canvas.keyMetrics} accent="border-purple-400" />

      <div className="md:col-span-3">
        <Box title="Wertversprechen (UVP)" items={canvas.uniqueValueProposition} accent="border-primary" />
      </div>

      <Box title="Unfair Advantage" items={canvas.unfairAdvantage} accent="border-amber-400" />
      <Box title="Kanäle" items={canvas.channels} accent="border-emerald-400" />
      <Box title="Kundensegmente" items={canvas.customerSegments} accent="border-cyan-400" />

      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Box title="Kostenstruktur" items={canvas.costStructure} accent="border-rose-400" />
        <Box title="Einnahmequellen" items={canvas.revenueStreams} accent="border-green-500" />
      </div>
    </div>
  )
}
