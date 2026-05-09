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
  role?: string
  name?: string | null
  systemPrompt?: string
  allowedTools?: string[]
  modelHint?: string | null
  maxTokensPerCall?: number
  maxIterations?: number
  isActive?: boolean
}

export function DefinitionForm({ initial }: { initial?: Initial }) {
  const router = useRouter()
  const isEdit = Boolean(initial?.id)
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [role, setRole] = useState(initial?.role ?? 'worker')
  const [name, setName] = useState(initial?.name ?? '')
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? '')
  const [allowedTools, setAllowedTools] = useState(
    (initial?.allowedTools ?? ['memory:*']).join('\n')
  )
  const [modelHint, setModelHint] = useState(initial?.modelHint ?? '')
  const [maxTokensPerCall, setMaxTokensPerCall] = useState(initial?.maxTokensPerCall ?? 2048)
  const [maxIterations, setMaxIterations] = useState(initial?.maxIterations ?? 6)
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        slug,
        role,
        name: name || null,
        systemPrompt,
        allowedTools: allowedTools
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        modelHint: modelHint || null,
        maxTokensPerCall: Number(maxTokensPerCall),
        maxIterations: Number(maxIterations),
      }
      const url = isEdit ? `/api/agents/definitions/${initial!.id}` : '/api/agents/definitions'
      const method = isEdit ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error(await r.text())
      const j = await r.json()
      toast.success(isEdit ? 'Definition aktualisiert' : 'Definition angelegt')
      router.push(isEdit ? '/intern/agents/definitions' : `/intern/agents/definitions/${j.id}`)
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? 'Definition bearbeiten' : 'Neue Smart-Worker-Definition'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Slug (eindeutig)</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isEdit}
              placeholder="z.B. tester"
              required
            />
          </div>
          <div>
            <Label>Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border rounded p-2"
              disabled={isEdit}
            >
              <option value="worker">worker</option>
              <option value="orchestrator">orchestrator</option>
            </select>
          </div>
          <div>
            <Label>Name</Label>
            <Input
              value={name ?? ''}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anzeigename (optional)"
            />
          </div>
          <div>
            <Label>System-Prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              required
              placeholder="Du bist ein..."
            />
          </div>
          <div>
            <Label>
              Erlaubte Tools (1 pro Zeile, Wildcards wie <code>memory:*</code>)
            </Label>
            <Textarea
              value={allowedTools}
              onChange={(e) => setAllowedTools(e.target.value)}
              rows={6}
              placeholder="memory:*&#10;search:web"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Model Hint</Label>
              <Input
                value={modelHint ?? ''}
                onChange={(e) => setModelHint(e.target.value)}
                placeholder="gemini-2.5-flash-lite"
              />
            </div>
            <div>
              <Label>Max Tokens / Call</Label>
              <Input
                type="number"
                value={maxTokensPerCall}
                onChange={(e) => setMaxTokensPerCall(Number(e.target.value))}
                min={256}
                max={32768}
              />
            </div>
            <div>
              <Label>Max Iterations</Label>
              <Input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                min={1}
                max={50}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichere...' : 'Speichern'}
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={async () => {
                  if (!confirm(`Definition "${initial!.slug}" wirklich loeschen?\n\nSoft-Delete via isActive=false — historische Step-Refs bleiben erhalten.`)) return
                  setSaving(true)
                  try {
                    const r = await fetch(`/api/agents/definitions/${initial!.id}`, { method: 'DELETE' })
                    if (!r.ok) throw new Error(await r.text())
                    toast.success('Definition geloescht (deaktiviert)')
                    router.push('/intern/agents/definitions')
                  } catch (e) {
                    toast.error(`Fehler: ${(e as Error).message}`)
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                Loeschen
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
