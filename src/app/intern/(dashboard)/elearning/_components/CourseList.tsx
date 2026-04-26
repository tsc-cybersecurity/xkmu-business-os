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
import { GraduationCap, Plus, Loader2, Pencil } from 'lucide-react'
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <GraduationCap className="h-6 w-6" /> Onlinekurse
        </h1>
        <Button asChild>
          <Link href="/intern/elearning/new">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Kurs
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Suche…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="portal">Portal</SelectItem>
            <SelectItem value="both">Beides</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Geändert</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.title}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[c.status] ?? 'secondary'}>{c.status}</Badge>
                </TableCell>
                <TableCell>{c.visibility}</TableCell>
                <TableCell>{new Date(c.updatedAt).toLocaleString('de-DE')}</TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/intern/elearning/${c.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Keine Kurse
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
