import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import db from '@/lib/db'
import { emails } from '@/lib/db/schema'
import { and, eq, desc, ilike, or, type SQL } from 'drizzle-orm'

// GET /api/v1/emails - List emails with filters
export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const accountId = searchParams.get('accountId')
      const folder = searchParams.get('folder')
      const isRead = searchParams.get('isRead')
      const leadId = searchParams.get('leadId')
      const companyId = searchParams.get('companyId')
      const personId = searchParams.get('personId')
      const search = searchParams.get('search')
      const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
      const offset = parseInt(searchParams.get('offset') || '0', 10)

      const conditions: SQL[] = []

      if (accountId) {
        conditions.push(eq(emails.accountId, accountId))
      }
      if (folder) {
        conditions.push(eq(emails.folder, folder))
      }
      if (isRead !== null && isRead !== undefined && isRead !== '') {
        conditions.push(eq(emails.isRead, isRead === 'true'))
      }
      if (leadId) {
        conditions.push(eq(emails.leadId, leadId))
      }
      if (companyId) {
        conditions.push(eq(emails.companyId, companyId))
      }
      if (personId) {
        conditions.push(eq(emails.personId, personId))
      }
      if (search) {
        conditions.push(
          or(
            ilike(emails.subject, `%${search}%`),
            ilike(emails.fromAddress, `%${search}%`),
            ilike(emails.fromName, `%${search}%`),
            ilike(emails.snippet, `%${search}%`),
          )!
        )
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined

      const results = await db
        .select({
          id: emails.id,
          accountId: emails.accountId,
          messageId: emails.messageId,
          folder: emails.folder,
          subject: emails.subject,
          fromAddress: emails.fromAddress,
          fromName: emails.fromName,
          toAddresses: emails.toAddresses,
          ccAddresses: emails.ccAddresses,
          snippet: emails.snippet,
          date: emails.date,
          isRead: emails.isRead,
          isStarred: emails.isStarred,
          hasAttachments: emails.hasAttachments,
          direction: emails.direction,
          leadId: emails.leadId,
          companyId: emails.companyId,
          personId: emails.personId,
          createdAt: emails.createdAt,
        })
        .from(emails)
        .where(where)
        .orderBy(desc(emails.date))
        .limit(limit)
        .offset(offset)

      return apiSuccess(results)
    } catch (error) {
      logger.error('Failed to list emails', error, { module: 'EmailsAPI' })
      return apiError('INTERNAL_ERROR', 'Failed to list emails', 500)
    }
  })
}
