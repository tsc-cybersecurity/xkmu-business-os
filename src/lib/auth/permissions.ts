import { db } from '@/lib/db'
import { rolePermissions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Module, Action } from '@/lib/types/permissions'

export async function getPermissionsForRole(
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
}

export async function hasPermission(
  roleId: string,
  module: Module,
  action: Action
): Promise<boolean> {
  const perms = await getPermissionsForRole(roleId)
  return perms[module]?.[action] ?? false
}
