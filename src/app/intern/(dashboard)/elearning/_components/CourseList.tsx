'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GraduationCap, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { EmptyState } from '@/components/shared/empty-state'
import { logger } from '@/lib/utils/logger'

interface Course {
  id: string
  title: string
  slug: string
  status: string
  visibility: string
  updatedAt: string
}

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
}

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  published: 'Veröffentlicht',
  archived: 'Archiviert',
}

const visibilityLabels: Record<string, string> = {
  public: 'Public',
  portal: 'Portal',
  both: 'Beides',
}

const ALL = '__all__'

export function CourseList() {
  const [items, setItems] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>(ALL)
  const [visibility, setVisibility] = useState<string>(ALL)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status && status !== ALL) params.set('status', status)
      if (visibility && visibility !== ALL) params.set('visibility', visibility)
      const res = await fetch(`/api/v1/courses?${params.toString()}`)
      const body = await res.json()
      if (body.success) setItems(body.data)
    } catch (err) {
      logger.error('CourseList load failed', err, { module: 'CourseList' })
    } finally {
      setLoading(false)
    }
  }, [q, status, visibility])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Kurs „${title}" wirklich löschen? Diese Aktion ist nicht umkehrbar.`)) return
    try {
      const res = await fetch(`/api/v1/courses/${id}`, { method: 'DELETE' })
      const body = await res.json()
      if (body.success) {
        toast.success('Kurs gelöscht')
        await load()
      } else {
        toast.error(body.error?.message ?? 'Löschen fehlgeschlagen')
      }
    } catch (err) {
      logger.error('Course delete failed', err, { module: 'CourseList' })
      toast.error('Löschen fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="h-8 w-8" />
            Onlinekurse
          </h1>
          <p className="text-muted-foreground mt-1">
            Kurse anlegen, strukturieren und veröffentlichen
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/intern/elearning/new">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Kurs
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Suche nach Titel…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle Status</SelectItem>
            <SelectItem value="draft">Entwurf</SelectItem>
            <SelectItem value="published">Veröffentlicht</SelectItem>
            <SelectItem value="archived">Archiviert</SelectItem>
          </SelectContent>
        </Select>
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sichtbarkeit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle Sichtbarkeiten</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="portal">Portal</SelectItem>
            <SelectItem value="both">Beides</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Noch keine Kurse"
          description="Lege deinen ersten Onlinekurs an, um Inhalte für Kunden oder die Öffentlichkeit zu erstellen."
          action={
            <Button asChild>
              <Link href="/intern/elearning/new">
                <Plus className="mr-2 h-4 w-4" />
                Neuer Kurs
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sichtbarkeit</TableHead>
                <TableHead>Letzte Änderung</TableHead>
                <TableHead className="w-[120px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[c.status] ?? 'secondary'}>
                      {statusLabels[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{visibilityLabels[c.visibility] ?? c.visibility}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.updatedAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button asChild variant="ghost" size="icon" title="Bearbeiten" aria-label="Bearbeiten">
                        <Link href={`/intern/elearning/${c.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Löschen"
                        aria-label="Löschen"
                        onClick={() => handleDelete(c.id, c.title)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
