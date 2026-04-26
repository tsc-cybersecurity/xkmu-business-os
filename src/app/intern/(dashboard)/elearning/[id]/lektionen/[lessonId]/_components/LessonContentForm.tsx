'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
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
        onSaved()
        router.refresh()
      }
    } catch (e) {
      logger.error('Lesson save failed', e, { module: 'LessonContentForm' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Titel</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Geschätzte Dauer (Minuten)</Label>
        <Input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="max-w-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Markdown</Label>
          <Textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={20}
            className="font-mono text-sm"
          />
        </div>
        <div>
          <Label>Vorschau</Label>
          <div className="prose prose-sm border rounded p-4 min-h-[400px] dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown || '*Leer*'}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Speichern
      </Button>
    </div>
  )
}
