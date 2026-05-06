import { db } from '@/lib/db'
import { socialOauthAccounts, type SocialMediaPost } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { decryptToken, encryptToken } from '@/lib/crypto/token-crypto'
import { getSocialTokenKey } from './crypto-config'
import { XOAuthClient } from './x-oauth.client'
import { XPublishClient } from './x-publish.client'
import type { SocialProvider, PublishResult } from './social-provider'
import { logger } from '@/lib/utils/logger'

const TWEET_MAX_LEN = 280

function composeBody(content: string, hashtags: unknown): string {
  const list = Array.isArray(hashtags) ? hashtags.map(String).filter(Boolean) : []
  const tags = list.map((h) => (h.startsWith('#') ? h : `#${h}`))
  const missing = tags.filter((t) => !content.includes(t))
  if (missing.length === 0) return content
  return `${content}\n\n${missing.join(' ')}`
}

/**
 * Kuerzt Body auf TWEET_MAX_LEN, am letzten Wort. Hashtags am Ende werden
 * zuerst beibehalten, der Body davor gekuerzt — sonst wuerde ein langer
 * Pre-Body die Tags abschneiden.
 */
function truncateForTweet(text: string): string {
  if (text.length <= TWEET_MAX_LEN) return text
  // Letztes Wort vor budget-Limit suchen
  const cut = text.slice(0, TWEET_MAX_LEN - 1)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = lastSpace > TWEET_MAX_LEN * 0.6 ? cut.slice(0, lastSpace) : cut
  return trimmed.replace(/[\s,;:.\-–—]+$/u, '') + '…'
}

async function loadXAccount() {
  const [row] = await db.select().from(socialOauthAccounts)
    .where(and(eq(socialOauthAccounts.provider, 'x'), eq(socialOauthAccounts.status, 'connected')))
    .limit(1)
  return row
}

/**
 * Refresh access_token wenn er in <60s ablaeuft (oder schon abgelaufen ist).
 * Persistiert die neuen Tokens. Fail-soft: wenn Refresh nicht klappt,
 * geht der Caller mit dem alten Token weiter — das fuehrt dann zu 401 beim
 * Publish und ueber den revokeAccount-Pfad zu sauberem Reconnect-Flow.
 */
async function ensureFreshToken(account: typeof socialOauthAccounts.$inferSelect): Promise<string> {
  const key = await getSocialTokenKey()
  const accessToken = decryptToken(account.accessTokenEnc, key)
  const expires = account.tokenExpiresAt ? new Date(account.tokenExpiresAt).getTime() : null
  const expiresInMs = expires ? expires - Date.now() : Number.POSITIVE_INFINITY
  if (expiresInMs > 60_000) return accessToken
  if (!account.refreshTokenEnc) return accessToken

  try {
    const refreshToken = decryptToken(account.refreshTokenEnc, key)
    const refreshed = await XOAuthClient.refreshAccessToken(refreshToken)
    const newAccessEnc = encryptToken(refreshed.accessToken, key)
    const newRefreshEnc = refreshed.refreshToken
      ? encryptToken(refreshed.refreshToken, key)
      : account.refreshTokenEnc
    const expiresAt = refreshed.expiresInSec > 0
      ? new Date(Date.now() + refreshed.expiresInSec * 1000)
      : null
    await db.update(socialOauthAccounts).set({
      accessTokenEnc: newAccessEnc,
      refreshTokenEnc: newRefreshEnc,
      tokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    }).where(eq(socialOauthAccounts.id, account.id))
    return refreshed.accessToken
  } catch (e) {
    logger.warn(
      `X token refresh failed (continuing with stale token): ${e instanceof Error ? e.message : e}`,
      { module: 'XProvider' },
    )
    return accessToken
  }
}

export const XProvider: SocialProvider = {
  name: 'x',

  async publish(post: SocialMediaPost): Promise<PublishResult> {
    if (post.platform !== 'x') throw new Error('only_x_posts')
    const account = await loadXAccount()
    if (!account) return { ok: false, error: 'no_connected_account', revokeAccount: false }

    const body = truncateForTweet(composeBody(post.content, post.hashtags))
    const accessToken = await ensureFreshToken(account)
    return XPublishClient.publish({ accessToken, text: body })
  },
}
