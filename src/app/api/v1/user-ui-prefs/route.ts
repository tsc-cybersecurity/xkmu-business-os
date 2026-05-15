import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { UserUiPrefsService } from '@/lib/services/user-ui-prefs.service'
import { logger } from '@/lib/utils/logger'

// Endpoint laeuft fuer JEDEN eingeloggten User — keine Permission-Pruefung,
// jeder darf seine EIGENEN UI-Prefs lesen/setzen. Scope: nur die Prefs des
// aktuellen Sessions-Users.

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return apiServerError('Nicht eingeloggt')
    const prefs = await UserUiPrefsService.get(session.user.id)
    return apiSuccess(prefs)
  } catch (error) {
    logger.error('Get UI prefs failed', error, { module: 'UserUiPrefsAPI' })
    return apiServerError()
  }
}

const putSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return apiServerError('Nicht eingeloggt')
    const body = await request.json()
    const validation = validateAndParse(putSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }
    const next = await UserUiPrefsService.setKey(
      session.user.id,
      validation.data.key,
      validation.data.value
    )
    return apiSuccess(next)
  } catch (error) {
    logger.error('Put UI prefs failed', error, { module: 'UserUiPrefsAPI' })
    return apiServerError()
  }
}
