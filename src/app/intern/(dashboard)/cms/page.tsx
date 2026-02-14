'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe, Plus, Loader2, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'

interface CmsPage {
  id: string
  slug: string
  title: string
  status: string | null
  publishedAt: string | null
  updatedAt: string | null
}

export default function CmsPagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchPages = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/cms/pages')
      const data = await response.json()
      if (data.success) setPages(data.data)
    } catch (error) {
      console.error('Failed to fetch CMS pages:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  const handleCreate = async () => {
    if (!newSlug.trim() || !newTitle.trim()) return
    setCreating(true)
    try {
      const response = await fetch('/api/v1/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: newSlug.startsWith('/') ? newSlug : `/${newSlug}`,
          title: newTitle,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setShowNewDialog(false)
        setNewSlug('')
        setNewTitle('')
        fetchPages()
      }
    } catch (error) {
      console.error('Failed to create page:', error)
    } finally {
      setCreating(false)
    }
  }

  const handlePublish = async (id: string, unpublish = false) => {
    try {
      await fetch(`/api/v1/cms/pages/${id}/publish${unpublish ? '?unpublish=true' : ''}`, {
        method: 'POST',
      })
      fetchPages()
    } catch (error) {
      console.error('Failed to publish/unpublish:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Seite wirklich loeschen?')) return
    try {
      await fetch(`/api/v1/cms/pages/${id}`, { method: 'DELETE' })
      fetchPages()
    } catch (error) {
      console.error('Failed to delete page:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Globe className="h-8 w-8" />
            CMS Seiten
          </h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie die Inhalte Ihrer oeffentlichen Webseiten</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Neue Seite
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Titel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Letzte Aenderung</TableHead>
              <TableHead className="w-[200px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Noch keine CMS-Seiten vorhanden
                </TableCell>
              </TableRow>
            ) : (
              pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-mono text-sm">{page.slug}</TableCell>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell>
                    <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                      {page.status === 'published' ? 'Veroeffentlicht' : 'Entwurf'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {page.updatedAt
                      ? new Date(page.updatedAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/intern/cms/${page.id}`}>
                        <Button variant="ghost" size="icon" title="Bearbeiten">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={page.status === 'published' ? 'Zurueckziehen' : 'Veroeffentlichen'}
                        onClick={() => handlePublish(page.id, page.status === 'published')}
                      >
                        {page.status === 'published' ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Loeschen"
                        onClick={() => handleDelete(page.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Seite erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Slug (URL-Pfad)</Label>
              <Input
                placeholder="/beispiel-seite"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Seitentitel</Label>
              <Input
                placeholder="Meine Seite"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newSlug.trim() || !newTitle.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
