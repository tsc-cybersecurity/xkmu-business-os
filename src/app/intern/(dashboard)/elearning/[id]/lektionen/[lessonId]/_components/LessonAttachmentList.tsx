'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Trash2, Upload, Download } from 'lucide-react'
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
  const [err, setErr] = useState<string | null>(null)

  const docs = lesson.assets.filter((a) => a.kind === 'document')

  async function upload() {
    if (!file) return
    setBusy(true)
    setErr(null)
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
        setErr(body.error?.message ?? 'Upload fehlgeschlagen')
        return
      }
      setFile(null)
      setLabel('')
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Datei entfernen?')) return
    await fetch(`/api/v1/courses/${lesson.courseId}/assets/${id}`, {
      method: 'DELETE',
    })
    onSaved()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {docs.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between border rounded p-2"
          >
            <div>
              <div className="font-medium">{a.label ?? a.originalName}</div>
              <div className="text-xs text-muted-foreground">
                {a.originalName} · {(a.sizeBytes / 1024).toFixed(0)} KB
              </div>
            </div>
            <div className="flex gap-1">
              <Button asChild size="sm" variant="ghost">
                <a
                  href={`/api/v1/courses/assets/serve/${a.path}`}
                  download={a.originalName}
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {docs.length === 0 && (
          <div className="text-sm text-muted-foreground">Keine Anhänge</div>
        )}
      </div>

      <div className="border-t pt-4 space-y-2 max-w-xl">
        <Input
          placeholder="Anzeigename (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            type="file"
            accept=".pdf,.zip,.docx,.pptx,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button onClick={upload} disabled={!file || busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            Upload
          </Button>
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
      </div>
    </div>
  )
}
