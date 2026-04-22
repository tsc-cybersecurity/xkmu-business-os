'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil, Trash2, FolderTree } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  color: string | null
  sortOrder: number | null
  isActive: boolean | null
  createdAt: string
  updatedAt: string
}

interface FormState {
  name: string
  slug: string
  description: string
  color: string
  sortOrder: number
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  description: '',
  color: '',
  sortOrder: 0,
  isActive: true,
}

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BlogCategory | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/blog-categories')
      const data = await res.json()
      if (data?.success) setCategories(data.data || [])
    } catch (e) {
      logger.error('Failed to load blog categories', e, { module: 'BlogCategoriesPage' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (c: BlogCategory) => {
    setEditingId(c.id)
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      color: c.color || '',
      sortOrder: c.sortOrder ?? 0,
      isActive: c.isActive !== false,
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description || null,
        color: form.color || null,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      }
      const res = editingId
        ? await fetch(`/api/v1/blog-categories/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/v1/blog-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data?.success) {
        toast.success(editingId ? 'Kategorie aktualisiert' : 'Kategorie erstellt')
        setDialogOpen(false)
        load()
      } else {
        toast.error(data?.error?.message || 'Speichern fehlgeschlagen')
      }
    } catch (e) {
      logger.error('save blog category failed', e, { module: 'BlogCategoriesPage' })
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/v1/blog-categories/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data?.success) {
        toast.success('Kategorie gelöscht')
        setCategories(prev => prev.filter(c => c.id !== deleteTarget.id))
      } else {
        toast.error(data?.error?.message || 'Löschen fehlgeschlagen')
      }
    } catch {
      toast.error('Löschen fehlgeschlagen')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-muted-foreground" />
            Blog-Kategorien
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verwalte die Kategorien, die in Blog-Beiträgen und der Blog-Anzeige zur Auswahl stehen.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Neue Kategorie
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Laden...
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Noch keine Kategorien angelegt.
            </div>
          ) : (
            <div className="divide-y">
              {categories.map(c => (
                <div key={c.id} className="p-4 flex items-start gap-4 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{c.name}</div>
                      {!c.isActive && <Badge variant="secondary">Inaktiv</Badge>}
                      <Badge variant="outline" className="font-mono text-xs">{c.slug}</Badge>
                    </div>
                    {c.description && <div className="text-sm text-muted-foreground mt-0.5">{c.description}</div>}
                    <div className="text-xs text-muted-foreground mt-1">Sortierung: {c.sortOrder ?? 0}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bc-name">Name *</Label>
              <Input id="bc-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. IT-News" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bc-slug">Slug (optional, wird sonst automatisch generiert)</Label>
              <Input id="bc-slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="it-news" className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bc-desc">Beschreibung</Label>
              <Textarea id="bc-desc" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bc-color">Farbe (z.B. blue, emerald, hex)</Label>
                <Input id="bc-color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="blue" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bc-sort">Sortierung</Label>
                <Input id="bc-sort" type="number" min={0} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="bc-active" checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: !!v })} />
              <Label htmlFor="bc-active" className="cursor-pointer">Aktiv (zur Auswahl verfügbar)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Kategorie löschen"
        description={`"${deleteTarget?.name}" wirklich löschen? Bestehende Blog-Beiträge behalten ihren Kategorie-Namen, verlieren aber die Verknüpfung.`}
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
