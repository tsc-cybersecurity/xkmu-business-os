import type { Course, CourseLesson, CourseModule } from '@/lib/db/schema'
import { LessonTocSidebar } from './LessonTocSidebar'
import { LessonTocSheet } from './LessonTocSheet'

interface Props {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  currentLessonId: string
  basePath: '/kurse' | '/portal/kurse'
  progress?: { completed: number; total: number; percentage: number }
  completedLessonIds?: string[]
  lockedLessonIds?: string[]
  children: React.ReactNode
}

export function CoursePlayerLayout({
  course, modules, lessons, currentLessonId, basePath, progress,
  completedLessonIds, lockedLessonIds, children,
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <aside className="hidden md:block sticky top-[120px] self-start max-h-[calc(100vh-140px)] overflow-y-auto">
        <LessonTocSidebar
          course={course}
          modules={modules}
          lessons={lessons}
          currentLessonId={currentLessonId}
          basePath={basePath}
          completedLessonIds={completedLessonIds}
          lockedLessonIds={lockedLessonIds}
        />
      </aside>
      <div className="space-y-4">
        <div className="md:hidden">
          <LessonTocSheet
            course={course}
            modules={modules}
            lessons={lessons}
            currentLessonId={currentLessonId}
            basePath={basePath}
            completedLessonIds={completedLessonIds}
            lockedLessonIds={lockedLessonIds}
          />
        </div>
        {progress && (
          <div className="rounded-md border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium">Fortschritt</span>
              <span className="text-muted-foreground">
                {progress.completed} / {progress.total} Lektionen · {progress.percentage}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress.percentage}%` }}
                role="progressbar"
                aria-valuenow={progress.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
