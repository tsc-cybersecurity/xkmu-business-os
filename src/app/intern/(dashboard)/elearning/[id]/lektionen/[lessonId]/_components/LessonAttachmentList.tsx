'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Trash2, Upload, Download, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { logger } from '@/lib/utils/logger'
import type { Lesson } from './LessonEditView'

export function LessonAttachmentList({
  lesson,
  onSaved,
}: {
  lesson: Lesson
  onSaved: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)

  const docs = lesson.assets.filter((a) => a.kind === 'document')

  async function upload() {
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', 'document')
      fd.append('lessonId', lesson.id)
      if (label) fd.append('label', label)
      const res = await fetch(`/api/v1/courses/${lesson.courseId}/assets`, {
        method: 'POST',
        body: fd,
      })
      const body = await res.json()
      if (!body.success) {
        toast.error(body.error?.message ?? 'Upload fehlgeschlagen')
        return
      }
      toast.success('Anhang hochgeladen')
      setFile(null)
      setLabel('')
      onSaved()
    } catch (e) {
      logger.error('Attachment upload failed', e, { module: 'LessonAttachmentList' })
      toast.error('Upload fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Anhang „${name}" entfernen?`)) return
    await fetch(`/api/v1/courses/${lesson.courseId}/assets/${id}`, {
      method: 'DELETE',
    })
    toast.success('Anhang entfernt')
    onSaved()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Anhänge</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <EmptyState
              icon={Paperclip}
              title="Keine Anhänge"
              description="Lade unten ein PDF oder anderes Dokument hoch, um es Lernenden zur Verfügung zu stellen."
            />
          ) : (
            <div className="space-y-2">
              {docs.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="font-medium">{a.label ?? a.originalName}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.originalName} · {(a.sizeBytes / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button asChild variant="ghost" size="icon" title="Herunterladen" aria-label="Herunterladen">
                      <a
                        href={`/api/v1/courses/assets/serve/${a.path}`}
                        download={a.originalName}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Entfernen"
                      aria-label="Entfernen"
                      onClick={() => remove(a.id, a.label ?? a.originalName)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Neuen Anhang hinzufügen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="attachment-label">Anzeigename (optional)</Label>
            <Input
              id="attachment-label"
              placeholder="z. B. Übungsaufgaben"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachment-file">Datei (PDF, ZIP, DOCX, PPTX, XLSX)</Label>
            <div className="flex gap-2">
              <Input
                id="attachment-file"
                type="file"
                accept=".pdf,.zip,.docx,.pptx,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button onClick={upload} disabled={!file || busy}>
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
