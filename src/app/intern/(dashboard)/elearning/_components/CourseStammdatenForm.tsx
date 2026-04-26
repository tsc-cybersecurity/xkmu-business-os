'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

export interface CourseInitial {
  id?: string
  title?: string
  slug?: string
  subtitle?: string | null
  description?: string | null
  visibility?: string
  useModules?: boolean
  enforceSequential?: boolean
  estimatedMinutes?: number | null
  coverImageId?: string | null
}

export function CourseStammdatenForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit'
  initial?: CourseInitial
}) {
  const router = useRouter()
  const [data, setData] = useState<CourseInitial>(
    initial ?? { title: '', visibility: 'portal' },
  )
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      const url = mode === 'create' ? '/api/v1/courses' : `/api/v1/courses/${initial?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await res.json()
      if (!body.success) {
        toast.error(body.error?.message ?? 'Speichern fehlgeschlagen')
        return
      }
      if (mode === 'create') {
        toast.success('Kurs angelegt')
        router.push(`/intern/elearning/${body.data.id}`)
      } else {
        toast.success('Stammdaten gespeichert')
        router.refresh()
      }
    } catch (e) {
      logger.error('Course save failed', e, { module: 'CourseStammdatenForm' })
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={data.title ?? ''}
                onChange={(e) => setData({ ...data, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (optional, sonst aus Titel)</Label>
              <Input
                id="slug"
                value={data.slug ?? ''}
                onChange={(e) => setData({ ...data, slug: e.target.value })}
                placeholder="kurs-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Untertitel</Label>
            <Input
              id="subtitle"
              value={data.subtitle ?? ''}
              onChange={(e) => setData({ ...data, subtitle: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung (Markdown)</Label>
            <Textarea
              id="description"
              value={data.description ?? ''}
              rows={4}
              onChange={(e) => setData({ ...data, description: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Veröffentlichung &amp; Struktur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Sichtbarkeit</Label>
              <Select
                value={data.visibility ?? 'portal'}
                onValueChange={(v) => setData({ ...data, visibility: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="portal">Portal</SelectItem>
                  <SelectItem value="both">Beides</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedMinutes">Geschätzte Dauer (Minuten)</Label>
              <Input
                id="estimatedMinutes"
                type="number"
                value={data.estimatedMinutes ?? ''}
                onChange={(e) =>
                  setData({
                    ...data,
                    estimatedMinutes: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="useModules"
              checked={!!data.useModules}
              onCheckedChange={(v) => setData({ ...data, useModules: v === true })}
            />
            <Label htmlFor="useModules" className="font-normal">
              Module verwenden — Lektionen in Modul-Gruppen organisieren
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="enforceSequential"
              checked={!!data.enforceSequential}
              onCheckedChange={(v) => setData({ ...data, enforceSequential: v === true })}
            />
            <Label htmlFor="enforceSequential" className="font-normal">
              Lektionen sequenziell erzwingen — Player schaltet erst nach Abschluss der vorigen Lektion frei
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy || !data.title}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {mode === 'create' ? 'Anlegen' : 'Speichern'}
        </Button>
      </div>
    </div>
  )
}
