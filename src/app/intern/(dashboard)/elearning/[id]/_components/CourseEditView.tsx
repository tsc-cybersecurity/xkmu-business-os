'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { CourseStammdatenForm } from '../../_components/CourseStammdatenForm'
import { CourseContentTree } from './CourseContentTree'

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
        {/* Publish-Button kommt in Task 22 */}
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
    </div>
  )
}
