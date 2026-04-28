import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, FileText, FolderOpen, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CourseLesson, CourseModule } from '@/lib/db/schema'

interface Props {
  courseSlug: string
  modules: CourseModule[]
  lessons: CourseLesson[]
  basePath: '/kurse' | '/portal/kurse'
  completedLessonIds?: string[]
  lockedLessonIds?: string[]
}

export function CourseLandingOutline({
  courseSlug, modules, lessons, basePath,
  completedLessonIds, lockedLessonIds,
}: Props) {
  const completed = new Set(completedLessonIds ?? [])
  const locked = new Set(lockedLessonIds ?? [])
  const useModules = modules.length > 0
  if (!useModules) {
    const sorted = [...lessons].sort((a, b) => a.position - b.position)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lektionen</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1">
            {sorted.map((l, idx) => (
              <LessonOutlineItem
                key={l.id}
                lesson={l}
                idx={idx}
                courseSlug={courseSlug}
                basePath={basePath}
                completed={completed.has(l.id)}
                locked={locked.has(l.id)}
              />
            ))}
          </ol>
        </CardContent>
      </Card>
    )
  }

  const sortedModules = [...modules].sort((a, b) => a.position - b.position)
  return (
    <div className="space-y-4">
      {sortedModules.map((m) => {
        const inMod = lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.position - b.position)
        return (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="h-4 w-4" />
                {m.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1">
                {inMod.map((l, idx) => (
                  <LessonOutlineItem
                    key={l.id}
                    lesson={l}
                    idx={idx}
                    courseSlug={courseSlug}
                    basePath={basePath}
                    completed={completed.has(l.id)}
                    locked={locked.has(l.id)}
                  />
                ))}
              </ol>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function LessonOutlineItem({
  lesson, idx, courseSlug, basePath, completed, locked,
}: {
  lesson: CourseLesson
  idx: number
  courseSlug: string
  basePath: '/kurse' | '/portal/kurse'
  completed: boolean
  locked: boolean
}) {
  const Icon = completed ? Check : locked ? Lock : FileText
  const iconClass = cn(
    'h-4 w-4',
    completed ? 'text-green-600' : 'text-muted-foreground',
  )
  if (locked) {
    return (
      <li>
        <span
          className="flex items-center gap-3 rounded-md p-2 text-muted-foreground/60 cursor-not-allowed"
          title="Vorherige Lektion zuerst abschließen"
          aria-disabled="true"
        >
          <span className="text-sm tabular-nums w-6">{idx + 1}.</span>
          <Icon className={iconClass} />
          <span>{lesson.title}</span>
        </span>
      </li>
    )
  }
  return (
    <li>
      <Link
        href={`${basePath}/${courseSlug}/${lesson.slug}`}
        className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
      >
        <span className="text-sm text-muted-foreground tabular-nums w-6">{idx + 1}.</span>
        <Icon className={iconClass} />
        <span>{lesson.title}</span>
      </Link>
    </li>
  )
}
