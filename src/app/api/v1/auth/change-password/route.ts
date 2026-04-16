import { NextRequest } from 'next/server'
import { logger } from '@/lib/utils/logger'
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiValidationError,
} from '@/lib/utils/api-response'
import {
  changePasswordSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { getSession } from '@/lib/auth/session'
import { UserService } from '@/lib/services/user.service'
import bcrypt from 'bcryptjs'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function POST(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return apiUnauthorized()
  }

  try {
    const body = await request.json()

    const validation = validateAndParse(changePasswordSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const { currentPassword, newPassword } = validation.data

    // Get user with password hash
    const user = await UserService.getById(
      TENANT_ID,
      session.user.id
    )

    if (!user) {
      return apiError('USER_NOT_FOUND', 'Benutzer nicht gefunden', 404)
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      return apiError(
        'INVALID_PASSWORD',
        'Das aktuelle Passwort ist falsch',
        400
      )
    }

    // Update password
    await UserService.updatePassword(
      TENANT_ID,
      session.user.id,
      newPassword
    )

    return apiSuccess({ message: 'Passwort erfolgreich geändert' })
  } catch (error) {
    logger.error('Change password failed', error, { module: 'AuthChangePassword' })
    return apiError(
      'CHANGE_PASSWORD_FAILED',
      'Fehler beim Ändern des Passworts',
      500
    )
  }
}
