'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import type { Lesson } from './LessonEditView'

export function LessonVideoUploader({
  lesson,
  onSaved,
}: {
  lesson: Lesson
  onSaved: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [externalUrl, setExternalUrl] = useState(lesson.videoExternalUrl ?? '')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [err, setErr] = useState<string | null>(null)

  const videoAsset = lesson.assets.find((a) => a.id === lesson.videoAssetId)

  async function upload() {
    if (!file) return
    setBusy(true)
    setErr(null)
    setProgress(0)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', 'video')
      fd.append('lessonId', lesson.id)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/v1/courses/${lesson.courseId}/assets`)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }
      const result: {
        success: boolean
        data?: { id: string }
        error?: { message: string }
      } = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch {
            reject(new Error('Invalid response'))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(fd)
      })
      if (!result.success || !result.data) {
        setErr(result.error?.message ?? 'Upload fehlgeschlagen')
        return
      }
      // Lektion mit videoAssetId verknüpfen
      await fetch(`/api/v1/courses/${lesson.courseId}/lessons/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoAssetId: result.data.id }),
      })
      onSaved()
    } catch (e) {
      logger.error('Video upload failed', e, { module: 'LessonVideoUploader' })
      setErr('Upload fehlgeschlagen')
    } finally {
      setBusy(false)
      setFile(null)
    }
  }

  async function removeVideo() {
    if (!lesson.videoAssetId || !confirm('Video entfernen?')) return
    await fetch(
      `/api/v1/courses/${lesson.courseId}/assets/${lesson.videoAssetId}`,
      { method: 'DELETE' },
    )
    await fetch(`/api/v1/courses/${lesson.courseId}/lessons/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoAssetId: null }),
    })
    onSaved()
  }

  async function saveExternalUrl() {
    setBusy(true)
    await fetch(`/api/v1/courses/${lesson.courseId}/lessons/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoExternalUrl: externalUrl || null }),
    })
    onSaved()
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-semibold mb-2">Video-Upload</h2>
        {videoAsset && (
          <div className="mb-4 space-y-2">
            <video
              controls
              className="w-full max-w-2xl rounded border"
              src={`/api/v1/courses/assets/serve/${videoAsset.path}`}
            />
            <div className="text-sm text-muted-foreground">
              {videoAsset.originalName} ·{' '}
              {(videoAsset.sizeBytes / 1024 / 1024).toFixed(1)} MB
            </div>
            <Button variant="outline" size="sm" onClick={removeVideo}>
              <Trash2 className="h-4 w-4 mr-1" />
              Video entfernen
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
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
        {busy && progress > 0 && (
          <div className="mt-2 h-2 bg-muted rounded">
            <div
              className="h-2 bg-primary rounded"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
      </section>

      <section>
        <h2 className="font-semibold mb-2">
          Alternative: externe URL (z. B. YouTube unlisted)
        </h2>
        <div className="flex gap-2 max-w-xl">
          <Input
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://..."
          />
          <Button onClick={saveExternalUrl} disabled={busy} variant="outline">
            Speichern
          </Button>
        </div>
      </section>
    </div>
  )
}
