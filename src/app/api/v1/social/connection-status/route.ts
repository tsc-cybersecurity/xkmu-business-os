import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { socialOauthAccounts } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

/**
 * GET /api/v1/social/connection-status?provider=facebook
 * Returns { connected: boolean } for the given provider.
 */
export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'read', async () => {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') ?? ''

    if (!provider) {
      return NextResponse.json({ error: 'provider required' }, { status: 400 })
    }

    const [row] = await db
      .select({ id: socialOauthAccounts.id })
      .from(socialOauthAccounts)
      .where(
        and(
          eq(socialOauthAccounts.provider, provider),
          eq(socialOauthAccounts.status, 'connected'),
        ),
      )
      .limit(1)

    return NextResponse.json({ connected: !!row })
  })
}
