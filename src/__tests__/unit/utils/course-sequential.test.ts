import { describe, it, expect } from 'vitest'
import { computeLockedLessonIds, sortLessonsForOutline } from '@/lib/utils/course-sequential'
import type { CourseLesson, CourseModule } from '@/lib/db/schema'

function lesson(id: string, position: number, moduleId: string | null = null): CourseLesson {
  return {
    id, courseId: 'c1', moduleId, position, slug: id, title: id,
    contentMarkdown: null, videoAssetId: null, videoExternalUrl: null,
    durationMinutes: null,
    createdAt: new Date(), updatedAt: new Date(),
  } as CourseLesson
}

function mod(id: string, position: number): CourseModule {
  return { id, courseId: 'c1', position, title: id, description: null,
    createdAt: new Date(), updatedAt: new Date() } as CourseModule
}

describe('computeLockedLessonIds', () => {
  it('returns empty set when enforceSequential is false', () => {
    const lessons = [lesson('a', 1), lesson('b', 2), lesson('c', 3)]
    const locked = computeLockedLessonIds({
      course: { enforceSequential: false },
      sortedLessons: lessons,
      completedLessonIds: [],
    })
    expect(locked.size).toBe(0)
  })

  it('unlocks first lesson, locks the rest when nothing completed', () => {
    const lessons = [lesson('a', 1), lesson('b', 2), lesson('c', 3)]
    const locked = computeLockedLessonIds({
      course: { enforceSequential: true },
      sortedLessons: lessons,
      completedLessonIds: [],
    })
    expect([...locked].sort()).toEqual(['b', 'c'])
  })

  it('unlocks lesson after the last completed one', () => {
    const lessons = [lesson('a', 1), lesson('b', 2), lesson('c', 3)]
    const locked = computeLockedLessonIds({
      course: { enforceSequential: true },
      sortedLessons: lessons,
      completedLessonIds: ['a'],
    })
    expect([...locked]).toEqual(['c'])
  })

  it('unlocks everything when all preceding are completed', () => {
    const lessons = [lesson('a', 1), lesson('b', 2), lesson('c', 3)]
    const locked = computeLockedLessonIds({
      course: { enforceSequential: true },
      sortedLessons: lessons,
      completedLessonIds: ['a', 'b'],
    })
    expect([...locked]).toEqual([])
  })

  it('handles non-contiguous completion: gap blocks downstream', () => {
    // a, b, c; completed: a, c — b is the first incomplete, so c is locked
    const lessons = [lesson('a', 1), lesson('b', 2), lesson('c', 3)]
    const locked = computeLockedLessonIds({
      course: { enforceSequential: true },
      sortedLessons: lessons,
      completedLessonIds: ['a', 'c'],
    })
    expect([...locked]).toEqual(['c'])
  })

  it('respects sortLessonsForOutline ordering across modules', () => {
    const m1 = mod('m1', 1), m2 = mod('m2', 2)
    const lessons = [
      lesson('m2-1', 1, 'm2'),
      lesson('m1-2', 2, 'm1'),
      lesson('m1-1', 1, 'm1'),
    ]
    const sorted = sortLessonsForOutline(lessons, [m2, m1])
    expect(sorted.map((l) => l.id)).toEqual(['m1-1', 'm1-2', 'm2-1'])
  })
})
