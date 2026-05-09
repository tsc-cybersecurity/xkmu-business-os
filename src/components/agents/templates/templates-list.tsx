'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Template {
  id: string
  slug: string
  name: string
  description: string | null
  requiredVariables: string[]
  isActive: boolean
}

export function TemplatesList() {
  const [items, setItems] = useState<Template[] | null>(null)
  useEffect(() => {
    fetch('/api/agents/templates').then((r) => r.json()).then((j) => setItems(j.templates ?? []))
  }, [])
  if (!items) return <div>Lade Templates ...</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Goal-Templates</h1>
        <Link href="/intern/agents/templates/new"><Button>Neues Template</Button></Link>
      </div>
      <div className="grid gap-3">
        {items.map((t) => (
          <Link key={t.id} href={`/intern/agents/templates/${t.id}`}>
            <Card className="hover:bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{t.name}</span>
                  <code className="text-xs text-muted-foreground">{t.slug}</code>
                  {!t.isActive && <Badge variant="outline">inaktiv</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t.description ?? '—'}
                {t.requiredVariables.length > 0 && (
                  <div className="mt-1 text-xs">Variablen: {t.requiredVariables.map((v) => <code key={v} className="mr-1">{`{{${v}}}`}</code>)}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
