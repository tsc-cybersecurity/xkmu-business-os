'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { CourseStammdatenForm } from '../../_components/CourseStammdatenForm'
import { CourseContentTree } from './CourseContentTree'
import {
  PublishValidationDialog,
  type PublishProblem,
} from './PublishValidationDialog'

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

export function CourseEditView({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [problems, setProblems] = useState<PublishProblem[]>([])
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/v1/courses/${courseId}`)
    const body = await res.json()
    if (body.success) setCourse(body.data)
    setLoading(false)
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
      if (body.success) await load()
    } finally {
      setPublishing(false)
    }
  }

  async function unpublish() {
    await fetch(`/api/v1/courses/${courseId}/unpublish`, { method: 'POST' })
    await load()
  }

  async function archive() {
    if (!confirm('Kurs archivieren?')) return
    await fetch(`/api/v1/courses/${courseId}/archive`, { method: 'POST' })
    await load()
  }

  if (loading) {
    return (
      <div className="p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  if (!course) return <div className="p-6">Kurs nicht gefunden</div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <div className="mt-1 flex gap-2 text-sm text-muted-foreground">
            <Badge variant={statusVariant[course.status] ?? 'secondary'}>
              {course.status}
            </Badge>
            <Badge variant="outline">{course.visibility}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {course.status === 'draft' && (
            <Button onClick={publish} disabled={publishing}>
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Veröffentlichen
            </Button>
          )}
          {course.status === 'published' && (
            <>
              <Button onClick={unpublish} variant="outline">
                Zurück zu Draft
              </Button>
              <Button onClick={archive} variant="outline">
                Archivieren
              </Button>
            </>
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
        <TabsContent value="vorschau" className="mt-6">
          <p className="text-muted-foreground">Vorschau kommt in Task 23.</p>
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
