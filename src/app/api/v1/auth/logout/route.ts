import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { getSession, deleteSession } from '@/lib/auth/session'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (session) {
    const action = session.user.role === 'portal_user' ? 'portal_user.logout' : 'internal.logout'
    try {
      await AuditLogService.log({
        userId: session.user.id,
        userRole: session.user.role,
        action,
        entityType: 'user',
        entityId: session.user.id,
        request,
      })
    } catch (err) {
      logger.error('Logout audit write failed (non-blocking)', err, { module: 'AuthLogout' })
    }
  }
  await deleteSession()
  return apiSuccess({ message: 'Logged out successfully' })
}
