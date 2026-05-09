'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Initial {
  id?: string
  slug?: string
  name?: string
  description?: string | null
  titleTemplate?: string
  descriptionTemplate?: string | null
  requiredVariables?: string[]
  defaultBudgetCents?: number | null
  defaultBudgetTokens?: number | null
  defaultExecutionMode?: string
  defaultPriority?: number
  defaultRequirePlanApproval?: boolean
  isActive?: boolean
}

export function TemplateForm({ initial }: { initial?: Initial }) {
  const router = useRouter()
  const isEdit = Boolean(initial?.id)
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [titleTemplate, setTitleTemplate] = useState(initial?.titleTemplate ?? '')
  const [descriptionTemplate, setDescriptionTemplate] = useState(initial?.descriptionTemplate ?? '')
  const [requiredVariables, setRequiredVariables] = useState((initial?.requiredVariables ?? []).join('\n'))
  const [defaultBudgetCents, setDefaultBudgetCents] = useState(initial?.defaultBudgetCents ?? '')
  const [defaultExecutionMode, setDefaultExecutionMode] = useState(initial?.defaultExecutionMode ?? 'cron')
  const [defaultPriority, setDefaultPriority] = useState(initial?.defaultPriority ?? 2)
  const [defaultRequirePlanApproval, setDefaultRequirePlanApproval] = useState(initial?.defaultRequirePlanApproval ?? false)
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        slug,
        name,
        description: description || null,
        titleTemplate,
        descriptionTemplate: descriptionTemplate || null,
        requiredVariables: requiredVariables.split('\n').map((s) => s.trim()).filter(Boolean),
        defaultBudgetCents: defaultBudgetCents === '' ? null : Number(defaultBudgetCents),
        defaultExecutionMode,
        defaultPriority: Number(defaultPriority),
        defaultRequirePlanApproval,
      }
      const url = isEdit ? `/api/agents/templates/${initial!.id}` : '/api/agents/templates'
      const method = isEdit ? 'PATCH' : 'POST'
      const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) throw new Error(await r.text())
      toast.success(isEdit ? 'Template aktualisiert' : 'Template angelegt')
      router.push('/intern/agents/templates')
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!isEdit) return
    if (!confirm(`Template "${initial!.name}" wirklich loeschen?`)) return
    setSaving(true)
    try {
      const r = await fetch(`/api/agents/templates/${initial!.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(await r.text())
      toast.success('Template geloescht')
      router.push('/intern/agents/templates')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Template bearbeiten' : 'Neues Template'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Slug (eindeutig)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isEdit} required placeholder="z.B. firma-recherchieren" />
          </div>
          <div>
            <Label>Name (Display)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Title-Template (mit {`{{var}}`}-Platzhaltern)</Label>
            <Input value={titleTemplate} onChange={(e) => setTitleTemplate(e.target.value)} required placeholder="z.B. Recherche: {{firmenName}}" />
          </div>
          <div>
            <Label>Description-Template (optional)</Label>
            <Textarea value={descriptionTemplate} onChange={(e) => setDescriptionTemplate(e.target.value)} rows={6} placeholder="z.B. Recherchiere die Firma {{firmenName}} ..." />
          </div>
          <div>
            <Label>Erforderliche Variablen (1 pro Zeile)</Label>
            <Textarea value={requiredVariables} onChange={(e) => setRequiredVariables(e.target.value)} rows={4} placeholder="firmenName" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Default-Budget (Cent)</Label>
              <Input type="number" value={defaultBudgetCents} onChange={(e) => setDefaultBudgetCents(e.target.value)} />
            </div>
            <div>
              <Label>Default-Mode</Label>
              <select value={defaultExecutionMode} onChange={(e) => setDefaultExecutionMode(e.target.value)} className="w-full border rounded p-2">
                <option value="cron">cron</option>
                <option value="immediate">immediate</option>
              </select>
            </div>
            <div>
              <Label>Default-Priority</Label>
              <Input type="number" min={1} max={3} value={defaultPriority} onChange={(e) => setDefaultPriority(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="appr" type="checkbox" checked={defaultRequirePlanApproval} onChange={(e) => setDefaultRequirePlanApproval(e.target.checked)} />
            <Label htmlFor="appr">Default: Plan-Freigabe erforderlich</Label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? 'Speichere...' : 'Speichern'}</Button>
            {isEdit && <Button type="button" variant="destructive" disabled={saving} onClick={remove}>Loeschen</Button>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
