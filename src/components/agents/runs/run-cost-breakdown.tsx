'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CostEvent {
  id: string
  callRole: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  costCents: number
  occurredAt: string
}

export function RunCostBreakdown({ events }: { events: CostEvent[] }) {
  const totalCents = events.reduce((s, e) => s + e.costCents, 0)
  const totalTokens = events.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kosten-Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-2">
          Gesamt: <strong>{totalCents} Cent</strong> · {totalTokens.toLocaleString('de-DE')} Tokens · {events.length} Calls
        </div>
        {events.length === 0 ? (
          <div className="text-sm text-muted-foreground">Keine Cost-Events</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left">
                <tr className="border-b">
                  <th className="py-1 pr-3">Role</th>
                  <th className="py-1 pr-3">Modell</th>
                  <th className="py-1 pr-3">Input</th>
                  <th className="py-1 pr-3">Output</th>
                  <th className="py-1 pr-3">Cent</th>
                  <th className="py-1">Wann</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="py-1 pr-3">{e.callRole}</td>
                    <td className="py-1 pr-3">{e.provider}/{e.model}</td>
                    <td className="py-1 pr-3">{e.inputTokens.toLocaleString('de-DE')}</td>
                    <td className="py-1 pr-3">{e.outputTokens.toLocaleString('de-DE')}</td>
                    <td className="py-1 pr-3">{e.costCents}</td>
                    <td className="py-1 text-muted-foreground">{new Date(e.occurredAt).toLocaleString('de-DE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
