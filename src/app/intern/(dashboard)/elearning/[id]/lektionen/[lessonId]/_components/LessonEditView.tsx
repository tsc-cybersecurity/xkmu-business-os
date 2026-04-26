'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, FileText } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { LessonContentForm } from './LessonContentForm'
import { LessonVideoUploader } from './LessonVideoUploader'
import { LessonAttachmentList } from './LessonAttachmentList'

export interface LessonAsset {
  id: string
  kind: string
  originalName: string
  label: string | null
  sizeBytes: number
  path: string
  mimeType: string
}

export interface Lesson {
  id: string
  courseId: string
  title: string
  slug: string
  moduleId: string | null
  contentMarkdown: string | null
  videoAssetId: string | null
  videoExternalUrl: string | null
  durationMinutes: number | null
  assets: LessonAsset[]
}

export function LessonEditView({
  courseId,
  lessonId,
}: {
  courseId: string
  lessonId: string
}) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}`)
    const body = await res.json()
    if (body.success) setLesson(body.data)
    setLoading(false)
  }, [courseId, lessonId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <LoadingSpinner />
  if (!lesson) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/intern/elearning/${courseId}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Zurück zum Kurs
          </Link>
        </Button>
        <p className="text-muted-foreground">Lektion nicht gefunden.</p>
      </div>
    )
  }

  const docCount = lesson.assets.filter((a) => a.kind === 'document').length
  const hasVideo = !!lesson.videoAssetId || !!lesson.videoExternalUrl

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href={`/intern/elearning/${courseId}`}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Zurück zum Kurs
        </Link>
      </Button>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="h-8 w-8" />
          {lesson.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          {hasVideo && <Badge variant="outline">Video</Badge>}
          {docCount > 0 && (
            <Badge variant="outline">
              {docCount} Anhang{docCount === 1 ? '' : 'e'}
            </Badge>
          )}
          {lesson.durationMinutes != null && (
            <Badge variant="outline">{lesson.durationMinutes} Min</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="inhalt">
        <TabsList>
          <TabsTrigger value="inhalt">Inhalt</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
          <TabsTrigger value="anhaenge">Anhänge</TabsTrigger>
        </TabsList>
        <TabsContent value="inhalt" className="mt-6">
          <LessonContentForm lesson={lesson} onSaved={load} />
        </TabsContent>
        <TabsContent value="video" className="mt-6">
          <LessonVideoUploader lesson={lesson} onSaved={load} />
        </TabsContent>
        <TabsContent value="anhaenge" className="mt-6">
          <LessonAttachmentList lesson={lesson} onSaved={load} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
