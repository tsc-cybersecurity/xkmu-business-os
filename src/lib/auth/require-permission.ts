import { NextRequest } from 'next/server'
import { apiForbidden, apiUnauthorized } from '@/lib/utils/api-response'
import { getAuthContext, type AuthContext } from './auth-context'
import { hasPermission } from './permissions'
import type { Module, Action } from '@/lib/types/permissions'

type CheckResult =
  | { allowed: true; auth: AuthContext }
  | { allowed: false; reason: 'unauthenticated' | 'forbidden' }

/**
 * Interne Pruefungslogik fuer Authentifizierung und Berechtigung.
 * Geteilt zwischen withPermission und tryWithPermission.
 */
async function checkPermission(
  request: NextRequest,
  module: Module,
  action: Action,
): Promise<CheckResult> {
  const auth = await getAuthContext(request)
  if (!auth) return { allowed: false, reason: 'unauthenticated' }

  // API-Key-Auth: Scope-basierte Berechtigungspruefung
  if (auth.role === 'api') {
    const scopes: string[] = auth.apiKeyPermissions ?? ['*']
    if (!scopes.includes('*') && !scopes.includes(`${module}:${action}`)) {
      return { allowed: false, reason: 'forbidden' }
    }
    return { allowed: true, auth }
  }

  // Benutzer mit roleId: granulare Berechtigungspruefung
  if (auth.roleId) {
    const allowed = await hasPermission(auth.roleId, module, action)
    if (allowed) return { allowed: true, auth }
    // Fallthrough zum Legacy-Fallback wenn kein Permission-Eintrag existiert
  }

  // Legacy-Fallback: owner und admin bekommen vollen Zugriff
  if (auth.role === 'owner' || auth.role === 'admin') {
    return { allowed: true, auth }
  }

  // Phase 1: social_media ist owner-only — member/viewer haben keinen Zugriff
  // (Spiegelt buildMemberAccess/buildViewerAccess hiddenModules)
  const ownerOnlyModules = ['social_media'] as const

  // member: Lesen, Erstellen und Bearbeiten erlaubt (ausser owner-only Module)
  if (auth.role === 'member') {
    if ((ownerOnlyModules as readonly string[]).includes(module)) {
      return { allowed: false, reason: 'forbidden' }
    }
    if (action === 'read' || action === 'create' || action === 'update') {
      return { allowed: true, auth }
    }
    return { allowed: false, reason: 'forbidden' }
  }

  // viewer: Nur Lesen erlaubt (ausser owner-only Module)
  if (auth.role === 'viewer') {
    if ((ownerOnlyModules as readonly string[]).includes(module)) {
      return { allowed: false, reason: 'forbidden' }
    }
    if (action === 'read') return { allowed: true, auth }
    return { allowed: false, reason: 'forbidden' }
  }

  return { allowed: false, reason: 'forbidden' }
}

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
  handler: (auth: AuthContext) => Promise<Response>,
): Promise<Response> {
  const result = await checkPermission(request, module, action)
  if (!result.allowed) {
    if (result.reason === 'unauthenticated') return apiUnauthorized()
    return apiForbidden('Keine Berechtigung für diese Aktion')
  }
  return handler(result.auth)
}

/**
 * Variante von withPermission, die ein Result-Objekt zurueckgibt
 * statt einer HTTP-Response. Nuetzlich fuer Routen, die bei
 * fehlender Berechtigung auf eine alternative Pruefung zurueckfallen
 * (z. B. Public-Visibility-Check fuer Asset-Serving).
 */
export async function tryWithPermission(
  request: NextRequest,
  module: Module,
  action: Action,
): Promise<{ allowed: true; auth: AuthContext } | { allowed: false }> {
  const result = await checkPermission(request, module, action)
  if (result.allowed) return { allowed: true, auth: result.auth }
  return { allowed: false }
}
