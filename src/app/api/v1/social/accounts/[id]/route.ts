import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { SocialAccountService } from '@/lib/services/social/social-account.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { db } from '@/lib/db'
import { socialOauthAccounts } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withPermission(request, 'social_media', 'update', async (auth) => {
    const [existing] = await db.select().from(socialOauthAccounts)
      .where(and(eq(socialOauthAccounts.id, id), eq(socialOauthAccounts.status, 'connected')))
      .limit(1)
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const result = await SocialAccountService.disconnect(id)
    if (!result.revoked) {
      // Concurrent DELETE already revoked this account — return success but skip audit log.
      return NextResponse.json({ ok: true, alreadyRevoked: true })
    }
    await AuditLogService.log({
      userId: auth.userId, userRole: auth.role,
      action: 'social_account_revoked',
      entityType: 'social_oauth_accounts', entityId: id,
      payload: { provider: existing.provider, externalAccountId: existing.externalAccountId },
      request,
    })
    return NextResponse.json({ ok: true })
  })
}
