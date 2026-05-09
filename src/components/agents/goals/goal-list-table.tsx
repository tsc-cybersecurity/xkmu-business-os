'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface GoalRow {
  id: string
  title: string
  status: string
  priority: number
  spentCents: number
  createdAt: string
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  planning: 'secondary',
  running: 'default',
  paused: 'secondary',
  done: 'default',
  failed: 'destructive',
  cancelled: 'outline',
}

export function GoalListTable() {
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/agents/goals')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as { goals: GoalRow[] }
        if (!cancelled) setGoals(json.goals ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <p className="text-sm text-muted-foreground">Lade …</p>
  if (error) return <p className="text-sm text-destructive">Fehler: {error}</p>
  if (goals.length === 0) return <p className="text-sm text-muted-foreground italic">Noch keine Goals — lege links eines an.</p>

  return (
    <div className="space-y-2">
      {goals.map((g) => (
        <Card key={g.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <Link href={`/intern/agents/goals/${g.id}`} className="font-medium hover:underline">
                {g.title}
              </Link>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(g.createdAt).toLocaleString('de-DE')} · Prio {g.priority} · {(g.spentCents / 100).toFixed(2)} EUR
              </div>
            </div>
            <Badge variant={STATUS_COLORS[g.status] ?? 'outline'}>{g.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
