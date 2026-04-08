import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import db from '@/lib/db'
import { emailAccounts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

function maskPasswords<T extends Record<string, unknown>>(account: T): T {
  return {
    ...account,
    imapPassword: '***',
    smtpPassword: account.smtpPassword ? '***' : null,
  }
}

// GET /api/v1/email-accounts/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'read', async () => {
    const { id } = await params

    try {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.id, id))

      if (!account) {
        return apiNotFound('Email account not found')
      }

      return apiSuccess(maskPasswords(account))
    } catch (error) {
      logger.error('Failed to get email account', error, { module: 'EmailAccountsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to get email account', 500)
    }
  })
}

// PUT /api/v1/email-accounts/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'update', async () => {
    const { id } = await params

    try {
      const body = await request.json()

      // Build update object with only provided fields
      const updates: Record<string, unknown> = {}
      const allowedFields = [
        'name', 'email', 'imapHost', 'imapPort', 'imapUser', 'imapTls',
        'smtpHost', 'smtpPort', 'smtpUser', 'smtpTls',
        'syncEnabled', 'syncInterval', 'syncFolder', 'isActive',
      ]

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field]
        }
      }

      // Only update passwords if they are not masked
      if (body.imapPassword !== undefined && body.imapPassword !== '***') {
        updates.imapPassword = body.imapPassword
      }
      if (body.smtpPassword !== undefined && body.smtpPassword !== '***') {
        updates.smtpPassword = body.smtpPassword
      }

      updates.updatedAt = new Date()

      const [account] = await db
        .update(emailAccounts)
        .set(updates)
        .where(eq(emailAccounts.id, id))
        .returning()

      if (!account) {
        return apiNotFound('Email account not found')
      }

      return apiSuccess(maskPasswords(account))
    } catch (error) {
      logger.error('Failed to update email account', error, { module: 'EmailAccountsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to update email account', 500)
    }
  })
}

// DELETE /api/v1/email-accounts/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'delete', async () => {
    const { id } = await params

    try {
      const [deleted] = await db
        .delete(emailAccounts)
        .where(eq(emailAccounts.id, id))
        .returning()

      if (!deleted) {
        return apiNotFound('Email account not found')
      }

      return apiSuccess({ message: 'Email account deleted successfully' })
    } catch (error) {
      logger.error('Failed to delete email account', error, { module: 'EmailAccountsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to delete email account', 500)
    }
  })
}
