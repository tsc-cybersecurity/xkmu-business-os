'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CostData {
  byDay: Array<{ day: string; totalCents: number; totalTokens: number; callCount: number }>
  byGoal: Array<{ goalId: string; goalTitle: string; totalCents: number; totalTokens: number }>
  byModel: Array<{ provider: string; model: string; totalCents: number; totalTokens: number; callCount: number }>
  rangeDays: number
}

const PIE_COLORS = ['#0ea5e9', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#6366f1']

export function CostCharts() {
  const [data, setData] = useState<CostData | null>(null)
  const [range, setRange] = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/agents/cost?range=${range}`)
      .then((r) => r.json())
      .then((j) => { if (alive) { setData(j); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [range])

  if (loading) return <div className="text-sm text-muted-foreground">Lade Kosten-Daten...</div>
  if (!data) return <div className="text-sm text-destructive">Keine Daten</div>

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[7, 30, 90].map((r) => (
          <Button key={r} size="sm" variant={range === r ? 'default' : 'outline'} onClick={() => setRange(r)}>
            Letzte {r} Tage
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Kosten pro Tag (Cent)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalCents" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top-10 Goals nach Kosten</CardTitle></CardHeader>
        <CardContent>
          {data.byGoal.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine Cost-Events im Zeitraum</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, data.byGoal.length * 40)}>
              <BarChart data={data.byGoal} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="goalTitle" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="totalCents" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Modell-Verteilung</CardTitle></CardHeader>
        <CardContent>
          {data.byModel.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine Calls im Zeitraum</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.byModel}
                  dataKey="callCount"
                  nameKey="model"
                  outerRadius={100}
                  label={(entry) => `${(entry as unknown as { model: string; callCount: number }).model} (${(entry as unknown as { model: string; callCount: number }).callCount})`}
                >
                  {data.byModel.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
