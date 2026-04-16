import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api-response'
import { loginSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { UserService } from '@/lib/services/user.service'
import { createSession } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: max 10 login attempts per minute per IP
    const limited = await rateLimit(request, 'auth-login', 10, 60_000)
    if (limited) return limited

    const body = await request.json()

    // Validate input
    const validation = validateAndParse(loginSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const { email, password } = validation.data

    // AUTH-01: direkte Email-Suche, kein cross-tenant Iterieren
    const result = await UserService.authenticate(email, password)

    if (!result.success || !result.user) {
      return apiError('INVALID_CREDENTIALS', result.error || 'Invalid credentials', 401)
    }

    // Create session
    await createSession(result.user)

    return apiSuccess({
      user: result.user,
    })
  } catch (error) {
    logger.error('Login failed', error, { module: 'AuthLogin' })
    return apiError('LOGIN_FAILED', 'Login failed', 500)
  }
}
