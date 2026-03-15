import { apiSuccess, apiUnauthorized, apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { getSession } from '@/lib/auth/session'
import { getPermissionsForRole } from '@/lib/auth/permissions'
import { DEFAULT_ROLE_PERMISSIONS, MODULES } from '@/lib/types/permissions'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return apiUnauthorized()
    }

    const { roleId, role } = session.user

    // Owner und Admin bekommen immer vollen Zugriff (unabhaengig von DB-Zustand)
    if (role === 'owner' || role === 'admin') {
      const permissions: Record<string, Record<string, boolean>> = {}
      for (const mod of MODULES) {
        permissions[mod] = { create: true, read: true, update: true, delete: true }
      }
      return apiSuccess({ permissions })
    }

    // Benutzer mit roleId: Berechtigungen aus DB laden
    if (roleId) {
      const permissions = await getPermissionsForRole(roleId)
      return apiSuccess({ permissions })
    }

    // Legacy-Fallback: Standard-Berechtigungen basierend auf Rollenname
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role]
    if (defaultPerms) {
      const permissions: Record<string, Record<string, boolean>> = {}
      for (const [module, perms] of Object.entries(defaultPerms.permissions)) {
        permissions[module] = {
          create: perms.create,
          read: perms.read,
          update: perms.update,
          delete: perms.delete,
        }
      }
      return apiSuccess({ permissions })
    }

    return apiSuccess({ permissions: {} })
  } catch (error) {
    logger.error('Permissions fetch failed', error, { module: 'AuthPermissions' })
    return apiError('PERMISSIONS_FAILED', 'Berechtigungen konnten nicht geladen werden', 500)
  }
}
