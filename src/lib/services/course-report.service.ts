import { db } from '@/lib/db'
import {
  courses,
  courseLessons,
  courseLessonProgress,
  courseQuizzes,
  courseQuizAttempts,
  courseAssignments,
  courseAccessGrants,
  users,
  userGroups,
  userGroupMembers,
} from '@/lib/db/schema'
import type { Course, CourseLesson } from '@/lib/db/schema'
import { and, asc, desc, eq, inArray, max, sql, or } from 'drizzle-orm'

export interface ReportUserRow {
  userId: string
  email: string
  name: string
  /** Whether this user is reachable through assignment, grant, or has any progress. */
  source: Array<'assigned' | 'granted' | 'progress'>
  perLesson: Record<string, { completedAt: Date | null }>
  quizScores: Record<string, { bestScore: number; passed: boolean } | null>
  totalLessons: number
  completedLessons: number
  percentage: number
  lastActivity: Date | null
  assignment: { dueDate: Date | null; status: 'pending' | 'completed' | 'overdue' } | null
}

export interface CourseReport {
  course: Course
  lessons: Pick<CourseLesson, 'id' | 'title' | 'position' | 'moduleId'>[]
  rows: ReportUserRow[]
}

export interface ComplianceRow {
  userId: string
  email: string
  name: string
  courseId: string
  courseTitle: string
  courseSlug: string
  dueDate: Date | null
  assignedAt: Date
  status: 'pending' | 'completed' | 'overdue'
  completedLessons: number
  totalLessons: number
  percentage: number
  groupNames: string[]
}

async function resolveSubjectsToUserIds(
  subjects: Array<{ kind: 'user' | 'group'; id: string }>,
): Promise<Map<string, Set<string>>> {
  const userIds = new Set<string>()
  for (const s of subjects) if (s.kind === 'user') userIds.add(s.id)
  const groupIds = subjects.filter((s) => s.kind === 'group').map((s) => s.id)

  const subjectByUserId = new Map<string, Set<string>>() // userId → set of source subject ids
  for (const uid of userIds) subjectByUserId.set(uid, new Set([uid]))

  if (groupIds.length > 0) {
    const memberRows = await db
      .select({ groupId: userGroupMembers.groupId, userId: userGroupMembers.userId })
      .from(userGroupMembers)
      .where(inArray(userGroupMembers.groupId, groupIds))
    for (const m of memberRows) {
      const set = subjectByUserId.get(m.userId) ?? new Set<string>()
      set.add(m.groupId)
      subjectByUserId.set(m.userId, set)
    }
  }
  return subjectByUserId
}

export const CourseReportService = {
  async forCourse(courseId: string): Promise<CourseReport | null> {
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1)
    if (!course) return null

    const lessons = await db
      .select({
        id: courseLessons.id,
        title: courseLessons.title,
        position: courseLessons.position,
        moduleId: courseLessons.moduleId,
      })
      .from(courseLessons)
      .where(eq(courseLessons.courseId, courseId))
      .orderBy(asc(courseLessons.position))

    // Pull all "stake-holders": assigned + granted + users with progress
    const [grants, assignments, progressUsers] = await Promise.all([
      db
        .select({ subjectKind: courseAccessGrants.subjectKind, subjectId: courseAccessGrants.subjectId })
        .from(courseAccessGrants)
        .where(eq(courseAccessGrants.courseId, courseId)),
      db
        .select()
        .from(courseAssignments)
        .where(eq(courseAssignments.courseId, courseId)),
      db
        .select({ userId: courseLessonProgress.userId })
        .from(courseLessonProgress)
        .where(eq(courseLessonProgress.courseId, courseId)),
    ])

    const grantedSubjects = grants.map((g) => ({ kind: g.subjectKind as 'user' | 'group', id: g.subjectId }))
    const grantedUserMap = await resolveSubjectsToUserIds(grantedSubjects)

    const assignedSubjects = assignments.map((a) => ({ kind: a.subjectKind as 'user' | 'group', id: a.subjectId }))
    const assignedUserMap = await resolveSubjectsToUserIds(assignedSubjects)

    const allUserIds = new Set<string>()
    grantedUserMap.forEach((_, id) => allUserIds.add(id))
    assignedUserMap.forEach((_, id) => allUserIds.add(id))
    progressUsers.forEach((p) => allUserIds.add(p.userId))

    if (allUserIds.size === 0) {
      return { course, lessons, rows: [] }
    }

    const userIdsArr = Array.from(allUserIds)
    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(inArray(users.id, userIdsArr))

    // Progress per (user, lesson)
    const progressRows = lessons.length > 0
      ? await db
          .select({
            userId: courseLessonProgress.userId,
            lessonId: courseLessonProgress.lessonId,
            completedAt: courseLessonProgress.completedAt,
          })
          .from(courseLessonProgress)
          .where(
            and(
              eq(courseLessonProgress.courseId, courseId),
              inArray(courseLessonProgress.userId, userIdsArr),
            ),
          )
      : []

    // Quizzes: best score + passed per (user, quiz=lesson)
    const lessonIds = lessons.map((l) => l.id)
    const quizRows = lessonIds.length > 0
      ? await db
          .select({ id: courseQuizzes.id, lessonId: courseQuizzes.lessonId })
          .from(courseQuizzes)
          .where(inArray(courseQuizzes.lessonId, lessonIds))
      : []
    const quizIdToLessonId = new Map(quizRows.map((q) => [q.id, q.lessonId]))
    const quizIds = quizRows.map((q) => q.id)
    const attemptAggs = quizIds.length > 0
      ? await db
          .select({
            quizId: courseQuizAttempts.quizId,
            userId: courseQuizAttempts.userId,
            bestScore: max(courseQuizAttempts.score),
            anyPassed: sql<boolean>`bool_or(${courseQuizAttempts.passed})`,
          })
          .from(courseQuizAttempts)
          .where(
            and(
              inArray(courseQuizAttempts.quizId, quizIds),
              inArray(courseQuizAttempts.userId, userIdsArr),
            ),
          )
          .groupBy(courseQuizAttempts.quizId, courseQuizAttempts.userId)
      : []

    // Build per-user lookup tables
    const completedLookup = new Map<string, Map<string, Date>>() // userId → lessonId → completedAt
    for (const p of progressRows) {
      const m = completedLookup.get(p.userId) ?? new Map<string, Date>()
      m.set(p.lessonId, p.completedAt)
      completedLookup.set(p.userId, m)
    }

    const quizLookup = new Map<string, Map<string, { bestScore: number; passed: boolean }>>()
    for (const a of attemptAggs) {
      const lessonId = quizIdToLessonId.get(a.quizId)
      if (!lessonId) continue
      const m = quizLookup.get(a.userId) ?? new Map<string, { bestScore: number; passed: boolean }>()
      m.set(lessonId, { bestScore: a.bestScore ?? 0, passed: !!a.anyPassed })
      quizLookup.set(a.userId, m)
    }

    // Assignment lookup per user (direct + via group)
    const assignmentByUser = new Map<string, { dueDate: Date | null; assignedAt: Date }>()
    for (const a of assignments) {
      if (a.subjectKind === 'user') {
        const cur = assignmentByUser.get(a.subjectId)
        const better = !cur || (a.dueDate && (!cur.dueDate || a.dueDate < cur.dueDate))
        if (!cur || better) assignmentByUser.set(a.subjectId, { dueDate: a.dueDate, assignedAt: a.assignedAt })
      } else {
        const memberRows = await db
          .select({ userId: userGroupMembers.userId })
          .from(userGroupMembers)
          .where(eq(userGroupMembers.groupId, a.subjectId))
        for (const m of memberRows) {
          const cur = assignmentByUser.get(m.userId)
          const better = !cur || (a.dueDate && (!cur.dueDate || a.dueDate < cur.dueDate))
          if (!cur || better) assignmentByUser.set(m.userId, { dueDate: a.dueDate, assignedAt: a.assignedAt })
        }
      }
    }

    const now = Date.now()
    const rows: ReportUserRow[] = userRows.map((u) => {
      const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
      const completedMap = completedLookup.get(u.id) ?? new Map<string, Date>()
      const quizMap = quizLookup.get(u.id) ?? new Map<string, { bestScore: number; passed: boolean }>()
      const perLesson: Record<string, { completedAt: Date | null }> = {}
      const quizScores: Record<string, { bestScore: number; passed: boolean } | null> = {}
      let lastActivity: Date | null = null
      for (const l of lessons) {
        const completed = completedMap.get(l.id) ?? null
        perLesson[l.id] = { completedAt: completed }
        if (completed && (!lastActivity || completed > lastActivity)) lastActivity = completed
        quizScores[l.id] = quizMap.get(l.id) ?? null
      }
      const completedCount = Object.values(perLesson).filter((p) => p.completedAt).length
      const total = lessons.length
      const percentage = total === 0 ? 0 : Math.round((completedCount / total) * 100)
      const isCompleted = total > 0 && completedCount >= total
      const assignment = assignmentByUser.get(u.id) ?? null
      const isOverdue = !!assignment?.dueDate && assignment.dueDate.getTime() < now && !isCompleted

      const source: ReportUserRow['source'] = []
      if (assignedUserMap.has(u.id)) source.push('assigned')
      if (grantedUserMap.has(u.id)) source.push('granted')
      if (completedMap.size > 0) source.push('progress')

      return {
        userId: u.id,
        email: u.email,
        name: fullName,
        source,
        perLesson,
        quizScores,
        totalLessons: total,
        completedLessons: completedCount,
        percentage,
        lastActivity,
        assignment: assignment
          ? {
              dueDate: assignment.dueDate,
              status: isCompleted ? 'completed' : isOverdue ? 'overdue' : 'pending',
            }
          : null,
      }
    })

    rows.sort((a, b) => a.name.localeCompare(b.name, 'de'))

    return { course, lessons, rows }
  },

  /**
   * Cross-course compliance overview: every (user, course) where the user has
   * an active assignment (direct or via group).
   * Optionally filter to a single group.
   */
  async complianceOverview(filter?: { groupId?: string }): Promise<ComplianceRow[]> {
    const conds = []
    if (filter?.groupId) {
      // Restrict to assignments either of group=X, or of users that are in group X
      const groupMemberIds = await db
        .select({ userId: userGroupMembers.userId })
        .from(userGroupMembers)
        .where(eq(userGroupMembers.groupId, filter.groupId))
      const memberUserIds = groupMemberIds.map((g) => g.userId)
      conds.push(
        or(
          and(eq(courseAssignments.subjectKind, 'group'), eq(courseAssignments.subjectId, filter.groupId)),
          memberUserIds.length > 0
            ? and(eq(courseAssignments.subjectKind, 'user'), inArray(courseAssignments.subjectId, memberUserIds))
            : undefined,
        ),
      )
    }

    const assignments = await db
      .select()
      .from(courseAssignments)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(asc(courseAssignments.dueDate), desc(courseAssignments.assignedAt))

    if (assignments.length === 0) return []

    // Resolve every assignment into per-user pairs
    const pairs: Array<{ userId: string; courseId: string; dueDate: Date | null; assignedAt: Date; sourceGroupId: string | null }> = []
    const groupMemberCache = new Map<string, string[]>()
    for (const a of assignments) {
      if (a.subjectKind === 'user') {
        pairs.push({ userId: a.subjectId, courseId: a.courseId, dueDate: a.dueDate, assignedAt: a.assignedAt, sourceGroupId: null })
      } else {
        let memberIds = groupMemberCache.get(a.subjectId)
        if (!memberIds) {
          const rows = await db
            .select({ userId: userGroupMembers.userId })
            .from(userGroupMembers)
            .where(eq(userGroupMembers.groupId, a.subjectId))
          memberIds = rows.map((r) => r.userId)
          groupMemberCache.set(a.subjectId, memberIds)
        }
        for (const uid of memberIds) {
          pairs.push({ userId: uid, courseId: a.courseId, dueDate: a.dueDate, assignedAt: a.assignedAt, sourceGroupId: a.subjectId })
        }
      }
    }

    if (pairs.length === 0) return []

    // Dedupe (user, course) — earliest due wins
    const dedup = new Map<string, typeof pairs[number]>()
    for (const p of pairs) {
      const key = `${p.userId}:${p.courseId}`
      const cur = dedup.get(key)
      const newDue = p.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
      const curDue = cur?.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
      if (!cur || newDue < curDue) dedup.set(key, p)
    }

    const items = Array.from(dedup.values())
    const userIds = Array.from(new Set(items.map((p) => p.userId)))
    const courseIds = Array.from(new Set(items.map((p) => p.courseId)))

    const [userRows, courseRows, lessonCountRows, completedRows, allMemberships, allGroupNames] = await Promise.all([
      db
        .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, userIds)),
      db
        .select({ id: courses.id, title: courses.title, slug: courses.slug })
        .from(courses)
        .where(inArray(courses.id, courseIds)),
      db
        .select({ courseId: courseLessons.courseId, count: sql<number>`count(*)::int` })
        .from(courseLessons)
        .where(inArray(courseLessons.courseId, courseIds))
        .groupBy(courseLessons.courseId),
      db
        .select({
          userId: courseLessonProgress.userId,
          courseId: courseLessonProgress.courseId,
          count: sql<number>`count(*)::int`,
        })
        .from(courseLessonProgress)
        .where(
          and(
            inArray(courseLessonProgress.userId, userIds),
            inArray(courseLessonProgress.courseId, courseIds),
          ),
        )
        .groupBy(courseLessonProgress.userId, courseLessonProgress.courseId),
      db
        .select({ userId: userGroupMembers.userId, groupId: userGroupMembers.groupId })
        .from(userGroupMembers)
        .where(inArray(userGroupMembers.userId, userIds)),
      db.select({ id: userGroups.id, name: userGroups.name }).from(userGroups),
    ])

    const userMap = new Map(userRows.map((u) => [u.id, u]))
    const courseMap = new Map(courseRows.map((c) => [c.id, c]))
    const totalByCourse = new Map(lessonCountRows.map((r) => [r.courseId, r.count]))
    const completedByPair = new Map(completedRows.map((r) => [`${r.userId}:${r.courseId}`, r.count]))
    const groupNameById = new Map(allGroupNames.map((g) => [g.id, g.name]))
    const groupsByUser = new Map<string, string[]>()
    for (const m of allMemberships) {
      const arr = groupsByUser.get(m.userId) ?? []
      const name = groupNameById.get(m.groupId)
      if (name) arr.push(name)
      groupsByUser.set(m.userId, arr)
    }

    const now = Date.now()
    const result: ComplianceRow[] = []
    for (const p of items) {
      const u = userMap.get(p.userId)
      const c = courseMap.get(p.courseId)
      if (!u || !c) continue
      const total = totalByCourse.get(p.courseId) ?? 0
      const completed = completedByPair.get(`${p.userId}:${p.courseId}`) ?? 0
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)
      const isCompleted = total > 0 && completed >= total
      const isOverdue = !!p.dueDate && p.dueDate.getTime() < now && !isCompleted
      result.push({
        userId: u.id,
        email: u.email,
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
        courseId: c.id,
        courseTitle: c.title,
        courseSlug: c.slug,
        dueDate: p.dueDate,
        assignedAt: p.assignedAt,
        status: isCompleted ? 'completed' : isOverdue ? 'overdue' : 'pending',
        completedLessons: completed,
        totalLessons: total,
        percentage,
        groupNames: groupsByUser.get(p.userId) ?? [],
      })
    }
    result.sort((a, b) => {
      const ad = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bd = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
      if (ad !== bd) return ad - bd
      return a.name.localeCompare(b.name, 'de')
    })
    return result
  },
}
