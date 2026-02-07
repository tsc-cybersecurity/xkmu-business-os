import { db } from '@/lib/db'
import { roles, rolePermissions } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
import type { Role, NewRole, RolePermission } from '@/lib/db/schema'
import { DEFAULT_ROLE_PERMISSIONS, MODULES, type Module, type Action } from '@/lib/types/permissions'

export interface RoleWithPermissions extends Role {
  permissions: RolePermission[]
}

export interface CreateRoleInput {
  name: string
  displayName: string
  description?: string
  permissions: Array<{
    module: string
    canCreate: boolean
    canRead: boolean
    canUpdate: boolean
    canDelete: boolean
  }>
}

export interface UpdateRoleInput {
  displayName?: string
  description?: string
  permissions?: Array<{
    module: string
    canCreate: boolean
    canRead: boolean
    canUpdate: boolean
    canDelete: boolean
  }>
}

export const RoleService = {
  async seedDefaultRoles(tenantId: string): Promise<void> {
    for (const [roleName, config] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const [role] = await db
        .insert(roles)
        .values({
          tenantId,
          name: roleName,
          displayName: config.displayName,
          description: config.description,
          isSystem: true,
        })
        .returning()

      const permissionRows = MODULES.map((module) => ({
        roleId: role.id,
        module,
        canCreate: config.permissions[module]?.create ?? false,
        canRead: config.permissions[module]?.read ?? false,
        canUpdate: config.permissions[module]?.update ?? false,
        canDelete: config.permissions[module]?.delete ?? false,
      }))

      await db.insert(rolePermissions).values(permissionRows)
    }
  },

  async getByName(tenantId: string, name: string): Promise<Role | null> {
    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.name, name)))
      .limit(1)

    return role ?? null
  },

  async getById(tenantId: string, roleId: string): Promise<Role | null> {
    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.id, roleId)))
      .limit(1)

    return role ?? null
  },

  async getWithPermissions(
    tenantId: string,
    roleId: string
  ): Promise<RoleWithPermissions | null> {
    const role = await this.getById(tenantId, roleId)
    if (!role) return null

    const perms = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId))

    return { ...role, permissions: perms }
  },

  async list(tenantId: string): Promise<Role[]> {
    return db
      .select()
      .from(roles)
      .where(eq(roles.tenantId, tenantId))
      .orderBy(roles.createdAt)
  },

  async listWithPermissions(tenantId: string): Promise<RoleWithPermissions[]> {
    const allRoles = await this.list(tenantId)
    const result: RoleWithPermissions[] = []

    for (const role of allRoles) {
      const perms = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, role.id))

      result.push({ ...role, permissions: perms })
    }

    return result
  },

  async create(tenantId: string, data: CreateRoleInput): Promise<RoleWithPermissions> {
    const [role] = await db
      .insert(roles)
      .values({
        tenantId,
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        isSystem: false,
      })
      .returning()

    if (data.permissions.length > 0) {
      await db.insert(rolePermissions).values(
        data.permissions.map((p) => ({
          roleId: role.id,
          module: p.module,
          canCreate: p.canCreate,
          canRead: p.canRead,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete,
        }))
      )
    }

    const perms = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, role.id))

    return { ...role, permissions: perms }
  },

  async update(
    tenantId: string,
    roleId: string,
    data: UpdateRoleInput
  ): Promise<RoleWithPermissions | null> {
    const existing = await this.getById(tenantId, roleId)
    if (!existing) return null

    // Owner-Rolle darf nicht geaendert werden
    if (existing.name === 'owner' && existing.isSystem) {
      return this.getWithPermissions(tenantId, roleId)
    }

    const updateData: Partial<NewRole> = {
      updatedAt: new Date(),
    }
    if (data.displayName !== undefined) updateData.displayName = data.displayName
    if (data.description !== undefined) updateData.description = data.description

    await db
      .update(roles)
      .set(updateData)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.id, roleId)))

    if (data.permissions) {
      await this.setPermissions(roleId, data.permissions)
    }

    return this.getWithPermissions(tenantId, roleId)
  },

  async delete(tenantId: string, roleId: string): Promise<boolean> {
    const role = await this.getById(tenantId, roleId)
    if (!role) return false

    // System-Rollen koennen nicht geloescht werden
    if (role.isSystem) return false

    const result = await db
      .delete(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.id, roleId)))
      .returning({ id: roles.id })

    return result.length > 0
  },

  async setPermissions(
    roleId: string,
    permissions: Array<{
      module: string
      canCreate: boolean
      canRead: boolean
      canUpdate: boolean
      canDelete: boolean
    }>
  ): Promise<void> {
    // Alle bestehenden Berechtigungen loeschen
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))

    if (permissions.length > 0) {
      await db.insert(rolePermissions).values(
        permissions.map((p) => ({
          roleId,
          module: p.module,
          canCreate: p.canCreate,
          canRead: p.canRead,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete,
        }))
      )
    }
  },

  async getUserPermissions(
    roleId: string
  ): Promise<Record<string, Record<string, boolean>>> {
    const perms = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId))

    const map: Record<string, Record<string, boolean>> = {}
    for (const p of perms) {
      map[p.module] = {
        create: p.canCreate ?? false,
        read: p.canRead ?? false,
        update: p.canUpdate ?? false,
        delete: p.canDelete ?? false,
      }
    }

    return map
  },

  async countUsersPerRole(
    tenantId: string
  ): Promise<Record<string, number>> {
    const { users } = await import('@/lib/db/schema')
    const allRoles = await this.list(tenantId)
    const result: Record<string, number> = {}

    for (const role of allRoles) {
      const [{ count: userCount }] = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.roleId, role.id)))

      result[role.id] = Number(userCount)
    }

    return result
  },
}
