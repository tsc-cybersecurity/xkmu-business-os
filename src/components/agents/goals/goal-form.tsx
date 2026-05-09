'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export function GoalForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [executionMode, setExecutionMode] = useState<'cron' | 'immediate'>('cron')
  const [budgetCents, setBudgetCents] = useState<number | ''>('')
  const [budgetTokens, setBudgetTokens] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length === 0) {
      toast.error('Titel erforderlich')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/agents/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          executionMode,
          budgetCents: budgetCents === '' ? undefined : Number(budgetCents),
          budgetTokens: budgetTokens === '' ? undefined : Number(budgetTokens),
          startNow: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Fehler' }))
        throw new Error(err.error ?? 'Goal konnte nicht angelegt werden')
      }
      const data = (await res.json()) as { id: string; started: boolean; startError?: string }
      if (data.startError) {
        toast.error(`Goal angelegt, aber Start fehlgeschlagen: ${data.startError}`)
      } else {
        toast.success('Goal angelegt und gestartet')
      }
      router.push(`/intern/agents/goals/${data.id}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl">
      <div>
        <Label htmlFor="title">Titel *</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Recherchiere Acme GmbH" required />
      </div>
      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detaillierte Aufgabe — was genau soll der Hauptagent tun?"
          rows={4}
        />
      </div>
      <div>
        <Label htmlFor="executionMode">Ausfuehrungs-Modus</Label>
        <Select value={executionMode} onValueChange={(v) => setExecutionMode(v as 'cron' | 'immediate')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cron">Cron (Standard, schrittweise via Tick)</SelectItem>
            <SelectItem value="immediate">Immediate (Inline, fuer dringende Goals)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="budgetCents">Budget (Cents)</Label>
          <Input id="budgetCents" type="number" min={0} value={budgetCents} onChange={(e) => setBudgetCents(e.target.value === '' ? '' : Number(e.target.value))} placeholder="z.B. 50" />
        </div>
        <div>
          <Label htmlFor="budgetTokens">Budget (Tokens)</Label>
          <Input id="budgetTokens" type="number" min={0} value={budgetTokens} onChange={(e) => setBudgetTokens(e.target.value === '' ? '' : Number(e.target.value))} placeholder="z.B. 50000" />
        </div>
      </div>
      <Button type="submit" disabled={submitting}>{submitting ? 'Speichere ...' : 'Anlegen + Starten'}</Button>
    </form>
  )
}
