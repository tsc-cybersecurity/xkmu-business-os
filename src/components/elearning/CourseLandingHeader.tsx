import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play } from 'lucide-react'
import type { Course, CourseLesson, CourseModule } from '@/lib/db/schema'

interface Props {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  basePath: '/kurse' | '/portal/kurse'
}

function findFirstLessonSlug(lessons: CourseLesson[], modules: CourseModule[]): string | null {
  if (lessons.length === 0) return null
  if (modules.length === 0) {
    const sorted = [...lessons].sort((a, b) => a.position - b.position)
    return sorted[0].slug
  }
  const sortedModules = [...modules].sort((a, b) => a.position - b.position)
  for (const m of sortedModules) {
    const inMod = lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.position - b.position)
    if (inMod.length > 0) return inMod[0].slug
  }
  const orphan = lessons.filter((l) => !l.moduleId).sort((a, b) => a.position - b.position)
  return orphan[0]?.slug ?? null
}

export function CourseLandingHeader({ course, modules, lessons, basePath }: Props) {
  const firstSlug = findFirstLessonSlug(lessons, modules)
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {course.estimatedMinutes != null && (
          <Badge variant="outline">{course.estimatedMinutes} Min</Badge>
        )}
        <Badge variant="outline">{lessons.length} Lektion{lessons.length === 1 ? '' : 'en'}</Badge>
        {course.useModules && <Badge variant="outline">{modules.length} Module</Badge>}
      </div>
      <h1 className="text-3xl font-bold sm:text-4xl">{course.title}</h1>
      {course.subtitle && <p className="text-lg text-muted-foreground">{course.subtitle}</p>}
      {course.description && (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{course.description}</ReactMarkdown>
        </div>
      )}
      {firstSlug && (
        <Button asChild size="lg">
          <Link href={`${basePath}/${course.slug}/${firstSlug}`}>
            <Play className="mr-2 h-4 w-4" />
            Kurs starten
          </Link>
        </Button>
      )}
    </header>
  )
}
