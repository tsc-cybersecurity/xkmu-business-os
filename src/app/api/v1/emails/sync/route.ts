import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/v1/emails/sync - Sync all active email accounts (cron/internal, no auth)
export async function GET() {
  try {
    const { EmailImapService } = await import('@/lib/services/email-imap.service')
    const result = await EmailImapService.syncAll()

    logger.info('Email sync completed', {
      module: 'EmailSyncCron',
      accountCount: result.results.length,
      totalSynced: result.results.reduce((sum, r) => sum + r.synced, 0),
      totalErrors: result.results.reduce((sum, r) => sum + r.errors, 0),
    })

    return apiSuccess(result)
  } catch (error) {
    logger.error('Email sync failed', error, { module: 'EmailSyncCron' })
    return apiError('INTERNAL_ERROR', 'Email sync failed', 500)
  }
}

// POST /api/v1/emails/sync - Sync a specific account (requires auth)
export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'create', async () => {
    try {
      const body = await request.json()
      const { accountId } = body

      if (!accountId || typeof accountId !== 'string') {
        return apiError('VALIDATION_ERROR', 'accountId is required', 400)
      }

      const { EmailImapService } = await import('@/lib/services/email-imap.service')
      const result = await EmailImapService.syncAccount(accountId)

      logger.info('Email account sync completed', {
        module: 'EmailSyncAPI',
        accountId,
        synced: result.synced,
        errors: result.errors,
      })

      return apiSuccess(result)
    } catch (error) {
      logger.error('Email account sync failed', error, { module: 'EmailSyncAPI' })
      return apiError('INTERNAL_ERROR', 'Email account sync failed', 500)
    }
  })
}
