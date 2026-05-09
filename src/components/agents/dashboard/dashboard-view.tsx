'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Goal {
  id: string
  title: string
  status: string
  spentCents: number
  createdAt: string
}

interface DashboardData {
  goals: Goal[]
  costSparkline: Array<{ day: string; totalCents: number }>
}

function StatusBadge({ status }: { status: string }) {
  const variant: 'destructive' | 'default' | 'secondary' =
    status === 'failed' ? 'destructive' : status === 'done' ? 'default' : 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const [goalsR, costR] = await Promise.all([
          fetch('/api/agents/goals?limit=10').then((r) => r.json()),
          fetch('/api/agents/cost?range=7').then((r) => r.json()),
        ])
        if (!alive) return
        setData({
          goals: (goalsR.goals ?? goalsR ?? []) as Goal[],
          costSparkline: (costR.byDay ?? []) as Array<{ day: string; totalCents: number }>,
        })
      } catch { /* noop */ }
    }
    void tick()
    const handle = setInterval(tick, 30_000)
    return () => { alive = false; clearInterval(handle) }
  }, [])

  if (!data) return <div className="text-muted-foreground text-sm">Lade Dashboard...</div>

  const active = data.goals.filter((g) =>
    ['running', 'planning', 'paused', 'awaiting_approval'].includes(g.status)
  )
  const recent = data.goals.slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Agent-Dashboard</h1>
        <div className="flex gap-2 flex-wrap">
          <Link href="/intern/agents/goals/new"><Button>Neues Goal</Button></Link>
          <Link href="/intern/agents/cost"><Button variant="outline">Kosten</Button></Link>
          <Link href="/intern/agents/definitions"><Button variant="outline">Definitions</Button></Link>
          <Link href="/intern/agents/memory"><Button variant="outline">Memory</Button></Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Aktive Goals ({active.length})</CardTitle></CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <div className="text-muted-foreground text-sm">Keine aktiven Goals</div>
          ) : (
            <div className="space-y-2">
              {active.map((g) => (
                <Link key={g.id} href={`/intern/agents/goals/${g.id}`}>
                  <div className="flex items-center justify-between border rounded p-2 hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={g.status} />
                      <span>{g.title}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{g.spentCents} Cent</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Kosten letzte 7 Tage (Cent)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data.costSparkline}>
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
        <CardHeader><CardTitle>Letzte Goals</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recent.map((g) => (
              <Link
                key={g.id}
                href={`/intern/agents/goals/${g.id}`}
                className="flex items-center justify-between text-sm border-b py-1 hover:bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status={g.status} />
                  <span>{g.title}</span>
                </div>
                <span className="text-muted-foreground">{new Date(g.createdAt).toLocaleString('de-DE')}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
