import { db } from '@/lib/db'
import { courses, courseModules, courseLessons, courseAssets, courseLessonBlocks, courseLessonProgress } from '@/lib/db/schema'
import type { Course, CourseModule, CourseLesson, CourseAsset, CourseLessonBlock } from '@/lib/db/schema'
import { eq, and, ilike, desc, asc, sql, inArray } from 'drizzle-orm'
import { CourseAccessService } from './course-access.service'
import { computeLockedLessonIds, sortLessonsForOutline } from '@/lib/utils/course-sequential'

export interface PublicListFilter {
  q?: string
  page?: number
  limit?: number
}

export interface PublicCourseDetail {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  /** Lessons currently locked by enforceSequential (only populated for portal+userId). */
  lockedLessonIds?: string[]
}

export interface PublicLessonContext {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  lesson: CourseLesson
  assets: CourseAsset[]
  blocks: CourseLessonBlock[]
  prev: { courseSlug: string; lessonSlug: string } | null
  next: { courseSlug: string; lessonSlug: string } | null
  // Sub-3a: per-user progress (nur portal-Pfad mit userId).
  progress?: {
    completedLessonIds: string[]
    completed: number
    total: number
    percentage: number
  }
  /** Lessons currently locked by enforceSequential (only populated for portal+userId). */
  lockedLessonIds?: string[]
}

type Visibility = 'public' | 'portal' | 'both'

function visibilitySet(surface: 'public' | 'portal'): Visibility[] {
  return surface === 'public' ? ['public', 'both'] : ['portal', 'both']
}

async function listBySurface(
  surface: 'public' | 'portal',
  filter: PublicListFilter,
  userId?: string,
): Promise<{ items: Course[]; total: number }> {
  const page = filter.page ?? 1
  const limit = filter.limit ?? 20
  const offset = (page - 1) * limit

  const conds = [
    eq(courses.status, 'published'),
    inArray(courses.visibility, visibilitySet(surface)),
  ]
  if (filter.q) conds.push(ilike(courses.title, `%${filter.q}%`))
  if (surface === 'portal' && userId) {
    conds.push(CourseAccessService.accessibleCondition(userId))
  }
  const where = and(...conds)

  const [items, totalRows] = await Promise.all([
    db.select().from(courses).where(where).orderBy(desc(courses.publishedAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(courses).where(where),
  ])
  return { items, total: totalRows[0]?.count ?? 0 }
}

async function getBySurfaceAndSlug(
  surface: 'public' | 'portal',
  slug: string,
  userId?: string,
): Promise<PublicCourseDetail | null> {
  const conds = [
    eq(courses.slug, slug),
    eq(courses.status, 'published'),
    inArray(courses.visibility, visibilitySet(surface)),
  ]
  const [course] = await db.select().from(courses).where(and(...conds)).limit(1)
  if (!course) return null

  if (surface === 'portal' && userId) {
    const allowed = await CourseAccessService.canAccess(userId, course.id)
    if (!allowed) return null
  }

  const [modules, lessons] = await Promise.all([
    db.select().from(courseModules).where(eq(courseModules.courseId, course.id)),
    db.select().from(courseLessons).where(eq(courseLessons.courseId, course.id)),
  ])

  let lockedLessonIds: string[] | undefined
  if (surface === 'portal' && userId && course.enforceSequential) {
    const progressRows = await db
      .select({ lessonId: courseLessonProgress.lessonId })
      .from(courseLessonProgress)
      .where(and(
        eq(courseLessonProgress.userId, userId),
        eq(courseLessonProgress.courseId, course.id),
      ))
    const completed = new Set(progressRows.map((r) => r.lessonId))
    const sorted = sortLessonsForOutline(lessons, modules)
    lockedLessonIds = Array.from(computeLockedLessonIds({
      course, sortedLessons: sorted, completedLessonIds: completed,
    }))
  }

  return { course, modules, lessons, lockedLessonIds }
}

async function getLessonBySurface(
  surface: 'public' | 'portal',
  courseSlug: string,
  lessonSlug: string,
  userId?: string,
): Promise<PublicLessonContext | null> {
  const detail = await getBySurfaceAndSlug(surface, courseSlug, userId)
  if (!detail) return null

  const lesson = detail.lessons.find((l) => l.slug === lessonSlug)
  if (!lesson) return null

  const assets = await db
    .select()
    .from(courseAssets)
    .where(eq(courseAssets.lessonId, lesson.id))

  const blocks = await db
    .select()
    .from(courseLessonBlocks)
    .where(and(
      eq(courseLessonBlocks.lessonId, lesson.id),
      eq(courseLessonBlocks.isVisible, true),
    ))
    .orderBy(asc(courseLessonBlocks.position))

  const sortedLessons = sortLessonsForOutline(detail.lessons, detail.modules)

  const idx = sortedLessons.findIndex((l) => l.id === lesson.id)
  const prevL = idx > 0 ? sortedLessons[idx - 1] : null
  const nextL = idx < sortedLessons.length - 1 ? sortedLessons[idx + 1] : null

  // Sub-3a: per-user progress (nur portal-Pfad mit userId).
  let progress: PublicLessonContext['progress']
  let lockedLessonIds: string[] | undefined
  if (userId && surface === 'portal') {
    const progressRows = await db
      .select({ lessonId: courseLessonProgress.lessonId })
      .from(courseLessonProgress)
      .where(and(
        eq(courseLessonProgress.userId, userId),
        eq(courseLessonProgress.courseId, detail.course.id),
      ))
    const completedLessonIds = progressRows.map((r) => r.lessonId)
    const total = sortedLessons.length
    const completed = completedLessonIds.length
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)
    progress = { completedLessonIds, completed, total, percentage }

    if (detail.course.enforceSequential) {
      const lockedSet = computeLockedLessonIds({
        course: detail.course,
        sortedLessons,
        completedLessonIds,
      })
      lockedLessonIds = Array.from(lockedSet)
      // Server-side enforcement: deny direct URL access to a locked lesson.
      if (lockedSet.has(lesson.id)) return null
    }
  }

  return {
    course: detail.course,
    modules: detail.modules,
    lessons: sortedLessons,
    lesson,
    assets,
    blocks,
    prev: prevL ? { courseSlug: detail.course.slug, lessonSlug: prevL.slug } : null,
    next: nextL ? { courseSlug: detail.course.slug, lessonSlug: nextL.slug } : null,
    progress,
    lockedLessonIds,
  }
}

export const CoursePublicService = {
  listPublic: (filter: PublicListFilter = {}) => listBySurface('public', filter),
  listPortal: (filter: PublicListFilter = {}, userId?: string) => listBySurface('portal', filter, userId),
  getPublicBySlug: (slug: string) => getBySurfaceAndSlug('public', slug),
  getPortalBySlug: (slug: string, userId?: string) => getBySurfaceAndSlug('portal', slug, userId),
  getPublicLesson: (courseSlug: string, lessonSlug: string) => getLessonBySurface('public', courseSlug, lessonSlug),
  getPortalLesson: (courseSlug: string, lessonSlug: string, userId?: string) =>
    getLessonBySurface('portal', courseSlug, lessonSlug, userId),
}
