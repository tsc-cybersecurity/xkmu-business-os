'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Trash2, Ban, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export interface OverrideRow {
  id: string
  userId: string
  startAt: string
  endAt: string
  kind: 'free' | 'block'
  reason: string | null
  createdAt: string
}

function fmtRange(a: string, b: string): string {
  const da = new Date(a), db = new Date(b)
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  return `${da.toLocaleString('de-DE', opts)} – ${db.toLocaleString('de-DE', opts)}`
}

export function OverridesEditor({ overrides, onChange }: {
  overrides: OverrideRow[]
  onChange: (next: OverrideRow[]) => void
}) {
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    startAt: '', endAt: '', kind: 'block' as 'free' | 'block', reason: '',
  })

  async function create() {
    if (!form.startAt || !form.endAt) {
      toast.error('Start und Ende erforderlich')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/v1/availability/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          kind: form.kind,
          reason: form.reason || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Anlegen fehlgeschlagen')
      const { override } = await res.json()
      onChange([...overrides, override].sort((a, b) => a.startAt.localeCompare(b.startAt)))
      setShowForm(false)
      setForm({ startAt: '', endAt: '', kind: 'block', reason: '' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Eintrag wirklich löschen?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/availability/overrides/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      onChange(overrides.filter(o => o.id !== id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  const today = new Date()
  const upcoming = overrides.filter(o => new Date(o.endAt) >= today)
  const past = overrides.filter(o => new Date(o.endAt) < today)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Einzelne Zeitfenster blockieren (Urlaub, Feiertag) oder zusätzlich freigeben (z. B. ausnahmsweise Samstag).
        </p>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} disabled={busy}>
            Neue Ausnahme
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.kind === 'block' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm({ ...form, kind: 'block' })}
              >
                <Ban className="mr-2 h-4 w-4" />
                Blockieren
              </Button>
              <Button
                type="button"
                variant={form.kind === 'free' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm({ ...form, kind: 'free' })}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Zusätzlich freigeben
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="from">Von</Label>
                <Input id="from" type="datetime-local" value={form.startAt}
                  onChange={e => setForm({ ...form, startAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to">Bis</Label>
                <Input id="to" type="datetime-local" value={form.endAt}
                  onChange={e => setForm({ ...form, endAt: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Grund (optional)</Label>
              <Input id="reason" value={form.reason} placeholder="z. B. Urlaub"
                onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={create} disabled={busy}>Speichern</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} disabled={busy}>Abbrechen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="font-medium mb-2 text-sm">Bevorstehend ({upcoming.length})</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine bevorstehenden Ausnahmen.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(o => (
              <Card key={o.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    {o.kind === 'block'
                      ? <Ban className="h-4 w-4 mt-0.5 text-red-600 shrink-0" />
                      : <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{fmtRange(o.startAt, o.endAt)}</p>
                      {o.reason && <p className="text-xs text-muted-foreground">{o.reason}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(o.id)} disabled={busy} aria-label="Löschen">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer">Vergangene anzeigen ({past.length})</summary>
          <div className="space-y-2 mt-2">
            {past.map(o => (
              <Card key={o.id}>
                <CardContent className="p-3 text-muted-foreground flex items-center justify-between">
                  <p className="text-sm">{fmtRange(o.startAt, o.endAt)} {o.reason && ` · ${o.reason}`}</p>
                  <Button variant="ghost" size="icon" onClick={() => remove(o.id)} disabled={busy} aria-label="Löschen">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
