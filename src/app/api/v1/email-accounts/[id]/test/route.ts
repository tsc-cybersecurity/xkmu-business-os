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

// POST /api/v1/email-accounts/[id]/test - Test IMAP connection
export async function POST(request: NextRequest, { params }: RouteParams) {
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

      try {
        const { ImapFlow } = await import('imapflow')
        const client = new ImapFlow({
          host: account.imapHost,
          port: account.imapPort || 993,
          secure: account.imapTls !== false,
          auth: { user: account.imapUser, pass: account.imapPassword },
          logger: false,
        })
        await client.connect()
        await client.logout()
        return apiSuccess({ connected: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return apiSuccess({ connected: false, error: message })
      }
    } catch (error) {
      logger.error('Failed to test email account', error, { module: 'EmailAccountsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to test email account', 500)
    }
  })
}
