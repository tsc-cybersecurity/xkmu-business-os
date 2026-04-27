'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, GraduationCap, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { CourseStammdatenForm } from '../../_components/CourseStammdatenForm'
import { CourseContentTree } from './CourseContentTree'
import {
  PublishValidationDialog,
  type PublishProblem,
} from './PublishValidationDialog'
import { CoursePreview, type PreviewLesson } from './CoursePreview'
import { logger } from '@/lib/utils/logger'

export interface CourseModule {
  id: string
  title: string
  position: number
}

export interface CourseLesson {
  id: string
  title: string
  slug: string
  position: number
  moduleId: string | null
}

export interface Course {
  id: string
  title: string
  slug: string
  subtitle: string | null
  description: string | null
  status: string
  visibility: string
  useModules: boolean
  enforceSequential: boolean
  estimatedMinutes: number | null
  coverImageId: string | null
  modules: CourseModule[]
  lessons: CourseLesson[]
}

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
}

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  published: 'Veröffentlicht',
  archived: 'Archiviert',
}

const visibilityLabels: Record<string, string> = {
  public: 'Public',
  portal: 'Portal',
  both: 'Beides',
}

export function CourseEditView({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [problems, setProblems] = useState<PublishProblem[]>([])
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [previewLessons, setPreviewLessons] = useState<PreviewLesson[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/courses/${courseId}`)
      const body = await res.json()
      if (body.success) setCourse(body.data)
    } catch (err) {
      logger.error('Course load failed', err, { module: 'CourseEditView' })
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void load()
  }, [load])

  async function publish() {
    setPublishing(true)
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/publish`, { method: 'POST' })
      const body = await res.json()
      if (res.status === 422) {
        setProblems(body.error?.details ?? [])
        setPublishOpen(true)
        return
      }
      if (body.success) {
        toast.success('Kurs veröffentlicht')
        await load()
      } else {
        toast.error(body.error?.message ?? 'Veröffentlichen fehlgeschlagen')
      }
    } finally {
      setPublishing(false)
    }
  }

  async function unpublish() {
    const res = await fetch(`/api/v1/courses/${courseId}/unpublish`, { method: 'POST' })
    const body = await res.json()
    if (body.success) {
      toast.success('Kurs auf Entwurf zurückgesetzt')
      await load()
    } else {
      toast.error(body.error?.message ?? 'Unpublish fehlgeschlagen')
    }
  }

  async function archive() {
    if (!confirm('Kurs archivieren? Er ist danach nicht mehr für Konsumenten sichtbar.')) return
    const res = await fetch(`/api/v1/courses/${courseId}/archive`, { method: 'POST' })
    const body = await res.json()
    if (body.success) {
      toast.success('Kurs archiviert')
      await load()
    } else {
      toast.error(body.error?.message ?? 'Archivieren fehlgeschlagen')
    }
  }

  async function restore() {
    const res = await fetch(`/api/v1/courses/${courseId}/restore`, { method: 'POST' })
    const body = await res.json()
    if (body.success) {
      toast.success('Kurs wiederhergestellt (Entwurf)')
      await load()
    } else {
      toast.error(body.error?.message ?? 'Wiederherstellen fehlgeschlagen')
    }
  }

  const loadPreview = useCallback(async () => {
    if (!course) return
    setPreviewLoading(true)
    try {
      const detailed = await Promise.all(
        course.lessons.map(async (l): Promise<PreviewLesson | null> => {
          const [lessonRes, blocksRes] = await Promise.all([
            fetch(`/api/v1/courses/${courseId}/lessons/${l.id}`).then((r) => r.json()),
            fetch(`/api/v1/courses/${courseId}/lessons/${l.id}/blocks`).then((r) => r.json()),
          ])
          if (!lessonRes?.data) return null
          return {
            ...(lessonRes.data as PreviewLesson),
            blocks: blocksRes?.success ? blocksRes.data : [],
          }
        }),
      )
      setPreviewLessons(detailed.filter((x): x is PreviewLesson => x !== null))
    } finally {
      setPreviewLoading(false)
    }
  }, [course, courseId])

  if (loading) return <LoadingSpinner />
  if (!course) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/intern/elearning">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Zurück zur Liste
          </Link>
        </Button>
        <p className="text-muted-foreground">Kurs nicht gefunden.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/intern/elearning">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Zurück zur Liste
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="h-8 w-8" />
            {course.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant[course.status] ?? 'secondary'}>
              {statusLabels[course.status] ?? course.status}
            </Badge>
            <Badge variant="outline">{visibilityLabels[course.visibility] ?? course.visibility}</Badge>
            {course.useModules && <Badge variant="outline">Module</Badge>}
            {course.enforceSequential && <Badge variant="outline">Sequenziell</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          {course.status === 'draft' && (
            <Button onClick={publish} disabled={publishing}>
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Veröffentlichen
            </Button>
          )}
          {course.status === 'published' && (
            <>
              <Button onClick={unpublish} variant="outline">
                Zurück zu Entwurf
              </Button>
              <Button onClick={archive} variant="outline">
                Archivieren
              </Button>
            </>
          )}
          {course.status === 'archived' && (
            <Button onClick={restore} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Wiederherstellen
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="stammdaten">
        <TabsList>
          <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
          <TabsTrigger value="inhalt">Inhalt</TabsTrigger>
          <TabsTrigger value="vorschau">Vorschau</TabsTrigger>
        </TabsList>

        <TabsContent value="stammdaten" className="mt-6">
          <CourseStammdatenForm mode="edit" initial={course} />
        </TabsContent>

        <TabsContent value="inhalt" className="mt-6">
          <CourseContentTree
            courseId={course.id}
            useModules={course.useModules}
            modules={course.modules}
            lessons={course.lessons}
            onChange={load}
          />
        </TabsContent>

        <TabsContent value="vorschau" className="mt-6 space-y-4">
          <Button
            onClick={loadPreview}
            variant="outline"
            size="sm"
            disabled={previewLoading}
          >
            {previewLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vorschau aktualisieren
          </Button>
          {previewLessons.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <CoursePreview
                  course={{ ...course, lessons: previewLessons }}
                  lessonAssets={Object.fromEntries(
                    previewLessons.flatMap((l) =>
                      (l.assets ?? []).map((a) => [a.id, a]),
                    ),
                  )}
                />
              </CardContent>
            </Card>
          ) : (
            !previewLoading && (
              <p className="text-muted-foreground text-sm">
                Klick „Vorschau aktualisieren", um den Kurs so zu sehen, wie ihn Konsumenten sehen würden.
              </p>
            )
          )}
        </TabsContent>
      </Tabs>

      <PublishValidationDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        problems={problems}
      />
    </div>
  )
}
