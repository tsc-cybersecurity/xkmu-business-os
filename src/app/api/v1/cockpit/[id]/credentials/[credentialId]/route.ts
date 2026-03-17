import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateCockpitCredentialSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CockpitService } from '@/lib/services/cockpit.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string; credentialId: string }>

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'cockpit', 'update', async (auth) => {
    const { id, credentialId } = await params

    try {
      const owns = await CockpitService.verifyCredentialOwnership(auth.tenantId, id, credentialId)
      if (!owns) {
        return apiNotFound('Credential not found')
      }

      const body = await request.json()

      const validation = validateAndParse(updateCockpitCredentialSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const credential = await CockpitService.updateCredential(credentialId, validation.data)

      if (!credential) {
        return apiNotFound('Credential not found')
      }

      return apiSuccess(credential)
    } catch (error) {
      logger.error('Update cockpit credential error', error, { module: 'CockpitAPI' })
      return apiError('UPDATE_FAILED', 'Failed to update credential', 500)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'cockpit', 'delete', async (auth) => {
    const { id, credentialId } = await params

    const owns = await CockpitService.verifyCredentialOwnership(auth.tenantId, id, credentialId)
    if (!owns) {
      return apiNotFound('Credential not found')
    }

    const deleted = await CockpitService.deleteCredential(credentialId)

    if (!deleted) {
      return apiNotFound('Credential not found')
    }

    return apiSuccess({ message: 'Credential deleted successfully' })
  })
}
