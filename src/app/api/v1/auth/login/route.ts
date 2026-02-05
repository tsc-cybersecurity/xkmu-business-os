import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api-response'
import { loginSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { UserService } from '@/lib/services/user.service'
import { TenantService } from '@/lib/services/tenant.service'
import { createSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Get tenant from header or default
    const tenantSlug = request.headers.get('x-tenant') || 'default'

    // Validate input
    const validation = validateAndParse(loginSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const { email, password } = validation.data

    // Get tenant
    const tenant = await TenantService.getBySlug(tenantSlug)
    if (!tenant) {
      return apiError('TENANT_NOT_FOUND', 'Tenant not found', 404)
    }

    // Authenticate user
    const result = await UserService.authenticate(tenant.id, email, password)

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
