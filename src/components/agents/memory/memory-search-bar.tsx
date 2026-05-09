'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import Link from 'next/link'

interface Hit { id: string; scope: string; title: string | null; summary: string | null; snippet: string; score: number }

export function MemorySearchBar() {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function run() {
    if (q.trim().length < 2) return
    setError(null)
    try {
      const res = await fetch(`/api/agents/memory/search?q=${encodeURIComponent(q)}&limit=10`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { hits: Hit[] }
      setHits(json.hits ?? [])
    } catch (e) {
      setError((e as Error).message)
      setHits([])
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => { e.preventDefault(); startTransition(() => { void run() }) }}
        className="flex gap-2"
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Memory durchsuchen ..." />
        <Button type="submit" disabled={isPending || q.trim().length < 2}>
          <Search className="size-4 mr-1" /> Suchen
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">Fehler: {error}</p>}
      {hits.length > 0 && (
        <ul className="divide-y rounded border">
          {hits.map((h) => (
            <li key={h.id} className="p-2 text-sm">
              <Link href={`/intern/agents/memory/${encodeURIComponent(h.scope)}`} className="font-medium hover:underline">
                {h.title ?? h.scope}
              </Link>
              <div className="text-xs text-muted-foreground">{h.scope} — score {h.score.toFixed(3)}</div>
              <div className="line-clamp-2 mt-1 text-muted-foreground">{h.snippet}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
