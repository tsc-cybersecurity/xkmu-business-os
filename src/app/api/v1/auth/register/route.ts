import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api-response'
import { registerSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { UserService } from '@/lib/services/user.service'
import { TenantService } from '@/lib/services/tenant.service'
import { RoleService } from '@/lib/services/role.service'
import { createSession } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/types/auth.types'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateAndParse(registerSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const { email, password, firstName, lastName, companyName } = validation.data

    // Slug generieren und Kollision pruefen
    let slug = generateSlug(companyName)
    let slugExists = await TenantService.slugExists(slug)
    let attempt = 0
    while (slugExists) {
      attempt++
      slug = `${generateSlug(companyName)}-${attempt}`
      slugExists = await TenantService.slugExists(slug)
    }

    // Tenant erstellen
    const tenant = await TenantService.create({
      name: companyName,
      slug,
    })

    // Default-Rollen seeden
    await RoleService.seedDefaultRoles(tenant.id)

    // Admin-Rolle nachschlagen (temporaer: registrierte Benutzer bekommen Admin-Rechte)
    const adminRole = await RoleService.getByName(tenant.id, 'admin')

    // Benutzer erstellen
    const user = await UserService.create(tenant.id, {
      email,
      password,
      firstName,
      lastName,
      role: 'admin',
      roleId: adminRole?.id,
    })

    // Session erstellen
    const sessionUser: SessionUser = {
      id: user.id,
      tenantId: tenant.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'admin',
      roleId: adminRole?.id ?? null,
    }

    await createSession(sessionUser)

    return apiSuccess(
      {
        user: sessionUser,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      },
      undefined,
      201
    )
  } catch (error) {
    console.error('Registration error:', error)
    return apiError('REGISTRATION_FAILED', 'Registrierung fehlgeschlagen', 500)
  }
}
