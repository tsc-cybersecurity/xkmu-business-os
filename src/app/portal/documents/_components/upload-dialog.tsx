'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Category { id: string; name: string; direction: string }

export function UploadDialog({ open, onOpenChange, onUploaded, prefillLinked }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded: () => void
  prefillLinked?: { linkedType: 'contract' | 'project' | 'order'; linkedId: string }
}) {
  const [cats, setCats] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/v1/portal/document-categories').then(r => r.json()).then(d => {
      if (d?.success) {
        setCats(d.data || [])
        if (!categoryId && d.data?.length) setCategoryId(d.data[0].id)
      }
    })
  }, [open, categoryId])

  const reset = () => { setFile(null); setNote(''); setCategoryId('') }

  const submit = async () => {
    if (!file || !categoryId) { toast.error('Datei und Kategorie wählen'); return }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('categoryId', categoryId)
      if (note) fd.append('note', note)
      if (prefillLinked) {
        fd.append('linkedType', prefillLinked.linkedType)
        fd.append('linkedId', prefillLinked.linkedId)
      }
      const res = await fetch('/api/v1/portal/me/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (data?.success) {
        toast.success('Hochgeladen')
        reset()
        onOpenChange(false)
        onUploaded()
      } else {
        toast.error(data?.error?.message || 'Upload fehlgeschlagen')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Dokument hochladen</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Kategorie</Label>
            <select className="w-full border rounded px-2 py-1 text-sm" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Datei (max. 10 MB)</Label>
            <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.md,.txt" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="space-y-1">
            <Label>Notiz (optional)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={submit} disabled={submitting || !file || !categoryId}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Hochladen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
