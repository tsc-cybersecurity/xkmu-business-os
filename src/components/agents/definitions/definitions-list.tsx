'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Def {
  id: string
  slug: string
  role: string
  name: string | null
  modelHint: string | null
  maxIterations: number
  isActive: boolean
}

export function DefinitionsList() {
  const [defs, setDefs] = useState<Def[] | null>(null)

  useEffect(() => {
    fetch('/api/agents/definitions')
      .then((r) => r.json())
      .then((j) => setDefs(j.definitions))
      .catch(() => setDefs([]))
  }, [])

  if (!defs) return <div className="text-sm text-muted-foreground">Lade Definitions...</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Smart-Worker-Definitions</h1>
        <Link href="/intern/agents/definitions/new">
          <Button>Neue Definition</Button>
        </Link>
      </div>
      {defs.length === 0 && (
        <div className="text-sm text-muted-foreground">Noch keine Definitions vorhanden.</div>
      )}
      <div className="grid gap-3">
        {defs.map((d) => (
          <Link key={d.id} href={`/intern/agents/definitions/${d.id}`}>
            <Card className="hover:bg-muted/50 cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{d.name ?? d.slug}</span>
                  <Badge>{d.role}</Badge>
                  {!d.isActive && <Badge variant="outline">inaktiv</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                slug=<code>{d.slug}</code> · model={d.modelHint ?? 'default'} · maxIter={d.maxIterations}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
