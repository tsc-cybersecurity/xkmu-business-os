import { db } from '@/lib/db'
import { courseAccessGrants, courses, userGroups, userGroupMembers, users } from '@/lib/db/schema'
import type { CourseAccessGrant } from '@/lib/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'

export interface Actor {
  userId: string | null
  userRole: string | null
}

export type SubjectKind = 'user' | 'group'

export interface GrantInput {
  subjectKind: SubjectKind
  subjectId: string
}

export interface ResolvedGrant {
  id: string
  subjectKind: SubjectKind
  subjectId: string
  label: string
  sublabel: string | null
  createdAt: Date
}

export class CourseAccessError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export const CourseAccessService = {
  async listForCourse(courseId: string): Promise<ResolvedGrant[]> {
    const grants = await db
      .select()
      .from(courseAccessGrants)
      .where(eq(courseAccessGrants.courseId, courseId))
    if (grants.length === 0) return []

    const userIds = grants.filter((g) => g.subjectKind === 'user').map((g) => g.subjectId)
    const groupIds = grants.filter((g) => g.subjectKind === 'group').map((g) => g.subjectId)

    const [userRows, groupRows] = await Promise.all([
      userIds.length > 0
        ? db
            .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(inArray(users.id, userIds))
        : Promise.resolve([] as Array<{ id: string; email: string; firstName: string | null; lastName: string | null }>),
      groupIds.length > 0
        ? db
            .select({ id: userGroups.id, name: userGroups.name, description: userGroups.description })
            .from(userGroups)
            .where(inArray(userGroups.id, groupIds))
        : Promise.resolve([] as Array<{ id: string; name: string; description: string | null }>),
    ])

    const userMap = new Map(userRows.map((u) => [u.id, u]))
    const groupMap = new Map(groupRows.map((g) => [g.id, g]))

    return grants.map<ResolvedGrant>((g) => {
      if (g.subjectKind === 'user') {
        const u = userMap.get(g.subjectId)
        const fullName =
          u && (u.firstName || u.lastName)
            ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
            : null
        return {
          id: g.id,
          subjectKind: 'user',
          subjectId: g.subjectId,
          label: fullName || u?.email || '— gelöschter Benutzer —',
          sublabel: u?.email && fullName ? u.email : null,
          createdAt: g.createdAt,
        }
      }
      const grp = groupMap.get(g.subjectId)
      return {
        id: g.id,
        subjectKind: 'group',
        subjectId: g.subjectId,
        label: grp?.name || '— gelöschte Gruppe —',
        sublabel: grp?.description ?? null,
        createdAt: g.createdAt,
      }
    })
  },

  async add(courseId: string, input: GrantInput, actor: Actor): Promise<CourseAccessGrant> {
    if (input.subjectKind === 'user') {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.subjectId)).limit(1)
      if (!u) throw new CourseAccessError('SUBJECT_NOT_FOUND', `Benutzer ${input.subjectId} nicht gefunden`)
    } else {
      const [g] = await db.select({ id: userGroups.id }).from(userGroups).where(eq(userGroups.id, input.subjectId)).limit(1)
      if (!g) throw new CourseAccessError('SUBJECT_NOT_FOUND', `Gruppe ${input.subjectId} nicht gefunden`)
    }

    const [existing] = await db
      .select()
      .from(courseAccessGrants)
      .where(
        and(
          eq(courseAccessGrants.courseId, courseId),
          eq(courseAccessGrants.subjectKind, input.subjectKind),
          eq(courseAccessGrants.subjectId, input.subjectId),
        ),
      )
      .limit(1)
    if (existing) return existing

    const [row] = await db
      .insert(courseAccessGrants)
      .values({
        courseId,
        subjectKind: input.subjectKind,
        subjectId: input.subjectId,
        createdBy: actor.userId,
      })
      .returning()

    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'course_access.granted',
      entityType: 'course',
      entityId: courseId,
      payload: { subjectKind: input.subjectKind, subjectId: input.subjectId },
    })
    return row
  },

  async remove(courseId: string, grantId: string, actor: Actor): Promise<void> {
    const [existing] = await db
      .select()
      .from(courseAccessGrants)
      .where(and(eq(courseAccessGrants.id, grantId), eq(courseAccessGrants.courseId, courseId)))
      .limit(1)
    if (!existing) return
    await db.delete(courseAccessGrants).where(eq(courseAccessGrants.id, grantId))
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'course_access.revoked',
      entityType: 'course',
      entityId: courseId,
      payload: { subjectKind: existing.subjectKind, subjectId: existing.subjectId },
    })
  },

  /**
   * Returns the set of course IDs accessible by `userId` given a candidate list.
   *
   * Semantics:
   *  - If a course has no grants → it is open to all (member of "candidate" set).
   *  - If a course has grants → user must match either by direct user grant
   *    or via membership in a granted group.
   */
  async filterAccessibleCourseIds(
    userId: string,
    candidateCourseIds: string[],
  ): Promise<Set<string>> {
    if (candidateCourseIds.length === 0) return new Set()

    const grantsRows = await db
      .select({
        courseId: courseAccessGrants.courseId,
        subjectKind: courseAccessGrants.subjectKind,
        subjectId: courseAccessGrants.subjectId,
      })
      .from(courseAccessGrants)
      .where(inArray(courseAccessGrants.courseId, candidateCourseIds))

    const restrictedCourseIds = new Set(grantsRows.map((g) => g.courseId))
    const accessible = new Set<string>(candidateCourseIds.filter((id) => !restrictedCourseIds.has(id)))

    if (restrictedCourseIds.size === 0) return accessible

    const userGroupIds = await db
      .select({ groupId: userGroupMembers.groupId })
      .from(userGroupMembers)
      .where(eq(userGroupMembers.userId, userId))

    const groupIdSet = new Set(userGroupIds.map((g) => g.groupId))

    for (const g of grantsRows) {
      if (g.subjectKind === 'user' && g.subjectId === userId) accessible.add(g.courseId)
      else if (g.subjectKind === 'group' && groupIdSet.has(g.subjectId)) accessible.add(g.courseId)
    }
    return accessible
  },

  async canAccess(userId: string, courseId: string): Promise<boolean> {
    const accessible = await CourseAccessService.filterAccessibleCourseIds(userId, [courseId])
    return accessible.has(courseId)
  },

  /**
   * Subquery condition for "course is open to userId" — used by services to
   * filter course lists at the SQL level. Returns SQL fragment that evaluates
   * to true when the course has no grants OR userId matches a grant.
   */
  accessibleCondition(userId: string) {
    return sql`(
      NOT EXISTS (
        SELECT 1 FROM ${courseAccessGrants}
        WHERE ${courseAccessGrants.courseId} = ${courses.id}
      )
      OR EXISTS (
        SELECT 1 FROM ${courseAccessGrants} cag
        WHERE cag.course_id = ${courses.id}
          AND (
            (cag.subject_kind = 'user' AND cag.subject_id = ${userId})
            OR (cag.subject_kind = 'group' AND cag.subject_id IN (
              SELECT ${userGroupMembers.groupId}
              FROM ${userGroupMembers}
              WHERE ${userGroupMembers.userId} = ${userId}
            ))
          )
      )
    )`
  },
}
