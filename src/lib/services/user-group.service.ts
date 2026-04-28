import { db } from '@/lib/db'
import { userGroups, userGroupMembers, users } from '@/lib/db/schema'
import type { UserGroup } from '@/lib/db/schema'
import { and, eq, asc } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'

export interface UserGroupCreateInput {
  name: string
  description?: string | null
}
export type UserGroupUpdateInput = Partial<UserGroupCreateInput>

export interface Actor {
  userId: string | null
  userRole: string | null
}

export interface UserGroupMemberRow {
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string | null
  addedAt: Date
}

export class UserGroupError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export const UserGroupService = {
  async list(): Promise<Array<UserGroup & { memberCount: number }>> {
    const rows = await db.select().from(userGroups).orderBy(asc(userGroups.name))
    if (rows.length === 0) return []
    const counts = new Map<string, number>()
    const members = await db
      .select({ groupId: userGroupMembers.groupId })
      .from(userGroupMembers)
    for (const m of members) counts.set(m.groupId, (counts.get(m.groupId) ?? 0) + 1)
    return rows.map((g) => ({ ...g, memberCount: counts.get(g.id) ?? 0 }))
  },

  async getById(id: string): Promise<UserGroup | null> {
    const [row] = await db.select().from(userGroups).where(eq(userGroups.id, id)).limit(1)
    return row ?? null
  },

  async create(input: UserGroupCreateInput, actor: Actor): Promise<UserGroup> {
    const name = input.name.trim()
    if (!name) throw new UserGroupError('VALIDATION', 'Name darf nicht leer sein')
    const [row] = await db
      .insert(userGroups)
      .values({
        name,
        description: input.description?.trim() ? input.description.trim() : null,
        createdBy: actor.userId,
      })
      .returning()
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'user_group.created',
      entityType: 'user_group',
      entityId: row.id,
      payload: { name },
    })
    return row
  },

  async update(id: string, patch: UserGroupUpdateInput, actor: Actor): Promise<UserGroup> {
    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (patch.name !== undefined) {
      const name = patch.name.trim()
      if (!name) throw new UserGroupError('VALIDATION', 'Name darf nicht leer sein')
      update.name = name
    }
    if (patch.description !== undefined) {
      update.description = patch.description?.trim() ? patch.description.trim() : null
    }
    const [row] = await db.update(userGroups).set(update).where(eq(userGroups.id, id)).returning()
    if (!row) throw new UserGroupError('NOT_FOUND', `Gruppe ${id} nicht gefunden`)
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'user_group.updated',
      entityType: 'user_group',
      entityId: id,
      payload: { changes: Object.keys(update).filter((k) => k !== 'updatedAt') },
    })
    return row
  },

  async delete(id: string, actor: Actor): Promise<void> {
    await db.delete(userGroups).where(eq(userGroups.id, id))
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'user_group.deleted',
      entityType: 'user_group',
      entityId: id,
      payload: {},
    })
  },

  async listMembers(groupId: string): Promise<UserGroupMemberRow[]> {
    const rows = await db
      .select({
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        addedAt: userGroupMembers.addedAt,
      })
      .from(userGroupMembers)
      .innerJoin(users, eq(users.id, userGroupMembers.userId))
      .where(eq(userGroupMembers.groupId, groupId))
      .orderBy(asc(users.email))
    return rows
  },

  async addMember(groupId: string, userId: string, actor: Actor): Promise<void> {
    const [existing] = await db
      .select({ id: userGroupMembers.id })
      .from(userGroupMembers)
      .where(and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.userId, userId)))
      .limit(1)
    if (existing) return
    await db.insert(userGroupMembers).values({ groupId, userId })
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'user_group.member_added',
      entityType: 'user_group',
      entityId: groupId,
      payload: { userId },
    })
  },

  async removeMember(groupId: string, userId: string, actor: Actor): Promise<void> {
    await db
      .delete(userGroupMembers)
      .where(and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.userId, userId)))
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'user_group.member_removed',
      entityType: 'user_group',
      entityId: groupId,
      payload: { userId },
    })
  },

  async listGroupIdsForUser(userId: string): Promise<string[]> {
    const rows = await db
      .select({ groupId: userGroupMembers.groupId })
      .from(userGroupMembers)
      .where(eq(userGroupMembers.userId, userId))
    return rows.map((r) => r.groupId)
  },
}
