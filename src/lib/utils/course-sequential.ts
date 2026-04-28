import type { Course, CourseLesson, CourseModule } from '@/lib/db/schema'

/**
 * Sort lessons by their position in the course outline (module position first,
 * then lesson position). Lessons without a module sort after modular lessons.
 */
export function sortLessonsForOutline(
  lessons: CourseLesson[],
  modules: CourseModule[],
): CourseLesson[] {
  const modulePositions = new Map(modules.map((m) => [m.id, m.position]))
  return [...lessons].sort((a, b) => {
    const aPos = a.moduleId
      ? modulePositions.get(a.moduleId) ?? Number.MAX_SAFE_INTEGER
      : Number.MAX_SAFE_INTEGER
    const bPos = b.moduleId
      ? modulePositions.get(b.moduleId) ?? Number.MAX_SAFE_INTEGER
      : Number.MAX_SAFE_INTEGER
    if (aPos !== bPos) return aPos - bPos
    return a.position - b.position
  })
}

/**
 * Sequential-mode lock logic:
 * - First lesson: always unlocked
 * - Lesson i: unlocked iff every preceding lesson is completed
 *
 * If `course.enforceSequential` is false, returns an empty set (nothing locked).
 */
export function computeLockedLessonIds(params: {
  course: Pick<Course, 'enforceSequential'>
  sortedLessons: CourseLesson[]
  completedLessonIds: ReadonlySet<string> | string[]
}): Set<string> {
  const locked = new Set<string>()
  if (!params.course.enforceSequential) return locked

  const completed =
    params.completedLessonIds instanceof Set
      ? params.completedLessonIds
      : new Set(params.completedLessonIds)

  let allPrevCompleted = true
  for (const lesson of params.sortedLessons) {
    if (!allPrevCompleted) {
      locked.add(lesson.id)
      continue
    }
    if (!completed.has(lesson.id)) {
      // First incomplete lesson stays unlocked; everything after is locked.
      allPrevCompleted = false
    }
  }
  return locked
}
