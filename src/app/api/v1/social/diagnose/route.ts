import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { socialOauthAccounts, auditLogs } from '@/lib/db/schema'
import { desc, eq, like, sql } from 'drizzle-orm'
import { CmsDesignService } from '@/lib/services/cms-design.service'

export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'read', async () => {
    const accountsCount = await db.select({ count: sql<number>`count(*)::int` }).from(socialOauthAccounts)
    const accountsConnected = await db.select({ count: sql<number>`count(*)::int` }).from(socialOauthAccounts).where(eq(socialOauthAccounts.status, 'connected'))
    const accounts = await db.select({
      id: socialOauthAccounts.id,
      provider: socialOauthAccounts.provider,
      status: socialOauthAccounts.status,
      accountName: socialOauthAccounts.accountName,
      tokenExpiresAt: socialOauthAccounts.tokenExpiresAt,
      createdAt: socialOauthAccounts.createdAt,
      revokedAt: socialOauthAccounts.revokedAt,
    }).from(socialOauthAccounts).orderBy(desc(socialOauthAccounts.createdAt)).limit(10)

    const auditEntries = await db.select({
      action: auditLogs.action,
      entityId: auditLogs.entityId,
      payload: auditLogs.payload,
      createdAt: auditLogs.createdAt,
    }).from(auditLogs).where(like(auditLogs.action, 'social_%')).orderBy(desc(auditLogs.createdAt)).limit(10)

    const appUrl = await CmsDesignService.getAppUrl()

    return NextResponse.json({
      env: {
        META_APP_ID: !!process.env.META_APP_ID,
        META_APP_SECRET: !!process.env.META_APP_SECRET,
        META_OAUTH_REDIRECT_URI: process.env.META_OAUTH_REDIRECT_URI ?? null,
        INSTAGRAM_APP_ID: !!process.env.INSTAGRAM_APP_ID,
        INSTAGRAM_APP_SECRET: !!process.env.INSTAGRAM_APP_SECRET,
        INSTAGRAM_OAUTH_REDIRECT_URI: process.env.INSTAGRAM_OAUTH_REDIRECT_URI ?? null,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      },
      cmsAppUrl: appUrl,
      accounts: {
        total: accountsCount[0]?.count ?? 0,
        connected: accountsConnected[0]?.count ?? 0,
        latest: accounts,
      },
      audit: {
        latest: auditEntries,
      },
    })
  })
}
