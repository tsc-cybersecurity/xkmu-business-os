import { NextRequest } from 'next/server'
import { apiForbidden, apiUnauthorized } from '@/lib/utils/api-response'
import { getAuthContext, type AuthContext } from './auth-context'
import { hasPermission } from './permissions'
import type { Module, Action } from '@/lib/types/permissions'

/**
 * Wrapper fuer API-Routen mit Berechtigungspruefung.
 *
 * Prueft zuerst die Authentifizierung (Session oder API-Key),
 * dann die Berechtigung basierend auf der Rolle des Benutzers.
 */
export async function withPermission(
  request: NextRequest,
  module: Module,
  action: Action,
  handler: (auth: AuthContext) => Promise<Response>
): Promise<Response> {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  // API-Key-Auth: bestehendes Berechtigungssystem beibehalten
  if (auth.role === 'api') {
    return handler(auth)
  }

  // Benutzer mit roleId: granulare Berechtigungspruefung
  if (auth.roleId) {
    const allowed = await hasPermission(auth.roleId, module, action)
    if (!allowed) {
      return apiForbidden('Keine Berechtigung fuer diese Aktion')
    }
    return handler(auth)
  }

  // Legacy-Fallback: Benutzer ohne roleId (alte Benutzer vor Migration)
  // owner und admin bekommen vollen Zugriff
  if (auth.role === 'owner' || auth.role === 'admin') {
    return handler(auth)
  }

  // member: Lesen und Erstellen erlaubt
  if (auth.role === 'member') {
    if (action === 'read' || action === 'create' || action === 'update') {
      return handler(auth)
    }
    return apiForbidden('Keine Berechtigung fuer diese Aktion')
  }

  // viewer: Nur Lesen erlaubt
  if (auth.role === 'viewer') {
    if (action === 'read') {
      return handler(auth)
    }
    return apiForbidden('Keine Berechtigung fuer diese Aktion')
  }

  return apiForbidden('Keine Berechtigung fuer diese Aktion')
}
