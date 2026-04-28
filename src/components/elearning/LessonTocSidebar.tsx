import Link from 'next/link'
import { Check, FileText, FolderOpen, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CourseLesson, CourseModule, Course } from '@/lib/db/schema'

interface Props {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  currentLessonId: string
  basePath: '/kurse' | '/portal/kurse'
  completedLessonIds?: string[]
  lockedLessonIds?: string[]
}

export function LessonTocSidebar({
  course, modules, lessons, currentLessonId, basePath,
  completedLessonIds, lockedLessonIds,
}: Props) {
  const useModules = modules.length > 0
  const completed = new Set(completedLessonIds ?? [])
  const locked = new Set(lockedLessonIds ?? [])
  return (
    <nav aria-label="Lektionen" className="space-y-3 text-sm">
      <div className="border-b pb-2">
        <Link href={`${basePath}/${course.slug}`} className="font-semibold hover:underline">
          {course.title}
        </Link>
      </div>
      {useModules ? (
        [...modules].sort((a, b) => a.position - b.position).map((m) => {
          const inMod = lessons.filter((l) => l.moduleId === m.id)
          return (
            <div key={m.id} className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <FolderOpen className="h-3 w-3" />
                {m.title}
              </div>
              <ul className="space-y-0.5">
                {inMod.map((l) => (
                  <LessonLink
                    key={l.id}
                    lesson={l}
                    courseSlug={course.slug}
                    basePath={basePath}
                    active={l.id === currentLessonId}
                    completed={completed.has(l.id)}
                    locked={locked.has(l.id)}
                  />
                ))}
              </ul>
            </div>
          )
        })
      ) : (
        <ul className="space-y-0.5">
          {lessons.map((l) => (
            <LessonLink
              key={l.id}
              lesson={l}
              courseSlug={course.slug}
              basePath={basePath}
              active={l.id === currentLessonId}
              completed={completed.has(l.id)}
              locked={locked.has(l.id)}
            />
          ))}
        </ul>
      )}
    </nav>
  )
}

function LessonLink({
  lesson, courseSlug, basePath, active, completed, locked,
}: {
  lesson: CourseLesson
  courseSlug: string
  basePath: '/kurse' | '/portal/kurse'
  active: boolean
  completed: boolean
  locked: boolean
}) {
  const Icon = completed ? Check : locked ? Lock : FileText
  if (locked) {
    return (
      <li>
        <span
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground/60 cursor-not-allowed"
          title="Vorherige Lektion zuerst abschließen"
          aria-disabled="true"
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{lesson.title}</span>
        </span>
      </li>
    )
  }
  return (
    <li>
      <Link
        href={`${basePath}/${courseSlug}/${lesson.slug}`}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
          active
            ? 'bg-muted font-medium text-foreground'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        )}
        aria-current={active ? 'page' : undefined}
      >
        <Icon className={cn('h-3.5 w-3.5 shrink-0', completed && 'text-green-600')} />
        <span className="truncate">{lesson.title}</span>
      </Link>
    </li>
  )
}
