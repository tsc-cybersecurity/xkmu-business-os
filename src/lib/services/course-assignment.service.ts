import { db } from '@/lib/db'
import {
  courseAssignments,
  courses,
  courseLessons,
  courseLessonProgress,
  users,
  userGroups,
  userGroupMembers,
} from '@/lib/db/schema'
import type { CourseAssignment, Course } from '@/lib/db/schema'
import { and, eq, inArray, sql, gte, lte, or, isNull } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import { EmailService } from './email.service'
import { logger } from '@/lib/utils/logger'

export type SubjectKind = 'user' | 'group'

export interface Actor {
  userId: string | null
  userRole: string | null
}

export interface AssignmentInput {
  subjectKind: SubjectKind
  subjectId: string
  dueDate?: Date | null
}

export interface ResolvedAssignment {
  id: string
  subjectKind: SubjectKind
  subjectId: string
  label: string
  sublabel: string | null
  dueDate: Date | null
  assignedAt: Date
  lastReminderAt: Date | null
}

export interface UserAssignment {
  assignmentId: string
  course: Course
  dueDate: Date | null
  assignedAt: Date
  status: 'pending' | 'completed' | 'overdue'
  completedLessons: number
  totalLessons: number
}

export class CourseAssignmentError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export const CourseAssignmentService = {
  async listForCourse(courseId: string): Promise<ResolvedAssignment[]> {
    const rows = await db
      .select()
      .from(courseAssignments)
      .where(eq(courseAssignments.courseId, courseId))
    if (rows.length === 0) return []
    const userIds = rows.filter((r) => r.subjectKind === 'user').map((r) => r.subjectId)
    const groupIds = rows.filter((r) => r.subjectKind === 'group').map((r) => r.subjectId)
    const [userRows, groupRows] = await Promise.all([
      userIds.length
        ? db
            .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(inArray(users.id, userIds))
        : Promise.resolve([] as Array<{ id: string; email: string; firstName: string | null; lastName: string | null }>),
      groupIds.length
        ? db
            .select({ id: userGroups.id, name: userGroups.name, description: userGroups.description })
            .from(userGroups)
            .where(inArray(userGroups.id, groupIds))
        : Promise.resolve([] as Array<{ id: string; name: string; description: string | null }>),
    ])
    const userMap = new Map(userRows.map((u) => [u.id, u]))
    const groupMap = new Map(groupRows.map((g) => [g.id, g]))
    return rows.map<ResolvedAssignment>((r) => {
      if (r.subjectKind === 'user') {
        const u = userMap.get(r.subjectId)
        const fullName = u && (u.firstName || u.lastName) ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : null
        return {
          id: r.id,
          subjectKind: 'user',
          subjectId: r.subjectId,
          label: fullName || u?.email || '— gelöschter Benutzer —',
          sublabel: u?.email && fullName ? u.email : null,
          dueDate: r.dueDate,
          assignedAt: r.assignedAt,
          lastReminderAt: r.lastReminderAt,
        }
      }
      const g = groupMap.get(r.subjectId)
      return {
        id: r.id,
        subjectKind: 'group',
        subjectId: r.subjectId,
        label: g?.name || '— gelöschte Gruppe —',
        sublabel: g?.description ?? null,
        dueDate: r.dueDate,
        assignedAt: r.assignedAt,
        lastReminderAt: r.lastReminderAt,
      }
    })
  },

  async assign(courseId: string, input: AssignmentInput, actor: Actor): Promise<CourseAssignment> {
    if (input.subjectKind === 'user') {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.subjectId)).limit(1)
      if (!u) throw new CourseAssignmentError('SUBJECT_NOT_FOUND', `Benutzer ${input.subjectId} nicht gefunden`)
    } else {
      const [g] = await db.select({ id: userGroups.id }).from(userGroups).where(eq(userGroups.id, input.subjectId)).limit(1)
      if (!g) throw new CourseAssignmentError('SUBJECT_NOT_FOUND', `Gruppe ${input.subjectId} nicht gefunden`)
    }
    const dueDate = input.dueDate ?? null
    const [existing] = await db
      .select()
      .from(courseAssignments)
      .where(
        and(
          eq(courseAssignments.courseId, courseId),
          eq(courseAssignments.subjectKind, input.subjectKind),
          eq(courseAssignments.subjectId, input.subjectId),
        ),
      )
      .limit(1)
    if (existing) {
      // Update due date when re-assigned
      const [updated] = await db
        .update(courseAssignments)
        .set({ dueDate })
        .where(eq(courseAssignments.id, existing.id))
        .returning()
      await AuditLogService.log({
        userId: actor.userId,
        userRole: actor.userRole,
        action: 'course_assignment.updated',
        entityType: 'course',
        entityId: courseId,
        payload: { assignmentId: existing.id, dueDate: dueDate?.toISOString() ?? null },
      })
      return updated
    }
    const [row] = await db
      .insert(courseAssignments)
      .values({
        courseId,
        subjectKind: input.subjectKind,
        subjectId: input.subjectId,
        dueDate,
        assignedBy: actor.userId,
      })
      .returning()
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'course_assignment.created',
      entityType: 'course',
      entityId: courseId,
      payload: {
        assignmentId: row.id,
        subjectKind: input.subjectKind,
        subjectId: input.subjectId,
        dueDate: dueDate?.toISOString() ?? null,
      },
    })
    return row
  },

  async unassign(courseId: string, assignmentId: string, actor: Actor): Promise<void> {
    const [existing] = await db
      .select()
      .from(courseAssignments)
      .where(and(eq(courseAssignments.id, assignmentId), eq(courseAssignments.courseId, courseId)))
      .limit(1)
    if (!existing) return
    await db.delete(courseAssignments).where(eq(courseAssignments.id, assignmentId))
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'course_assignment.deleted',
      entityType: 'course',
      entityId: courseId,
      payload: { assignmentId, subjectKind: existing.subjectKind, subjectId: existing.subjectId },
    })
  },

  /**
   * Lists assignments visible to a user, expanding group memberships.
   * Returns one entry per (course, user-pathway) — if a user is assigned
   * directly AND via a group, the direct assignment wins on dueDate.
   */
  async listForUser(userId: string): Promise<UserAssignment[]> {
    const groupRows = await db
      .select({ groupId: userGroupMembers.groupId })
      .from(userGroupMembers)
      .where(eq(userGroupMembers.userId, userId))
    const groupIds = groupRows.map((g) => g.groupId)

    const conds = [
      and(eq(courseAssignments.subjectKind, 'user'), eq(courseAssignments.subjectId, userId)),
    ]
    if (groupIds.length > 0) {
      conds.push(and(eq(courseAssignments.subjectKind, 'group'), inArray(courseAssignments.subjectId, groupIds)))
    }
    const assignments = await db
      .select()
      .from(courseAssignments)
      .where(or(...conds))
    if (assignments.length === 0) return []

    // Dedupe by courseId — earliest due wins (or earliest assignedAt if no due).
    const byCourse = new Map<string, CourseAssignment>()
    for (const a of assignments) {
      const cur = byCourse.get(a.courseId)
      if (!cur) { byCourse.set(a.courseId, a); continue }
      const curDue = cur.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
      const newDue = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
      if (newDue < curDue) byCourse.set(a.courseId, a)
    }

    const courseIds = Array.from(byCourse.keys())
    const courseRows = await db
      .select()
      .from(courses)
      .where(inArray(courses.id, courseIds))
    const courseMap = new Map(courseRows.map((c) => [c.id, c]))

    // Compute completion per course.
    const lessonRows = await db
      .select({ courseId: courseLessons.courseId, id: courseLessons.id })
      .from(courseLessons)
      .where(inArray(courseLessons.courseId, courseIds))
    const totalByCourse = new Map<string, number>()
    for (const l of lessonRows) totalByCourse.set(l.courseId, (totalByCourse.get(l.courseId) ?? 0) + 1)

    const progressRows = await db
      .select({ courseId: courseLessonProgress.courseId, lessonId: courseLessonProgress.lessonId })
      .from(courseLessonProgress)
      .where(and(eq(courseLessonProgress.userId, userId), inArray(courseLessonProgress.courseId, courseIds)))
    const completedByCourse = new Map<string, number>()
    for (const p of progressRows) completedByCourse.set(p.courseId, (completedByCourse.get(p.courseId) ?? 0) + 1)

    const now = Date.now()
    const result: UserAssignment[] = []
    for (const [courseId, a] of byCourse.entries()) {
      const course = courseMap.get(courseId)
      if (!course) continue
      const total = totalByCourse.get(courseId) ?? 0
      const completed = completedByCourse.get(courseId) ?? 0
      const isCompleted = total > 0 && completed >= total
      const isOverdue = !!a.dueDate && a.dueDate.getTime() < now && !isCompleted
      result.push({
        assignmentId: a.id,
        course,
        dueDate: a.dueDate,
        assignedAt: a.assignedAt,
        status: isCompleted ? 'completed' : isOverdue ? 'overdue' : 'pending',
        completedLessons: completed,
        totalLessons: total,
      })
    }
    return result.sort((x, y) => {
      const xd = x.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
      const yd = y.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
      return xd - yd
    })
  },

  /**
   * Build the list of (assignment, recipient userId, recipient email) tuples
   * for assignments that should be reminded. Filters:
   *  - dueDate set, not yet completed
   *  - last_reminder_at older than 24h (or null)
   *  - dueDate within 7 days OR overdue
   */
  async processDueReminders(now: Date = new Date()): Promise<{ sent: number; skipped: number }> {
    const dayMs = 24 * 60 * 60 * 1000
    const horizonStart = new Date(now.getTime() - 30 * dayMs) // include overdue up to 30 days
    const horizonEnd = new Date(now.getTime() + 7 * dayMs)
    const reminderCutoff = new Date(now.getTime() - 23 * 60 * 60 * 1000) // ~24h debounce

    const dueAssignments = await db
      .select()
      .from(courseAssignments)
      .where(
        and(
          gte(courseAssignments.dueDate, horizonStart),
          lte(courseAssignments.dueDate, horizonEnd),
          or(isNull(courseAssignments.lastReminderAt), lte(courseAssignments.lastReminderAt, reminderCutoff)),
        ),
      )

    if (dueAssignments.length === 0) return { sent: 0, skipped: 0 }

    const courseIds = Array.from(new Set(dueAssignments.map((a) => a.courseId)))
    const courseRows = await db.select().from(courses).where(inArray(courses.id, courseIds))
    const courseMap = new Map(courseRows.map((c) => [c.id, c]))

    let sent = 0
    let skipped = 0
    for (const a of dueAssignments) {
      // Resolve recipients (users + group members)
      const recipientIds = a.subjectKind === 'user'
        ? [a.subjectId]
        : (await db
            .select({ userId: userGroupMembers.userId })
            .from(userGroupMembers)
            .where(eq(userGroupMembers.groupId, a.subjectId))).map((r) => r.userId)

      if (recipientIds.length === 0) { skipped++; continue }

      const userRows = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, recipientIds))

      // Filter out users who already completed.
      const totalLessons = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(courseLessons)
        .where(eq(courseLessons.courseId, a.courseId))
        .then((r) => r[0]?.count ?? 0)

      const course = courseMap.get(a.courseId)
      if (!course) { skipped++; continue }

      let perAssignmentSent = 0
      for (const u of userRows) {
        if (totalLessons > 0) {
          const [{ done }] = await db
            .select({ done: sql<number>`count(*)::int` })
            .from(courseLessonProgress)
            .where(
              and(
                eq(courseLessonProgress.userId, u.id),
                eq(courseLessonProgress.courseId, a.courseId),
              ),
            )
          if (done >= totalLessons) continue // already completed
        }
        const due = a.dueDate
        const isOverdue = due ? due.getTime() < now.getTime() : false
        const subject = isOverdue
          ? `Pflichtkurs überfällig: ${course.title}`
          : `Erinnerung: Pflichtkurs „${course.title}"`
        const dueStr = due ? due.toLocaleDateString('de-DE') : '—'
        const greeting = u.firstName ? `Hallo ${u.firstName}` : 'Hallo'
        const body = isOverdue
          ? `${greeting},\n\nder Pflichtkurs „${course.title}" ist seit dem ${dueStr} überfällig. Bitte schließe ihn so bald wie möglich ab.\n\nKurs öffnen: /portal/kurse/${course.slug}`
          : `${greeting},\n\nder Pflichtkurs „${course.title}" ist bis zum ${dueStr} fällig. Bitte schließe ihn rechtzeitig ab.\n\nKurs öffnen: /portal/kurse/${course.slug}`
        try {
          const result = await EmailService.send({ to: u.email, subject, body })
          if (result.success) { sent++; perAssignmentSent++ }
          else skipped++
        } catch (err) {
          logger.error('Course assignment reminder failed', err, {
            module: 'CourseAssignmentService',
            assignmentId: a.id,
            userId: u.id,
          })
          skipped++
        }
      }

      if (perAssignmentSent > 0) {
        await db
          .update(courseAssignments)
          .set({ lastReminderAt: now })
          .where(eq(courseAssignments.id, a.id))
      }
    }
    return { sent, skipped }
  },

  /** Helper for unit tests / lookups. */
  async getById(id: string): Promise<CourseAssignment | null> {
    const [row] = await db.select().from(courseAssignments).where(eq(courseAssignments.id, id)).limit(1)
    return row ?? null
  },
}
