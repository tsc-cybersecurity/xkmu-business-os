import { db } from '@/lib/db'
import { rolePermissions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { MODULES, type Module, type Action } from '@/lib/types/permissions'

export async function getPermissionsForRole(
  roleId: string
): Promise<Record<string, Record<string, boolean>>> {
  const perms = await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId))

  // Alle Module initialisieren (damit neue Module nicht fehlen)
  const map: Record<string, Record<string, boolean>> = {}
  for (const mod of MODULES) {
    map[mod] = { create: false, read: false, update: false, delete: false }
  }

  // DB-Werte ueberschreiben
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
