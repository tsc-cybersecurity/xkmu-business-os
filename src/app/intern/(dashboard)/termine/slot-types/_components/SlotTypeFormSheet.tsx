'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface SlotTypeFormValues {
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
}

const defaults: SlotTypeFormValues = {
  slug: '', name: '', description: null,
  durationMinutes: 30,
  bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
  minNoticeHours: 24, maxAdvanceDays: 60,
  color: '#3b82f6', isActive: true,
  location: 'phone', locationDetails: null,
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[äöüß]/g, c => ({ä:'ae',ö:'oe',ü:'ue',ß:'ss'} as Record<string,string>)[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function SlotTypeFormSheet(props: {
  mode: 'create' | 'edit'
  initial: SlotTypeFormValues | null
  busy: boolean
  onCancel: () => void
  onSubmit: (data: SlotTypeFormValues) => void
}) {
  const [form, setForm] = useState<SlotTypeFormValues>(props.initial ?? defaults)
  const [slugTouched, setSlugTouched] = useState(props.mode === 'edit')

  function setField<K extends keyof SlotTypeFormValues>(k: K, v: SlotTypeFormValues[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function setName(name: string) {
    setForm(f => ({
      ...f,
      name,
      slug: slugTouched ? f.slug : slugify(name),
    }))
  }

  return (
    <Sheet open onOpenChange={o => { if (!o) props.onCancel() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{props.mode === 'create' ? 'Neue Termin-Art' : 'Termin-Art bearbeiten'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={e => { setSlugTouched(true); setField('slug', e.target.value) }}
              placeholder="erstgespraech"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Dauer</Label>
            <div className="flex gap-2">
              {[30, 60, 240].map(min => (
                <Button
                  key={min}
                  type="button"
                  variant={form.durationMinutes === min ? 'default' : 'outline'}
                  onClick={() => setField('durationMinutes', min)}
                  size="sm"
                >
                  {min} min
                </Button>
              ))}
              <Input
                type="number"
                min={1}
                value={form.durationMinutes}
                onChange={e => setField('durationMinutes', parseInt(e.target.value) || 0)}
                className="w-24"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bb">Puffer vor (min)</Label>
              <Input id="bb" type="number" min={0} value={form.bufferBeforeMinutes}
                onChange={e => setField('bufferBeforeMinutes', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ba">Puffer nach (min)</Label>
              <Input id="ba" type="number" min={0} value={form.bufferAfterMinutes}
                onChange={e => setField('bufferAfterMinutes', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mn">Min. Vorlauf (h)</Label>
              <Input id="mn" type="number" min={0} value={form.minNoticeHours}
                onChange={e => setField('minNoticeHours', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ma">Max. Vorlauf (Tage)</Label>
              <Input id="ma" type="number" min={1} value={form.maxAdvanceDays}
                onChange={e => setField('maxAdvanceDays', parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Beschreibung (Markdown)</Label>
            <Textarea id="desc" rows={3} value={form.description ?? ''}
              onChange={e => setField('description', e.target.value || null)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="color">Farbe</Label>
              <Input id="color" type="color" value={form.color}
                onChange={e => setField('color', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc">Ort</Label>
              <select id="loc"
                value={form.location}
                onChange={e => setField('location', e.target.value as SlotTypeFormValues['location'])}
                className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm">
                <option value="phone">Telefon</option>
                <option value="video">Video</option>
                <option value="onsite">Vor Ort</option>
                <option value="custom">Sonstiges</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ld">Ort-Details</Label>
            <Input id="ld" value={form.locationDetails ?? ''}
              placeholder='z. B. „Zoom-Link wird per Mail gesendet"'
              onChange={e => setField('locationDetails', e.target.value || null)} />
          </div>

          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" checked={form.isActive}
              onChange={e => setField('isActive', e.target.checked)} />
            <Label htmlFor="active">Aktiv (auf Buchungsseite anzeigen)</Label>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={props.onCancel} disabled={props.busy}>Abbrechen</Button>
          <Button onClick={() => props.onSubmit(form)} disabled={props.busy || !form.name || !form.slug}>
            Speichern
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
