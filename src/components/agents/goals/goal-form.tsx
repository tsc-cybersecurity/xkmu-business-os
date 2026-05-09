'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Template {
  id: string
  slug: string
  name: string
  description: string | null
  requiredVariables: string[]
}

export function GoalForm() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [executionMode, setExecutionMode] = useState<'cron' | 'immediate'>('cron')
  const [budgetCents, setBudgetCents] = useState<number | ''>('')
  const [budgetTokens, setBudgetTokens] = useState<number | ''>('')
  const [requirePlanApproval, setRequirePlanApproval] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/agents/templates')
      .then((r) => r.json())
      .then((j) => setTemplates((j as { templates?: Template[] }).templates ?? []))
      .catch(() => {/* Templates optional — kein UI-Fehler */})
  }, [])

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  async function submitFromTemplate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const r = await fetch(`/api/agents/templates/${selectedTemplateId}/create-goal`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variables: templateVariables }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: 'Fehler' }))
        throw new Error((err as { error?: string }).error ?? 'Fehler beim Erstellen')
      }
      const j = (await r.json()) as { goalId: string }
      toast.success('Goal aus Template erstellt')
      router.push(`/intern/agents/goals/${j.goalId}`)
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }

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
          requirePlanApproval,
          startNow: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Fehler' }))
        throw new Error((err as { error?: string }).error ?? 'Goal konnte nicht angelegt werden')
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
    <div className="space-y-6 max-w-2xl">
      {templates.length > 0 && (
        <div className="space-y-3 border rounded-lg p-4 pb-5">
          <Label className="text-base font-semibold">Aus Template anlegen (optional)</Label>
          <select
            value={selectedTemplateId}
            onChange={(e) => { setSelectedTemplateId(e.target.value); setTemplateVariables({}) }}
            className="w-full border rounded p-2 bg-background text-sm"
          >
            <option value="">— Kein Template, frei anlegen —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {selectedTemplate && (
            <form onSubmit={submitFromTemplate} className="space-y-3 mt-2">
              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
              )}
              {selectedTemplate.requiredVariables.map((v) => (
                <div key={v}>
                  <Label htmlFor={`tplvar-${v}`}>{v}</Label>
                  <Input
                    id={`tplvar-${v}`}
                    value={templateVariables[v] ?? ''}
                    onChange={(e) => setTemplateVariables({ ...templateVariables, [v]: e.target.value })}
                    required
                  />
                </div>
              ))}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Erstelle …' : 'Goal aus Template erstellen + starten'}
              </Button>
            </form>
          )}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {templates.length > 0 && (
          <p className="text-sm text-muted-foreground">— oder frei anlegen —</p>
        )}
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
        <div className="flex items-center gap-2">
          <input
            id="requirePlanApproval"
            type="checkbox"
            checked={requirePlanApproval}
            onChange={(e) => setRequirePlanApproval(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="requirePlanApproval" className="cursor-pointer font-normal">
            Plan vor Ausfuehrung freigeben (Goal wartet nach Planung auf Bestaetigung)
          </Label>
        </div>
        <Button type="submit" disabled={submitting}>{submitting ? 'Speichere …' : 'Anlegen + Starten'}</Button>
      </form>
    </div>
  )
}
