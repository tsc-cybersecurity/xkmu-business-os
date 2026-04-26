'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { LessonContentForm } from './LessonContentForm'

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

  if (loading) {
    return (
      <div className="p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  if (!lesson) return <div className="p-6">Lektion nicht gefunden</div>

  return (
    <div className="space-y-6 p-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/intern/elearning/${courseId}`}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Zurück zum Kurs
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold">{lesson.title}</h1>

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
          <p className="text-muted-foreground">Video-Tab kommt in Task 20.</p>
        </TabsContent>
        <TabsContent value="anhaenge" className="mt-6">
          <p className="text-muted-foreground">Anhänge-Tab kommt in Task 21.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
