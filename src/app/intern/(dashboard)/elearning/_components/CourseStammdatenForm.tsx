'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
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
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setErr(null)
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
        setErr(body.error?.message ?? 'Fehler')
        return
      }
      if (mode === 'create') router.push(`/intern/elearning/${body.data.id}`)
      else router.refresh()
    } catch (e) {
      logger.error('Course save failed', e, { module: 'CourseStammdatenForm' })
      setErr('Speichern fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <Label>Titel *</Label>
        <Input
          value={data.title ?? ''}
          onChange={(e) => setData({ ...data, title: e.target.value })}
        />
      </div>
      <div>
        <Label>Slug (optional, sonst aus Titel)</Label>
        <Input
          value={data.slug ?? ''}
          onChange={(e) => setData({ ...data, slug: e.target.value })}
        />
      </div>
      <div>
        <Label>Untertitel</Label>
        <Input
          value={data.subtitle ?? ''}
          onChange={(e) => setData({ ...data, subtitle: e.target.value })}
        />
      </div>
      <div>
        <Label>Beschreibung (Markdown)</Label>
        <Textarea
          value={data.description ?? ''}
          rows={4}
          onChange={(e) => setData({ ...data, description: e.target.value })}
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
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
        <div className="flex-1">
          <Label>Geschätzte Dauer (Minuten)</Label>
          <Input
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
        <Label htmlFor="useModules">Module verwenden</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="enforceSequential"
          checked={!!data.enforceSequential}
          onCheckedChange={(v) => setData({ ...data, enforceSequential: v === true })}
        />
        <Label htmlFor="enforceSequential">Lektionen sequenziell erzwingen</Label>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy || !data.title}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Anlegen' : 'Speichern'}
        </Button>
      </div>
    </div>
  )
}
