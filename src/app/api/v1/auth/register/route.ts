import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api-response'
import { registerSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { UserService } from '@/lib/services/user.service'
import { logger } from '@/lib/utils/logger'
import { RoleService } from '@/lib/services/role.service'
import { TenantSeedService } from '@/lib/services/tenant-seed.service'
import { createSession } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rate-limit'
import type { SessionUser } from '@/lib/types/auth.types'

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'auth-register', 5, 60_000)
    if (limited) return limited

    const body = await request.json()

    const validation = validateAndParse(registerSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const { email, password, firstName, lastName } = validation.data

    await RoleService.seedDefaultRoles()
    await TenantSeedService.seedStructuralData()

    const adminRole = await RoleService.getByName('admin')

    const user = await UserService.create({
      email,
      password,
      firstName,
      lastName,
      role: 'admin',
      roleId: adminRole?.id,
    })

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'admin',
      roleId: adminRole?.id ?? null,
    }

    await createSession(sessionUser)

    return apiSuccess({ user: sessionUser }, undefined, 201)
  } catch (error) {
    logger.error('Registration failed', error, { module: 'AuthRegister' })
    return apiError('REGISTRATION_FAILED', 'Registrierung fehlgeschlagen', 500)
  }
}
