import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { rateLimit } from '@/lib/utils/rate-limit'
import { UserService } from '@/lib/services/user.service'
import { createSession } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'
import type { SessionUser } from '@/lib/types/auth.types'

const schema = z.object({
  token: z.string().min(32).max(128),
  password: z.string()
    .min(10, 'Passwort muss mindestens 10 Zeichen lang sein')
    .regex(/[A-Za-z]/, 'Passwort muss mindestens einen Buchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Ziffer enthalten'),
})

export async function POST(request: NextRequest) {
  // Rate limit: 10 attempts per minute per IP (prevent token brute-forcing)
  const limited = await rateLimit(request, 'auth-accept-invite', 10, 60_000)
  if (limited) return limited

  try {
    const body = await request.json()
    const validation = validateAndParse(schema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const user = await UserService.acceptInvite(
      validation.data.token,
      validation.data.password,
    )

    // Build SessionUser + set cookie
    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as SessionUser['role'],
      roleId: user.roleId ?? null,
      companyId: user.companyId ?? null,
    }
    await createSession(sessionUser)

    logger.info(`Invite accepted: ${user.email} (company=${user.companyId})`, { module: 'AcceptInviteAPI' })

    return apiSuccess({
      userId: user.id,
      role: user.role,
      redirectTo: '/portal',
    })
  } catch (error) {
    logger.error('accept-invite failed', error, { module: 'AcceptInviteAPI' })
    const msg = error instanceof Error ? error.message : 'Fehler'
    return apiError('INVITE_FAILED', msg, 400)
  }
}
