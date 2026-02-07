import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api-response'
import { loginSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { UserService } from '@/lib/services/user.service'
import { createSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateAndParse(loginSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const { email, password } = validation.data

    // Find user by email across all tenants
    const user = await UserService.findByEmail(email)
    if (!user) {
      return apiError('INVALID_CREDENTIALS', 'Invalid credentials', 401)
    }

    // Authenticate with the user's tenant
    const result = await UserService.authenticate(user.tenantId, email, password)

    if (!result.success || !result.user) {
      return apiError('INVALID_CREDENTIALS', result.error || 'Invalid credentials', 401)
    }

    // Create session
    await createSession(result.user)

    return apiSuccess({
      user: result.user,
    })
  } catch (error) {
    console.error('Login error:', error)
    return apiError('LOGIN_FAILED', 'Login failed', 500)
  }
}
