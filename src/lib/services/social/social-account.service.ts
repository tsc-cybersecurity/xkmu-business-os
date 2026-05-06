import { db } from '@/lib/db'
import { socialOauthAccounts } from '@/lib/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { encryptToken } from '@/lib/crypto/token-crypto'
import { getSocialTokenKey } from './crypto-config'
import type { MetaPageWithIg } from './meta-oauth.client'

export interface ConnectMetaInput {
  page: MetaPageWithIg
  expiresInSec: number
  userId: string
}

export interface ConnectInstagramInput {
  longLivedToken: string
  expiresInSec: number
  igUserId: string
  igUsername: string
  userId: string
}

export interface ConnectedAccountSummary {
  id: string
  provider: 'facebook' | 'instagram' | 'x' | 'linkedin'
  externalAccountId: string
  accountName: string
  status: 'connected' | 'revoked' | 'expired'
  tokenExpiresAt: Date | null
}

export const SocialAccountService = {
  async listConnected(): Promise<ConnectedAccountSummary[]> {
    const rows = await db.select({
      id: socialOauthAccounts.id,
      provider: socialOauthAccounts.provider,
      externalAccountId: socialOauthAccounts.externalAccountId,
      accountName: socialOauthAccounts.accountName,
      status: socialOauthAccounts.status,
      tokenExpiresAt: socialOauthAccounts.tokenExpiresAt,
    }).from(socialOauthAccounts)
      .where(eq(socialOauthAccounts.status, 'connected'))
    return rows as ConnectedAccountSummary[]
  },

  async connectMeta(input: ConnectMetaInput): Promise<{ connected: ConnectedAccountSummary[] }> {
    const page = input.page
    const key = await getSocialTokenKey()
    const expiresAt = input.expiresInSec > 0 ? new Date(Date.now() + input.expiresInSec * 1000) : null

    // Wrap all 4 DB ops in a transaction: revoke then insert is atomic.
    // Token exchange and getSocialTokenKey remain outside — they are network/config
    // reads with no DB writes and should not hold a DB connection open.
    const inserted = await db.transaction(async (tx) => {
      // Revoke any existing 'connected' rows for these providers, then insert fresh.
      await tx.update(socialOauthAccounts)
        .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(socialOauthAccounts.provider, 'facebook'), eq(socialOauthAccounts.status, 'connected')))
      await tx.update(socialOauthAccounts)
        .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(socialOauthAccounts.provider, 'instagram'), eq(socialOauthAccounts.status, 'connected')))

      const rows: ConnectedAccountSummary[] = []

      const fbRow = await tx.insert(socialOauthAccounts).values({
        provider: 'facebook',
        externalAccountId: page.pageId,
        accountName: page.pageName,
        accessTokenEnc: encryptToken(page.pageAccessToken, key),
        tokenExpiresAt: expiresAt,
        scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
        meta: { igLinked: !!page.igUserId },
        connectedBy: input.userId,
      }).returning()
      rows.push({
        id: fbRow[0].id, provider: 'facebook',
        externalAccountId: page.pageId, accountName: page.pageName,
        status: 'connected', tokenExpiresAt: expiresAt,
      })

      if (page.igUserId) {
        const igName = page.igUsername ? `@${page.igUsername}` : `IG (${page.pageName})`
        const igRow = await tx.insert(socialOauthAccounts).values({
          provider: 'instagram',
          externalAccountId: page.igUserId,
          accountName: igName,
          accessTokenEnc: encryptToken(page.pageAccessToken, key),
          tokenExpiresAt: expiresAt,
          scopes: ['instagram_business_basic', 'instagram_business_content_publish'],
          meta: { fbPageId: page.pageId, igUsername: page.igUsername },
          connectedBy: input.userId,
        }).returning()
        rows.push({
          id: igRow[0].id, provider: 'instagram',
          externalAccountId: page.igUserId, accountName: igName,
          status: 'connected', tokenExpiresAt: expiresAt,
        })
      }

      return rows
    })

    return { connected: inserted }
  },

  async connectInstagram(input: ConnectInstagramInput): Promise<{ connected: ConnectedAccountSummary[] }> {
    const key = await getSocialTokenKey()
    const expiresAt = input.expiresInSec > 0 ? new Date(Date.now() + input.expiresInSec * 1000) : null

    const inserted = await db.transaction(async (tx) => {
      await tx.update(socialOauthAccounts)
        .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(socialOauthAccounts.provider, 'instagram'), eq(socialOauthAccounts.status, 'connected')))

      const igRow = await tx.insert(socialOauthAccounts).values({
        provider: 'instagram',
        externalAccountId: input.igUserId,
        accountName: `@${input.igUsername}`,
        accessTokenEnc: encryptToken(input.longLivedToken, key),
        tokenExpiresAt: expiresAt,
        scopes: ['instagram_business_basic', 'instagram_business_content_publish'],
        meta: { source: 'instagram_direct', igUsername: input.igUsername },
        connectedBy: input.userId,
      }).returning()

      const summary: ConnectedAccountSummary = {
        id: igRow[0].id,
        provider: 'instagram',
        externalAccountId: input.igUserId,
        accountName: `@${input.igUsername}`,
        status: 'connected',
        tokenExpiresAt: expiresAt,
      }
      return [summary]
    })

    return { connected: inserted }
  },

  async connectX(input: {
    userId: string
    xUserId: string
    xUsername: string
    xName: string | null
    accessToken: string
    refreshToken: string | null
    expiresInSec: number
  }): Promise<{ connected: ConnectedAccountSummary[] }> {
    const key = await getSocialTokenKey()
    const expiresAt = input.expiresInSec > 0 ? new Date(Date.now() + input.expiresInSec * 1000) : null

    const inserted = await db.transaction(async (tx) => {
      await tx.update(socialOauthAccounts)
        .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(socialOauthAccounts.provider, 'x'), eq(socialOauthAccounts.status, 'connected')))

      const xRow = await tx.insert(socialOauthAccounts).values({
        provider: 'x',
        externalAccountId: input.xUserId,
        accountName: `@${input.xUsername}`,
        accessTokenEnc: encryptToken(input.accessToken, key),
        refreshTokenEnc: input.refreshToken ? encryptToken(input.refreshToken, key) : null,
        tokenExpiresAt: expiresAt,
        scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
        meta: { source: 'x_oauth2_pkce', xUsername: input.xUsername, xName: input.xName },
        connectedBy: input.userId,
      }).returning()

      const summary: ConnectedAccountSummary = {
        id: xRow[0].id,
        provider: 'x',
        externalAccountId: input.xUserId,
        accountName: `@${input.xUsername}`,
        status: 'connected',
        tokenExpiresAt: expiresAt,
      }
      return [summary]
    })

    return { connected: inserted }
  },

  async connectLinkedIn(input: {
    userId: string
    memberId: string
    memberName: string
    email: string | null
    accessToken: string
    refreshToken: string | null
    expiresInSec: number
  }): Promise<{ connected: ConnectedAccountSummary[] }> {
    const key = await getSocialTokenKey()
    const expiresAt = input.expiresInSec > 0 ? new Date(Date.now() + input.expiresInSec * 1000) : null

    const inserted = await db.transaction(async (tx) => {
      await tx.update(socialOauthAccounts)
        .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(socialOauthAccounts.provider, 'linkedin'), eq(socialOauthAccounts.status, 'connected')))

      const liRow = await tx.insert(socialOauthAccounts).values({
        provider: 'linkedin',
        externalAccountId: input.memberId,
        accountName: input.memberName || input.email || `member_${input.memberId.slice(0, 8)}`,
        accessTokenEnc: encryptToken(input.accessToken, key),
        refreshTokenEnc: input.refreshToken ? encryptToken(input.refreshToken, key) : null,
        tokenExpiresAt: expiresAt,
        scopes: ['openid', 'profile', 'email', 'w_member_social'],
        meta: { source: 'linkedin_oidc', memberName: input.memberName, email: input.email },
        connectedBy: input.userId,
      }).returning()

      const summary: ConnectedAccountSummary = {
        id: liRow[0].id,
        provider: 'linkedin',
        externalAccountId: input.memberId,
        accountName: input.memberName || input.email || `member_${input.memberId.slice(0, 8)}`,
        status: 'connected',
        tokenExpiresAt: expiresAt,
      }
      return [summary]
    })

    return { connected: inserted }
  },

  async disconnect(id: string): Promise<{ revoked: boolean }> {
    const rows = await db.update(socialOauthAccounts)
      .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(socialOauthAccounts.id, id), isNull(socialOauthAccounts.revokedAt)))
      .returning({ id: socialOauthAccounts.id })
    return { revoked: rows.length > 0 }
  },
}
