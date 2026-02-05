import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
} from '@/lib/utils/api-response'
import { TenantService } from '@/lib/services/tenant.service'
import { getSession } from '@/lib/auth/session'
import { z } from 'zod'

const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes')
    .optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) {
    return apiUnauthorized()
  }

  const tenant = await TenantService.getById(session.user.tenantId)

  if (!tenant) {
    return apiError('NOT_FOUND', 'Tenant not found', 404)
  }

  return apiSuccess(tenant)
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return apiUnauthorized()
  }

  // Only owner can update tenant settings
  if (session.user.role !== 'owner') {
    return apiForbidden('Only the owner can update organization settings')
  }

  try {
    const body = await request.json()
    const validation = updateTenantSchema.safeParse(body)

    if (!validation.success) {
      return apiValidationError(
        validation.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    // Check if slug is unique (if being changed)
    if (validation.data.slug) {
      const slugExists = await TenantService.slugExists(
        validation.data.slug,
        session.user.tenantId
      )
      if (slugExists) {
        return apiError('SLUG_EXISTS', 'This slug is already in use', 400)
      }
    }

    const tenant = await TenantService.update(
      session.user.tenantId,
      validation.data
    )

    if (!tenant) {
      return apiError('NOT_FOUND', 'Tenant not found', 404)
    }

    return apiSuccess(tenant)
  } catch (error) {
    console.error('Update tenant error:', error)
    return apiError('UPDATE_FAILED', 'Failed to update tenant', 500)
  }
}
