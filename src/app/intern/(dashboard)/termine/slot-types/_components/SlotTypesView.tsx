'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { SlotTypeFormSheet, type SlotTypeFormValues } from './SlotTypeFormSheet'

interface SlotTypeRow {
  id: string
  slug: string
  name: string
  description: string | null
  durationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  minNoticeHours: number
  maxAdvanceDays: number
  color: string
  isActive: boolean
  location: 'phone' | 'video' | 'onsite' | 'custom'
  locationDetails: string | null
  displayOrder: number
}

export function SlotTypesView({ initialSlotTypes }: { initialSlotTypes: SlotTypeRow[] }) {
  const [items, setItems] = useState<SlotTypeRow[]>(initialSlotTypes)
  const [editing, setEditing] = useState<SlotTypeRow | 'new' | null>(null)
  const [busy, setBusy] = useState(false)

  function copyBookingUrl(slug: string) {
    const url = `${window.location.origin}/buchen/<dein-slug>/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('URL kopiert (User-Slug noch zu setzen — Phase 4)')
  }

  async function save(data: SlotTypeFormValues, existingId?: string) {
    setBusy(true)
    try {
      const res = await fetch(
        existingId ? `/api/v1/slot-types/${existingId}` : '/api/v1/slot-types',
        {
          method: existingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Speichern fehlgeschlagen')
      }
      const body = await res.json()
      const saved: SlotTypeRow = body.slotType
      setItems(curr => existingId
        ? curr.map(it => it.id === existingId ? saved : it)
        : [...curr, saved],
      )
      setEditing(null)
      toast.success(existingId ? 'Aktualisiert' : 'Angelegt')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Diesen Termin-Typ wirklich löschen?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/slot-types/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      setItems(curr => curr.filter(it => it.id !== id))
      toast.success('Gelöscht')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Definiere die Termin-Arten, die Kunden buchen können.
        </p>
        <Button onClick={() => setEditing('new')} disabled={busy}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Termin-Art
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Noch keine Termin-Arten angelegt. Lege z. B. ein „Erstgespräch 30 min&ldquo; an.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map(it => (
            <Card key={it.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="h-10 w-10 shrink-0 rounded-md"
                      style={{ backgroundColor: it.color }}
                    />
                    <div className="min-w-0">
                      <CardTitle className="text-base">{it.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        /{it.slug} · {it.durationMinutes} min
                        {it.bufferBeforeMinutes > 0 && ` · ${it.bufferBeforeMinutes}m vor`}
                        {it.bufferAfterMinutes > 0 && ` · ${it.bufferAfterMinutes}m nach`}
                        {!it.isActive && ' · inaktiv'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copyBookingUrl(it.slug)} aria-label="URL kopieren">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(it)} aria-label="Bearbeiten">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(it.id)} disabled={busy} aria-label="Löschen">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <SlotTypeFormSheet
          mode={editing === 'new' ? 'create' : 'edit'}
          initial={editing === 'new' ? null : editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSubmit={data => save(data, editing === 'new' ? undefined : editing.id)}
        />
      )}
    </div>
  )
}
