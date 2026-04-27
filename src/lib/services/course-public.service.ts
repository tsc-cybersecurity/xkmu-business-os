import { db } from '@/lib/db'
import { courses, courseModules, courseLessons, courseAssets, courseLessonBlocks } from '@/lib/db/schema'
import type { Course, CourseModule, CourseLesson, CourseAsset, CourseLessonBlock } from '@/lib/db/schema'
import { eq, and, ilike, desc, asc, sql, inArray } from 'drizzle-orm'

export interface PublicListFilter {
  q?: string
  page?: number
  limit?: number
}

export interface PublicCourseDetail {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
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
}

type Visibility = 'public' | 'portal' | 'both'

function visibilitySet(surface: 'public' | 'portal'): Visibility[] {
  return surface === 'public' ? ['public', 'both'] : ['portal', 'both']
}

async function listBySurface(
  surface: 'public' | 'portal',
  filter: PublicListFilter,
): Promise<{ items: Course[]; total: number }> {
  const page = filter.page ?? 1
  const limit = filter.limit ?? 20
  const offset = (page - 1) * limit

  const conds = [
    eq(courses.status, 'published'),
    inArray(courses.visibility, visibilitySet(surface)),
  ]
  if (filter.q) conds.push(ilike(courses.title, `%${filter.q}%`))
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
): Promise<PublicCourseDetail | null> {
  const conds = [
    eq(courses.slug, slug),
    eq(courses.status, 'published'),
    inArray(courses.visibility, visibilitySet(surface)),
  ]
  const [course] = await db.select().from(courses).where(and(...conds)).limit(1)
  if (!course) return null

  const [modules, lessons] = await Promise.all([
    db.select().from(courseModules).where(eq(courseModules.courseId, course.id)),
    db.select().from(courseLessons).where(eq(courseLessons.courseId, course.id)),
  ])
  return { course, modules, lessons }
}

async function getLessonBySurface(
  surface: 'public' | 'portal',
  courseSlug: string,
  lessonSlug: string,
): Promise<PublicLessonContext | null> {
  const detail = await getBySurfaceAndSlug(surface, courseSlug)
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

  const modulePositions = new Map(detail.modules.map((m) => [m.id, m.position]))
  const sortedLessons = [...detail.lessons].sort((a, b) => {
    const aPos = a.moduleId ? (modulePositions.get(a.moduleId) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
    const bPos = b.moduleId ? (modulePositions.get(b.moduleId) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
    if (aPos !== bPos) return aPos - bPos
    return a.position - b.position
  })

  const idx = sortedLessons.findIndex((l) => l.id === lesson.id)
  const prevL = idx > 0 ? sortedLessons[idx - 1] : null
  const nextL = idx < sortedLessons.length - 1 ? sortedLessons[idx + 1] : null

  return {
    course: detail.course,
    modules: detail.modules,
    lessons: sortedLessons,
    lesson,
    assets,
    blocks,
    prev: prevL ? { courseSlug: detail.course.slug, lessonSlug: prevL.slug } : null,
    next: nextL ? { courseSlug: detail.course.slug, lessonSlug: nextL.slug } : null,
  }
}

export const CoursePublicService = {
  listPublic: (filter: PublicListFilter = {}) => listBySurface('public', filter),
  listPortal: (filter: PublicListFilter = {}) => listBySurface('portal', filter),
  getPublicBySlug: (slug: string) => getBySurfaceAndSlug('public', slug),
  getPortalBySlug: (slug: string) => getBySurfaceAndSlug('portal', slug),
  getPublicLesson: (courseSlug: string, lessonSlug: string) => getLessonBySurface('public', courseSlug, lessonSlug),
  getPortalLesson: (courseSlug: string, lessonSlug: string) => getLessonBySurface('portal', courseSlug, lessonSlug),
}
