import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { db } from '@/lib/db'
import { emailAccounts } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

function maskPasswords<T extends Record<string, unknown>>(account: T): T {
  return {
    ...account,
    imapPassword: '***',
    smtpPassword: account.smtpPassword ? '***' : null,
  }
}

// GET /api/v1/email-accounts - List all email accounts
export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    try {
      const accounts = await db
        .select()
        .from(emailAccounts)
        .orderBy(asc(emailAccounts.name))

      const safeAccounts = accounts.map(maskPasswords)
      return apiSuccess(safeAccounts)
    } catch (error) {
      logger.error('Failed to list email accounts', error, { module: 'EmailAccountsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to list email accounts', 500)
    }
  })
}

// POST /api/v1/email-accounts - Create email account
export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'create', async (auth) => {
    try {
      const body = await request.json()

      if (!body.name || !body.email || !body.imapHost || !body.imapUser || !body.imapPassword) {
        return apiError('VALIDATION_ERROR', 'name, email, imapHost, imapUser and imapPassword are required', 400)
      }

      const [account] = await db
        .insert(emailAccounts)
        .values({
          name: body.name,
          email: body.email,
          imapHost: body.imapHost,
          imapPort: body.imapPort ?? 993,
          imapUser: body.imapUser,
          imapPassword: body.imapPassword,
          imapTls: body.imapTls ?? true,
          smtpHost: body.smtpHost ?? null,
          smtpPort: body.smtpPort ?? 587,
          smtpUser: body.smtpUser ?? null,
          smtpPassword: body.smtpPassword ?? null,
          smtpTls: body.smtpTls ?? true,
          syncEnabled: body.syncEnabled ?? true,
          syncInterval: body.syncInterval ?? 5,
          syncFolder: body.syncFolder ?? 'INBOX',
          createdBy: auth.userId ?? null,
        })
        .returning()

      return apiSuccess(maskPasswords(account), undefined, 201)
    } catch (error) {
      logger.error('Failed to create email account', error, { module: 'EmailAccountsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to create email account', 500)
    }
  })
}
