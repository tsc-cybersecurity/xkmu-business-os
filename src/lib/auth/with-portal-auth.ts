import { NextRequest } from 'next/server'
import { getSession } from './session'
import { apiUnauthorized, apiForbidden } from '@/lib/utils/api-response'

export interface PortalAuthContext {
  userId: string
  email: string
  companyId: string
}

/**
 * Guard für /api/v1/portal/* Routen. Nur role='portal_user' mit companyId darf passieren.
 *
 * @param _request — aktuell ungenutzt; Signatur spiegelt withPermission zur Konsistenz.
 */
export async function withPortalAuth(
  _request: NextRequest,
  handler: (auth: PortalAuthContext) => Promise<Response> | Response
): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return apiUnauthorized('Nicht angemeldet')
  }
  if (session.user.role !== 'portal_user') {
    return apiForbidden('Kein Portal-Zugang')
  }
  if (!session.user.companyId) {
    return apiForbidden('Portal-User ohne Firmenzuordnung')
  }
  return handler({
    userId: session.user.id,
    email: session.user.email,
    companyId: session.user.companyId,
  })
}
