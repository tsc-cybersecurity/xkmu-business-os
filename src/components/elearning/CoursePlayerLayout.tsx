import type { Course, CourseLesson, CourseModule } from '@/lib/db/schema'
import { LessonTocSidebar } from './LessonTocSidebar'
import { LessonTocSheet } from './LessonTocSheet'

interface Props {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  currentLessonId: string
  basePath: '/kurse' | '/portal/kurse'
  children: React.ReactNode
}

export function CoursePlayerLayout({ course, modules, lessons, currentLessonId, basePath, children }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <aside className="hidden md:block sticky top-[120px] self-start max-h-[calc(100vh-140px)] overflow-y-auto">
        <LessonTocSidebar
          course={course}
          modules={modules}
          lessons={lessons}
          currentLessonId={currentLessonId}
          basePath={basePath}
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
          />
        </div>
        {children}
      </div>
    </div>
  )
}
