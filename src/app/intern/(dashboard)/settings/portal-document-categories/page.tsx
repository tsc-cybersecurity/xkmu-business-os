'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Edit2, Lock, Loader2 } from 'lucide-react'

interface Cat {
  id: string; name: string; direction: string; sortOrder: number | null
  isSystem: boolean; deletedAt: string | null
}

export default function PortalDocCategoriesPage() {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Cat | null>(null)
  const [form, setForm] = useState<{ name: string; direction: string }>({ name: '', direction: 'admin_to_portal' })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/portal-document-categories')
      const data = await res.json()
      if (data?.success) setCats(data.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const grouped: Record<string, Cat[]> = { admin_to_portal: [], portal_to_admin: [], both: [] }
  for (const c of cats) grouped[c.direction]?.push(c)

  const openCreate = () => {
    setEditing(null); setForm({ name: '', direction: 'admin_to_portal' }); setDialogOpen(true)
  }
  const openEdit = (c: Cat) => {
    setEditing(c); setForm({ name: c.name, direction: c.direction }); setDialogOpen(true)
  }

  const submit = async () => {
    if (!form.name.trim()) { toast.error('Name erforderlich'); return }
    setSubmitting(true)
    try {
      if (editing) {
        const res = await fetch(`/api/v1/portal-document-categories/${editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name }),
        })
        const data = await res.json()
        if (data?.success) { toast.success('Aktualisiert'); setDialogOpen(false); load() }
        else toast.error(data?.error?.message || 'Fehler')
      } else {
        const res = await fetch(`/api/v1/portal-document-categories`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (data?.success) { toast.success('Angelegt'); setDialogOpen(false); load() }
        else toast.error(data?.error?.message || 'Fehler')
      }
    } finally { setSubmitting(false) }
  }

  const del = async (c: Cat) => {
    if (!confirm(`Kategorie "${c.name}" wirklich löschen?`)) return
    const res = await fetch(`/api/v1/portal-document-categories/${c.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data?.success) { toast.success('Gelöscht'); load() }
    else toast.error(data?.error?.message || 'Löschen fehlgeschlagen')
  }

  const renderGroup = (title: string, items: Cat[]) => (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
        <ul className="divide-y border rounded">
          {items.filter(c => !c.deletedAt).map(c => (
            <li key={c.id} className="p-3 flex items-center gap-3">
              <span className="flex-1">{c.name}</span>
              {c.isSystem && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" /> System</Badge>}
              <Button variant="ghost" size="sm" onClick={() => openEdit(c)} disabled={c.isSystem}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => del(c)} disabled={c.isSystem}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Portal-Dokumenten-Kategorien</h1>
          <p className="text-muted-foreground text-sm">Kategorien für Admin- und Kunden-Uploads im Kundenportal</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Kategorie</Button>
      </div>

      <Card><CardContent className="pt-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            {renderGroup('Admin → Kunde', grouped.admin_to_portal)}
            {renderGroup('Kunde → Admin', grouped.portal_to_admin)}
            {renderGroup('Beide Richtungen', grouped.both)}
          </>
        )}
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={100} />
            </div>
            {!editing && (
              <div className="space-y-1">
                <Label>Richtung</Label>
                <select className="w-full border rounded px-2 py-1 text-sm" value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}>
                  <option value="admin_to_portal">Admin → Kunde</option>
                  <option value="portal_to_admin">Kunde → Admin</option>
                  <option value="both">Beide Richtungen</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
