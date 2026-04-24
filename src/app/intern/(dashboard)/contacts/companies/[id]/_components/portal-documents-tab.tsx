'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, Plus, Download, Trash2 } from 'lucide-react'

interface Category { id: string; name: string; direction: string }
interface Doc {
  id: string; fileName: string; sizeBytes: number; mimeType: string;
  direction: 'admin_to_portal' | 'portal_to_admin'; categoryId: string
  linkedType: string | null; linkedId: string | null
  uploadedByUserId: string | null; uploaderRole: string; note: string | null
  deletedAt: string | null; createdAt: string
}

interface Props { companyId: string }

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function PortalDocumentsTab({ companyId }: Props) {
  const [room, setRoom] = useState<'admin_to_portal' | 'portal_to_admin'>('admin_to_portal')
  const [docs, setDocs] = useState<Doc[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [form, setForm] = useState<{ file: File | null; categoryId: string; note: string }>({
    file: null, categoryId: '', note: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ direction: room, includeDeleted: String(showDeleted) })
      const [docsRes, catsRes] = await Promise.all([
        fetch(`/api/v1/companies/${companyId}/portal-documents?${qs}`).then(r => r.json()),
        fetch(`/api/v1/portal-document-categories`).then(r => r.json()),
      ])
      if (docsRes?.success) setDocs(docsRes.data || [])
      if (catsRes?.success) setCats(catsRes.data || [])
    } finally {
      setLoading(false)
    }
  }, [companyId, room, showDeleted])

  useEffect(() => { load() }, [load])

  const catName = (id: string) => cats.find(c => c.id === id)?.name || '—'

  const submit = async () => {
    if (!form.file || !form.categoryId) { toast.error('Datei und Kategorie wählen'); return }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('file', form.file)
      fd.append('categoryId', form.categoryId)
      if (form.note) fd.append('note', form.note)
      const res = await fetch(`/api/v1/companies/${companyId}/portal-documents`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data?.success) {
        toast.success('Hochgeladen')
        setUploadOpen(false)
        setForm({ file: null, categoryId: '', note: '' })
        load()
      } else {
        toast.error(data?.error?.message || 'Upload fehlgeschlagen')
      }
    } finally { setSubmitting(false) }
  }

  const del = async (docId: string) => {
    if (!confirm('Dokument wirklich löschen?')) return
    const res = await fetch(`/api/v1/companies/${companyId}/portal-documents/${docId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data?.success) { toast.success('Gelöscht'); load() }
    else toast.error(data?.error?.message || 'Löschen fehlgeschlagen')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Portal-Dokumente</CardTitle>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              id="show-deleted"
              checked={showDeleted}
              onCheckedChange={(checked) => setShowDeleted(checked === true)}
            />
            <Label htmlFor="show-deleted">Gelöschte anzeigen</Label>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Hochladen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={room} onValueChange={v => setRoom(v as 'admin_to_portal' | 'portal_to_admin')}>
          <TabsList>
            <TabsTrigger value="admin_to_portal">An Kunde</TabsTrigger>
            <TabsTrigger value="portal_to_admin">Vom Kunden</TabsTrigger>
          </TabsList>

          {(['admin_to_portal', 'portal_to_admin'] as const).map(r => (
            <TabsContent key={r} value={r} className="mt-4">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Dokumente.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground uppercase border-b">
                    <tr>
                      <th className="py-2">Name</th>
                      <th>Kategorie</th>
                      <th>Verknüpft</th>
                      <th>Hochgeladen</th>
                      <th>Größe</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {docs.map(d => (
                      <tr key={d.id} className={d.deletedAt ? 'opacity-50' : ''}>
                        <td className="py-2 font-medium">
                          {d.fileName}
                          {d.deletedAt && <Badge variant="secondary" className="ml-2">Gelöscht</Badge>}
                        </td>
                        <td>{catName(d.categoryId)}</td>
                        <td>{d.linkedType ? `${d.linkedType}:${String(d.linkedId).slice(0, 8)}…` : '—'}</td>
                        <td className="whitespace-nowrap">{new Date(d.createdAt).toLocaleString('de-DE')}</td>
                        <td>{formatBytes(d.sizeBytes)}</td>
                        <td className="text-right">
                          <a href={`/api/v1/companies/${companyId}/portal-documents/${d.id}/download`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                          </a>
                          {!d.deletedAt && (
                            <Button variant="ghost" size="sm" onClick={() => del(d.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dokument an Kunde hochladen</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Kategorie</Label>
              <select className="w-full border rounded px-2 py-1 text-sm" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">—</option>
                {cats.filter(c => c.direction === 'admin_to_portal' || c.direction === 'both').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Datei (max. 10 MB)</Label>
              <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.md,.txt" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} />
            </div>
            <div className="space-y-1">
              <Label>Notiz (optional)</Label>
              <Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} maxLength={500} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>Abbrechen</Button>
            <Button onClick={submit} disabled={submitting || !form.file || !form.categoryId}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hochladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
