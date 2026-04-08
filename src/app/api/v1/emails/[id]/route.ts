import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import db from '@/lib/db'
import { emails } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/emails/[id] - Get single email with full body
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'read', async () => {
    const { id } = await params

    try {
      const [email] = await db
        .select()
        .from(emails)
        .where(eq(emails.id, id))

      if (!email) {
        return apiNotFound('Email not found')
      }

      return apiSuccess(email)
    } catch (error) {
      logger.error('Failed to get email', error, { module: 'EmailsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to get email', 500)
    }
  })
}

// PUT /api/v1/emails/[id] - Update email (isRead, isStarred, leadId, companyId, personId)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'update', async () => {
    const { id } = await params

    try {
      const body = await request.json()

      const updates: Record<string, unknown> = {}
      const allowedFields = ['isRead', 'isStarred', 'leadId', 'companyId', 'personId']

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field]
        }
      }

      if (Object.keys(updates).length === 0) {
        return apiError('VALIDATION_ERROR', 'No valid fields to update', 400)
      }

      const [updated] = await db
        .update(emails)
        .set(updates)
        .where(eq(emails.id, id))
        .returning()

      if (!updated) {
        return apiNotFound('Email not found')
      }

      return apiSuccess(updated)
    } catch (error) {
      logger.error('Failed to update email', error, { module: 'EmailsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to update email', 500)
    }
  })
}

// DELETE /api/v1/emails/[id] - Delete email
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'delete', async () => {
    const { id } = await params

    try {
      const [deleted] = await db
        .delete(emails)
        .where(eq(emails.id, id))
        .returning()

      if (!deleted) {
        return apiNotFound('Email not found')
      }

      return apiSuccess({ message: 'Email deleted successfully' })
    } catch (error) {
      logger.error('Failed to delete email', error, { module: 'EmailsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to delete email', 500)
    }
  })
}
