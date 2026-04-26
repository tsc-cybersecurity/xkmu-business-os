'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { Lesson } from './LessonEditView'

export function LessonContentForm({
  lesson,
  onSaved,
}: {
  lesson: Lesson
  onSaved: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(lesson.title)
  const [slug, setSlug] = useState(lesson.slug)
  const [markdown, setMarkdown] = useState(lesson.contentMarkdown ?? '')
  const [duration, setDuration] = useState(lesson.durationMinutes ?? 0)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const res = await fetch(
        `/api/v1/courses/${lesson.courseId}/lessons/${lesson.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            slug,
            contentMarkdown: markdown,
            durationMinutes: duration || null,
          }),
        },
      )
      const body = await res.json()
      if (body.success) {
        toast.success('Lektion gespeichert')
        onSaved()
        router.refresh()
      } else {
        toast.error(body.error?.message ?? 'Speichern fehlgeschlagen')
      }
    } catch (e) {
      logger.error('Lesson save failed', e, { module: 'LessonContentForm' })
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Titel</Label>
              <Input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-slug">Slug</Label>
              <Input id="lesson-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2 sm:max-w-xs">
            <Label htmlFor="lesson-duration">Geschätzte Dauer (Minuten)</Label>
            <Input
              id="lesson-duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inhalt (Markdown)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lesson-markdown">Markdown</Label>
              <Textarea
                id="lesson-markdown"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Live-Vorschau</Label>
              <div className="prose prose-sm border rounded-md p-4 min-h-[400px] dark:prose-invert bg-muted/20">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {markdown || '*Leer*'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Speichern
        </Button>
      </div>
    </div>
  )
}
