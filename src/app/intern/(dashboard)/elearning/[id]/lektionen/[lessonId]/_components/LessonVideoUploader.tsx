'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
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

  const videoAsset = lesson.assets.find((a) => a.id === lesson.videoAssetId)

  async function upload() {
    if (!file) return
    setBusy(true)
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
        toast.error(result.error?.message ?? 'Upload fehlgeschlagen')
        return
      }
      await fetch(`/api/v1/courses/${lesson.courseId}/lessons/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoAssetId: result.data.id }),
      })
      toast.success('Video hochgeladen')
      onSaved()
    } catch (e) {
      logger.error('Video upload failed', e, { module: 'LessonVideoUploader' })
      toast.error('Upload fehlgeschlagen')
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
    toast.success('Video entfernt')
    onSaved()
  }

  async function saveExternalUrl() {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/courses/${lesson.courseId}/lessons/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoExternalUrl: externalUrl || null }),
      })
      const body = await res.json()
      if (body.success) {
        toast.success('Externe Video-URL gespeichert')
        onSaved()
      } else {
        toast.error(body.error?.message ?? 'Speichern fehlgeschlagen')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Video-Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {videoAsset && (
            <div className="space-y-2">
              <video
                controls
                className="w-full max-w-2xl rounded-md border"
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
          <div className="space-y-2">
            <Label htmlFor="video-file">Neues Video hochladen (MP4, WebM, MOV)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="video-file"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
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
            {busy && progress > 0 && (
              <div className="space-y-1">
                <Progress value={progress} />
                <div className="text-xs text-muted-foreground">{progress}%</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Externe Video-URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="video-url">
            Alternative zum Upload — z. B. YouTube unlisted oder Vimeo
          </Label>
          <div className="flex gap-2 max-w-xl">
            <Input
              id="video-url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://..."
            />
            <Button onClick={saveExternalUrl} disabled={busy} variant="outline">
              Speichern
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
