import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { db } from '@/lib/db'
import { emailAccounts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/email-accounts/[id]/sync - Trigger manual sync
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'create', async () => {
    const { id } = await params

    try {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.id, id))

      if (!account) {
        return apiNotFound('Email account not found')
      }

      const { EmailImapService } = await import('@/lib/services/email-imap.service')
      const result = await EmailImapService.syncAccount(id)

      return apiSuccess(result)
    } catch (error) {
      logger.error('Failed to sync email account', error, { module: 'EmailAccountsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to sync email account', 500)
    }
  })
}
