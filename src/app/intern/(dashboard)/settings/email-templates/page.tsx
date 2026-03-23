'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Mail, Loader2, Plus, Pencil, Trash2, Upload, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface EmailTemplate {
  id: string
  slug: string
  name: string
  subject: string
  bodyHtml: string
  placeholders: Array<{ key: string; label: string; description: string }>
  isActive: boolean
  createdAt: string
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialog, setEditDialog] = useState<EmailTemplate | null>(null)
  const [previewDialog, setPreviewDialog] = useState<EmailTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/email-templates')
      const data = await response.json()
      if (data.success) setTemplates(data.data)
    } catch {
      toast.error('Templates konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const openEdit = (tpl: EmailTemplate | null) => {
    if (tpl) {
      setEditName(tpl.name)
      setEditSlug(tpl.slug)
      setEditSubject(tpl.subject)
      setEditBody(tpl.bodyHtml)
    } else {
      setEditName('')
      setEditSlug('')
      setEditSubject('')
      setEditBody('')
    }
    setEditDialog(tpl || { id: 'new' } as EmailTemplate)
  }

  const saveTemplate = async () => {
    setSaving(true)
    try {
      const isNew = editDialog?.id === 'new'
      const url = isNew ? '/api/v1/email-templates' : `/api/v1/email-templates/${editDialog?.id}`
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: editSlug, name: editName, subject: editSubject, bodyHtml: editBody,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(isNew ? 'Template erstellt' : 'Template gespeichert')
        setEditDialog(null)
        fetchTemplates()
      } else {
        toast.error('Speichern fehlgeschlagen')
      }
    } catch {
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Template wirklich loeschen?')) return
    await fetch(`/api/v1/email-templates/${id}`, { method: 'DELETE' })
    fetchTemplates()
  }

  const seedTemplates = async () => {
    const response = await fetch('/api/v1/email-templates/seed', { method: 'POST' })
    const data = await response.json()
    if (data.success) {
      toast.success(`${data.data.created} Templates importiert`)
      fetchTemplates()
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Mail className="h-8 w-8" />
            E-Mail-Vorlagen
          </h1>
          <p className="text-muted-foreground mt-1">Templates fuer automatisierte E-Mails</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button variant="outline" onClick={seedTemplates}>
              <Upload className="h-4 w-4 mr-2" />Standard-Templates laden
            </Button>
          )}
          <Button onClick={() => openEdit(null)}>
            <Plus className="h-4 w-4 mr-2" />Neues Template
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Betreff</TableHead>
              <TableHead>Platzhalter</TableHead>
              <TableHead className="w-[120px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Keine Templates vorhanden. Standard-Templates laden?
                </TableCell>
              </TableRow>
            ) : templates.map(tpl => (
              <TableRow key={tpl.id}>
                <TableCell><Badge variant="outline" className="font-mono text-xs">{tpl.slug}</Badge></TableCell>
                <TableCell className="font-medium">{tpl.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">{tpl.subject}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {tpl.placeholders?.map((p: { key: string }) => p.key).join(', ') || '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewDialog(tpl)} title="Vorschau">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tpl)} title="Bearbeiten">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTemplate(tpl.id)} title="Loeschen">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={open => { if (!open) setEditDialog(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editDialog?.id === 'new' ? 'Neues Template' : 'Template bearbeiten'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input value={editSlug} onChange={e => setEditSlug(e.target.value)} placeholder="z.B. welcome" className="font-mono" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="z.B. Willkommens-E-Mail" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Betreff <span className="text-muted-foreground">(mit {'{{platzhalter}}'})</span></label>
              <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">HTML-Body <span className="text-muted-foreground">(mit {'{{platzhalter}}'})</span></label>
              <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={12} className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Abbrechen</Button>
            <Button onClick={saveTemplate} disabled={saving || !editSlug || !editName || !editSubject}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewDialog} onOpenChange={open => { if (!open) setPreviewDialog(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vorschau: {previewDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm"><strong>Betreff:</strong> {previewDialog?.subject}</div>
            <div className="border rounded p-4 bg-white dark:bg-gray-950">
              <div dangerouslySetInnerHTML={{ __html: previewDialog?.bodyHtml || '' }} className="text-sm" />
            </div>
            {previewDialog?.placeholders && previewDialog.placeholders.length > 0 && (
              <div>
                <strong className="text-sm">Platzhalter:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {previewDialog.placeholders.map((p: { key: string; label: string }) => (
                    <Badge key={p.key} variant="secondary" className="text-xs">{'{{' + p.key + '}}'} = {p.label}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
